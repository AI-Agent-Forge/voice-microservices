import axios from 'axios'
import { logger } from '../stores/debug'

const ASR_SERVICE_URL = 'http://localhost:8001' // ASR service runs on port 8001

export interface ASRWord {
  word: string
  start: number
  end: number
  confidence?: number
}

export interface ASRResponse {
  transcript: string
  words: ASRWord[]
  language: string
  duration?: number
  processing_time?: number
}

export const transcribeAudio = async (audioBlob: Blob): Promise<ASRResponse> => {
  const formData = new FormData()
  formData.append('file', audioBlob, 'recording.webm')

  logger.info('Sending audio to ASR service...', { size: audioBlob.size })

  try {
    const response = await axios.post<ASRResponse>(`${ASR_SERVICE_URL}/asr/process`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    logger.success('ASR processing complete', response.data)
    return response.data
  } catch (error) {
    logger.error('ASR Service Error', error)
    console.error('ASR Service Error:', error)
    throw error
  }
}
