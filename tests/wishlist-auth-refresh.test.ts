import { afterEach, describe, expect, it, vi } from "vitest";
import { loadWishlists, resetWishlists } from "../lib/wishlist-api";

afterEach(() => { resetWishlists(); vi.unstubAllGlobals(); });

describe("wishlist account refresh", () => {
  it("replaces an unauthenticated cache immediately after login", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: "Login required" }), { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ wishlists: [{ id: "account-list" }] })));
    vi.stubGlobal("fetch", fetcher);
    resetWishlists();
    await expect(loadWishlists()).rejects.toThrow("Login required");
    resetWishlists();
    expect(await loadWishlists()).toEqual([{ id: "account-list" }]);
  });

  it("ignores an old account response arriving after the new account", async () => {
    let finishOld!: (response: Response) => void;
    vi.stubGlobal("fetch", vi.fn()
      .mockImplementationOnce(() => new Promise<Response>(resolve => { finishOld = resolve; }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ wishlists: [{ id: "new-account" }] }))));
    resetWishlists();
    const oldRequest = loadWishlists();
    resetWishlists();
    await loadWishlists();
    finishOld(new Response(JSON.stringify({ wishlists: [{ id: "old-account" }] })));
    await oldRequest;
    expect(await loadWishlists()).toEqual([{ id: "new-account" }]);
  });
});
