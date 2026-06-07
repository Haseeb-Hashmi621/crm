import { motion } from 'framer-motion'
import { FloatingParticles, GradientOrbs } from './AuthBackground'

const BRANDING = {
  login: {
    headline: (
      <>
        Grow your
        <br />
        business faster
      </>
    ),
    subtext: 'The all-in-one CRM to manage contacts, track deals, and automate your workflow.',
    stats: [
      {
        label: 'Total Revenue',
        value: '$48,295',
        change: '↑ 24% this month',
        dotColor: 'bg-green-400',
        changeColor: 'text-green-400',
        delay: 0.5,
        hoverX: 4,
      },
      {
        label: 'Active Deals',
        value: '142',
        change: '↑ 8 new this week',
        dotColor: 'bg-violet-400',
        changeColor: 'text-violet-400',
        delay: 0.7,
        hoverX: -4,
      },
    ],
  },
  signup: {
    headline: (
      <>
        Build relationships
        <br />
        that drive revenue
      </>
    ),
    subtext: 'Join teams who use our CRM to close deals faster and keep every customer conversation in one place.',
    stats: [
      {
        label: 'Contacts Managed',
        value: '10K+',
        change: 'Across all workspaces',
        dotColor: 'bg-blue-400',
        changeColor: 'text-blue-400',
        delay: 0.5,
        hoverX: 4,
      },
      {
        label: 'Team Satisfaction',
        value: '98%',
        change: 'Rated excellent by users',
        dotColor: 'bg-emerald-400',
        changeColor: 'text-emerald-400',
        delay: 0.7,
        hoverX: -4,
      },
    ],
  },
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.2 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
}

export default function AuthBrandingPanel({ variant = 'login' }) {
  const content = BRANDING[variant]

  return (
    <div className="hidden lg:flex w-1/2 relative items-center justify-center overflow-hidden">
      <FloatingParticles />
      <GradientOrbs />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 text-center px-12 max-w-lg"
      >
        <motion.div variants={itemVariants}>
          <motion.div
            animate={{ rotate: [0, 4, -4, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            className="w-20 h-20 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-[0_0_50px_rgba(124,58,237,0.35)]"
          >
            <span className="text-white text-4xl font-bold tracking-tight">C</span>
          </motion.div>
          <h1 className="text-4xl font-bold text-white mb-4 leading-tight tracking-tight">
            {content.headline}
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed">{content.subtext}</p>
        </motion.div>

        {content.stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            variants={itemVariants}
            initial={{ opacity: 0, x: index === 0 ? -40 : 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: stat.delay, duration: 0.7 }}
            whileHover={{ scale: 1.02, x: stat.hoverX }}
            className={`${index === 0 ? 'mt-10' : 'mt-4'} bg-gray-900/60 backdrop-blur-md border border-white/5 rounded-2xl p-5 text-left cursor-default shadow-[0_8px_32px_rgba(0,0,0,0.3)]`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-2 h-2 rounded-full ${stat.dotColor} animate-pulse`} />
              <p className="text-gray-400 text-xs font-medium tracking-wide uppercase">
                {stat.label}
              </p>
            </div>
            <p className="text-white text-3xl font-bold tracking-tight">{stat.value}</p>
            <p className={`${stat.changeColor} text-xs mt-2 font-medium`}>{stat.change}</p>
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}
