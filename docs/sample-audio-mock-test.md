# 🎧 **1. Sample Audio Files (Public-Domain / CC0)**

Create folder:

```
tests/audio/
```

Include these sample audio files:

### **1. hello-world.wav**

> A clean, slow “Hello world” spoken by an American speaker.
> Download (public domain):
> [https://filesamples.com/samples/audio/wav/sample1.wav](https://filesamples.com/samples/audio/wav/sample1.wav)

Rename to:
`tests/audio/hello-world.wav`

---

### **2. indian-accent-short.wav**

> Short clip of an Indian-accent English speaker.
> Public domain sample:
> [https://www.voiptroubleshooter.com/open_speech/american.html](https://www.voiptroubleshooter.com/open_speech/american.html)
> Use sample file:
> `OSR_us_000_0010_8k.wav` (accent doesn’t matter for testing).

Rename to:
`tests/audio/indian-accent-short.wav`

---

### **3. sentence-natural.wav**

> A natural spoken sentence (slow speech).
> Use public domain speech sample:
> [https://www2.cs.uic.edu/~i101/SoundFiles/preamble.wav](https://www2.cs.uic.edu/~i101/SoundFiles/preamble.wav)

Rename to:
`tests/audio/sentence-natural.wav`

---

### **4. noise-test.wav**

> Audio with mild background noise.
> Public domain noise sample:
> [https://filesamples.com/samples/audio/wav/sample5.wav](https://filesamples.com/samples/audio/wav/sample5.wav)

Rename to:
`tests/audio/noise-test.wav`

---

# 📁 **2. Folder Structure**

```
tests/
│
├── audio/
│   ├── hello-world.wav
│   ├── indian-accent-short.wav
│   ├── sentence-natural.wav
│   └── noise-test.wav
│
└── data/
    ├── mock_asr.json
    ├── mock_alignment.json
    ├── mock_phoneme_map.json
    ├── mock_phoneme_diff.json
    ├── mock_tts.json
    ├── mock_voice_conversion.json
    └── mock_orchestrator_full.json
```

---

# 🧪 **3. ASR Service — Mock Test Case**

`tests/data/mock_asr.json`

```json
{
  "transcript": "hello world",
  "words": [
    {"word": "hello", "start": 0.12, "end": 0.45},
    {"word": "world", "start": 0.55, "end": 1.00}
  ],
  "language": "en"
}
```

### Test Script Example (`test_asr.py`)

```python
def test_asr_basic(client):
    resp = client.post("/process", files={"file": ("audio.wav", open("tests/audio/hello-world.wav","rb"))})
    assert resp.status_code == 200
    data = resp.json()
    assert "transcript" in data
    assert len(data["words"]) > 0
```

---

# 🧪 **4. Alignment Service — Mock Output**

`tests/data/mock_alignment.json`

```json
{
  "phonemes": [
    {"phoneme": "HH", "start": 0.12, "end": 0.20},
    {"phoneme": "AH", "start": 0.20, "end": 0.33},
    {"phoneme": "L",  "start": 0.33, "end": 0.40},
    {"phoneme": "OW", "start": 0.40, "end": 0.45}
  ]
}
```

---

# 🔤 **5. Phoneme Mapping — Mock Output**

`tests/data/mock_phoneme_map.json`

```json
{
  "map": {
    "hello": ["HH", "AH", "L", "OW"],
    "world": ["W", "ER", "L", "D"]
  }
}
```

---

# 🧩 **6. Phoneme Diff — Mock Output**

`tests/data/mock_phoneme_diff.json`

```json
{
  "comparisons": [
    {
      "word": "hello",
      "user": ["HH", "AA", "L", "O"],
      "target": ["HH", "AH", "L", "OW"],
      "issue": "vowel_shift",
      "severity": "medium"
    }
  ]
}
```

---

# 🔊 **7. TTS Service — Mock Output**

`tests/data/mock_tts.json`

```json
{
  "tts_url": "https://mock-storage/tts/hello-world-us.wav"
}
```

---

# 🗣 **8. Voice Conversion — Mock Output**

`tests/data/mock_voice_conversion.json`

```json
{
  "converted_url": "https://mock-storage/tts/hello-world-us-in-user-voice.wav"
}
```

---

# 💬 **9. LLM Feedback Service — Mock Output**

`tests/data/mock_feedback.json`

```json
{
  "overall_summary": "Good clarity. Mild vowel distortion in 'hello'.",
  "issues": [
    {
      "word": "hello",
      "user_pronunciation": "HH AA L O",
      "target_pronunciation": "HH AH L OW",
      "issue_type": "vowel_shift",
      "explanation": "Your 'AH' vowel sounded closer to 'AA'.",
      "fix_instructions": "Relax the jaw and keep the tongue lower for the AH vowel.",
      "audio_timestamps": {"start": 0.12, "end": 0.45},
      "severity": "medium"
    }
  ],
  "drills": {
    "minimal_pairs": ["luck–lock", "cut–caught"],
    "word_practice": ["hello", "sun", "love"],
    "sentence_practice": ["The color of the cup is above the rug."]
  }
}
```

---

# 🔗 **10. Orchestrator — Full End-to-End Mock Output**

`tests/data/mock_orchestrator_full.json`

```json
{
  "transcript": "hello world",
  "alignment": [
    {"word": "hello", "start": 0.12, "end": 0.45},
    {"word": "world", "start": 0.55, "end": 1.00}
  ],
  "phonemes": {
    "hello": ["HH","AH","L","OW"],
    "world": ["W","ER","L","D"]
  },
  "tts_url": "https://mock/tts/hello-us.wav",
  "voice_converted_url": "https://mock/tts/hello-us-user-voice.wav",
  "feedback": {
    "overall_summary": "Good clarity but vowel distortions need correction.",
    "issues": [
      {
        "word": "hello",
        "user_pronunciation": "HH AA L O",
        "target_pronunciation": "HH AH L OW",
        "issue_type": "vowel_shift",
        "severity": "medium"
      }
    ],
    "drills": {
      "minimal_pairs": ["sun–son"],
      "word_practice": ["hello"],
      "sentence_practice": [
        "The sun is above the horizon."
      ]
    }
  }
}
```

---

# 🧪 **11. End-to-End Integration Test Example**

`test_orchestrator.py`

```python
def test_full_pipeline(client):
    resp = client.post(
        "/process-all",
        files={"file": ("audio.wav", open("tests/audio/hello-world.wav", "rb"))}
    )
    assert resp.status_code == 200

    data = resp.json()

    assert "transcript" in data
    assert "tts_url" in data
    assert "voice_converted_url" in data
    assert "feedback" in data
```

---

# 🎉 **12. Ready-to-Use Sample Fixtures for Interns**

You can also create small Python fixtures:

`tests/conftest.py`

```python
import pytest
from fastapi.testclient import TestClient
from app.main import app

@pytest.fixture
def client():
    return TestClient(app)
```
