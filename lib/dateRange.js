export function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

// Minggu dimulai hari Senin
export function startOfWeek(date = new Date()) {
  const d = startOfDay(date);
  const day = d.getDay(); // 0 = Minggu, 1 = Senin, ...
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

export function startOfMonth(date = new Date()) {
  const d = startOfDay(date);
  d.setDate(1);
  return d;
}