/** « 272 € », « 272,50 € » : centimes seulement s'il y en a. Accepte les décimaux Drizzle (string). */
export function formatEuros(value: number | string): string {
  const n = Number(value);
  const cents = !Number.isInteger(n);
  return n.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  });
}
