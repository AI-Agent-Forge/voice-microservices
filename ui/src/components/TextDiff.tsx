import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Volume2, Info, Clock, Zap } from 'lucide-react'
import type { PipelineResponse, ComparisonResult } from '../services/pipeline'

interface TextDiffProps {
  originalText: string
  userTranscript: string
  wordAnalysis: any[]
  pipeline?: PipelineResponse
  onPlayWord?: (word: string, start: number, end: number) => void
}

export default function TextDiff({ originalText, userTranscript, wordAnalysis, pipeline, onPlayWord }: TextDiffProps) {
  const [selectedWord, setSelectedWord] = useState<any>(null)
  const [hoveredWord, setHoveredWord] = useState<string | null>(null)

  const words = originalText.split(' ').map((word, index) => {
    const cleanWord = word.toLowerCase().replace(/[.,!?]/g, '')
    const analysis = wordAnalysis.find(a => a.word.toLowerCase() === cleanWord)
    const comparison = pipeline?.phonemeDiff?.comparisons?.find(
      c => c.word.toLowerCase() === cleanWord
    )
    const phonemes = pipeline?.phonemeMap?.map?.[cleanWord] || []

    return {
      text: word,
      cleanWord,
      analysis: analysis || { accuracy_score: 100, error_severity: 'none', start: 0, end: 0 },
      comparison,
      phonemes,
      index
    }
  })

  const getWordClassName = (analysis: any) => {
    if (analysis.accuracy_score >= 90) return 'text-diff-correct'
    if (analysis.accuracy_score >= 70) return 'text-yellow-400'
    return 'text-diff-error'
  }

  const getWordStyle = (analysis: any) => {
    if (analysis.error_severity === 'high') {
      return { textDecoration: 'wavy underline', textDecorationColor: '#f87171' }
    }
    if (analysis.error_severity === 'medium') {
      return { textDecoration: 'wavy underline', textDecorationColor: '#facc15' }
    }
    return {}
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-white mb-4">Text Analysis</h3>
        <p className="text-slate-400 text-sm mb-4">
          Click on any word to see detailed phonetic analysis
        </p>
      </div>

      {/* Original Text with Analysis */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-white font-medium">Original Text</h4>
          {pipeline?.asr && (
            <div className="flex items-center space-x-2 text-slate-400 text-sm">
              <Zap className="w-4 h-4 text-violet-400" />
              <span>ASR: {pipeline.asr.words.length} words detected</span>
            </div>
          )}
        </div>
        <div className="practice-script leading-relaxed relative">
          {words.map((word, index) => (
            <div key={index} className="inline-block relative group">
              <motion.span
                className={`inline-block mr-2 cursor-pointer hover:bg-slate-800 rounded px-1 py-0.5 transition-all ${getWordClassName(word.analysis)
                  }`}
                style={getWordStyle(word.analysis)}
                onClick={() => setSelectedWord(word)}
                onMouseEnter={() => setHoveredWord(word.cleanWord)}
                onMouseLeave={() => setHoveredWord(null)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {word.text}
              </motion.span>

              {/* Phoneme Tooltip on Hover */}
              <AnimatePresence>
                {hoveredWord === word.cleanWord && word.phonemes.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-20 pointer-events-none"
                  >
                    <div className="bg-slate-900 border border-violet-500/30 rounded-lg px-3 py-2 shadow-xl">
                      <div className="flex items-center space-x-1 mb-1">
                        {word.phonemes.map((p: string, i: number) => {
                          const isMatch = word.comparison?.user?.[i] === p
                          return (
                            <span
                              key={i}
                              className={`font-mono text-xs px-1 py-0.5 rounded ${word.comparison
                                ? (isMatch ? 'bg-green-600/30 text-green-300' : 'bg-red-600/30 text-red-300')
                                : 'bg-violet-600/30 text-violet-300'
                                }`}
                            >
                              {p}
                            </span>
                          )
                        })}
                      </div>
                      {word.analysis.start !== undefined && (
                        <div className="flex items-center space-x-1 text-xs text-slate-500">
                          <Clock className="w-3 h-3" />
                          <span>{word.analysis.start?.toFixed(2)}s - {word.analysis.end?.toFixed(2)}s</span>
                        </div>
                      )}
                    </div>
                    <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-slate-900"></div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>

      {/* User's Transcript Comparison */}
      {userTranscript && userTranscript !== originalText && (
        <div className="glass-card p-6 border-l-4 border-l-violet-500">
          <div className="flex items-center space-x-2 mb-3">
            <Zap className="w-4 h-4 text-violet-400" />
            <h4 className="text-white font-medium">Your Speech (ASR Transcript)</h4>
          </div>
          <p className="text-slate-300 text-lg leading-relaxed">{userTranscript}</p>
        </div>
      )}

      {/* Word Analysis Modal */}
      <AnimatePresence>
        {selectedWord && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedWord(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-white">
                    Word: {selectedWord.text}
                  </h3>
                  <button
                    onClick={() => setSelectedWord(null)}
                    className="text-slate-400 hover:text-white"
                  >
                    ×
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-slate-400 text-sm mb-1">Accuracy Score</p>
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 bg-slate-800 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${selectedWord.analysis.accuracy_score >= 90 ? 'bg-green-400' :
                            selectedWord.analysis.accuracy_score >= 70 ? 'bg-yellow-400' :
                              'bg-red-400'
                            }`}
                          style={{ width: `${selectedWord.analysis.accuracy_score}%` }}
                        ></div>
                      </div>
                      <span className="text-white font-medium">
                        {selectedWord.analysis.accuracy_score}%
                      </span>
                    </div>
                  </div>

                  <div>
                    <p className="text-slate-400 text-sm mb-2">Phonetic Transcription (Target)</p>
                    <div className="bg-slate-800 p-3 rounded-lg">
                      <div className="flex flex-wrap gap-1">
                        {(selectedWord.phonemes.length > 0 ? selectedWord.phonemes : selectedWord.analysis.phonemes_target || []).map((p: string, i: number) => (
                          <span key={i} className="font-mono text-sm px-2 py-1 bg-green-600/20 text-green-300 rounded">
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-slate-400 text-sm mb-2">Your Pronunciation</p>
                    <div className="bg-slate-800 p-3 rounded-lg">
                      <div className="flex flex-wrap gap-1">
                        {(selectedWord.comparison?.user || selectedWord.analysis.phonemes_user || []).map((p: string, i: number) => {
                          const target = selectedWord.phonemes[i] || selectedWord.analysis.phonemes_target?.[i]
                          const isMatch = p === target
                          return (
                            <span key={i} className={`font-mono text-sm px-2 py-1 rounded ${isMatch ? 'bg-green-600/20 text-green-300' : 'bg-red-600/20 text-red-300'
                              }`}>
                              {p}
                            </span>
                          )
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Timing info from ASR */}
                  {(selectedWord.analysis.start !== undefined && selectedWord.analysis.end !== undefined) && (
                    <div className="bg-slate-800/50 rounded-lg p-3">
                      <div className="flex items-center space-x-2 text-sm text-slate-400">
                        <Clock className="w-4 h-4" />
                        <span>Time: {selectedWord.analysis.start.toFixed(2)}s - {selectedWord.analysis.end.toFixed(2)}s</span>
                        <span className="text-slate-500">({(selectedWord.analysis.end - selectedWord.analysis.start).toFixed(2)}s duration)</span>
                      </div>
                    </div>
                  )}

                  {/* Comparison details from Phoneme-Diff */}
                  {selectedWord.comparison && selectedWord.comparison.severity !== 'none' && (
                    <div className={`rounded-lg p-3 ${selectedWord.comparison.severity === 'high' ? 'bg-red-500/10 border border-red-500/20' :
                        selectedWord.comparison.severity === 'medium' ? 'bg-orange-500/10 border border-orange-500/20' :
                          'bg-yellow-500/10 border border-yellow-500/20'
                      }`}>
                      <div className="flex items-center space-x-2 mb-2">
                        <Info className={`w-4 h-4 ${selectedWord.comparison.severity === 'high' ? 'text-red-400' :
                            selectedWord.comparison.severity === 'medium' ? 'text-orange-400' :
                              'text-yellow-400'
                          }`} />
                        <p className={`font-medium text-sm capitalize ${selectedWord.comparison.severity === 'high' ? 'text-red-400' :
                            selectedWord.comparison.severity === 'medium' ? 'text-orange-400' :
                              'text-yellow-400'
                          }`}>
                          {selectedWord.comparison.issue?.replace(/_/g, ' ') || 'Pronunciation Issue'}
                        </p>
                      </div>
                      {selectedWord.comparison.notes && (
                        <p className="text-slate-300 text-sm">{selectedWord.comparison.notes}</p>
                      )}
                    </div>
                  )}

                  {selectedWord.analysis.is_stress_error && (
                    <div className="bg-yellow-400/10 border border-yellow-400/20 rounded-lg p-3">
                      <div className="flex items-center space-x-2 mb-1">
                        <Info className="w-4 h-4 text-yellow-400" />
                        <p className="text-yellow-400 font-medium text-sm">Stress Error</p>
                      </div>
                      <p className="text-yellow-400 text-sm">
                        Pay attention to the stress pattern in this word.
                      </p>
                    </div>
                  )}

                  <button
                    className="w-full violet-button"
                    onClick={() => {
                      if (onPlayWord && selectedWord.analysis.start !== undefined) {
                        onPlayWord(selectedWord.text, selectedWord.analysis.start, selectedWord.analysis.end)
                      } else {
                        console.log(`Playing audio for: ${selectedWord.text}`)
                      }
                    }}
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <Volume2 className="w-4 h-4" />
                      <span>Play This Word</span>
                    </div>
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legend */}
      <div className="glass-card p-4">
        <h4 className="text-white font-medium mb-3">Legend</h4>
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-400 rounded"></div>
            <span className="text-slate-300">Excellent (90-100%)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-yellow-400 rounded"></div>
            <span className="text-slate-300">Good (70-89%)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-400 rounded"></div>
            <span className="text-slate-300">Needs Work (0-69%)</span>
          </div>
        </div>
      </div>
    </div>
  )
}