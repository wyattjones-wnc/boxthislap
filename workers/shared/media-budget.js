/** The namespace is private; it has no publicly reachable reservation endpoint. */
export async function mediaBudget(env, path, method = "GET", body) {
  if (!env.MEDIA_BUDGET)
    throw Object.assign(
      new Error(
        "Shared cloud image budget is not configured. Image access is stopped.",
      ),
      { status: 503 },
    );
  try {
    const stub = env.MEDIA_BUDGET.get(
      env.MEDIA_BUDGET.idFromName("account-images-v1"),
    );
    const response = await stub.fetch(`https://budget.internal${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const value = await response.json();
    if (!response.ok)
      throw Object.assign(
        new Error(value.error || "Cloud image safety limit reached."),
        { status: response.status },
      );
    return value;
  } catch (error) {
    if (error.status) throw error;
    throw Object.assign(
      new Error(
        "Shared image accounting is unavailable. Image access is stopped.",
      ),
      { status: 503 },
    );
  }
}
export const reserveMedia = (env, operation, bytes = 0) =>
  mediaBudget(env, "/reserve", "POST", { operation, bytes });
export const releaseMediaStorage = (env, bytes, key) =>
  mediaBudget(env, "/release", "POST", { bytes, key });
