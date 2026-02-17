import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Play, Pause, RotateCcw, Volume2 } from 'lucide-react'

interface AudioPlayerProps {
  audioUrls: {
    original: string
    tts_us_standard: string
    tts_user_clone: string
  }
  isPlaying: boolean
  onPlayPause: (playing: boolean) => void
}

export default function AudioPlayer({ audioUrls, isPlaying, onPlayPause }: AudioPlayerProps) {
  const [activeTrack, setActiveTrack] = useState<'original' | 'standard' | 'clone'>('original')
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef<HTMLAudioElement>(null)

  const tracks = [
    { id: 'original', label: 'Your Recording', icon: '🎤', url: audioUrls.original },
    { id: 'standard', label: 'Native Speaker', icon: '🇺🇸', url: audioUrls.tts_us_standard },
    { id: 'clone', label: 'AI Voice Clone', icon: '🤖', url: audioUrls.tts_user_clone }
  ]

  const currentTrack = tracks.find(t => t.id === activeTrack)

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(console.error)
      } else {
        audioRef.current.pause()
      }
    }
  }, [isPlaying])

  const handlePlayPause = () => {
    onPlayPause(!isPlaying)
  }

  const handleTrackSelect = (trackId: string) => {
    setActiveTrack(trackId as any)
    onPlayPause(false)
    setCurrentTime(0)
  }

  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLAudioElement>) => {
    setCurrentTime(e.currentTarget.currentTime)
  }

  const handleLoadedMetadata = (e: React.SyntheticEvent<HTMLAudioElement>) => {
    setDuration(e.currentTarget.duration)
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value)
    setCurrentTime(time)
    if (audioRef.current) {
      audioRef.current.currentTime = time
    }
  }

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60)
    const secs = Math.floor(time % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="space-y-6">
      {/* Track Selection */}
      <div className="space-y-3">
        <h3 className="text-lg font-bold text-white">Audio Comparison</h3>
        <p className="text-slate-400 text-sm">
          Compare your recording with native speaker and AI voice clone
        </p>
        
        <div className="grid grid-cols-1 gap-3">
          {tracks.map((track) => (
            <motion.button
              key={track.id}
              onClick={() => handleTrackSelect(track.id)}
              className={`p-4 rounded-lg border transition-all ${
                activeTrack === track.id
                  ? 'bg-violet-600/20 border-violet-500 text-white'
                  : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-800'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center space-x-3">
                <div className="text-2xl">{track.icon}</div>
                <div className="text-left flex-1">
                  <p className="font-medium">{track.label}</p>
                  <p className="text-sm text-slate-400">Click to listen</p>
                </div>
                {activeTrack === track.id && (
                  <div className="w-2 h-2 bg-violet-500 rounded-full animate-pulse"></div>
                )}
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Audio Controls */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">{currentTrack?.icon}</div>
            <div>
              <p className="text-white font-medium">{currentTrack?.label}</p>
              <p className="text-slate-400 text-sm">Voice comparison</p>
            </div>
          </div>
          
          <button
            onClick={handlePlayPause}
            className="w-12 h-12 bg-violet-600 hover:bg-violet-500 rounded-full flex items-center justify-center transition-colors"
          >
            {isPlaying ? <Pause className="w-5 h-5 text-white" /> : <Play className="w-5 h-5 text-white" />}
          </button>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
            style={{
              background: `linear-gradient(to right, #8B5CF6 0%, #8B5CF6 ${(currentTime / duration) * 100}%, #475569 ${(currentTime / duration) * 100}%, #475569 100%)`
            }}
          />
          <div className="flex justify-between text-sm text-slate-400">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-center space-x-4 mt-4">
          <button
            onClick={() => {
              setCurrentTime(0)
              if (audioRef.current) {
                audioRef.current.currentTime = 0
              }
            }}
            className="p-2 text-slate-400 hover:text-white transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          
          <button
            onClick={handlePlayPause}
            className="w-16 h-16 bg-violet-600 hover:bg-violet-500 rounded-full flex items-center justify-center transition-colors"
          >
            {isPlaying ? <Pause className="w-6 h-6 text-white" /> : <Play className="w-6 h-6 text-white" />}
          </button>
          
          <button
            onClick={() => {
              // Volume control (mock)
              console.log('Volume control')
            }}
            className="p-2 text-slate-400 hover:text-white transition-colors"
          >
            <Volume2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Hidden Audio Element */}
      <audio
        ref={audioRef}
        src={currentTrack?.url}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => onPlayPause(false)}
        preload="metadata"
      />

      {/* Custom Styles */}
      <style>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #8B5CF6;
          cursor: pointer;
          border: 2px solid #1E293B;
        }
        .slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #8B5CF6;
          cursor: pointer;
          border: 2px solid #1E293B;
        }
      `}</style>
    </div>
  )
}
