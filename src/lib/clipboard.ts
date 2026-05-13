/**
 * Copy text to clipboard with a graceful fallback for browsers
 * that don't expose `navigator.clipboard` (older browsers, insecure
 * contexts, some in-app webviews). Returns true on success.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // Modern API (requires a secure context)
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fall through to legacy path
    }
  }

  // Legacy fallback using a hidden textarea + execCommand("copy")
  if (typeof document === "undefined") return false;
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "-9999px";
    textarea.style.left = "-9999px";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    textarea.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}
