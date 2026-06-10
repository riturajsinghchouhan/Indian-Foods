import React, { useEffect, useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Link, useNavigate } from "react-router-dom"
import { Phone, ArrowRight, ShieldCheck, Loader2, Utensils, Star, Heart, ShieldQuestion, ChefHat, Smartphone, MapPin, Gauge, Pizza, Leaf, Info, User } from "lucide-react"
import { toast } from "sonner"
import { authAPI, userAPI } from "@food/api"
import { setAuthData } from "@food/utils/auth"
import logoNew from "@/assets/logo.png"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@food/components/ui/dialog"
import { Button } from "@food/components/ui/button"
import { Input } from "@food/components/ui/input"
import { Label } from "@food/components/ui/label"

export default function UnifiedOTPFastLogin() {
  const RESEND_COOLDOWN_SECONDS = 60
  const [phoneNumber, setPhoneNumber] = useState(() => sessionStorage.getItem("draft_phone_login") || "")
  const [otp, setOtp] = useState("")
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [resendTimer, setResendTimer] = useState(0)
  const [showNameModal, setShowNameModal] = useState(false)
  const [newName, setNewName] = useState("")
  const [isUpdatingName, setIsUpdatingName] = useState(false)
  const [tempAuth, setTempAuth] = useState(null)
  const [pendingVerify, setPendingVerify] = useState(null)
  const navigate = useNavigate()
  const submitting = useRef(false)

  const normalizedPhone = () => {
    const digits = String(phoneNumber).replace(/\D/g, "").slice(-15)
    return digits.length >= 8 ? digits : ""
  }

  const handleSendOTP = async (e) => {
    e.preventDefault()
    const phone = normalizedPhone()
    if (phone.length < 10) {
      toast.error("Please enter a valid 10-digit phone number")
      return
    }
    if (submitting.current) return
    submitting.current = true
    setLoading(true)
    try {
      await authAPI.sendOTP(phoneNumber, "login", null)
      setOtp("")
      setStep(2)
      setResendTimer(RESEND_COOLDOWN_SECONDS)
      toast.success("OTP sent successfully!")
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Failed to send OTP."
      toast.error(msg)
    } finally {
      setLoading(false)
      submitting.current = false
    }
  }

  const handleResendOTP = async () => {
    const phone = normalizedPhone()
    if (phone.length < 10) {
      toast.error("Please enter a valid phone number")
      return
    }
    if (resendTimer > 0 || submitting.current) return
    submitting.current = true
    setLoading(true)
    try {
      await authAPI.sendOTP(phoneNumber, "login", null)
      setOtp("")
      setResendTimer(RESEND_COOLDOWN_SECONDS)
      toast.success("OTP resent successfully.")
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Failed to resend OTP."
      toast.error(msg)
    } finally {
      setLoading(false)
      submitting.current = false
    }
  }

  const handleEditNumber = () => {
    setStep(1)
    setOtp("")
    setResendTimer(0)
    setPendingVerify(null)
    setShowNameModal(false)
    setNewName("")
  }

  const handleVerifyOTP = async (e) => {
    e.preventDefault()
    const otpDigits = String(otp).replace(/\D/g, "").slice(0, 6)
    if (otpDigits.length !== 6) {
      toast.error("Please enter the 6-digit OTP")
      return
    }
    if (submitting.current) return
    submitting.current = true
    setLoading(true)
    let fcmToken = null
    let platform = "web"
    try {
      try {
        if (typeof window !== "undefined") {
          if (window.flutter_inappwebview) {
            platform = "mobile";
            const handlerNames = ["getFcmToken", "getFCMToken", "getPushToken", "getFirebaseToken"];
            for (const handlerName of handlerNames) {
              try {
                const t = await window.flutter_inappwebview.callHandler(handlerName, { module: "user" });
                if (t && typeof t === "string" && t.length > 20) {
                  fcmToken = t.trim();
                  break;
                }
              } catch (e) { }
            }
          } else {
            fcmToken = localStorage.getItem("fcm_web_registered_token_user") || null;
          }
        }
      } catch (e) {
        console.warn("Failed to get FCM token during login", e);
      }

      const response = await authAPI.verifyOTP(phoneNumber, otpDigits, "login", null, null, "user", null, null, fcmToken, platform)
      const data = response?.data?.data || response?.data || {}
      const accessToken = data.accessToken
      const refreshToken = data.refreshToken || null
      const user = data.user

      setAuthData("user", accessToken, user, refreshToken)

      // If user has no name, show name modal instead of immediate navigation
      if (!user.name || user.name.trim() === "") {
        setTempAuth({ accessToken, user, refreshToken })
        setShowNameModal(true)
      } else {
        toast.success("Welcome back!")
        navigate("/food/user", { replace: true })
      }
    } catch (err) {
      const status = err?.response?.status
      let msg = err?.response?.data?.message || err?.response?.data?.error || err?.message || "Invalid OTP. Please try again."
      const nameRequired = /name\s+is\s+required.*first[- ]?time|first[- ]?time.*name\s+is\s+required|first[- ]?time\s*sign\s*up/i.test(String(msg))
      if (nameRequired) {
        setPendingVerify({ phone: phoneNumber, otp: otpDigits, fcmToken, platform })
        setShowNameModal(true)
        return
      }
      if (status === 401) {
        if (/deactivat(ed|e)/i.test(String(msg))) {
          msg = "Your account is deactivated. Please contact support."
        } else {
          msg = "Invalid or expired code, or account not active."
        }
      }
      toast.error(msg)
    } finally {
      setLoading(false)
      submitting.current = false
    }
  }

  const handleNameSubmit = async (e) => {
    e.preventDefault()
    if (!newName.trim()) {
      toast.error("Please enter your name")
      return
    }

    try {
      setIsUpdatingName(true)
      if (pendingVerify) {
        const response = await authAPI.verifyOTP(
          pendingVerify.phone,
          pendingVerify.otp,
          "login",
          newName.trim(),
          null,
          "user",
          null,
          null,
          pendingVerify.fcmToken,
          pendingVerify.platform,
        )
        const data = response?.data?.data || response?.data || {}
        const accessToken = data.accessToken
        const refreshToken = data.refreshToken || null
        const user = data.user

        setAuthData("user", accessToken, user, refreshToken)
        setPendingVerify(null)
        toast.success(`Welcome, ${newName.trim()}!`)
        setShowNameModal(false)
        navigate("/food/user", { replace: true })
        return
      }

      // Call update profile API
      await userAPI.updateProfile({ name: newName.trim() })

      // Update local storage and auth data with the new name
      const updatedUser = { ...tempAuth.user, name: newName.trim() }
      setAuthData("user", tempAuth.accessToken, updatedUser, tempAuth.refreshToken)

      toast.success(`Welcome, ${newName.trim()}!`)
      setShowNameModal(false)
      navigate("/food/user", { replace: true })
    } catch (err) {
      toast.error("Failed to update name. You can skip this for now or try again.")
      console.error(err)
    } finally {
      setIsUpdatingName(false)
    }
  }

  useEffect(() => {
    if (step !== 2 || resendTimer <= 0) return
    const intervalId = setInterval(() => {
      setResendTimer((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(intervalId)
  }, [step, resendTimer])

  const formatResendTimer = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
  }

  const primaryColor = "#E53935"

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
    <div className="min-h-screen bg-[#FFFBF5] dark:bg-[#121212] flex flex-col relative overflow-hidden font-['Poppins']">
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

      {/* Main Content */}
      <div className="absolute top-4 right-4 z-20">
        <Link to="/user/auth/support" className="bg-white/80 dark:bg-[#1a1a1a]/80 backdrop-blur-md px-3.5 py-1.5 rounded-full shadow-sm text-gray-700 dark:text-gray-300 hover:text-[#E53935] border border-gray-200/60 dark:border-gray-700/60 transition-all flex items-center gap-1.5 font-bold text-[11px] uppercase tracking-wider">
          <Info className="w-4 h-4 text-[#E53935]" />
          <span>Support</span>
        </Link>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="w-full max-w-md lg:max-w-lg flex flex-col items-center"
        >
          {/* Central Logo */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, type: "spring", bounce: 0.4 }}
            className="w-32 h-32 md:w-40 md:h-40 rounded-full shadow-[0_15px_35px_rgba(229,57,53,0.35)] border-4 border-white dark:border-gray-800 mb-8 overflow-hidden bg-white"
          >
            <img src={logoNew} alt="Indian Bite Logo" className="w-full h-full object-cover" />
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-center w-full mb-10"
          >
            <h1 className="text-[2rem] sm:text-4xl font-bold text-[#4E342E] dark:text-white leading-[1.2] mb-3 drop-shadow-sm">
              {step === 1 ? (
                <>Delicious food<br />Delivered fast <span className="inline-block hover:scale-110 transition-transform cursor-pointer">🍕</span></>
              ) : (
                "Verify OTP"
              )}
            </h1>
            <p className="text-[#8D6E63] dark:text-gray-400 font-medium text-[15px]">
              {step === 1
                ? "Login with your mobile number"
                : `We've sent a code to +91 ${phoneNumber}`}
            </p>
          </motion.div>

          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.form
                key="step-1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={handleSendOTP}
                className="w-full space-y-6"
              >
                <div className="relative flex items-center bg-white/80 dark:bg-[#1a1a1a]/80 backdrop-blur-md rounded-full p-2 pl-4 pr-2 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-white/60 dark:border-gray-700 transition-all hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
                  {/* Country Code & Icon */}
                  <div className="flex items-center gap-2 pr-3 border-r border-gray-200 dark:border-gray-700">
                    <span className="text-xl leading-none">🇮🇳</span>
                    <span className="font-semibold text-gray-800 dark:text-gray-200">+91</span>
                  </div>

                  {/* Phone Input */}
                  <div className="flex-1 flex items-center pl-3">
                    <Smartphone className="w-5 h-5 text-gray-400 mr-2 shrink-0" />
                    <input
                      type="tel"
                      required
                      autoFocus
                      value={phoneNumber}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                        setPhoneNumber(val);
                        sessionStorage.setItem("draft_phone_login", val);
                      }}
                      maxLength={10}
                      className="w-full bg-transparent border-0 outline-none focus:border-transparent focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 text-gray-800 dark:text-white font-semibold text-base placeholder:text-gray-400 placeholder:font-medium"
                      style={{ boxShadow: "none", border: "none", outline: "none" }}
                      placeholder="Enter your 10-digit number"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || phoneNumber.length < 10}
                  className="w-full h-[56px] rounded-full bg-gradient-to-r from-[#FF5252] to-[#E53935] text-white font-bold text-lg shadow-[0_10px_25px_rgba(229,57,53,0.4)] hover:shadow-[0_15px_35px_rgba(229,57,53,0.5)] hover:-translate-y-0.5 transition-all active:scale-[0.98] flex items-center justify-center disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-[0_10px_25px_rgba(229,57,53,0.4)]"
                >
                  {loading ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    "Send OTP"
                  )}
                </button>
              </motion.form>
            ) : (
              <motion.form
                key="step-2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleVerifyOTP}
                className="space-y-6"
              >
                <div className="flex justify-between gap-3">
                  {[0, 1, 2, 3, 4, 5].map((index) => (
                    <input
                      key={index}
                      id={`otp-${index}`}
                      type="tel"
                      inputMode="numeric"
                      required
                      autoFocus={index === 0}
                      value={otp[index] || ""}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "").slice(-1);
                        if (!val) return;
                        const newOtp = otp.split("");
                        newOtp[index] = val;
                        const combined = newOtp.join("").slice(0, 6);
                        setOtp(combined);
                        if (index < 5 && val) {
                          document.getElementById(`otp-${index + 1}`)?.focus();
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Backspace") {
                          if (!otp[index] && index > 0) {
                            document.getElementById(`otp-${index - 1}`)?.focus();
                          } else {
                            const newOtp = otp.split("");
                            newOtp[index] = "";
                            setOtp(newOtp.join(""));
                          }
                        }
                      }}
                      className="w-full h-16 text-center text-3xl font-bold bg-gray-50 dark:bg-gray-900 border-2 border-transparent focus:border-primary/50 rounded-2xl outline-none transition-all text-red-600 dark:text-red-500 shadow-sm"
                      placeholder="•"
                    />
                  ))}
                </div>

                <div className="flex flex-col items-center gap-4">
                  <div className="flex items-center gap-2 text-xs font-semibold">
                    {resendTimer > 0 ? (
                      <span className="text-gray-400">Resend code in <span className="text-primary">{formatResendTimer(resendTimer)}</span></span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResendOTP}
                        className="text-primary hover:underline"
                      >
                        Didn't receive code? Resend
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleEditNumber}
                    className="text-xs font-bold text-red-600 hover:text-red-700 transition-colors"
                  >
                    Edit phone number
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading || otp.length < 6}
                  className="w-full h-[56px] mt-4 rounded-full bg-gradient-to-r from-[#FF5252] to-[#E53935] text-white font-bold text-lg shadow-[0_10px_25px_rgba(229,57,53,0.4)] hover:shadow-[0_15px_35px_rgba(229,57,53,0.5)] hover:-translate-y-0.5 transition-all active:scale-[0.98] flex items-center justify-center disabled:opacity-70 disabled:hover:translate-y-0"
                >
                  {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : "Verify & Continue"}
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Footer Info */}
          <div className="mt-8 text-center">
            <p className="text-[13px] text-[#A1887F] dark:text-gray-500 font-medium">
              By continuing, you agree to our <Link to="/profile/terms" className="text-[#6D4C41] dark:text-gray-400 underline decoration-gray-300 underline-offset-2 hover:text-[#3E2723] dark:hover:text-white transition-colors">Terms</Link> & <Link to="/profile/privacy" className="text-[#6D4C41] dark:text-gray-400 underline decoration-gray-300 underline-offset-2 hover:text-[#3E2723] dark:hover:text-white transition-colors">Privacy Policy</Link>
            </p>
          </div>
        </motion.div>
      </div>

      {/* Name Collection Modal */}
      <Dialog open={showNameModal} onOpenChange={setShowNameModal}>
        <DialogContent
          className="sm:max-w-[425px] rounded-3xl border-none p-0 overflow-hidden bg-white dark:bg-[#1a1a1a]"
          showCloseButton={false}
        >
          <div className="bg-primary p-8 text-center relative">
            <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-white/10 rounded-full blur-2xl" />
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mx-auto mb-4 border border-white/30"
            >
              <User className="w-10 h-10 text-white" />
            </motion.div>
            <DialogTitle className="text-2xl font-bold text-white mb-2">Almost there!</DialogTitle>
            <DialogDescription className="text-white/80">
              We'd love to know your name to personalize your experience.
            </DialogDescription>
          </div>

          <form onSubmit={handleNameSubmit} className="p-8 pt-6 space-y-6">
            <div className="space-y-4">
              <Label htmlFor="name" className="text-sm font-medium text-gray-700 dark:text-gray-300 ml-1">
                Full Name
              </Label>
              <div className="relative group">
                <Input
                  id="name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Enter your name"
                  className="pl-4 h-14 bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-primary transition-all group-hover:border-primary/30"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Button
                type="submit"
                disabled={isUpdatingName}
                className="w-full h-14 bg-primary hover:bg-[#6b2f57] text-white rounded-2xl font-bold text-lg shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                {isUpdatingName ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  "Complete Profile"
                )}
              </Button>
              {!pendingVerify ? (
                <button
                  type="button"
                  onClick={() => {
                    setShowNameModal(false)
                    navigate("/food/user", { replace: true })
                  }}
                  className="text-sm text-gray-400 hover:text-gray-600 transition-colors py-2"
                >
                  Skip for now
                </button>
              ) : (
                <p className="text-xs text-gray-400 text-center">Name is required to complete signup.</p>
              )}
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
