import { motion } from 'framer-motion'

interface ScoreRingProps {
  score: number
  size?: 'sm' | 'md' | 'lg'
}

export default function ScoreRing({ score, size = 'md' }: ScoreRingProps) {
  const radius = size === 'sm' ? 30 : size === 'lg' ? 60 : 45
  const strokeWidth = size === 'sm' ? 4 : size === 'lg' ? 8 : 6
  const circumference = 2 * Math.PI * radius
  const strokeDasharray = circumference
  const strokeDashoffset = circumference - (score / 100) * circumference

  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32'
  }

  const textSizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl'
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-400'
    if (score >= 80) return 'text-yellow-400'
    if (score >= 70) return 'text-orange-400'
    return 'text-red-400'
  }

  const getRingColor = (score: number) => {
    if (score >= 90) return 'stroke-green-400'
    if (score >= 80) return 'stroke-yellow-400'
    if (score >= 70) return 'stroke-orange-400'
    return 'stroke-red-400'
  }

  return (
    <div className={`${sizeClasses[size]} relative mx-auto`}>
      <svg
        className="w-full h-full transform -rotate-90"
        viewBox={`0 0 ${radius * 2 + strokeWidth} ${radius * 2 + strokeWidth}`}
      >
        {/* Background circle */}
        <circle
          cx={radius + strokeWidth / 2}
          cy={radius + strokeWidth / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-slate-700"
        />
        
        {/* Progress circle */}
        <motion.circle
          cx={radius + strokeWidth / 2}
          cy={radius + strokeWidth / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={circumference}
          strokeLinecap="round"
          className={getRingColor(score)}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{
            duration: 1.5,
            ease: "easeOut",
            delay: 0.5
          }}
        />
      </svg>
      
      {/* Score text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.span
          className={`${textSizes[size]} font-bold ${getScoreColor(score)}`}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            duration: 0.8,
            delay: 1,
            type: "spring",
            stiffness: 200
          }}
        >
          {score}
        </motion.span>
      </div>
    </div>
  )
}