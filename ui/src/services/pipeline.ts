import axios from 'axios'
import { logger } from '../stores/debug'
import type { ASRResponse } from './asr'

// Service URLs
const ASR_URL = 'http://localhost:8001'
const ALIGNMENT_URL = 'http://localhost:8002'
const PHONEME_MAP_URL = 'http://localhost:8003'
const PHONEME_DIFF_URL = 'http://localhost:8004'

// ============================================================
// Alignment Service Types
// ============================================================
export interface AlignmentPhoneme {
    char: string
    phoneme: string
    start: number
    end: number
}

export interface AlignmentResponse {
    transcript: string
    phonemes: AlignmentPhoneme[]
    audio_duration: number
}

// ============================================================
// Phoneme Map Service Types
// ============================================================
export interface PhonemeMapResponse {
    map: Record<string, string[]>
}

// ============================================================
// Phoneme Diff Service Types
// ============================================================
export interface IssueDetail {
    type: string
    pattern: string
    user_phoneme?: string
    target_phoneme?: string
    position: number
    description: string
}

export interface ComparisonResult {
    word: string
    user: string[]
    target: string[]
    issue: string
    severity: 'none' | 'low' | 'medium' | 'high'
    notes: string
    details: IssueDetail[]
}

export interface PhonemeDiffResponse {
    comparisons: ComparisonResult[]
}

// ============================================================
// Full Pipeline Response
// ============================================================
export interface PipelineResponse {
    asr: ASRResponse
    alignment: AlignmentResponse
    phonemeMap: PhonemeMapResponse
    phonemeDiff: PhonemeDiffResponse
    targetText: string
}

// ============================================================
// API Calls
// ============================================================

/**
 * Step 1: Transcribe audio using ASR service
 */
export const callASR = async (audioBlob: Blob): Promise<ASRResponse> => {
    const formData = new FormData()
    formData.append('file', audioBlob, 'recording.webm')

    logger.info('Calling ASR service...', { size: audioBlob.size })

    const response = await axios.post<ASRResponse>(`${ASR_URL}/asr/process`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    })

    logger.success('ASR complete', { transcript: response.data.transcript })
    return response.data
}

/**
 * Step 2: Get phoneme alignment for transcript
 */
export const callAlignment = async (
    transcript: string,
    words: { word: string; start: number; end: number }[]
): Promise<AlignmentResponse> => {
    logger.info('Calling Alignment service...', { transcript })

    const response = await axios.post<AlignmentResponse>(`${ALIGNMENT_URL}/alignment/process`, {
        transcript,
        words,
    })

    logger.success('Alignment complete', { phonemes: response.data.phonemes?.length })
    return response.data
}

/**
 * Step 3: Map words to canonical phonemes
 */
export const callPhonemeMap = async (words: string[]): Promise<PhonemeMapResponse> => {
    logger.info('Calling Phoneme-Map service...', { wordCount: words.length })

    const response = await axios.post<PhonemeMapResponse>(`${PHONEME_MAP_URL}/phoneme-map/process`, {
        words,
    })

    logger.success('Phoneme-Map complete', { mappedWords: Object.keys(response.data.map).length })
    return response.data
}

/**
 * Step 4: Compare user vs target phonemes
 */
export const callPhonemeDiff = async (
    userPhonemes: Record<string, string[]>,
    targetPhonemes: Record<string, string[]>
): Promise<PhonemeDiffResponse> => {
    logger.info('Calling Phoneme-Diff service...', {
        userWords: Object.keys(userPhonemes).length
    })

    const response = await axios.post<PhonemeDiffResponse>(`${PHONEME_DIFF_URL}/diff/process`, {
        user_phonemes: userPhonemes,
        target_phonemes: targetPhonemes,
    })

    logger.success('Phoneme-Diff complete', {
        comparisons: response.data.comparisons?.length
    })
    return response.data
}

// ============================================================
// Full Pipeline
// ============================================================

/**
 * Run the full pronunciation analysis pipeline
 * 
 * Flow: Audio → ASR → Alignment → Phoneme-Map → Phoneme-Diff
 */
export const runFullPipeline = async (
    audioBlob: Blob,
    targetText: string
): Promise<PipelineResponse> => {
    logger.info('Starting full pipeline analysis...', { targetText })

    try {
        // Step 1: ASR - Transcribe the audio
        const asr = await callASR(audioBlob)

        // Step 2: Alignment - Get phoneme timing from ASR result
        const alignment = await callAlignment(asr.transcript, asr.words)

        // Step 3: Get user's pronounced phonemes (from ASR words)
        const userWords = asr.words.map(w => w.word.toLowerCase())
        const uniqueUserWords = [...new Set(userWords)]
        const userPhonemeMapResult = await callPhonemeMap(uniqueUserWords)

        // Step 4: Get target phonemes from the target text
        const targetWords = targetText.toLowerCase().split(/\s+/).filter(w => w.length > 0)
        const uniqueTargetWords = [...new Set(targetWords)]
        const targetPhonemeMapResult = await callPhonemeMap(uniqueTargetWords)

        // Step 5: Compare user phonemes vs target phonemes
        // For words that appear in both user speech and target text
        const commonWords = uniqueUserWords.filter(w => uniqueTargetWords.includes(w))

        const userPhonemes: Record<string, string[]> = {}
        const targetPhonemes: Record<string, string[]> = {}

        for (const word of commonWords) {
            userPhonemes[word] = userPhonemeMapResult.map[word] || []
            targetPhonemes[word] = targetPhonemeMapResult.map[word] || []
        }

        // Also include words that user said but weren't in target (potential mistakes)
        for (const word of uniqueUserWords) {
            if (!commonWords.includes(word)) {
                userPhonemes[word] = userPhonemeMapResult.map[word] || []
                // Use same phonemes as target (they'll be "correct" pronunciation)
                targetPhonemes[word] = userPhonemeMapResult.map[word] || []
            }
        }

        const phonemeDiff = await callPhonemeDiff(userPhonemes, targetPhonemes)

        logger.success('Full pipeline complete!', {
            transcript: asr.transcript,
            alignmentPhonemes: alignment.phonemes?.length,
            comparisons: phonemeDiff.comparisons?.length
        })

        return {
            asr,
            alignment,
            phonemeMap: userPhonemeMapResult,
            phonemeDiff,
            targetText,
        }
    } catch (error) {
        logger.error('Pipeline failed', error)
        throw error
    }
}

/**
 * Calculate an overall pronunciation score based on diff results
 */
export const calculateScore = (diff: PhonemeDiffResponse): number => {
    if (!diff.comparisons || diff.comparisons.length === 0) {
        return 100
    }

    let totalScore = 0
    for (const comparison of diff.comparisons) {
        switch (comparison.severity) {
            case 'none':
                totalScore += 100
                break
            case 'low':
                totalScore += 85
                break
            case 'medium':
                totalScore += 65
                break
            case 'high':
                totalScore += 40
                break
        }
    }

    return Math.round(totalScore / diff.comparisons.length)
}

/**
 * Generate detailed feedback based on phoneme diff results
 * Uses actual service data to create meaningful improvement suggestions
 */
export const generateFeedback = (pipeline: PipelineResponse): {
    summary: string
    rhythm_comment: string
    improvements: string[]
    issueTypes: Record<string, number>
    strengths: string[]
} => {
    const { asr, alignment, phonemeDiff } = pipeline

    // Count issue types
    const issueTypes: Record<string, number> = {}
    const improvements: string[] = []
    const strengths: string[] = []

    if (!phonemeDiff?.comparisons) {
        return {
            summary: 'Unable to analyze pronunciation.',
            rhythm_comment: '',
            improvements: [],
            issueTypes: {},
            strengths: []
        }
    }

    const correctWords = phonemeDiff.comparisons.filter(c => c.severity === 'none')
    const problemWords = phonemeDiff.comparisons.filter(c => c.severity !== 'none')

    // Analyze issue patterns
    problemWords.forEach(comparison => {
        if (comparison.details && comparison.details.length > 0) {
            comparison.details.forEach(detail => {
                issueTypes[detail.type] = (issueTypes[detail.type] || 0) + 1
            })
        } else if (comparison.issue) {
            issueTypes[comparison.issue] = (issueTypes[comparison.issue] || 0) + 1
        }

        // Generate specific improvements
        if (comparison.notes) {
            improvements.push(`"${comparison.word}": ${comparison.notes}`)
        }
    })

    // Generate summary based on score
    const score = calculateScore(phonemeDiff)
    let summary = ''

    if (score >= 90) {
        summary = `Excellent pronunciation! ${correctWords.length} out of ${phonemeDiff.comparisons.length} words pronounced correctly.`
        strengths.push('Overall excellent accuracy')
    } else if (score >= 75) {
        summary = `Good effort! ${correctWords.length} words correct, ${problemWords.length} need practice.`
    } else if (score >= 60) {
        summary = `Keep practicing! ${problemWords.length} words need improvement out of ${phonemeDiff.comparisons.length} total.`
    } else {
        summary = `Focus on fundamentals. ${problemWords.length} words need significant practice.`
    }

    // Add rhythm comment from alignment data
    let rhythm_comment = ''
    if (alignment?.audio_duration) {
        const wordsPerMinute = (asr.words.length / alignment.audio_duration) * 60
        if (wordsPerMinute < 80) {
            rhythm_comment = `Speaking pace: ${wordsPerMinute.toFixed(0)} WPM (slow, but clear is good for practice)`
        } else if (wordsPerMinute < 150) {
            rhythm_comment = `Speaking pace: ${wordsPerMinute.toFixed(0)} WPM (natural conversational speed)`
        } else {
            rhythm_comment = `Speaking pace: ${wordsPerMinute.toFixed(0)} WPM (fast - consider slowing down for clarity)`
        }
    }

    // Identify strengths (correctly pronounced difficult phonemes)
    const difficultPhonemes = ['TH', 'R', 'L', 'V', 'W', 'CH', 'SH', 'ZH']
    correctWords.forEach(word => {
        word.target.forEach(phoneme => {
            const basePhoneme = phoneme.replace(/[0-9]/g, '')
            if (difficultPhonemes.includes(basePhoneme) && !strengths.includes(`Good "${basePhoneme}" sound`)) {
                strengths.push(`Good "${basePhoneme}" sound in "${word.word}"`)
            }
        })
    })

    // Generate priority improvements based on issue frequency
    const sortedIssues = Object.entries(issueTypes).sort((a, b) => b[1] - a[1])
    sortedIssues.slice(0, 3).forEach(([issueType, count]) => {
        const formattedIssue = issueType.replace(/_/g, ' ')
        improvements.unshift(`Focus on ${formattedIssue} (${count} occurrences)`)
    })

    return {
        summary,
        rhythm_comment,
        improvements: improvements.slice(0, 5),
        issueTypes,
        strengths: strengths.slice(0, 3)
    }
}
