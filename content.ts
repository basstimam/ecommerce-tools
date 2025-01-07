import type { PlasmoCSConfig } from "plasmo"
import { Storage } from "@plasmohq/storage"
import { WORK_DAYS_INFO_STYLES, WORK_DAYS_TEXT } from "./constants/selectors"
import { extractPrice, formatRupiah, calculateWorkDays, debounce } from "./utils/price"
import { findPriceElement, findAllPriceElements } from "./services/priceElement"

export const config: PlasmoCSConfig = {
  matches: ["https://www.tokopedia.com/*", "https://shopee.co.id/*"]
}

const storage = new Storage()
let currentSalary = 0

const isProductDetailsPage = (): boolean => {
  const { pathname } = window.location
  return pathname.includes('/product/') || pathname.includes('/p/')
}

const createWorkDaysInfo = (days: number, isShopee: boolean = false): HTMLDivElement => {
  const workDaysInfo = document.createElement("div")
  workDaysInfo.className = 'work-days-info'
  
  const isDetails = isProductDetailsPage()
  workDaysInfo.innerHTML = isDetails 
    ? WORK_DAYS_TEXT.productDetails(days)
    : WORK_DAYS_TEXT.listing(days)
  
  const styles = isShopee ? WORK_DAYS_INFO_STYLES.shopee : WORK_DAYS_INFO_STYLES.base
  Object.assign(workDaysInfo.style, styles)
  
  return workDaysInfo
}

const updateAllWorkDaysInfo = async (salary: number) => {
  if (!salary || salary <= 0) {
    console.warn('Salary harus lebih besar dari 0')
    return
  }

  try {
    // Skip if on product details page
    if (isProductDetailsPage()) return

    document.querySelectorAll('.work-days-info').forEach(el => el.remove())
    
    const priceElements = await findAllPriceElements()
    
    priceElements.forEach(priceElement => {
      const priceText = priceElement.textContent || "0"
      const price = extractPrice(priceText)
      const { workDays } = calculateWorkDays(salary, price)
      
      const workDaysInfo = createWorkDaysInfo(workDays)
      
      const parentElement = priceElement.closest('[data-testid^="linkProductPrice"]') || 
                          priceElement.closest('[data-testid="lblHomeProductPriceRecom"]') ||
                          priceElement.closest('.prd_link-product-price') ||
                          priceElement.parentElement
      
      if (parentElement) {
        parentElement.insertAdjacentElement('afterend', workDaysInfo)
      }
    })
  } catch (error) {
    console.error("Error updating all work days info:", error)
  }
}

const updateWorkDaysInfo = async (salary: number) => {
  if (!salary || salary <= 0) {
    console.warn('Salary harus lebih besar dari 0')
    return
  }

  document.querySelector('.work-days-info')?.remove()

  try {
    const priceElement = await findPriceElement()
    if (!priceElement) return

    const isShopee = window.location.hostname.includes('shopee.co.id')
    const isDetails = isProductDetailsPage()
    
    // Only show on product details page or non-Shopee pages
    if (!isDetails && isShopee) return

    const priceText = priceElement.textContent || "0"
    const price = extractPrice(priceText)
    const { workDays } = calculateWorkDays(salary, price)

    const workDaysInfo = createWorkDaysInfo(workDays, isShopee)
    priceElement.parentNode?.insertBefore(workDaysInfo, priceElement.nextSibling)
  } catch (error) {
    console.error("Error updating work days info:", error)
  }
}

const tryUpdate = async (salary: number, retryCount = 0, maxRetries = 3): Promise<boolean> => {
  try {
    await Promise.all([
      updateWorkDaysInfo(salary),
      updateAllWorkDaysInfo(salary)
    ])
    return true
  } catch (error) {
    if (retryCount < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 500))
      return tryUpdate(salary, retryCount + 1, maxRetries)
    }
    console.error("Error updating after storage change:", error)
    return false
  }
}

const initializeAutoConvert = async () => {
  try {
    const savedSalary = await storage.get("salary")
    if (savedSalary) {
      currentSalary = parseInt(savedSalary.replace(/\D/g, ""))
      
      const hasElements = await tryUpdate(currentSalary)
      
      if (hasElements) {
        setInterval(async () => {
          const priceElements = await findAllPriceElements()
          const singlePriceElement = await findPriceElement()
          
          if ((priceElements?.length > 0 || singlePriceElement) && !document.querySelector('.work-days-info')) {
            await tryUpdate(currentSalary)
          }
        }, 2000)
      }
    }
  } catch (error) {
    console.error("Error initializing auto-convert:", error)
  }
}

// Event Listeners
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "UPDATE_SALARY") {
    document.querySelectorAll("[data-price]").forEach((element) => {
      const price = parseFloat(element.getAttribute("data-price") || "0")
      const { workDays, totalPrice } = calculateWorkDays(message.salary, price)
      element.textContent = `${workDays} hari kerja (${formatRupiah(totalPrice)})`
    })
  }
})

const debouncedUpdate = debounce((salary: number) => {
  updateAllWorkDaysInfo(salary)
}, 250)

storage.watch({
  salary: async (change) => {
    const newValue = change.newValue as string
    if (newValue) {
      currentSalary = parseInt(newValue.replace(/\D/g, ""))
      await tryUpdate(currentSalary)
    }
  }
})

// DOM Observer
const observer = new MutationObserver((mutations) => {
  const hasRelevantChanges = mutations.some(mutation => 
    Array.from(mutation.addedNodes).some(node => 
      node instanceof HTMLElement && 
      (node.querySelector("[data-testid='spnSRPProdPrice']") || 
       node.querySelector(".css-o5uqvq"))
    )
  )
  
  if (hasRelevantChanges && currentSalary > 0) {
    debouncedUpdate(currentSalary)
  }
})

observer.observe(document.body, {
  childList: true,
  subtree: true
})

// Initialize
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeAutoConvert)
} else {
  initializeAutoConvert()
}

window.addEventListener("load", initializeAutoConvert)
window.addEventListener('popstate', initializeAutoConvert) 