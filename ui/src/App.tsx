import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore } from './stores/auth'
import Dashboard from './pages/Dashboard'
import PracticeArena from './pages/PracticeArena'
import ReviewSession from './pages/ReviewSession'
import Login from './pages/Login'
import DebugPanel from './components/DebugPanel'

function App() {
  const { isAuthenticated, checkAuth } = useAuthStore()

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-950">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/practice" element={<PracticeArena />} />
          <Route path="/review/:sessionId" element={<ReviewSession />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <DebugPanel />
      </div>
    </BrowserRouter>
  )
}

export default App