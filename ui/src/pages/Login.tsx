import { useState } from 'react'
import { useAuthStore } from '../stores/auth'
import { motion } from 'framer-motion'
import { Mic, Headphones, Brain } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const { login, isLoading } = useAuthStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (email.trim()) {
      await login(email.trim())
    }
  }

  const handleDemoLogin = async () => {
    await login('demo@agentforge.ai')
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-16 h-16 bg-violet-600 rounded-full flex items-center justify-center">
                <Mic className="w-8 h-8 text-white" />
              </div>
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-400 rounded-full flex items-center justify-center">
                <Brain className="w-3 h-3 text-slate-900" />
              </div>
            </div>
          </div>
          
          <h1 className="text-4xl font-bold text-white mb-2">
            AgentForge Voice Coach
          </h1>
          <p className="text-slate-400 text-lg">
            AI-powered pronunciation training for perfect English
          </p>
        </motion.div>

        {/* Features */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="glass-card p-6 space-y-4"
        >
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-violet-600 rounded-full flex items-center justify-center">
              <Headphones className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-white font-medium">Real-time Analysis</h3>
              <p className="text-slate-400 text-sm">Get instant feedback on your pronunciation</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-violet-600 rounded-full flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-white font-medium">AI Voice Comparison</h3>
              <p className="text-slate-400 text-sm">Compare with native speakers and AI clones</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-violet-600 rounded-full flex items-center justify-center">
              <Mic className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-white font-medium">Progress Tracking</h3>
              <p className="text-slate-400 text-sm">Monitor your improvement over time</p>
            </div>
          </div>
        </motion.div>

        {/* Login Form */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="glass-card p-6"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={isLoading}
              className="w-full violet-button disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Signing in...' : 'Get Started'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-slate-400 text-sm mb-3">Or try the demo</p>
            <button
              onClick={handleDemoLogin}
              disabled={isLoading}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white font-medium px-6 py-3 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue as Demo User
            </button>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="text-center"
        >
          <p className="text-slate-500 text-sm">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </motion.div>
      </div>
    </div>
  )
}