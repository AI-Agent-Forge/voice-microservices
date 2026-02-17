"""
Phoneme Diff Service Logic - Compare User vs Target Phonemes

This service compares user-produced phonemes against target (CMUdict) phonemes
to identify pronunciation issues like vowel shifts, consonant errors, etc.
"""

import logging
from typing import List, Dict, Any, Optional, Tuple
from difflib import SequenceMatcher

logger = logging.getLogger(__name__)

# ARPAbet phoneme categories for error classification
VOWELS = {
    'AA', 'AE', 'AH', 'AO', 'AW', 'AY', 'EH', 'ER', 'EY', 
    'IH', 'IY', 'OW', 'OY', 'UH', 'UW'
}

CONSONANTS = {
    'B', 'CH', 'D', 'DH', 'F', 'G', 'HH', 'JH', 'K', 'L', 'M', 
    'N', 'NG', 'P', 'R', 'S', 'SH', 'T', 'TH', 'V', 'W', 'Y', 'Z', 'ZH'
}

# Schwa - the reduced vowel sound
SCHWA = 'AH'

# Common vowel confusions (based on accent patterns)
VOWEL_CONFUSION_PAIRS = {
    ('AA', 'AH'): 'schwa_substitution',
    ('AH', 'AA'): 'schwa_substitution',
    ('AE', 'EH'): 'front_vowel_confusion',
    ('EH', 'AE'): 'front_vowel_confusion',
    ('IH', 'IY'): 'tense_lax_vowel',
    ('IY', 'IH'): 'tense_lax_vowel',
    ('UH', 'UW'): 'tense_lax_vowel',
    ('UW', 'UH'): 'tense_lax_vowel',
    ('AH', 'ER'): 'r_coloring_error',
    ('ER', 'AH'): 'r_coloring_error',
    ('AO', 'AA'): 'back_vowel_confusion',
    ('AA', 'AO'): 'back_vowel_confusion',
}

# Consonant confusion patterns (common L1 interference)
CONSONANT_CONFUSION_PAIRS = {
    ('V', 'W'): 'v_w_confusion',
    ('W', 'V'): 'v_w_confusion',
    ('TH', 'T'): 'th_stopping',
    ('T', 'TH'): 'th_stopping',
    ('TH', 'D'): 'th_stopping',
    ('D', 'TH'): 'th_stopping',
    ('DH', 'D'): 'th_stopping',
    ('D', 'DH'): 'th_stopping',
    ('DH', 'T'): 'th_stopping',
    ('T', 'DH'): 'th_stopping',
    ('R', 'L'): 'r_l_confusion',
    ('L', 'R'): 'r_l_confusion',
    ('S', 'SH'): 'sibilant_confusion',
    ('SH', 'S'): 'sibilant_confusion',
    ('Z', 'ZH'): 'sibilant_confusion',
    ('ZH', 'Z'): 'sibilant_confusion',
    ('P', 'B'): 'voicing_error',
    ('B', 'P'): 'voicing_error',
    ('T', 'D'): 'voicing_error',
    ('D', 'T'): 'voicing_error',
    ('K', 'G'): 'voicing_error',
    ('G', 'K'): 'voicing_error',
    ('F', 'V'): 'voicing_error',
    ('V', 'F'): 'voicing_error',
    ('S', 'Z'): 'voicing_error',
    ('Z', 'S'): 'voicing_error',
}


def classify_phoneme(phoneme: str) -> str:
    """Classify a phoneme as vowel, consonant, or unknown."""
    p = phoneme.upper()
    if p in VOWELS:
        return 'vowel'
    elif p in CONSONANTS:
        return 'consonant'
    return 'unknown'


def get_issue_type(user_phoneme: str, target_phoneme: str) -> Tuple[str, str]:
    """
    Determine the type of pronunciation issue between two phonemes.
    
    Returns: (issue_type, specific_pattern)
    """
    user_p = user_phoneme.upper()
    target_p = target_phoneme.upper()
    
    user_class = classify_phoneme(user_p)
    target_class = classify_phoneme(target_p)
    
    # Check for known confusion pairs
    pair = (user_p, target_p)
    
    if pair in VOWEL_CONFUSION_PAIRS:
        return ('vowel_shift', VOWEL_CONFUSION_PAIRS[pair])
    
    if pair in CONSONANT_CONFUSION_PAIRS:
        return ('consonant_error', CONSONANT_CONFUSION_PAIRS[pair])
    
    # Generic classification
    if user_class == 'vowel' and target_class == 'vowel':
        return ('vowel_shift', 'generic_vowel_substitution')
    
    if user_class == 'consonant' and target_class == 'consonant':
        return ('consonant_error', 'generic_consonant_substitution')
    
    if user_class != target_class:
        return ('phoneme_class_mismatch', f'{user_class}_for_{target_class}')
    
    return ('substitution', 'unknown_pattern')


def calculate_severity(issues: List[Dict]) -> str:
    """
    Calculate overall severity based on the issues found.
    
    - low: 1 minor issue
    - medium: 2-3 issues or 1 significant issue
    - high: 4+ issues or critical patterns
    """
    if not issues:
        return 'none'
    
    critical_patterns = {'th_stopping', 'v_w_confusion', 'r_l_confusion'}
    
    critical_count = sum(1 for i in issues if i.get('pattern') in critical_patterns)
    total_count = len(issues)
    
    if critical_count >= 2 or total_count >= 4:
        return 'high'
    elif critical_count >= 1 or total_count >= 2:
        return 'medium'
    else:
        return 'low'


def compare_phoneme_sequences(
    user_phonemes: List[str],
    target_phonemes: List[str]
) -> List[Dict[str, Any]]:
    """
    Compare two phoneme sequences and identify mismatches.
    
    Uses sequence matching to align phonemes and find:
    - Substitutions (wrong phoneme)
    - Insertions (extra phoneme)
    - Deletions (missing phoneme)
    """
    issues = []
    
    # Normalize to uppercase
    user = [p.upper() for p in user_phonemes]
    target = [p.upper() for p in target_phonemes]
    
    # Use SequenceMatcher to find optimal alignment
    matcher = SequenceMatcher(None, user, target)
    
    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == 'equal':
            # Phonemes match - no issue
            continue
        
        elif tag == 'replace':
            # Substitution - wrong phoneme(s)
            for idx in range(max(i2 - i1, j2 - j1)):
                user_idx = i1 + idx if i1 + idx < i2 else None
                target_idx = j1 + idx if j1 + idx < j2 else None
                
                if user_idx is not None and target_idx is not None:
                    user_p = user[user_idx]
                    target_p = target[target_idx]
                    issue_type, pattern = get_issue_type(user_p, target_p)
                    
                    issues.append({
                        'type': issue_type,
                        'pattern': pattern,
                        'user_phoneme': user_p,
                        'target_phoneme': target_p,
                        'position': user_idx,
                        'description': f"'{user_p}' should be '{target_p}'"
                    })
                elif user_idx is not None:
                    # Extra phoneme in user
                    issues.append({
                        'type': 'insertion',
                        'pattern': 'extra_phoneme',
                        'user_phoneme': user[user_idx],
                        'target_phoneme': None,
                        'position': user_idx,
                        'description': f"Extra '{user[user_idx]}' not in target"
                    })
                elif target_idx is not None:
                    # Missing phoneme from user
                    issues.append({
                        'type': 'deletion',
                        'pattern': 'missing_phoneme',
                        'user_phoneme': None,
                        'target_phoneme': target[target_idx],
                        'position': j1 + idx,
                        'description': f"Missing '{target[target_idx]}'"
                    })
        
        elif tag == 'delete':
            # User has extra phonemes
            for idx in range(i1, i2):
                issues.append({
                    'type': 'insertion',
                    'pattern': 'extra_phoneme',
                    'user_phoneme': user[idx],
                    'target_phoneme': None,
                    'position': idx,
                    'description': f"Extra '{user[idx]}' not in target"
                })
        
        elif tag == 'insert':
            # User is missing phonemes
            for idx in range(j1, j2):
                issues.append({
                    'type': 'deletion',
                    'pattern': 'missing_phoneme',
                    'user_phoneme': None,
                    'target_phoneme': target[idx],
                    'position': idx,
                    'description': f"Missing '{target[idx]}'"
                })
    
    return issues


def compare_word_phonemes(
    word: str,
    user_phonemes: List[str],
    target_phonemes: List[str]
) -> Dict[str, Any]:
    """
    Compare phonemes for a single word and generate a comparison result.
    """
    issues = compare_phoneme_sequences(user_phonemes, target_phonemes)
    severity = calculate_severity(issues)
    
    # Generate summary notes
    notes_parts = []
    for issue in issues[:3]:  # Limit to first 3 for brevity
        if issue['user_phoneme'] and issue['target_phoneme']:
            notes_parts.append(f"{issue['user_phoneme']} → {issue['target_phoneme']}")
        elif issue['user_phoneme']:
            notes_parts.append(f"+{issue['user_phoneme']}")
        elif issue['target_phoneme']:
            notes_parts.append(f"-{issue['target_phoneme']}")
    
    notes = ', '.join(notes_parts) if notes_parts else 'exact match'
    
    # Determine primary issue type
    issue_types = [i['type'] for i in issues]
    if 'vowel_shift' in issue_types:
        primary_issue = 'vowel_shift'
    elif 'consonant_error' in issue_types:
        primary_issue = 'consonant_error'
    elif 'deletion' in issue_types:
        primary_issue = 'missing_phoneme'
    elif 'insertion' in issue_types:
        primary_issue = 'extra_phoneme'
    elif issues:
        primary_issue = issues[0]['type']
    else:
        primary_issue = 'none'
    
    return {
        'word': word,
        'user': user_phonemes,
        'target': target_phonemes,
        'issue': primary_issue,
        'severity': severity,
        'notes': notes,
        'details': issues
    }


async def run_service_logic(req) -> Dict[str, Any]:
    """
    Main entry point for the phoneme diff service.
    
    Compares user phonemes against target phonemes for each word
    and returns detailed comparison results with severity scores.
    
    Input format:
    {
        "user_phonemes": {"hello": ["HH", "AA", "L", "O"]},
        "target_phonemes": {"hello": ["HH", "AH", "L", "OW"]}
    }
    
    Output format:
    {
        "comparisons": [
            {
                "word": "hello",
                "user": ["HH", "AA", "L", "O"],
                "target": ["HH", "AH", "L", "OW"],
                "issue": "vowel_shift",
                "severity": "medium",
                "notes": "AA → AH, O → OW",
                "details": [...]
            }
        ]
    }
    """
    logger.info("=" * 50)
    logger.info("PHONEME DIFF SERVICE - Processing Request")
    logger.info("=" * 50)
    
    user_phonemes = req.user_phonemes
    target_phonemes = req.target_phonemes
    
    logger.info(f"User phonemes: {len(user_phonemes)} words")
    logger.info(f"Target phonemes: {len(target_phonemes)} words")
    
    comparisons = []
    total_issues = 0
    
    # Compare each word
    for word in user_phonemes:
        user_p = user_phonemes.get(word, [])
        target_p = target_phonemes.get(word, [])
        
        if not target_p:
            # No target phonemes for this word - skip or note as OOV
            logger.warning(f"No target phonemes for word: '{word}'")
            comparisons.append({
                'word': word,
                'user': user_p,
                'target': [],
                'issue': 'no_target',
                'severity': 'unknown',
                'notes': 'No target pronunciation available',
                'details': []
            })
            continue
        
        comparison = compare_word_phonemes(word, user_p, target_p)
        comparisons.append(comparison)
        
        if comparison['issue'] != 'none':
            total_issues += len(comparison.get('details', []))
            logger.info(f"Word '{word}': {comparison['issue']} ({comparison['severity']})")
    
    logger.info(f"Total comparisons: {len(comparisons)}")
    logger.info(f"Total issues found: {total_issues}")
    logger.info("=" * 50)
    
    return {"comparisons": comparisons}

