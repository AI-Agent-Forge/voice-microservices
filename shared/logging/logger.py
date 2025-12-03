import json
import sys
import time
import uuid


def _ts() -> float:
    return time.time()


def _rid() -> str:
    return uuid.uuid4().hex


def log(event: str, level: str = "INFO", **fields):
    record = {
        "level": level,
        "event": event,
        "timestamp": _ts(),
        "request_id": fields.pop("request_id", _rid()),
        **fields,
    }
    sys.stdout.write(json.dumps(record) + "\n")
    sys.stdout.flush()

