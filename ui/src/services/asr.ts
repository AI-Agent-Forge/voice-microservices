import axios from 'axios'
import { logger } from '../stores/debug'

const ASR_SERVICE_URL = 'http://localhost:8001' // Assuming ASR service runs on port 8001

export interface ASRResponse {
  transcript: string
  words: {
    word: string
    start: number
    end: number
  }[]
  language: string
}

export const transcribeAudio = async (audioBlob: Blob): Promise<ASRResponse> => {
  const formData = new FormData()
  formData.append('file', audioBlob, 'recording.webm')

  logger.info('Sending audio to ASR service...', { size: audioBlob.size })

  try {
    const response = await axios.post<ASRResponse>(`${ASR_SERVICE_URL}/process/`, formData, {
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
