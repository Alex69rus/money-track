import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  IconButton,
} from '@mui/material';
import { Edit as EditIcon } from '@mui/icons-material';
import { Transaction, Category } from '../types';
import { formatDateTime, formatCurrency, getCurrencyColor } from '../utils/formatters';
import SearchableSelect from './SearchableSelect';
import QuickTagSelector from './QuickTagSelector';

interface TransactionDesktopTableProps {
  transactions: Transaction[];
  categories: Category[];
  onEditClick: (transaction: Transaction) => void;
  onCategorySelect: (categoryId: string | number | number[], transactionId: number) => void;
  onTagsUpdate: (transactionId: number, newTags: string[]) => Promise<void>;
  updatingCategory: boolean;
  updatingTags: boolean;
  selectedTransactionId: number | null;
}

const TransactionDesktopTable: React.FC<TransactionDesktopTableProps> = ({
  transactions,
  categories,
  onEditClick,
  onCategorySelect,
  onTagsUpdate,
  updatingCategory,
  updatingTags,
  selectedTransactionId,
}) => {
  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Date/Time</TableCell>
            <TableCell align="right">Amount</TableCell>
            <TableCell>Category</TableCell>
            <TableCell>Note</TableCell>
            <TableCell>Tags</TableCell>
            <TableCell align="center">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {transactions.map((transaction) => (
            <TableRow key={transaction.id}>
              <TableCell>
                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                  {formatDateTime(transaction.transactionDate)}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 'bold',
                    color: getCurrencyColor(transaction.amount)
                  }}
                >
                  {transaction.amount >= 0 ? '+' : '-'}{formatCurrency(Math.abs(transaction.amount), transaction.currency)}
                </Typography>
              </TableCell>
              <TableCell>
                {transaction.category ? (
                  <Typography variant="body2">
                    {transaction.category.name}
                  </Typography>
                ) : (
                  <Box sx={{ minWidth: 140, maxWidth: 160 }}>
                    <SearchableSelect
                      categories={categories}
                      value=""
                      onChange={(value) => onCategorySelect(value, transaction.id)}
                      placeholder="Select..."
                      label=""
                      size="small"
                      loading={updatingCategory && selectedTransactionId === transaction.id}
                      transactionAmount={transaction.amount}
                    />
                  </Box>
                )}
              </TableCell>
              <TableCell>
                <Typography
                  variant="body2"
                  sx={{
                    maxWidth: 200,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                  title={transaction.note || ''}
                >
                  {transaction.note || '-'}
                </Typography>
              </TableCell>
              <TableCell>
                <QuickTagSelector
                  transaction={transaction}
                  onTagsUpdate={onTagsUpdate}
                  disabled={updatingTags && selectedTransactionId === transaction.id}
                />
              </TableCell>
              <TableCell align="center">
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <IconButton
                    size="small"
                    onClick={() => onEditClick(transaction)}
                    aria-label="Edit transaction"
                    sx={{ color: 'primary.main' }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default TransactionDesktopTable;
