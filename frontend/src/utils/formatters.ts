export const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  
  if (isNaN(date.getTime())) {
    return 'Invalid Date';
  }

  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  
  if (isNaN(date.getTime())) {
    return 'Invalid Date';
  }

  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  
  return `${day}/${month}/${year}`;
};

export const formatTime = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(d.getTime())) {
    return 'Invalid Time';
  }

  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');

  return `${hours}:${minutes}`;
};

export const formatCurrency = (amount: number, currency: string = 'AED'): string => {
  const formattedAmount = new Intl.NumberFormat('en-AE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));
  
  return `${formattedAmount} ${currency}`;
};

export const formatCurrencyWithSign = (amount: number, currency: string = 'AED'): string => {
  const sign = amount >= 0 ? '+' : '-';
  const formattedAmount = formatCurrency(amount, currency);
  
  return `${sign}${formattedAmount}`;
};

export const getCurrencyColor = (amount: number): string => {
  if (amount > 0) return 'success.main'; // Income - green
  if (amount < 0) return 'text.primary'; // Expense - black
  return 'primary.main';                 // Zero - default
};