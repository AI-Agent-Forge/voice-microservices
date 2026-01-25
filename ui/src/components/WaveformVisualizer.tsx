import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

interface WaveformVisualizerProps {
  isRecording: boolean
}

export default function WaveformVisualizer({ isRecording }: WaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)
  const barsRef = useRef<number[]>([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight

    // Initialize bars
    const barCount = 60
    barsRef.current = Array(barCount).fill(0).map(() => Math.random() * 0.3)

    const animate = () => {
      // Check canvas still exists
      if (!canvasRef.current) return

      if (!isRecording) {
        // Static visualization when not recording
        drawStaticBars(ctx, canvas.width, canvas.height)
      } else {
        // Animated visualization when recording
        drawAnimatedBars(ctx, canvas.width, canvas.height)
      }
      
      animationRef.current = requestAnimationFrame(animate)
    }

    const drawStaticBars = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      ctx.clearRect(0, 0, width, height)
      
      const barWidth = width / barsRef.current.length
      const centerY = height / 2
      
      barsRef.current.forEach((height, index) => {
        const x = index * barWidth + barWidth / 2
        const barHeight = height * 60
        
        // Create gradient
        const gradient = ctx.createLinearGradient(0, centerY - barHeight, 0, centerY + barHeight)
        gradient.addColorStop(0, '#8B5CF6') // violet-500
        gradient.addColorStop(1, '#7C3AED') // violet-600
        
        ctx.fillStyle = gradient
        ctx.fillRect(x - barWidth / 4, centerY - barHeight, barWidth / 2, barHeight * 2)
      })
    }

    const drawAnimatedBars = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      ctx.clearRect(0, 0, width, height)
      
      const barWidth = width / barsRef.current.length
      const centerY = height / 2
      
      // Update bars with random variations
      barsRef.current = barsRef.current.map((bar) => {
        const variation = (Math.random() - 0.5) * 0.1
        const newHeight = Math.max(0.05, Math.min(0.8, bar + variation))
        return newHeight
      })
      
      barsRef.current.forEach((height, index) => {
        const x = index * barWidth + barWidth / 2
        const barHeight = height * 80
        
        // Create gradient with more vibrant colors when recording
        const gradient = ctx.createLinearGradient(0, centerY - barHeight, 0, centerY + barHeight)
        gradient.addColorStop(0, '#A78BFA') // violet-400
        gradient.addColorStop(0.5, '#8B5CF6') // violet-500
        gradient.addColorStop(1, '#7C3AED') // violet-600
        
        ctx.fillStyle = gradient
        ctx.fillRect(x - barWidth / 4, centerY - barHeight, barWidth / 2, barHeight * 2)
      })
    }

    animate()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isRecording])

  return (
    <div className="waveform-container relative">
      <canvas
        ref={canvasRef}
        className="w-full h-24 rounded-lg"
        style={{ background: 'transparent' }}
      />
      
      {/* Overlay text when not recording */}
      {!isRecording && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <motion.div
            className="text-slate-500 text-sm font-medium"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            Ready to record
          </motion.div>
        </div>
      )}
      
      {/* Recording indicator */}
      {isRecording && (
        <motion.div
          className="absolute top-4 right-4 flex items-center space-x-2 pointer-events-none"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
          <span className="text-red-400 text-xs font-medium">LIVE</span>
        </motion.div>
      )}
    </div>
  )
}
