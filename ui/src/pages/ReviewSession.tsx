import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { usePracticeStore } from '../stores/practice'
import { getAudio } from '../services/audioStorage'
import { ChevronLeft, Volume2, Award, Target, TrendingUp } from 'lucide-react'
import AudioPlayer from '../components/AudioPlayer'
import TextDiff from '../components/TextDiff'
import ScoreRing from '../components/ScoreRing'
import PhoneticAnalysis from '../components/PhoneticAnalysis'

export default function ReviewSession() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const { sessions, selectedScript } = usePracticeStore()
  const [currentSession, setCurrentSession] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'text' | 'audio' | 'phonetic'>('text')
  const [isPlaying, setIsPlaying] = useState(false)
  const [userAudioUrl, setUserAudioUrl] = useState<string | null>(null)

  // Mock analysis data
  const mockAnalysis = {
    transcript: "Good morning! How are you doing today? I hope you are having a wonderful day.",
    overall_score: 85,
    words: [
      {
        word: "Good",
        accuracy_score: 95,
        phonemes_user: ["/ɡ/", "/ʊ/", "/d/"],
        phonemes_target: ["/ɡ/", "/ʊ/", "/d/"],
        is_stress_error: false,
        error_severity: "none"
      },
      {
        word: "morning",
        accuracy_score: 78,
        phonemes_user: ["/m/", "/ɔː/", "/r/", "/n/", "/ɪ/", "/ŋ/"],
        phonemes_target: ["/m/", "/ɔː/", "/r/", "/n/", "/ɪ/", "/ŋ/"],
        is_stress_error: true,
        error_severity: "medium"
      },
      {
        word: "How",
        accuracy_score: 92,
        phonemes_user: ["/h/", "/aʊ/"],
        phonemes_target: ["/h/", "/aʊ/"],
        is_stress_error: false,
        error_severity: "none"
      }
    ],
    audio_urls: {
      original: "https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg",
      tts_us_standard: "https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg",
      tts_user_clone: "https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg"
    },
    feedback: {
      summary: "Great job! Your pronunciation is clear and understandable. Focus on the stress patterns in 'morning' and 'wonderful'.",
      rhythm_comment: "Your rhythm is generally good, but pay attention to word stress in longer words.",
      improvements: [
        "Practice the stress pattern in 'morning' - stress the first syllable",
        "Work on the 'w' sound in 'wonderful' - make sure your lips are rounded",
        "Try to maintain consistent rhythm throughout the sentence"
      ]
    }
  }

  useEffect(() => {
    // Find the session by ID or use mock data
    const session = sessions.find((s: any) => s.id === sessionId) || {
      id: sessionId,
      user_id: 'mock-user-123',
      script_text: selectedScript?.text || "Good morning! How are you doing today? I hope you are having a wonderful day.",
      overall_score: 85,
      audio_url: 'mock-audio-url',
      created_at: new Date().toISOString(),
      analysis: mockAnalysis
    }
    
    setCurrentSession(session)
  }, [sessionId, sessions, selectedScript])

  useEffect(() => {
    const loadAudio = async () => {
      if (sessionId) {
        const blob = await getAudio(sessionId)
        if (blob) {
          const url = URL.createObjectURL(blob)
          setUserAudioUrl(url)
        }
      }
    }
    loadAudio()
    
    return () => {
      if (userAudioUrl) {
        URL.revokeObjectURL(userAudioUrl)
      }
    }
  }, [sessionId])

  if (!currentSession) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-slate-400">Loading session...</p>
        </div>
      </div>
    )
  }

  const audioUrls = {
    ...currentSession.analysis?.audio_urls,
    original: userAudioUrl || currentSession.analysis?.audio_urls.original
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
          
          <h1 className="text-2xl font-bold text-white">Session Review</h1>
          
          <div className="text-right">
            <p className="text-slate-400 text-sm">Overall Score</p>
            <p className="text-2xl font-bold text-white">{currentSession.overall_score}</p>
          </div>
        </div>
      </header>

      <div className="px-6 space-y-8 max-w-7xl mx-auto pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Score & Overview */}
          <div className="space-y-8">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass-card p-8 text-center relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-500 via-pink-500 to-violet-500" />
              <ScoreRing score={currentSession.overall_score} />
              <div className="mt-8">
                <h2 className="text-3xl font-bold text-white mb-3">
                  {currentSession.overall_score >= 90 ? "Outstanding!" :
                   currentSession.overall_score >= 80 ? "Excellent Work!" :
                   currentSession.overall_score >= 70 ? "Good Effort!" : "Keep Practicing!"}
                </h2>
                <p className="text-slate-400 leading-relaxed">
                  {currentSession.analysis?.feedback.summary}
                </p>
              </div>
            </motion.div>

            {/* AI Feedback Card */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-card p-8"
            >
              <h3 className="text-lg font-bold text-white mb-4 flex items-center space-x-2">
                <div className="p-1.5 rounded-lg bg-violet-500/20">
                  <TrendingUp className="w-4 h-4 text-violet-400" />
                </div>
                <span>Key Improvements</span>
              </h3>
              <ul className="space-y-4">
                {currentSession.analysis?.feedback.improvements.map((tip: string, i: number) => (
                  <li key={i} className="flex items-start space-x-3 text-slate-300 text-sm">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-violet-500 flex-shrink-0" />
                    <span className="leading-relaxed">{tip}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>

          {/* Right Column: Detailed Analysis */}
          <div className="lg:col-span-2 space-y-8">
            {/* Custom Tabs */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-1.5 flex space-x-1 sticky top-6 z-20 backdrop-blur-xl bg-slate-900/80"
            >
              {[
                { id: 'text', label: 'Text Analysis', icon: Target },
                { id: 'audio', label: 'Voice Comparison', icon: Volume2 },
                { id: 'phonetic', label: 'Phonetics', icon: Award }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-xl transition-all duration-300 text-sm font-medium relative overflow-hidden ${
                    activeTab === tab.id
                      ? 'text-white shadow-lg'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`}
                >
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-violet-600"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center space-x-2">
                    <tab.icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </span>
                </button>
              ))}
            </motion.div>

            {/* Tab Content Area */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="glass-card p-8 min-h-[400px]"
              >
                {activeTab === 'text' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold text-white">Word-by-Word Analysis</h3>
                      <div className="flex items-center space-x-4 text-xs font-medium">
                        <span className="flex items-center space-x-1.5 text-green-400">
                          <span className="w-2 h-2 rounded-full bg-green-400" />
                          <span>Perfect</span>
                        </span>
                        <span className="flex items-center space-x-1.5 text-yellow-400">
                          <span className="w-2 h-2 rounded-full bg-yellow-400" />
                          <span>Minor Issue</span>
                        </span>
                        <span className="flex items-center space-x-1.5 text-red-400">
                          <span className="w-2 h-2 rounded-full bg-red-400" />
                          <span>Needs Work</span>
                        </span>
                      </div>
                    </div>
                    <TextDiff 
                      originalText={currentSession.script_text}
                      userTranscript={mockAnalysis.transcript}
                      wordAnalysis={mockAnalysis.words}
                    />
                  </div>
                )}

                {activeTab === 'audio' && (
                  <div className="space-y-6">
                    <h3 className="text-xl font-bold text-white mb-6">Compare Your Voice</h3>
                    <AudioPlayer 
                      audioUrls={audioUrls}
                      isPlaying={isPlaying}
                      onPlayPause={setIsPlaying}
                    />
                  </div>
                )}

                {activeTab === 'phonetic' && (
                  <div className="space-y-6">
                    <h3 className="text-xl font-bold text-white mb-6">Detailed Phonetic Breakdown</h3>
                    <PhoneticAnalysis 
                      wordAnalysis={mockAnalysis.words}
                    />
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}
