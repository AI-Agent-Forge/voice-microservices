import json
import google.generativeai as genai
from app.core.config import settings


# Configure Gemini API
genai.configure(api_key=settings.GEMINI_API_KEY)


SYSTEM_PROMPT = """You are an expert English pronunciation coach. Analyze the user's spoken English based on the provided phoneme comparison data and generate helpful feedback.

You will receive:
- transcript: What the user said (transcribed text)
- alignment: Word-level alignment with timing
- user_phonemes: The phonemes the user actually produced
- target_phonemes: The expected/correct phonemes
- phoneme_diff: Detailed comparison showing substitutions, insertions, and deletions

Based on this data, provide feedback in the following JSON format:
{
    "overall_summary": "A 2-3 sentence summary of the user's pronunciation performance",
    "issues": [
        {
            "word": "the word with the issue",
            "issue_type": "substitution|insertion|deletion",
            "expected": "expected phoneme(s)",
            "actual": "actual phoneme(s) produced",
            "tip": "A helpful tip to improve this specific sound"
        }
    ],
    "drills": {
        "minimal_pairs": ["word1–word2 pairs that contrast problematic sounds"],
        "word_practice": ["individual words to practice"],
        "sentence_practice": ["short sentences to practice the problem sounds in context"]
    }
}

Focus on the most significant pronunciation issues and provide actionable, encouraging feedback. Limit to top 5 issues maximum."""


async def run_service_logic(req):
    """Process feedback request using Gemini API."""
    
    # Return mock data if in mock mode or no API key configured
    if settings.MOCK_MODE or not settings.GEMINI_API_KEY:
        return _get_mock_response()
    
    try:
        # Prepare the user message with pronunciation data
        user_message = f"""Please analyze this pronunciation attempt:

Transcript: {req.transcript}

Alignment: {json.dumps(req.alignment, indent=2)}

User Phonemes: {json.dumps(req.user_phonemes, indent=2)}

Target Phonemes: {json.dumps(req.target_phonemes, indent=2)}

Phoneme Differences: {json.dumps(req.phoneme_diff, indent=2)}

Provide feedback in the specified JSON format."""

        # Create the model
        model = genai.GenerativeModel(
            model_name=settings.GEMINI_MODEL,
            system_instruction=SYSTEM_PROMPT,
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                temperature=0.7,
            )
        )
        
        # Generate response
        response = model.generate_content(user_message)
        
        # Parse JSON response
        result = json.loads(response.text)
        
        # Validate and ensure all required fields exist
        return _validate_response(result)
        
    except Exception as e:
        # Log the error and return a fallback response
        print(f"Error calling Gemini API: {e}")
        return _get_fallback_response(str(e))


def _validate_response(result: dict) -> dict:
    """Ensure the response has all required fields with correct structure."""
    validated = {
        "overall_summary": result.get("overall_summary", "Unable to generate summary."),
        "issues": result.get("issues", []),
        "drills": {
            "minimal_pairs": result.get("drills", {}).get("minimal_pairs", []),
            "word_practice": result.get("drills", {}).get("word_practice", []),
            "sentence_practice": result.get("drills", {}).get("sentence_practice", []),
        }
    }
    return validated


def _get_mock_response() -> dict:
    """Return mock response for testing without API calls."""
    return {
        "overall_summary": "This is a mock response. Set MOCK_MODE=false and provide GEMINI_API_KEY to enable real feedback.",
        "issues": [],
        "drills": {
            "minimal_pairs": ["ship–sheep", "bit–beat"],
            "word_practice": ["weather", "pronunciation"],
            "sentence_practice": ["Practice makes perfect."],
        },
    }


def _get_fallback_response(error: str) -> dict:
    """Return fallback response when API call fails."""
    return {
        "overall_summary": f"Unable to process feedback due to an error: {error}",
        "issues": [],
        "drills": {
            "minimal_pairs": [],
            "word_practice": [],
            "sentence_practice": [],
        },
    }

