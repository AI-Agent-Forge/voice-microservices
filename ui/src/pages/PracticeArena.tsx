import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useReactMediaRecorder } from 'react-media-recorder'
import { usePracticeStore } from '../stores/practice'
import { Mic, Square, Play, Pause, RotateCcw, ChevronLeft, FileText, CheckCircle, AlertTriangle } from 'lucide-react'
import WaveformVisualizer from '../components/WaveformVisualizer'
import ScriptSelector from '../components/ScriptSelector'
import RecordingTimer from '../components/RecordingTimer'
import { saveAudio } from '../services/audioStorage'
import { runFullPipeline, calculateScore, generateFeedback, type PipelineResponse } from '../services/pipeline'
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
  const [pipelineResult, setPipelineResult] = useState<PipelineResponse | null>(null)
  const [showResults, setShowResults] = useState(false)
  const [analysisStep, setAnalysisStep] = useState<string>('')

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
    setAnalysisStep('Starting analysis...')
    logger.info('Starting full pipeline analysis...', { script: selectedScript.title })

    try {
      // Run the complete 4-service pipeline
      setAnalysisStep('Transcribing speech (ASR)...')
      const result = await runFullPipeline(audioBlob, selectedScript.text)
      console.log('Pipeline Result:', result)

      // Store full pipeline result
      setPipelineResult(result)
      setShowResults(true)
      setAnalysisStep('')
    } catch (error) {
      logger.error('Pipeline analysis failed', error)
      console.error('Analysis failed:', error)
      alert('Failed to analyze audio. Please check if all services are running (ASR:8001, Alignment:8002, Phoneme-Map:8003, Phoneme-Diff:8004).')
    } finally {
      setIsAnalyzing(false)
      setAnalysisStep('')
    }
  }

  const handleCompleteSession = async () => {
    if (!audioBlob || !selectedScript || !pipelineResult) return

    try {
      const sessionId = `session-${Date.now()}`

      // Save audio blob to IndexedDB
      await saveAudio(sessionId, audioBlob)

      // Calculate overall score from phoneme diff results
      const overallScore = calculateScore(pipelineResult.phonemeDiff)

      // Build word analysis from pipeline data
      const wordAnalysis = pipelineResult.asr.words.map(w => {
        // Find the comparison result for this word
        const comparison = pipelineResult.phonemeDiff.comparisons.find(
          c => c.word.toLowerCase() === w.word.toLowerCase()
        )

        // Calculate accuracy based on severity
        let accuracyScore = 100
        if (comparison) {
          switch (comparison.severity) {
            case 'low': accuracyScore = 85; break
            case 'medium': accuracyScore = 65; break
            case 'high': accuracyScore = 40; break
          }
        }

        return {
          word: w.word,
          start: w.start,
          end: w.end,
          accuracy_score: accuracyScore,
          phonemes_user: comparison?.user || pipelineResult.phonemeMap.map[w.word.toLowerCase()] || [],
          phonemes_target: comparison?.target || pipelineResult.phonemeMap.map[w.word.toLowerCase()] || [],
          is_stress_error: comparison?.issue?.includes('stress') || false,
          error_severity: comparison?.severity || 'none',
          diff_details: comparison
        }
      })

      // Generate improvements from phoneme diff
      const improvements = pipelineResult.phonemeDiff.comparisons
        .filter(c => c.severity !== 'none')
        .slice(0, 5)
        .map(c => `${c.word}: ${c.notes || c.issue}`)

      const session = {
        id: sessionId,
        user_id: 'user-123',
        script_text: selectedScript.text,
        overall_score: overallScore,
        audio_url: '',
        created_at: new Date().toISOString(),
        pipeline: pipelineResult,
        analysis: {
          transcript: pipelineResult.asr.transcript,
          overall_score: overallScore,
          words: wordAnalysis,
          alignmentPhonemes: pipelineResult.alignment.phonemes,
          pipeline: pipelineResult,
          feedback: {
            summary: `Analyzed ${pipelineResult.asr.words.length} words. ${pipelineResult.phonemeDiff.comparisons.filter(c => c.severity === 'none').length} pronounced correctly.`,
            rhythm_comment: `Audio duration: ${pipelineResult.alignment.audio_duration?.toFixed(1) || 'N/A'}s`,
            improvements
          },
          audio_urls: {
            original: '',
            tts_us_standard: '',
            tts_user_clone: ''
          }
        }
      }

      saveSession(session)
      navigate(`/review/${session.id}`)
    } catch (error) {
      console.error('Failed to save session:', error)
    }
  }

  const handleReset = () => {
    clearBlobUrl()
    setAudioBlob(null)
    setRecordingTime(0)
    setPipelineResult(null)
    setShowResults(false)
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

                      {!showResults ? (
                        <button
                          onClick={handleAnalyze}
                          disabled={isAnalyzing}
                          className="violet-button flex items-center space-x-3 px-10 py-5 text-lg shadow-xl shadow-violet-500/20"
                        >
                          {isAnalyzing ? (
                            <>
                              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              <span>{analysisStep || 'Analyzing...'}</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-5 h-5 fill-current" />
                              <span>Analyze Recording</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <button
                          onClick={handleCompleteSession}
                          className="violet-button flex items-center space-x-3 px-10 py-5 text-lg shadow-xl shadow-violet-500/20"
                        >
                          <FileText className="w-5 h-5 fill-current" />
                          <span>View Full Report</span>
                        </button>
                      )}
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

        {/* Pipeline Results Display */}
        <AnimatePresence>
          {showResults && pipelineResult && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: 0.1 }}
              className="space-y-6"
            >
              {/* ASR Transcript Section */}
              <div className="glass-card p-8 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 via-emerald-500 to-green-500" />

                <div className="flex items-center space-x-3 mb-6">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white">ASR Transcription</h3>
                  <span className="px-2 py-1 bg-green-500/10 border border-green-500/20 text-green-300 text-xs font-bold rounded-full uppercase">
                    {pipelineResult.asr.language}
                  </span>
                </div>

                <div className="bg-slate-900/50 rounded-xl p-6 mb-6 border border-white/5">
                  <p className="text-2xl text-white leading-relaxed">
                    "{pipelineResult.asr.transcript}"
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {pipelineResult.asr.words.map((word, index) => (
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
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Phoneme Mapping Section */}
              <div className="glass-card p-8 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-500 via-purple-500 to-violet-500" />

                <div className="flex items-center space-x-3 mb-6">
                  <div className="p-2 bg-violet-500/10 rounded-lg">
                    <FileText className="w-5 h-5 text-violet-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Phoneme Mapping (ARPAbet)</h3>
                  <span className="px-2 py-1 bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-bold rounded-full">
                    {Object.keys(pipelineResult.phonemeMap.map).length} words mapped
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {Object.entries(pipelineResult.phonemeMap.map).slice(0, 12).map(([word, phonemes]) => (
                    <div key={word} className="bg-slate-900/50 rounded-lg p-4 border border-white/5">
                      <div className="text-white font-medium mb-2">{word}</div>
                      <div className="font-mono text-sm text-violet-400">
                        {phonemes.join(' ')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Phoneme Diff / Pronunciation Issues Section */}
              <div className="glass-card p-8 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500" />

                <div className="flex items-center space-x-3 mb-6">
                  <div className="p-2 bg-amber-500/10 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Pronunciation Analysis</h3>
                  <span className="px-2 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-bold rounded-full">
                    {pipelineResult.phonemeDiff.comparisons.filter(c => c.severity !== 'none').length} issues found
                  </span>
                </div>

                <div className="space-y-3">
                  {pipelineResult.phonemeDiff.comparisons.map((comparison, index) => {
                    const severityColors = {
                      none: 'border-green-500/30 bg-green-500/5',
                      low: 'border-yellow-500/30 bg-yellow-500/5',
                      medium: 'border-orange-500/30 bg-orange-500/5',
                      high: 'border-red-500/30 bg-red-500/5'
                    }
                    const severityText = {
                      none: 'text-green-400',
                      low: 'text-yellow-400',
                      medium: 'text-orange-400',
                      high: 'text-red-400'
                    }

                    return (
                      <div
                        key={index}
                        className={`rounded-lg p-4 border ${severityColors[comparison.severity]}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white font-bold text-lg">{comparison.word}</span>
                          <span className={`text-xs font-bold uppercase ${severityText[comparison.severity]}`}>
                            {comparison.severity === 'none' ? 'Correct' : comparison.severity}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-slate-400">Your pronunciation:</span>
                            <div className="font-mono text-violet-400 mt-1">
                              {comparison.user.join(' ') || 'N/A'}
                            </div>
                          </div>
                          <div>
                            <span className="text-slate-400">Target:</span>
                            <div className="font-mono text-green-400 mt-1">
                              {comparison.target.join(' ') || 'N/A'}
                            </div>
                          </div>
                        </div>
                        {comparison.notes && (
                          <div className="mt-2 text-sm text-slate-400">
                            {comparison.notes}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Overall Score Preview */}
                <div className="mt-6 p-4 bg-slate-900/50 rounded-xl border border-white/5 text-center">
                  <div className="text-slate-400 text-sm mb-1">Preliminary Score</div>
                  <div className="text-4xl font-bold text-white">
                    {calculateScore(pipelineResult.phonemeDiff)}%
                  </div>
                </div>
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
