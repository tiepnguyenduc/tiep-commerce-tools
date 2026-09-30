import { afterEach, describe, expect, it, vi } from "vitest";
import { loadBusinessNavigation } from "../components/b2b/useB2BNavigation";
import { createHoverIntent } from "../lib/hover-intent";

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("B2B navigation API consumer", () => {
  it("reads the server category tree with same-origin credentials", async () => {
    const categories = [{ id: "root", name: "Equipment", slug: "equipment", children: [{ id: "child", name: "Parts", slug: "parts", children: [] }] }];
    const request = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ categories }) });
    vi.stubGlobal("fetch", request);
    expect(await loadBusinessNavigation("/api/b2b/navigation")).toEqual(categories);
    expect(request).toHaveBeenCalledWith("/api/b2b/navigation", { credentials: "same-origin" });
  });
  it("rejects unsuccessful and malformed responses instead of falling back to products", async () => {
    for (const response of [{ ok: false }, { ok: true, json: async () => ({ products: [] }) }, { ok: true, json: async () => ({ categories: [{ id: "bad", children: [] }] }) }]) {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
      await expect(loadBusinessNavigation("/api/b2b/navigation")).rejects.toThrow("load the categories");
    }
  });
});

describe("desktop hover intent", () => {
  it("does not open during a quick pointer pass", () => {
    vi.useFakeTimers();
    const hover = createHoverIntent();
    const open = vi.fn();
    hover.open(open);
    vi.advanceTimersByTime(100);
    hover.cancel();
    vi.advanceTimersByTime(500);
    expect(open).not.toHaveBeenCalled();
  });
  it("allows crossing from a trigger into its panel during exit grace", () => {
    vi.useFakeTimers();
    const hover = createHoverIntent();
    const open = vi.fn();
    const close = vi.fn();
    hover.open(open);
    vi.advanceTimersByTime(120);
    expect(open).toHaveBeenCalledOnce();
    hover.close(close);
    vi.advanceTimersByTime(180);
    hover.cancel();
    vi.advanceTimersByTime(300);
    expect(close).not.toHaveBeenCalled();
    hover.close(close);
    vi.advanceTimersByTime(240);
    expect(close).toHaveBeenCalledOnce();
  });
  it("switches categories without a stale close interrupting the new panel", () => {
    vi.useFakeTimers();
    const hover = createHoverIntent();
    const close = vi.fn();
    const open = vi.fn();
    hover.close(close);
    hover.open(open);
    vi.advanceTimersByTime(500);
    expect(open).toHaveBeenCalledOnce();
    expect(close).not.toHaveBeenCalled();
  });
});
