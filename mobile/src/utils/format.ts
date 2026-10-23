const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const avatarPalettes = [
  { backgroundColor: '#E2F1EA', textColor: '#1A684F' },
  { backgroundColor: '#E8EFF8', textColor: '#315D85' },
  { backgroundColor: '#F7EDDF', textColor: '#876027' },
  { backgroundColor: '#EFEAF7', textColor: '#654B86' },
  { backgroundColor: '#FBEAE8', textColor: '#933C3F' },
] as const;

export function formatCurrency(value: string | number): string {
  const numericValue = typeof value === 'number' ? value : Number(value);
  return inrFormatter.format(Number.isFinite(numericValue) ? numericValue : 0);
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (
    parts
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('') || '?'
  );
}

export function getAvatarPalette(name: string) {
  const hash = Array.from(name).reduce(
    (total, character) => total + character.charCodeAt(0),
    0,
  );
  return avatarPalettes[hash % avatarPalettes.length]!;
}
