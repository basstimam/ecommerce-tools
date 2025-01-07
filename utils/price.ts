import { WorkDaysCalculation } from "../types"

export const extractPrice = (priceText: string): number => {
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

export const formatRupiah = (amount: number): string => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR"
  }).format(amount)
}

export const calculateWorkDays = (salary: number, price: number): WorkDaysCalculation => {
  const dailySalaryWork = salary / 25
  const workDays = Math.ceil(price / dailySalaryWork)

  return {
    workDays,
    totalPrice: price
  }
}

export const debounce = <T extends (...args: any[]) => void>(
  func: T, 
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
} 