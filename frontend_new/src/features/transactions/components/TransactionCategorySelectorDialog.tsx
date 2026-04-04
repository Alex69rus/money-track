import { useEffect, useMemo, useState } from "react";
import { CheckCircle2Icon, ChevronDownIcon, SearchIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import type { Category } from "@/types/transactions";

interface TransactionCategorySelectorDialogProps {
  open: boolean;
  categories: Category[];
  currentCategoryId: number | null;
  pending: boolean;
  error: string | null;
  title: string;
  description: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: (categoryId: number | null) => Promise<void> | void;
}

interface CategoryGroup {
  parent: Category;
  children: Category[];
}

function byCategoryOrder(first: Category, second: Category): number {
  const firstOrder = first.orderIndex ?? Number.MAX_SAFE_INTEGER;
  const secondOrder = second.orderIndex ?? Number.MAX_SAFE_INTEGER;

  if (firstOrder !== secondOrder) {
    return firstOrder - secondOrder;
  }

  return first.name.localeCompare(second.name);
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function getCategoryMonogram(category: Category): string {
  const parts = category.name
    .split(" ")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
  }

  return parts[0]?.slice(0, 2).toUpperCase() || "?";
}

export function TransactionCategorySelectorDialog({
  open,
  categories,
  currentCategoryId,
  pending,
  error,
  title,
  description,
  onOpenChange,
  onConfirm,
}: TransactionCategorySelectorDialogProps): JSX.Element {
  const [search, setSearch] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(currentCategoryId);
  const [expandedGroupIds, setExpandedGroupIds] = useState<Record<number, boolean>>({});

  const groups = useMemo<CategoryGroup[]>(() => {
    const sorted = [...categories].sort(byCategoryOrder);
    const topLevel = sorted.filter((category) => category.parentCategoryId === null);
    const parentLookup = new Set(topLevel.map((category) => category.id));

    const grouped = topLevel.map((parent) => ({
      parent,
      children: sorted.filter((category) => category.parentCategoryId === parent.id),
    }));

    const orphanLeafs = sorted
      .filter((category) => category.parentCategoryId !== null && !parentLookup.has(category.parentCategoryId))
      .map((category) => ({ parent: category, children: [] }));

    return [...grouped, ...orphanLeafs];
  }, [categories]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setSearch("");
    setSelectedCategoryId(currentCategoryId);

    const expanded: Record<number, boolean> = {};
    groups.forEach((group, index) => {
      const containsSelection =
        group.parent.id === currentCategoryId ||
        group.children.some((category) => category.id === currentCategoryId);

      expanded[group.parent.id] = group.children.length > 0 && (containsSelection || index < 3);
    });
    setExpandedGroupIds(expanded);
  }, [currentCategoryId, groups, open]);

  const filteredGroups = useMemo(() => {
    const query = normalize(search);
    if (query.length === 0) {
      return groups.map((group) => ({
        ...group,
        visibleChildren: group.children,
      }));
    }

    return groups
      .map((group) => {
        const parentMatches = normalize(group.parent.name).includes(query);
        const matchingChildren = group.children.filter((category) => normalize(category.name).includes(query));

        if (!parentMatches && matchingChildren.length === 0) {
          return null;
        }

        return {
          ...group,
          visibleChildren: parentMatches ? group.children : matchingChildren,
        };
      })
      .filter((group): group is CategoryGroup & { visibleChildren: Category[] } => group !== null);
  }, [groups, search]);

  const hasCategoryChanges = selectedCategoryId !== currentCategoryId;

  const toggleExpanded = (groupId: number): void => {
    setExpandedGroupIds((current) => ({
      ...current,
      [groupId]: !current[groupId],
    }));
  };

  const handleConfirm = async (): Promise<void> => {
    if (!hasCategoryChanges || pending) {
      return;
    }

    await onConfirm(selectedCategoryId);
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        className="top-auto right-0 bottom-0 left-0 max-h-[85vh] w-full max-w-none translate-x-0 translate-y-0 rounded-t-3xl rounded-b-none p-0 sm:rounded-t-3xl sm:rounded-b-none"
        data-testid="tx-category-dialog"
        showCloseButton={false}
      >
        <DialogHeader className="border-b px-4 py-3 text-left">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 px-4 py-3">
          {error ? (
            <Alert variant="destructive">
              <AlertTitle>Could not update category</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="relative">
            <SearchIcon className="pointer-events-none absolute top-2.5 left-3 size-4 text-muted-foreground" />
            <Input
              aria-label="Search categories"
              className="pl-9"
              data-testid="tx-category-search"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search categories"
              type="search"
              value={search}
            />
          </div>

          <div className="max-h-[48vh] overflow-y-auto pr-1">
            <div className="flex flex-col gap-1">
              <button
                aria-label="Remove category"
                className={cn(
                  "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                  selectedCategoryId === null
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-transparent hover:bg-accent",
                )}
                data-testid="tx-category-option-uncategorized"
                onClick={() => setSelectedCategoryId(null)}
                type="button"
              >
                <span>Uncategorized</span>
                {selectedCategoryId === null ? <CheckCircle2Icon aria-hidden className="size-4" /> : null}
              </button>

              {filteredGroups.map((group) => {
                const isParentSelected = selectedCategoryId === group.parent.id;
                const isExpanded = expandedGroupIds[group.parent.id] ?? false;
                const hasChildren = group.children.length > 0;

                return (
                  <div className="rounded-xl border border-border/70" key={group.parent.id}>
                    <div className="flex items-center gap-1 p-1">
                      <button
                        aria-label={`Select category ${group.parent.name}`}
                        className={cn(
                          "flex min-w-0 flex-1 items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors",
                          isParentSelected ? "bg-primary/10 text-primary" : "hover:bg-accent",
                        )}
                        data-testid={`tx-category-option-${group.parent.id}`}
                        onClick={() => setSelectedCategoryId(group.parent.id)}
                        type="button"
                      >
                        <div className="flex size-8 items-center justify-center rounded-lg bg-muted text-xs font-semibold">
                          {getCategoryMonogram(group.parent)}
                        </div>
                        <span className="truncate text-sm font-medium">{group.parent.name}</span>
                        {isParentSelected ? <CheckCircle2Icon aria-hidden className="ml-auto size-4" /> : null}
                      </button>

                      {hasChildren ? (
                        <Button
                          aria-label={`${isExpanded ? "Collapse" : "Expand"} ${group.parent.name} group`}
                          onClick={() => toggleExpanded(group.parent.id)}
                          size="icon-xs"
                          type="button"
                          variant="ghost"
                        >
                          <ChevronDownIcon
                            aria-hidden
                            className={cn("transition-transform", isExpanded ? "rotate-180" : "")}
                          />
                        </Button>
                      ) : null}
                    </div>

                    {hasChildren && isExpanded ? (
                      <div className="flex flex-col gap-1 px-2 pb-2">
                        {group.visibleChildren.map((category) => {
                          const isSelected = selectedCategoryId === category.id;

                          return (
                            <button
                              aria-label={`Select category ${category.name}`}
                              className={cn(
                                "flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors",
                                isSelected ? "bg-primary/10 text-primary" : "hover:bg-accent",
                              )}
                              data-testid={`tx-category-option-${category.id}`}
                              key={category.id}
                              onClick={() => setSelectedCategoryId(category.id)}
                              type="button"
                            >
                              <span className="truncate">{category.name}</span>
                              {isSelected ? <CheckCircle2Icon aria-hidden className="size-4" /> : null}
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              })}

              {filteredGroups.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No categories match your search.
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="border-t px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
          <Button
            className="w-full"
            data-testid="tx-category-update"
            disabled={!hasCategoryChanges || pending}
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
