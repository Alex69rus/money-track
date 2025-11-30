# React Patterns Reference

This document provides detailed code examples and patterns for React development in the Money Track project. Reference this file when you need specific implementation patterns or templates.

## Component Structure Template

```typescript
// ✓ GOOD: Clean component organization
interface TransactionCardProps {
  transaction: Transaction;
  onUpdate: (transaction: Transaction) => Promise<void>;
  onDelete?: (id: number) => Promise<void>;
}

export const TransactionCard: React.FC<TransactionCardProps> = ({
  transaction,
  onUpdate,
  onDelete
}) => {
  // 1. Custom hooks first (extract complex logic)
  const { isLoading, error, handleSave } = useTransactionUpdate(transaction, onUpdate);

  // 2. Local UI state
  const [isEditing, setIsEditing] = useState(false);

  // 3. Event handlers (simple functions, NO useCallback without profiling)
  const handleEdit = () => setIsEditing(true);
  const handleCancel = () => setIsEditing(false);

  // 4. Effects (with cleanup)
  useEffect(() => {
    return () => {
      // Cleanup logic here
    };
  }, []);

  // 5. Early returns for loading/error states
  if (error) return <ErrorState message={error} />;
  if (isLoading) return <LoadingState />;

  // 6. Main render
  return (
    <Card>
      {isEditing ? <EditView /> : <DisplayView />}
    </Card>
  );
};
```

## Custom Hook with AbortController

```typescript
// ✓ GOOD: Extract API logic with proper cleanup
function useTransactions(filters: TransactionFilters) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const fetchTransactions = async () => {
      setLoading(true);
      setError(null);
      try {
        const api = ApiService.getInstance();
        const data = await api.getTransactions(filters, controller.signal);
        setTransactions(data);
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err instanceof Error ? err.message : 'Failed to fetch');
          console.error('Error fetching transactions:', err);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();

    // Cleanup: cancel request on unmount or filter change
    return () => controller.abort();
  }, [filters]);

  return { transactions, loading, error };
}

// Usage in component
const TransactionList = ({ filters }: Props) => {
  const { transactions, loading, error } = useTransactions(filters);

  if (error) return <ErrorAlert message={error} />;
  if (loading) return <Skeleton count={5} />;

  return <TransactionGrid items={transactions} />;
};
```

## Error Handling Pattern

```typescript
// ✓ GOOD: User-friendly messages + detailed logging
try {
  await api.updateTransaction(id, data);
} catch (err) {
  // User sees friendly message
  setError('Unable to save transaction. Please try again.');

  // Developers see details in console
  console.error('Transaction update failed:', {
    transactionId: id,
    error: err,
    timestamp: new Date().toISOString()
  });
}
```

## Loading & Error States

```typescript
// ✓ GOOD: Always show loading/error/empty states
const Component = () => {
  const { data, loading, error } = useData();

  // Early returns for special states
  if (error) {
    return (
      <Alert severity="error">
        {error}
        <Button onClick={refetch}>Try Again</Button>
      </Alert>
    );
  }

  if (loading) {
    return <Skeleton variant="rectangular" height={200} />;
  }

  if (!data || data.length === 0) {
    return <EmptyState message="No transactions found" />;
  }

  return <DataView data={data} />;
};
```

## Import Order Example

```typescript
// 1. React imports
import React, { useState, useEffect } from 'react';

// 2. Third-party libraries
import { Box, Card, Typography, Button } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';

// 3. Internal components (relative imports)
import { TransactionCard } from '../components/TransactionCard';
import { EmptyState } from '../components/EmptyState';

// 4. Types (from centralized location)
import { Transaction, Category, TransactionFilters } from '../types';

// 5. Services (singletons)
import { ApiService } from '../services/api';

// 6. Utils and helpers
import { formatCurrency, formatDate } from '../utils/formatters';
```

## Material-UI Theming

```typescript
// ✓ GOOD: Always use theme tokens
const theme = useTheme();
const isMobile = useMediaQuery(theme.breakpoints.down('md'));

return (
  <Box sx={{
    color: theme.palette.primary.main,
    bgcolor: theme.palette.background.paper,
    borderRadius: theme.shape.borderRadius,
    p: theme.spacing(2),  // 16px
    mb: 3,                 // 24px (3 * 8px)
  }}>
    {isMobile ? <MobileView /> : <DesktopView />}
  </Box>
);

// ✗ BAD: Hardcoded values
<Box sx={{ color: '#6442d6', padding: '16px' }} /> // ❌
```

## Responsive Design

```typescript
// ✓ GOOD: Responsive spacing with theme
<Stack spacing={{ xs: 1, sm: 2, md: 3 }}>
  <Item />
</Stack>

// ✓ GOOD: Conditional rendering based on breakpoint
const theme = useTheme();
const isMobile = useMediaQuery(theme.breakpoints.down('md'));

return (
  <Box>
    {isMobile ? (
      <Card>Mobile card layout</Card>
    ) : (
      <Table>Desktop table layout</Table>
    )}
  </Box>
);
```

## Accessibility Examples

```typescript
// ✓ GOOD: Proper ARIA labels
<IconButton aria-label="Delete transaction" onClick={handleDelete}>
  <DeleteIcon />
</IconButton>

// ✓ GOOD: Loading states with aria-busy
<Button disabled={loading} aria-busy={loading}>
  {loading ? 'Saving...' : 'Save'}
</Button>

// ✓ GOOD: Form labels
<TextField
  label="Amount"
  required
  error={!!error}
  helperText={error || 'Enter transaction amount'}
/>
```

## Props Patterns

```typescript
// ✓ GOOD: Well-defined prop interface
interface Props {
  // Required props first
  data: Transaction[];
  onUpdate: (id: number, data: Partial<Transaction>) => Promise<void>;

  // Optional props with ?
  className?: string;
  showActions?: boolean;
}

// ✗ BAD: Passing setState directly
<Component setState={setTransactions} />

// ✓ GOOD: Pass specific callback
<Component onUpdate={(tx) => handleUpdate(tx)} />
```

## Material-UI Component Selection

```typescript
// Layout
<Stack direction="row" spacing={2}>...</Stack>  // Flex layouts
<Grid container spacing={2}>...</Grid>          // Complex grids
<Box sx={{ ... }}>...</Box>                     // Generic container
<Container maxWidth="lg">...</Container>        // Max-width content

// Data Display
<Card>...</Card>                                // Content grouping
<List>...</List>                                // Lists of items
<Table>...</Table>                              // Tabular data (desktop only)

// Feedback
<CircularProgress />                            // Loading indicator
<Alert severity="error">...</Alert>             // Messages and errors
<Snackbar>...</Snackbar>                       // Temporary notifications
<Skeleton variant="rectangular" height={200} /> // Loading placeholder

// Inputs
<TextField label="Amount" />                    // Text inputs
<Autocomplete options={items} />                // Searchable selects
<Button variant="contained">Save</Button>       // Actions
<Dialog open={isOpen} onClose={handleClose}>...</Dialog>  // Modals
```

## TypeScript Type Patterns

```typescript
// ✓ GOOD: Proper typing for API responses
interface TransactionResponse {
  id: number;
  amount: number;
  description: string;
  date: string;  // ISO date string from API
  categoryId: number;
  tags: string[];
}

// ✓ GOOD: Component state types
const [filters, setFilters] = useState<TransactionFilters>({
  startDate: null,
  endDate: null,
  categoryId: null,
  tags: []
});

// ✓ GOOD: Event handler types
const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
  event.preventDefault();
  // ...
};

const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
  setValue(event.target.value);
};

// ✗ BAD: Using 'any'
const handleClick = (data: any) => { /* ... */ }  // ❌

// ✓ GOOD: Proper typing
const handleClick = (data: Transaction) => { /* ... */ }
```

## Component Splitting Pattern

```typescript
// ✗ BAD: Component exceeding 150 lines
const TransactionCard = ({ transaction }) => {
  // ... 200 lines of mixed logic and UI
};

// ✓ GOOD: Split into focused components
const TransactionCard = ({ transaction }) => {
  const [isEditing, setIsEditing] = useState(false);

  return isEditing
    ? <TransactionEditForm transaction={transaction} onSave={handleSave} />
    : <TransactionDisplay transaction={transaction} onEdit={() => setIsEditing(true)} />;
};

const TransactionDisplay = ({ transaction, onEdit }) => {
  return (
    <Card>
      <TransactionHeader transaction={transaction} />
      <TransactionDetails transaction={transaction} />
      <TransactionActions onEdit={onEdit} />
    </Card>
  );
};

const TransactionEditForm = ({ transaction, onSave }) => {
  const { values, errors, handleChange, handleSubmit } = useTransactionForm(transaction);

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
    </form>
  );
};
```

## State Management Pattern

```typescript
// ✓ GOOD: Simple state management with useState
const ParentComponent = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const handleUpdate = async (id: number, updates: Partial<Transaction>) => {
    const api = ApiService.getInstance();
    await api.updateTransaction(id, updates);
    // Update local state
    setTransactions(prev =>
      prev.map(tx => tx.id === id ? { ...tx, ...updates } : tx)
    );
  };

  return <TransactionList transactions={transactions} onUpdate={handleUpdate} />;
};

// ✗ BAD: Passing setState directly
<ChildComponent setTransactions={setTransactions} />

// ✓ GOOD: Pass specific callbacks
<ChildComponent onUpdate={handleUpdate} onDelete={handleDelete} />
```

## Performance Optimization (When Profiled)

```typescript
// Only add these patterns AFTER profiling shows performance issues:

// ✓ GOOD: Memoize expensive calculations (when profiled)
const expensiveValue = useMemo(() => {
  return transactions.reduce((sum, tx) => sum + tx.amount, 0);
}, [transactions]);

// ✓ GOOD: Memoize callbacks passed to frequently re-rendering children (when profiled)
const handleUpdate = useCallback((id: number, data: Partial<Transaction>) => {
  updateTransaction(id, data);
}, [updateTransaction]);

// ✓ GOOD: Virtualization for large lists (>1000 items)
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={transactions.length}
  itemSize={80}
  width="100%"
>
  {({ index, style }) => (
    <div style={style}>
      <TransactionCard transaction={transactions[index]} />
    </div>
  )}
</FixedSizeList>
```

---

Use these patterns as templates when implementing React components. Always prioritize:
1. **Simplicity** over premature optimization
2. **Type safety** with TypeScript strict mode
3. **User experience** with loading/error states
4. **Accessibility** with proper ARIA labels
5. **Maintainability** with component size limits and clear separation of concerns