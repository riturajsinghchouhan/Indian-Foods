import React, { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { setLocation } from '@/app/slices/locationSlice'
import { useLocation } from '@food/hooks/useLocation'
import { useZone } from '@food/hooks/useZone'


export default function LocationGuard({ children }) {
  const dispatch = useDispatch()
  const { isLocationResolved } = useSelector((state) => state.location)
  
  // We only use the hooks here ONCE globally.
  const { location: coords, loading: locationLoading } = useLocation()
  const { zoneId, zoneStatus } = useZone(coords)

  useEffect(() => {
    // Unblock the app once location is fetched (or fallback is provided) 
    // AND zone status is determined (not 'loading').
    if (coords && !locationLoading && zoneStatus !== 'loading') {
      dispatch(setLocation({
        coords,
        zoneId: zoneId || null,
        address: coords?.address || coords?.formattedAddress || ''
      }))
    }
  }, [coords, zoneId, zoneStatus, locationLoading, dispatch])



  return children
}
