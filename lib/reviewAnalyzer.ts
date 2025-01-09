import Sentiment from 'sentiment'

export interface ReviewAnalysisResult {
  text: string
  kendala?: string
  score: number
  comparative: number
  isPositive: boolean
  isNegative: boolean
}

const sentiment = new Sentiment()

// Kamus kata positif dan negatif dalam Bahasa Indonesia
const indonesianWords = {
  positif: [
    // Kata sifat positif umum
    'bagus', 'mantap', 'keren', 'recommended', 'rekomen', 'suka', 'puas',
    'berkualitas', 'cepat', 'ramah', 'original', 'ori', 'asli', 'worth',
    'murah', 'sesuai', 'cocok', 'sempurna', 'terbaik', 'oke', 'ok',
    // Kata positif spesifik produk
    'awet', 'tahan', 'nyaman', 'enak', 'lembut', 'halus', 'rapi',
    'lengkap', 'berfungsi', 'berguna', 'bermanfaat', 'memuaskan',
    // Frasa positif
    'sangat bagus', 'sangat puas', 'sangat recommended', 'worth it',
    'harga sesuai', 'kualitas bagus', 'pelayanan bagus', 'pengiriman cepat'
  ],
  negatif: [
    // Kata sifat negatif umum
    'jelek', 'buruk', 'kecewa', 'rusak', 'palsu', 'lambat', 'mahal',
    'tidak sesuai', 'tidak cocok', 'cacat', 'kurang', 'tidak recommended',
    'tidak rekomen', 'tidak puas', 'tidak bagus', 'tidak worth', 'tidak oke',
    'tidak ok', 'tidak original', 'tidak ori', 'tidak asli',
    // Kata negatif spesifik
    'lecet', 'sobek', 'luntur', 'pudar', 'kotor', 'bau', 'bocor',
    'patah', 'retak', 'tidak berfungsi', 'error', 'bermasalah',
    // Frasa negatif
    'kurang bagus', 'kurang puas', 'tidak recommended', 'tidak worth it',
    'harga tidak sesuai', 'kualitas buruk', 'pelayanan buruk'
  ]
}

// Kata-kata pengecualian yang tidak mempengaruhi sentimen
const excludedWords = [
  'sudah', 'telah', 'akan', 'nanti', 'mungkin', 'sepertinya', 'katanya',
  'kata', 'bilang', 'menurut', 'setelah', 'sebelum', 'saat', 'waktu'
]

// Kata-kata yang menguatkan sentimen
const intensifiers = {
  positif: ['sangat', 'banget', 'sekali', 'super', 'sungguh', 'benar-benar'],
  negatif: ['sangat', 'terlalu', 'begitu', 'sungguh', 'benar-benar']
}

// Kata-kata yang membalikkan sentimen
const negators = [
  'tidak', 'bukan', 'belum', 'jangan', 'tak', 'ga', 'gak', 'nggak',
  'engga', 'enggak', 'kagak', 'ndak', 'tidak ada', 'ga ada'
]

// Menambahkan kata-kata Indonesia ke dalam analyzer dengan bobot yang disesuaikan
sentiment.registerLanguage('id', {
  labels: {
    ...indonesianWords.positif.reduce((acc, word) => ({ ...acc, [word]: 2 }), {}),
    ...indonesianWords.negatif.reduce((acc, word) => ({ ...acc, [word]: -2 }), {}),
    ...intensifiers.positif.reduce((acc, word) => ({ ...acc, [word]: 1 }), {}),
    ...intensifiers.negatif.reduce((acc, word) => ({ ...acc, [word]: -1 }), {}),
    ...negators.reduce((acc, word) => ({ ...acc, [word]: -1 }), {})
  }
})

const containsPositivePhrase = (text: string): boolean => {
  const positivePatterns = [
    /sangat (bagus|puas|recommended|rekomen)/i,
    /worth it/i,
    /kualitas (bagus|baik|oke)/i,
    /pelayanan (bagus|baik|oke)/i,
    /pengiriman cepat/i,
    /harga (sesuai|worth|oke|ok)/i
  ]
  return positivePatterns.some(pattern => pattern.test(text))
}

const containsNegativePhrase = (text: string): boolean => {
  const negativePatterns = [
    /tidak (bagus|puas|recommended|rekomen|sesuai|worth)/i,
    /kurang (bagus|puas|sesuai)/i,
    /kualitas (buruk|jelek)/i,
    /pelayanan (buruk|jelek|lambat)/i,
    /pengiriman (lambat|lama)/i,
    /harga (mahal|tidak sesuai|tidak worth)/i
  ]
  return negativePatterns.some(pattern => pattern.test(text))
}

const hasNegation = (text: string): boolean => {
  return negators.some(negator => text.toLowerCase().includes(negator))
}

export const analyzeReview = (review: { text: string, kendala?: string }): ReviewAnalysisResult => {
  const text = review.text.toLowerCase()
  const kendala = review.kendala?.toLowerCase() || ''
  
  // Analisis dasar menggunakan sentiment
  const textResult = sentiment.analyze(text)
  const kendalaResult = kendala ? sentiment.analyze(kendala) : { score: 0, comparative: 0 }
  
  // Analisis frasa
  const hasPositivePhrase = containsPositivePhrase(text)
  const hasNegativePhrase = containsNegativePhrase(text)
  const textHasNegation = hasNegation(text)
  const kendalaHasNegation = hasNegation(kendala)

  // Perhitungan skor akhir
  let finalScore = textResult.score

  // Jika ada frasa positif tanpa negasi, tambah skor
  if (hasPositivePhrase && !textHasNegation) {
    finalScore += 2
  }

  // Jika ada frasa negatif, kurangi skor
  if (hasNegativePhrase) {
    finalScore -= 2
  }

  // Jika ada kendala
  if (kendala) {
    // Kendala serius langsung membuat skor negatif
    if (containsNegativePhrase(kendala) || kendalaResult.score < -1) {
      finalScore = Math.min(finalScore, -1)
    } else {
      // Kendala ringan mengurangi skor
      finalScore += kendalaResult.score
    }
  }

  // Normalisasi skor
  const normalizedScore = Math.max(Math.min(finalScore, 5), -5)
  
  // Menentukan sentimen akhir
  const isPositive = normalizedScore > 0 && !hasNegativePhrase && (!kendala || kendalaResult.score >= 0)
  const isNegative = normalizedScore < 0 || hasNegativePhrase || (kendala && kendalaResult.score < 0)

  return {
    ...review,
    score: normalizedScore,
    comparative: normalizedScore / (text.length + (kendala?.length || 0)),
    isPositive,
    isNegative
  }
}

export const analyzeReviews = (reviews: { text: string, kendala?: string }[]): ReviewAnalysisResult[] => {
  return reviews.map(analyzeReview)
} 