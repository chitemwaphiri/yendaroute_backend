// Postgres returns decimal columns as text ("15000.00"); the app expects numbers.
export const decimalToNumber = {
  to: (value?: number | null) => value,
  from: (value?: string | null) =>
    value === null || value === undefined ? value : Number(value),
};