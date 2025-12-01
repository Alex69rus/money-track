import React from 'react';
import {
  Card,
  CardContent,
  Box,
  Typography,
  IconButton,
} from '@mui/material';
import { Edit as EditIcon } from '@mui/icons-material';
import { Transaction, Category } from '../types';
import { formatDateTime, formatCurrency, getCurrencyColor } from '../utils/formatters';
import SearchableSelect from './SearchableSelect';
import QuickTagSelector from './QuickTagSelector';

interface TransactionMobileCardProps {
  transaction: Transaction;
  categories: Category[];
  onEditClick: (transaction: Transaction) => void;
  onCategorySelect: (categoryId: string | number | number[], transactionId: number) => void;
  onTagsUpdate: (transactionId: number, newTags: string[]) => Promise<void>;
  updatingCategory: boolean;
  updatingTags: boolean;
  selectedTransactionId: number | null;
}

const TransactionMobileCard: React.FC<TransactionMobileCardProps> = ({
  transaction,
  categories,
  onEditClick,
  onCategorySelect,
  onTagsUpdate,
  updatingCategory,
  updatingTags,
  selectedTransactionId,
}) => {
  return (
    <Card sx={{ mb: 2, position: 'relative' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
            {transaction.category ? (
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 'bold',
                  color: 'primary.main'
                }}
              >
                {transaction.category.name}
              </Typography>
            ) : (
              <Box sx={{ flex: 1, minWidth: 0, mr: 1 }}>
                <SearchableSelect
                  categories={categories}
                  value=""
                  onChange={(value) => onCategorySelect(value, transaction.id)}
                  placeholder="Select category..."
                  label=""
                  size="small"
                  loading={updatingCategory && selectedTransactionId === transaction.id}
                  transactionAmount={transaction.amount}
                />
              </Box>
            )}
          </Box>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 'bold',
              color: getCurrencyColor(transaction.amount)
            }}
          >
            {transaction.amount >= 0 ? '+' : '-'}{formatCurrency(Math.abs(transaction.amount), transaction.currency)}
          </Typography>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {formatDateTime(transaction.transactionDate)}
        </Typography>

        {transaction.note && (
          <Typography variant="body2" sx={{ mb: 1 }}>
            <strong>Note:</strong> {transaction.note}
          </Typography>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <QuickTagSelector
            transaction={transaction}
            onTagsUpdate={onTagsUpdate}
            disabled={updatingTags && selectedTransactionId === transaction.id}
          />
          <IconButton
            size="small"
            onClick={() => onEditClick(transaction)}
            aria-label="Edit transaction"
            sx={{
              color: 'primary.main',
              ml: 1,
              flexShrink: 0
            }}
          >
            <EditIcon fontSize="small" />
          </IconButton>
        </Box>
      </CardContent>
    </Card>
  );
};

export default TransactionMobileCard;
