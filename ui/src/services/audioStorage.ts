import { set, get } from 'idb-keyval'

export const saveAudio = async (sessionId: string, blob: Blob) => {
  try {
    await set(`audio-${sessionId}`, blob)
    console.log(`Audio saved for session ${sessionId}`)
  } catch (error) {
    console.error('Failed to save audio to IndexedDB:', error)
  }
}

export const getAudio = async (sessionId: string): Promise<Blob | undefined> => {
  try {
    const blob = await get<Blob>(`audio-${sessionId}`)
    return blob
  } catch (error) {
    console.error('Failed to get audio from IndexedDB:', error)
    return undefined
  }
}
