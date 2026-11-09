export const BROWSE_PAGE_SIZE = 40;
export const MAX_BROWSE_SEARCH_CHARS = 80;

export function buildBrowseUrl({
  category = "all",
  query = "",
  sort = "default",
  cursor = null,
  limit = BROWSE_PAGE_SIZE,
} = {}) {
  const params = new URLSearchParams();
  params.set("category", category);
  params.set("sort", sort);
  params.set("limit", String(limit));
  const normalizedQuery = query.trim().slice(0, MAX_BROWSE_SEARCH_CHARS);
  if (normalizedQuery) params.set("q", normalizedQuery);
  if (cursor) params.set("cursor", cursor);
  return `/api/stylist/browse?${params.toString()}`;
}

export function mergeBrowsePages(infiniteData) {
  if (!Array.isArray(infiniteData?.pages)) return undefined;
  const products = [];
  const seen = new Set();
  for (const page of infiniteData.pages) {
    const pageProducts = Array.isArray(page?.products) ? page.products : [];
    for (const product of pageProducts) {
      if (!product?.id || seen.has(product.id)) continue;
      products.push(product);
      seen.add(product.id);
    }
  }
  const firstPage = infiniteData.pages[0];
  const lastPage = infiniteData.pages.at(-1);
  return {
    products,
    total: Number.isInteger(firstPage?.total) ? firstPage.total : products.length,
    hasMore: lastPage?.hasMore === true,
    nextCursor: typeof lastPage?.nextCursor === "string" ? lastPage.nextCursor : null,
  };
}
