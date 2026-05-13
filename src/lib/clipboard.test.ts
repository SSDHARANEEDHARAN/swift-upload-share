import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { copyToClipboard } from "@/lib/clipboard";

describe("copyToClipboard", () => {
  const originalClipboard = (navigator as any).clipboard;
  const originalExec = (document as any).execCommand;

  afterEach(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: originalClipboard,
      configurable: true,
      writable: true,
    });
    (document as any).execCommand = originalExec;
    vi.restoreAllMocks();
  });

  const setClipboard = (value: any) => {
    Object.defineProperty(navigator, "clipboard", {
      value,
      configurable: true,
      writable: true,
    });
  };

  it("uses navigator.clipboard.writeText when available", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard({ writeText });

    const ok = await copyToClipboard("hello");
    expect(ok).toBe(true);
    expect(writeText).toHaveBeenCalledWith("hello");
  });

  it("falls back to execCommand when navigator.clipboard is missing", async () => {
    setClipboard(undefined);
    const exec = vi.fn().mockReturnValue(true);
    (document as any).execCommand = exec;

    const ok = await copyToClipboard("fallback-text");
    expect(ok).toBe(true);
    expect(exec).toHaveBeenCalledWith("copy");
  });

  it("falls back when navigator.clipboard.writeText rejects", async () => {
    setClipboard({ writeText: vi.fn().mockRejectedValue(new Error("blocked")) });
    const exec = vi.fn().mockReturnValue(true);
    (document as any).execCommand = exec;

    const ok = await copyToClipboard("retry");
    expect(ok).toBe(true);
    expect(exec).toHaveBeenCalled();
  });

  it("returns false when both APIs fail", async () => {
    setClipboard(undefined);
    (document as any).execCommand = vi.fn().mockReturnValue(false);

    const ok = await copyToClipboard("nope");
    expect(ok).toBe(false);
  });
});
