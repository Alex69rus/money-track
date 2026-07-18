import type {
  Category,
  PaginatedTransactions,
  Transaction,
} from "@/types/transactions";
import type {
  CategoryBreakdownDto,
  CategoryDto,
  MonthlyBreakdownDto,
  PaginatedTransactionsDto,
  TagBreakdownDto,
  TransactionDto,
  TransactionSummaryDto,
} from "@/services/api/dto";
import type {
  AnalyticsSummaryStats,
  CategorySpendingItem,
  DecimalMoney,
  MonthlyTrendItem,
  TagSpendingItem,
} from "@/features/analytics/types";

const DECIMAL_MONEY_PATTERN = /^-?\d+(?:\.\d+)?$/;

function parseDecimal(value: string): DecimalMoney {
  const normalized = value.trim();
  return DECIMAL_MONEY_PATTERN.test(normalized) ? normalized : "0.00";
}

export function mapCategory(dto: CategoryDto): Category {
  return {
    id: dto.id,
    name: dto.name,
    type: dto.type,
    color: dto.color,
    icon: dto.icon,
    parentCategoryId: dto.parentCategoryId,
    orderIndex: dto.orderIndex,
    createdAt: new Date(dto.createdAt),
  };
}

export function mapTransaction(dto: TransactionDto): Transaction {
  return {
    id: dto.id,
    userId: dto.userId,
    transactionDate: new Date(dto.transactionDate),
    amount: dto.amount,
    note: dto.note,
    categoryId: dto.categoryId,
    tags: dto.tags,
    currency: dto.currency,
    smsText: dto.smsText,
    messageId: dto.messageId,
    createdAt: new Date(dto.createdAt),
    category: dto.category ? mapCategory(dto.category) : null,
  };
}

export function mapPaginatedTransactions(dto: PaginatedTransactionsDto): PaginatedTransactions {
  return {
    data: dto.data.map(mapTransaction),
    totalCount: dto.totalCount,
    skip: dto.skip,
    take: dto.take,
    hasMore: dto.hasMore,
  };
}

export function mapTransactionSummary(dto: TransactionSummaryDto): AnalyticsSummaryStats {
  return {
    totalIncome: parseDecimal(dto.totalIncome),
    totalExpenses: parseDecimal(dto.totalExpenses),
    balance: parseDecimal(dto.balance),
    transactionCount: dto.transactionCount,
  };
}

export function mapCategoryBreakdown(dto: CategoryBreakdownDto): CategorySpendingItem[] {
  return dto.data.map((item) => ({
    key: item.categoryId === null ? "uncategorized" : `category-${item.categoryId}`,
    categoryId: item.categoryId,
    categoryName: item.categoryName,
    icon: item.categoryIcon,
    color: item.categoryColor,
    amount: parseDecimal(item.amount),
    transactionCount: item.transactionCount,
    share: item.share,
  }));
}

export function mapTagBreakdown(dto: TagBreakdownDto): TagSpendingItem[] {
  return dto.data.map((item) => ({
    key: item.tag,
    tag: item.tag,
    amount: parseDecimal(item.amount),
    transactionCount: item.transactionCount,
    share: item.share,
  }));
}

export function mapMonthlyBreakdown(dto: MonthlyBreakdownDto): MonthlyTrendItem[] {
  return dto.data.map((item) => ({
    key: item.month,
    monthLabel: formatMonthLabel(item.month),
    income: parseDecimal(item.income),
    expenses: parseDecimal(item.expenses),
    balance: parseDecimal(item.balance),
  }));
}

function formatMonthLabel(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number);
  if (!year || !monthNumber) {
    return month;
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    year: "2-digit",
  }).format(new Date(year, monthNumber - 1, 1));
}
