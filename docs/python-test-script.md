Below is a ready-to-run **Python test script** that runs the *entire voice pipeline* end-to-end and also lets you run each microservice step-by-step.
It uses the exact endpoints and JSON formats we discussed earlier. Save as `run_pipeline_test.py` in your repo, edit the `CONFIG` values if your services use different ports, then run.

Features

* Upload local audio (or use an existing `audio_url`)
* Calls ASR → Alignment → Phoneme Map → Phoneme Diff → TTS → Voice Conversion → Feedback
* Option to call the Orchestrator `process-all` endpoint directly
* Polling support for async orchestrator responses
* Saves artifacts / JSON to `./outputs/`
* Clear logging and error handling

Requirements

* Python 3.8+
* `requests` package (`pip install requests`)

Usage examples

```bash
# Full orchestrator run (single call)
python run_pipeline_test.py --mode orchestrator --file ./tests/audio/hello-world.wav

# Step-by-step run
python run_pipeline_test.py --mode stepwise --file ./tests/audio/hello-world.wav

# Use an already uploaded audio_url (skip file upload)
python run_pipeline_test.py --mode stepwise --audio_url "http://minio:9000/audio/hello-world.wav"
```

---

```python
#!/usr/bin/env python3
"""
run_pipeline_test.py

Test script to run the full voice pipeline (ASR -> Alignment -> PhonemeMap -> Diff -> TTS -> VC -> Feedback)
against local dev microservices (docker-compose default ports).

Configure endpoints in CONFIG below.

Save outputs (JSON + any returned URLs) to ./outputs/
"""

import argparse
import json
import os
import sys
import time
from typing import Any, Dict, List, Optional

import requests

# ---------- CONFIG ----------
CONFIG = {
    "ASR_UPLOAD": "http://localhost:8001/asr/process",        # file upload endpoint
    "ASR_URL": "http://localhost:8001/asr/process-url",      # url-based ASR
    "ALIGN": "http://localhost:8002/alignment/process",
    "PHONEME_MAP": "http://localhost:8003/phoneme-map/process",
    "PHONEME_DIFF": "http://localhost:8004/diff/process",
    "TTS": "http://localhost:8005/tts/process",
    "VC": "http://localhost:8006/vc/process",
    "FEEDBACK": "http://localhost:8007/feedback/process",
    "ORCHESTRATOR_UPLOAD": "http://localhost:8010/orchestrator/upload-audio",
    "ORCHESTRATOR_PROCESS": "http://localhost:8010/orchestrator/process-all",
    # Polling options for orchestrator if async
    "POLL_INTERVAL": 2,
    "POLL_MAX_RETRIES": 90,
    # Output folder
    "OUTPUT_DIR": "./outputs",
    # Request timeouts
    "TIMEOUT": 60,
}

# ---------- Utilities ----------
def ensure_out_dir():
    out = CONFIG["OUTPUT_DIR"]
    os.makedirs(out, exist_ok=True)
    return out

def save_json(obj: Any, name: str):
    out = ensure_out_dir()
    path = os.path.join(out, name)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, indent=2)
    print(f"[saved] {path}")

def pretty(obj: Any) -> str:
    return json.dumps(obj, indent=2)

def handle_resp(resp: requests.Response) -> Any:
    try:
        resp.raise_for_status()
    except Exception as e:
        print(f"[ERROR] HTTP {resp.status_code}: {resp.text}")
        raise
    try:
        return resp.json()
    except Exception:
        return resp.text

# ---------- Step functions ----------
def upload_audio_to_orchestrator(file_path: str) -> Dict[str, Any]:
    url = CONFIG["ORCHESTRATOR_UPLOAD"]
    print(f"[upload -> orchestrator] {file_path} -> {url}")
    with open(file_path, "rb") as f:
        files = {"file": (os.path.basename(file_path), f)}
        r = requests.post(url, files=files, timeout=CONFIG["TIMEOUT"])
    data = handle_resp(r)
    save_json(data, "orchestrator_upload_response.json")
    return data

def call_asr_with_file(file_path: str) -> Dict[str, Any]:
    url = CONFIG["ASR_UPLOAD"]
    print(f"[ASR] Uploading file -> {url}")
    with open(file_path, "rb") as f:
        files = {"file": (os.path.basename(file_path), f)}
        r = requests.post(url, files=files, timeout=CONFIG["TIMEOUT"])
    data = handle_resp(r)
    save_json(data, "asr_response.json")
    return data

def call_asr_with_url(audio_url: str) -> Dict[str, Any]:
    url = CONFIG["ASR_URL"]
    print(f"[ASR] URL -> {audio_url}")
    payload = {"audio_url": audio_url}
    r = requests.post(url, json=payload, timeout=CONFIG["TIMEOUT"])
    data = handle_resp(r)
    save_json(data, "asr_response.json")
    return data

def call_alignment(audio_url: str, transcript: str) -> Dict[str, Any]:
    url = CONFIG["ALIGN"]
    payload = {"audio_url": audio_url, "transcript": transcript}
    print(f"[ALIGN] {url} payload keys: {list(payload.keys())}")
    r = requests.post(url, json=payload, timeout=CONFIG["TIMEOUT"])
    data = handle_resp(r)
    save_json(data, "alignment_response.json")
    return data

def call_phoneme_map(words: List[str]) -> Dict[str, Any]:
    url = CONFIG["PHONEME_MAP"]
    payload = {"words": words}
    print(f"[PHONEME_MAP] {url} words={words}")
    r = requests.post(url, json=payload, timeout=CONFIG["TIMEOUT"])
    data = handle_resp(r)
    save_json(data, "phoneme_map_response.json")
    return data

def call_phoneme_diff(user_phonemes: Dict[str, List[str]], target_phonemes: Dict[str, List[str]]) -> Dict[str, Any]:
    url = CONFIG["PHONEME_DIFF"]
    payload = {"user_phonemes": user_phonemes, "target_phonemes": target_phonemes}
    print(f"[PHONEME_DIFF] {url}")
    r = requests.post(url, json=payload, timeout=CONFIG["TIMEOUT"])
    data = handle_resp(r)
    save_json(data, "phoneme_diff_response.json")
    return data

def call_tts(text: str, voice: str = "us_female_1") -> Dict[str, Any]:
    url = CONFIG["TTS"]
    payload = {"text": text, "voice": voice}
    print(f"[TTS] {url} text len={len(text)}")
    r = requests.post(url, json=payload, timeout=CONFIG["TIMEOUT"])
    data = handle_resp(r)
    save_json(data, "tts_response.json")
    return data

def call_vc(tts_url: str, user_samples: List[str]) -> Dict[str, Any]:
    url = CONFIG["VC"]
    payload = {"tts_url": tts_url, "user_voice_samples": user_samples}
    print(f"[VC] {url} samples={len(user_samples)}")
    r = requests.post(url, json=payload, timeout=CONFIG["TIMEOUT"] * 3)
    data = handle_resp(r)
    save_json(data, "vc_response.json")
    return data

def call_feedback(payload: Dict[str, Any]) -> Dict[str, Any]:
    url = CONFIG["FEEDBACK"]
    print(f"[FEEDBACK] {url} payload keys: {list(payload.keys())}")
    r = requests.post(url, json=payload, timeout=CONFIG["TIMEOUT"])
    data = handle_resp(r)
    save_json(data, "feedback_response.json")
    return data

def call_orchestrator_upload(file_path: str) -> Dict[str, Any]:
    return upload_audio_to_orchestrator(file_path)

def call_orchestrator_process_file(file_path: str, poll: bool = True) -> Dict[str, Any]:
    url = CONFIG["ORCHESTRATOR_PROCESS"]
    print(f"[ORCH] Uploading file to orchestrator process-all -> {url}")
    with open(file_path, "rb") as f:
        files = {"file": (os.path.basename(file_path), f)}
        r = requests.post(url, files=files, timeout=CONFIG["TIMEOUT"] * 3)
    data = handle_resp(r)
    save_json(data, "orchestrator_process_response.json")
    # If orchestrator returns a task id and is async, optionally poll.
    if isinstance(data, dict) and data.get("status") == "accepted" and data.get("task_id") and poll:
        return poll_task_status(data["task_id"])
    return data

def call_orchestrator_process_url(audio_url: str, poll: bool = True) -> Dict[str, Any]:
    url = CONFIG["ORCHESTRATOR_PROCESS"]
    payload = {"audio_url": audio_url}
    r = requests.post(url, json=payload, timeout=CONFIG["TIMEOUT"] * 3)
    data = handle_resp(r)
    save_json(data, "orchestrator_process_response.json")
    if isinstance(data, dict) and data.get("status") == "accepted" and data.get("task_id") and poll:
        return poll_task_status(data["task_id"])
    return data

def poll_task_status(task_id: str) -> Dict[str, Any]:
    # Adjust if orchestrator exposes a /status endpoint
    status_url = f"http://localhost:8010/orchestrator/task/{task_id}"
    print(f"[POLL] polling task status at {status_url}")
    retries = CONFIG["POLL_MAX_RETRIES"]
    interval = CONFIG["POLL_INTERVAL"]
    for i in range(retries):
        try:
            r = requests.get(status_url, timeout=CONFIG["TIMEOUT"])
            data = handle_resp(r)
        except Exception as e:
            print(f"[POLL] error: {e}")
            data = {}
        print(f"[POLL] attempt {i+1}/{retries} status: {data.get('status')}")
        if isinstance(data, dict) and data.get("status") == "completed":
            save_json(data, f"orchestrator_task_{task_id}_final.json")
            return data
        if isinstance(data, dict) and data.get("status") == "failed":
            save_json(data, f"orchestrator_task_{task_id}_failed.json")
            raise RuntimeError(f"Task {task_id} failed: {data}")
        time.sleep(interval)
    raise TimeoutError("Polling timed out")

# ---------- High-level orchestration for stepwise mode ----------
def run_stepwise(audio_file: Optional[str], audio_url: Optional[str], user_voice_samples: Optional[List[str]] = None):
    """
    Runs each service in order:
    1) ASR (file or url)
    2) Alignment
    3) Phoneme Map
    4) Phoneme Diff
    5) Pre-LLM aggregation
    6) TTS
    7) Voice Conversion (optional)
    8) Feedback
    """
    # Determine audio source
    if audio_url:
        audio_location = audio_url
        print(f"[INFO] Using provided audio_url: {audio_url}")
        asr_res = call_asr_with_url(audio_url)
    elif audio_file:
        audio_location = None
        asr_res = call_asr_with_file(audio_file)
        # If ASR returns an audio_url or orchestrator uploaded URL, capture it
    else:
        raise ValueError("Either audio_file or audio_url must be provided")

    # If ASR returned audio_url or orchestrator upload returned audio_url, use it for alignment.
    transcript = asr_res.get("transcript")
    words_list = [w.get("word") for w in asr_res.get("words", [])]
    print("[ASR] transcript:", transcript)
    save_json(asr_res, "step_asr.json")

    # Step 2: Alignment
    # Prefer audio_url if available otherwise use the local file path uploaded earlier to MinIO/orchestrator
    audio_for_alignment = audio_url or (audio_file if audio_file else None)
    if not audio_for_alignment:
        print("[WARN] alignment: no audio_url known. If ASR returned an audio_url use that.")
    alignment_res = call_alignment(audio_for_alignment, transcript)
    save_json(alignment_res, "step_alignment.json")

    # Step 3: Phoneme Map
    phonemap_res = call_phoneme_map(words_list)
    save_json(phonemap_res, "step_phonemap.json")

    # Step 4: Phoneme Diff
    # Build user_phonemes from alignment (simple grouping by words — implementation-specific)
    # For this script we attempt to build a simple mapping if alignment contains 'words' or phoneme grouping
    user_phonemes = {}
    # If alignment returned per-phoneme with 'word' context, adapt accordingly; here we assume minimal mapping
    if isinstance(alignment_res, dict) and alignment_res.get("phonemes"):
        # naive grouping: map all phonemes to first word, production code should group by word timestamps
        # Fallback: use phoneme text sequences if provided in alignment
        # This is intentionally conservative — microservice implementations vary.
        all_phs = [p.get("phoneme") for p in alignment_res.get("phonemes", []) if p.get("phoneme")]
        if words_list:
            # evenly split phonemes across words (fallback heuristic)
            per_word = max(1, len(all_phs) // max(1, len(words_list)))
            for idx, w in enumerate(words_list):
                start = idx * per_word
                end = start + per_word
                user_phonemes[w] = all_phs[start:end] or all_phs[start:start+1]
    if not user_phonemes:
        # fallback: create dummy mapping from ASR words (this will test phoneme-diff service mock)
        for w in words_list:
            user_phonemes[w] = ["HH"] if w.lower() == "hello" else ["W"]

    target_phonemes = phonemap_res.get("map", {})
    diff_res = call_phoneme_diff(user_phonemes, target_phonemes)
    save_json(diff_res, "step_phonemediff.json")

    # Step 5: Pre-LLM aggregation
    aggregated_for_llm = {
        "transcript": transcript,
        "alignment": alignment_res.get("phonemes") if isinstance(alignment_res, dict) else [],
        "user_phonemes": user_phonemes,
        "target_phonemes": target_phonemes,
        "phoneme_diff": diff_res.get("comparisons", []),
        # Add placeholder stress_data if your stress detection service exists
        "stress_data": {},
    }
    save_json(aggregated_for_llm, "step_aggregated_for_llm.json")

    # Step 6: TTS
    tts_res = call_tts(transcript)
    tts_url = tts_res.get("tts_url")
    save_json(tts_res, "step_tts.json")

    # Step 7: Voice Conversion (optional)
    vc_url = None
    if user_voice_samples:
        vc_res = call_vc(tts_url, user_voice_samples)
        vc_url = vc_res.get("converted_url")
        save_json(vc_res, "step_vc.json")
    else:
        print("[VC] skipping voice conversion (no user samples provided)")

    # Step 8: Feedback (LLM)
    # Send aggregated data + optional vc url
    feedback_payload = aggregated_for_llm.copy()
    if tts_url:
        feedback_payload["tts_url"] = tts_url
    if vc_url:
        feedback_payload["voice_converted_url"] = vc_url
    feedback_res = call_feedback(feedback_payload)
    save_json(feedback_res, "step_feedback.json")
    print("[DONE] Stepwise pipeline completed.")
    return {
        "asr": asr_res,
        "alignment": alignment_res,
        "phonemap": phonemap_res,
        "diff": diff_res,
        "tts": tts_res,
        "vc": vc_res if user_voice_samples else None,
        "feedback": feedback_res,
    }

# ---------- Main CLI ----------
def parse_args():
    p = argparse.ArgumentParser(description="Run AgentForge voice pipeline test")
    p.add_argument("--mode", choices=["orchestrator", "stepwise"], default="orchestrator",
                   help="orchestrator: call orchestrator.process-all; stepwise: call each microservice sequentially")
    p.add_argument("--file", help="Local audio file path (wav/mp3)")
    p.add_argument("--audio_url", help="Existing audio URL (MinIO/S3) to use instead of uploading file")
    p.add_argument("--user_samples", nargs="*", help="Optional user voice sample URLs for VC")
    p.add_argument("--no-poll", action="store_true", help="Do not poll for async orchestrator task status")
    return p.parse_args()

def main():
    args = parse_args()
    if args.mode == "orchestrator":
        if args.file:
            print("[MODE] Orchestrator (upload file + process)")
            res = call_orchestrator_process_file(args.file, poll=not args.no_poll)
            save_json(res, "orchestrator_full_result.json")
            print(pretty(res))
        elif args.audio_url:
            print("[MODE] Orchestrator (process audio_url)")
            res = call_orchestrator_process_url(args.audio_url, poll=not args.no_poll)
            save_json(res, "orchestrator_full_result.json")
            print(pretty(res))
        else:
            print("Error: orchestrator mode requires --file or --audio_url")
            sys.exit(1)
    else:
        # stepwise
        if not (args.file or args.audio_url):
            print("Error: stepwise mode requires --file or --audio_url")
            sys.exit(1)
        try:
            result = run_stepwise(args.file, args.audio_url, user_voice_samples=args.user_samples)
            save_json(result, "pipeline_stepwise_full.json")
            print("[RESULT SUMMARY]")
            print(pretty({"transcript": result["asr"].get("transcript"), "feedback": result["feedback"]}))
        except Exception as e:
            print(f"[ERROR] Pipeline failed: {e}")
            sys.exit(2)

if __name__ == "__main__":
    main()
```
