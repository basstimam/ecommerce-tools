import type { PlasmoCSConfig } from "plasmo"
import { Storage } from "@plasmohq/storage"

export const config: PlasmoCSConfig = {
  matches: ["https://www.tokopedia.com/*"]
}

const storage = new Storage()

let currentSalary = 0

function extractPrice(priceText: string): number {
  return parseInt(priceText.replace(/[^0-9]/g, ""))
}

function formatRupiah(angka: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR"
  }).format(angka)
}

function calculateWorkDays(salary: number, price: number): {
  workDays: number
} {
  const dailySalaryWork = salary / 30
  const workDays = Math.ceil(price / dailySalaryWork)

  return {
    workDays
  }
}

async function findPriceElement(): Promise<HTMLElement | null> {
  const selectors = [
    "/html/body/div[1]/div/div[2]/div[2]/div[4]/div/div[3]/div",
    "[data-testid='lblPDPDetailProductPrice']",
    ".price"
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
    ".css-h66vau"
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

    const priceText = priceElement.textContent || "0"
    const price = extractPrice(priceText)
    const days = calculateWorkDays(salary, price)

    const workDaysInfo = document.createElement("div")
    workDaysInfo.className = 'work-days-info'
    
    workDaysInfo.style.marginTop = "12px"
    workDaysInfo.style.padding = "10px"
    workDaysInfo.style.backgroundColor = "#E8F5E9"
    workDaysInfo.style.borderRadius = "8px"
    workDaysInfo.style.border = "1px solid #03AC0E"
    
    const daysInfo = document.createElement("div")
    daysInfo.style.fontSize = "14px"
    daysInfo.style.color = "#03AC0E"
    daysInfo.style.fontWeight = "500"
    daysInfo.innerHTML = `⏰ Perlu ${days.workDays} hari kerja untuk membeli ini`
    
    workDaysInfo.appendChild(daysInfo)
    priceElement.parentNode.insertBefore(workDaysInfo, priceElement.nextSibling)
  } catch (error) {
    console.error("Error updating work days info:", error)
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "UPDATE_SALARY" && message.salary) {
    updateWorkDaysInfo(message.salary)
    updateAllWorkDaysInfo(message.salary)
    sendResponse({ success: true })
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
      
      // Fungsi untuk mencoba update dengan retry
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
            // Tunggu 1 detik sebelum mencoba lagi
            await new Promise(resolve => setTimeout(resolve, 1000))
            return tryUpdate(retryCount + 1, maxRetries)
          }
          return false
        } catch (error) {
          console.error("Error in tryUpdate:", error)
          return false
        }
      }

      // Mulai proses update dengan retry
      await tryUpdate()

      // Set interval untuk mengecek dan memperbarui konversi setiap 2 detik
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

// Inisialisasi saat halaman dimuat
window.addEventListener("load", initializeAutoConvert)

// Inisialisasi juga saat DOM ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeAutoConvert)
} else {
  initializeAutoConvert()
}

// Tambahkan event listener untuk history changes (untuk SPA navigation)
window.addEventListener('popstate', initializeAutoConvert)

// Listen for storage changes dengan retry
storage.watch({
  salary: async (change) => {
    const newValue = change.newValue as string
    if (newValue) {
      currentSalary = parseInt(newValue.replace(/\D/g, ""))
      
      // Retry mechanism untuk storage changes
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

// Observer untuk perubahan DOM
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
