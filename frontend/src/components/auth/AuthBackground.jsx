import { useEffect } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'

const PARTICLES = [
  { size: 2, left: '12%', top: '18%', opacity: 0.2, duration: 5, delay: 0 },
  { size: 3, left: '78%', top: '22%', opacity: 0.15, duration: 6, delay: 0.5 },
  { size: 1.5, left: '45%', top: '8%', opacity: 0.25, duration: 4.5, delay: 1 },
  { size: 2.5, left: '88%', top: '55%', opacity: 0.18, duration: 7, delay: 0.3 },
  { size: 1, left: '25%', top: '72%', opacity: 0.3, duration: 5.5, delay: 1.2 },
  { size: 3.5, left: '62%', top: '68%', opacity: 0.12, duration: 8, delay: 0.8 },
  { size: 2, left: '5%', top: '45%', opacity: 0.22, duration: 6.5, delay: 2 },
  { size: 1.5, left: '92%', top: '12%', opacity: 0.2, duration: 4, delay: 1.5 },
  { size: 2, left: '35%', top: '38%', opacity: 0.15, duration: 7.5, delay: 0.2 },
  { size: 1, left: '55%', top: '85%', opacity: 0.28, duration: 5, delay: 2.5 },
  { size: 2.5, left: '18%', top: '92%', opacity: 0.14, duration: 6, delay: 1.8 },
  { size: 1.5, left: '72%', top: '42%', opacity: 0.2, duration: 5.2, delay: 0.6 },
]

function CursorGlow() {
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const springX = useSpring(x, { stiffness: 80, damping: 20 })
  const springY = useSpring(y, { stiffness: 80, damping: 20 })

  useEffect(() => {
    const move = (e) => {
      x.set(e.clientX - 200)
      y.set(e.clientY - 200)
    }
    window.addEventListener('mousemove', move)
    return () => window.removeEventListener('mousemove', move)
  }, [x, y])

  return (
    <motion.div
      aria-hidden="true"
      animate={{ opacity: [0.12, 0.22, 0.12] }}
      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      style={{
        left: springX,
        top: springY,
        background: 'radial-gradient(circle, rgba(139,92,246,0.35) 0%, transparent 70%)',
        position: 'fixed',
        width: '400px',
        height: '400px',
        borderRadius: '50%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  )
}

function FloatingParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {PARTICLES.map((p, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-violet-400"
          style={{
            width: p.size,
            height: p.size,
            left: p.left,
            top: p.top,
            opacity: p.opacity,
          }}
          animate={{
            y: [0, -24, 0],
            opacity: [p.opacity * 0.5, p.opacity, p.opacity * 0.5],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}

function GradientOrbs() {
  return (
    <>
      <motion.div
        aria-hidden="true"
        animate={{ x: [0, 30, 0], y: [0, -30, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-[10%] left-[10%] w-96 h-96 rounded-full opacity-20 blur-3xl bg-violet-600"
      />
      <motion.div
        aria-hidden="true"
        animate={{ x: [0, -20, 0], y: [0, 40, 0], scale: [1, 1.2, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        className="absolute bottom-[10%] right-[10%] w-80 h-80 rounded-full opacity-15 blur-3xl bg-blue-600"
      />
      <motion.div
        aria-hidden="true"
        animate={{ x: [0, 15, 0], y: [0, -15, 0], opacity: [0.08, 0.14, 0.08] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-3xl bg-indigo-500"
      />
    </>
  )
}

export default function AuthBackground({ showCursorGlow = true }) {
  return (
    <>
      {showCursorGlow && <CursorGlow />}
      <div
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(139,92,246,0.06) 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }}
      />
    </>
  )
}

export { FloatingParticles, GradientOrbs }
