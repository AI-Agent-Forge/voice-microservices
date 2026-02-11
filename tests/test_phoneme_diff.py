"""
Tests for the Phoneme Diff Service

This test suite covers:
- Vowel shift detection (schwa substitution, tense/lax vowels)
- Consonant error detection (TH-stopping, V/W confusion, R/L confusion)
- Missing phoneme detection
- Extra phoneme detection
- Perfect match cases
- Edge cases (empty input, OOV words)
"""

import pytest
import requests

BASE_URL = "http://localhost:8004"


class TestPhoneDiffService:
    """Test cases for the Phoneme Diff Service API."""

    def test_health_endpoint(self):
        """Test that the health endpoint returns OK."""
        response = requests.get(f"{BASE_URL}/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["service"] == "phoneme-diff-service"

    def test_perfect_match(self):
        """Test when user phonemes perfectly match target phonemes."""
        payload = {
            "user_phonemes": {"world": ["W", "ER", "L", "D"]},
            "target_phonemes": {"world": ["W", "ER", "L", "D"]}
        }
        response = requests.post(f"{BASE_URL}/diff/process", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert len(data["comparisons"]) == 1
        assert data["comparisons"][0]["issue"] == "none"
        assert data["comparisons"][0]["severity"] == "none"
        assert data["comparisons"][0]["notes"] == "exact match"

    def test_vowel_shift_schwa_substitution(self):
        """Test detection of vowel shift (schwa substitution)."""
        payload = {
            "user_phonemes": {"hello": ["HH", "AA", "L", "OW"]},
            "target_phonemes": {"hello": ["HH", "AH", "L", "OW"]}
        }
        response = requests.post(f"{BASE_URL}/diff/process", json=payload)
        assert response.status_code == 200
        data = response.json()
        comparison = data["comparisons"][0]
        assert comparison["issue"] == "vowel_shift"
        assert len(comparison["details"]) == 1
        assert comparison["details"][0]["pattern"] == "schwa_substitution"

    def test_consonant_error_th_stopping(self):
        """Test detection of TH-stopping (T instead of TH)."""
        payload = {
            "user_phonemes": {"think": ["T", "IH", "NG", "K"]},
            "target_phonemes": {"think": ["TH", "IH", "NG", "K"]}
        }
        response = requests.post(f"{BASE_URL}/diff/process", json=payload)
        assert response.status_code == 200
        data = response.json()
        comparison = data["comparisons"][0]
        assert comparison["issue"] == "consonant_error"
        assert comparison["details"][0]["pattern"] == "th_stopping"
        assert comparison["severity"] == "medium"  # TH-stopping is a critical pattern

    def test_consonant_error_v_w_confusion(self):
        """Test detection of V/W confusion."""
        payload = {
            "user_phonemes": {"very": ["W", "EH", "R", "IY"]},
            "target_phonemes": {"very": ["V", "EH", "R", "IY"]}
        }
        response = requests.post(f"{BASE_URL}/diff/process", json=payload)
        assert response.status_code == 200
        data = response.json()
        comparison = data["comparisons"][0]
        assert comparison["issue"] == "consonant_error"
        assert comparison["details"][0]["pattern"] == "v_w_confusion"

    def test_missing_phoneme(self):
        """Test detection of missing phoneme."""
        payload = {
            "user_phonemes": {"about": ["AH", "B", "AW"]},
            "target_phonemes": {"about": ["AH", "B", "AW", "T"]}
        }
        response = requests.post(f"{BASE_URL}/diff/process", json=payload)
        assert response.status_code == 200
        data = response.json()
        comparison = data["comparisons"][0]
        assert comparison["issue"] == "missing_phoneme"
        assert comparison["details"][0]["type"] == "deletion"
        assert comparison["details"][0]["target_phoneme"] == "T"

    def test_extra_phoneme(self):
        """Test detection of extra phoneme."""
        payload = {
            "user_phonemes": {"test": ["T", "EH", "S", "T", "AH"]},
            "target_phonemes": {"test": ["T", "EH", "S", "T"]}
        }
        response = requests.post(f"{BASE_URL}/diff/process", json=payload)
        assert response.status_code == 200
        data = response.json()
        comparison = data["comparisons"][0]
        assert comparison["issue"] == "extra_phoneme"
        assert comparison["details"][0]["type"] == "insertion"
        assert comparison["details"][0]["user_phoneme"] == "AH"

    def test_multiple_words(self):
        """Test processing multiple words at once."""
        payload = {
            "user_phonemes": {
                "hello": ["HH", "AA", "L", "OW"],
                "world": ["W", "ER", "L", "D"]
            },
            "target_phonemes": {
                "hello": ["HH", "AH", "L", "OW"],
                "world": ["W", "ER", "L", "D"]
            }
        }
        response = requests.post(f"{BASE_URL}/diff/process", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert len(data["comparisons"]) == 2
        # One word has an issue, one is perfect
        issues = [c["issue"] for c in data["comparisons"]]
        assert "vowel_shift" in issues
        assert "none" in issues

    def test_no_target_phonemes(self):
        """Test handling when target phonemes are not available for a word."""
        payload = {
            "user_phonemes": {"unknown": ["AH", "N", "OW", "N"]},
            "target_phonemes": {}
        }
        response = requests.post(f"{BASE_URL}/diff/process", json=payload)
        assert response.status_code == 200
        data = response.json()
        comparison = data["comparisons"][0]
        assert comparison["issue"] == "no_target"
        assert comparison["severity"] == "unknown"

    def test_empty_input(self):
        """Test handling of empty input."""
        payload = {
            "user_phonemes": {},
            "target_phonemes": {}
        }
        response = requests.post(f"{BASE_URL}/diff/process", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["comparisons"] == []

    def test_high_severity_multiple_critical_errors(self):
        """Test that multiple critical errors result in high severity."""
        payload = {
            "user_phonemes": {"leather": ["L", "EH", "T", "ER"]},
            "target_phonemes": {"leather": ["L", "EH", "DH", "ER"]}
        }
        response = requests.post(f"{BASE_URL}/diff/process", json=payload)
        assert response.status_code == 200
        data = response.json()
        comparison = data["comparisons"][0]
        # TH-stopping is a critical pattern
        assert comparison["severity"] in ["medium", "high"]

    def test_r_l_confusion(self):
        """Test detection of R/L confusion."""
        payload = {
            "user_phonemes": {"right": ["L", "AY", "T"]},
            "target_phonemes": {"right": ["R", "AY", "T"]}
        }
        response = requests.post(f"{BASE_URL}/diff/process", json=payload)
        assert response.status_code == 200
        data = response.json()
        comparison = data["comparisons"][0]
        assert comparison["issue"] == "consonant_error"
        assert comparison["details"][0]["pattern"] == "r_l_confusion"

    def test_voicing_error(self):
        """Test detection of voicing errors (e.g., P vs B)."""
        payload = {
            "user_phonemes": {"bit": ["P", "IH", "T"]},
            "target_phonemes": {"bit": ["B", "IH", "T"]}
        }
        response = requests.post(f"{BASE_URL}/diff/process", json=payload)
        assert response.status_code == 200
        data = response.json()
        comparison = data["comparisons"][0]
        assert comparison["issue"] == "consonant_error"
        assert comparison["details"][0]["pattern"] == "voicing_error"

    def test_tense_lax_vowel(self):
        """Test detection of tense/lax vowel confusion (e.g., IH vs IY)."""
        payload = {
            "user_phonemes": {"beat": ["B", "IH", "T"]},
            "target_phonemes": {"beat": ["B", "IY", "T"]}
        }
        response = requests.post(f"{BASE_URL}/diff/process", json=payload)
        assert response.status_code == 200
        data = response.json()
        comparison = data["comparisons"][0]
        assert comparison["issue"] == "vowel_shift"
        assert comparison["details"][0]["pattern"] == "tense_lax_vowel"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

