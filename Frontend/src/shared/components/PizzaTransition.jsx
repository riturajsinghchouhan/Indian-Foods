import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLocation } from 'react-router-dom'

export default function PizzaTransition() {
  const [isNavigating, setIsNavigating] = useState(false)
  const location = useLocation()
  
  useEffect(() => {
    // Show animation on route change
    setIsNavigating(true)
    
    // Hide animation after 1.5 seconds (gives enough time for the fast bouncy animation)
    const timer = setTimeout(() => {
      setIsNavigating(false)
    }, 1500)
    
    return () => clearTimeout(timer)
  }, [location.pathname])

  return (
    <AnimatePresence>
      {isNavigating && (
        <motion.div 
          className="fixed inset-0 z-[999999] bg-[#e71f25] flex flex-col items-center justify-center overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.3 } }}
        >
          {/* Container for Pizza Assembly */}
          <div className="relative w-64 h-64 flex items-center justify-center">
            
            {/* 1. Wooden Peel sliding in from bottom */}
            <motion.div
              className="absolute bottom-4 w-40 h-8 bg-[#8b5a2b] rounded-t-full shadow-lg z-10"
              initial={{ y: 200, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.1 }}
            >
              {/* Handle of the peel */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 w-6 h-20 bg-[#6b4226] rounded-b-xl shadow-inner" />
            </motion.div>

            {/* 2. Pizza Dough popping in */}
            <motion.div
              className="absolute w-32 h-32 bg-[#fbd786] rounded-full border-4 border-[#e5a93d] shadow-xl z-20 flex items-center justify-center"
              initial={{ scale: 0, y: -50 }}
              animate={{ scale: 1, y: -10 }}
              transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.3 }}
            >
               {/* Cheese layer */}
               <div className="w-[90%] h-[90%] bg-[#ffea9e] rounded-full" />
            </motion.div>

            {/* 3. Ingredients raining down (Pepperoni, Mushrooms, Peppers) */}
            <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center -translate-y-2">
              {/* Pepperoni 1 */}
              <motion.div
                className="absolute w-5 h-5 bg-[#d9381e] rounded-full shadow-sm ml-8 mb-8"
                initial={{ y: -200, opacity: 0, rotate: 0 }}
                animate={{ y: 0, opacity: 1, rotate: 45 }}
                transition={{ type: "spring", stiffness: 300, damping: 10, delay: 0.5 }}
              />
              {/* Pepperoni 2 */}
              <motion.div
                className="absolute w-4 h-4 bg-[#d9381e] rounded-full shadow-sm -ml-8 -mb-4"
                initial={{ y: -200, opacity: 0, rotate: 0 }}
                animate={{ y: 0, opacity: 1, rotate: -20 }}
                transition={{ type: "spring", stiffness: 300, damping: 10, delay: 0.55 }}
              />
              
              {/* Green Pepper 1 */}
              <motion.div
                className="absolute w-6 h-2 bg-[#4caf50] rounded-full shadow-sm -ml-6 mt-6"
                initial={{ y: -200, opacity: 0, rotate: -90 }}
                animate={{ y: 0, opacity: 1, rotate: -30 }}
                transition={{ type: "spring", stiffness: 300, damping: 10, delay: 0.6 }}
              />
              
              {/* Mushroom 1 */}
              <motion.div
                className="absolute w-4 h-3 bg-[#e8dcc4] rounded-t-full shadow-sm ml-6 -mt-8"
                initial={{ y: -200, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 10, delay: 0.65 }}
              />
            </div>
            
          </div>
          
          <motion.h2 
            className="text-white font-black uppercase tracking-widest mt-16 text-xl"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            Cooking...
          </motion.h2>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
