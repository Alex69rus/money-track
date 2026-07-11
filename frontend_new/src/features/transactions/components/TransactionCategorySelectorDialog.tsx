import { useEffect, useMemo, useState } from "react";
import { CheckCircle2Icon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, SearchIcon } from "lucide-react";
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
  instantApply?: boolean;
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

function getCategoryIcon(category: Category): string | null {
  const icon = category.icon?.trim();
  if (!icon) {
    return null;
  }

  return icon;
}

function getCategoryFallback(category: Category): string {
  const trimmed = category.name.trim();
  if (trimmed.length === 0) {
    return "?";
  }

  return trimmed[0]?.toUpperCase() ?? "?";
}

function toHexPair(value: string): string {
  return `${value}${value}`;
}

function normalizeHexColor(color: string): string | null {
  const raw = color.trim();
  if (!raw.startsWith("#")) {
    return null;
  }

  const value = raw.slice(1);
  if (/^[0-9a-fA-F]{3}$/.test(value)) {
    return `${toHexPair(value[0] ?? "0")}${toHexPair(value[1] ?? "0")}${toHexPair(value[2] ?? "0")}`.toLowerCase();
  }

  if (/^[0-9a-fA-F]{6}$/.test(value)) {
    return value.toLowerCase();
  }

  return null;
}

function withAlpha(hexColor: string | null, alpha: number, fallback: string): string {
  if (!hexColor) {
    return fallback;
  }

  const red = Number.parseInt(hexColor.slice(0, 2), 16);
  const green = Number.parseInt(hexColor.slice(2, 4), 16);
  const blue = Number.parseInt(hexColor.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export function TransactionCategorySelectorDialog({
  open,
  categories,
  currentCategoryId,
  pending,
  error,
  title,
  description,
  instantApply = false,
  onOpenChange,
  onConfirm,
}: TransactionCategorySelectorDialogProps): JSX.Element {
  const [search, setSearch] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(currentCategoryId);
  const [expandedGroupIds, setExpandedGroupIds] = useState<Record<number, boolean>>({});
  const normalizedSearch = normalize(search);

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
        const parentMatches = normalize(group.parent.name).includes(query) || normalize(group.parent.type).includes(query);
        const matchingChildren = group.children.filter((category) => normalize(category.name).includes(query));

        if (!parentMatches && matchingChildren.length === 0) {
          return null;
        }

        return {
          ...group,
          visibleChildren: parentMatches ? group.children : matchingChildren,
          parentMatches,
        };
      })
      .filter((group): group is CategoryGroup & { visibleChildren: Category[]; parentMatches: boolean } => group !== null);
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

  const handleCategorySelect = async (nextCategoryId: number | null): Promise<void> => {
    setSelectedCategoryId(nextCategoryId);

    if (!instantApply || pending) {
      return;
    }

    if (nextCategoryId === currentCategoryId) {
      onOpenChange(false);
      return;
    }

    await onConfirm(nextCategoryId);
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        className="mt-category-selector-sheet top-auto right-0 bottom-0 left-0 !flex w-full max-w-none translate-x-0 translate-y-0 !flex-col gap-0 overflow-hidden rounded-t-[1.75rem] rounded-b-none border-none bg-[#0f1b2a] p-0 text-slate-100 shadow-[0_-24px_56px_rgba(0,0,0,0.55)] sm:top-auto sm:right-0 sm:bottom-0 sm:left-0 sm:max-w-none sm:translate-x-0 sm:translate-y-0 sm:rounded-t-[1.75rem] sm:rounded-b-none"
        data-testid="tx-category-dialog"
        showCloseButton={false}
      >
        <DialogHeader className="px-4 pt-6 pb-2 text-left">
          <div className="relative flex items-center justify-center">
            <Button
              aria-label="Close category selector"
              className="absolute left-0 -ml-2 size-10 rounded-full text-slate-200 hover:bg-white/10 hover:text-white"
              onClick={() => onOpenChange(false)}
              type="button"
              variant="ghost"
            >
              <ChevronLeftIcon aria-hidden className="size-6" />
            </Button>
            <DialogTitle className="text-[1.95rem] font-bold tracking-tight text-slate-100">{title}</DialogTitle>
          </div>
          <DialogDescription className="pt-1 text-center text-base text-slate-400">{description}</DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col px-4 pb-0">
          {error ? (
            <Alert className="mb-3 border-destructive/60 bg-destructive/10 text-destructive" variant="destructive">
              <AlertTitle>Could not update category</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="relative py-3">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-4 size-6 -translate-y-1/2 text-slate-500" />
            <Input
              aria-label="Search categories"
              className="h-11 rounded-2xl border border-white/10 bg-[#162237] pl-12 text-base text-slate-100 placeholder:text-slate-500 focus-visible:border-[#2d8cff] focus-visible:ring-1 focus-visible:ring-[#2d8cff]/60"
              data-testid="tx-category-search"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search categories..."
              type="search"
              value={search}
            />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto pb-6" data-testid="tx-category-scroll">
            <div className="flex flex-col border-b border-[#22334a]/80">
              <button
                aria-label="Remove category"
                className={cn(
                  "flex w-full items-center justify-between border-b border-[#22334a]/80 py-3 text-left text-base font-semibold transition-colors",
                  selectedCategoryId === null
                    ? "rounded-xl bg-[#143450] px-3 text-[#2d8cff]"
                    : "text-slate-100 hover:bg-white/5",
                )}
                data-testid="tx-category-option-uncategorized"
                onClick={() => void handleCategorySelect(null)}
                type="button"
              >
                <span className="truncate">Uncategorized</span>
                {selectedCategoryId === null ? <CheckCircle2Icon aria-hidden className="size-6 shrink-0" /> : null}
              </button>

              {filteredGroups.map((group) => {
                const isParentSelected = selectedCategoryId === group.parent.id;
                const hasChildren = group.children.length > 0;
                const isExpanded = normalizedSearch.length > 0 ? true : (expandedGroupIds[group.parent.id] ?? false);
                const parentColor = normalizeHexColor(group.parent.color ?? "");
                const parentIcon = getCategoryIcon(group.parent);
                const iconBackground = withAlpha(parentColor, 0.22, "rgba(45, 140, 255, 0.18)");
                const iconForeground = parentColor ? `#${parentColor}` : "#2d8cff";
                const showChildren = hasChildren && (isExpanded || normalizedSearch.length > 0);
                const childIndentClass = hasChildren ? "pl-14" : "pl-0";

                return (
                  <div className="border-t border-[#22334a]/80 py-1.5 first:border-t-0" key={group.parent.id}>
                    <div className="flex items-center gap-3 py-0.5">
                      <button
                        aria-label={`Select category ${group.parent.name}`}
                        className={cn(
                          "flex min-w-0 flex-1 items-center gap-3 rounded-xl px-0 py-1.5 text-left transition-colors",
                          isParentSelected ? "text-[#2d8cff]" : "text-slate-100 hover:bg-white/5",
                        )}
                        data-testid={`tx-category-option-${group.parent.id}`}
                        onClick={() => void handleCategorySelect(group.parent.id)}
                        type="button"
                      >
                        <div
                          className="flex size-11 shrink-0 items-center justify-center rounded-2xl"
                          style={{
                            backgroundColor: iconBackground,
                            color: iconForeground,
                          }}
                        >
                          {parentIcon ? (
                            <span aria-hidden className="material-symbols-outlined text-[1.5rem] leading-none">
                              {parentIcon}
                            </span>
                          ) : (
                            <span className="text-base font-semibold">{getCategoryFallback(group.parent)}</span>
                          )}
                        </div>
                        <span className="truncate text-[1.15rem] font-semibold tracking-tight">{group.parent.name}</span>
                      </button>

                      <button
                        aria-label={
                          hasChildren
                            ? `${isExpanded ? "Collapse" : "Expand"} ${group.parent.name} group`
                            : `Select category ${group.parent.name}`
                        }
                        className="flex size-9 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-white/10 hover:text-slate-200"
                        onClick={() => {
                          if (!hasChildren) {
                            void handleCategorySelect(group.parent.id);
                            return;
                          }
                          toggleExpanded(group.parent.id);
                        }}
                        type="button"
                      >
                        {hasChildren ? (
                          <ChevronDownIcon
                            aria-hidden
                            className={cn("size-5 transition-transform", isExpanded ? "rotate-180" : "")}
                          />
                        ) : isParentSelected ? (
                          <CheckCircle2Icon aria-hidden className="size-5 text-[#2d8cff]" />
                        ) : (
                          <ChevronRightIcon aria-hidden className="size-5" />
                        )}
                      </button>
                    </div>

                    {showChildren ? (
                      <div className={cn("flex flex-col gap-2 pb-2", childIndentClass)}>
                        {group.visibleChildren.map((category) => {
                          const isSelected = selectedCategoryId === category.id;

                          return (
                            <button
                              aria-label={`Select category ${category.name}`}
                              className={cn(
                                "flex items-center justify-between rounded-xl px-3 py-2.5 text-left text-base transition-colors",
                                isSelected
                                  ? "bg-[#143450] text-[#2d8cff]"
                                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200",
                              )}
                              data-testid={`tx-category-option-${category.id}`}
                              key={category.id}
                              onClick={() => void handleCategorySelect(category.id)}
                              type="button"
                            >
                              <span className="truncate">{category.name}</span>
                              {isSelected ? <CheckCircle2Icon aria-hidden className="size-5 shrink-0" /> : null}
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              })}

              {filteredGroups.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-400">
                  No categories match your search.
                </p>
              ) : null}
            </div>
          </div>
        </div>

        {instantApply ? null : (
          <div className="border-t border-[#22334a] bg-[#0f1b2a] px-4 pt-4 pb-[calc(var(--mt-safe-area-inset-bottom)+1rem)]">
            <Button
              className="h-14 w-full rounded-2xl bg-[#2d8cff] text-lg font-semibold text-white hover:bg-[#257de6]"
              data-testid="tx-category-update"
              disabled={!hasCategoryChanges || pending}
              onClick={() => void handleConfirm()}
              type="button"
            >
              {pending ? "Updating..." : "Confirm Selection"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
