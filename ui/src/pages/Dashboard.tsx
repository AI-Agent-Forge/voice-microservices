import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '../stores/auth'
import { usePracticeStore } from '../stores/practice'
import { Mic, TrendingUp, Clock, Award, Play, History } from 'lucide-react'

export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { sessions, loadSessions, isLoading } = usePracticeStore()

  useEffect(() => {
    loadSessions()
  }, [loadSessions])

  const handleQuickStart = () => {
    navigate('/practice')
  }

  const handleReviewSession = (sessionId: string) => {
    navigate(`/review/${sessionId}`)
  }

  const averageScore = sessions.length > 0 
    ? Math.round(sessions.reduce((acc, session) => acc + session.overall_score, 0) / sessions.length)
    : 0

  const recentSessions = sessions.slice(0, 3)

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="glass-card m-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Welcome back, {user?.email.split('@')[0]}!
            </h1>
            <p className="text-slate-400">
              Ready to improve your pronunciation today?
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm text-slate-400 font-medium">Subscription</p>
              <div className="flex items-center justify-end space-x-1">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                <p className="text-white font-bold capitalize tracking-wide">{user?.subscription_type}</p>
              </div>
            </div>
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 to-pink-600 rounded-full blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative w-12 h-12 bg-slate-900 ring-1 ring-white/10 rounded-full flex items-center justify-center">
                <Mic className="w-5 h-5 text-violet-400" />
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="px-6 space-y-8 max-w-7xl mx-auto pb-12">
        {/* Hero / Quick Start */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card relative overflow-hidden p-10 text-center group"
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-gradient-to-b from-violet-500/10 to-transparent pointer-events-none" />
          <div className="relative z-10 max-w-3xl mx-auto">
            <span className="inline-block py-1 px-3 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-bold tracking-wider mb-6">
              AI POWERED COACHING
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">
              Master Your <span className="text-gradient-violet">Pronunciation</span>
            </h2>
            <p className="text-slate-400 text-lg mb-10 max-w-2xl mx-auto leading-relaxed">
              Experience flow state learning with real-time visual feedback and AI voice comparison.
            </p>
            <button
              onClick={handleQuickStart}
              className="group/btn inline-flex items-center space-x-3 violet-button text-lg px-10 py-5"
            >
              <div className="bg-white/20 rounded-full p-1 group-hover/btn:scale-110 transition-transform">
                <Play className="w-4 h-4 fill-white" />
              </div>
              <span>Start Practice Session</span>
            </button>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-8 relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500">
              <TrendingUp className="w-24 h-24 text-green-400" />
            </div>
            <div className="relative z-10">
              <p className="text-slate-400 font-medium mb-2">Average Score</p>
              <div className="flex items-baseline space-x-2">
                <p className="text-4xl font-bold text-white">{averageScore}</p>
                <span className="text-sm text-green-400 font-medium">/ 100</span>
              </div>
              <div className="mt-4 h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-1000"
                  style={{ width: `${averageScore}%` }}
                />
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card p-8 relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500">
              <Clock className="w-24 h-24 text-violet-500" />
            </div>
            <div className="relative z-10">
              <p className="text-slate-400 font-medium mb-2">Total Sessions</p>
              <p className="text-4xl font-bold text-white">{sessions.length}</p>
              <p className="text-sm text-violet-400 mt-2 font-medium">Lifetime practice</p>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card p-8 relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500">
              <Award className="w-24 h-24 text-yellow-400" />
            </div>
            <div className="relative z-10">
              <p className="text-slate-400 font-medium mb-2">Best Score</p>
              <div className="flex items-baseline space-x-2">
                <p className="text-4xl font-bold text-white">
                  {sessions.length > 0 ? Math.max(...sessions.map(s => s.overall_score)) : 0}
                </p>
                <span className="text-sm text-yellow-400 font-medium">Personal Best</span>
              </div>
              <div className="mt-4 flex space-x-1">
                 {[1,2,3,4,5].map(i => (
                   <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= 4 ? 'bg-yellow-400/80' : 'bg-slate-800'}`} />
                 ))}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Recent Sessions */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card p-8"
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-bold text-white">Recent Activity</h3>
              <p className="text-slate-400 text-sm mt-1">Your latest pronunciation sessions</p>
            </div>
            <button className="p-2 hover:bg-white/5 rounded-lg transition-colors">
              <History className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full mx-auto"></div>
              <p className="text-slate-400 mt-2">Loading sessions...</p>
            </div>
          ) : recentSessions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-400">No practice sessions yet</p>
              <button
                onClick={handleQuickStart}
                className="mt-4 text-violet-400 hover:text-violet-300 font-medium"
              >
                Start your first session
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {recentSessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => handleReviewSession(session.id)}
                  className="glass-card-hover p-4 cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-white font-medium line-clamp-1">
                        {session.script_text}
                      </p>
                      <p className="text-slate-400 text-sm">
                        {new Date(session.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-2xl font-bold text-white">
                        {session.overall_score}
                      </p>
                      <p className="text-slate-400 text-sm">Score</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}