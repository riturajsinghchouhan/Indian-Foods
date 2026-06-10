import { useState, useEffect, useRef } from "react"
import { useNavigate, Link, useSearchParams } from "react-router-dom"
import { AlertCircle, Loader2, ChefHat, Smartphone, MapPin, Gauge, Pizza, Leaf, Info } from "lucide-react"
import AnimatedPage from "@food/components/user/AnimatedPage"
import { authAPI } from "@food/api"
import { motion } from "framer-motion"

const debugLog = (...args) => {}
const debugWarn = (...args) => {}
const debugError = (...args) => {}

export default function SignIn() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [formData, setFormData] = useState({
    phone: "",
    countryCode: "+91",
  })

  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const submittingRef = useRef(false)

  useEffect(() => {
    const draft = sessionStorage.getItem("user_draft_phone")
    if (draft) {
      setFormData(prev => ({ ...prev, phone: draft }))
    }

    const stored = sessionStorage.getItem("userAuthData")
    if (!stored) return

    try {
      const data = JSON.parse(stored)
      const fullPhone = String(data.phone || "").trim()
      const phoneDigits = fullPhone.replace(/^\+91\s*/, "").replace(/\D/g, "").slice(0, 10)

      setFormData((prev) => ({
        ...prev,
        phone: phoneDigits || prev.phone,
      }))
    } catch (err) {
      debugError("Error parsing stored auth data:", err)
    }
  }, [])

  const validatePhone = (phone) => {
    if (!phone.trim()) return "Phone number is required"
    const cleanPhone = phone.replace(/\D/g, "")
    if (!/^\d{10}$/.test(cleanPhone)) return "Please enter a valid 10-digit number"
    return ""
  }

  const handleChange = (e) => {
    let { value } = e.target
    value = value.replace(/\D/g, "").slice(0, 10)
    setError(validatePhone(value))
    setFormData((prev) => ({ ...prev, phone: value }))
    sessionStorage.setItem("user_draft_phone", value)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const phoneError = validatePhone(formData.phone)
    setError(phoneError)
    if (phoneError) return
    if (submittingRef.current) return
    submittingRef.current = true
    setIsLoading(true)
    setError("")

    try {
      const countryCode = formData.countryCode?.trim() || "+91"
      const phoneDigits = String(formData.phone ?? "").replace(/\D/g, "").slice(0, 10)
      if (phoneDigits.length !== 10) {
        setError("Please enter a valid 10-digit number")
        setIsLoading(false)
        submittingRef.current = false
        return
      }
      const fullPhone = `${countryCode} ${phoneDigits}`
      await authAPI.sendOTP(fullPhone, "login", null)

      const ref = String(searchParams.get("ref") || "").trim()
      const authData = {
        method: "phone",
        phone: fullPhone,
        email: null,
        name: null,
        referralCode: ref || null,
        isSignUp: false,
        module: "user",
      }

      sessionStorage.setItem("userAuthData", JSON.stringify(authData))
      navigate("/food/user/auth/otp")
    } catch (apiError) {
      const message =
        apiError?.response?.data?.message ||
        apiError?.response?.data?.error ||
        "Failed to send OTP. Please try again."
      setError(message)
    } finally {
      setIsLoading(false)
      submittingRef.current = false
    }
  }

  // Floating animation variants
  const floatingAnimation = (delay, duration = 4, yOffset = 15) => ({
    y: [-yOffset, yOffset],
    transition: {
      duration,
      repeat: Infinity,
      repeatType: "reverse",
      ease: "easeInOut",
      delay,
    },
  })

  return (
    <AnimatedPage className="min-h-screen bg-[#FFFBF5] dark:bg-[#121212] flex items-center justify-center relative overflow-hidden">
      {/* Decorative Background Elements */}
      <motion.div animate={floatingAnimation(0, 5, 20)} className="absolute top-16 right-8 md:right-32 text-orange-400 opacity-60 drop-shadow-md">
        <Gauge className="w-12 h-12" />
      </motion.div>
      <motion.div animate={floatingAnimation(1, 4.5, 15)} className="absolute top-32 left-8 md:left-24 text-green-500 opacity-50 drop-shadow-md">
        <Leaf className="w-10 h-10" />
      </motion.div>
      <motion.div animate={floatingAnimation(2, 6, 25)} className="absolute bottom-40 right-10 md:right-40 text-red-400 opacity-70 drop-shadow-md">
        <MapPin className="w-14 h-14" />
      </motion.div>
      <motion.div animate={floatingAnimation(1.5, 5.5, 20)} className="absolute top-1/2 left-4 md:left-20 text-yellow-500 opacity-60 drop-shadow-md">
        <Pizza className="w-12 h-12" />
      </motion.div>

      {/* Support Icon */}
      <Link to="/user/auth/support" className="absolute top-4 right-4 z-20 bg-white/80 dark:bg-[#1a1a1a]/80 backdrop-blur-md px-3.5 py-1.5 rounded-full shadow-sm text-gray-700 dark:text-gray-300 hover:text-[#E53935] border border-gray-200/60 dark:border-gray-700/60 transition-all flex items-center gap-1.5 font-bold text-[11px] uppercase tracking-wider">
        <Info className="w-4 h-4 text-[#E53935]" />
        <span>Support</span>
      </Link>

      <div className="w-full max-w-md px-6 py-8 relative z-10 flex flex-col items-center">
        {/* Central Logo */}
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, type: "spring", bounce: 0.4 }}
          className="w-32 h-32 rounded-full bg-gradient-to-br from-[#E53935] to-[#D32F2F] flex flex-col items-center justify-center shadow-[0_15px_35px_rgba(229,57,53,0.35)] border-4 border-white dark:border-gray-800 mb-8"
        >
          <ChefHat className="w-12 h-12 text-white mb-1" />
          <span className="text-white font-black tracking-wider text-sm">INDIAN BITE</span>
        </motion.div>

        {/* Headings */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-center w-full mb-10"
        >
          <h1 className="text-[2rem] sm:text-4xl font-bold text-[#4E342E] dark:text-white leading-[1.2] mb-3 drop-shadow-sm">
            Delicious food<br />delivered fast <span className="inline-block hover:scale-110 transition-transform cursor-pointer">🍕</span>
          </h1>
          <p className="text-[#8D6E63] dark:text-gray-400 font-medium text-[15px]">
            Login with your mobile number
          </p>
        </motion.div>

        {/* Form */}
        <motion.form 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          id="user-signin-form" 
          onSubmit={handleSubmit} 
          className="w-full space-y-6"
        >
          <div className="space-y-2 relative">
            <div className={`relative flex items-center bg-white/80 dark:bg-[#1a1a1a]/80 backdrop-blur-md rounded-full p-2 pl-4 pr-2 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border ${error ? 'border-red-400' : 'border-white/60 dark:border-gray-700'} transition-all hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)]`}>
              {/* Country Code & Icon */}
              <div className="flex items-center gap-2 pr-3 border-r border-gray-200 dark:border-gray-700">
                <span className="text-xl leading-none">🇮🇳</span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">+91</span>
              </div>
              
              {/* Phone Input */}
              <div className="flex-1 flex items-center pl-3">
                <Smartphone className="w-5 h-5 text-gray-400 mr-2 shrink-0" />
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={10}
                  placeholder="Enter your 10-digit number"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full bg-transparent border-0 outline-none focus:border-transparent focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 text-gray-800 dark:text-white font-semibold text-base placeholder:text-gray-400 placeholder:font-medium"
                  style={{ boxShadow: "none", border: "none", outline: "none" }}
                  autoComplete="tel-national"
                />
              </div>
            </div>

            {error && (
              <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-center gap-1.5 text-sm text-red-500 font-medium absolute -bottom-6 w-full text-center">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </motion.div>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-[56px] mt-4 rounded-full bg-gradient-to-r from-[#FF5252] to-[#E53935] text-white font-bold text-lg shadow-[0_10px_25px_rgba(229,57,53,0.4)] hover:shadow-[0_15px_35px_rgba(229,57,53,0.5)] hover:-translate-y-0.5 transition-all active:scale-[0.98] flex items-center justify-center disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-[0_10px_25px_rgba(229,57,53,0.4)]"
          >
            {isLoading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              "Send OTP"
            )}
          </button>
        </motion.form>



        {/* Footer */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-8 text-center"
        >
          <p className="text-[13px] text-[#A1887F] dark:text-gray-500 font-medium">
            By continuing, you agree to our <Link to="/profile/terms" className="text-[#6D4C41] dark:text-gray-400 underline decoration-gray-300 underline-offset-2 hover:text-[#3E2723] dark:hover:text-white transition-colors">Terms</Link> & <Link to="/profile/privacy" className="text-[#6D4C41] dark:text-gray-400 underline decoration-gray-300 underline-offset-2 hover:text-[#3E2723] dark:hover:text-white transition-colors">Privacy Policy</Link>
          </p>
        </motion.div>
      </div>
    </AnimatedPage>
  )
}

