from fastapi import FastAPI
from app.api.endpoints import router


app = FastAPI(title="Feedback LLM Service", version="1.0.0")


@app.get("/health")
def health():
    return {"status": "ok"}


app.include_router(router, prefix="/feedback")

