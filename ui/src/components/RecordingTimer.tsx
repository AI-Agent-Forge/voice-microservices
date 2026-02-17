import { motion } from 'framer-motion'

interface RecordingTimerProps {
  isRecording: boolean
  time: number
}

export default function RecordingTimer({ isRecording, time }: RecordingTimerProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="text-center mb-8">
      <motion.div
        className={`text-4xl font-mono font-bold ${
          isRecording ? 'text-red-400' : 'text-slate-400'
        }`}
        animate={isRecording ? { scale: [1, 1.05, 1] } : {}}
        transition={{ duration: 1, repeat: Infinity }}
      >
        {formatTime(time)}
      </motion.div>
      
      {isRecording && (
        <motion.div
          className="flex items-center justify-center mt-2 space-x-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
          <span className="text-red-400 text-sm font-medium">Recording</span>
        </motion.div>
      )}
    </div>
  )
}