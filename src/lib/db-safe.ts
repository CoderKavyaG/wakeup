export async function safeQuery<T>(
  fn: () => Promise<T>,
  fallback?: T
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    console.error("[DB Error]", error); // log server-side only
    if (fallback !== undefined) return fallback;
    throw new Error("Database operation failed"); // generic message only
  }
}
