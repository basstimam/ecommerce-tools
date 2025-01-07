import { PRICE_SELECTORS, LISTING_SELECTORS } from "../constants/selectors"
import type { PriceElement } from "../types"

export const findPriceElement = async (): Promise<PriceElement | null> => {
  const allSelectors = [
    ...Object.values(PRICE_SELECTORS.tokopedia),
    ...Object.values(PRICE_SELECTORS.shopee)
  ]

  for (const selector of allSelectors) {
    try {
      if (selector.startsWith("/")) {
        const result = document.evaluate(
          selector,
          document,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null
        )
        const element = result.singleNodeValue as PriceElement
        if (element) return element
      } else {
        const element = document.querySelector(selector) as PriceElement
        if (element) return element
      }
    } catch (error) {
      console.log(`Error finding element with selector ${selector}:`, error)
    }
  }
  return null
}

export const findAllPriceElements = async (): Promise<PriceElement[]> => {
  let elements: PriceElement[] = []
  
  for (const selector of LISTING_SELECTORS) {
    try {
      if (selector.startsWith("/")) {
        const result = document.evaluate(
          selector,
          document,
          null,
          XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
          null
        )
        
        const xpathElements: PriceElement[] = []
        for (let i = 0; i < result.snapshotLength; i++) {
          const element = result.snapshotItem(i) as PriceElement
          if (element) xpathElements.push(element)
        }
        
        if (xpathElements.length > 0) {
          elements = [...elements, ...xpathElements]
        }
      } else {
        const foundElements = Array.from(document.querySelectorAll(selector)) as PriceElement[]
        if (foundElements.length > 0) {
          elements = [...elements, ...foundElements]
        }
      }
    } catch (error) {
      console.log(`Error finding elements with selector ${selector}:`, error)
    }
  }
  
  elements = Array.from(new Set(elements))
  return elements
} 