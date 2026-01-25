import { motion, AnimatePresence } from 'framer-motion'
import { usePracticeStore } from '../stores/practice'
import { X, BookOpen } from 'lucide-react'

interface ScriptSelectorProps {
  onClose: () => void
}

export default function ScriptSelector({ onClose }: ScriptSelectorProps) {
  const { availableScripts, selectedScript, selectScript, isLoading } = usePracticeStore()

  const handleSelectScript = (script: any) => {
    selectScript(script)
    onClose()
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="glass-card max-w-2xl w-full max-h-[80vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <div className="flex items-center space-x-3">
              <BookOpen className="w-5 h-5 text-violet-400" />
              <h2 className="text-xl font-bold text-white">Choose Practice Script</h2>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[60vh]">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full mx-auto"></div>
                <p className="text-slate-400 mt-2">Loading scripts...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {availableScripts.map((script) => (
                  <motion.div
                    key={script.id}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className={`glass-card-hover p-4 cursor-pointer transition-all ${
                      selectedScript?.id === script.id 
                        ? 'ring-2 ring-violet-500 bg-slate-900/80' 
                        : ''
                    }`}
                    onClick={() => handleSelectScript(script)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-white">
                            {script.title}
                          </h3>
                          <span className={`px-2 py-1 text-xs rounded-full capitalize ${
                            script.difficulty === 'beginner' 
                              ? 'bg-green-400/20 text-green-400'
                              : script.difficulty === 'intermediate'
                              ? 'bg-yellow-400/20 text-yellow-400'
                              : 'bg-red-400/20 text-red-400'
                          }`}>
                            {script.difficulty}
                          </span>
                        </div>
                        
                        <p className="text-slate-300 mb-2 leading-relaxed">
                          {script.text}
                        </p>
                        
                        <p className="phonetic-text">
                          {script.phonetic_transcription}
                        </p>
                        
                        <span className="inline-block mt-2 px-2 py-1 bg-slate-800 text-slate-400 text-xs rounded">
                          {script.category}
                        </span>
                      </div>
                      
                      {selectedScript?.id === script.id && (
                        <div className="ml-4">
                          <div className="w-6 h-6 bg-violet-500 rounded-full flex items-center justify-center">
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-white/10">
            <p className="text-slate-400 text-sm text-center">
              Select a script to practice your pronunciation. Each script includes phonetic transcription.
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}