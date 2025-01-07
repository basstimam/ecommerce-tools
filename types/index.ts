export interface WorkDaysCalculation {
  workDays: number
  totalPrice: number
}

export interface PriceElement extends HTMLElement {
  textContent: string | null
}

export interface StorageChange {
  newValue: string
  oldValue: string | undefined
} 