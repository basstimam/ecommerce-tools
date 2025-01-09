import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { useState, useEffect, useMemo } from "react"
import { Stemmer, Tokenizer } from 'sastrawijs'
import { Container } from '@nlpjs/core'
import { SentimentAnalyzer } from '@nlpjs/sentiment'
import { LangId } from '@nlpjs/lang-id'
import { 
  positiveWords, 
  negativeWords, 
  intensifiers, 
  negations, 
  bigramPhrases,
  emojiSentiment 
} from "../lib/sentimentDictionary"

interface ReviewAnalysisResult {
  text: string
  kendala?: string
  score: number
  comparative: number
  normalizedText?: string
  tokens?: string[]
  stems?: string[]
  timestamp?: number
  error?: string
  contexts?: string[]
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

interface StorageData {
  [key: string]: {
    timestamp?: number
    text?: string
    score?: number
    comparative?: number
    [key: string]: any
  }
}

export const ReviewAnalyzer = ({ onAnalyze, isLoading, results }: ReviewAnalyzerProps) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'negative'>('summary')
  const [isInitialized, setIsInitialized] = useState<boolean>(false)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [totalPages, setTotalPages] = useState<number>(0)
  const [stemmer] = useState<Stemmer>(() => new Stemmer())
  const [tokenizer] = useState<Tokenizer>(() => new Tokenizer())
  const [stemCache] = useState<Map<string, string>>(() => new Map())
  const [loadedNegativeReviews, setLoadedNegativeReviews] = useState<ReviewAnalysisResult[]>([])
  const batchSize = 10
  const [nlpContainer] = useState(() => {
    const container = new Container()
    container.use(LangId)
    container.use(SentimentAnalyzer)
    return container
  })

  // Optimisasi stemming dengan memoization
  const optimizedStem = (word: string) => {
    const lowercased = word.toLowerCase()
    if (stemCache.has(lowercased)) {
      return stemCache.get(lowercased)
    }
    const stemmed = stemmer.stem(lowercased)
    stemCache.set(lowercased, stemmed)
    return stemmed
  }

  // Fungsi untuk ekstrak dan skor emoji
  const extractEmojiSentiment = (text: string) => {
    let score = 0
    for (const [emoji, value] of Object.entries(emojiSentiment)) {
      const regex = new RegExp(emoji, 'g')
      const count = (text.match(regex) || []).length
      score += count * value
    }
    return score
  }

  // Fungsi untuk normalisasi teks yang dioptimasi
  const normalizeText = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^\w\s\u{1F300}-\u{1F9FF}]/gu, '') // Pertahankan emoji
      .replace(/\s+/g, ' ')
      .trim()
  }

  // Inisialisasi NLP
  useEffect(() => {
    const initializeNLP = async () => {
      try {
        await nlpContainer.train()
        console.log('NLP container trained successfully')
      } catch (error) {
        console.error('Error training NLP container:', error)
      }
    }
    initializeNLP()
  }, [nlpContainer])

  // Modifikasi fungsi analyzeText untuk menggunakan NLP.js
  const analyzeText = async (text: string) => {
    try {
      if (!text || typeof text !== 'string') {
        throw new Error('Invalid text input')
      }

      // Cek cache
      const cacheKey = `review_${text}`
      const cached = await chrome.storage.local.get(cacheKey)
      if (cached[cacheKey]) {
        return cached[cacheKey]
      }

      const normalizedText = normalizeText(text)
      const emojiScore = extractEmojiSentiment(text)
      
      // Tokenisasi menggunakan sastrawijs
      const tokens = tokenizer.tokenize(normalizedText)
      const stems = tokens.map(optimizedStem)

      // Analisis sentimen menggunakan NLP.js
      const nlpResult = await nlpContainer.process('id', normalizedText)
      const nlpScore = nlpResult.sentiment.score || 0
      
      // Kombinasikan skor dari NLP.js dengan skor emoji dan analisis tambahan
      const sentimentResult = calculateSentimentScore(stems)
      const combinedScore = (nlpScore + sentimentResult.score + emojiScore) / 3
      const finalComparative = combinedScore / (stems.length || 1)

      const result: ReviewAnalysisResult = {
        text,
        normalizedText,
        tokens,
        stems,
        score: combinedScore,
        comparative: finalComparative,
        contexts: sentimentResult.contexts,
        timestamp: Date.now()
      }

      // Simpan ke cache
      await chrome.storage.local.set({ [cacheKey]: result })

      return result
    } catch (error) {
      console.error('Gagal menganalisis teks:', error)
      return {
        text,
        score: 0,
        comparative: 0,
        error: error.message,
        timestamp: Date.now()
      }
    }
  }

  // Fungsi untuk menghitung skor sentimen yang dioptimasi
  const calculateSentimentScore = (stems: string[]) => {
    let score = 0
    let hasNegation = false
    let hasIntensifier = false
    let contextMultiplier = 1

    // Deteksi konteks utama
    const contexts = {
      product: false,    // Konteks kualitas produk
      service: false,    // Konteks pelayanan
      shipping: false,   // Konteks pengiriman
      price: false,      // Konteks harga
      packaging: false   // Konteks packaging
    }

    // Kata kunci untuk mendeteksi konteks
    const contextKeywords = {
      product: ['produk', 'barang', 'item', 'kualitas', 'original', 'asli', 'berfungsi'],
      service: ['pelayanan', 'respon', 'cs', 'admin', 'penjual', 'seller', 'toko'],
      shipping: ['kirim', 'sampai', 'paket', 'ekspedisi', 'kurir', 'pengiriman'],
      price: ['harga', 'mahal', 'murah', 'worth', 'sebanding'],
      packaging: ['packing', 'bungkus', 'pembungkus', 'bubble', 'wrap']
    }

    // Deteksi konteks dari stems
    for (const stem of stems) {
      for (const [context, keywords] of Object.entries(contextKeywords)) {
        if (keywords.includes(stem)) {
          contexts[context] = true
          break
        }
      }
    }

    // Hitung jumlah konteks yang terdeteksi
    const activeContexts = Object.values(contexts).filter(Boolean).length

    for (let i = 0; i < stems.length; i++) {
      const stem = stems[i]
      const nextStem = stems[i + 1]
      
      // Cek bigram
      const bigram = stem + ' ' + (nextStem || '')
      if (bigramPhrases[bigram] !== undefined) {
        // Berikan bobot lebih untuk frasa yang sesuai konteks
        let phraseScore = bigramPhrases[bigram]
        if (
          (contexts.shipping && bigram.includes('sampai')) ||
          (contexts.service && bigram.includes('respon')) ||
          (contexts.product && (bigram.includes('original') || bigram.includes('asli'))) ||
          (contexts.packaging && bigram.includes('packing'))
        ) {
          phraseScore *= 1.2 // Tingkatkan bobot 20% untuk frasa yang sesuai konteks
        }
        score += phraseScore
        i++ // Skip kata berikutnya
        continue
      }

      // Cek kata tunggal
      let wordScore = 0
      if (positiveWords.has(stem)) {
        wordScore = 1
      } else if (negativeWords.has(stem)) {
        wordScore = -1
      }

      // Sesuaikan skor berdasarkan konteks
      if (wordScore !== 0) {
        // Jika kata sesuai dengan konteks yang terdeteksi, berikan bobot lebih
        if (
          (contexts.product && contextKeywords.product.includes(stem)) ||
          (contexts.service && contextKeywords.service.includes(stem)) ||
          (contexts.shipping && contextKeywords.shipping.includes(stem)) ||
          (contexts.price && contextKeywords.price.includes(stem)) ||
          (contexts.packaging && contextKeywords.packaging.includes(stem))
        ) {
          wordScore *= 1.2 // Tingkatkan bobot 20% untuk kata yang sesuai konteks
        }
        score += wordScore
      }

      // Cek negasi dan intensifier
      if (i > 0) {
        const prevStem = stems[i - 1]
        if (negations.has(prevStem)) {
          hasNegation = true
          // Negasi memiliki efek yang lebih kuat pada konteks yang spesifik
          contextMultiplier = activeContexts > 0 ? -1.3 : -1.2
        }
        if (intensifiers.has(prevStem)) {
          hasIntensifier = true
          // Intensifier memiliki efek yang lebih kuat pada konteks yang spesifik
          contextMultiplier = activeContexts > 0 ? 1.3 : 1.1
        }
      }
    }

    // Sesuaikan skor akhir berdasarkan konteks dan modifier
    let finalScore = score * contextMultiplier

    // Normalisasi berdasarkan panjang teks dan jumlah konteks
    const normalizedScore = finalScore / (stems.length || 1)
    
    // Sesuaikan skor komparatif berdasarkan konteks
    let comparativeScore = normalizedScore
    if (activeContexts > 0) {
      // Berikan bobot lebih untuk review yang membahas banyak aspek
      comparativeScore *= (1 + (activeContexts * 0.1))
    }
    
    return {
      score: finalScore,
      comparative: comparativeScore,
      contexts: Object.entries(contexts)
        .filter(([_, active]) => active)
        .map(([context]) => context)
    }
  }

  // Batching analysis dengan optimisasi
  const handleAnalyze = async () => {
    try {
      const batches = []
      for (let i = 0; i < results.length; i += batchSize) {
        batches.push(results.slice(i, i + batchSize))
      }

      let analyzedResults = []
      for (const batch of batches) {
        const batchResults = await Promise.all(
          batch.map(async (result) => {
            const nlpResult = await analyzeText(result.text)
            return nlpResult ? { ...result, ...nlpResult } : result
          })
        )
        analyzedResults = [...analyzedResults, ...batchResults]
        
        // Update progress
        console.log(`Analyzed ${analyzedResults.length}/${results.length} reviews`)
      }

      saveStateToStorage({ 
        results: analyzedResults,
        isAnalyzing: false
      })
    } catch (error) {
      console.error('Gagal menganalisis reviews:', error)
    }
  }

  // Lazy loading untuk review negatif
  useEffect(() => {
    if (activeTab === 'negative') {
      const negativeReviews = results
        .filter(r => r.score < 0)
        .sort((a, b) => a.score - b.score)
      setLoadedNegativeReviews(negativeReviews)
    }
  }, [activeTab, results])

  // Cleanup cache
  useEffect(() => {
    return () => {
      const cleanupCache = async () => {
        try {
          const storage = await chrome.storage.local.get()
          const cacheItems = storage as StorageData
          const oneDay = 24 * 60 * 60 * 1000
          const now = Date.now()

          const keysToRemove = Object.entries(cacheItems)
            .filter(([key, value]) => {
              return key.startsWith('review_') && 
                value?.timestamp && 
                now - value.timestamp > oneDay
            })
            .map(([key]) => key)

          if (keysToRemove.length > 0) {
            await chrome.storage.local.remove(keysToRemove)
            console.log(`Cleaned up ${keysToRemove.length} cached items`)
          }
        } catch (error) {
          console.error('Error cleaning up cache:', error)
        }
      }
      cleanupCache()
    }
  }, [])

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

  const analyzeProductRecommendation = () => {
    if (results.length === 0) return null

    const positiveCount = results.filter(r => r.score > 0).length
    const negativeCount = loadedNegativeReviews.length
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

  // Modifikasi tampilan untuk menampilkan hasil analisis
  const renderReviewDetail = (result: ReviewAnalysisResult) => (
    <div className="p-3 bg-gray-50 rounded-lg">
      <p className="text-sm text-gray-600">{result.text}</p>
      {result.normalizedText && (
        <p className="text-xs text-gray-500 mt-1">
          <span className="font-medium">Normalisasi:</span> {result.normalizedText}
        </p>
      )}
      {result.stems && result.stems.length > 0 && (
        <p className="text-xs text-gray-500">
          <span className="font-medium">Kata Dasar:</span> {result.stems.join(', ')}
        </p>
      )}
      {result.contexts && result.contexts.length > 0 && (
        <div className="flex gap-1 mt-1 flex-wrap">
          {result.contexts.map((context, idx) => (
            <span 
              key={idx}
              className={`text-xs px-2 py-0.5 rounded-full ${
                context === 'product' ? 'bg-blue-100 text-blue-700' :
                context === 'service' ? 'bg-purple-100 text-purple-700' :
                context === 'shipping' ? 'bg-green-100 text-green-700' :
                context === 'price' ? 'bg-yellow-100 text-yellow-700' :
                'bg-gray-100 text-gray-700'
              }`}
            >
              {context === 'product' ? '🏷️ Produk' :
               context === 'service' ? '💬 Layanan' :
               context === 'shipping' ? '🚚 Pengiriman' :
               context === 'price' ? '💰 Harga' :
               context === 'packaging' ? '📦 Kemasan' :
               context}
            </span>
          ))}
        </div>
      )}
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
        {result.comparative && (
          <span className="text-xs text-gray-500">
            (Comparative: {result.comparative.toFixed(2)})
          </span>
        )}
      </div>
    </div>
  )

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
                Review Negatif ({loadedNegativeReviews.length})
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
                      {loadedNegativeReviews.length}
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
                {loadedNegativeReviews.map((result, index) => (
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
                {loadedNegativeReviews.length === 0 && (
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