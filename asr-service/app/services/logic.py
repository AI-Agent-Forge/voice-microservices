from shared.utils.audio_utils import save_temp_audio


async def run_service_logic(file):
    _ = save_temp_audio(file)
    return {
        "transcript": "Hello world",
        "words": [
            {"word": "Hello", "start": 0.0, "end": 0.4},
            {"word": "world", "start": 0.5, "end": 1.0},
        ],
        "language": "en",
    }

