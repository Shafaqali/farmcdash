type CareAnimal = { arrival: string; monthlyCharge: number; soldDate?: string | null; status?: string };

/** Calendar anniversaries retain the original day, clamped to short months. */
export function anniversary(arrival: string, offset: number) {
  const start = new Date(`${arrival}T00:00:00Z`);
  if (!Number.isFinite(start.getTime())) return "";
  const month = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + offset, 1));
  const last = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0)).getUTCDate();
  month.setUTCDate(Math.min(start.getUTCDate(), last));
  return month.toISOString().slice(0, 10);
}

export function carePeriods(animal: CareAnimal, through: string) {
  const end = animal.soldDate && animal.soldDate < through ? animal.soldDate : through;
  if (!anniversary(animal.arrival, 0) || animal.arrival > end) return [];
  const start = new Date(`${animal.arrival}T00:00:00Z`);
  const finish = new Date(`${end}T00:00:00Z`);
  const months = (finish.getUTCFullYear() - start.getUTCFullYear()) * 12 + finish.getUTCMonth() - start.getUTCMonth();
  return Array.from({ length: months + 1 }, (_, offset) => anniversary(animal.arrival, offset))
    .filter((date) => date <= end);
}

export function nextCareDate(animal: CareAnimal, today: string) {
  if (animal.status && animal.status !== "Active") return null;
  if (animal.soldDate) return null;
  if (animal.arrival > today) return animal.arrival;
  return anniversary(animal.arrival, carePeriods(animal, today).length) || null;
}