import { create } from 'zustand'
import type { PracticeSession, PracticeScript, AnalysisResponse } from '../types/api'

interface PracticeState {
  // Current practice session
  currentSession: PracticeSession | null
  isRecording: boolean
  recordingTime: number
  
  // Practice scripts
  availableScripts: PracticeScript[]
  selectedScript: PracticeScript | null
  
  // Session history
  sessions: PracticeSession[]
  isLoading: boolean
  
  // Actions
  startRecording: () => void
  stopRecording: () => void
  setRecordingTime: (time: number) => void
  selectScript: (script: PracticeScript) => void
  saveSession: (session: PracticeSession) => void
  loadSessions: () => Promise<void>
  loadScripts: () => Promise<void>
}

// Mock practice scripts
const mockScripts: PracticeScript[] = [
  {
    id: 'script-1',
    title: 'Daily Greetings',
    text: 'Good morning! How are you doing today? I hope you are having a wonderful day.',
    phonetic_transcription: '/ɡʊd ˈmɔːrnɪŋ/ /haʊ/ /ɑːr/ /juː/ /ˈduːɪŋ/ /təˈdeɪ/ /aɪ/ /hoʊp/ /juː/ /ɑːr/ /ˈhævɪŋ/ /ə/ /ˈwʌndərfʊl/ /deɪ/',
    difficulty: 'beginner',
    category: 'Daily Life'
  },
  {
    id: 'script-2',
    title: 'Business Introduction',
    text: 'Hello, my name is Sarah Johnson. I work as a marketing manager at a technology company. Nice to meet you!',
    phonetic_transcription: '/həˈloʊ/ /maɪ/ /neɪm/ /ɪz/ /ˈsɛrə/ /ˈdʒɒnsən/ /aɪ/ /wɜːrk/ /æz/ /ə/ /ˈmɑːrkɪtɪŋ/ /ˈmænɪdʒər/ /æt/ /ə/ /tɛkˈnɑːlədʒi/ /ˈkʌmpəni/ /naɪs/ /tuː/ /miːt/ /juː/',
    difficulty: 'intermediate',
    category: 'Business'
  },
  {
    id: 'script-3',
    title: 'Travel Conversation',
    text: 'I recently traveled to Japan and it was an amazing experience. The culture, food, and people were absolutely incredible.',
    phonetic_transcription: '/aɪ/ /ˈriːsəntli/ /ˈtrævəld/ /tuː/ /dʒəˈpæn/ /ænd/ /ɪt/ /wɒz/ /æn/ /əˈmeɪzɪŋ/ /ɪkˈspɪəriəns/ /ðə/ /ˈkʌltʃər/ /fuːd/ /ænd/ /ˈpiːpl/ /wɜːr/ /ˈæbsəluːtli/ /ɪnˈkrɛdəbl/',
    difficulty: 'advanced',
    category: 'Travel'
  }
]

// Mock sessions data
const mockSessions: PracticeSession[] = [
  {
    id: 'session-1',
    user_id: 'mock-user-123',
    script_text: 'Good morning! How are you doing today?',
    overall_score: 85,
    audio_url: 'mock-audio-url-1',
    created_at: new Date(Date.now() - 86400000).toISOString() // Yesterday
  },
  {
    id: 'session-2',
    user_id: 'mock-user-123',
    script_text: 'Hello, my name is Sarah Johnson.',
    overall_score: 92,
    audio_url: 'mock-audio-url-2',
    created_at: new Date(Date.now() - 172800000).toISOString() // 2 days ago
  }
]

export const usePracticeStore = create<PracticeState>((set, get) => ({
  currentSession: null,
  isRecording: false,
  recordingTime: 0,
  availableScripts: [],
  selectedScript: null,
  sessions: [],
  isLoading: false,

  startRecording: () => {
    set({ isRecording: true, recordingTime: 0 })
  },

  stopRecording: () => {
    set({ isRecording: false })
  },

  setRecordingTime: (time: number) => {
    set({ recordingTime: time })
  },

  selectScript: (script: PracticeScript) => {
    set({ selectedScript: script })
  },

  saveSession: (session: PracticeSession) => {
    set((state) => ({
      sessions: [session, ...state.sessions],
      currentSession: session
    }))
  },

  loadSessions: async () => {
    set({ isLoading: true })
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500))
    
    set({ 
      sessions: mockSessions,
      isLoading: false 
    })
  },

  loadScripts: async () => {
    set({ isLoading: true })
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 300))
    
    set({ 
      availableScripts: mockScripts,
      isLoading: false 
    })
  }
}))