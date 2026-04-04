import { useEffect, useMemo, useState } from "react";
import { CalendarClockIcon, FolderPenIcon, LoaderCircleIcon, TagsIcon, Trash2Icon } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
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

export function TransactionEditDialog({
  open,
  transaction,
  categories,
  availableTags,
  onOpenChange,
  onSaved,
  onDeleted,
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

  const categoryNameById = useMemo(() => {
    return new Map(categories.map((category) => [category.id, category.name]));
  }, [categories]);

  const selectedCategoryLabel = categoryId === null ? "Uncategorized" : categoryNameById.get(categoryId) || "Unknown";

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

  return (
    <>
      <Dialog onOpenChange={onOpenChange} open={open}>
        <DialogContent
          className="top-auto right-0 bottom-0 left-0 max-h-[92vh] w-full max-w-none translate-x-0 translate-y-0 gap-0 rounded-t-3xl rounded-b-none p-0 sm:rounded-t-3xl sm:rounded-b-none"
          data-testid="tx-edit-dialog"
          showCloseButton={false}
        >
          <DialogHeader className="border-b px-4 py-3 text-left">
            <DialogTitle>Edit transaction</DialogTitle>
            <DialogDescription>Update details and save changes without leaving the list.</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 overflow-y-auto px-4 py-4">
            {error ? (
              <Alert variant="destructive">
                <AlertTitle>Action failed</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium" htmlFor="transaction-edit-amount">
                Amount
              </label>
              <Input
                aria-label="Transaction amount"
                id="transaction-edit-amount"
                inputMode="decimal"
                onChange={(event) => setAmount(event.target.value)}
                type="number"
                value={amount}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium" htmlFor="transaction-edit-currency">
                  Currency
                </label>
                <Input
                  aria-label="Transaction currency"
                  id="transaction-edit-currency"
                  maxLength={8}
                  onChange={(event) => setCurrency(event.target.value.toUpperCase())}
                  value={currency}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium" htmlFor="transaction-edit-date">
                  Date & time
                </label>
                <Input
                  aria-label="Transaction date and time"
                  id="transaction-edit-date"
                  onChange={(event) => setTransactionDate(event.target.value)}
                  type="datetime-local"
                  value={transactionDate}
                />
              </div>
            </div>

            <button
              aria-label="Open category selector"
              className="flex items-center justify-between rounded-xl border px-3 py-2 text-left transition-colors hover:bg-accent"
              data-testid="tx-edit-open-category"
              onClick={() => setCategorySelectorOpen(true)}
              type="button"
            >
              <div className="flex items-center gap-2">
                <FolderPenIcon aria-hidden className="size-4 text-muted-foreground" />
                <span className="text-sm font-medium">Category</span>
              </div>
              <Badge variant="outline">{selectedCategoryLabel}</Badge>
            </button>

            <button
              aria-label="Open tag selector"
              className="flex items-center justify-between rounded-xl border px-3 py-2 text-left transition-colors hover:bg-accent"
              data-testid="tx-edit-open-tags"
              onClick={() => setTagSelectorOpen(true)}
              type="button"
            >
              <div className="flex items-center gap-2">
                <TagsIcon aria-hidden className="size-4 text-muted-foreground" />
                <span className="text-sm font-medium">Tags</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {tags.length > 0 ? `${tags.length} selected` : "None"}
              </span>
            </button>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium" htmlFor="transaction-edit-note">
                Note
              </label>
              <Textarea
                aria-label="Transaction note"
                id="transaction-edit-note"
                onChange={(event) => setNote(event.target.value)}
                placeholder="Add a note"
                rows={3}
                value={note}
              />
            </div>
          </div>

          <div className="border-t px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
            <div className="flex flex-col gap-2">
              <Button
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
                  <>
                    <CalendarClockIcon aria-hidden data-icon="inline-start" />
                    Save changes
                  </>
                )}
              </Button>

              <Button
                data-testid="tx-edit-delete-trigger"
                disabled={saving || deleting}
                onClick={() => setDeleteConfirmOpen(true)}
                type="button"
                variant="outline"
              >
                <Trash2Icon aria-hidden data-icon="inline-start" />
                Delete transaction
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
        description="Choose a category and confirm to apply."
        error={null}
        onConfirm={(nextCategoryId) => {
          setCategoryId(nextCategoryId);
          setCategorySelectorOpen(false);
        }}
        onOpenChange={setCategorySelectorOpen}
        open={categorySelectorOpen}
        pending={false}
        title="Select category"
      />

      <TransactionTagSelectorDialog
        availableTags={availableTags}
        description="Add or remove tags, then confirm."
        error={null}
        initialTags={tags}
        onConfirm={(nextTags) => {
          setTags(nextTags);
          setTagSelectorOpen(false);
        }}
        onOpenChange={setTagSelectorOpen}
        open={tagSelectorOpen}
        pending={false}
        title="Edit tags"
      />
    </>
  );
}
