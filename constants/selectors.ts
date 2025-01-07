export const PRICE_SELECTORS = {
  tokopedia: {
    home: "/html/body/div[1]/div/div[2]/div[2]/div[4]/div/div[3]/div",
    productDetails: "[data-testid='lblPDPDetailProductPrice']",
    price: ".price"
  },
  shopee: {
    home: "/html/body/div[1]/div/div[2]/div/div/div/div/div[3]/div[2]/div[4]/div/div/div/div[2]/section/div/div[4]/div/div/a[1]/div/div[2]/div[3]/div[1]/div/span[2]",
    productDetails: "/html/body/div[1]/div/div[2]/div/div/div[1]/div/div[1]/div/div[2]/section[1]/section[2]/div/div[3]/div/section/div/div[1]",
    price: ".IZPeQz.B67UQ0"
  }
}

export const LISTING_SELECTORS = [
  "[data-testid='lblHomeProductPriceRecom']",
  "[data-testid^='linkProductPrice']",
  "[data-testid='spnSRPProdPrice']",
  "/html/body/div[1]/div/main/section[2]/div[2]/section/div[2]/div[1]/div/div[2]/div/div/div/div/div/div/div/div[2]/a/div[2]/div/div[1]",
  "/html/body/div[1]/div/main/section[3]/div/div/div[2]/div/div[1]/div/div[1]/div/div/div/div/div/div[2]/a/div[2]/div/div",
  ".prd_link-product-price",
  ".css-h66vau",
  ".font-medium.text-base\\/5.truncate",
  "/html/body/div[1]/div/div[2]/div/div/div/div/div[3]/div[2]/div[4]/div/div/div/div[2]/section/div/div[4]/div/div/a[1]/div/div[2]/div[3]/div[1]/div/span[2]",
  ".IZPeQz.B67UQ0",
  "/html/body/div[1]/div/div[2]/div/div/div[1]/div/div[1]/div/div[2]/section[1]/section[2]/div/div[3]/div/section/div/div[1]"
]

export const WORK_DAYS_INFO_STYLES = {
  base: {
    marginTop: "4px",
    padding: "2px 6px",
    backgroundColor: "#E8F5E9",
    borderRadius: "4px",
    fontSize: "12px",
    color: "#03AC0E",
    fontWeight: "500",
    display: "inline-block",
    lineHeight: "16px"
  },
  shopee: {
    marginTop: "12px",
    padding: "10px",
    backgroundColor: "#E8F5E9",
    borderRadius: "8px",
    border: "1px solid #03AC0E",
    fontSize: "14px",
    color: "#03AC0E",
    fontWeight: "500"
  }
}

export const WORK_DAYS_TEXT = {
  productDetails: (days: number) => `⏰ Perlu ${days} hari kerja untuk membeli barang ini`,
  listing: (days: number) => `⏰ ${days} hari kerja`
} 