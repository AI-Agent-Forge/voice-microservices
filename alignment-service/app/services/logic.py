"""
Alignment Service Logic - Real Phoneme Forced Alignment

This module performs phoneme-level forced alignment using:
- g2p_en for grapheme-to-phoneme conversion (ARPAbet)
- Audio duration analysis
- Word boundary constraints from ASR timestamps
"""

import logging
import os
import requests
import tempfile
import re
import librosa
from pathlib import Path
from typing import List, Dict, Any, Optional
from app.core.config import settings
from app.schemas.request_response import Phoneme, AlignmentResponse, WordInput

logger = logging.getLogger(__name__)

# Global G2P model
_G2P = None


def get_g2p():
    """Load the grapheme-to-phoneme model (g2p_en)."""
    global _G2P
    if _G2P is None:
        try:
            from g2p_en import G2p
            _G2P = G2p()
            logger.info("G2P model loaded successfully")
        except ImportError as e:
            logger.error("g2p_en not installed. Install with: pip install g2p_en")
            raise RuntimeError("g2p_en not available") from e
    return _G2P


def word_to_phonemes(word: str) -> List[str]:
    """
    Convert a word to its ARPAbet phoneme sequence using g2p_en.
    
    Returns list of phoneme symbols (without stress markers for simplicity).
    Example: "hello" -> ["HH", "AH", "L", "OW"]
    """
    g2p = get_g2p()
    
    # Clean the word - keep only alphabetic characters
    clean_word = re.sub(r'[^a-zA-Z]', '', word.lower())
    if not clean_word:
        return []
    
    # Get phonemes from g2p_en
    phonemes_raw = g2p(clean_word)
    
    # Filter out spaces and clean up stress markers
    phonemes = []
    for p in phonemes_raw:
        p = p.strip()
        if not p or p == ' ':
            continue
        # Remove stress markers (0, 1, 2) from vowels for cleaner output
        # but keep them if you want stress info
        p_clean = re.sub(r'[0-9]', '', p)
        if p_clean:
            phonemes.append(p_clean.upper())
    
    return phonemes


def distribute_phonemes_in_word(
    word: str,
    word_start: float,
    word_end: float,
    phonemes: List[str]
) -> List[Phoneme]:
    """
    Distribute phonemes evenly within the word's time boundaries.
    
    This is a simple but effective approach when we have word boundaries
    but not frame-level alignment data. Phonemes are distributed proportionally.
    
    For more accurate alignment, you could use audio analysis to weight
    phoneme durations based on acoustic features.
    """
    if not phonemes:
        return []
    
    word_duration = word_end - word_start
    if word_duration <= 0:
        # Invalid duration, assign minimal time
        word_duration = 0.01
    
    num_phonemes = len(phonemes)
    phoneme_duration = word_duration / num_phonemes
    
    result = []
    current_time = word_start
    
    for i, phoneme_symbol in enumerate(phonemes):
        # Calculate start and end for this phoneme
        start = current_time
        end = current_time + phoneme_duration
        
        # Ensure last phoneme ends exactly at word_end
        if i == num_phonemes - 1:
            end = word_end
        
        result.append(Phoneme(
            symbol=phoneme_symbol,
            word=word,
            start=round(start, 4),
            end=round(end, 4),
            confidence=0.9  # High confidence when using word boundaries
        ))
        
        current_time = end
    
    return result


def get_audio_duration(audio_path: str) -> float:
    """Get the duration of an audio file in seconds using librosa."""
    try:
        duration = librosa.get_duration(path=audio_path)
        return duration
    except Exception as e:
        logger.warning(f"Could not get audio duration with librosa.get_duration: {e}")
        # Fallback: load the audio
        try:
            y, sr = librosa.load(audio_path, sr=None)
            return len(y) / sr
        except Exception as e2:
            logger.error(f"Failed to get audio duration: {e2}")
            raise


def align_with_word_boundaries(
    transcript: str,
    words: List[WordInput],
    audio_duration: float
) -> List[Phoneme]:
    """
    Perform phoneme alignment using word boundaries from ASR.
    
    This approach:
    1. Uses word timestamps from ASR as boundaries
    2. Converts each word to phonemes using g2p_en
    3. Distributes phonemes within each word's time range
    """
    logger.info(f"Aligning transcript: '{transcript}'")
    logger.info(f"Number of words with timestamps: {len(words)}")
    
    all_phonemes = []
    
    for word_info in words:
        word = word_info.word
        word_start = word_info.start
        word_end = word_info.end
        
        # Validate word boundaries
        if word_start < 0:
            word_start = 0
        if word_end > audio_duration:
            word_end = audio_duration
        if word_start >= word_end:
            # Skip invalid words
            logger.warning(f"Skipping word '{word}' with invalid timing: {word_start} - {word_end}")
            continue
        
        # Convert word to phonemes
        phonemes = word_to_phonemes(word)
        
        if not phonemes:
            logger.warning(f"No phonemes generated for word: '{word}'")
            continue
        
        # Distribute phonemes within word boundaries
        word_phonemes = distribute_phonemes_in_word(
            word=word,
            word_start=word_start,
            word_end=word_end,
            phonemes=phonemes
        )
        
        all_phonemes.extend(word_phonemes)
    
    logger.info(f"Total phonemes generated: {len(all_phonemes)}")
    logger.info(f"Audio duration: {audio_duration:.3f}s")
    
    return all_phonemes


def align_transcript_only(
    transcript: str,
    audio_duration: float
) -> List[Phoneme]:
    """
    Fallback alignment when no word boundaries are provided.
    
    Splits transcript into words, distributes time proportionally.
    """
    logger.info(f"Aligning transcript without word boundaries: '{transcript}'")
    
    # Split transcript into words
    words = transcript.split()
    if not words:
        return []
    
    # Get phoneme count for each word to distribute time proportionally
    word_phonemes_map = []
    total_phoneme_count = 0
    
    for word in words:
        phonemes = word_to_phonemes(word)
        word_phonemes_map.append({
            'word': word,
            'phonemes': phonemes,
            'count': len(phonemes) if phonemes else 1
        })
        total_phoneme_count += len(phonemes) if phonemes else 1
    
    if total_phoneme_count == 0:
        return []
    
    # Distribute time based on phoneme count
    time_per_phoneme = audio_duration / total_phoneme_count
    current_time = 0.0
    all_phonemes = []
    
    for entry in word_phonemes_map:
        word = entry['word']
        phonemes = entry['phonemes']
        
        if not phonemes:
            continue
        
        word_start = current_time
        word_duration = len(phonemes) * time_per_phoneme
        
        for i, phoneme_symbol in enumerate(phonemes):
            start = current_time
            end = current_time + time_per_phoneme
            
            all_phonemes.append(Phoneme(
                symbol=phoneme_symbol,
                word=word,
                start=round(start, 4),
                end=round(end, 4),
                confidence=0.7  # Lower confidence without word boundaries
            ))
            
            current_time = end
    
    logger.info(f"Total phonemes generated: {len(all_phonemes)}")
    logger.info(f"Audio duration: {audio_duration:.3f}s")
    
    return all_phonemes


async def run_service_logic(req) -> Dict[str, Any]:
    """
    Main entry point for alignment service.
    
    1. Download/Load Audio
    2. Get audio duration
    3. Perform phoneme alignment using word boundaries (if provided)
       or fall back to transcript-only alignment
    4. Return phoneme timestamps
    """
    logger.info("=" * 50)
    logger.info("ALIGNMENT SERVICE - Processing Request")
    logger.info("=" * 50)
    logger.info(f"Transcript received: '{req.transcript}'")
    logger.info(f"Words provided: {len(req.words) if req.words else 0}")
    
    user_audio_path = ""
    is_temp_file = False
    audio_duration = 0.0
    
    try:
        # 1. Determine audio duration - either from audio_url or from word timestamps
        if hasattr(req, "audio_url") and req.audio_url:
            logger.info(f"Downloading audio from: {req.audio_url}")
            
            # Handle local file paths
            if os.path.exists(req.audio_url):
                user_audio_path = req.audio_url
                logger.info("Using local audio file")
            else:
                # Download from URL
                resp = requests.get(req.audio_url, timeout=30)
                resp.raise_for_status()
                
                with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
                    tmp.write(resp.content)
                    user_audio_path = tmp.name
                    is_temp_file = True
                    logger.info(f"Audio downloaded to: {user_audio_path}")
            
            # Get audio duration from file
            audio_duration = get_audio_duration(user_audio_path)
        elif req.words and len(req.words) > 0:
            # No audio URL but we have word timestamps - compute duration from words
            audio_duration = max(w.end for w in req.words) if req.words else 0.0
            logger.info(f"No audio_url provided, using word timestamps to compute duration: {audio_duration:.3f}s")
        else:
            # No audio and no words - use a default duration estimate
            # Estimate ~0.3 seconds per word
            word_count = len(req.transcript.split())
            audio_duration = word_count * 0.3
            logger.warning(f"No audio_url or words provided, estimating duration: {audio_duration:.3f}s")
        
        logger.info(f"Audio duration: {audio_duration:.3f} seconds")
        
        # 2. Perform alignment
        if req.words and len(req.words) > 0:
            # Use word boundaries for accurate alignment
            phonemes = align_with_word_boundaries(
                transcript=req.transcript,
                words=req.words,
                audio_duration=audio_duration
            )
        else:
            # Fall back to transcript-only alignment
            phonemes = align_transcript_only(
                transcript=req.transcript,
                audio_duration=audio_duration
            )
        
        # 3. Build response
        logger.info("=" * 50)
        logger.info(f"ALIGNMENT COMPLETE")
        logger.info(f"Phonemes generated: {len(phonemes)}")
        logger.info(f"Duration: {audio_duration:.3f}s")
        logger.info("=" * 50)
        
        return AlignmentResponse(
            phonemes=phonemes,
            duration=round(audio_duration, 4)
        )
    
    except Exception as e:
        logger.error(f"Alignment processing error: {e}")
        raise
    
    finally:
        # Cleanup temporary file
        if is_temp_file and user_audio_path and os.path.exists(user_audio_path):
            try:
                os.remove(user_audio_path)
                logger.info("Cleaned up temporary audio file")
            except Exception as e:
                logger.warning(f"Failed to cleanup temp file: {e}")
