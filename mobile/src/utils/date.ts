const displayDateFormatter = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
}

export function toDateOnly(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function formatDisplayDate(value: string): string {
  return displayDateFormatter.format(parseDateOnly(value));
}

export function formatTimestampDate(value: string): string {
  return displayDateFormatter.format(new Date(value));
}

export function daysUntil(dateOnly: string): number {
  const [year, month, day] = dateOnly.split('-').map(Number);
  const today = new Date();
  const dueUtc = Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1);
  const todayUtc = Date.UTC(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );

  return Math.round((dueUtc - todayUtc) / 86_400_000);
}

export function dueDescription(dateOnly: string): string {
  const days = daysUntil(dateOnly);

  if (days < 0) {
    return `Overdue by ${Math.abs(days)} ${Math.abs(days) === 1 ? 'day' : 'days'}`;
  }
  if (days === 0) {
    return 'Due today';
  }
  if (days === 1) {
    return 'Due tomorrow';
  }

  return `Due in ${days} days`;
}
