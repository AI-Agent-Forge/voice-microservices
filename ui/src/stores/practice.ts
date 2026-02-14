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

// Mock practice scripts - expanded library
const mockScripts: PracticeScript[] = [
  // Beginner Level
  {
    id: 'script-1',
    title: 'Daily Greetings',
    text: 'Good morning! How are you doing today? I hope you are having a wonderful day.',
    phonetic_transcription: '/ɡʊd ˈmɔːrnɪŋ/ /haʊ/ /ɑːr/ /juː/ /ˈduːɪŋ/ /təˈdeɪ/',
    difficulty: 'beginner',
    category: 'Daily Life'
  },
  {
    id: 'script-5',
    title: 'Simple Introduction',
    text: 'Hello, my name is Alex. I am from New York. Nice to meet you.',
    phonetic_transcription: '/həˈloʊ maɪ neɪm ɪz/ /ˈælɪks/ /aɪ æm frʌm nuː jɔːrk/ /naɪs tuː miːt juː/',
    difficulty: 'beginner',
    category: 'Self Introduction'
  },
  {
    id: 'script-6',
    title: 'Weather Talk',
    text: 'The weather is beautiful today. The sun is shining and the sky is clear.',
    phonetic_transcription: '/ðə weðər ɪz ˈbjuːtɪfəl təˈdeɪ/ /ðə sʌn ɪz ˈʃaɪnɪŋ/',
    difficulty: 'beginner',
    category: 'Daily Life'
  },
  {
    id: 'script-7',
    title: 'Thank You',
    text: 'Thank you very much for your help. I really appreciate it.',
    phonetic_transcription: '/θæŋk juː ˈveri mʌtʃ fɔːr jɔːr help/ /aɪ ˈrɪəli əˈpriːʃieɪt ɪt/',
    difficulty: 'beginner',
    category: 'Polite Expressions'
  },
  // Intermediate Level
  {
    id: 'script-2',
    title: 'Business Introduction',
    text: 'Hello, my name is Sarah Johnson. I work as a marketing manager at a technology company. Nice to meet you!',
    phonetic_transcription: '/həˈloʊ/ /maɪ/ /neɪm/ /ɪz/ /ˈsɛrə/ /ˈdʒɒnsən/',
    difficulty: 'intermediate',
    category: 'Business'
  },
  {
    id: 'script-8',
    title: 'Restaurant Order',
    text: 'Could I have the grilled salmon with vegetables please? And a glass of water, thank you.',
    phonetic_transcription: '/kʊd aɪ hæv ðə ɡrɪld ˈsæmən wɪð ˈvedʒtəbəlz pliːz/',
    difficulty: 'intermediate',
    category: 'Daily Life'
  },
  {
    id: 'script-9',
    title: 'Giving Directions',
    text: 'Turn left at the traffic light, then go straight for two blocks. The building is on your right.',
    phonetic_transcription: '/tɜːrn left æt ðə ˈtræfɪk laɪt/ /ðen ɡoʊ streɪt fɔːr tuː blɑːks/',
    difficulty: 'intermediate',
    category: 'Navigation'
  },
  {
    id: 'script-10',
    title: 'Phone Call',
    text: 'Hi, this is Michael calling from the customer service department. How may I assist you today?',
    phonetic_transcription: '/haɪ ðɪs ɪz ˈmaɪkəl ˈkɔːlɪŋ frʌm ðə ˈkʌstəmər ˈsɜːrvɪs dɪˈpɑːrtmənt/',
    difficulty: 'intermediate',
    category: 'Business'
  },
  // Advanced Level
  {
    id: 'script-3',
    title: 'Travel Conversation',
    text: 'I recently traveled to Japan and it was an amazing experience. The culture, food, and people were absolutely incredible.',
    phonetic_transcription: '/aɪ/ /ˈriːsəntli/ /ˈtrævəld/ /tuː/ /dʒəˈpæn/',
    difficulty: 'advanced',
    category: 'Travel'
  },
  {
    id: 'script-11',
    title: 'Technical Discussion',
    text: 'The algorithm processes data through multiple neural network layers, optimizing parameters using gradient descent methodology.',
    phonetic_transcription: '/ðə ˈælɡərɪðəm ˈprɑːsesɪz ˈdeɪtə θruː ˈmʌltɪpəl ˈnʊrəl ˈnetwɜːrk ˈleɪərz/',
    difficulty: 'advanced',
    category: 'Technology'
  },
  {
    id: 'script-12',
    title: 'Medical Appointment',
    text: 'I have been experiencing persistent headaches and occasional dizziness for the past three weeks. Should I be concerned?',
    phonetic_transcription: '/aɪ hæv biːn ɪkˈspɪəriənsɪŋ pərˈsɪstənt ˈhedeɪks ænd əˈkeɪʒənəl ˈdɪzinəs/',
    difficulty: 'advanced',
    category: 'Healthcare'
  },
  {
    id: 'script-13',
    title: 'Job Interview',
    text: 'My greatest strength is my ability to analyze complex problems and develop innovative solutions while collaborating effectively with diverse teams.',
    phonetic_transcription: '/maɪ ˈɡreɪtɪst streŋθ ɪz maɪ əˈbɪləti tuː ˈænəlaɪz kəmˈpleks ˈprɑːbləmz/',
    difficulty: 'advanced',
    category: 'Business'
  },
  {
    id: 'script-14',
    title: 'Academic Presentation',
    text: 'Our research demonstrates a statistically significant correlation between environmental factors and cognitive development in adolescents.',
    phonetic_transcription: '/aʊər rɪˈsɜːrtʃ ˈdemənstreɪts ə stəˈtɪstɪkli sɪɡˈnɪfɪkənt kɔːrəˈleɪʃən/',
    difficulty: 'advanced',
    category: 'Academic'
  },
  // Specific Sound Practice
  {
    id: 'script-15',
    title: 'TH Sound Practice',
    text: 'The three brothers thought that this thing was worth more than those other things.',
    phonetic_transcription: '/ðə θriː ˈbrʌðərz θɔːt ðæt ðɪs θɪŋ wʌz wɜːrθ mɔːr ðæn ðoʊz ˈʌðər θɪŋz/',
    difficulty: 'intermediate',
    category: 'Sound Practice'
  },
  {
    id: 'script-16',
    title: 'R and L Practice',
    text: 'Larry rarely relies on his relatives to really help him with the railroad regulations.',
    phonetic_transcription: '/ˈlæri ˈreərli rɪˈlaɪz ɑːn hɪz ˈrelətɪvz tuː ˈrɪəli help hɪm/',
    difficulty: 'intermediate',
    category: 'Sound Practice'
  },
  {
    id: 'script-17',
    title: 'V and W Practice',
    text: 'We went to view the wonderful waves at the village while the wind was very wild.',
    phonetic_transcription: '/wiː went tuː vjuː ðə ˈwʌndərfəl weɪvz æt ðə ˈvɪlɪdʒ/',
    difficulty: 'intermediate',
    category: 'Sound Practice'
  }
]

// Helper to persist sessions to localStorage
const SESSIONS_KEY = 'voice_practice_sessions'

const loadSessionsFromStorage = (): PracticeSession[] => {
  try {
    const stored = localStorage.getItem(SESSIONS_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (e) {
    console.error('Failed to load sessions from storage:', e)
  }
  return []
}

const saveSessionsToStorage = (sessions: PracticeSession[]) => {
  try {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions))
  } catch (e) {
    console.error('Failed to save sessions to storage:', e)
  }
}

// Helper to extract phoneme statistics from sessions
export const getPhonemeStatsFromSessions = (sessions: PracticeSession[]): Record<string, { errors: number; total: number }> => {
  const stats: Record<string, { errors: number; total: number }> = {}

  sessions.forEach(session => {
    if (session.pipeline?.phonemeDiff?.comparisons) {
      session.pipeline.phonemeDiff.comparisons.forEach(comparison => {
        comparison.user.forEach((phoneme, idx) => {
          const target = comparison.target[idx]
          if (!stats[target]) {
            stats[target] = { errors: 0, total: 0 }
          }
          stats[target].total++
          if (phoneme !== target) {
            stats[target].errors++
          }
        })
      })
    }
  })

  return stats
}

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
    set((state) => {
      const newSessions = [session, ...state.sessions]
      saveSessionsToStorage(newSessions)
      return {
        sessions: newSessions,
        currentSession: session
      }
    })
  },

  loadSessions: async () => {
    set({ isLoading: true })

    // Load from localStorage
    const storedSessions = loadSessionsFromStorage()

    set({
      sessions: storedSessions,
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