import type { PlasmoCSConfig } from "plasmo"

// Export config untuk content script
export const config: PlasmoCSConfig = {
  matches: ["https://www.tokopedia.com/*"]
}

// Fungsi untuk mengubah format harga ke number
function extractPrice(priceText: string): number {
  return parseInt(priceText.replace(/[^0-9]/g, ""))
}

// Fungsi untuk memformat angka ke format rupiah
function formatRupiah(angka: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR"
  }).format(angka)
}

// Fungsi untuk menghitung hari kerja
function calculateWorkDays(salary: number, price: number): {
  workDays: number
} {
  const dailySalaryWork = salary / 30
  console.log("Gaji harian:", dailySalaryWork)
  
  const workDays = Math.ceil(price / dailySalaryWork)
  console.log("Harga barang:", price)
  console.log("Hasil perhitungan hari:", workDays)

  return {
    workDays
  }
}

// Fungsi untuk mencari elemen harga dengan berbagai selector
async function findPriceElement(): Promise<HTMLElement | null> {
  const selectors = [
    // XPath untuk detail produk
    "/html/body/div[1]/div/div[2]/div[2]/div[4]/div/div[3]/div",
    // Class untuk harga produk
    "[data-testid='lblPDPDetailProductPrice']",
    // Selector backup
    ".price"
  ]

  for (const selector of selectors) {
    try {
      if (selector.startsWith("/")) {
        // XPath
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
        // CSS Selector
        const element = document.querySelector(selector) as HTMLElement
        if (element) return element
      }
    } catch (error) {
      console.log(`Error finding element with selector ${selector}:`, error)
    }
  }
  return null
}

// Update fungsi updateWorkDaysInfo
async function updateWorkDaysInfo(salary: number) {
  console.log("Updating work days info...")

  // Hapus info yang lama
  const existingInfo = document.querySelector('.work-days-info')
  if (existingInfo) {
    existingInfo.remove()
  }

  try {
    // Cari elemen harga
    const priceElement = await findPriceElement()
    console.log("Found price element:", priceElement)

    if (!priceElement) {
      console.log("Price element not found")
      return
    }

    const priceText = priceElement.textContent || "0"
    console.log("Price text:", priceText)
    
    const price = extractPrice(priceText)
    console.log("Extracted price:", price)
    
    const days = calculateWorkDays(salary, price)
    console.log("Calculated days:", days)

    // Buat dan tambahkan info
    const workDaysInfo = document.createElement("div")
    workDaysInfo.className = 'work-days-info'
    
    // Styling container
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
    console.log("Successfully updated work days info")
  } catch (error) {
    console.error("Error updating work days info:", error)
  }
}

// Listen untuk pesan dari popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "UPDATE_SALARY" && message.salary) {
    updateWorkDaysInfo(message.salary)
    sendResponse({ success: true })
  }
}) 
