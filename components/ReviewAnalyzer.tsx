import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { useState, useEffect } from "react"

interface ReviewAnalysisResult {
  text: string
  kendala?: string
  score: number
  comparative: number
}

interface ReviewAnalyzerProps {
  onAnalyze: () => Promise<void>
  isLoading: boolean
  results: ReviewAnalysisResult[]
}

interface StoredState {
  activeTab: 'summary' | 'negative'
  results: ReviewAnalysisResult[]
  isAnalyzing: boolean
  lastUpdated: number
  currentPage?: number
  totalPages?: number
}

export const ReviewAnalyzer = ({ onAnalyze, isLoading, results }: ReviewAnalyzerProps) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'negative'>('summary')
  const [isInitialized, setIsInitialized] = useState<boolean>(false)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [totalPages, setTotalPages] = useState<number>(0)

  // Fungsi untuk mencoba melanjutkan scraping
  const attemptContinueScraping = async () => {
    try {
      // Coba temukan tombol next page dengan berbagai selector
      const nextPageSelectors = [
        'button[aria-label="Laman berikutnya"]',
        '.css-16uzo3v-unf-pagination-item',
        '//button[contains(@class, "css-16uzo3v-unf-pagination-item")]',
        '//html/body/div[1]/div/div[2]/div[2]/div[13]/div/div/section/div[3]/nav/ul/li[11]/button'
      ]

      let nextPageButton: Element | null = null

      // Coba setiap selector sampai menemukan tombol
      for (const selector of nextPageSelectors) {
        if (selector.startsWith('//')) {
          // Gunakan XPath jika selector dimulai dengan //
          const result = document.evaluate(
            selector,
            document,
            null,
            XPathResult.FIRST_ORDERED_NODE_TYPE,
            null
          )
          nextPageButton = result.singleNodeValue as Element
        } else {
          nextPageButton = document.querySelector(selector)
        }
        
        if (nextPageButton) break
      }

      if (nextPageButton && !nextPageButton.hasAttribute('disabled')) {
        console.log('Menemukan tombol next page, melanjutkan scraping...')
        ;(nextPageButton as HTMLButtonElement).click()
        
        // Update dan simpan state halaman
        const newPage = currentPage + 1
        setCurrentPage(newPage)
        saveStateToStorage({ 
          currentPage: newPage,
          isAnalyzing: true 
        })
        
        // Lanjutkan analisis
        await onAnalyze()
        return true
      }
      
      return false
    } catch (error) {
      console.error('Gagal melanjutkan scraping:', error)
      return false
    }
  }

  // Fungsi untuk menyimpan state ke storage
  const saveStateToStorage = async (state: Partial<StoredState>) => {
    try {
      await chrome.storage.local.set({
        reviewAnalyzer: {
          activeTab: state.activeTab || activeTab,
          results: state.results || results,
          isAnalyzing: state.isAnalyzing || isLoading,
          currentPage: state.currentPage || currentPage,
          totalPages: state.totalPages || totalPages,
          lastUpdated: Date.now()
        }
      })
      console.log('State berhasil disimpan ke storage')
    } catch (error) {
      console.error('Gagal menyimpan state:', error)
    }
  }

  // Fungsi untuk memulihkan state dari storage
  const restoreStateFromStorage = async () => {
    try {
      const stored = await chrome.storage.local.get('reviewAnalyzer')
      if (stored.reviewAnalyzer) {
        const { 
          activeTab: storedTab, 
          results: storedResults, 
          isAnalyzing,
          currentPage: storedPage,
          totalPages: storedTotalPages
        } = stored.reviewAnalyzer
        
        // Hanya pulihkan state jika data tersimpan kurang dari 1 jam
        const oneHour = 60 * 60 * 1000
        if (Date.now() - stored.reviewAnalyzer.lastUpdated < oneHour) {
          setActiveTab(storedTab)
          if (storedPage) setCurrentPage(storedPage)
          if (storedTotalPages) setTotalPages(storedTotalPages)
          
          if (isAnalyzing && !isLoading) {
            // Coba lanjutkan scraping jika sebelumnya sedang berjalan
            const continued = await attemptContinueScraping()
            if (!continued) {
              console.log('Tidak dapat melanjutkan scraping, memulai dari awal')
              onAnalyze()
            }
          }
          console.log('State berhasil dipulihkan dari storage')
        } else {
          // Hapus data lama dari storage
          await chrome.storage.local.remove('reviewAnalyzer')
          console.log('Data storage kadaluarsa, memulai dari awal')
        }
      }
    } catch (error) {
      console.error('Gagal memulihkan state:', error)
    }
  }

  // Lifecycle untuk inisialisasi komponen dan memulihkan state
  useEffect(() => {
    const initializeComponent = async () => {
      try {
        await restoreStateFromStorage()
        setIsInitialized(true)
        console.log('ReviewAnalyzer component initialized')
      } catch (error) {
        console.error('Error initializing ReviewAnalyzer:', error)
      }
    }

    initializeComponent()

    // Cleanup function saat komponen unmount
    return () => {
      saveStateToStorage({ isAnalyzing: false })
      setIsInitialized(false)
      console.log('ReviewAnalyzer component unmounted')
    }
  }, [])

  // Lifecycle untuk memantau dan menyimpan perubahan results
  useEffect(() => {
    if (results.length > 0) {
      saveStateToStorage({ results })
      console.log('New review results received and saved:', results.length, 'reviews')
    }
  }, [results])

  // Lifecycle untuk memantau dan menyimpan perubahan tab
  useEffect(() => {
    saveStateToStorage({ activeTab })
    console.log('Active tab changed and saved:', activeTab)
  }, [activeTab])

  // Lifecycle untuk memantau status loading
  useEffect(() => {
    saveStateToStorage({ 
      isAnalyzing: isLoading,
      currentPage,
      totalPages 
    })
    console.log('Analysis status changed:', isLoading ? 'analyzing' : 'idle')
    
    // Jika loading berhenti dan masih ada halaman yang belum di-scrape
    if (!isLoading && currentPage < totalPages) {
      attemptContinueScraping()
    }
  }, [isLoading])

  const getSentimentEmoji = (score: number) => {
    if (score > 0) return "😊"
    if (score < 0) return "😞"
    return "😐"
  }

  const getSentimentColor = (score: number) => {
    if (score > 0) return "text-green-600"
    if (score < 0) return "text-red-600"
    return "text-gray-600"
  }

  const negativeReviews = results.filter(r => r.score < 0)
    .sort((a, b) => a.score - b.score)

  const analyzeProductRecommendation = () => {
    if (results.length === 0) return null

    const positiveCount = results.filter(r => r.score > 0).length
    const negativeCount = negativeReviews.length
    const neutralCount = results.length - positiveCount - negativeCount
    const positivePercentage = (positiveCount / results.length) * 100
    const highPositiveCount = results.filter(r => r.score > 2).length
    const highPositivePercentage = (highPositiveCount / results.length) * 100
    const positiveToNegativeRatio = negativeCount === 0 ? positiveCount : positiveCount / negativeCount
    
    const pros: string[] = []
    const cons: string[] = []

    const kendalaMap = new Map<string, number>()
    results.forEach(review => {
      if (review.kendala) {
        kendalaMap.set(review.kendala, (kendalaMap.get(review.kendala) || 0) + 1)
      }
    })

    const commonIssues = Array.from(kendalaMap.entries())
      .filter(([_, count]) => count > 1)
      .sort((a, b) => b[1] - a[1])
      .map(([kendala]) => kendala)

    if (positiveToNegativeRatio >= 2) {
      pros.push("Review positif 2x lebih banyak dari negatif")
    }
    if (positiveToNegativeRatio >= 3) {
      pros.push("Review positif sangat dominan")
    }
    if (highPositiveCount > 0) {
      pros.push(`${highPositiveCount} pembeli sangat puas dengan produk`)
    }
    if (positivePercentage >= 80) {
      pros.push("Tingkat kepuasan pembeli sangat tinggi")
    }
    if (negativeCount === 0 && positiveCount > 0) {
      pros.push("Belum ada review negatif")
    }

    if (commonIssues.length > 0) {
      cons.push(`Kendala yang sering muncul: ${commonIssues.slice(0, 2).join(", ")}`)
    }
    if (negativeCount > results.length * 0.4) {
      cons.push("Cukup banyak review negatif")
    }
    if (results.some(r => r.score < -2)) {
      const seriousIssueCount = results.filter(r => r.score < -2).length
      if (seriousIssueCount > positiveCount * 0.5) {
        cons.push(`Perhatian: ${seriousIssueCount} keluhan serius`)
      } else {
        cons.push(`Ada ${seriousIssueCount} keluhan serius`)
      }
    }

    let recommendation: string
    let recommendationColor: string
    
    if (positiveToNegativeRatio >= 3 || positivePercentage >= 80 || highPositivePercentage >= 30) {
      recommendation = "Sangat Direkomendasikan"
      recommendationColor = "text-green-600"
    } else if (positiveToNegativeRatio >= 2 || positivePercentage >= 60 || highPositivePercentage >= 20) {
      recommendation = "Direkomendasikan"
      recommendationColor = "text-green-600"
    } else if (positiveToNegativeRatio >= 1.5 || positivePercentage >= 40 || highPositivePercentage >= 10) {
      recommendation = "Cukup Direkomendasikan"
      recommendationColor = "text-yellow-600"
    } else if (positiveCount > negativeCount || positivePercentage >= 20) {
      recommendation = "Direkomendasikan dengan Catatan"
      recommendationColor = "text-yellow-600"
    } else {
      recommendation = "Kurang Direkomendasikan"
      recommendationColor = "text-orange-600"
    }

    return {
      recommendation,
      recommendationColor,
      pros,
      cons,
      positivePercentage,
      highPositivePercentage,
      positiveToNegativeRatio: positiveToNegativeRatio.toFixed(1),
      stats: {
        positive: positiveCount,
        negative: negativeCount,
        neutral: neutralCount,
        total: results.length
      }
    }
  }

  const recommendation = analyzeProductRecommendation()

  return (
    <Card className="w-full mt-4 bg-white shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <span role="img" aria-label="analysis" className="text-xl">📊</span>
          Review Ulasan
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Button 
          onClick={onAnalyze}
          disabled={isLoading}
          className="w-full mb-4 bg-primary hover:bg-primary/90 text-white"
        >
          {isLoading ? "Menganalisis..." : "Mulai Analisa"}
        </Button>

        {results.length > 0 && (
          <>
            <div className="flex gap-2 mb-4">
              <Button
                variant={activeTab === 'summary' ? 'default' : 'outline'}
                onClick={() => setActiveTab('summary')}
                className="flex-1"
              >
                Ringkasan
              </Button>
              <Button
                variant={activeTab === 'negative' ? 'default' : 'outline'}
                onClick={() => setActiveTab('negative')}
                className="flex-1"
              >
                Review Negatif ({negativeReviews.length})
              </Button>
            </div>

            {activeTab === 'summary' ? (
              <div className="space-y-4">
                {recommendation && (
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div className="mb-3">
                      <p className="text-sm text-gray-600 mb-1">Rekomendasi:</p>
                      <p className={`text-lg font-bold ${recommendation.recommendationColor}`}>
                        {recommendation.recommendation}
                      </p>
                      <div className="space-y-2 mt-2">
                        <div>
                          <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>Review Positif</span>
                            <span>{recommendation.positivePercentage.toFixed(1)}%</span>
                          </div>
                          <div className="h-2 bg-gray-200 rounded-full">
                            <div 
                              className="h-2 bg-green-500 rounded-full"
                              style={{ width: `${recommendation.positivePercentage}%` }}
                            />
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>Review Sangat Positif</span>
                            <span>{recommendation.highPositivePercentage.toFixed(1)}%</span>
                          </div>
                          <div className="h-2 bg-gray-200 rounded-full">
                            <div 
                              className="h-2 bg-green-600 rounded-full"
                              style={{ width: `${recommendation.highPositivePercentage}%` }}
                            />
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-gray-500">
                          <span className="font-medium">Rasio Positif:Negatif = </span>
                          <span>{recommendation.positiveToNegativeRatio}:1</span>
                        </div>
                        <div className="grid grid-cols-4 gap-2 mt-1 text-center text-xs">
                          <div className="bg-green-50 p-2 rounded">
                            <div className="font-medium text-green-700">{recommendation.stats.positive}</div>
                            <div className="text-gray-500">Positif</div>
                          </div>
                          <div className="bg-red-50 p-2 rounded">
                            <div className="font-medium text-red-700">{recommendation.stats.negative}</div>
                            <div className="text-gray-500">Negatif</div>
                          </div>
                          <div className="bg-gray-50 p-2 rounded">
                            <div className="font-medium text-gray-700">{recommendation.stats.neutral}</div>
                            <div className="text-gray-500">Netral</div>
                          </div>
                          <div className="bg-blue-50 p-2 rounded">
                            <div className="font-medium text-blue-700">{recommendation.stats.total}</div>
                            <div className="text-gray-500">Total</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-green-700 mb-1">Pro:</p>
                        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                          {recommendation.pros.map((pro, index) => (
                            <li key={index}>{pro}</li>
                          ))}
                        </ul>
                      </div>
                      
                      <div>
                        <p className="text-sm font-medium text-red-700 mb-1">Kontra:</p>
                        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                          {recommendation.cons.map((con, index) => (
                            <li key={index}>{con}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm text-green-800 font-medium">Review Positif</p>
                    <p className="text-2xl font-bold text-green-600">
                      {results.filter(r => r.score > 0).length}
                    </p>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg">
                    <p className="text-sm text-red-800 font-medium">Review Negatif</p>
                    <p className="text-2xl font-bold text-red-600">
                      {negativeReviews.length}
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  {results.slice(0, 5).map((result, index) => (
                    <div 
                      key={index}
                      className="p-3 bg-gray-50 rounded-lg"
                    >
                      <p className="text-sm text-gray-600">{result.text}</p>
                      {result.kendala && (
                        <p className="text-sm text-red-600 mt-1">
                          <span className="font-medium">Kendala:</span> {result.kendala}
                        </p>
                      )}
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-lg">{getSentimentEmoji(result.score)}</span>
                        <span className={`text-sm font-medium ${getSentimentColor(result.score)}`}>
                          Score: {result.score.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {negativeReviews.map((result, index) => (
                  <div 
                    key={index}
                    className="p-4 bg-red-50 rounded-lg border border-red-100"
                  >
                    <div className="space-y-2">
                      <p className="text-sm text-gray-700">{result.text}</p>
                      {result.kendala && (
                        <div className="bg-red-100 p-2 rounded-md">
                          <p className="text-sm text-red-700">
                            <span className="font-medium">Kendala:</span> {result.kendala}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-lg">{getSentimentEmoji(result.score)}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded-full">
                          Skor Negatif: {Math.abs(result.score).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                {negativeReviews.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    Tidak ada review negatif ditemukan 🎉
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
} 