const WORKOUT_DAY_CUTOFF_HOUR = 3;

export function workoutDateInTimeZone(timeZone, now = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
      month: "2-digit",
      timeZone,
      year: "numeric",
    }).formatToParts(now);
    const get = (type) => parts.find((part) => part.type === type)?.value || "";
    const date = `${get("year")}-${get("month")}-${get("day")}`;
    if (Number(get("hour")) >= WORKOUT_DAY_CUTOFF_HOUR) return date;
    const previous = new Date(`${date}T12:00:00Z`);
    previous.setUTCDate(previous.getUTCDate() - 1);
    return previous.toISOString().slice(0, 10);
  } catch {
    const error = new Error("Device timezone is invalid.");
    error.status = 400;
    throw error;
  }
}
