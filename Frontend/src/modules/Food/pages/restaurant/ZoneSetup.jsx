import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import useRestaurantBackNavigation from "@food/hooks/useRestaurantBackNavigation"
import { MapPin, Search, Save, Loader2, ArrowLeft } from "lucide-react"
import { restaurantAPI, zoneAPI } from "@food/api"
import { getGoogleMapsApiKey } from "@food/utils/googleMapsApiKey"
import { loadGoogleMaps } from "@food/utils/googleMapsLoader"
const debugLog = (...args) => {}
const debugWarn = (...args) => {}
const debugError = (...args) => {}

const parseCoordinate = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const getSavedLocationCoords = (location) => {
  if (!location) return null

  let lat = null
  let lng = null

  if (Array.isArray(location.coordinates) && location.coordinates.length >= 2) {
    lng = parseCoordinate(location.coordinates[0])
    lat = parseCoordinate(location.coordinates[1])
  }

  if (lat === null || lng === null) {
    lat = parseCoordinate(location.latitude)
    lng = parseCoordinate(location.longitude)
  }

  if (lat === null || lng === null) return null

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    const swappedLat = lng
    const swappedLng = lat

    if (
      swappedLat >= -90 && swappedLat <= 90 &&
      swappedLng >= -180 && swappedLng <= 180
    ) {
      return { lat: swappedLat, lng: swappedLng }
    }

    return null
  }

  return { lat, lng }
}

export default function ZoneSetup() {
  const navigate = useNavigate()
  const goBack = useRestaurantBackNavigation()
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markerRef = useRef(null)
  const autocompleteInputRef = useRef(null)
  const autocompleteRef = useRef(null)
  const geocoderRef = useRef(null)
  
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState("")
  const [mapLoading, setMapLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [restaurantData, setRestaurantData] = useState(null)
  const [locationSearch, setLocationSearch] = useState("")
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [selectedAddress, setSelectedAddress] = useState("")
  const [zones, setZones] = useState([])
  const [currentZone, setCurrentZone] = useState(null)
  const [isInZone, setIsInZone] = useState(false)
  const [checkingZone, setCheckingZone] = useState(false)
  const polygonRefs = useRef([])

  useEffect(() => {
    fetchRestaurantData()
    fetchZones()
    loadGoogleMaps()
  }, [])

  const fetchZones = async () => {
    try {
      const response = await zoneAPI.getPublicZones()
      const list = response?.data?.data?.zones || response?.data?.zones || []
      setZones(Array.isArray(list) ? list : [])
    } catch (error) {
      debugError("Error fetching zones:", error)
    }
  }

  // Initialize Places Autocomplete when map is loaded
  useEffect(() => {
    if (!mapLoading && mapInstanceRef.current && autocompleteInputRef.current && window.google?.maps?.places && !autocompleteRef.current) {
      const autocomplete = new window.google.maps.places.Autocomplete(autocompleteInputRef.current, {
        componentRestrictions: { country: 'in' } // Restrict to India
      })
      
      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace()
        if (place.geometry && place.geometry.location && mapInstanceRef.current) {
          const location = place.geometry.location
          const lat = location.lat()
          const lng = location.lng()
          
          // Center map on selected location
          mapInstanceRef.current.setCenter(location)
          mapInstanceRef.current.setZoom(17) // Zoom in when location is selected
          
          // Set the search input value
          const address = place.formatted_address || place.name || ""
          setLocationSearch(address)
          setSelectedAddress(address)
          
          // Update marker position
          updateMarker(lat, lng, address)
          
          // Set selected location
          setSelectedLocation({ lat, lng, address })
        }
      })
      
      autocompleteRef.current = autocomplete
    }
  }, [mapLoading])

  // Load existing restaurant location when data is fetched
  useEffect(() => {
    if (restaurantData?.location && mapInstanceRef.current && !mapLoading && window.google) {
      const location = restaurantData.location
      const savedCoords = getSavedLocationCoords(location)

      if (savedCoords) {
        const { lat, lng } = savedCoords
        const locationObj = new window.google.maps.LatLng(lat, lng)
        mapInstanceRef.current.setCenter(locationObj)
        mapInstanceRef.current.setZoom(17)
        
        const existingAddress = location.formattedAddress || location.address || formatAddress(location) || ""
        const isCoordinates = /^-?\d+\.\d+,\s*-?\d+\.\d+$/.test(existingAddress.trim())
        
        if ((!existingAddress || isCoordinates) && geocoderRef.current) {
          geocoderRef.current.geocode({ location: { lat, lng } }, (results, status) => {
            if (status === "OK" && results[0]) {
              const address = results[0].formatted_address
              setLocationSearch(address)
              setSelectedAddress(address)
              setSelectedLocation({ lat, lng, address })
              updateMarker(lat, lng, address)
            } else {
              setLocationSearch(existingAddress)
              setSelectedAddress(existingAddress)
              setSelectedLocation({ lat, lng, address: existingAddress })
              updateMarker(lat, lng, existingAddress)
            }
          })
        } else {
          setLocationSearch(existingAddress)
          setSelectedAddress(existingAddress)
          setSelectedLocation({ lat, lng, address: existingAddress })
          updateMarker(lat, lng, existingAddress)
        }
      }
    }
  }, [restaurantData, mapLoading])

  const checkLocationInZone = async (lat, lng) => {
    try {
      setCheckingZone(true)
      const response = await zoneAPI.detectZone(lat, lng)
      const detected = response?.data?.data?.zone || response?.data?.zone
      
      if (detected) {
        setCurrentZone(detected)
        setIsInZone(true)
      } else {
        setCurrentZone(null)
        setIsInZone(false)
      }
    } catch (error) {
      debugError("Error detecting zone:", error)
      // Fallback: check manually if map is loaded
      if (window.google && polygonRefs.current.length > 0) {
        const point = new window.google.maps.LatLng(lat, lng)
        let found = false
        for (const poly of polygonRefs.current) {
          if (window.google.maps.geometry?.poly?.containsLocation(point, poly.polygon)) {
            setCurrentZone({ name: poly.name, _id: poly.id })
            setIsInZone(true)
            found = true
            break
          }
        }
        if (!found) {
          setCurrentZone(null)
          setIsInZone(false)
        }
      }
    } finally {
      setCheckingZone(false)
    }
  }

  // Draw zones on map whenever they change or map is ready
  useEffect(() => {
    if (!mapInstanceRef.current || !window.google || !zones.length) return

    // Clear existing polygons
    polygonRefs.current.forEach(p => p.polygon.setMap(null))
    polygonRefs.current = []

    debugLog(`?? Rendering ${zones.length} zones reactively...`)
    zones.forEach((z) => {
      if (!z.coordinates || !Array.isArray(z.coordinates) || z.coordinates.length < 3) return

      const paths = z.coordinates.map((c) => ({
        lat: Number(c.latitude),
        lng: Number(c.longitude),
      }))

      const isAssignedZone = restaurantData?.zoneId === (z._id || z.id)
      
      const polygon = new window.google.maps.Polygon({
        paths: paths,
        strokeColor: isAssignedZone ? "#22c55e" : "#ef4444",
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: isAssignedZone ? "#22c55e" : "#ef4444",
        fillOpacity: 0.15,
        map: mapInstanceRef.current,
      })

      polygon.addListener("click", (event) => {
        const lat = event.latLng.lat()
        const lng = event.latLng.lng()
        window.google.maps.event.trigger(mapInstanceRef.current, 'click', event)
      })

      polygonRefs.current.push({
        id: z._id || z.id,
        name: z.name || z.zoneName,
        polygon: polygon
      })
    })
  }, [zones, mapLoading, restaurantData?.zoneId])

  const fetchRestaurantData = async () => {
    try {
      const response = await restaurantAPI.getCurrentRestaurant()
      const data = response?.data?.data?.restaurant || response?.data?.restaurant
      if (data) {
        setRestaurantData(data)
      }
    } catch (error) {
      debugError("Error fetching restaurant data:", error)
    }
  }

  const loadGoogleMaps = async () => {
    try {
      debugLog("?? Starting Google Maps load...")
      
      // Fetch API key from database
      let apiKey = null
      try {
        apiKey = await getGoogleMapsApiKey()
        debugLog("?? API Key received:", apiKey ? `Yes (${apiKey.substring(0, 10)}...)` : "No")
        
        if (!apiKey || apiKey.trim() === "") {
          debugError("? API key is empty or not found in database")
          setMapLoading(false)
          alert("Google Maps API key not found in database. Please contact administrator to add the API key in admin panel.")
          return
        }
      } catch (apiKeyError) {
        debugError("? Error fetching API key from database:", apiKeyError)
        setMapLoading(false)
        alert("Failed to fetch Google Maps API key from database. Please check your connection or contact administrator.")
        return
      }
      
      setGoogleMapsApiKey(apiKey)
      
      // Wait for Google Maps to be loaded from main.jsx if it's loading
      let retries = 0
      const maxRetries = 100 // Wait up to 10 seconds
      
      debugLog("?? Waiting for Google Maps to load from main.jsx...")
      while (!window.google && retries < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 100))
        retries++
      }

      // Wait for mapRef to be available (retry mechanism)
      let refRetries = 0
      const maxRefRetries = 50 // Wait up to 5 seconds for ref
      while (!mapRef.current && refRetries < maxRefRetries) {
        await new Promise(resolve => setTimeout(resolve, 100))
        refRetries++
      }

      if (!mapRef.current) {
        debugError("? mapRef.current is still null after waiting")
        setMapLoading(false)
        alert("Failed to initialize map container. Please refresh the page.")
        return
      }

      // If Google Maps is already loaded, use it directly
      if (window.google && window.google.maps) {
        debugLog("? Google Maps already loaded from main.jsx, initializing map...")
        initializeMap(window.google)
        return
      }

      // If Google Maps is not loaded yet and we have an API key, use Loader as fallback
      if (apiKey) {
        debugLog("?? Google Maps not loaded from main.jsx, loading with Loader...")
        const google = await loadGoogleMaps({ libraries: ["places", "geometry"] })
        debugLog("? Google Maps loaded via Loader, initializing map...")
        initializeMap(google)
      } else {
        debugError("? No API key available")
        setMapLoading(false)
        alert("Google Maps API key not found. Please contact administrator.")
      }
    } catch (error) {
      debugError("? Error loading Google Maps:", error)
      setMapLoading(false)
      alert(`Failed to load Google Maps: ${error.message}. Please refresh the page or contact administrator.`)
    }
  }

  const initializeMap = (google) => {
    try {
      if (!mapRef.current) {
        debugError("? mapRef.current is null in initializeMap")
        setMapLoading(false)
        return
      }

      debugLog("?? Initializing map...")
      // Initial location (India center)
      const initialLocation = { lat: 20.5937, lng: 78.9629 }

      // Create map
      const map = new google.maps.Map(mapRef.current, {
        center: initialLocation,
        zoom: 5,
        mapTypeControl: true,
        mapTypeControlOptions: {
          style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
          position: google.maps.ControlPosition.TOP_RIGHT,
          mapTypeIds: [google.maps.MapTypeId.ROADMAP, google.maps.MapTypeId.SATELLITE]
        },
        zoomControl: true,
        streetViewControl: false,
        fullscreenControl: true,
        scrollwheel: true,
        gestureHandling: 'greedy',
        disableDoubleClickZoom: false,
      })

      mapInstanceRef.current = map
      geocoderRef.current = new google.maps.Geocoder()
      debugLog("? Map and Geocoder initialized successfully")

      // Add click listener to place marker
      map.addListener('click', (event) => {
        const lat = event.latLng.lat()
        const lng = event.latLng.lng()
        
        // Use Geocoder to get address
        if (geocoderRef.current) {
          geocoderRef.current.geocode({ location: { lat, lng } }, (results, status) => {
            if (status === "OK" && results[0]) {
              const address = results[0].formatted_address
              setLocationSearch(address)
              setSelectedAddress(address)
              setSelectedLocation({ lat, lng, address })
              updateMarker(lat, lng, address)
              checkLocationInZone(lat, lng)
            } else {
              // Fallback to coordinates if geocoding fails
              const address = `${lat.toFixed(6)}, ${lng.toFixed(6)}`
              setLocationSearch(address)
              setSelectedAddress(address)
              setSelectedLocation({ lat, lng, address })
              updateMarker(lat, lng, address)
              checkLocationInZone(lat, lng)
            }
          })
        } else {
          const address = `${lat.toFixed(6)}, ${lng.toFixed(6)}`
          setLocationSearch(address)
          setSelectedAddress(address)
          setSelectedLocation({ lat, lng, address })
          updateMarker(lat, lng, address)
          checkLocationInZone(lat, lng)
        }
      })

      setMapLoading(false)
      debugLog("? Map loading complete")
    } catch (error) {
      debugError("? Error in initializeMap:", error)
      setMapLoading(false)
      alert("Failed to initialize map. Please refresh the page.")
    }
  }

  const updateMarker = (lat, lng, address) => {
    if (!mapInstanceRef.current || !window.google) return

    // Remove existing marker
    if (markerRef.current) {
      markerRef.current.setMap(null)
    }

    // Create new marker
    const marker = new window.google.maps.Marker({
      position: { lat, lng },
      map: mapInstanceRef.current,
      draggable: true,
      animation: window.google.maps.Animation.DROP,
      title: address || "Restaurant Location"
    })

    // Add info window
    const infoWindow = new window.google.maps.InfoWindow({
      content: `
        <div style="padding: 8px; max-width: 250px;">
          <strong>Restaurant Location</strong><br/>
          <small>${address || `${lat.toFixed(6)}, ${lng.toFixed(6)}`}</small>
        </div>
      `
    })

    marker.addListener('click', () => {
      infoWindow.open(mapInstanceRef.current, marker)
    })

    // Update location when marker is dragged
    marker.addListener('dragend', (event) => {
      const newLat = event.latLng.lat()
      const newLng = event.latLng.lng()
      
      // Use Geocoder to get address
      if (geocoderRef.current) {
        geocoderRef.current.geocode({ location: { lat: newLat, lng: newLng } }, (results, status) => {
          if (status === "OK" && results[0]) {
            const newAddress = results[0].formatted_address
            setLocationSearch(newAddress)
            setSelectedAddress(newAddress)
            setSelectedLocation({ lat: newLat, lng: newLng, address: newAddress })
            
            // Update info window content if open
            if (infoWindow) {
              infoWindow.setContent(`
                <div style="padding: 8px; max-width: 250px;">
                  <strong>Restaurant Location</strong><br/>
                  <small>${newAddress}</small>
                </div>
              `)
            }

            checkLocationInZone(newLat, newLng)
          } else {
            const newAddress = `${newLat.toFixed(6)}, ${newLng.toFixed(6)}`
            setLocationSearch(newAddress)
            setSelectedAddress(newAddress)
            setSelectedLocation({ lat: newLat, lng: newLng, address: newAddress })
            checkLocationInZone(newLat, newLng)
          }
        })
      } else {
        const newAddress = `${newLat.toFixed(6)}, ${newLng.toFixed(6)}`
        setLocationSearch(newAddress)
        setSelectedAddress(newAddress)
        setSelectedLocation({ lat: newLat, lng: newLng, address: newAddress })
        checkLocationInZone(newLat, newLng)
      }
    })

    markerRef.current = marker
  }

  const formatAddress = (location) => {
    if (!location) return ""
    
    if (location.formattedAddress && location.formattedAddress.trim() !== "") {
      return location.formattedAddress.trim()
    }
    
    if (location.address && location.address.trim() !== "") {
      return location.address.trim()
    }
    
    const parts = []
    if (location.addressLine1) parts.push(location.addressLine1.trim())
    if (location.addressLine2) parts.push(location.addressLine2.trim())
    if (location.area) parts.push(location.area.trim())
    if (location.city) parts.push(location.city.trim())
    if (location.state) parts.push(location.state.trim())
    if (location.zipCode || location.pincode) parts.push((location.zipCode || location.pincode).trim())
    
    return parts.length > 0 ? parts.join(", ") : ""
  }

  const handleSaveLocation = async () => {
    if (!selectedLocation) {
      alert("Please select a location on the map first")
      return
    }

    if (!isInZone) {
      const confirmSave = window.confirm("The selected location is outside all active service zones. Your restaurant may not receive orders in this location. Do you still want to save?")
      if (!confirmSave) return
    }

    try {
      setSaving(true)
      
      const { lat, lng, address } = selectedLocation
      
      const payload = {
        location: {
          ...(restaurantData?.location || {}),
          latitude: lat,
          longitude: lng,
          coordinates: [lng, lat], // GeoJSON format: [longitude, latitude]
          formattedAddress: address
        }
      }

      if (currentZone && (currentZone._id || currentZone.id)) {
        payload.zoneId = currentZone._id || currentZone.id
      }

      // Update restaurant location
      const response = await restaurantAPI.updateProfile(payload)

      if (response?.data?.data?.restaurant) {
        setRestaurantData(response.data.data.restaurant)
        alert("Location saved successfully!")
        
        // Refresh the page to update navbar
        window.location.reload()
      } else {
        throw new Error("Failed to save location")
      }
    } catch (error) {
      debugError("Error saving location:", error)
      alert(error.response?.data?.message || "Failed to save location. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="restaurant-page min-h-full bg-gray-50">
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div className="flex items-center gap-3 mb-4 md:mb-0">
            {/* Back Button */}
            <button
              onClick={goBack}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
            <div className="w-10 h-10 rounded-lg bg-red-500 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Zone Setup</h1>
              <p className="text-sm text-gray-600">Set your restaurant location on the map</p>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1 relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                ref={autocompleteInputRef}
                type="text"
                value={locationSearch}
                onChange={(e) => setLocationSearch(e.target.value)}
                placeholder="Search for your restaurant location..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={handleSaveLocation}
              disabled={!selectedLocation || saving}
              className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  <span>Save Location</span>
                </>
              )}
            </button>
          </div>
          {selectedLocation && (
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-gray-700">
                <strong>Selected Location:</strong> {selectedAddress}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Coordinates: {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
              </p>
            </div>
          )}
        </div>

        {/* Zone Status Banner */}
        {selectedLocation && (
          <div className={`p-4 rounded-lg border mb-6 flex items-center justify-between ${
            isInZone ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
          }`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${isInZone ? "bg-green-100" : "bg-red-100"}`}>
                <MapPin className={`w-5 h-5 ${isInZone ? "text-green-600" : "text-red-600"}`} />
              </div>
              <div>
                <h3 className={`text-sm font-bold ${isInZone ? "text-green-900" : "text-red-900"}`}>
                  {checkingZone ? "Checking service zone..." : isInZone ? `Operating in ${currentZone?.name || "Service Zone"}` : "Outside Service Area"}
                </h3>
                <p className={`text-xs ${isInZone ? "text-green-700" : "text-red-700"}`}>
                  {isInZone 
                    ? "Your selected location is within a serviced area. You can proceed with this setup."
                    : "Orders cannot be placed from this location as it's outside all active zones."}
                </p>
              </div>
            </div>
            {checkingZone && <Loader2 className="w-5 h-5 animate-spin text-gray-400" />}
          </div>
        )}

        {/* Map Container */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden relative">
          {/* Always render the map div, show loading overlay on top */}
          <div ref={mapRef} className="w-full h-[600px]" style={{ minHeight: '600px' }} />
          {mapLoading && (
            <div className="absolute inset-0 bg-white flex items-center justify-center z-10">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-red-600 mx-auto mb-2" />
                <p className="text-gray-600">Loading map...</p>
                <p className="text-xs text-gray-400 mt-2">If this takes too long, please refresh the page</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

