import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card"
import { SalaryInput } from "./components/SalaryInput"
import { ReviewAnalyzer } from "./components/ReviewAnalyzer"
import { useSalary } from "./hooks/useSalary"
import { analyzeReviews } from "./lib/reviewAnalyzer"
import { useState } from "react"
import "./globals.css"
import "./style.css"

function IndexPopup() {
  const { salary, error, updateSalary } = useSalary()
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResults, setAnalysisResults] = useState([])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateSalary(e.target.value)
  }

  const handleAnalyzeReviews = async () => {
    setIsAnalyzing(true)
    try {
      // Mendapatkan tab aktif
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (!tab.id) return

      // Mengirim pesan ke content script untuk scraping review
      const response = await chrome.tabs.sendMessage(tab.id, { type: "ANALYZE_REVIEWS" })
      
      if (response && response.reviews) {
        // Analisis sentimen untuk setiap review
        const results = analyzeReviews(response.reviews)
        setAnalysisResults(results)
      }
    } catch (error) {
      console.error("Error analyzing reviews:", error)
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <div className="w-[400px] p-4 bg-gradient-to-br from-white to-gray-50">
      <Card className="bg-white shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-bold text-center flex items-center justify-center gap-2">
            <span role="img" aria-label="money" className="text-2xl">💰</span>
            Kalkulator Hari Kerja
            <span role="img" aria-label="calendar" className="text-2xl">📅</span>
          </CardTitle>
          <p className="text-center text-sm text-gray-500 mt-2">
            Hitung berapa hari kerja yang diperlukan untuk membeli barang yang kamu inginkan ✨
          </p>
        </CardHeader>
        <CardContent>
          <SalaryInput
            value={salary}
            onChange={handleChange}
            error={error}
          />
          <p className="text-xs text-center text-gray-400 mt-4">
            Tips: Masukkan gaji yang diinginkan untuk melihat berapa hari kerja yang diperlukan 🎯
          </p>
        </CardContent>
      </Card>

      <ReviewAnalyzer 
        onAnalyze={handleAnalyzeReviews}
        isLoading={isAnalyzing}
        results={analysisResults}
      />
    </div>
  )
}

export default IndexPopup
