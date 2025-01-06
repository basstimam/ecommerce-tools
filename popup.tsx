import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card"
import { SalaryInput } from "./components/SalaryInput"
import { useSalary } from "./hooks/useSalary"
import "./globals.css"
import "./style.css"

function IndexPopup() {
  const { salary, error, updateSalary } = useSalary()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateSalary(e.target.value)
  }

  return (
    <Card className="w-[350px] p-4 bg-gradient-to-br from-white to-gray-50">
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
  )
}

export default IndexPopup
