"""Unit tests for QAAnswerer."""
import unittest.mock as mock

import pytest
import anthropic

from src.profile.loader import UserProfile
from src.qa.answerer import QAAnswerer, _FALLBACK, FUZZY_THRESHOLD


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_mock_client() -> mock.MagicMock:
    """Return a mock that quacks like anthropic.Anthropic() without network calls."""
    client = mock.MagicMock(spec=anthropic.Anthropic)
    client.messages = mock.MagicMock()
    return client


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture()
def profile() -> UserProfile:
    return UserProfile(
        first_name='Jane',
        last_name='Doe',
        email='jane@example.com',
        phone='+1-555-0100',
        location='San Francisco, CA',
        linkedin_url='https://linkedin.com/in/janedoe',
        github_url='https://github.com/janedoe',
        years_experience=5,
        skills=['Python', 'Django', 'PostgreSQL'],
        education=[{'degree': 'B.S. CS', 'institution': 'UC Berkeley', 'year': 2019}],
        experience=[{
            'title': 'Backend Engineer',
            'company': 'Acme',
            'start': '2021-03',
            'end': 'present',
            'bullets': [],
        }],
        summary='Backend engineer with 5 years experience.',
    )


@pytest.fixture()
def qa_bank() -> list[dict]:
    return [
        {'question': 'Why do you want to work here?', 'answer': 'I love hard problems.'},
        {'question': 'What is your expected salary?', 'answer': '$130k–$160k'},
        {'question': 'Are you authorized to work in the US?', 'answer': 'Yes'},
    ]


@pytest.fixture()
def mock_client() -> mock.MagicMock:
    return _make_mock_client()


@pytest.fixture()
def answerer(profile: UserProfile, qa_bank: list[dict], mock_client: mock.MagicMock) -> QAAnswerer:
    return QAAnswerer(profile, qa_bank, model='claude-sonnet-4-6', client=mock_client)


# ---------------------------------------------------------------------------
# Fuzzy match tests
# ---------------------------------------------------------------------------

class TestFuzzyMatch:
    def test_exact_match_returns_stored_answer(self, answerer: QAAnswerer) -> None:
        result = answerer._fuzzy_match('Why do you want to work here?')
        assert result == 'I love hard problems.'

    def test_near_match_above_threshold_returns_answer(self, answerer: QAAnswerer) -> None:
        # Slightly rephrased but close enough (>= 80 ratio)
        result = answerer._fuzzy_match('why do you want to work here')
        # "why do you want to work here" vs "Why do you want to work here?" — very close
        assert result is not None

    def test_unrelated_question_returns_none(self, answerer: QAAnswerer) -> None:
        result = answerer._fuzzy_match('Describe your hobbies and interests outside of work.')
        assert result is None

    def test_empty_qa_bank_returns_none(self, profile: UserProfile) -> None:
        empty_answerer = QAAnswerer(
            profile, [], model='claude-sonnet-4-6', client=_make_mock_client()
        )
        result = empty_answerer._fuzzy_match('Any question')
        assert result is None

    def test_salary_question_fuzzy(self, answerer: QAAnswerer) -> None:
        result = answerer._fuzzy_match('What is your expected salary?')
        assert result == '$130k–$160k'


# ---------------------------------------------------------------------------
# answer() with fuzzy hit — Claude should NOT be called
# ---------------------------------------------------------------------------

class TestAnswerFuzzyHit:
    def test_fuzzy_hit_does_not_call_claude(
        self, answerer: QAAnswerer, mock_client: mock.MagicMock
    ) -> None:
        result = answerer.answer('Why do you want to work here?')
        mock_client.messages.create.assert_not_called()
        assert result == 'I love hard problems.'

    def test_fuzzy_hit_authorized_question(
        self, answerer: QAAnswerer, mock_client: mock.MagicMock
    ) -> None:
        result = answerer.answer('Are you authorized to work in the US?')
        mock_client.messages.create.assert_not_called()
        assert result == 'Yes'


# ---------------------------------------------------------------------------
# answer() with no fuzzy match — Claude should be called
# ---------------------------------------------------------------------------

class TestAnswerClaudeCalled:
    def test_claude_called_when_no_fuzzy_match(
        self, answerer: QAAnswerer, mock_client: mock.MagicMock
    ) -> None:
        expected = 'I thrive in collaborative environments.'
        mock_resp = mock.MagicMock()
        mock_resp.content = [mock.MagicMock(text=expected)]
        mock_client.messages.create.return_value = mock_resp

        result = answerer.answer('Describe your ideal work environment.')
        mock_client.messages.create.assert_called_once()
        assert result == expected

    def test_claude_called_with_context(
        self, answerer: QAAnswerer, mock_client: mock.MagicMock
    ) -> None:
        mock_resp = mock.MagicMock()
        mock_resp.content = [mock.MagicMock(text='Some answer')]
        mock_client.messages.create.return_value = mock_resp

        answerer.answer('Tell us about yourself.', context='We are a startup.')
        call_kwargs = mock_client.messages.create.call_args.kwargs
        messages = call_kwargs.get('messages', [])
        user_content = messages[0]['content'] if messages else ''
        assert 'Tell us about yourself.' in user_content
        assert 'We are a startup.' in user_content


# ---------------------------------------------------------------------------
# _claude_answer() — API error handling
# ---------------------------------------------------------------------------

class TestClaudeAnswerAPIError:
    def test_api_error_returns_fallback(
        self, answerer: QAAnswerer, mock_client: mock.MagicMock
    ) -> None:
        mock_client.messages.create.side_effect = anthropic.APIError(
            message='Service unavailable',
            request=mock.MagicMock(),
            body=None,
        )
        result = answerer._claude_answer('Describe yourself.', '')
        assert result == _FALLBACK

    def test_unexpected_error_returns_fallback(
        self, answerer: QAAnswerer, mock_client: mock.MagicMock
    ) -> None:
        mock_client.messages.create.side_effect = RuntimeError('Connection refused')
        result = answerer._claude_answer('What motivates you?', '')
        assert result == _FALLBACK

    def test_successful_claude_call(
        self, answerer: QAAnswerer, mock_client: mock.MagicMock
    ) -> None:
        expected_text = 'I am motivated by challenging engineering problems.'
        mock_resp = mock.MagicMock()
        mock_resp.content = [mock.MagicMock(text=f'  {expected_text}  ')]
        mock_client.messages.create.return_value = mock_resp

        result = answerer._claude_answer('What motivates you?', '')
        assert result == expected_text

    def test_claude_system_prompt_includes_profile(
        self, answerer: QAAnswerer, mock_client: mock.MagicMock
    ) -> None:
        """Verify that the system prompt sent to Claude includes key profile info."""
        mock_resp = mock.MagicMock()
        mock_resp.content = [mock.MagicMock(text='Answer')]
        mock_client.messages.create.return_value = mock_resp

        answerer._claude_answer('Tell us about yourself.', '')
        call_kwargs = mock_client.messages.create.call_args.kwargs
        system_prompt = call_kwargs.get('system', '')
        assert 'Jane Doe' in system_prompt
        assert '5' in system_prompt  # years_experience
        assert 'Python' in system_prompt


# ---------------------------------------------------------------------------
# Integration-style: answer() API error path reaches fallback
# ---------------------------------------------------------------------------

class TestAnswerEndToEnd:
    def test_answer_returns_fallback_on_api_error_no_fuzzy_match(
        self, answerer: QAAnswerer, mock_client: mock.MagicMock
    ) -> None:
        mock_client.messages.create.side_effect = anthropic.APIError(
            message='Rate limited',
            request=mock.MagicMock(),
            body=None,
        )
        result = answerer.answer('A completely novel question with no qa_bank match xyz.')
        assert result == _FALLBACK

    def test_answer_strips_whitespace_from_claude_response(
        self, answerer: QAAnswerer, mock_client: mock.MagicMock
    ) -> None:
        mock_resp = mock.MagicMock()
        mock_resp.content = [mock.MagicMock(text='   Padded answer.   ')]
        mock_client.messages.create.return_value = mock_resp

        result = answerer.answer('Novel question not in qa bank xyz abc.')
        assert result == 'Padded answer.'
