import requests
from shared.utils.audio_utils import save_temp_audio
from app.core.config import settings
from app.db.database import SessionLocal
from app.db import models


async def run_pipeline(file):
    audio_path = save_temp_audio(file)
    db = SessionLocal()
    task = models.Task(status="created", audio_uri=audio_path)
    db.add(task)
    db.commit()
    db.refresh(task)

    if settings.MOCK_MODE:
        result = {
            "task_id": str(task.id),
            "asr": {"transcript": "Hello world", "words": []},
            "alignment": {"phonemes": []},
            "phoneme_map": {"hello": ["HH", "AH", "L", "OW"]},
            "diff": {"issues": []},
            "tts": {"audio_url": "s3://audio/tts/sample.wav"},
            "voice_conversion": {"audio_url": "s3://audio/vc/sample.wav"},
            "feedback": {
                "overall_summary": "Sample feedback",
                "issues": [],
                "drills": {},
            },
        }
        artifact = models.Artifact(
            task_id=task.id,
            type="orchestrator_result",
            uri="",
            data=result,
        )
        db.add(artifact)
        db.commit()
        return result

    files = {"file": (file.filename, file.file, file.content_type)}
    asr = requests.post(f"{settings.ASR_URL}/process/", files=files).json()
    alignment = requests.post(
        f"{settings.ALIGN_URL}/process/",
        json={"audio_url": audio_path, "transcript": asr.get("transcript", "")},
    ).json()
    words = list(set([w.get("word", "") for w in asr.get("words", []) if w.get("word")]))
    phoneme_map = requests.post(
        f"{settings.PHONEME_MAP_URL}/map/", json={"words": words}
    ).json()
    diff = requests.post(
        f"{settings.DIFF_URL}/diff/",
        json={
            "items": [
                {"word": w, "user": phoneme_map.get(w, []), "target": phoneme_map.get(w, [])}
                for w in words
            ]
        },
    ).json()
    tts = requests.post(f"{settings.TTS_URL}/speak/", json={"text": asr.get("transcript", "")}).json()
    vc = requests.post(
        f"{settings.VC_URL}/convert/",
        json={"tts_audio_url": tts.get("audio_url", ""), "user_voice_sample_url": ""},
    ).json()
    feedback = requests.post(
        f"{settings.FEEDBACK_URL}/feedback/",
        json={
            "transcript": asr.get("transcript", ""),
            "alignment": alignment.get("phonemes", []),
            "user_phonemes": phoneme_map,
            "target_phonemes": phoneme_map,
            "phoneme_diff": diff.get("issues", []),
        },
    ).json()

    result = {
        "task_id": str(task.id),
        "asr": asr,
        "alignment": alignment,
        "phoneme_map": phoneme_map,
        "diff": diff,
        "tts": tts,
        "voice_conversion": vc,
        "feedback": feedback,
    }

    artifact = models.Artifact(
        task_id=task.id,
        type="orchestrator_result",
        uri="",
        data=result,
    )
    db.add(artifact)
    db.commit()
    return result
