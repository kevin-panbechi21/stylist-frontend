import {
  BROWSE_PAGE_SIZE,
  MAX_BROWSE_SEARCH_CHARS,
  buildBrowseUrl,
  mergeBrowsePages,
} from "./browsePagination";

describe("Discover pagination", () => {
  it("builds an encoded bounded server-side search and sort URL", () => {
    const url = buildBrowseUrl({
      category: "tops",
      query: "  linen & silk  ",
      sort: "price_desc",
      cursor: "opaque_cursor",
    });
    const parsed = new URL(url, "https://stylist.example");

    expect(parsed.pathname).toBe("/api/stylist/browse");
    expect(Object.fromEntries(parsed.searchParams)).toEqual({
      category: "tops",
      sort: "price_desc",
      limit: String(BROWSE_PAGE_SIZE),
      q: "linen & silk",
      cursor: "opaque_cursor",
    });
  });

  it("never sends more search text than the server accepts", () => {
    const parsed = new URL(buildBrowseUrl({ query: "x".repeat(200) }), "https://stylist.example");
    expect(parsed.searchParams.get("q")).toHaveLength(MAX_BROWSE_SEARCH_CHARS);
  });

  it("merges pages in order while removing duplicate product IDs", () => {
    expect(mergeBrowsePages({
      pages: [
        { products: [{ id: "p1" }, { id: "p2" }], total: 3, hasMore: true, nextCursor: "page-2" },
        { products: [{ id: "p2" }, { id: "p3" }], total: 3, hasMore: false, nextCursor: null },
      ],
    })).toEqual({
      products: [{ id: "p1" }, { id: "p2" }, { id: "p3" }],
      total: 3,
      hasMore: false,
      nextCursor: null,
    });
  });

  it("distinguishes no response from a valid empty first page", () => {
    expect(mergeBrowsePages(undefined)).toBeUndefined();
    expect(mergeBrowsePages({ pages: [{ products: [], total: 0, hasMore: false }] }))
      .toMatchObject({ products: [], total: 0, hasMore: false });
  });

  it("preserves valid cached pages when a malformed page reaches the merger", () => {
    expect(() => mergeBrowsePages({
      pages: [
        { products: [{ id: "p1" }], total: 1, hasMore: true, nextCursor: "page-2" },
        { products: {}, total: 1, hasMore: false, nextCursor: null },
      ],
    })).not.toThrow();
    expect(mergeBrowsePages({
      pages: [
        { products: [{ id: "p1" }], total: 1, hasMore: true, nextCursor: "page-2" },
        { products: {}, total: 1, hasMore: false, nextCursor: null },
      ],
    })).toEqual({
      products: [{ id: "p1" }],
      total: 1,
      hasMore: false,
      nextCursor: null,
    });
  });
});
