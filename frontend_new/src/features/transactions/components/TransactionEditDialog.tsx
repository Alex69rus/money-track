import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDaysIcon,
  ChevronRightIcon,
  FolderPenIcon,
  LoaderCircleIcon,
  PlusCircleIcon,
  TagsIcon,
  Trash2Icon,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TransactionCategorySelectorDialog } from "@/features/transactions/components/TransactionCategorySelectorDialog";
import { TransactionTagSelectorDialog } from "@/features/transactions/components/TransactionTagSelectorDialog";
import aedSymbol from "@/assets/aed-symbol.png";
import { ApiRequestError } from "@/services/api/client";
import { deleteTransaction, updateTransaction } from "@/services/api/transactions";
import type { Category, Transaction, UpdateTransactionPayload } from "@/types/transactions";

interface TransactionEditDialogProps {
  open: boolean;
  transaction: Transaction | null;
  categories: Category[];
  availableTags: string[];
  onOpenChange: (open: boolean) => void;
  onSaved: (transaction: Transaction) => void;
  onDeleted: (transactionId: number) => void;
  presentation?: "dialog" | "page";
  activeSubpage?: "none" | "category" | "tags";
  onOpenCategoryPage?: () => void;
  onOpenTagsPage?: () => void;
}

function toErrorMessage(error: unknown, fallbackMessage: string): string {
  if (error instanceof ApiRequestError) {
    return error.message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallbackMessage;
}

function toDateTimeLocalValue(date: Date): string {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function isTagsEqual(first: string[], second: string[]): boolean {
  if (first.length !== second.length) {
    return false;
  }

  return first.every((tag, index) => tag === second[index]);
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  RUB: "₽",
  INR: "₹",
};

function normalizeCurrency(currency: string): string {
  return currency.trim().toUpperCase();
}

function resolveCurrencySymbol(currency: string): string {
  const normalized = normalizeCurrency(currency);
  if (!normalized) {
    return "$";
  }
  return CURRENCY_SYMBOLS[normalized] ?? normalized;
}

function formatDateTimePreview(dateTimeValue: string): string {
  const parsedDate = new Date(dateTimeValue);
  if (Number.isNaN(parsedDate.getTime())) {
    return "Select date & time";
  }

  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsedDate);
}

export function TransactionEditDialog({
  open,
  transaction,
  categories,
  availableTags,
  onOpenChange,
  onSaved,
  onDeleted,
  presentation = "dialog",
  activeSubpage = "none",
  onOpenCategoryPage,
  onOpenTagsPage,
}: TransactionEditDialogProps): JSX.Element {
  const [amount, setAmount] = useState("");
  const [transactionDate, setTransactionDate] = useState("");
  const [currency, setCurrency] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [note, setNote] = useState("");

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [categorySelectorOpen, setCategorySelectorOpen] = useState(false);
  const [tagSelectorOpen, setTagSelectorOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dateInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open || !transaction) {
      return;
    }

    setAmount(String(transaction.amount));
    setTransactionDate(toDateTimeLocalValue(transaction.transactionDate));
    setCurrency(transaction.currency);
    setCategoryId(transaction.categoryId);
    setTags(transaction.tags);
    setNote(transaction.note ?? "");
    setError(null);
    setDeleteConfirmOpen(false);
    setCategorySelectorOpen(false);
    setTagSelectorOpen(false);
  }, [open, transaction]);

  const categoryById = useMemo(() => {
    return new Map(categories.map((category) => [category.id, category]));
  }, [categories]);

  const selectedCategory = categoryId === null ? null : (categoryById.get(categoryId) ?? null);
  const selectedCategoryLabel = selectedCategory?.name ?? (categoryId === null ? "Uncategorized" : "Unknown");
  const selectedCategoryIcon = selectedCategory?.icon?.trim() || null;
  const normalizedCurrency = normalizeCurrency(currency);
  const currencySymbol = resolveCurrencySymbol(currency);
  const transactionDateLabel = formatDateTimePreview(transactionDate);

  const hasChanges = useMemo(() => {
    if (!transaction) {
      return false;
    }

    return (
      amount !== String(transaction.amount) ||
      transactionDate !== toDateTimeLocalValue(transaction.transactionDate) ||
      currency.trim() !== transaction.currency ||
      categoryId !== transaction.categoryId ||
      note !== (transaction.note ?? "") ||
      !isTagsEqual(tags, transaction.tags)
    );
  }, [amount, categoryId, currency, note, tags, transaction, transactionDate]);

  const validatePayload = (): { payload: UpdateTransactionPayload | null; message: string | null } => {
    if (!transactionDate.trim()) {
      return { payload: null, message: "Date and time are required." };
    }

    const parsedDate = new Date(transactionDate);
    if (Number.isNaN(parsedDate.getTime())) {
      return { payload: null, message: "Date and time are invalid." };
    }

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount)) {
      return { payload: null, message: "Amount must be a valid number." };
    }

    if (parsedAmount === 0) {
      return { payload: null, message: "Amount cannot be zero." };
    }

    const nextCurrency = currency.trim().toUpperCase();
    if (nextCurrency.length === 0) {
      return { payload: null, message: "Currency is required." };
    }

    return {
      payload: {
        transactionDate: parsedDate.toISOString(),
        amount: parsedAmount,
        note: note.trim() ? note.trim() : null,
        categoryId,
        tags,
        currency: nextCurrency,
      },
      message: null,
    };
  };

  const handleSave = async (): Promise<void> => {
    if (!transaction || saving || deleting) {
      return;
    }

    const validation = validatePayload();
    if (!validation.payload) {
      setError(validation.message);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const updatedTransaction = await updateTransaction(transaction.id, validation.payload);
      onSaved(updatedTransaction);
      onOpenChange(false);
    } catch (requestError) {
      setError(toErrorMessage(requestError, "Could not save transaction changes."));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!transaction || saving || deleting) {
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      await deleteTransaction(transaction.id);
      onDeleted(transaction.id);
      setDeleteConfirmOpen(false);
      onOpenChange(false);
    } catch (requestError) {
      setError(toErrorMessage(requestError, "Could not delete transaction."));
    } finally {
      setDeleting(false);
    }
  };

  const handleOpenDatePicker = (): void => {
    const element = dateInputRef.current;
    if (!element) {
      return;
    }

    element.focus();
    element.click();
  };

  if (presentation === "page" && !open) {
    return <></>;
  }

  const editorBody = (
    <>
      {presentation === "page" ? null : (
        <div className="flex h-8 items-center justify-center pt-2">
            <div className="h-1.5 w-12 rounded-full bg-white/25" />
        </div>
      )}

      {presentation === "page" ? (
        <header className="px-6 pt-3 pb-2 text-left">
          <h1 className="text-center text-[1.75rem] font-semibold tracking-tight text-slate-50">
            Edit Transaction
          </h1>
        </header>
      ) : (
        <DialogHeader className="px-6 pb-2 text-left">
            <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
              <button
                aria-label="Cancel editing transaction"
                className="text-lg font-medium text-[#2d8cff] transition-opacity hover:opacity-85"
                onClick={() => onOpenChange(false)}
                type="button"
              >
                Cancel
              </button>
              <DialogTitle className="text-center text-[1.75rem] font-semibold tracking-tight text-slate-50">
                Edit Transaction
              </DialogTitle>
              <span aria-hidden className="w-14" />
            </div>
            <DialogDescription className="sr-only">Update details and save changes without leaving the list.</DialogDescription>
        </DialogHeader>
      )}

          <div
            className="mt-keyboard-scroll-space flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 pb-8 pt-3"
            data-focus-scroll-container
            data-testid="tx-edit-scroll"
          >
            {error ? (
              <Alert className="border-destructive/60 bg-destructive/10 text-destructive" variant="destructive">
                <AlertTitle>Unable to save</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <div className="flex flex-col items-center justify-center py-2 text-center">
              <label className="sr-only" htmlFor="transaction-edit-amount">
                Amount
              </label>
              <div className="inline-flex items-center justify-center gap-3">
                {normalizedCurrency === "AED" ? (
                  <span className="inline-flex h-20 w-20 items-center justify-center">
                    <img alt="AED symbol" className="h-14 w-14 object-contain invert" src={aedSymbol} />
                  </span>
                ) : (
                  <span aria-hidden className="text-5xl font-semibold text-[#2d8cff]">
                    {currencySymbol}
                  </span>
                )}
                <input
                  aria-label="Transaction amount"
                  className="h-auto w-56 border-none bg-transparent p-0 text-center text-6xl font-bold text-slate-100 outline-none [appearance:textfield] [background:transparent] [-webkit-appearance:none] focus:ring-0 focus:outline-none focus-visible:ring-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  id="transaction-edit-amount"
                  inputMode="decimal"
                  onChange={(event) => setAmount(event.target.value)}
                  type="number"
                  value={amount}
                />
              </div>
              <div className="mt-2 flex items-center justify-center gap-2 text-sm text-slate-400">
                <Input
                  aria-label="Transaction currency"
                  className="h-auto w-16 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-center text-base font-semibold tracking-wide text-slate-200 focus-visible:ring-1"
                  id="transaction-edit-currency"
                  maxLength={8}
                  onChange={(event) => setCurrency(event.target.value.toUpperCase())}
                  value={currency}
                />
                <span>• Tap to edit</span>
              </div>
            </div>

            <button
              aria-label="Open category selector"
              className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/6 px-4 py-3.5 text-left transition-colors hover:bg-white/12"
              data-testid="tx-edit-open-category"
              onClick={() => {
                if (presentation === "page" && onOpenCategoryPage) {
                  onOpenCategoryPage();
                  return;
                }
                setCategorySelectorOpen(true);
              }}
              type="button"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-xl bg-[#2d8cff] text-white shadow-[0_10px_22px_rgba(45,140,255,0.28)]">
                  {selectedCategoryIcon ? (
                    <span aria-hidden className="material-symbols-outlined text-[20px]">
                      {selectedCategoryIcon}
                    </span>
                  ) : (
                    <FolderPenIcon aria-hidden className="size-5" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-400">Category</p>
                  <p className="truncate text-[1.625rem] font-semibold leading-tight text-slate-100">{selectedCategoryLabel}</p>
                </div>
              </div>
              <ChevronRightIcon aria-hidden className="size-5 text-slate-500" />
            </button>

            <button
              aria-label="Open date and time picker"
              className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/6 px-4 py-3.5 text-left transition-colors hover:bg-white/12"
              onClick={handleOpenDatePicker}
              type="button"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-xl bg-[#ff8a1f] text-white shadow-[0_10px_22px_rgba(255,138,31,0.25)]">
                  <CalendarDaysIcon aria-hidden className="size-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400">Date & time</p>
                  <p className="text-[1.625rem] font-semibold leading-tight text-slate-100">{transactionDateLabel}</p>
                </div>
              </div>
              <ChevronRightIcon aria-hidden className="size-5 text-slate-500" />
            </button>
            <input
              aria-label="Transaction date and time"
              className="sr-only"
              data-slot="input"
              id="transaction-edit-date"
              onChange={(event) => setTransactionDate(event.target.value)}
              ref={dateInputRef}
              type="datetime-local"
              value={transactionDate}
            />

            <button
              aria-label="Open tag selector"
              className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3.5 text-left transition-colors hover:bg-white/12"
              data-testid="tx-edit-open-tags"
              onClick={() => {
                if (presentation === "page" && onOpenTagsPage) {
                  onOpenTagsPage();
                  return;
                }
                setTagSelectorOpen(true);
              }}
              type="button"
            >
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-medium text-slate-400">Tags</p>
                <span className="text-[#2d8cff]">
                  <PlusCircleIcon aria-hidden className="size-5" />
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {tags.length === 0 ? (
                  <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1.5 text-sm text-slate-400">
                    <TagsIcon aria-hidden className="mr-1.5 size-4" />
                    No tags
                  </span>
                ) : (
                  tags.slice(0, 8).map((tag, index) => (
                    <span
                      className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-[#2d8cff]/15 px-3 py-1.5 text-sm font-medium text-[#57a7ff]"
                      key={`${tag}-${index}`}
                    >
                      <span className="truncate">{tag}</span>
                      <span aria-hidden className="text-base leading-none">
                        ×
                      </span>
                    </span>
                  ))
                )}
              </div>
            </button>

            <div className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3.5">
              <label className="mb-2 block text-xs font-medium text-slate-400" htmlFor="transaction-edit-note">
                Note
              </label>
              <Textarea
                aria-label="Transaction note"
                className="min-h-24 resize-none border-none bg-transparent p-0 text-base text-slate-200 shadow-none placeholder:text-slate-500 focus-visible:ring-0"
                id="transaction-edit-note"
                onChange={(event) => setNote(event.target.value)}
                placeholder="Add a description or receipt details..."
                rows={3}
                value={note}
              />
            </div>
          </div>

          <div className="shrink-0 px-6 pb-[calc(var(--mt-safe-area-inset-bottom)+1rem)]">
            <div className="flex flex-col gap-3 border-t border-white/10 pt-4">
              <Button
                className="h-14 rounded-2xl bg-[#2d8cff] text-lg font-semibold text-white hover:bg-[#257de6]"
                data-testid="tx-edit-save"
                disabled={!hasChanges || saving || deleting}
                onClick={() => void handleSave()}
                type="button"
              >
                {saving ? (
                  <>
                    <LoaderCircleIcon aria-hidden className="animate-spin" data-icon="inline-start" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>

              <Button
                className="h-11 rounded-xl border-none text-lg font-semibold text-[#ff5465] hover:bg-[#ff5465]/10 hover:text-[#ff5465]"
                data-testid="tx-edit-delete-trigger"
                disabled={saving || deleting}
                onClick={() => setDeleteConfirmOpen(true)}
                type="button"
                variant="ghost"
              >
                <Trash2Icon aria-hidden data-icon="inline-start" />
                Delete Transaction
              </Button>
            </div>
          </div>
    </>
  );

  const isPageCategorySelectorOpen = presentation === "page" && activeSubpage === "category";
  const isPageTagSelectorOpen = presentation === "page" && activeSubpage === "tags";

  return (
    <>
      {presentation === "page" ? (
        <section
          className="mt-twa-page-safe-top fixed inset-0 z-30 flex min-h-0 w-full flex-col overflow-hidden bg-[#171923] text-slate-100"
          data-testid="tx-edit-page"
        >
          {editorBody}
        </section>
      ) : (
        <Dialog onOpenChange={onOpenChange} open={open}>
          <DialogContent
            className="mt-transaction-editor-sheet top-auto right-0 bottom-0 left-0 !flex w-full max-w-none translate-x-0 translate-y-0 !flex-col gap-0 rounded-t-[2rem] rounded-b-none border-none bg-[#171923] p-0 text-slate-100 shadow-[0_-24px_56px_rgba(0,0,0,0.55)] sm:max-w-md sm:rounded-t-[2.25rem] sm:rounded-b-none"
            data-testid="tx-edit-dialog"
            showCloseButton={false}
          >
            {editorBody}
          </DialogContent>
        </Dialog>
      )}

      <AlertDialog onOpenChange={setDeleteConfirmOpen} open={deleteConfirmOpen}>
        <AlertDialogContent data-testid="tx-edit-delete-confirm-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this transaction?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The transaction will be removed from your history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="tx-edit-delete-confirm"
              disabled={deleting}
              onClick={(event) => {
                event.preventDefault();
                void handleDelete();
              }}
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <TransactionCategorySelectorDialog
        categories={categories}
        currentCategoryId={categoryId}
        description="Choose a category for your transaction"
        error={null}
        instantApply
        onConfirm={(nextCategoryId) => {
          setCategoryId(nextCategoryId);
          if (presentation === "page") {
            onOpenChange(false);
            return;
          }
          setCategorySelectorOpen(false);
        }}
        onOpenChange={(nextOpen) => {
          if (presentation === "page") {
            if (!nextOpen) {
              onOpenChange(false);
            }
            return;
          }
          setCategorySelectorOpen(nextOpen);
        }}
        open={isPageCategorySelectorOpen || categorySelectorOpen}
        pending={false}
        presentation={presentation === "page" ? "page" : "dialog"}
        title="Select Category"
      />

      <TransactionTagSelectorDialog
        availableTags={availableTags}
        description="Choose tags for your transaction"
        error={null}
        initialTags={tags}
        onConfirm={(nextTags) => {
          setTags(nextTags);
          if (presentation === "page") {
            onOpenChange(false);
            return;
          }
          setTagSelectorOpen(false);
        }}
        onOpenChange={(nextOpen) => {
          if (presentation === "page") {
            if (!nextOpen) {
              onOpenChange(false);
            }
            return;
          }
          setTagSelectorOpen(nextOpen);
        }}
        open={isPageTagSelectorOpen || tagSelectorOpen}
        pending={false}
        presentation={presentation === "page" ? "page" : "dialog"}
        title="Add tags"
      />
    </>
  );
}
