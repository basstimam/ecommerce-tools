import { Input } from "./ui/input"
import { Label } from "./ui/label"

interface SalaryInputProps {
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  error?: string | null
}

export function SalaryInput({ value, onChange, error }: SalaryInputProps) {
  return (
    <div className="grid w-full items-center gap-1.5">
      <Label htmlFor="salary" className="text-sm font-medium">
        Salary/Month:
      </Label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
          Rp
        </span>
        <Input
          type="text"
          id="salary"
          value={value}
          onChange={onChange}
          placeholder="0"
          className="pl-10"
        />
      </div>
      {error && (
        <p className="text-sm text-red-500 mt-1">
          {error}
        </p>
      )}
    </div>
  )
} 