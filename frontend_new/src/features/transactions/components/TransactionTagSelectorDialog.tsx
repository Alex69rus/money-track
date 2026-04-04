import { useEffect, useMemo, useState } from "react";
import { PlusIcon, SearchIcon, TagIcon, XIcon } from "lucide-react";
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
  pending: boolean;
  error: string | null;
  title: string;
  description: string;
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
  pending,
  error,
  title,
  description,
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

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        className="top-auto right-0 bottom-0 left-0 max-h-[85vh] w-full max-w-none translate-x-0 translate-y-0 rounded-t-3xl rounded-b-none p-0 sm:rounded-t-3xl sm:rounded-b-none"
        data-testid="tx-tags-dialog"
        showCloseButton={false}
      >
        <DialogHeader className="border-b px-4 py-3 text-left">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 px-4 py-3">
          {error ? (
            <Alert variant="destructive">
              <AlertTitle>Could not update tags</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="rounded-xl border bg-muted/40 p-3">
            <div className="flex flex-wrap gap-2">
              {selectedTags.map((tag) => (
                <Badge className="gap-1.5" key={tag} variant="default">
                  {tag}
                  <button
                    aria-label={`Remove ${tag} tag`}
                    className="rounded-full"
                    onClick={() => toggleTag(tag)}
                    type="button"
                  >
                    <XIcon aria-hidden className="size-3" />
                  </button>
                </Badge>
              ))}

              <div className="relative min-w-36 flex-1">
                <SearchIcon className="pointer-events-none absolute top-2.5 left-2 size-3 text-muted-foreground" />
                <Input
                  aria-label="Search tags"
                  className="h-8 pl-7 text-xs"
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

            {canCreateTag ? (
              <Button
                className="mt-2 w-full"
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

          <div className="max-h-[48vh] overflow-y-auto pr-1">
            <div className="flex flex-wrap gap-2">
              {filteredAvailableTags.map((tag) => {
                const isSelected = selectedTags.some((item) => normalizeTag(item) === normalizeTag(tag));

                return (
                  <button
                    aria-label={`${isSelected ? "Remove" : "Add"} ${tag} tag`}
                    className={cn(
                      "flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors",
                      isSelected
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card hover:bg-accent",
                    )}
                    data-testid={`tx-tag-option-${normalizeTag(tag)}`}
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    type="button"
                  >
                    <TagIcon aria-hidden className="size-4 text-muted-foreground" />
                    <span>{tag}</span>
                  </button>
                );
              })}
            </div>

            {filteredAvailableTags.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No tags match your search.
              </p>
            ) : null}
          </div>
        </div>

        <div className="border-t px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
          <Button
            className="w-full"
            data-testid="tx-tags-update"
            disabled={!hasChanges || pending}
            onClick={() => void handleConfirm()}
            type="button"
          >
            {pending ? "Updating..." : "Update"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
