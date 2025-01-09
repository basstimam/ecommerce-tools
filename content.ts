import type { PlasmoCSConfig } from "plasmo"
import { Storage } from "@plasmohq/storage"

export const config: PlasmoCSConfig = {
  matches: ["https://www.tokopedia.com/*", "https://shopee.co.id/*"]
}

const storage = new Storage()

let currentSalary = 0

function extractPrice(priceText: string): number {
  const cleanText = priceText.replace(/[^\d.,\-]/g, '')
  
  if (cleanText.includes('-')) {
    const [_, maxPrice] = cleanText.split('-')
    return extractPrice(maxPrice)
  }
  
  if (cleanText.includes('.')) {
    return parseInt(cleanText.replace(/\./g, ''))
  }
  
  if (cleanText.includes(',')) {
    return parseInt(cleanText.replace(/,/g, ''))
  }
  
  return parseInt(cleanText) || 0
}

function formatRupiah(angka: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR"
  }).format(angka)
}

function calculateWorkDays(salary: number, price: number): {
  workDays: number,
  totalPrice: number
} {
  const dailySalaryWork = salary / 25
  const workDays = Math.ceil(price / dailySalaryWork)

  return {
    workDays,
    totalPrice: price
  }
}

async function findPriceElement(): Promise<HTMLElement | null> {
  const selectors = [
    // Home Tokopedia
    "/html/body/div[1]/div/div[2]/div[2]/div[4]/div/div[3]/div",

    // Tokopedia Product Details
    "[data-testid='lblPDPDetailProductPrice']",
    ".price",

    // Home Shopee
    "/html/body/div[1]/div/div[2]/div/div/div/div/div[3]/div[2]/div[4]/div/div/div/div[2]/section/div/div[4]/div/div/a[1]/div/div[2]/div[3]/div[1]/div/span[2]",
    ".font-medium.text-base\\/5.truncate",

    // Shopee Product Details
    "/html/body/div[1]/div/div[2]/div/div/div[1]/div/div[1]/div/div[2]/section[1]/section[2]/div/div[3]/div/section/div/div[1]",
    ".IZPeQz.B67UQ0"
  ]

  for (const selector of selectors) {
    try {
      if (selector.startsWith("/")) {
        const result = document.evaluate(
          selector,
          document,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null
        )
        const element = result.singleNodeValue as HTMLElement
        if (element) return element
      } else {
        const element = document.querySelector(selector) as HTMLElement
        if (element) return element
      }
    } catch (error) {
      console.log(`Error finding element with selector ${selector}:`, error)
    }
  }
  return null
}

async function findAllPriceElements(): Promise<HTMLElement[]> {
  const listingSelectors = [
    "[data-testid='lblHomeProductPriceRecom']",
    "[data-testid^='linkProductPrice']",
    "[data-testid='spnSRPProdPrice']",
    "/html/body/div[1]/div/main/section[2]/div[2]/section/div[2]/div[1]/div/div[2]/div/div/div/div/div/div/div/div[2]/a/div[2]/div/div[1]",
    "/html/body/div[1]/div/main/section[3]/div/div/div[2]/div/div[1]/div/div[1]/div/div/div/div/div/div[2]/a/div[2]/div/div",
    ".prd_link-product-price",
    ".css-h66vau",
    // Shopee selectors
    ".font-medium.text-base\\/5.truncate",
    "/html/body/div[1]/div/div[2]/div/div/div/div/div[3]/div[2]/div[4]/div/div/div/div[2]/section/div/div[4]/div/div/a[1]/div/div[2]/div[3]/div[1]/div/span[2]",
    // New Shopee selectors
    ".IZPeQz.B67UQ0",
    "/html/body/div[1]/div/div[2]/div/div/div[1]/div/div[1]/div/div[2]/section[1]/section[2]/div/div[3]/div/section/div/div[1]"
  ]
  
  let elements: HTMLElement[] = []
  
  for (const selector of listingSelectors) {
    try {
      if (selector.startsWith("/")) {
        const result = document.evaluate(
          selector,
          document,
          null,
          XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
          null
        )
        
        const xpathElements: HTMLElement[] = []
        for (let i = 0; i < result.snapshotLength; i++) {
          const element = result.snapshotItem(i) as HTMLElement
          if (element) xpathElements.push(element)
        }
        
        if (xpathElements.length > 0) {
          elements = [...elements, ...xpathElements]
        }
      } else {
        const foundElements = Array.from(document.querySelectorAll(selector)) as HTMLElement[]
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

async function updateAllWorkDaysInfo(salary: number) {
  if (!salary || salary <= 0) {
    console.warn('Salary harus lebih besar dari 0')
    return
  }

  try {
    document.querySelectorAll('.work-days-info').forEach(el => el.remove())
    
    const priceElements = await findAllPriceElements()
    
    priceElements.forEach(priceElement => {
      const priceText = priceElement.textContent || "0"
      const price = extractPrice(priceText)
      const days = calculateWorkDays(salary, price)
      
      const workDaysInfo = document.createElement("div")
      workDaysInfo.className = 'work-days-info'
      
      workDaysInfo.style.cssText = `
        margin-top: 4px;
        padding: 2px 6px;
        background-color: #E8F5E9;
        border-radius: 4px;
        font-size: 12px;
        color: #03AC0E;
        font-weight: 500;
        display: inline-block;
        line-height: 16px;
      `
      
      workDaysInfo.innerHTML = `⏰ ${days.workDays} hari kerja`
      
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

async function updateWorkDaysInfo(salary: number) {
  if (!salary || salary <= 0) {
    console.warn('Salary harus lebih besar dari 0')
    return
  }

  const existingInfo = document.querySelector('.work-days-info')
  if (existingInfo) {
    existingInfo.remove()
  }

  try {
    const priceElement = await findPriceElement()
    if (!priceElement) return

    const isShopee = window.location.hostname.includes('shopee.co.id')
    const isShopeeProductDetails = isShopee && window.location.pathname.includes('/product/')
    
    if (isShopeeProductDetails) {
      return
    }

    const priceText = priceElement.textContent || "0"
    const price = extractPrice(priceText)
    const days = calculateWorkDays(salary, price)

    const workDaysInfo = document.createElement("div")
    workDaysInfo.className = 'work-days-info'
    workDaysInfo.innerHTML = `⏰ Perlu ${days.workDays} hari kerja untuk membeli ini`
    
    if (isShopee) {
      workDaysInfo.style.cssText = `
        margin-top: 4px;
        padding: 2px 6px;
        background-color: #E8F5E9;
        border-radius: 4px;
        font-size: 12px;
        color: #03AC0E;
        font-weight: 500;
        display: inline-block;
        line-height: 16px;
      `
    } else {
      workDaysInfo.style.marginTop = "12px"
      workDaysInfo.style.padding = "10px"
      workDaysInfo.style.backgroundColor = "#E8F5E9"
      workDaysInfo.style.borderRadius = "8px"
      workDaysInfo.style.border = "1px solid #03AC0E"
      workDaysInfo.style.fontSize = "14px"
      workDaysInfo.style.color = "#03AC0E"
      workDaysInfo.style.fontWeight = "500"
    }
    
    priceElement.parentNode.insertBefore(workDaysInfo, priceElement.nextSibling)
  } catch (error) {
    console.error("Error updating work days info:", error)
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "UPDATE_SALARY") {
    const elements = document.querySelectorAll("[data-price]")
    elements.forEach((element) => {
      const price = parseFloat(element.getAttribute("data-price") || "0")
      const { workDays, totalPrice } = calculateWorkDays(message.salary, price)
      
      const formattedPrice = new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR"
      }).format(totalPrice)

      element.textContent = `${workDays} hari kerja (${formattedPrice})`
    })
  }
})

function debounce(func: Function, wait: number) {
  let timeout: NodeJS.Timeout
  return function executedFunction(...args: any[]) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

const debouncedUpdate = debounce((salary: number) => {
  updateAllWorkDaysInfo(salary)
}, 250)

async function initializeAutoConvert() {
  try {
    const savedSalary = await storage.get("salary")
    if (savedSalary) {
      currentSalary = parseInt(savedSalary.replace(/\D/g, ""))
      
      const tryUpdate = async (retryCount = 0, maxRetries = 5) => {
        try {
          const priceElements = await findAllPriceElements()
          const singlePriceElement = await findPriceElement()
          
          if ((priceElements && priceElements.length > 0) || singlePriceElement) {
            await Promise.all([
              updateWorkDaysInfo(currentSalary),
              updateAllWorkDaysInfo(currentSalary)
            ])
            return true
          } else if (retryCount < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000))
            return tryUpdate(retryCount + 1, maxRetries)
          }
          return false
        } catch (error) {
          console.error("Error in tryUpdate:", error)
          return false
        }
      }

      await tryUpdate()

      setInterval(async () => {
        const priceElements = await findAllPriceElements()
        const singlePriceElement = await findPriceElement()
        
        if ((priceElements && priceElements.length > 0) || singlePriceElement) {
          if (!document.querySelector('.work-days-info')) {
            await Promise.all([
              updateWorkDaysInfo(currentSalary),
              updateAllWorkDaysInfo(currentSalary)
            ])
          }
        }
      }, 2000)
    }
  } catch (error) {
    console.error("Error initializing auto-convert:", error)
  }
}

window.addEventListener("load", initializeAutoConvert)

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeAutoConvert)
} else {
  initializeAutoConvert()
}

window.addEventListener('popstate', initializeAutoConvert)

storage.watch({
  salary: async (change) => {
    const newValue = change.newValue as string
    if (newValue) {
      currentSalary = parseInt(newValue.replace(/\D/g, ""))
      
      const tryUpdate = async (retryCount = 0, maxRetries = 3) => {
        try {
          await Promise.all([
            updateWorkDaysInfo(currentSalary),
            updateAllWorkDaysInfo(currentSalary)
          ])
          return true
        } catch (error) {
          if (retryCount < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 500))
            return tryUpdate(retryCount + 1, maxRetries)
          }
          console.error("Error updating after storage change:", error)
          return false
        }
      }
      
      await tryUpdate()
    }
  }
})

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

interface Review {
  text: string
  kendala?: string
}

const scrapeReviews = async (): Promise<Review[]> => {
  const uniqueReviews = new Map<string, Review>()
  
  const reviewSelectors = [
    'span[data-testid="lblItemUlasan"]',
    'div[data-testid="pdpFlexWrapperContainer"] p.css-1h7ch6e',
    'div.css-1h7ch6e',
    '.css-1k3im5k',
    '.css-1h7ch6e-unf-heading'
  ]

  for (const selector of reviewSelectors) {
    const reviewElements = document.querySelectorAll(selector)
    reviewElements.forEach((reviewElement) => {
      const reviewText = reviewElement.textContent?.trim()
      if (reviewText && !uniqueReviews.has(reviewText)) {
        const reviewContainer = reviewElement.closest('article') || 
                              reviewElement.closest('[data-testid="pdpFlexWrapperContainer"]') ||
                              reviewElement.closest('.css-1k3im5k')
        let kendala = ''
        
        if (reviewContainer) {
          const kendalaSelectors = [
            'p[data-unify="Typography"].css-zhjnk4-unf-heading',
            'div[data-testid="divKendala"] p',
            '.css-zhjnk4-unf-heading',
            'p.css-zhjnk4',
            'div[data-testid="divKendala"] span'
          ]

          for (const kendalaSelector of kendalaSelectors) {
            const kendalaElement = reviewContainer.querySelector(kendalaSelector)
            if (kendalaElement) {
              kendala = kendalaElement.textContent?.replace('Kendala:', '').trim() || ''
              break
            }
          }

          if (!kendala) {
            const xpathResult = document.evaluate(
              './/p[contains(text(), "Kendala:")]',
              reviewContainer,
              null,
              XPathResult.FIRST_ORDERED_NODE_TYPE,
              null
            )
            const xpathElement = xpathResult.singleNodeValue as HTMLElement
            if (xpathElement) {
              kendala = xpathElement.textContent?.replace('Kendala:', '').trim() || ''
            }
          }
        }

        uniqueReviews.set(reviewText, {
          text: reviewText,
          kendala: kendala || undefined
        })
      }
    })
  }

  return Array.from(uniqueReviews.values())
}

const clickNextPage = async (): Promise<boolean> => {
  const nextButtonSelectors = [
    'button[aria-label="Laman berikutnya"]',
    'button.css-16uzo3v-unf-pagination-item',
    '.css-16uzo3v-unf-pagination-item',
    '//button[contains(@class, "css-16uzo3v-unf-pagination-item")]'
  ]

  for (const selector of nextButtonSelectors) {
    try {
      let nextButton: HTMLElement | null = null
      
      if (selector.startsWith('//')) {
        const result = document.evaluate(
          selector,
          document,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null
        )
        nextButton = result.singleNodeValue as HTMLElement
      } else {
        nextButton = document.querySelector(selector)
      }

      if (nextButton && !nextButton.hasAttribute('disabled')) {
        (nextButton as HTMLButtonElement).click()
        return true
      }
    } catch (error) {
      console.log(`Error finding next button with selector ${selector}:`, error)
    }
  }
  
  return false
}

const goToPage = async (pageNumber: number, currentPage: number): Promise<boolean> => {
  if (pageNumber === currentPage + 1) {
    return clickNextPage()
  }

  const buttons = document.querySelectorAll('button.css-bugrro-unf-pagination-item')
  let found = false
  buttons.forEach(button => {
    if (button.textContent?.trim() === pageNumber.toString()) {
      (button as HTMLButtonElement).click()
      found = true
    }
  })

  if (!found) {
    console.error(`Tombol untuk halaman ${pageNumber} tidak ditemukan.`)
  }
  return found
}

const getTotalPages = (): number => {
  const paginationButtons = Array.from(document.querySelectorAll('button.css-bugrro-unf-pagination-item'))
  const lastPageButton = paginationButtons[paginationButtons.length - 1]
  if (lastPageButton?.textContent) {
    const lastPage = parseInt(lastPageButton.textContent)
    if (!isNaN(lastPage)) return lastPage
  }

  const totalReviewElement = document.querySelector('[data-testid="lblTotalReview"]')
  if (totalReviewElement) {
    const totalReviewText = totalReviewElement.textContent || ''
    const totalReview = parseInt(totalReviewText.replace(/\D/g, ''))
    if (!isNaN(totalReview)) {
      return Math.ceil(totalReview / 10)
    }
  }

  return 10
}

const scrapeAllReviews = async (): Promise<Review[]> => {
  const allReviews: Review[] = []
  const totalPages = getTotalPages()
  let currentPage = 1

  while (currentPage <= totalPages) {
    console.log(`Mengambil data dari halaman ${currentPage}...`)
    
    await new Promise((resolve) => {
      const observer = new MutationObserver((mutationsList, observer) => {
        const reviewsLoaded = document.querySelectorAll('span[data-testid="lblItemUlasan"]').length > 0
        if (reviewsLoaded) {
          observer.disconnect()
          resolve(true)
        }
      })
      
      const targetNode = document.querySelector('div[data-testid="divReviewList"]')
      if (targetNode) {
        observer.observe(targetNode, { childList: true, subtree: true })
      } else {
        resolve(true)
      }
    })

    const pageReviews = await scrapeReviews()
    allReviews.push(...pageReviews)

    if (currentPage < totalPages) {
      const success = await goToPage(currentPage + 1, currentPage)
      if (!success) {
        console.log('Tidak dapat menavigasi ke halaman berikutnya')
        break
      }
      currentPage++
      await new Promise(resolve => setTimeout(resolve, 1500))
    } else {
      break
    }
  }

  return allReviews
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "ANALYZE_REVIEWS") {
    scrapeAllReviews().then(reviews => {
      sendResponse({ reviews })
    })
    return true
  }
  // ... existing code ...
})

