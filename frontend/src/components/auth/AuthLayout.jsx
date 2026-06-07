import { motion } from 'framer-motion'
import AuthBackground, { GradientOrbs } from './AuthBackground'
import AuthBrandingPanel from './AuthBrandingPanel'

export default function AuthLayout({ brandingVariant, children }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-gray-950 flex overflow-hidden relative"
    >
      <AuthBackground />
      <AuthBrandingPanel variant={brandingVariant} />

      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8 relative z-10">
        <div className="absolute inset-0 lg:hidden overflow-hidden pointer-events-none" aria-hidden="true">
          <GradientOrbs />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md relative"
        >
          {children}
        </motion.div>
      </div>
    </motion.div>
  )
}
