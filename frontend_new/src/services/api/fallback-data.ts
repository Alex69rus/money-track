import type {
  Category,
  PaginatedTransactions,
  Transaction,
  TransactionsQueryFilters,
} from "@/types/transactions";

interface ListFallbackTransactionsParams extends TransactionsQueryFilters {
  skip?: number;
  take?: number;
}

const GROCERY_CATEGORY: Category = {
  id: 9001,
  name: "Groceries",
  type: "EXPENSE",
  color: "#22c55e",
  icon: "shopping_cart",
  parentCategoryId: null,
  orderIndex: 1,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
};

const TRANSPORT_CATEGORY: Category = {
  id: 9002,
  name: "Transport",
  type: "EXPENSE",
  color: "#3b82f6",
  icon: "directions_car",
  parentCategoryId: null,
  orderIndex: 2,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
};

const SALARY_CATEGORY: Category = {
  id: 9003,
  name: "Salary",
  type: "INCOME",
  color: "#16a34a",
  icon: "payments",
  parentCategoryId: null,
  orderIndex: 3,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
};

const FALLBACK_CATEGORIES: Category[] = [GROCERY_CATEGORY, TRANSPORT_CATEGORY, SALARY_CATEGORY];

const FALLBACK_TRANSACTIONS: Transaction[] = [
  {
    id: 9901,
    userId: 1,
    transactionDate: new Date("2026-04-04T08:45:00.000Z"),
    amount: -58.2,
    note: "Fallback grocery basket",
    categoryId: 9001,
    tags: ["fallback", "food"],
    currency: "AED",
    smsText: null,
    messageId: null,
    createdAt: new Date("2026-04-04T08:46:00.000Z"),
    category: GROCERY_CATEGORY,
  },
  {
    id: 9902,
    userId: 1,
    transactionDate: new Date("2026-04-03T16:15:00.000Z"),
    amount: -23.75,
    note: "Fallback taxi ride",
    categoryId: 9002,
    tags: ["fallback", "transport"],
    currency: "AED",
    smsText: null,
    messageId: null,
    createdAt: new Date("2026-04-03T16:16:00.000Z"),
    category: TRANSPORT_CATEGORY,
  },
  {
    id: 9903,
    userId: 1,
    transactionDate: new Date("2026-04-01T05:30:00.000Z"),
    amount: 8250,
    note: "Fallback salary transfer",
    categoryId: 9003,
    tags: ["fallback", "income"],
    currency: "AED",
    smsText: null,
    messageId: null,
    createdAt: new Date("2026-04-01T05:31:00.000Z"),
    category: SALARY_CATEGORY,
  },
  {
    id: 9904,
    userId: 1,
    transactionDate: new Date("2026-03-28T10:05:00.000Z"),
    amount: -112.4,
    note: "Fallback supermarket order",
    categoryId: 9001,
    tags: ["fallback", "family"],
    currency: "AED",
    smsText: null,
    messageId: null,
    createdAt: new Date("2026-03-28T10:06:00.000Z"),
    category: GROCERY_CATEGORY,
  },
];

function normalize(text: string): string {
  return text.trim().toLowerCase();
}

function cloneCategory(category: Category): Category {
  return {
    ...category,
    createdAt: new Date(category.createdAt),
  };
}

function cloneTransaction(transaction: Transaction): Transaction {
  return {
    ...transaction,
    tags: [...transaction.tags],
    transactionDate: new Date(transaction.transactionDate),
    createdAt: new Date(transaction.createdAt),
    category: transaction.category ? cloneCategory(transaction.category) : null,
  };
}

function toDateOnlyKey(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function includesAnyTag(transactionTags: string[], filterTags: string[]): boolean {
  const transactionNormalized = transactionTags.map(normalize);
  return filterTags.some((tag) => transactionNormalized.includes(normalize(tag)));
}

export function getFallbackCategories(): Category[] {
  return FALLBACK_CATEGORIES.map(cloneCategory);
}

export function getFallbackTags(): string[] {
  return Array.from(
    new Set(FALLBACK_TRANSACTIONS.flatMap((transaction) => transaction.tags.map((tag) => tag.trim()))),
  ).sort((first, second) => first.localeCompare(second));
}

export function listFallbackTransactions(
  params: ListFallbackTransactionsParams,
): PaginatedTransactions {
  const filtered = FALLBACK_TRANSACTIONS.filter((transaction) => {
    if (params.fromDate && toDateOnlyKey(transaction.transactionDate) < params.fromDate) {
      return false;
    }

    if (params.toDate && toDateOnlyKey(transaction.transactionDate) > params.toDate) {
      return false;
    }

    if (params.categoryId !== undefined && transaction.categoryId !== params.categoryId) {
      return false;
    }

    if (params.minAmount !== undefined && transaction.amount < params.minAmount) {
      return false;
    }

    if (params.maxAmount !== undefined && transaction.amount > params.maxAmount) {
      return false;
    }

    if (params.tags && params.tags.length > 0 && !includesAnyTag(transaction.tags, params.tags)) {
      return false;
    }

    if (params.text) {
      const search = normalize(params.text);
      const categoryName = normalize(transaction.category?.name ?? "");
      const note = normalize(transaction.note ?? "");
      const amount = normalize(transaction.amount.toString());
      const tags = normalize(transaction.tags.join(" "));

      if (![categoryName, note, amount, tags].some((field) => field.includes(search))) {
        return false;
      }
    }

    return true;
  }).sort((first, second) => second.transactionDate.getTime() - first.transactionDate.getTime());

  const skip = params.skip ?? 0;
  const take = params.take ?? 50;
  const data = filtered.slice(skip, skip + take).map(cloneTransaction);

  return {
    data,
    totalCount: filtered.length,
    skip,
    take,
    hasMore: skip + data.length < filtered.length,
  };
}
