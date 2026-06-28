import React, { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { setLocation } from '@/app/slices/locationSlice'
import { useLocationContext } from '@food/context/locationContext'

export default function LocationGuard({ children }) {
  const dispatch = useDispatch()
  const ctx = useLocationContext()

  useEffect(() => {
    if (!ctx) return
    const { location, zoneId, zoneStatus, loading } = ctx
    if (location && !loading && zoneStatus !== 'loading') {
      dispatch(setLocation({
        coords: location,
        zoneId: zoneId || null,
        address: location?.address || location?.formattedAddress || ''
      }))
    }
  }, [ctx?.location, ctx?.zoneId, ctx?.zoneStatus, ctx?.loading, dispatch, ctx])

  return children
}
