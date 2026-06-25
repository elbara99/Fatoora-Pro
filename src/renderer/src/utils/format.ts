export function formatCurrency(value: number): string {
  const isWhole = value % 1 === 0
  const formatted = isWhole
    ? Math.round(value).toLocaleString('en-US')
    : value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `${formatted} DA`
}
