"""
Feedback LLM Service — Prompt Loader

Loads and renders prompt templates from the configured PROMPTS_DIR.
Supports .txt files for static prompts and .j2 (Jinja2) for dynamic templates.
"""

import os
import json
import logging
from typing import Optional

from app.core.config import settings

logger = logging.getLogger(__name__)


class PromptLoader:
    """
    Loads prompt templates from disk and renders them with request data.
    Templates are cached in memory after first load.
    """

    def __init__(self, prompts_dir: Optional[str] = None):
        self.prompts_dir = prompts_dir or settings.PROMPTS_DIR
        self._system_prompt: Optional[str] = None
        self._user_template_str: Optional[str] = None
        self._few_shot_examples: Optional[list] = None
        self._correction_prompt: Optional[str] = None
        self._jinja_env = None
        self._initialized = False

    def initialize(self):
        """Load all prompt templates from disk. Call during app startup."""
        logger.info(f"Loading prompts from: {self.prompts_dir}")

        # Load system prompt
        self._system_prompt = self._load_file("feedback_system_prompt.txt")
        if not self._system_prompt:
            logger.warning("feedback_system_prompt.txt not found, using built-in default")
            self._system_prompt = self._default_system_prompt()

        # Load user prompt template (Jinja2)
        self._user_template_str = self._load_file("feedback_user_prompt.j2")
        if not self._user_template_str:
            logger.warning("feedback_user_prompt.j2 not found, using built-in default")
            self._user_template_str = self._default_user_template()

        # Load few-shot examples
        examples_raw = self._load_file("feedback_few_shot_examples.json")
        if examples_raw:
            try:
                self._few_shot_examples = json.loads(examples_raw)
                logger.info(f"Loaded {len(self._few_shot_examples)} few-shot examples")
            except json.JSONDecodeError as e:
                logger.warning(f"Failed to parse few-shot examples: {e}")
                self._few_shot_examples = []
        else:
            self._few_shot_examples = []

        # Load correction prompt
        self._correction_prompt = self._load_file("feedback_correction_prompt.txt")
        if not self._correction_prompt:
            self._correction_prompt = (
                "Your response was not valid JSON or did not match the required schema. "
                "Error: {error}. "
                "Please respond ONLY with the corrected JSON object."
            )

        # Initialize Jinja2 environment
        try:
            from jinja2 import Environment, BaseLoader
            self._jinja_env = Environment(loader=BaseLoader())
        except ImportError:
            logger.warning("Jinja2 not installed, using simple string formatting")

        self._initialized = True
        logger.info("Prompt loader initialized successfully")

    def _load_file(self, filename: str) -> Optional[str]:
        """Load a file from the prompts directory."""
        filepath = os.path.join(self.prompts_dir, filename)
        if os.path.exists(filepath):
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    content = f.read().strip()
                logger.info(f"Loaded prompt file: {filename} ({len(content)} chars)")
                return content
            except Exception as e:
                logger.error(f"Failed to read {filepath}: {e}")
        return None

    def render_system_prompt(self) -> str:
        """Return the system prompt string (no dynamic fields)."""
        if not self._initialized:
            self.initialize()
        return self._system_prompt or self._default_system_prompt()

    def render_user_prompt(self, request) -> str:
        """
        Render the user prompt with request data injected.

        Args:
            request: FeedbackRequest instance

        Returns:
            Fully rendered user prompt string
        """
        if not self._initialized:
            self.initialize()

        # Build template variables
        alignment_table = self._format_alignment_table(request.alignment)
        diff_list = self._format_diff_list(request.phoneme_diff)
        stress_summary = self._format_stress_summary(request.stress_data)
        few_shot_text = self._format_few_shot_examples()
        output_schema = self._get_output_schema_reminder()

        template_vars = {
            "transcript": request.transcript,
            "alignment_table": alignment_table,
            "user_phonemes": json.dumps(dict(request.user_phonemes), indent=2),
            "target_phonemes": json.dumps(dict(request.target_phonemes), indent=2),
            "diff_list": diff_list,
            "stress_summary": stress_summary,
            "few_shot_examples": few_shot_text,
            "output_schema_reminder": output_schema,
            "max_issues": settings.MAX_ISSUES,
        }

        # Render with Jinja2 if available
        if self._jinja_env and self._user_template_str:
            try:
                template = self._jinja_env.from_string(self._user_template_str)
                return template.render(**template_vars)
            except Exception as e:
                logger.warning(f"Jinja2 render failed, using format(): {e}")

        # Fallback: simple string formatting
        return self._user_template_str.format(**template_vars)

    def render_correction_prompt(self, error: str) -> str:
        """Render the correction/retry prompt with the error message."""
        if self._correction_prompt:
            return self._correction_prompt.replace("{error}", error)
        return f"Your response was invalid. Error: {error}. Please respond ONLY with corrected JSON."

    def get_raw_templates(self) -> dict:
        """Return raw template content for debugging via /prompts/preview."""
        if not self._initialized:
            self.initialize()
        return {
            "system_prompt": self._system_prompt or "",
            "user_prompt_template": self._user_template_str or "",
        }

    # ============================================================
    # Formatting helpers
    # ============================================================

    @staticmethod
    def _format_alignment_table(alignment) -> str:
        """Format alignment data as a readable table."""
        if not alignment:
            return "No alignment data provided."
        lines = ["Phoneme  | Start  | End"]
        lines.append("---------|--------|-------")
        for item in alignment:
            phoneme = getattr(item, "phoneme", "") or getattr(item, "word", "")
            start = getattr(item, "start", 0.0)
            end = getattr(item, "end", 0.0)
            lines.append(f"{phoneme:<9}| {start:<6.3f} | {end:.3f}")
        return "\n".join(lines)

    @staticmethod
    def _format_diff_list(phoneme_diff) -> str:
        """Format phoneme diff data as a structured list."""
        if not phoneme_diff:
            return "No phoneme differences detected."
        lines = []
        for diff in phoneme_diff:
            user_str = " ".join(diff.user) if diff.user else "N/A"
            target_str = " ".join(diff.target) if diff.target else "N/A"
            lines.append(
                f"- Word: \"{diff.word}\"\n"
                f"  User:     [{user_str}]\n"
                f"  Target:   [{target_str}]\n"
                f"  Issue:    {diff.issue}\n"
                f"  Severity: {diff.severity}\n"
                f"  Notes:    {diff.notes or 'N/A'}"
            )
        return "\n".join(lines)

    @staticmethod
    def _format_stress_summary(stress_data) -> str:
        """Format stress data as a summary string."""
        if not stress_data:
            return "No stress data available."
        parts = []
        if stress_data.word_level:
            incorrect = [w for w in stress_data.word_level if not w.is_correct]
            parts.append(f"Word stress: {len(stress_data.word_level)} words analyzed, {len(incorrect)} with issues")
        if stress_data.sentence_rhythm:
            if stress_data.sentence_rhythm.speaking_rate:
                parts.append(f"Speaking rate: {stress_data.sentence_rhythm.speaking_rate:.0f} WPM")
            parts.append(f"Rhythm quality: {stress_data.sentence_rhythm.rhythm_quality}")
        return "; ".join(parts) if parts else "No significant stress patterns detected."

    def _format_few_shot_examples(self) -> str:
        """Format few-shot examples for inclusion in the prompt."""
        if not self._few_shot_examples:
            return ""
        lines = ["\n--- FEW-SHOT EXAMPLES ---\n"]
        for ex in self._few_shot_examples:
            lines.append(f"### Example: {ex.get('label', 'unnamed')}")
            lines.append(f"Input (summary): {json.dumps(ex.get('input', {}), indent=2)[:500]}")
            lines.append(f"Expected Output: {json.dumps(ex.get('output', {}), indent=2)}")
            lines.append("")
        return "\n".join(lines)

    @staticmethod
    def _get_output_schema_reminder() -> str:
        """Return the JSON schema reminder to append at the end of the prompt."""
        return """{
  "overall_summary": "string",
  "issues": [
    {
      "word": "string",
      "user_pronunciation": "space-joined ARPAbet",
      "target_pronunciation": "space-joined ARPAbet",
      "issue_type": "vowel_shift|consonant_error|stress|rhythm|schwa|intonation|substitution|insertion|deletion",
      "explanation": "string",
      "fix_instructions": "string",
      "audio_timestamps": {"start": float, "end": float},
      "severity": "low|medium|high"
    }
  ],
  "drills": {
    "minimal_pairs": ["string"],
    "repeat_phrases": ["string"],
    "focus_phonemes": ["string"]
  },
  "overall_score": float (0-100),
  "fluency_score": float (0-100),
  "accuracy_score": float (0-100),
  "prosody_score": float (0-100),
  "strengths": ["string"],
  "improvement_tips": ["string"],
  "encouragement": "string"
}"""

    @staticmethod
    def _default_system_prompt() -> str:
        """Built-in system prompt fallback."""
        return """You are an advanced pronunciation and accent coach specialized in helping non-native English speakers achieve a clear, neutral, and professional American English accent.

Your job:
- Analyze user's pronunciation using phoneme-level data (aligned timestamps + differences between user and target phonemes).
- Identify errors with high precision and no guessing.
- Provide helpful, actionable correction instructions.
- Suggest practice drills and minimal pairs.
- Provide numeric scores for overall, fluency, accuracy, and prosody (0-100).
- Always output structured JSON matching the exact schema provided.

Important rules:
- NEVER invent phoneme data or timestamps not present in the input.
- Base your analysis ONLY on the provided user phonemes, target phonemes, and transcript.
- If any data is missing, explicitly state what is missing.
- Keep explanations short, direct, and practical.
- Use GA (General American) phoneme conventions.
- If a field cannot be determined from input data, use null — never hallucinate.

Strict guardrails:
1. Never hallucinate phoneme-level details.
2. Never guess reasons for pronunciation errors not supported by data.
3. Only provide feedback for words present in the diff-engine output.
4. If uncertain, say "insufficient data".
5. Keep all timestamps exactly as provided.
6. Never output text outside JSON — no markdown, no backticks, no preamble."""

    @staticmethod
    def _default_user_template() -> str:
        """Built-in user prompt template fallback."""
        return """Analyze the pronunciation data below and generate expert feedback.
Return ONLY a valid JSON object matching the schema. No markdown, no backticks.

Focus on the most significant pronunciation issues. Limit to top {max_issues} issues maximum.

---

Transcript: {transcript}

Alignment Data:
{alignment_table}

User Phonemes: {user_phonemes}

Target Phonemes: {target_phonemes}

Phoneme Differences:
{diff_list}

Stress & Rhythm: {stress_summary}

{few_shot_examples}

--- REQUIRED OUTPUT JSON SCHEMA ---
{output_schema_reminder}

Respond with ONLY the JSON object. No other text."""
