function formatCurrency(value) {
  const amount = Number.isFinite(value) ? value : 0;
  return `${Math.round(amount)} DA`;
}
export {
  formatCurrency as f
};
