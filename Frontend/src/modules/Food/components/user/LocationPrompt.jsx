import { useEffect, useState, useRef } from "react"
import { useLocation as useRouterLocation, useNavigate } from "react-router-dom"
import { MapPin, X, Search, Navigation, ArrowLeft, Loader2 } from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent } from "@food/components/ui/card"
import { Button } from "@food/components/ui/button"
import { Input } from "@food/components/ui/input"
import { useLocation } from "@food/hooks/useLocation"
import { toast } from "sonner"

export default function LocationPrompt() {
  const routerLocation = useRouterLocation()
  const navigate = useNavigate()
  const { location, loading, permissionGranted, requestLocation } = useLocation()
  
  // Hide location prompt on legal pages (Privacy, Terms, etc.)
  const isLegalPage = 
    routerLocation.pathname.includes("/privacy") || 
    routerLocation.pathname.includes("/terms") ||
    routerLocation.pathname.includes("/refund") ||
    routerLocation.pathname.includes("/shipping") ||
    routerLocation.pathname.includes("/cancellation")

  const [showPrompt, setShowPrompt] = useState(false)
  const [view, setView] = useState("prompt") // "prompt" | "manual"
  const [searchValue, setSearchValue] = useState("")
  const [suggestions, setSuggestions] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState(null)

  useEffect(() => {
    // Check if location permission was already granted
    const storedLocation = localStorage.getItem("userLocation")
    const promptDismissed = localStorage.getItem("locationPromptDismissed")

    if (!storedLocation && !promptDismissed && !isLegalPage) {
      const attemptAutoLocation = async () => {
        try {
          const loc = await requestLocation(true, true)
          if (loc?.latitude) {
            localStorage.setItem("locationPromptDismissed", "true")
          } else {
            if (!permissionGranted) setShowPrompt(true)
          }
        } catch (e) {
          if (!permissionGranted) setShowPrompt(true)
        }
      }

      const timer = setTimeout(() => {
        const currentLocation = localStorage.getItem("userLocation")
        if (!currentLocation && !permissionGranted) {
          attemptAutoLocation()
        }
      }, 500)

      return () => {
        clearTimeout(timer)
        document.body.style.overflow = ""
      }
    }
  }, [permissionGranted, isLegalPage, requestLocation])

  // Search logic for manual entry
  useEffect(() => {
    if (view !== "manual" || searchValue.length < 3) {
      setSuggestions([])
      return
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearching(true)
        const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(searchValue)}`
        const res = await fetch(url, { headers: { Accept: "application/json" } })
        const json = await res.json()
        setSuggestions((json || []).map(r => ({
          id: r.place_id,
          display: r.display_name,
          lat: Number(r.lat),
          lng: Number(r.lon),
          address: r.address || {}
        })))
      } catch (e) {
        setSuggestions([])
      } finally {
        setIsSearching(false)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [searchValue, view])

  const handleAllow = async () => {
    await requestLocation()
    setTimeout(() => {
      setShowPrompt(false)
      document.body.style.overflow = ""
      localStorage.setItem("locationPromptDismissed", "true")
    }, 500)
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    document.body.style.overflow = ""
    localStorage.setItem("locationPromptDismissed", "true")
  }

  const handleManualEntry = () => {
    setView("manual")
  }

  const handleBackToPrompt = () => {
    setView("prompt")
    setSearchValue("")
    setSuggestions([])
    setSelectedLocation(null)
  }

  const handleDetectLocation = async () => {
    try {
      const loc = await requestLocation(true, true)
      if (loc?.latitude) {
        toast.success("Location detected!")
        setShowPrompt(false)
        document.body.style.overflow = ""
        localStorage.setItem("locationPromptDismissed", "true")
        // No need to navigate, useLocation hook already updates state
      }
    } catch (e) {
      toast.error("Failed to detect location")
    }
  }

  const handleSaveManualLocation = () => {
    if (!selectedLocation) {
      toast.error("Please select a location from the suggestions")
      return
    }

    const locData = {
      latitude: selectedLocation.lat,
      longitude: selectedLocation.lng,
      address: selectedLocation.display,
      formattedAddress: selectedLocation.display,
      city: selectedLocation.address.city || selectedLocation.address.town || selectedLocation.address.village || "",
      area: selectedLocation.address.suburb || selectedLocation.address.neighbourhood || ""
    }

    localStorage.setItem("userLocation", JSON.stringify(locData))
    localStorage.setItem("locationPromptDismissed", "true")
    setShowPrompt(false)
    document.body.style.overflow = ""
    window.location.reload() // Reload to apply new location globally
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.body.style.overflow = ""
    }
  }, [])

  if (isLegalPage || !showPrompt) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <Card
        className="w-full max-w-sm border-none shadow-2xl mx-auto my-auto overflow-hidden rounded-[2rem] bg-white"
      >
        {view === "prompt" ? (
          <div className="p-10 flex flex-col items-center text-center">
            {/* Circular Icon */}
            <div className="h-24 w-24 rounded-full bg-[#f8f0f1] flex items-center justify-center mb-8">
              <div className="h-14 w-14 rounded-full bg-white shadow-sm flex items-center justify-center">
                <MapPin className="h-8 w-8 text-[#a03a42]" strokeWidth={2.5} />
              </div>
            </div>

            {/* Content */}
            <h2 className="text-2xl font-bold text-[#1a1c2e] mb-4">Location Access Required</h2>
            <p className="text-[#6b7280] text-base leading-relaxed mb-10 px-2">
              We need your location to show you products available near you and enable delivery services. Location access is required to continue.
            </p>

            {/* Actions */}
            <div className="w-full flex flex-col gap-4">
              <Button
                onClick={handleAllow}
                className="w-full h-16 bg-[#a03a42] hover:bg-[#8a3239] text-white text-lg font-bold rounded-2xl shadow-lg transition-all active:scale-[0.98]"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  "Allow Location Access"
                )}
              </Button>
              <Button
                onClick={handleManualEntry}
                variant="ghost"
                className="w-full h-16 bg-[#f3f4f6] hover:bg-[#e5e7eb] text-[#374151] text-lg font-bold rounded-2xl transition-all active:scale-[0.98]"
              >
                Enter Location Manually
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col bg-white">
            {/* Header with Icon */}
            <div className="p-8 text-center border-b border-gray-50">
               <div className="h-20 w-20 rounded-full bg-[#f8f0f1] flex items-center justify-center mx-auto mb-4">
                  <MapPin className="h-8 w-8 text-[#a03a42]" />
               </div>
               <h2 className="text-2xl font-bold text-[#1a1c2e] mb-2">Manual Location</h2>
               <p className="text-sm text-[#6b7280]">
                  Search and select your delivery address
               </p>
            </div>

            <div className="p-8 space-y-6">
              {/* Search Section */}
              <div className="space-y-2">
                <div className="relative">
                   <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                   <Input 
                      placeholder="Type your address..."
                      value={searchValue}
                      onChange={(e) => setSearchValue(e.target.value)}
                      className="pl-12 h-14 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#a03a42]/20"
                   />
                   {isSearching && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2">
                         <Loader2 className="h-5 w-5 text-[#a03a42] animate-spin" />
                      </div>
                   )}
                </div>

                {/* Suggestions List */}
                {suggestions.length > 0 && (
                   <div className="mt-2 border border-gray-100 rounded-2xl overflow-hidden shadow-xl bg-white max-h-60 overflow-y-auto">
                      {suggestions.map(s => (
                         <button
                            key={s.id}
                            onClick={() => {
                               setSelectedLocation(s)
                               setSearchValue(s.display)
                               setSuggestions([])
                            }}
                            className="w-full p-4 text-left text-sm hover:bg-gray-50 border-b border-gray-50 last:border-none transition-colors"
                         >
                            {s.display}
                         </button>
                      ))}
                   </div>
                )}
              </div>

              {/* Separator */}
              <div className="flex items-center gap-4 py-2">
                 <div className="h-[1px] flex-1 bg-gray-100" />
                 <span className="text-xs font-bold text-gray-300 uppercase tracking-widest">OR</span>
                 <div className="h-[1px] flex-1 bg-gray-100" />
              </div>

              {/* Detect My Location */}
              <Button
                 onClick={handleDetectLocation}
                 variant="outline"
                 className="w-full h-14 rounded-2xl flex items-center justify-center gap-3 border-emerald-100 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-200 font-bold transition-all active:scale-[0.98]"
              >
                 <Navigation className="h-5 w-5" />
                 Detect My Location
              </Button>

              {/* Footer Actions */}
              <div className="flex gap-3 pt-4">
                 <Button
                    onClick={handleBackToPrompt}
                    variant="outline"
                    className="flex-1 h-14 rounded-2xl bg-gray-50 border-none hover:bg-gray-100 text-gray-600 font-bold"
                 >
                    Back
                 </Button>
                 <Button
                    onClick={handleSaveManualLocation}
                    className="flex-1 h-14 rounded-2xl bg-[#a03a42] hover:bg-[#8a3239] text-white font-bold shadow-md"
                    disabled={!selectedLocation}
                 >
                    Confirm
                 </Button>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}

