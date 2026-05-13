import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "..", "..");

const REMOVED_ROUTE_PATHS = [
  "/edit-image",
  "/upscale-image",
  "/recolor-image",
  "/remove-background",
  "/vectorize-image",
  "/image-to-3d",
  "/image-to-video",
  "/image-to-text",
  "/batch-ocr",
  "/shared-notes",
  "/compress-pdf",
  "/excel-to-pdf",
  "/word-to-pdf",
  "/ppt-to-pdf",
  "/pdf-to-word",
  "/pdf-to-excel",
  "/pdf-to-ppt",
  "/pdf-to-pdfa",
  "/password-protect-pdf",
  "/set-pdf-permissions",
  "/images-to-pdf",
];

const REMOVED_EDGE_FUNCTIONS = [
  "edit-image",
  "upscale-image",
  "recolor-image",
  "image-to-video",
  "image-to-3d",
];

describe("removed image/PDF tool routes", () => {
  const appSource = fs.readFileSync(path.join(root, "src/App.tsx"), "utf8");

  it.each(REMOVED_ROUTE_PATHS)(
    "App.tsx does not register a route for %s",
    (route) => {
      const re = new RegExp(`path=["']${route}["']`);
      expect(appSource).not.toMatch(re);
    },
  );

  it("App.tsx still renders a NotFound catch-all for any unknown route", () => {
    expect(appSource).toMatch(/path=["']\*["']/);
    expect(appSource).toMatch(/NotFound/);
  });

  it("no remaining tool page files exist under src/pages/tools", () => {
    const toolsDir = path.join(root, "src/pages/tools");
    expect(fs.existsSync(toolsDir)).toBe(false);
  });
});

describe("removed edge functions", () => {
  const fnRoot = path.join(root, "supabase/functions");
  const configToml = fs.readFileSync(
    path.join(root, "supabase/config.toml"),
    "utf8",
  );

  it.each(REMOVED_EDGE_FUNCTIONS)(
    "edge function %s is not present on disk",
    (name) => {
      expect(fs.existsSync(path.join(fnRoot, name))).toBe(false);
    },
  );

  it.each(REMOVED_EDGE_FUNCTIONS)(
    "edge function %s is not declared in supabase/config.toml",
    (name) => {
      expect(configToml).not.toMatch(new RegExp(`\\[functions\\.${name}\\]`));
    },
  );
});
