import { motion, AnimatePresence } from 'framer-motion'

const formFieldVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: 0.35 + i * 0.08,
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1],
    },
  }),
}

export function AuthFormCard({ children, className = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.25, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={`relative bg-gradient-to-br from-gray-900/95 via-gray-900/90 to-gray-950/95 backdrop-blur-xl rounded-2xl p-8 border border-white/[0.06] shadow-[0_25px_60px_rgba(0,0,0,0.5),0_0_0_1px_rgba(139,92,246,0.05)] ${className}`}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-500/[0.03] via-transparent to-indigo-500/[0.03] pointer-events-none"
      />
      <div className="relative">{children}</div>
    </motion.div>
  )
}

export function AuthError({ message }) {
  return (
    <AnimatePresence mode="wait">
      {message && (
        <motion.div
          key={message}
          initial={{ opacity: 0, y: -8, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -8, height: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="overflow-hidden mb-6"
        >
          <div
            role="alert"
            className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm flex items-center gap-2"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
            {message}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function AuthInput({ label, icon: Icon, index = 0, id, ...inputProps }) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <motion.div custom={index} variants={formFieldVariants} initial="hidden" animate="visible">
      <label htmlFor={inputId} className="text-sm font-medium text-gray-300 mb-2 block">
        {label}
      </label>
      <div className="relative group">
        {Icon && (
          <Icon
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4 group-focus-within:text-violet-400 transition-colors duration-200 pointer-events-none"
            aria-hidden="true"
          />
        )}
        <input
          id={inputId}
          {...inputProps}
          className={`w-full bg-gray-800/80 border border-gray-700/80 text-white rounded-xl ${Icon ? 'pl-10' : 'pl-4'} pr-4 py-3 text-sm placeholder:text-gray-500 focus:outline-none focus:border-violet-500/70 focus:ring-2 focus:ring-violet-500/20 focus:bg-gray-800 transition-all duration-200 ${inputProps.className || ''}`}
        />
      </div>
    </motion.div>
  )
}

export function AuthSubmitButton({ loading, loadingText, children, index = 0 }) {
  return (
    <motion.div custom={index} variants={formFieldVariants} initial="hidden" animate="visible">
      <motion.button
        whileHover={
          loading
            ? {}
            : {
                scale: 1.01,
                boxShadow: '0 8px 30px rgba(139,92,246,0.35)',
              }
        }
        whileTap={loading ? {} : { scale: 0.98 }}
        type="submit"
        disabled={loading}
        className="relative w-full bg-gradient-to-r from-violet-600 via-violet-500 to-indigo-600 hover:from-violet-500 hover:via-violet-400 hover:to-indigo-500 text-white font-semibold py-3.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-2.5 disabled:opacity-60 disabled:cursor-not-allowed shadow-[0_4px_20px_rgba(124,58,237,0.3)] focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:ring-offset-2 focus:ring-offset-gray-900 overflow-hidden"
      >
        {loading && (
          <motion.span
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          />
        )}
        {loading ? (
          <>
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="inline-flex"
            >
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                aria-hidden="true"
              >
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
            </motion.span>
            <span>{loadingText}</span>
          </>
        ) : (
          children
        )}
      </motion.button>
    </motion.div>
  )
}

export function AuthFooterLink({ text, linkText, href }) {
  return (
    <motion.p
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.75 }}
      className="text-center text-gray-500 text-sm mt-6"
    >
      {text}{' '}
      <motion.a
        href={href}
        whileHover={{ color: '#c4b5fd' }}
        className="text-violet-400 hover:text-violet-300 transition-colors font-medium focus:outline-none focus:underline"
      >
        {linkText}
      </motion.a>
    </motion.p>
  )
}

export function AuthPageHeader({ title, subtitle, showMobileLogo = true }) {
  return (
    <div className="mb-8">
      {showMobileLogo && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15, type: 'spring', stiffness: 200, damping: 15 }}
          className="w-12 h-12 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl flex items-center justify-center mb-6 lg:hidden shadow-[0_4px_20px_rgba(124,58,237,0.3)]"
        >
          <span className="text-white text-xl font-bold">C</span>
        </motion.div>
      )}
      <motion.h2
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="text-3xl font-bold text-white tracking-tight"
      >
        {title}
      </motion.h2>
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28, duration: 0.5 }}
        className="text-gray-400 mt-2"
      >
        {subtitle}
      </motion.p>
    </div>
  )
}
