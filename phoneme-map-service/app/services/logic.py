async def run_service_logic(req):
    result = {}
    for w in req.words:
        result[w] = ["HH", "AH"]
    return result

