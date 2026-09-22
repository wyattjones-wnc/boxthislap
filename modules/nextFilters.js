export function normalizeNextPriorityRange(minValue, maxValue, changed = "") {
  let min = clampPriority(minValue, 0);
  let max = clampPriority(maxValue, 10);

  if (min < max) return { min, max };

  if (changed === "min") min = Math.max(0, max - 1);
  else if (changed === "max") max = Math.min(10, min + 1);
  else if (min >= 10) min = 9;
  else max = min + 1;

  return { min, max };
}

export function normalizeNextDateRange(startValue, endValue) {
  const start = String(startValue || "").trim();
  const end = String(endValue || "").trim();

  if (!start && !end) return null;
  if (!start || !end || start <= end) return { start, end };
  return { start: end, end: start };
}

export function isNextDateSpanInRange(itemStartValue, itemEndValue, range) {
  const itemStart = String(itemStartValue || itemEndValue || "").trim();
  const itemEnd = String(itemEndValue || itemStartValue || "").trim();
  if (!itemStart || !itemEnd || !range) return false;
  if (range.start && itemEnd < range.start) return false;
  if (range.end && itemStart > range.end) return false;
  return true;
}

function clampPriority(value, fallback) {
  const number = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(10, Math.max(0, number));
}
