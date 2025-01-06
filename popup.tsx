import { useState } from "react"
import "./style.css"

function IndexPopup() {
  const [salary, setSalary] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fungsi untuk memformat ke IDR
  const formatToIDR = (value: string) => {
    const number = value.replace(/\D/g, "")
    return new Intl.NumberFormat("id-ID").format(Number(number))
  }

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSalary(formatToIDR(value))
    
    try {
      setIsSending(true)
      const salaryNum = parseInt(value.replace(/\D/g, ""))
      
      // Langsung kirim ke content script
      if (chrome?.tabs) {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
        if (tabs[0]?.id) {
          await chrome.tabs.sendMessage(tabs[0].id, {
            type: "UPDATE_SALARY",
            salary: salaryNum
          })
        }
      }
    } catch (error) {
      console.error("Error sending salary:", error)
      setError("Gagal memperbarui data")
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="popup-container">
      <h2 className="title">
        Input Gaji Bulanan
      </h2>

      {error && (
        <div style={{
          backgroundColor: "#FFEBEE",
          color: "#C62828",
          padding: "8px",
          borderRadius: "4px",
          marginBottom: "16px",
          fontSize: "14px"
        }}>
          {error}
        </div>
      )}

      <div className="form-group">
        <label
          htmlFor="salary"
          className="label">
          Salary/Month:
        </label>
        
        <div className="input-wrapper">
          <span className="currency-symbol">
            Rp
          </span>
          
          <input
            type="text"
            id="salary"
            value={salary}
            onChange={handleChange}
            placeholder="0"
            className="salary-input"
          />
        </div>
      </div>
    </div>
  )
}

export default IndexPopup
