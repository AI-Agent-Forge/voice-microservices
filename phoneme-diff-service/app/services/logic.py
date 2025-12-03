async def run_service_logic(req):
    issues = []
    for item in req.items:
        issues.append(
            {
                "word": item.word,
                "issue_type": "vowel_shift",
                "severity": "low",
            }
        )
    return {"issues": issues}

