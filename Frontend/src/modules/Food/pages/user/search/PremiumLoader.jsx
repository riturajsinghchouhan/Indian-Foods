import { motion } from "framer-motion"
import { Utensils, Flame } from "lucide-react"

export default function PremiumLoader() {
  return (
    <div className="flex flex-col items-center justify-center py-20 w-full h-full min-h-[300px]">
      <div className="relative w-24 h-24 flex items-center justify-center">
        {/* Glowing Background */}
        <motion.div 
          className="absolute inset-0 bg-primary/20 rounded-full blur-xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        />
        
        {/* Main Circle */}
        <motion.div 
          className="relative w-16 h-16 bg-white dark:bg-zinc-800 rounded-full shadow-2xl flex items-center justify-center border-4 border-gray-50 dark:border-zinc-900"
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-primary rounded-full shadow-lg" />
          <Utensils className="w-6 h-6 text-primary" />
        </motion.div>
        
        {/* Floating elements */}
        <motion.div
          className="absolute top-2 right-2 text-[#a05485]"
          animate={{ y: [-5, -15, -5], opacity: [0, 1, 0], scale: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        >
          <Flame className="w-4 h-4" />
        </motion.div>
        
        <motion.div
          className="absolute top-4 left-2 text-primary"
          animate={{ y: [-5, -15, -5], opacity: [0, 1, 0], scale: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        >
          <Flame className="w-3 h-3" />
        </motion.div>
      </div>
      
      <motion.div 
        className="mt-6 flex flex-col items-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="text-sm font-black text-gray-800 dark:text-gray-200 tracking-wider">
          PREPARING RESULTS
        </div>
        <div className="flex gap-1 mt-2">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 bg-primary rounded-full"
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  )
}
