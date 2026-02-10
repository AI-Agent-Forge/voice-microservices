"""
Phoneme Map Service Logic - CMUdict Lookup with G2P Fallback

This service maps words to their canonical ARPAbet phoneme representations
using the CMU Pronouncing Dictionary (CMUdict) for known words and
g2p_en for out-of-vocabulary (OOV) words.
"""

import re
import logging
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)

# Global caches
_CMUDICT = None
_G2P = None


def get_cmudict() -> Dict[str, List[List[str]]]:
    """
    Load the CMU Pronouncing Dictionary from NLTK.
    Returns a dictionary mapping lowercase words to lists of pronunciations.
    Each pronunciation is a list of ARPAbet phonemes.
    """
    global _CMUDICT
    if _CMUDICT is None:
        try:
            import nltk
            from nltk.corpus import cmudict
            
            # Ensure cmudict is downloaded
            try:
                _CMUDICT = cmudict.dict()
            except LookupError:
                logger.info("Downloading CMUdict...")
                nltk.download('cmudict', quiet=True)
                _CMUDICT = cmudict.dict()
            
            logger.info(f"CMUdict loaded with {len(_CMUDICT)} entries")
        except Exception as e:
            logger.error(f"Failed to load CMUdict: {e}")
            _CMUDICT = {}
    return _CMUDICT


def get_g2p():
    """Load the grapheme-to-phoneme model (g2p_en) for OOV words."""
    global _G2P
    if _G2P is None:
        try:
            from g2p_en import G2p
            _G2P = G2p()
            logger.info("G2P model loaded for OOV fallback")
        except ImportError as e:
            logger.warning(f"g2p_en not available: {e}")
            _G2P = None
    return _G2P


def normalize_word(word: str) -> str:
    """
    Normalize a word for CMUdict lookup.
    - Lowercase
    - Remove punctuation except apostrophes (for contractions)
    """
    # Keep apostrophes for words like "don't", "it's"
    normalized = re.sub(r"[^a-zA-Z']", "", word.lower())
    return normalized


def clean_phoneme(phoneme: str) -> str:
    """
    Clean a phoneme by removing stress markers (0, 1, 2) for consistency.
    Example: "AH0" -> "AH", "IY1" -> "IY"
    """
    return re.sub(r'[0-9]', '', phoneme).upper()


def lookup_word(word: str, keep_stress: bool = False) -> Optional[List[str]]:
    """
    Look up a word in CMUdict.
    
    Args:
        word: The word to look up
        keep_stress: If True, keep stress markers on vowels (0, 1, 2)
    
    Returns:
        List of ARPAbet phonemes, or None if not found
    """
    cmudict = get_cmudict()
    normalized = normalize_word(word)
    
    if not normalized:
        return None
    
    if normalized in cmudict:
        # CMUdict may have multiple pronunciations; take the first (most common)
        phonemes = cmudict[normalized][0]
        
        if keep_stress:
            return [p.upper() for p in phonemes]
        else:
            return [clean_phoneme(p) for p in phonemes]
    
    return None


def g2p_fallback(word: str) -> List[str]:
    """
    Use G2P (grapheme-to-phoneme) for words not in CMUdict.
    
    Args:
        word: The word to convert
    
    Returns:
        List of ARPAbet phonemes
    """
    g2p = get_g2p()
    
    if g2p is None:
        logger.warning(f"G2P not available, returning empty for OOV word: {word}")
        return []
    
    normalized = normalize_word(word)
    if not normalized:
        return []
    
    try:
        phonemes_raw = g2p(normalized)
        
        # Filter and clean phonemes
        phonemes = []
        for p in phonemes_raw:
            p = p.strip()
            if p and p != ' ':
                phonemes.append(clean_phoneme(p))
        
        return phonemes
    except Exception as e:
        logger.error(f"G2P failed for word '{word}': {e}")
        return []


def map_word_to_phonemes(word: str) -> List[str]:
    """
    Map a single word to its ARPAbet phoneme representation.
    
    First tries CMUdict lookup, then falls back to G2P for OOV words.
    
    Args:
        word: The word to map
    
    Returns:
        List of ARPAbet phonemes
    """
    # Try CMUdict first
    phonemes = lookup_word(word)
    
    if phonemes:
        logger.debug(f"CMUdict hit: '{word}' -> {phonemes}")
        return phonemes
    
    # Fallback to G2P
    logger.info(f"OOV word '{word}', using G2P fallback")
    phonemes = g2p_fallback(word)
    
    if phonemes:
        logger.debug(f"G2P result: '{word}' -> {phonemes}")
    else:
        logger.warning(f"No phonemes found for word: '{word}'")
    
    return phonemes


async def run_service_logic(req) -> Dict[str, any]:
    """
    Main entry point for the phoneme map service.
    
    Takes a list of words and returns a mapping of each word to its
    canonical ARPAbet phoneme representation.
    
    Input: {"words": ["hello", "world"]}
    Output: {"map": {"hello": ["HH", "AH", "L", "OW"], "world": ["W", "ER", "L", "D"]}}
    """
    logger.info("=" * 50)
    logger.info("PHONEME MAP SERVICE - Processing Request")
    logger.info("=" * 50)
    logger.info(f"Words received: {req.words}")
    
    result_map = {}
    oov_count = 0
    
    for word in req.words:
        if not word or not word.strip():
            continue
        
        phonemes = map_word_to_phonemes(word)
        
        # Use original word as key (preserve case for response)
        result_map[word] = phonemes
        
        # Track OOV
        normalized = normalize_word(word)
        if normalized and normalized not in get_cmudict():
            oov_count += 1
    
    logger.info(f"Mapped {len(result_map)} words ({oov_count} OOV)")
    logger.info("=" * 50)
    
    return {"map": result_map}

