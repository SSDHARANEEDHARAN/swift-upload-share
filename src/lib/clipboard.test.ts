import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { copyToClipboard } from "@/lib/clipboard";

describe("copyToClipboard", () => {
  const originalClipboard = (navigator as any).clipboard;

  afterEach(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: originalClipboard,
      configurable: true,
      writable: true,
    });
    vi.restoreAllMocks();
  });

  it("uses navigator.clipboard.writeText when available", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
      writable: true,
    });

    const ok = await copyToClipboard("hello");
    expect(ok).toBe(true);
    expect(writeText).toHaveBeenCalledWith("hello");
  });

  it("falls back to execCommand when navigator.clipboard is missing", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: undefined,
      configurable: true,
      writable: true,
    });
    const execSpy = vi
      .spyOn(document, "execCommand")
      .mockReturnValue(true);

    const ok = await copyToClipboard("fallback-text");
    expect(ok).toBe(true);
    expect(execSpy).toHaveBeenCalledWith("copy");
  });

  it("falls back when navigator.clipboard.writeText rejects", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockRejectedValue(new Error("blocked")) },
      configurable: true,
      writable: true,
    });
    const execSpy = vi.spyOn(document, "execCommand").mockReturnValue(true);

    const ok = await copyToClipboard("retry");
    expect(ok).toBe(true);
    expect(execSpy).toHaveBeenCalled();
  });

  it("returns false when both APIs fail", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: undefined,
      configurable: true,
      writable: true,
    });
    vi.spyOn(document, "execCommand").mockReturnValue(false);

    const ok = await copyToClipboard("nope");
    expect(ok).toBe(false);
  });
});
