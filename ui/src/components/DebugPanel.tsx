import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Trash2, Terminal, AlertCircle, Info, CheckCircle, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import { useDebugStore, type LogEntry } from '../stores/debug'

export default function DebugPanel() {
  const { logs, isOpen, togglePanel, clearLogs } = useDebugStore()
  const logsEndRef = useRef<HTMLDivElement>(null)

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      fractionalSecondDigits: 3 
    })
  }

  const getIcon = (level: string) => {
    switch (level) {
      case 'error': return <AlertCircle className="w-4 h-4 text-red-400" />
      case 'warn': return <AlertTriangle className="w-4 h-4 text-yellow-400" />
      case 'success': return <CheckCircle className="w-4 h-4 text-green-400" />
      default: return <Info className="w-4 h-4 text-blue-400" />
    }
  }

  const getColor = (level: string) => {
    switch (level) {
      case 'error': return 'text-red-300 bg-red-500/10 border-red-500/20'
      case 'warn': return 'text-yellow-300 bg-yellow-500/10 border-yellow-500/20'
      case 'success': return 'text-green-300 bg-green-500/10 border-green-500/20'
      default: return 'text-blue-300 bg-blue-500/10 border-blue-500/20'
    }
  }

  return (
    <>
      {/* Toggle Button */}
      <motion.button
        onClick={togglePanel}
        className="fixed bottom-4 right-4 z-50 p-3 bg-slate-900/90 backdrop-blur-lg border border-slate-700 rounded-full shadow-lg hover:bg-slate-800 transition-colors"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Terminal className={`w-5 h-5 ${isOpen ? 'text-violet-400' : 'text-slate-400'}`} />
      </motion.button>

      {/* Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 h-96 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800 z-40 shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/50">
              <div className="flex items-center space-x-3">
                <Terminal className="w-4 h-4 text-violet-400" />
                <span className="font-mono text-sm font-bold text-slate-200">System Logs</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-xs text-slate-400 font-mono">
                  {logs.length}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={clearLogs}
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                  title="Clear logs"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={togglePanel}
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Logs List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-sm">
              {logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500">
                  <Terminal className="w-8 h-8 mb-2 opacity-50" />
                  <p>No logs captured yet</p>
                </div>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className={`flex items-start space-x-3 p-2 rounded-lg border ${getColor(log.level)}`}
                  >
                    <div className="mt-0.5 flex-shrink-0 opacity-70">
                      {getIcon(log.level)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-0.5">
                        <span className="text-xs opacity-50">{formatTime(log.timestamp)}</span>
                        <span className="font-bold uppercase text-xs tracking-wider opacity-80">
                          {log.level}
                        </span>
                      </div>
                      <p className="break-words whitespace-pre-wrap">{log.message}</p>
                      {log.data && (
                        <pre className="mt-2 p-2 bg-black/20 rounded text-xs overflow-x-auto">
                          {JSON.stringify(log.data, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                ))
              )}
              <div ref={logsEndRef} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
