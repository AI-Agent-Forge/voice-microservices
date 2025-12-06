import os
import shutil
import tempfile

def save_temp_audio(file):
    try:
        # Create a temp file
        fd, path = tempfile.mkstemp(suffix=".webm")
        with os.fdopen(fd, 'wb') as tmp:
            shutil.copyfileobj(file.file, tmp)
        return path
    except Exception as e:
        print(f"Error saving temp file: {e}")
        raise e

# Try importing whisper, fallback if not available
try:
    # Disable SSL verification for model download (handles corporate proxies/self-signed certs)
    import ssl
    ssl._create_default_https_context = ssl._create_unverified_context
    
    import whisper
    model = whisper.load_model("base")
    WHISPER_AVAILABLE = True
except ImportError:
    print("Warning: openai-whisper not installed. Using mock transcription.")
    WHISPER_AVAILABLE = False
    model = None
except Exception as e:
    print(f"Warning: Failed to load Whisper model: {e}. Using mock transcription.")
    WHISPER_AVAILABLE = False
    model = None

async def run_service_logic(file):
    # Save the uploaded file to a temporary path
    temp_file_path = save_temp_audio(file)
    
    try:
        if WHISPER_AVAILABLE and model:
            # Transcribe using Whisper with word timestamps
            result = model.transcribe(temp_file_path, word_timestamps=True)
            
            # Format response
            words = []
            for segment in result.get("segments", []):
                for word_info in segment.get("words", []):
                    words.append({
                        "word": word_info["word"].strip(),
                        "start": word_info["start"],
                        "end": word_info["end"]
                    })
                    
            return {
                "transcript": result["text"].strip(),
                "words": words,
                "language": result["language"]
            }
        else:
            # Mock response
            return {
                "transcript": "This is a mock transcription because Whisper is not installed.",
                "words": [
                    {"word": "This", "start": 0.0, "end": 0.5},
                    {"word": "is", "start": 0.5, "end": 0.7},
                    {"word": "mock", "start": 0.7, "end": 1.2},
                    {"word": "transcription", "start": 1.2, "end": 2.0}
                ],
                "language": "en"
            }
    except Exception as e:
        print(f"Transcription error: {e}")
        return {
            "transcript": "Error during transcription",
            "words": [],
            "language": "en"
        }
    finally:
        # Cleanup temp file
        if os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
            except:
                pass
