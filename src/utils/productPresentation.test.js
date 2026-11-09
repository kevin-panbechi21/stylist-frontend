import {
  buildProductAccessibilityLabel,
  buildProductSharePayload,
  formatProductPrice,
} from "./productPresentation";

describe("product presentation", () => {
  it("formats USD by default without unnecessary cents", () => {
    expect(formatProductPrice({ price: 78 })).toBe("$78");
    expect(formatProductPrice({ price: "78.5" })).toBe("$78.50");
  });

  it("makes non-USD currency explicit and rejects invalid amounts", () => {
    expect(formatProductPrice({ price: 1234.56, currency: "CAD" }))
      .toBe("CAD 1,234.56");
    expect(formatProductPrice({ price: 1234.56, currency: "CAD" }))
      .not.toMatch(/[\u00a0\u202f]/);
    expect(formatProductPrice({ price: "not-a-price" })).toBe("Price unavailable");
    expect(formatProductPrice({ price: -1 })).toBe("Price unavailable");
  });

  it("builds one concise VoiceOver label for a product card", () => {
    expect(buildProductAccessibilityLabel({
      brand: "Aritzia",
      title: "Contour Dress",
      price: 118,
      currency: "USD",
      category: "dresses",
    })).toBe("Aritzia, Contour Dress, $118, dresses");
  });

  it("shares product context without leaking an unverified retailer URL", () => {
    const payload = buildProductSharePayload({
      brand: "Free People",
      title: "Coastal Maxi Dress",
      price: 128,
      retailerUrl: "https://unverified.example/private-link",
    });

    expect(payload).toEqual({
      title: "Coastal Maxi Dress",
      message: "Check out Coastal Maxi Dress by Free People on Stylist — $128",
    });
    expect(JSON.stringify(payload)).not.toContain("unverified.example");
  });
});
