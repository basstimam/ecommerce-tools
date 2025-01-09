export const positiveWords = new Set([
  // Kualitas Produk
  'bagus', 'baik', 'berkualitas', 'premium', 'original', 'asli', 'genuine',
  'awet', 'tahan', 'kuat', 'kokoh', 'halus', 'rapi', 'berfungsi', 'works',
  'sempurna', 'lengkap', 'komplit', 'mantap', 'oke', 'ok', 'mantul',
  'recommended', 'rekomen', 'rekomendasi', 'worth', 'worthit', 'worth it',
  'sesuai', 'cocok', 'pas', 'presisi', 'akurat',

  // Pengalaman Pengguna
  'suka', 'puas', 'senang', 'happy', 'keren', 'jos', 'kece', 'top',
  'terbaik', 'memuaskan', 'menyenangkan', 'nyaman', 'enak', 'best',
  'recommended', 'rekomen', 'rekomendasi',

  // Pelayanan
  'ramah', 'sopan', 'responsif', 'cepat', 'tepat', 'profesional',
  'helpful', 'membantu', 'informatif', 'jelas', 'detail', 'teliti',

  // Pengiriman
  'aman', 'utuh', 'selamat', 'rapi', 'cepat', 'ontime', 'tepat waktu',
  'sesuai jadwal', 'express', 'kilat',

  // Harga
  'murah', 'terjangkau', 'ekonomis', 'hemat', 'worth', 'sebanding',
  'sesuai harga', 'reasonable', 'fair', 'sepadan',

  // Packaging
  'aman', 'rapi', 'bagus', 'tebal', 'kokoh', 'protected', 'terlindungi',
  'bubble wrap', 'terbungkus'
])

export const negativeWords = new Set([
  // Kualitas Produk
  'buruk', 'jelek', 'rusak', 'cacat', 'palsu', 'kw', 'replika',
  'tiruan', 'imitasi', 'tidak original', 'tidak asli', 'murahan',
  'abal', 'tidak berfungsi', 'rusak', 'error', 'bermasalah', 'defect',
  'tidak sesuai', 'tidak cocok', 'tidak pas', 'tidak presisi',

  // Pengalaman Pengguna
  'kecewa', 'kesal', 'marah', 'frustasi', 'menyesal', 'rugi',
  'tidak puas', 'tidak suka', 'tidak senang', 'tidak nyaman',
  'tidak enak', 'tidak worth it', 'buang-buang', 'menyesal',

  // Pelayanan
  'kasar', 'tidak ramah', 'lambat', 'lama', 'tidak responsif',
  'tidak profesional', 'tidak membantu', 'mengecewakan', 'tidak jelas',
  'membingungkan', 'tidak informatif',

  // Pengiriman
  'telat', 'terlambat', 'tidak sampai', 'hilang', 'tertukar',
  'salah alamat', 'salah kirim', 'tidak sesuai jadwal', 'delay',
  'pending', 'tertunda',

  // Kondisi Produk
  'lecet', 'penyok', 'sobek', 'patah', 'retak', 'pecah',
  'baret', 'kusut', 'kotor', 'noda', 'berjamur', 'berkarat',
  'luntur', 'pudar',

  // Harga
  'mahal', 'kemahalan', 'tidak worth', 'tidak sebanding',
  'overpriced', 'tidak sesuai harga', 'terlalu mahal',
  'tidak reasonable', 'tidak fair'
])

export const intensifiers = new Set([
  // Penguatan Positif
  'sangat', 'banget', 'sekali', 'super', 'sungguh', 'benar-benar',
  'betul-betul', 'amat', 'terlalu', 'begitu', 'luar biasa',

  // Penguatan Negatif
  'kurang', 'agak', 'sedikit', 'cukup', 'lumayan', 'hampir',
  'nyaris', 'tidak terlalu', 'tidak begitu'
])

export const negations = new Set([
  'tidak', 'bukan', 'belum', 'jangan', 'tak', 'ga', 'gak',
  'nggak', 'ngga', 'kagak', 'tidak ada', 'ga ada', 'gak ada'
])

export const bigramPhrases: Record<string, number> = {
  // Pengiriman Positif
  'cepat sampai': 1.5,
  'tepat waktu': 1.5,
  'sampai tujuan': 1,
  'sesuai jadwal': 1,
  'packing aman': 1.5,
  'packing rapi': 1,
  'pengiriman cepat': 1.5,

  // Pelayanan Positif
  'fast response': 1.5,
  'cepat tanggap': 1.5,
  'respon cepat': 1.5,
  'pelayanan bagus': 1,
  'pelayanan ramah': 1,
  'customer service': 1,

  // Kualitas Positif
  'sangat bagus': 2,
  'sangat puas': 2,
  'luar biasa': 2,
  'the best': 2,
  'top markotop': 2,
  'sangat recommended': 2,
  'highly recommended': 2,
  'very recommended': 2,
  'recommended seller': 2,
  'trusted seller': 2,
  'top seller': 2,

  // Pengiriman Negatif
  'tidak sampai': -2,
  'belum sampai': -1.5,
  'salah alamat': -1.5,
  'salah kirim': -1.5,
  'pengiriman lama': -1.5,
  'packing rusak': -1.5,

  // Pelayanan Negatif
  'tidak respon': -1.5,
  'slow respon': -1.5,
  'respon lama': -1.5,
  'tidak profesional': -1.5,
  'tidak ramah': -1.5,
  'tidak membantu': -1.5,

  // Kualitas Negatif
  'tidak original': -2,
  'tidak asli': -2,
  'tidak berfungsi': -2,
  'tidak work': -2,
  'tidak sesuai': -1.5,
  'tidak cocok': -1.5,
  'tidak worth': -2,
  'tidak recommended': -2,
  'jangan beli': -2,
  'tidak bagus': -1.5,
  'kurang bagus': -1,
  'sangat mengecewakan': -2,
  'sangat kecewa': -2
}

export const emojiSentiment: Record<string, number> = {
  // Emoji Sangat Positif
  '😍': 2,
  '🥰': 2,
  '💯': 2,
  '⭐⭐⭐⭐⭐': 2,
  '👍👍': 2,
  '❤️❤️': 2,

  // Emoji Positif
  '👍': 1,
  '❤️': 1,
  '😊': 1,
  '🙂': 0.5,
  '⭐': 0.5,
  '✨': 0.5,
  '💪': 0.5,
  '👌': 1,

  // Emoji Netral
  '😐': 0,
  '🤔': 0,
  '😶': 0,

  // Emoji Negatif
  '👎': -1,
  '😢': -1,
  '😔': -1,
  '😕': -0.5,
  '😫': -1,
  '😤': -1.5,

  // Emoji Sangat Negatif
  '😡': -2,
  '🤬': -2,
  '👎👎': -2,
  '💔': -1.5,
  '😭': -1.5
} 