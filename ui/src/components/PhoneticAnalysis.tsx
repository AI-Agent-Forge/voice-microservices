import { useState } from 'react'
import { motion } from 'framer-motion'
import { Volume2, Target, Award } from 'lucide-react'

interface PhoneticAnalysisProps {
  wordAnalysis: any[]
}

export default function PhoneticAnalysis({ wordAnalysis }: PhoneticAnalysisProps) {
  const [selectedWord, setSelectedWord] = useState<any>(null)

  const phonemes = [
    { symbol: '/iː/', sound: 'ee', example: 'see' },
    { symbol: '/ɪ/', sound: 'i', example: 'sit' },
    { symbol: '/e/', sound: 'e', example: 'bed' },
    { symbol: '/æ/', sound: 'a', example: 'cat' },
    { symbol: '/ʌ/', sound: 'u', example: 'cup' },
    { symbol: '/ɑː/', sound: 'ah', example: 'car' },
    { symbol: '/ɒ/', sound: 'o', example: 'hot' },
    { symbol: '/ɔː/', sound: 'aw', example: 'saw' },
    { symbol: '/ʊ/', sound: 'oo', example: 'book' },
    { symbol: '/uː/', sound: 'oo', example: 'moon' },
    { symbol: '/ə/', sound: 'uh', example: 'about' },
    { symbol: '/ɜː/', sound: 'er', example: 'bird' }
  ]

  const getErrorSeverity = (accuracy: number) => {
    if (accuracy >= 90) return { level: 'excellent', color: 'text-green-400', bg: 'bg-green-400/10' }
    if (accuracy >= 70) return { level: 'good', color: 'text-yellow-400', bg: 'bg-yellow-400/10' }
    return { level: 'needs-work', color: 'text-red-400', bg: 'bg-red-400/10' }
  }

  return (
    <div className="space-y-6">
      {/* Word List */}
      <div>
        <h3 className="text-lg font-bold text-white mb-4">Word Analysis</h3>
        <p className="text-slate-400 text-sm mb-4">
          Detailed phonetic breakdown for each word in your recording
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {wordAnalysis.map((word, index) => {
          const severity = getErrorSeverity(word.accuracy_score)
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`glass-card-hover p-4 cursor-pointer transition-all ${
                selectedWord?.word === word.word ? 'ring-2 ring-violet-500' : ''
              }`}
              onClick={() => setSelectedWord(word)}
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-white font-medium text-lg">{word.word}</h4>
                <div className={`px-2 py-1 rounded-full text-xs ${severity.bg} ${severity.color}`}>
                  {word.accuracy_score}%
                </div>
              </div>

              <div className="space-y-2">
                <div>
                  <p className="text-slate-400 text-sm">Target Pronunciation</p>
                  <p className="phonetic-text">/{word.phonemes_target.join('/')}/</p>
                </div>
                
                <div>
                  <p className="text-slate-400 text-sm">Your Pronunciation</p>
                  <p className="phonetic-text">/{word.phonemes_user.join('/')}/</p>
                </div>

                {word.is_stress_error && (
                  <div className="bg-yellow-400/10 border border-yellow-400/20 rounded p-2">
                    <div className="flex items-center space-x-2">
                      <Target className="w-3 h-3 text-yellow-400" />
                      <p className="text-yellow-400 text-xs font-medium">Stress Error</p>
                    </div>
                  </div>
                )}
              </div>

              <button
                className="mt-3 w-full bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded text-sm transition-colors"
                onClick={(e) => {
                  e.stopPropagation()
                  console.log(`Playing audio for: ${word.word}`)
                }}
              >
                <div className="flex items-center justify-center space-x-2">
                  <Volume2 className="w-3 h-3" />
                  <span>Play</span>
                </div>
              </button>
            </motion.div>
          )
        })}
      </div>

      {/* Phonetic Chart Reference */}
      <div className="glass-card p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Award className="w-5 h-5 text-violet-400" />
          <h3 className="text-lg font-bold text-white">IPA Reference Chart</h3>
        </div>
        
        <p className="text-slate-400 text-sm mb-4">
          International Phonetic Alphabet symbols used in your analysis
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {phonemes.map((phoneme, index) => (
            <motion.div
              key={index}
              whileHover={{ scale: 1.05 }}
              className="bg-slate-800 p-3 rounded-lg text-center"
            >
              <div className="text-lg font-mono text-violet-400 mb-1">
                {phoneme.symbol}
              </div>
              <div className="text-sm text-slate-300 mb-1">
                {phoneme.sound}
              </div>
              <div className="text-xs text-slate-500">
                as in "{phoneme.example}"
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Selected Word Details */}
      {selectedWord && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white">
              Detailed Analysis: {selectedWord.word}
            </h3>
            <button
              onClick={() => setSelectedWord(null)}
              className="text-slate-400 hover:text-white"
            >
              ×
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-white font-medium mb-3">Phoneme Comparison</h4>
              <div className="space-y-3">
                <div>
                  <p className="text-slate-400 text-sm mb-1">Target Phonemes</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedWord.phonemes_target.map((phoneme: string, index: number) => (
                      <span
                        key={index}
                        className="bg-violet-600/20 text-violet-400 px-2 py-1 rounded text-sm font-mono"
                      >
                        {phoneme}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div>
                  <p className="text-slate-400 text-sm mb-1">Your Phonemes</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedWord.phonemes_user.map((phoneme: string, index: number) => (
                      <span
                        key={index}
                        className={`px-2 py-1 rounded text-sm font-mono ${
                          phoneme === selectedWord.phonemes_target[index]
                            ? 'bg-green-600/20 text-green-400'
                            : 'bg-red-600/20 text-red-400'
                        }`}
                      >
                        {phoneme}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-white font-medium mb-3">Practice Tips</h4>
              <div className="space-y-2">
                {selectedWord.is_stress_error && (
                  <div className="bg-yellow-400/10 border border-yellow-400/20 rounded-lg p-3">
                    <div className="flex items-center space-x-2 mb-1">
                      <Target className="w-4 h-4 text-yellow-400" />
                      <p className="text-yellow-400 font-medium text-sm">Stress Pattern</p>
                    </div>
                    <p className="text-yellow-400 text-sm">
                      Pay attention to which syllable should be stressed in this word.
                    </p>
                  </div>
                )}
                
                <div className="bg-slate-800 rounded-lg p-3">
                  <div className="flex items-center space-x-2 mb-2">
                    <Volume2 className="w-4 h-4 text-violet-400" />
                    <p className="text-violet-400 font-medium text-sm">Listen & Repeat</p>
                  </div>
                  <p className="text-slate-300 text-sm">
                    Listen to the native pronunciation and repeat slowly, focusing on each phoneme.
                  </p>
                </div>
                
                <div className="bg-slate-800 rounded-lg p-3">
                  <div className="flex items-center space-x-2 mb-2">
                    <Target className="w-4 h-4 text-violet-400" />
                    <p className="text-violet-400 font-medium text-sm">Focus Areas</p>
                  </div>
                  <p className="text-slate-300 text-sm">
                    Practice the phonemes that differ from the target pronunciation.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}