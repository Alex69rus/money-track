import { useEffect, useMemo, useState } from "react";
import { ChevronLeftIcon, PlusIcon, XIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { cn } from "@/lib/utils";
import { normalizeTag } from "@/features/transactions/utils";

interface TransactionTagSelectorDialogProps {
  open: boolean;
  availableTags: string[];
  initialTags: string[];
  allowCreate?: boolean;
  pending: boolean;
  error: string | null;
  title: string;
  description: string;
  presentation?: "dialog" | "page";
  onOpenChange: (open: boolean) => void;
  onConfirm: (tags: string[]) => Promise<void> | void;
}

function dedupeTags(tags: string[]): string[] {
  const deduped: string[] = [];

  for (const tag of tags) {
    const normalized = normalizeTag(tag);
    if (!normalized) {
      continue;
    }

    if (deduped.some((existing) => normalizeTag(existing) === normalized)) {
      continue;
    }

    deduped.push(tag.trim());
  }

  return deduped;
}

function areTagsEqual(first: string[], second: string[]): boolean {
  const sortedFirst = [...first].map(normalizeTag).sort();
  const sortedSecond = [...second].map(normalizeTag).sort();

  if (sortedFirst.length !== sortedSecond.length) {
    return false;
  }

  return sortedFirst.every((tag, index) => tag === sortedSecond[index]);
}

export function TransactionTagSelectorDialog({
  open,
  availableTags,
  initialTags,
  allowCreate = true,
  pending,
  error,
  title,
  description,
  presentation = "dialog",
  onOpenChange,
  onConfirm,
}: TransactionTagSelectorDialogProps): JSX.Element {
  const [search, setSearch] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setSearch("");
    setSelectedTags(dedupeTags(initialTags));
  }, [initialTags, open]);

  const availablePool = useMemo(() => dedupeTags([...availableTags, ...selectedTags]), [
    availableTags,
    selectedTags,
  ]);

  const normalizedSearch = normalizeTag(search);

  const filteredAvailableTags = useMemo(() => {
    if (!normalizedSearch) {
      return availablePool;
    }

    return availablePool.filter((tag) => normalizeTag(tag).includes(normalizedSearch));
  }, [availablePool, normalizedSearch]);

  const canCreateTag =
    allowCreate &&
    normalizedSearch.length > 0 &&
    !availablePool.some((tag) => normalizeTag(tag) === normalizedSearch);

  const hasChanges = !areTagsEqual(selectedTags, initialTags);

  const toggleTag = (tag: string): void => {
    const normalized = normalizeTag(tag);
    const exists = selectedTags.some((item) => normalizeTag(item) === normalized);

    if (exists) {
      setSelectedTags((current) => current.filter((item) => normalizeTag(item) !== normalized));
      return;
    }

    setSelectedTags((current) => dedupeTags([...current, tag]));
  };

  const handleAddFromSearch = (): void => {
    if (!canCreateTag) {
      return;
    }

    setSelectedTags((current) => dedupeTags([...current, search.trim()]));
    setSearch("");
  };

  const handleConfirm = async (): Promise<void> => {
    if (!hasChanges || pending) {
      return;
    }

    await onConfirm(dedupeTags(selectedTags));
  };

  const updateLabel = useMemo(() => {
    if (pending) {
      return "Updating...";
    }

    const count = selectedTags.length;
    if (count > 0) {
      return `Update ${count} ${count === 1 ? "Tag" : "Tags"}`;
    }

    return "Update Tags";
  }, [pending, selectedTags.length]);

  if (presentation === "page" && !open) {
    return <></>;
  }

  const selectorBody = (
    <>
      {presentation === "page" ? (
        <header className="border-b border-[#22334a]/80 bg-[#0f1b2a] px-4 py-3 text-left">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-[2rem] font-semibold tracking-tight text-slate-100">{title}</h1>
            <Button
              aria-label="Confirm selected tags"
              className="h-10 min-w-0 px-2 text-base font-semibold text-[#2d8cff] hover:bg-white/10 hover:text-[#2d8cff]"
              disabled={!hasChanges || pending}
              onClick={() => void handleConfirm()}
              type="button"
              variant="ghost"
            >
              Done
            </Button>
          </div>
          <p className="sr-only">{description}</p>
        </header>
      ) : (
        <DialogHeader className="border-b border-[#22334a]/80 bg-[#0f1b2a] px-4 py-3 text-left">
          <div className="grid grid-cols-[2.5rem_1fr_2.5rem] items-center">
            <Button
              aria-label="Close tag selector"
              className="size-10 rounded-full text-[#2d8cff] hover:bg-white/10 hover:text-[#2d8cff]"
              onClick={() => onOpenChange(false)}
              type="button"
              variant="ghost"
            >
              <ChevronLeftIcon aria-hidden className="size-6" />
            </Button>
            <DialogTitle className="text-center text-[2rem] font-semibold tracking-tight text-slate-100">
              {title}
            </DialogTitle>
            <Button
              aria-label={hasChanges ? "Confirm selected tags" : "Close tag selector"}
              className="h-10 min-w-0 px-2 text-base font-semibold text-[#2d8cff] hover:bg-white/10 hover:text-[#2d8cff]"
              disabled={pending}
              onClick={() => {
                if (hasChanges) {
                  void handleConfirm();
                  return;
                }
                onOpenChange(false);
              }}
              type="button"
              variant="ghost"
            >
              Done
            </Button>
          </div>
          <DialogDescription className="sr-only">{description}</DialogDescription>
        </DialogHeader>
      )}

        <div className="flex min-h-0 flex-1 flex-col bg-[#0b1624]">
          {error ? (
            <Alert className="mx-4 mt-4 border-destructive/60 bg-destructive/10 text-destructive" variant="destructive">
              <AlertTitle>Could not update tags</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="border-b border-[#22334a]/80 px-4 py-4">
            <div className="rounded-2xl border border-[#2a3c56] bg-[#162337] p-3">
              <div className="flex flex-wrap gap-2">
                {selectedTags.map((tag) => (
                  <Badge
                    className="h-10 rounded-full bg-[#2d8cff] px-4 text-base font-semibold text-white hover:bg-[#2d8cff]"
                    key={tag}
                    variant="secondary"
                  >
                    <span className="truncate">{tag}</span>
                    <button
                      aria-label={`Remove ${tag} tag`}
                      className="ml-2 rounded-full text-white/95 transition-opacity hover:opacity-80"
                      onClick={() => toggleTag(tag)}
                      type="button"
                    >
                      <XIcon aria-hidden className="size-4" />
                    </button>
                  </Badge>
                ))}

                <div className="min-w-[9rem] flex-1">
                  <Input
                    aria-label="Search tags"
                    className="h-10 border-none bg-transparent px-2 text-[1.1rem] text-slate-100 placeholder:text-slate-500 focus-visible:ring-0"
                    data-testid="tx-tags-search"
                    onChange={(event) => setSearch(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        handleAddFromSearch();
                      }
                    }}
                    placeholder="Search tags..."
                    type="search"
                    value={search}
                  />
                </div>
              </div>
            </div>

            {canCreateTag ? (
              <Button
                className="mt-3 w-full rounded-xl border-[#2a3c56] bg-transparent text-sm font-medium text-[#81b8ff] hover:bg-[#2a3c56]/35 hover:text-[#9bc7ff]"
                data-testid="tx-tags-add-from-search"
                onClick={handleAddFromSearch}
                size="xs"
                type="button"
                variant="outline"
              >
                <PlusIcon aria-hidden data-icon="inline-start" />
                Add "{search.trim()}"
              </Button>
            ) : null}
          </div>

          <div
            className="min-h-0 flex-1 overflow-y-auto px-4 py-4 pb-6"
            data-focus-scroll-container
            data-testid="tx-tags-scroll"
          >
            <h3 className="mb-4 px-1 text-[0.78rem] font-semibold tracking-[0.14em] text-slate-400 uppercase">
              Available Tags
            </h3>
            <div className="flex flex-wrap gap-3">
              {filteredAvailableTags.map((tag) => {
                const isSelected = selectedTags.some((item) => normalizeTag(item) === normalizeTag(tag));

                return (
                  <button
                    aria-label={`${isSelected ? "Remove" : "Add"} ${tag} tag`}
                    className={cn(
                      "flex max-w-full items-center gap-2 rounded-[0.85rem] px-4 py-2 text-[1.1rem] font-medium transition-colors",
                      isSelected
                        ? "bg-[#2d8cff] text-white hover:bg-[#2d8cff]/90"
                        : "bg-[#1a2a40] text-slate-100 hover:bg-[#22334d]",
                    )}
                    data-testid={`tx-tag-option-${normalizeTag(tag)}`}
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    type="button"
                  >
                    <span className={cn("text-[1.3rem] leading-none", isSelected ? "text-white" : "text-slate-400")}>#</span>
                    <span className="max-w-52 truncate leading-none">{tag}</span>
                  </button>
                );
              })}
            </div>

            {filteredAvailableTags.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-400">
                No tags match your search.
              </p>
            ) : null}
          </div>
        </div>

        <div className="border-t border-[#22334a]/80 bg-[#0f1b2a] px-4 py-4 pb-[calc(var(--mt-safe-area-inset-bottom)+1rem)]">
          <Button
            className="h-14 w-full rounded-2xl bg-[#2d8cff] text-[1.2rem] font-semibold text-white shadow-[0_10px_24px_rgba(45,140,255,0.38)] hover:bg-[#2d8cff]/90"
            data-testid="tx-tags-update"
            disabled={!hasChanges || pending}
            onClick={() => void handleConfirm()}
            type="button"
          >
            {updateLabel}
          </Button>
        </div>
    </>
  );

  if (presentation === "page") {
    return (
      <section
        className="mt-twa-page-safe-top fixed inset-0 z-30 flex min-h-0 w-full flex-col overflow-hidden bg-[#0e1a2a] text-slate-100"
        data-testid="tx-tags-page"
      >
        {selectorBody}
      </section>
    );
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        className="mt-tag-selector-sheet top-auto right-0 bottom-0 left-0 !flex w-full max-w-none translate-x-0 translate-y-0 !flex-col gap-0 overflow-hidden rounded-t-[1.75rem] rounded-b-none border-none bg-[#0e1a2a] p-0 text-slate-100 shadow-[0_-24px_56px_rgba(0,0,0,0.58)] sm:top-auto sm:right-0 sm:bottom-0 sm:left-0 sm:max-w-none sm:translate-x-0 sm:translate-y-0 sm:rounded-t-[1.75rem] sm:rounded-b-none"
        data-testid="tx-tags-dialog"
        showCloseButton={false}
      >
        {selectorBody}
      </DialogContent>
    </Dialog>
  );
}
