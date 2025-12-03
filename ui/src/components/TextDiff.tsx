import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Volume2, Info } from 'lucide-react'

interface TextDiffProps {
  originalText: string
  userTranscript: string
  wordAnalysis: any[]
}

export default function TextDiff({ originalText, userTranscript, wordAnalysis }: TextDiffProps) {
  const [selectedWord, setSelectedWord] = useState<any>(null)

  const words = originalText.split(' ').map((word, index) => {
    const analysis = wordAnalysis.find(a => a.word.toLowerCase() === word.toLowerCase().replace(/[.,!?]/g, ''))
    return {
      text: word,
      analysis: analysis || { accuracy_score: 100, error_severity: 'none' },
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
        <h4 className="text-white font-medium mb-3">Original Text</h4>
        <div className="practice-script leading-relaxed">
          {words.map((word, index) => (
            <motion.span
              key={index}
              className={`inline-block mr-2 cursor-pointer hover:bg-slate-800 rounded px-1 transition-all ${
                getWordClassName(word.analysis)
              }`}
              style={getWordStyle(word.analysis)}
              onClick={() => setSelectedWord(word)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {word.text}
            </motion.span>
          ))}
        </div>
      </div>

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
                          className={`h-2 rounded-full ${
                            selectedWord.analysis.accuracy_score >= 90 ? 'bg-green-400' :
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
                    <p className="text-slate-400 text-sm mb-2">Phonetic Transcription</p>
                    <div className="phonetic-text bg-slate-800 p-3 rounded-lg">
                      /{selectedWord.analysis.phonemes_target.join('/')}/
                    </div>
                  </div>

                  <div>
                    <p className="text-slate-400 text-sm mb-2">Your Pronunciation</p>
                    <div className="phonetic-text bg-slate-800 p-3 rounded-lg">
                      /{selectedWord.analysis.phonemes_user.join('/')}/
                    </div>
                  </div>

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
                      // Play audio for this word (mock)
                      console.log(`Playing audio for: ${selectedWord.text}`)
                    }}
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <Volume2 className="w-4 h-4" />
                      <span>Play Pronunciation</span>
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