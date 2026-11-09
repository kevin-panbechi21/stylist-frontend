const CURRENCY_PATTERN = /^[A-Z]{3}$/;

export function formatProductPrice(product, fallback = "Price unavailable") {
  const amount = Number(product?.price);
  if (!Number.isFinite(amount) || amount < 0) return fallback;

  const currency = CURRENCY_PATTERN.test(product?.currency)
    ? product.currency
    : "USD";

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      currencyDisplay: currency === "USD" ? "narrowSymbol" : "code",
      minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(amount).replace(/[\u00a0\u202f]/g, " ");
  } catch {
    const amountText = Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
    return currency === "USD" ? `$${amountText}` : `${currency} ${amountText}`;
  }
}

export function buildProductAccessibilityLabel(product) {
  const details = [
    product?.brand,
    product?.title,
    formatProductPrice(product),
    product?.category ? product.category.replace(/-/g, " ") : null,
  ];
  return details.filter((value) => typeof value === "string" && value.trim()).join(", ");
}

function shareText(value, fallback) {
  if (typeof value !== "string") return fallback;
  const normalized = value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim();
  return normalized.slice(0, 120) || fallback;
}

export function buildProductSharePayload(product) {
  const title = shareText(product?.title, "this item");
  const brand = shareText(product?.brand, "a featured brand");
  return {
    title,
    message: `Check out ${title} by ${brand} on Stylist — ${formatProductPrice(product)}`,
  };
}
