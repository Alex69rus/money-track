import type {
  Category,
  PaginatedTransactions,
  Transaction,
} from "@/types/transactions";
import type {
  CategoryDto,
  PaginatedTransactionsDto,
  TransactionDto,
} from "@/services/api/dto";

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
