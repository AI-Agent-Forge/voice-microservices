import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useReactMediaRecorder } from 'react-media-recorder'
import { usePracticeStore } from '../stores/practice'
import { Mic, Square, Play, Pause, RotateCcw, ChevronLeft, FileText } from 'lucide-react'
import WaveformVisualizer from '../components/WaveformVisualizer'
import ScriptSelector from '../components/ScriptSelector'
import RecordingTimer from '../components/RecordingTimer'
import { saveAudio } from '../services/audioStorage'
import { transcribeAudio, ASRResponse } from '../services/asr'
import { logger } from '../stores/debug'

export default function PracticeArena() {
  const navigate = useNavigate()
  const { 
    selectedScript, 
    isRecording, 
    recordingTime, 
    startRecording, 
    stopRecording, 
    setRecordingTime,
    loadScripts,
    saveSession
  } = usePracticeStore()

  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [showScriptSelector, setShowScriptSelector] = useState(false)
  const [transcriptResult, setTranscriptResult] = useState<ASRResponse | null>(null)
  const [showTranscript, setShowTranscript] = useState(false)

  const {
    status,
    startRecording: startMediaRecording,
    stopRecording: stopMediaRecording,
    mediaBlobUrl,
    clearBlobUrl
  } = useReactMediaRecorder({
    audio: true,
    echoCancellation: true,
    noiseSuppression: true,
    sampleRate: 44100,
    mimeType: 'audio/webm'
  })

  useEffect(() => {
    loadScripts()
  }, [loadScripts])

  useEffect(() => {
    if (mediaBlobUrl) {
      fetch(mediaBlobUrl)
        .then(res => res.blob())
        .then(blob => setAudioBlob(blob))
    }
  }, [mediaBlobUrl])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(recordingTime + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isRecording, recordingTime, setRecordingTime])

  const handleStartRecording = async () => {
    try {
      console.log('Starting recording...')
      await startMediaRecording()
      console.log('Media recording started, updating store...')
      startRecording()
    } catch (error) {
      console.error('Failed to start recording:', error)
    }
  }

  const handleStopRecording = () => {
    console.log('Stopping recording...')
    stopMediaRecording()
    stopRecording()
  }

  const handleAnalyze = async () => {
    if (!audioBlob || !selectedScript) return

    setIsAnalyzing(true)
    logger.info('Starting analysis...', { script: selectedScript.title })

    try {
      // Call ASR service
      const asrResult = await transcribeAudio(audioBlob)
      console.log('ASR Result:', asrResult)
      
      // Store transcript result and show it
      setTranscriptResult(asrResult)
      setShowTranscript(true)

      // Create mock analysis result (merging ASR data)
      const sessionId = `session-${Date.now()}`
      
      // Save audio blob to IndexedDB
      await saveAudio(sessionId, audioBlob)
      
      const mockSession = {
        id: sessionId,
        user_id: 'mock-user-123',
        script_text: selectedScript.text,
        overall_score: Math.floor(Math.random() * 30) + 70, // Random score 70-100
        audio_url: '', // We'll load it from IndexedDB
        created_at: new Date().toISOString(),
        analysis: {
            transcript: asrResult.transcript,
            words: asrResult.words.map(w => ({
                word: w.word,
                accuracy_score: 90, // Mock score for now
                phonemes_user: [], 
                phonemes_target: [],
                is_stress_error: false,
                error_severity: 'none'
            })),
            feedback: {
                summary: "Analysis complete. (AI feedback placeholder)",
                rhythm_comment: "Good pace.",
                improvements: []
            },
            audio_urls: {
                original: '',
                tts_us_standard: '',
                tts_user_clone: ''
            }
        }
      }

      saveSession(mockSession)
      
      // Navigate to review page
      navigate(`/review/${mockSession.id}`)
    } catch (error) {
      logger.error('Analysis failed', error)
      console.error('Analysis failed:', error)
      alert('Failed to analyze audio. Please check if the ASR service is running.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleReset = () => {
    clearBlobUrl()
    setAudioBlob(null)
    setRecordingTime(0)
    setTranscriptResult(null)
    setShowTranscript(false)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="glass-card m-6 p-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center space-x-2 text-slate-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>Back to Dashboard</span>
          </button>
          
          <h1 className="text-2xl font-bold text-white">Practice Arena</h1>
          
          <button
            onClick={() => setShowScriptSelector(true)}
            className="violet-button"
          >
            Choose Script
          </button>
        </div>
      </header>

      <div className="px-6 space-y-8 max-w-5xl mx-auto pb-12">
        {/* Script Display */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-12 relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-violet-500 via-pink-500 to-violet-500" />
          {selectedScript ? (
            <div className="relative z-10 text-center">
              <div className="inline-flex items-center space-x-3 mb-8">
                <span className="px-4 py-1.5 bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-bold rounded-full uppercase tracking-wider">
                  {selectedScript.difficulty} Level
                </span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-400 text-sm font-medium tracking-wide uppercase">
                  {selectedScript.category}
                </span>
              </div>
              
              <h2 className="text-4xl md:text-5xl font-medium text-white mb-8 leading-tight tracking-tight">
                "{selectedScript.text}"
              </h2>
              
              <div className="inline-block px-8 py-4 bg-slate-900/50 rounded-2xl border border-white/5 backdrop-blur-sm">
                <p className="font-jetbrains text-xl text-violet-300 tracking-wide">
                  {selectedScript.phonetic_transcription}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-24 h-24 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-6 ring-1 ring-white/10">
                <Mic className="w-10 h-10 text-slate-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">No Script Selected</h3>
              <p className="text-slate-400 mb-8 max-w-md mx-auto">Choose a practice script from our library to begin your pronunciation training</p>
              <button
                onClick={() => setShowScriptSelector(true)}
                className="violet-button"
              >
                Select Script
              </button>
            </div>
          )}
        </motion.div>

        {/* Recording Interface */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-10 relative overflow-hidden"
        >
          {/* Background Glow */}
          <div className={`absolute inset-0 transition-opacity duration-1000 pointer-events-none ${isRecording ? 'opacity-100' : 'opacity-0'}`}>
            <div className="absolute inset-0 bg-gradient-to-r from-violet-500/10 via-transparent to-violet-500/10 animate-pulse-slow" />
            <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-violet-500/5 to-transparent" />
          </div>

          <div className="relative z-10 flex flex-col items-center">
            <div className="mb-10 w-full max-w-3xl">
              <WaveformVisualizer isRecording={isRecording} />
            </div>
            
            <div className="flex flex-col items-center space-y-8">
              {/* Timer */}
              <div className="font-jetbrains text-5xl font-light text-white tracking-widest tabular-nums">
                {formatTime(recordingTime)}
              </div>

              {/* Controls */}
              <div className="flex items-center space-x-10">
                <AnimatePresence mode="wait">
                  {!isRecording && !audioBlob && (
                    <motion.button
                      key="record"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      onClick={handleStartRecording}
                      disabled={!selectedScript}
                      className={`recording-button group ${!selectedScript ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <Mic className="w-8 h-8 text-white group-hover:scale-110 transition-transform" />
                    </motion.button>
                  )}

                  {isRecording && (
                    <motion.button
                      key="stop"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      onClick={handleStopRecording}
                      className="recording-button recording group"
                    >
                      <Square className="w-6 h-6 text-white fill-current group-hover:scale-110 transition-transform" />
                    </motion.button>
                  )}

                  {!isRecording && audioBlob && (
                    <motion.div
                      key="actions"
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: 20, opacity: 0 }}
                      className="flex items-center space-x-6"
                    >
                      <button
                        onClick={handleReset}
                        className="p-4 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all hover:scale-105 active:scale-95 border border-white/5"
                        title="Reset Recording"
                      >
                        <RotateCcw className="w-6 h-6" />
                      </button>
                      
                      <button
                        onClick={handleAnalyze}
                        disabled={isAnalyzing}
                        className="violet-button flex items-center space-x-3 px-10 py-5 text-lg shadow-xl shadow-violet-500/20"
                      >
                        {isAnalyzing ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Analyzing...</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-5 h-5 fill-current" />
                            <span>Analyze Recording</span>
                          </>
                        )}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <p className="text-slate-400 font-medium tracking-wide text-sm uppercase opacity-60">
                {isRecording ? 'Recording in Progress' : audioBlob ? 'Ready to Analyze' : 'Tap mic to start'}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Transcript Display */}
        <AnimatePresence>
          {showTranscript && transcriptResult && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: 0.1 }}
              className="glass-card p-8 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 via-emerald-500 to-green-500" />
              
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <FileText className="w-5 h-5 text-green-400" />
                </div>
                <h3 className="text-xl font-bold text-white">Transcription Result</h3>
                <span className="px-2 py-1 bg-green-500/10 border border-green-500/20 text-green-300 text-xs font-bold rounded-full uppercase">
                  {transcriptResult.language}
                </span>
              </div>

              {/* Main Transcript */}
              <div className="bg-slate-900/50 rounded-xl p-6 mb-6 border border-white/5">
                <p className="text-2xl text-white leading-relaxed">
                  "{transcriptResult.transcript}"
                </p>
              </div>

              {/* Word Timestamps */}
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  Word-Level Timestamps
                </h4>
                <div className="flex flex-wrap gap-2">
                  {transcriptResult.words.map((word, index) => (
                    <div
                      key={index}
                      className="group relative px-3 py-2 bg-slate-800/50 rounded-lg border border-white/5 hover:border-violet-500/30 hover:bg-violet-500/10 transition-all cursor-default"
                    >
                      <span className="text-white font-medium">{word.word}</span>
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 rounded-lg border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                        <div className="text-xs text-slate-300">
                          <span className="text-violet-400">{word.start.toFixed(2)}s</span>
                          <span className="text-slate-500 mx-1">→</span>
                          <span className="text-violet-400">{word.end.toFixed(2)}s</span>
                          {word.confidence && (
                            <span className="ml-2 text-green-400">({(word.confidence * 100).toFixed(0)}%)</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center space-x-6 text-sm text-slate-400">
                {transcriptResult.duration && (
                  <span>Duration: <span className="text-white">{transcriptResult.duration.toFixed(1)}s</span></span>
                )}
                {transcriptResult.processing_time && (
                  <span>Processed in: <span className="text-green-400">{transcriptResult.processing_time.toFixed(2)}s</span></span>
                )}
                <span>Words: <span className="text-white">{transcriptResult.words.length}</span></span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Script Selector Modal */}
      <AnimatePresence>
        {showScriptSelector && (
          <ScriptSelector
            onClose={() => setShowScriptSelector(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
