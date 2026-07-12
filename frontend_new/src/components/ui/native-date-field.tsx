import type { ChangeEvent } from "react";
import { CalendarDaysIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface NativeDateFieldProps {
  ariaLabel: string;
  className?: string;
  id: string;
  inputTestId: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  value: string;
}

function formatDateValue(value: string): string {
  if (!value) {
    return "Select date";
  }

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

/**
 * Keeps the visual field app-rendered while a transparent native input owns
 * direct touch interaction and opens the platform date picker.
 */
export function NativeDateField({
  ariaLabel,
  className,
  id,
  inputTestId,
  onChange,
  value,
}: NativeDateFieldProps): JSX.Element {
  return (
    <div
      className={cn(
        "relative flex h-9 min-w-0 max-w-full items-center justify-between gap-3 overflow-hidden rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 md:text-sm dark:bg-input/30",
        className,
      )}
      data-native-date-control
      data-testid={`${inputTestId}-control`}
    >
      <span aria-hidden className="min-w-0 truncate" data-testid={`${inputTestId}-display`}>
        {formatDateValue(value)}
      </span>
      <CalendarDaysIcon aria-hidden className="size-4 shrink-0" />
      <Input
        aria-label={ariaLabel}
        className="absolute inset-0 z-10 h-full w-full max-w-full cursor-pointer opacity-0"
        data-testid={inputTestId}
        id={id}
        onChange={onChange}
        type="date"
        value={value}
      />
    </div>
  );
}
