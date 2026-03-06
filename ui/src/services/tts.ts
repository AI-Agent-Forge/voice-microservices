/**
 * TTS Service API
 * Integrates with TTS microservice (port 8005) for text-to-speech synthesis
 */

import axios from 'axios'
import { logger } from '../stores/debug'

const TTS_SERVICE_URL = 'http://localhost:8005'

// ============================================================
// TTS Service Types
// ============================================================

export interface TTSRequest {
    text: string
    voice?: string
    language?: string
}

export interface TTSResponse {
    audio_url: string
    voice: string
    model: string
    duration: number
    sample_rate: number
    format: string
    processing_time?: number
    mock?: boolean
    error?: string
}

export interface TTSVoice {
    name: string
    description?: string
}

export interface VoicesResponse {
    voices: string[]
    default_voice: string
    total: number
}

export interface TTSHealthResponse {
    status: string
    service: string
    version: string
    model: string
    default_voice: string
    mock_mode: boolean
}

// ============================================================
// TTS API Calls
// ============================================================

/**
 * Check if TTS service is healthy
 */
export const checkTTSHealth = async (): Promise<TTSHealthResponse> => {
    try {
        const response = await axios.get<TTSHealthResponse>(`${TTS_SERVICE_URL}/health`)
        return response.data
    } catch (error) {
        logger.error('TTS health check failed', error)
        throw error
    }
}

/**
 * Get available TTS voices
 */
export const getVoices = async (): Promise<VoicesResponse> => {
    try {
        const response = await axios.get<VoicesResponse>(`${TTS_SERVICE_URL}/tts/voices`)
        logger.success('Fetched TTS voices', { total: response.data.total })
        return response.data
    } catch (error) {
        logger.error('Failed to fetch TTS voices', error)
        throw error
    }
}

/**
 * Synthesize speech from text
 * @param text - The text to convert to speech
 * @param voice - Optional voice name (defaults to "Kore")
 * @param language - Optional language code (defaults to "en-US")
 */
export const synthesizeSpeech = async (
    text: string,
    voice?: string,
    language?: string
): Promise<TTSResponse> => {
    logger.info('Calling TTS service...', {
        textLength: text.length,
        voice: voice || 'default',
        language: language || 'en-US'
    })

    try {
        const response = await axios.post<TTSResponse>(`${TTS_SERVICE_URL}/tts/process`, {
            text,
            voice,
            language
        })

        logger.success('TTS synthesis complete', {
            duration: response.data.duration,
            voice: response.data.voice,
            audioUrl: response.data.audio_url
        })

        return response.data
    } catch (error) {
        logger.error('TTS synthesis failed', error)
        throw error
    }
}

/**
 * Generate reference audio for a target script
 * This creates the "standard US pronunciation" audio for comparison
 */
export const generateReferenceAudio = async (
    text: string,
    voice: string = 'Kore'
): Promise<string> => {
    try {
        const result = await synthesizeSpeech(text, voice, 'en-US')
        return result.audio_url
    } catch (error) {
        logger.error('Failed to generate reference audio', error)
        throw error
    }
}

/**
 * Convert storage URL to accessible URL
 * MinIO URLs need to be converted for browser access
 */
export const getAccessibleAudioUrl = (storageUrl: string): string => {
    // Replace internal MinIO URL with localhost accessible URL
    // Storage URL format: http://minio:9000/audio/tts/xxx.wav
    // Browser URL format: http://localhost:9000/audio/tts/xxx.wav
    if (storageUrl.includes('minio:9000')) {
        return storageUrl.replace('minio:9000', 'localhost:9000')
    }
    return storageUrl
}
