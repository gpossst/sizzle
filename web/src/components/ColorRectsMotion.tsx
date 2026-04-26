import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { cn } from '#/lib/utils'

type ColorRectsMotionProps = {
  className?: string
}

const RECT_COLORS = ['var(--secondary)', 'var(--hazard)', 'var(--primary)']

export default function ColorRectsMotion({ className }: ColorRectsMotionProps) {
  const [hasMounted, setHasMounted] = useState(false)

  useEffect(() => {
    setHasMounted(true)
  }, [])

  return (
    <div className={cn('grid h-full w-full min-h-24 min-w-24 grid-cols-3', className)}>
      {RECT_COLORS.map((color, index) => (
        <div
          key={color}
          className="relative h-full overflow-hidden"
        >
          <motion.div
            className="absolute inset-0"
            style={{
              backgroundColor: color,
            }}
            initial={{ y: '100%' }}
            animate={
              hasMounted
                ? { y: ['100%', '0%', '0%', '-100%'] }
                : { y: '100%' }
            }
            transition={{
              duration: 4.6,
              delay: index * 0.35,
              times: [0, 0.4, 0.62, 1],
              ease: 'easeInOut',
              repeat: Number.POSITIVE_INFINITY,
              repeatType: 'loop',
            }}
          />
        </div>
      ))}
    </div>
  )
}
