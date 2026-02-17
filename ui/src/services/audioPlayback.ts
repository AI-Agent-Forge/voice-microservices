/**
 * Audio Playback Utilities
 * Supports playing specific segments of audio based on word timestamps from ASR service
 */

let audioContext: AudioContext | null = null
let currentSource: AudioBufferSourceNode | null = null

/**
 * Get or create AudioContext
 */
const getAudioContext = (): AudioContext => {
    if (!audioContext) {
        audioContext = new AudioContext()
    }
    return audioContext
}

/**
 * Stop any currently playing audio
 */
export const stopAudio = () => {
    if (currentSource) {
        try {
            currentSource.stop()
        } catch (e) {
            // Ignore - already stopped
        }
        currentSource = null
    }
}

/**
 * Play a segment of audio from a URL or Blob
 * Uses timestamps from ASR service to play specific word regions
 * 
 * @param audioSource - URL string or Blob of the audio
 * @param startTime - Start time in seconds (from ASR word.start)
 * @param endTime - End time in seconds (from ASR word.end)
 * @param padding - Optional padding in seconds to add around the segment
 */
export const playAudioSegment = async (
    audioSource: string | Blob,
    startTime: number,
    endTime: number,
    padding: number = 0.1
): Promise<void> => {
    stopAudio()

    const ctx = getAudioContext()

    // Resume context if suspended
    if (ctx.state === 'suspended') {
        await ctx.resume()
    }

    try {
        let arrayBuffer: ArrayBuffer

        if (typeof audioSource === 'string') {
            // Fetch from URL
            const response = await fetch(audioSource)
            arrayBuffer = await response.arrayBuffer()
        } else {
            // Read from Blob
            arrayBuffer = await audioSource.arrayBuffer()
        }

        // Decode the audio
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer)

        // Calculate segment with padding
        const start = Math.max(0, startTime - padding)
        const end = Math.min(audioBuffer.duration, endTime + padding)
        const duration = end - start

        // Create source node
        currentSource = ctx.createBufferSource()
        currentSource.buffer = audioBuffer
        currentSource.connect(ctx.destination)

        // Play the segment
        currentSource.start(0, start, duration)

        // Auto-cleanup when finished
        currentSource.onended = () => {
            currentSource = null
        }

        console.log(`Playing segment: ${start.toFixed(2)}s - ${end.toFixed(2)}s (duration: ${duration.toFixed(2)}s)`)
    } catch (error) {
        console.error('Failed to play audio segment:', error)
        throw error
    }
}

/**
 * Play the full audio from start to end
 */
export const playFullAudio = async (audioSource: string | Blob): Promise<void> => {
    stopAudio()

    const ctx = getAudioContext()

    if (ctx.state === 'suspended') {
        await ctx.resume()
    }

    try {
        let arrayBuffer: ArrayBuffer

        if (typeof audioSource === 'string') {
            const response = await fetch(audioSource)
            arrayBuffer = await response.arrayBuffer()
        } else {
            arrayBuffer = await audioSource.arrayBuffer()
        }

        const audioBuffer = await ctx.decodeAudioData(arrayBuffer)

        currentSource = ctx.createBufferSource()
        currentSource.buffer = audioBuffer
        currentSource.connect(ctx.destination)
        currentSource.start(0)

        currentSource.onended = () => {
            currentSource = null
        }
    } catch (error) {
        console.error('Failed to play audio:', error)
        throw error
    }
}

/**
 * Check if audio is currently playing
 */
export const isPlaying = (): boolean => {
    return currentSource !== null
}
