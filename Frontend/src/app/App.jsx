import React, { useState, useEffect } from 'react'
import AppRoutes from './routes'
import SplashScreen from '@/shared/components/SplashScreen.jsx'
import PageLoader from '@/shared/components/PageLoader.jsx'

function App() {
  const [showSplash, setShowSplash] = useState(true)

  const [isLoading, setIsLoading] = useState(false)

  const handleSplashFinish = () => {
    setShowSplash(false)
  }

  // Normal Loading Spinner (if needed in future)
  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-white dark:bg-[#0a0a0a]">
        <div className="relative w-16 h-16 flex items-center justify-center">
          <div className="absolute inset-0 border-4 border-primary/10 rounded-full" />
          <div className="absolute inset-0 border-4 border-t-primary rounded-full animate-spin" />
        </div>
        <h1 className="text-2xl font-black text-primary italic uppercase tracking-tighter mt-6">INDIAN BITES</h1>
      </div>
    )
  }

  return (
    <>
      {showSplash && <SplashScreen onFinish={handleSplashFinish} />}
      <PageLoader />
      <AppRoutes />
    </>
  )
}

export default App
