import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'

export default function PageLoader() {
  const [isNavigating, setIsNavigating] = useState(false)
  const location = useLocation()
  
  useEffect(() => {
    // Show animation on route change
    setIsNavigating(true)
    
    // Hide animation after a short delay to simulate network/render time
    // We make it very short (500ms) so it feels snappy
    const timer = setTimeout(() => {
      setIsNavigating(false)
    }, 500)
    
    return () => clearTimeout(timer)
  }, [location.pathname])

  return (
    <AnimatePresence>
      {isNavigating && (
        <motion.div 
          className="fixed inset-0 z-[999999] bg-white/40 dark:bg-black/40 backdrop-blur-[1px] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.2 } }}
        >
          {/* Subtle Spinner */}
          <div className="bg-white dark:bg-[#1a1a1a] p-4 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
