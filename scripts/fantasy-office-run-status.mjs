/** Classify execution independently of whether every scoring source is present. */
export function classifyFantasyOfficeRun(report) {
  const unsuccessful = (report.outcomes || []).filter(
    (outcome) => !["healthy", "not_available"].includes(outcome.status),
  );
  const gaps = unsuccessful.filter(
    (outcome) => outcome.error === "CONFIG_ERROR",
  );
  const errors = unsuccessful.filter(
    (outcome) => outcome.error !== "CONFIG_ERROR",
  );
  const incomplete =
    typeof report.totalMovies === "number" &&
    report.completedMovies !== report.totalMovies;
  // Preserve fatal/partial-run failures and unknown failures from older reports.
  const failed = Boolean(
    report.error ||
    report.status === "failed" ||
    report.status === "running" ||
    incomplete ||
    errors.length ||
    Number(report.failed || 0) > unsuccessful.length ||
    !["healthy", "warning"].includes(report.status),
  );
  return {
    gaps,
    errors,
    status: failed ? "failed" : gaps.length ? "warning" : "healthy",
    exitCode: failed ? 1 : 0,
  };
}
