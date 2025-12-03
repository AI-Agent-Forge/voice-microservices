import { create } from 'zustand'
import type { User } from '../types/api'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string) => Promise<void>
  logout: () => void
  checkAuth: () => Promise<void>
}

// Mock user data
const mockUser: User = {
  id: 'mock-user-123',
  email: 'demo@agentforge.ai',
  subscription_type: 'premium',
  created_at: new Date().toISOString()
}

export const useAuthStore = create<AuthState>((set) => ({
  user: mockUser,
  isAuthenticated: true,
  isLoading: false,

  login: async (email: string) => {
    set({ isLoading: true })
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Mock login - accept any email for demo
    const user: User = {
      ...mockUser,
      email: email || 'demo@agentforge.ai'
    }
    
    set({ 
      user, 
      isAuthenticated: true, 
      isLoading: false 
    })
  },

  logout: () => {
    set({ 
      user: null, 
      isAuthenticated: false 
    })
  },

  checkAuth: async () => {
    set({ isLoading: true })
    
    // Simulate checking auth status
    await new Promise(resolve => setTimeout(resolve, 300))
    
    // For demo purposes, auto-login with mock user
    set({ 
      user: mockUser, 
      isAuthenticated: true, 
      isLoading: false 
    })
  }
}))