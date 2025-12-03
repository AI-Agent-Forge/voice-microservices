// API Response Types based on technical architecture

export interface AudioTimestamps {
  start: number;
  end: number;
}

export interface WordAnalysis {
  word: string;
  timestamps: AudioTimestamps;
  accuracy_score: number;
  phonemes_user: string[];
  phonemes_target: string[];
  is_stress_error: boolean;
  error_severity: 'low' | 'medium' | 'high' | 'none';
}

export interface AnalysisResponse {
  transcript: string;
  overall_score: number;
  words: WordAnalysis[];
  
  audio_urls: {
    original: string;
    tts_us_standard: string;
    tts_user_clone: string;
  };

  feedback: {
    summary: string;
    rhythm_comment: string;
    improvements: string[];
  };
}

// User Types
export interface User {
  id: string;
  email: string;
  subscription_type: 'free' | 'premium';
  created_at: string;
}

// Practice Session Types
export interface PracticeSession {
  id: string;
  user_id: string;
  script_text: string;
  overall_score: number;
  audio_url: string;
  created_at: string;
  analysis?: AnalysisResponse;
}

// Practice Script Types
export interface PracticeScript {
  id: string;
  title: string;
  text: string;
  phonetic_transcription: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  category: string;
}