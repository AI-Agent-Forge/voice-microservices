import { motion } from 'framer-motion'
import { MessageCircle, Target, Zap, Award, ChevronDown, ChevronUp, Sparkles, BookOpen } from 'lucide-react'
import { useState } from 'react'
import ScoreRing from './ScoreRing'
import type { FeedbackLLMResponse } from '../services/pipeline'

interface FeedbackPanelProps {
  feedback: FeedbackLLMResponse | null
  isLoading?: boolean
}

export default function FeedbackPanel({ feedback, isLoading }: FeedbackPanelProps) {
  const [showAllIssues, setShowAllIssues] = useState(false)

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-8 relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500 via-violet-500 to-pink-500 animate-pulse" />
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <div className="relative">
            <div className="w-12 h-12 border-3 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
            <Sparkles className="w-5 h-5 text-violet-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-slate-300 font-medium">Generating AI Feedback...</p>
          <p className="text-slate-500 text-sm">Analyzing pronunciation patterns with LLM</p>
        </div>
      </motion.div>
    )
  }

  if (!feedback) return null

  if (feedback.fallback) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-8 relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500" />
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 bg-amber-500/10 rounded-lg">
            <MessageCircle className="w-5 h-5 text-amber-400" />
          </div>
          <h3 className="text-xl font-bold text-white">AI Feedback</h3>
          <span className="px-2 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-bold rounded-full uppercase">
            Unavailable
          </span>
        </div>
        <p className="text-slate-400">{feedback.overall_summary}</p>
      </motion.div>
    )
  }

  const visibleIssues = showAllIssues ? feedback.issues : feedback.issues.slice(0, 3)
  const hasMoreIssues = feedback.issues.length > 3

  const severityConfig = {
    low: { color: 'yellow', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400', badge: 'bg-yellow-500/20' },
    medium: { color: 'orange', bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', badge: 'bg-orange-500/20' },
    high: { color: 'red', bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', badge: 'bg-red-500/20' },
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header + Scores */}
      <div className="glass-card p-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500 via-violet-500 to-pink-500" />

        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-violet-500/10 rounded-lg">
            <Sparkles className="w-5 h-5 text-violet-400" />
          </div>
          <h3 className="text-xl font-bold text-white">AI Pronunciation Feedback</h3>
          <span className="px-2 py-1 bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-bold rounded-full uppercase">
            {feedback.issues.length} issues
          </span>
        </div>

        {/* Summary */}
        <div className="bg-slate-900/50 rounded-xl p-5 mb-6 border border-white/5">
          <p className="text-slate-200 leading-relaxed">{feedback.overall_summary}</p>
        </div>

        {/* Score Grid */}
        {(feedback.overall_score !== null && feedback.overall_score !== undefined) && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Overall', score: feedback.overall_score, icon: Award },
              { label: 'Accuracy', score: feedback.accuracy_score, icon: Target },
              { label: 'Fluency', score: feedback.fluency_score, icon: Zap },
              { label: 'Prosody', score: feedback.prosody_score, icon: MessageCircle },
            ].map((item) => (
              <div key={item.label} className="bg-slate-900/50 rounded-xl p-4 border border-white/5 text-center">
                <div className="flex justify-center mb-2">
                  <ScoreRing score={item.score ?? 0} size="sm" />
                </div>
                <div className="flex items-center justify-center space-x-1">
                  <item.icon className="w-3 h-3 text-slate-500" />
                  <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">{item.label}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Issues */}
      {feedback.issues.length > 0 && (
        <div className="glass-card p-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500" />

          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <Target className="w-5 h-5 text-amber-400" />
            </div>
            <h3 className="text-lg font-bold text-white">Pronunciation Issues</h3>
          </div>

          <div className="space-y-3">
            {visibleIssues.map((issue, idx) => {
              const config = severityConfig[issue.severity as keyof typeof severityConfig] || severityConfig.medium
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className={`rounded-xl p-5 border ${config.border} ${config.bg}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <span className="text-white font-bold text-lg">"{issue.word}"</span>
                      <span className={`px-2 py-0.5 ${config.badge} ${config.text} text-xs font-bold rounded-full uppercase`}>
                        {issue.severity}
                      </span>
                      <span className="px-2 py-0.5 bg-slate-800/50 text-slate-400 text-xs rounded-full">
                        {issue.issue_type.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>

                  {/* Phoneme comparison */}
                  {(issue.user_pronunciation || issue.target_pronunciation) && (
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div className="bg-slate-900/50 rounded-lg p-3">
                        <span className="text-slate-500 text-xs block mb-1">Your pronunciation</span>
                        <span className="font-mono text-sm text-violet-400">{issue.user_pronunciation || 'N/A'}</span>
                      </div>
                      <div className="bg-slate-900/50 rounded-lg p-3">
                        <span className="text-slate-500 text-xs block mb-1">Target</span>
                        <span className="font-mono text-sm text-green-400">{issue.target_pronunciation || 'N/A'}</span>
                      </div>
                    </div>
                  )}

                  {/* Explanation */}
                  {issue.explanation && (
                    <p className="text-slate-300 text-sm mb-2">{issue.explanation}</p>
                  )}

                  {/* Fix instructions */}
                  {issue.fix_instructions && (
                    <div className="flex items-start space-x-2 mt-2 p-3 bg-slate-900/30 rounded-lg border border-white/5">
                      <Zap className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                      <p className="text-emerald-300 text-sm">{issue.fix_instructions}</p>
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>

          {hasMoreIssues && (
            <button
              onClick={() => setShowAllIssues(!showAllIssues)}
              className="mt-4 w-full py-2 text-sm text-slate-400 hover:text-white transition-colors flex items-center justify-center space-x-1"
            >
              {showAllIssues ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  <span>Show Less</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  <span>Show {feedback.issues.length - 3} More Issues</span>
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Drills */}
      {feedback.drills && (
        <div className="glass-card p-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500" />

          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <BookOpen className="w-5 h-5 text-emerald-400" />
            </div>
            <h3 className="text-lg font-bold text-white">Practice Drills</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Minimal Pairs */}
            {feedback.drills.minimal_pairs.length > 0 && (
              <div className="bg-slate-900/50 rounded-xl p-4 border border-white/5">
                <h4 className="text-sm font-bold text-emerald-400 mb-3 uppercase tracking-wider">Minimal Pairs</h4>
                <div className="space-y-2">
                  {feedback.drills.minimal_pairs.map((pair, i) => (
                    <div key={i} className="text-slate-300 text-sm font-mono">{pair}</div>
                  ))}
                </div>
              </div>
            )}

            {/* Repeat Phrases */}
            {feedback.drills.repeat_phrases.length > 0 && (
              <div className="bg-slate-900/50 rounded-xl p-4 border border-white/5">
                <h4 className="text-sm font-bold text-violet-400 mb-3 uppercase tracking-wider">Repeat Phrases</h4>
                <div className="space-y-2">
                  {feedback.drills.repeat_phrases.map((phrase, i) => (
                    <div key={i} className="text-slate-300 text-sm">"{phrase}"</div>
                  ))}
                </div>
              </div>
            )}

            {/* Focus Phonemes */}
            {feedback.drills.focus_phonemes.length > 0 && (
              <div className="bg-slate-900/50 rounded-xl p-4 border border-white/5">
                <h4 className="text-sm font-bold text-pink-400 mb-3 uppercase tracking-wider">Focus Phonemes</h4>
                <div className="flex flex-wrap gap-2">
                  {feedback.drills.focus_phonemes.map((phoneme, i) => (
                    <span key={i} className="px-3 py-1 bg-pink-500/10 border border-pink-500/20 text-pink-300 text-sm font-mono rounded-full">
                      {phoneme}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Strengths + Tips + Encouragement */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Strengths */}
        {feedback.strengths && feedback.strengths.length > 0 && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-card p-6"
          >
            <h4 className="text-sm font-bold text-green-400 mb-4 uppercase tracking-wider flex items-center space-x-2">
              <Award className="w-4 h-4" />
              <span>Strengths</span>
            </h4>
            <ul className="space-y-2">
              {feedback.strengths.map((s, i) => (
                <li key={i} className="flex items-start space-x-2 text-slate-300 text-sm">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        )}

        {/* Improvement Tips */}
        {feedback.improvement_tips && feedback.improvement_tips.length > 0 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-card p-6"
          >
            <h4 className="text-sm font-bold text-amber-400 mb-4 uppercase tracking-wider flex items-center space-x-2">
              <Zap className="w-4 h-4" />
              <span>Improvement Tips</span>
            </h4>
            <ul className="space-y-2">
              {feedback.improvement_tips.map((tip, i) => (
                <li key={i} className="flex items-start space-x-2 text-slate-300 text-sm">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </div>

      {/* Encouragement */}
      {feedback.encouragement && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-violet-500/10 via-pink-500/10 to-violet-500/10 border border-violet-500/20 rounded-2xl p-6 text-center"
        >
          <Sparkles className="w-6 h-6 text-violet-400 mx-auto mb-3" />
          <p className="text-violet-200 font-medium text-lg">{feedback.encouragement}</p>
        </motion.div>
      )}
    </motion.div>
  )
}
