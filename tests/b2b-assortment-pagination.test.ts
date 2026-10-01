import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Store } from "@commercetools/platform-sdk";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ getB2BApiRoot: vi.fn() }));
vi.mock("../lib/ct/client", () => mocks);
import { b2bState, catalogCandidates } from "../lib/ct/b2b";
const store = { id: "store" } as Store;
const page = (start: number, length: number) => Array.from({ length }, (_, i) => ({ id: `p${String(start + i).padStart(5, "0")}` }));
beforeEach(() => vi.resetAllMocks());
describe("complete business assortment", () => {
  it("loads search candidates beyond the first 100 with store filter preserved", async () => {
    const execute = vi.fn().mockResolvedValueOnce({ body: { results: page(0,100), total: 101 } }).mockResolvedValueOnce({ body: { results: page(100,1), total:101 } });
    const post = vi.fn(() => ({ execute }));
    mocks.getB2BApiRoot.mockReturnValue({ products: () => ({ search: () => ({ post }) }) });
    expect(await catalogCandidates(store)).toHaveLength(101);
    expect(post).toHaveBeenLastCalledWith({ body: { query: { exact: { field: "stores", value: "store" } }, limit:100,offset:100,sort:[{field:"id",order:"asc"}] } });
  });
  it("cursor-paginates published fallback IDs and stops on an empty final page", async () => {
    const execute = vi.fn().mockResolvedValueOnce({ body: { results:page(0,100) } }).mockResolvedValueOnce({ body:{ results: [] } });
    const get = vi.fn(() => ({execute}));
    mocks.getB2BApiRoot.mockReturnValue({ products: () => ({search: () => ({post: () => ({execute: async () => {throw {statusCode:404};}})})}),productProjections: () => ({get}) });
    expect(await catalogCandidates(store)).toHaveLength(100);
    expect(get).toHaveBeenLastCalledWith({queryArgs:{staged:false,limit:100,sort:"id asc",withTotal:false,where:'id > "p00099"'}});
  });
  it("uses cursor fallback instead of truncating at Search's 10,000 limit", async () => {
    const search = vi.fn(async () => ({body:{results:page(0,100),total:10001}}));
    const get = vi.fn(() => ({execute:async () => ({body:{results:[{id:"beyond-search-window"}]}})}));
    mocks.getB2BApiRoot.mockReturnValue({products:()=>({search:()=>({post:()=>({execute:search})})}),productProjections:()=>({get})});
    expect(await catalogCandidates(store)).toEqual([{id:"beyond-search-window"}]);
    expect(search).toHaveBeenCalledTimes(100);
  });
  it("loads all guest products without exposing prices and handles an empty catalog", async () => {
    const product = (id: string) => ({id,name:{en:id},slug:{en:id},categories:[],masterVariant:{id:1,prices:[{value:{centAmount:500,currencyCode:"USD"}}]},variants:[]});
    const execute = vi.fn().mockResolvedValueOnce({body:{results:page(0,100).map(p=>product(p.id))}}).mockResolvedValueOnce({body:{results:[product("last")]}}).mockResolvedValueOnce({body:{results:[]}});
    mocks.getB2BApiRoot.mockReturnValue({productProjections:()=>({get:()=>({execute})})});
    const state = await b2bState({});
    expect(state.products).toHaveLength(101);
    expect(state.products.every(p=>p.price===null)).toBe(true);
    expect((await b2bState({})).products).toEqual([]);
  });
});
