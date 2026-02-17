import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Volume2, Target, Award, AlertCircle, CheckCircle, Lightbulb, ChevronDown, ChevronUp, BookOpen, Zap } from 'lucide-react'
import type { PipelineResponse, ComparisonResult, IssueDetail } from '../services/pipeline'

interface PhoneticAnalysisProps {
  wordAnalysis: any[]
  pipeline?: PipelineResponse
  audioUrl?: string
  onPlayWord?: (word: string, start: number, end: number) => void
}

// Pronunciation tips based on issue type from Phoneme-Diff service
const getFixTips = (issueType: string, userPhoneme?: string, targetPhoneme?: string): { tip: string; practice: string } => {
  const tips: Record<string, { tip: string; practice: string }> = {
    'vowel_shift': {
      tip: `Your vowel sound "${userPhoneme || 'X'}" should be "${targetPhoneme || 'Y'}". Focus on mouth shape and tongue position.`,
      practice: 'Practice by exaggerating the correct vowel sound slowly, then gradually speed up.'
    },
    'consonant_substitution': {
      tip: `You substituted "${userPhoneme || 'X'}" for "${targetPhoneme || 'Y'}". Pay attention to how your tongue and lips form the sound.`,
      practice: 'Place your tongue/lips in the correct position before making the sound. Use a mirror to check.'
    },
    'consonant_deletion': {
      tip: 'You dropped a consonant sound. Make sure to pronounce all consonants clearly.',
      practice: 'Slow down and emphasize each consonant. Try breaking the word into syllables.'
    },
    'consonant_insertion': {
      tip: 'You added an extra consonant sound. Simplify your pronunciation.',
      practice: 'Listen carefully to native pronunciation and avoid adding extra sounds between syllables.'
    },
    'stress_error': {
      tip: 'The stress pattern is incorrect. English words have specific syllables that should be emphasized.',
      practice: 'Mark the stressed syllable and practice saying the word with exaggerated stress on that syllable.'
    },
    'vowel_insertion': {
      tip: 'You inserted an extra vowel sound (epenthesis). This often happens between consonant clusters.',
      practice: 'Practice consonant clusters by holding the first consonant and moving directly to the next without adding a vowel.'
    },
    'vowel_deletion': {
      tip: 'You dropped a vowel sound. Make sure to pronounce all syllables.',
      practice: 'Count the syllables in the word and ensure you pronounce each one.'
    },
    'devoicing': {
      tip: 'A voiced consonant became voiceless. Feel your throat vibrate when making voiced sounds.',
      practice: 'Put your hand on your throat - you should feel vibration for voiced consonants like B, D, G, V, Z.'
    },
    'voicing': {
      tip: 'A voiceless consonant became voiced. Keep your vocal cords still for voiceless sounds.',
      practice: 'Whisper the sound first, then gradually add airflow without vibrating your vocal cords.'
    },
    'r_coloring': {
      tip: 'The R sound needs adjustment. American R requires curling the tongue tip back.',
      practice: 'Practice the R sound in isolation. Start by saying "er" and hold the position.'
    },
    'th_substitution': {
      tip: 'The TH sound was substituted. Place your tongue between your teeth for TH.',
      practice: 'Stick your tongue slightly out between your teeth and blow air. Practice with "the, this, that".'
    },
    'l_vocalization': {
      tip: 'The L sound was not fully pronounced. Touch your tongue tip to the roof of your mouth.',
      practice: 'Practice "la-la-la" to feel the tongue position, then apply it to words.'
    }
  }

  return tips[issueType] || {
    tip: 'Focus on matching the target phoneme sequence exactly.',
    practice: 'Listen to native pronunciation and repeat slowly, then at normal speed.'
  }
}

// Complete ARPAbet phoneme reference including consonants
const vowelPhonemes = [
  { symbol: 'AA', sound: 'ah', example: 'father', ipa: 'ɑ' },
  { symbol: 'AE', sound: 'a', example: 'cat', ipa: 'æ' },
  { symbol: 'AH', sound: 'uh', example: 'but', ipa: 'ʌ' },
  { symbol: 'AO', sound: 'aw', example: 'dog', ipa: 'ɔ' },
  { symbol: 'AW', sound: 'ow', example: 'cow', ipa: 'aʊ' },
  { symbol: 'AY', sound: 'ai', example: 'bite', ipa: 'aɪ' },
  { symbol: 'EH', sound: 'e', example: 'bed', ipa: 'ɛ' },
  { symbol: 'ER', sound: 'er', example: 'bird', ipa: 'ɝ' },
  { symbol: 'EY', sound: 'ay', example: 'say', ipa: 'eɪ' },
  { symbol: 'IH', sound: 'i', example: 'bit', ipa: 'ɪ' },
  { symbol: 'IY', sound: 'ee', example: 'see', ipa: 'i' },
  { symbol: 'OW', sound: 'oh', example: 'go', ipa: 'oʊ' },
  { symbol: 'OY', sound: 'oy', example: 'boy', ipa: 'ɔɪ' },
  { symbol: 'UH', sound: 'oo', example: 'book', ipa: 'ʊ' },
  { symbol: 'UW', sound: 'oo', example: 'moon', ipa: 'u' },
]

const consonantPhonemes = [
  { symbol: 'B', sound: 'b', example: 'boy', ipa: 'b' },
  { symbol: 'CH', sound: 'ch', example: 'cheese', ipa: 'tʃ' },
  { symbol: 'D', sound: 'd', example: 'dog', ipa: 'd' },
  { symbol: 'DH', sound: 'th', example: 'the', ipa: 'ð' },
  { symbol: 'F', sound: 'f', example: 'fish', ipa: 'f' },
  { symbol: 'G', sound: 'g', example: 'go', ipa: 'g' },
  { symbol: 'HH', sound: 'h', example: 'hat', ipa: 'h' },
  { symbol: 'JH', sound: 'j', example: 'judge', ipa: 'dʒ' },
  { symbol: 'K', sound: 'k', example: 'key', ipa: 'k' },
  { symbol: 'L', sound: 'l', example: 'love', ipa: 'l' },
  { symbol: 'M', sound: 'm', example: 'man', ipa: 'm' },
  { symbol: 'N', sound: 'n', example: 'no', ipa: 'n' },
  { symbol: 'NG', sound: 'ng', example: 'sing', ipa: 'ŋ' },
  { symbol: 'P', sound: 'p', example: 'put', ipa: 'p' },
  { symbol: 'R', sound: 'r', example: 'red', ipa: 'ɹ' },
  { symbol: 'S', sound: 's', example: 'see', ipa: 's' },
  { symbol: 'SH', sound: 'sh', example: 'she', ipa: 'ʃ' },
  { symbol: 'T', sound: 't', example: 'tea', ipa: 't' },
  { symbol: 'TH', sound: 'th', example: 'think', ipa: 'θ' },
  { symbol: 'V', sound: 'v', example: 'very', ipa: 'v' },
  { symbol: 'W', sound: 'w', example: 'way', ipa: 'w' },
  { symbol: 'Y', sound: 'y', example: 'yes', ipa: 'j' },
  { symbol: 'Z', sound: 'z', example: 'zoo', ipa: 'z' },
  { symbol: 'ZH', sound: 'zh', example: 'measure', ipa: 'ʒ' },
]

export default function PhoneticAnalysis({ wordAnalysis, pipeline, audioUrl, onPlayWord }: PhoneticAnalysisProps) {
  const [selectedWord, setSelectedWord] = useState<any>(null)
  const [selectedComparison, setSelectedComparison] = useState<ComparisonResult | null>(null)
  const [showArpabetRef, setShowArpabetRef] = useState(false)
  const [showIPA, setShowIPA] = useState(false)
  const [expandedDetails, setExpandedDetails] = useState<string | null>(null)

  const getErrorSeverity = (accuracy: number) => {
    if (accuracy >= 90) return { level: 'excellent', color: 'text-green-400', bg: 'bg-green-400/10' }
    if (accuracy >= 70) return { level: 'good', color: 'text-yellow-400', bg: 'bg-yellow-400/10' }
    return { level: 'needs-work', color: 'text-red-400', bg: 'bg-red-400/10' }
  }

  // Get phoneme statistics from pipeline data
  const getPhonemeStats = () => {
    if (!pipeline?.phonemeDiff?.comparisons) return null

    const stats = {
      total: pipeline.phonemeDiff.comparisons.length,
      correct: pipeline.phonemeDiff.comparisons.filter(c => c.severity === 'none').length,
      issues: {} as Record<string, number>
    }

    pipeline.phonemeDiff.comparisons.forEach(c => {
      if (c.details && c.details.length > 0) {
        c.details.forEach(d => {
          stats.issues[d.type] = (stats.issues[d.type] || 0) + 1
        })
      } else if (c.issue && c.severity !== 'none') {
        stats.issues[c.issue] = (stats.issues[c.issue] || 0) + 1
      }
    })

    return stats
  }

  const phonemeStats = getPhonemeStats()

  return (
    <div className="space-y-6">
      {/* Service Attribution Banner */}
      <div className="glass-card p-4 bg-gradient-to-r from-violet-900/20 to-purple-900/20 border-violet-500/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Zap className="w-5 h-5 text-violet-400" />
            <div>
              <p className="text-white font-medium">Powered by Voice Microservices</p>
              <p className="text-slate-400 text-sm">ASR → Alignment → Phoneme-Map → Phoneme-Diff</p>
            </div>
          </div>
          {phonemeStats && (
            <div className="flex items-center space-x-4 text-sm">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-400">{phonemeStats.correct}</p>
                <p className="text-slate-400 text-xs">Correct</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-400">{phonemeStats.total - phonemeStats.correct}</p>
                <p className="text-slate-400 text-xs">Issues</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{Math.round((phonemeStats.correct / phonemeStats.total) * 100)}%</p>
                <p className="text-slate-400 text-xs">Accuracy</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Common Issue Types Summary */}
      {phonemeStats && Object.keys(phonemeStats.issues).length > 0 && (
        <div className="glass-card p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Lightbulb className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-bold text-white">Focus Areas</h3>
            <span className="px-2 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-bold rounded-full">
              From Phoneme-Diff Analysis
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Object.entries(phonemeStats.issues).map(([issueType, count]) => {
              const tips = getFixTips(issueType)
              return (
                <div key={issueType} className="bg-slate-800/50 rounded-lg p-4 border border-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium capitalize">{issueType.replace(/_/g, ' ')}</span>
                    <span className="px-2 py-0.5 bg-orange-500/20 text-orange-300 text-xs rounded-full">{count}x</span>
                  </div>
                  <p className="text-slate-400 text-sm">{tips.practice}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Pipeline Phoneme Diff Results (if available) */}
      {pipeline?.phonemeDiff?.comparisons && pipeline.phonemeDiff.comparisons.length > 0 && (
        <div>
          <div className="flex items-center space-x-3 mb-4">
            <AlertCircle className="w-5 h-5 text-violet-400" />
            <h3 className="text-lg font-bold text-white">Pronunciation Comparison</h3>
            <span className="px-2 py-1 bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-bold rounded-full">
              Port 8004: Phoneme-Diff Service
            </span>
          </div>
          <p className="text-slate-400 text-sm mb-4">
            Real-time comparison between your pronunciation (from ASR + Alignment) and target phonemes (from Phoneme-Map)
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {pipeline.phonemeDiff.comparisons.map((comparison, index) => {
              const severityColors = {
                none: { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400' },
                low: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400' },
                medium: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400' },
                high: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400' }
              }
              const colors = severityColors[comparison.severity] || severityColors.none
              const isExpanded = expandedDetails === comparison.word
              const hasDetails = comparison.details && comparison.details.length > 0

              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`rounded-lg border overflow-hidden ${colors.bg} ${colors.border}`}
                >
                  <div
                    className="p-4 cursor-pointer transition-all hover:bg-white/5"
                    onClick={() => setExpandedDetails(isExpanded ? null : comparison.word)}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-white font-bold text-lg">{comparison.word}</h4>
                      <div className="flex items-center space-x-2">
                        {comparison.severity === 'none' ? (
                          <CheckCircle className={`w-4 h-4 ${colors.text}`} />
                        ) : (
                          <AlertCircle className={`w-4 h-4 ${colors.text}`} />
                        )}
                        <span className={`text-xs font-bold uppercase ${colors.text}`}>
                          {comparison.severity === 'none' ? 'Correct' : comparison.severity}
                        </span>
                        {hasDetails && (
                          isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <p className="text-slate-400 text-xs uppercase tracking-wide">Your Phonemes (ASR)</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {comparison.user.map((p, i) => {
                            const isMatch = comparison.target[i] === p
                            return (
                              <span
                                key={i}
                                className={`font-mono text-sm px-1.5 py-0.5 rounded ${isMatch ? 'bg-green-600/20 text-green-300' : 'bg-red-600/20 text-red-300'
                                  }`}
                              >
                                {p}
                              </span>
                            )
                          })}
                        </div>
                      </div>

                      <div>
                        <p className="text-slate-400 text-xs uppercase tracking-wide">Target (CMUdict)</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {comparison.target.map((p, i) => (
                            <span key={i} className="font-mono text-sm px-1.5 py-0.5 bg-green-600/20 text-green-300 rounded">
                              {p}
                            </span>
                          ))}
                        </div>
                      </div>

                      {comparison.notes && (
                        <p className="text-slate-400 text-sm mt-2 italic">{comparison.notes}</p>
                      )}
                    </div>
                  </div>

                  {/* Expanded Details Section - Shows issue details from Phoneme-Diff */}
                  <AnimatePresence>
                    {isExpanded && comparison.severity !== 'none' && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-white/10"
                      >
                        <div className="p-4 bg-slate-900/50">
                          {/* Issue Details from Phoneme-Diff Service */}
                          {hasDetails && (
                            <div className="mb-4">
                              <p className="text-white font-medium text-sm mb-2">Issue Details:</p>
                              <div className="space-y-2">
                                {comparison.details.map((detail: IssueDetail, i: number) => (
                                  <div key={i} className="bg-slate-800/50 rounded p-3 text-sm">
                                    <div className="flex items-center space-x-2 mb-1">
                                      <span className="px-2 py-0.5 bg-violet-500/20 text-violet-300 text-xs rounded capitalize">
                                        {detail.type.replace(/_/g, ' ')}
                                      </span>
                                      <span className="text-slate-400">at position {detail.position}</span>
                                    </div>
                                    <p className="text-slate-300">{detail.description}</p>
                                    {detail.user_phoneme && detail.target_phoneme && (
                                      <p className="text-slate-400 mt-1">
                                        <span className="text-red-400 font-mono">{detail.user_phoneme}</span>
                                        {' → '}
                                        <span className="text-green-400 font-mono">{detail.target_phoneme}</span>
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* How to Fix Tips */}
                          <div className="bg-gradient-to-r from-emerald-900/20 to-green-900/20 rounded-lg p-4 border border-emerald-500/20">
                            <div className="flex items-center space-x-2 mb-2">
                              <Lightbulb className="w-4 h-4 text-emerald-400" />
                              <p className="text-emerald-400 font-medium text-sm">How to Fix</p>
                            </div>
                            {(() => {
                              const issueType = hasDetails ? comparison.details[0]?.type : comparison.issue
                              const tips = getFixTips(
                                issueType,
                                hasDetails ? comparison.details[0]?.user_phoneme : undefined,
                                hasDetails ? comparison.details[0]?.target_phoneme : undefined
                              )
                              return (
                                <>
                                  <p className="text-slate-300 text-sm mb-2">{tips.tip}</p>
                                  <p className="text-slate-400 text-sm"><strong>Practice:</strong> {tips.practice}</p>
                                </>
                              )
                            })()}
                          </div>

                          {/* Play Word Button */}
                          {onPlayWord && (
                            <button
                              className="mt-3 w-full bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-lg text-sm transition-colors flex items-center justify-center space-x-2"
                              onClick={(e) => {
                                e.stopPropagation()
                                const wordData = wordAnalysis.find(w => w.word.toLowerCase() === comparison.word.toLowerCase())
                                if (wordData) {
                                  onPlayWord(comparison.word, wordData.start, wordData.end)
                                }
                              }}
                            >
                              <Volume2 className="w-4 h-4" />
                              <span>Play This Word</span>
                            </button>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )
            })}
          </div>
        </div>
      )}

      {/* Word List (from session analysis) */}
      {wordAnalysis.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-white mb-4">Word Analysis</h3>
          <p className="text-slate-400 text-sm mb-4">
            Detailed phonetic breakdown for each word in your recording
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {wordAnalysis.map((word, index) => {
          const severity = getErrorSeverity(word.accuracy_score)
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`glass-card-hover p-4 cursor-pointer transition-all ${selectedWord?.word === word.word ? 'ring-2 ring-violet-500' : ''
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

      {/* ARPAbet Reference Chart - Collapsible */}
      <div className="glass-card overflow-hidden">
        <button
          className="w-full p-6 flex items-center justify-between hover:bg-white/5 transition-colors"
          onClick={() => setShowArpabetRef(!showArpabetRef)}
        >
          <div className="flex items-center space-x-3">
            <BookOpen className="w-5 h-5 text-violet-400" />
            <h3 className="text-lg font-bold text-white">ARPAbet Reference Chart</h3>
            <span className="px-2 py-1 bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-bold rounded-full">
              Used by Phoneme-Map Service
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <button
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${showIPA ? 'bg-violet-600 text-white' : 'bg-slate-700 text-slate-300'}`}
              onClick={(e) => { e.stopPropagation(); setShowIPA(!showIPA) }}
            >
              {showIPA ? 'Show ARPAbet' : 'Show IPA'}
            </button>
            {showArpabetRef ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
          </div>
        </button>

        <AnimatePresence>
          {showArpabetRef && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-white/10"
            >
              <div className="p-6">
                <p className="text-slate-400 text-sm mb-4">
                  CMUdict phoneme symbols used by the Phoneme-Map Service (port 8003) for canonical pronunciation lookup
                </p>

                {/* Vowels */}
                <div className="mb-6">
                  <h4 className="text-white font-medium mb-3">Vowels</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                    {vowelPhonemes.map((phoneme, index) => (
                      <motion.div
                        key={index}
                        whileHover={{ scale: 1.05 }}
                        className="bg-slate-800 p-3 rounded-lg text-center"
                      >
                        <div className="text-lg font-mono text-violet-400 mb-1">
                          {showIPA ? phoneme.ipa : phoneme.symbol}
                        </div>
                        <div className="text-sm text-slate-300 mb-1">
                          {phoneme.sound}
                        </div>
                        <div className="text-xs text-slate-500">
                          "{phoneme.example}"
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Consonants */}
                <div>
                  <h4 className="text-white font-medium mb-3">Consonants</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {consonantPhonemes.map((phoneme, index) => (
                      <motion.div
                        key={index}
                        whileHover={{ scale: 1.05 }}
                        className="bg-slate-800 p-3 rounded-lg text-center"
                      >
                        <div className="text-lg font-mono text-emerald-400 mb-1">
                          {showIPA ? phoneme.ipa : phoneme.symbol}
                        </div>
                        <div className="text-sm text-slate-300 mb-1">
                          {phoneme.sound}
                        </div>
                        <div className="text-xs text-slate-500">
                          "{phoneme.example}"
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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
                        className={`px-2 py-1 rounded text-sm font-mono ${phoneme === selectedWord.phonemes_target[index]
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