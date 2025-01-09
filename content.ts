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

interface Review {
  text: string
  kendala?: string
}

// Fungsi untuk mengambil review dari Tokopedia
const scrapeReviews = async (): Promise<Review[]> => {
  const uniqueReviews = new Map<string, Review>()
  
  // Mengambil review dan kendala
  const reviewSelectors = [
    'span[data-testid="lblItemUlasan"]',
    'div[data-testid="pdpFlexWrapperContainer"] p.css-1h7ch6e',
    'div.css-1h7ch6e', // Selector alternatif untuk review
    '.css-1k3im5k', // Selector untuk review di halaman produk
    '.css-1h7ch6e-unf-heading' // Selector untuk review dengan format baru
  ]

  for (const selector of reviewSelectors) {
    const reviewElements = document.querySelectorAll(selector)
    reviewElements.forEach((reviewElement) => {
      const reviewText = reviewElement.textContent?.trim()
      if (reviewText && !uniqueReviews.has(reviewText)) {
        // Mencari elemen kendala terdekat
        const reviewContainer = reviewElement.closest('article') || 
                              reviewElement.closest('[data-testid="pdpFlexWrapperContainer"]') ||
                              reviewElement.closest('.css-1k3im5k')
        let kendala = ''
        
        if (reviewContainer) {
          // Mencoba mencari kendala dengan berbagai selector
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

          // Jika tidak ditemukan dengan querySelector, coba dengan XPath
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

// Fungsi untuk mengklik tombol next page
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

// Fungsi untuk mengklik tombol pagination
const goToPage = async (pageNumber: number, currentPage: number): Promise<boolean> => {
  // Jika halaman berikutnya, gunakan tombol next
  if (pageNumber === currentPage + 1) {
    return clickNextPage()
  }

  // Jika tidak, coba klik nomor halaman langsung
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

// Fungsi untuk mendapatkan total halaman
const getTotalPages = (): number => {
  // Coba dapatkan dari tombol pagination terakhir
  const paginationButtons = Array.from(document.querySelectorAll('button.css-bugrro-unf-pagination-item'))
  const lastPageButton = paginationButtons[paginationButtons.length - 1]
  if (lastPageButton?.textContent) {
    const lastPage = parseInt(lastPageButton.textContent)
    if (!isNaN(lastPage)) return lastPage
  }

  // Coba dapatkan dari informasi total review
  const totalReviewElement = document.querySelector('[data-testid="lblTotalReview"]')
  if (totalReviewElement) {
    const totalReviewText = totalReviewElement.textContent || ''
    const totalReview = parseInt(totalReviewText.replace(/\D/g, ''))
    if (!isNaN(totalReview)) {
      return Math.ceil(totalReview / 10) // 10 review per halaman
    }
  }

  // Default ke 10 halaman jika tidak bisa mendapatkan total
  return 10
}

// Fungsi utama untuk scraping semua review
const scrapeAllReviews = async (): Promise<Review[]> => {
  const allReviews: Review[] = []
  const totalPages = getTotalPages()
  let currentPage = 1

  while (currentPage <= totalPages) {
    console.log(`Mengambil data dari halaman ${currentPage}...`)
    
    // Tunggu hingga konten review dimuat
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

    // Cek apakah masih ada halaman berikutnya
    if (currentPage < totalPages) {
      const success = await goToPage(currentPage + 1, currentPage)
      if (!success) {
        console.log('Tidak dapat menavigasi ke halaman berikutnya')
        break
      }
      currentPage++
      // Tunggu sebentar sebelum ke halaman berikutnya
      await new Promise(resolve => setTimeout(resolve, 1500))
    } else {
      break
    }
  }

  return allReviews
}

// Menambahkan listener untuk pesan dari popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "ANALYZE_REVIEWS") {
    scrapeAllReviews().then(reviews => {
      sendResponse({ reviews })
    })
    return true
  }
  // ... existing code ...
})


})

