import logging
from typing import Optional, TYPE_CHECKING

import anthropic
from rapidfuzz import fuzz

from src.profile.loader import UserProfile

if TYPE_CHECKING:
    pass

logger = logging.getLogger(__name__)

_FALLBACK = "I'd be happy to discuss this further during the interview."

FUZZY_THRESHOLD = 80


class QAAnswerer:
    def __init__(
        self,
        profile: UserProfile,
        qa_bank: list[dict],
        model: str = 'claude-sonnet-4-6',
        client: Optional[anthropic.Anthropic] = None,
    ):
        self.profile = profile
        self.qa_bank = qa_bank
        self.model = model
        self._client = client if client is not None else anthropic.Anthropic()

    def answer(self, question: str, context: str = '') -> str:
        """
        1. Try fuzzy match against qa_bank (threshold 80). If match, return stored answer.
        2. Otherwise call Claude API with profile context to generate an answer.
        Always handle API errors: return a safe fallback string on exception.
        """
        stored = self._fuzzy_match(question)
        if stored is not None:
            return stored
        return self._claude_answer(question, context)

    def _fuzzy_match(self, question: str) -> Optional[str]:
        """Return stored answer if best fuzz.ratio match >= 80, else None."""
        if not self.qa_bank:
            return None

        best_score = 0
        best_answer: Optional[str] = None
        q_lower = question.lower()

        for entry in self.qa_bank:
            score = fuzz.ratio(q_lower, entry['question'].lower())
            if score > best_score:
                best_score = score
                best_answer = entry['answer']

        if best_score >= FUZZY_THRESHOLD:
            return best_answer
        return None

    def _claude_answer(self, question: str, context: str) -> str:
        """
        Call claude-sonnet-4-6 with a system prompt that includes the user's
        profile summary, skills, and years_experience. Keep answers concise
        (1–3 sentences). Handle anthropic.APIError and return fallback on error.
        """
        system_prompt = (
            f"You are filling out a job application on behalf of {self.profile.full_name}. "
            f"Answer questions concisely in 1–3 sentences using first-person voice.\n\n"
            f"Candidate summary: {self.profile.summary}\n"
            f"Years of experience: {self.profile.years_experience}\n"
            f"Skills: {', '.join(self.profile.skills)}\n"
            f"Location: {self.profile.location}\n"
            f"Email: {self.profile.email}"
        )

        user_content = f"Question: {question}"
        if context:
            user_content = f"Context: {context}\n\n{user_content}"

        try:
            response = self._client.messages.create(
                model=self.model,
                max_tokens=256,
                system=system_prompt,
                messages=[{'role': 'user', 'content': user_content}],
            )
            return response.content[0].text.strip()
        except anthropic.APIError as exc:
            logger.error("Claude API error while answering question %r: %s", question, exc)
            return _FALLBACK
        except Exception as exc:
            logger.error("Unexpected error while answering question %r: %s", question, exc)
            return _FALLBACK
