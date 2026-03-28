# Changelog

## [1.0.0] — 2026-03-28

### Added — Feedback LLM Service (Step 5.7)

#### Feedback LLM Service (`feedback-llm-service/`)
- **Dual LLM provider support**: OpenAI (GPT-4o) and Google Gemini via `LLM_PROVIDER` env var
- **Structured JSON output**: Pydantic-validated `FeedbackResponse` with overall/fluency/accuracy/prosody scores, issues, drills, strengths, tips, encouragement
- **Prompt template system**: Jinja2 templates loaded from `/prompts/` directory (system prompt, user prompt, few-shot examples, correction prompt)
- **Output validation**: `FeedbackValidator` with markdown fence stripping, JSON parsing, Pydantic validation, and input cross-checking
- **Retry logic**: Single retry with correction prompt on validation failure, graceful fallback on 2nd failure
- **Mock mode**: Rich mock responses for frontend testing without API keys
- **Health check**: `/health` returns 200/503 with model/provider status
- **Debug route**: `GET /feedback/prompts/preview` for inspecting loaded templates
- **Docker**: Port 8007, `python:3.10-slim`, curl-based healthcheck, prompts volume mount

#### Prompt Templates (`prompts/`)
- `feedback_system_prompt.txt` — GA accent coach persona with hallucination guardrails
- `feedback_user_prompt.j2` — Jinja2 template with scoring formula
- `feedback_few_shot_examples.json` — 3 examples (near-perfect, moderate, heavy errors)
- `feedback_correction_prompt.txt` — Retry correction instructions

#### Orchestrator (`pipeline-orchestrator/`)
- Fixed feedback route from `/feedback/` to `/feedback/process`
- Proper payload assembly using `comparisons` key
- Try/except with graceful fallback (pipeline doesn't break if feedback fails)
- Step 5.7 logging

#### UI (`ui/`)
- `FeedbackPanel.tsx` — Full pronunciation feedback panel with score rings, severity-coded issue cards, practice drills, strengths, tips, and encouragement
- `pipeline.ts` — Added `FeedbackLLMResponse` types, `callFeedbackLLM()`, integrated as Step 7 in `runFullPipeline()`
- `PracticeArena.tsx` — FeedbackPanel rendered in pipeline results

#### Infrastructure
- Updated `docker-compose.yml`: port 8007:8007, prompts volume, LLM provider env vars
- Updated `.env.example`: `LLM_PROVIDER`, `LLM_MODEL`, `OPENAI_API_KEY`

#### Tests
- `tests/test_schemas.py` — Schema validation (6 test cases)
- `tests/test_service.py` — Validator, mock mode, fallback (9 test cases)
- `tests/data/mock_feedback_request.json` — Test fixture
