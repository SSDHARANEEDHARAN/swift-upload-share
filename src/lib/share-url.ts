// Always build share links against a public, stable domain.
// Preview/sandbox domains (e.g. id-preview--*.lovable.app or *.lovableproject.com)
// are not reachable by recipients of emailed links and return 404, so we
// substitute the published production URL whenever we're not on a real domain.

const PUBLISHED_ORIGIN = "https://swift-upload-share.lovable.app";

function isPreviewOrigin(origin: string): boolean {
  try {
    const { hostname } = new URL(origin);
    if (hostname === "localhost" || hostname === "127.0.0.1") return true;
    if (hostname.endsWith(".lovableproject.com")) return true;
    if (hostname.startsWith("id-preview--")) return true;
    if (hostname.endsWith(".sandbox.lovable.dev")) return true;
    return false;
  } catch {
    return true;
  }
}

export function getPublicShareOrigin(): string {
  if (typeof window === "undefined") return PUBLISHED_ORIGIN;
  const current = window.location.origin;
  return isPreviewOrigin(current) ? PUBLISHED_ORIGIN : current;
}

export function buildShareLink(token: string): string {
  return `${getPublicShareOrigin()}/download/${token}`;
}
