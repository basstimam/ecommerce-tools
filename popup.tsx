import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card"
import { SalaryInput } from "./components/SalaryInput"
import { useSalary } from "./hooks/useSalary"
import "./style.css"

function IndexPopup() {
  const { salary, error, updateSalary } = useSalary()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateSalary(e.target.value)
  }

  return (
    <Card className="w-[350px] p-4">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-bold text-center">
          Day to work Converter
        </CardTitle>
      </CardHeader>
      <CardContent>
        <SalaryInput
          value={salary}
          onChange={handleChange}
          error={error}
        />
      </CardContent>
    </Card>
  )
}

export default IndexPopup
