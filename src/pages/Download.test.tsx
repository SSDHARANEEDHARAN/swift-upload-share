import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Download from "./Download";

const invokeMock = vi.fn();
const rpcMock = vi.fn().mockResolvedValue({ data: null, error: null });

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke: (...args: any[]) => invokeMock(...args) },
    rpc: (...args: any[]) => rpcMock(...args),
  },
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const renderAt = (token: string) =>
  render(
    <MemoryRouter initialEntries={[`/download/${token}`]}>
      <Routes>
        <Route path="/download/:token" element={<Download />} />
      </Routes>
    </MemoryRouter>,
  );

const VALID = "a".repeat(32);

describe("Download page token validation", () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  it("shows 'File Not Found' when token format is invalid (too short)", async () => {
    renderAt("not-a-real-token");
    expect(await screen.findByText(/File Not Found/i)).toBeInTheDocument();
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it("shows 'File Not Found' when token contains non-hex characters", async () => {
    renderAt("z".repeat(32));
    expect(await screen.findByText(/File Not Found/i)).toBeInTheDocument();
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it("shows 'File Not Found' when manifest returns an error (deleted token)", async () => {
    invokeMock.mockResolvedValue({ data: null, error: { message: "Not found" } });
    renderAt(VALID);
    expect(await screen.findByText(/File Not Found/i)).toBeInTheDocument();
    expect(invokeMock).toHaveBeenCalledWith("download-manifest", {
      body: { shareToken: VALID },
    });
  });

  it("shows 'File Not Found' when manifest returns no files (expired/purged)", async () => {
    invokeMock.mockResolvedValue({ data: { files: [] }, error: null });
    renderAt(VALID);
    expect(await screen.findByText(/File Not Found/i)).toBeInTheDocument();
  });

  it("renders expired state when files exist but expires_at is in the past", async () => {
    const past = new Date(Date.now() - 60_000).toISOString();
    invokeMock.mockResolvedValue({
      data: {
        files: [
          {
            id: "f1",
            filename: "old.txt",
            file_size: 10,
            storage_path: "x/old.txt",
            download_count: 0,
            created_at: new Date().toISOString(),
            expires_at: past,
            user_id: null,
          },
        ],
      },
      error: null,
    });
    renderAt(VALID);

    expect(await screen.findByText("old.txt")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText(/Link Expired/i)).toBeInTheDocument(),
    );
    const btn = screen.getByRole("button", { name: /Link Expired/i });
    expect(btn).toBeDisabled();
  });

  it("renders an enabled download button for an active, valid token", async () => {
    const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    invokeMock.mockResolvedValue({
      data: {
        files: [
          {
            id: "f1",
            filename: "hello.txt",
            file_size: 42,
            storage_path: "x/hello.txt",
            download_count: 0,
            created_at: new Date().toISOString(),
            expires_at: future,
            user_id: null,
          },
        ],
      },
      error: null,
    });
    renderAt(VALID);

    const btn = await screen.findByRole("button", { name: /Download File/i });
    expect(btn).not.toBeDisabled();
    // sanity: clicking does not throw before XHR machinery starts
    fireEvent.click(btn);
  });
});
