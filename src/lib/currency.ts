export function formatCurrency(value: number): string {
  const amount = Number.isFinite(value) ? value : 0;
  return `${Math.round(amount)} DA`;
}