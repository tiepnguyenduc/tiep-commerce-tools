import { afterEach, expect, it, vi } from "vitest";
import { loadWishlists, resetWishlists } from "../lib/wishlist-api";

afterEach(() => { resetWishlists(); vi.unstubAllGlobals(); });

it("ignores a previous session response after reset", async () => {
  resetWishlists();
  let completeOld!: (value: Response) => void;
  const oldResponse = new Promise<Response>((resolve) => { completeOld = resolve; });
  const current = [{ id: "current", name: "Current customer's list", lines: [] }];
  vi.stubGlobal("fetch", vi.fn()
    .mockReturnValueOnce(oldResponse)
    .mockResolvedValueOnce(new Response(JSON.stringify({ wishlists: current }))));
  const oldLoad = loadWishlists();
  resetWishlists();
  await loadWishlists();
  completeOld(new Response(JSON.stringify({ wishlists: [{ id: "previous", lines: [] }] })));
  await oldLoad;
  expect(await loadWishlists()).toEqual(current);
});
