// The app uses the browser locale for its lifetime. Cache formatter instances,
// not formatted money: analytics still owns its exact decimal representation.
const currencyFormatters = new Map<string, Intl.NumberFormat>();

export function getCurrencyFormatter(currency: string): Intl.NumberFormat {
  let formatter = currencyFormatters.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    currencyFormatters.set(currency, formatter);
  }
  return formatter;
}

export const integerFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
export const shortDateFormatter = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });
export const fullDateFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short", day: "numeric", year: "numeric",
});
export const timeFormatter = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
export const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
});
