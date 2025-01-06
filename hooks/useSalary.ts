import { useState, useEffect } from "react"
import { Storage } from "@plasmohq/storage"

const storage = new Storage()

export function useSalary() {
  const [salary, setSalary] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Load saved salary when component mounts
    const loadSavedSalary = async () => {
      const savedSalary = await storage.get("salary")
      if (savedSalary) {
        setSalary(formatToIDR(savedSalary))
      }
    }
    loadSavedSalary()
  }, [])

  const formatToIDR = (value: string) => {
    const number = value.replace(/\D/g, "")
    return new Intl.NumberFormat("id-ID").format(Number(number))
  }

  const updateSalary = async (value: string) => {
    try {
      setIsSending(true)
      setError(null)
      const salaryNum = parseInt(value.replace(/\D/g, ""))
      
      // Save to storage
      await storage.set("salary", value)
      
      if (chrome?.tabs) {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
        if (tabs[0]?.id) {
          await chrome.tabs.sendMessage(tabs[0].id, {
            type: "UPDATE_SALARY",
            salary: salaryNum
          })
        }
      }
      
      setSalary(formatToIDR(value))
    } catch (error) {
      console.error("Error sending salary:", error)
      setError("Gagal memperbarui data")
    } finally {
      setIsSending(false)
    }
  }

  return {
    salary,
    isSending,
    error,
    updateSalary
  }
} 