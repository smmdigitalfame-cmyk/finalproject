export function resolveClientIp(headers: Headers, fallback: string | undefined, vercel: boolean): string {
  const value = vercel
    ? headers.get("x-vercel-forwarded-for") || headers.get("x-real-ip")
    : headers.get("cf-connecting-ip");
  return value?.split(",")[0]?.trim() || fallback || "unknown";
}