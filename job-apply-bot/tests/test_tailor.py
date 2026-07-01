import pathlib
import pytest
from unittest.mock import MagicMock

from src.profile.loader import UserProfile
from src.profile.tailor import ResumeTailor


def make_profile():
    return UserProfile(
        first_name="Jane",
        last_name="Doe",
        email="jane@example.com",
        phone="555-0100",
        location="San Francisco, CA",
        linkedin_url="https://linkedin.com/in/janedoe",
        github_url="https://github.com/janedoe",
        years_experience=5,
        skills=["Python", "TypeScript", "AWS"],
        education=[
            {"degree": "B.S. Computer Science", "institution": "State University", "year": "2019"}
        ],
        experience=[
            {
                "title": "Software Engineer",
                "company": "Tech Corp",
                "start": "2019",
                "end": "Present",
                "bullets": ["Built scalable APIs", "Led cross-functional projects"],
            }
        ],
        summary="Experienced software engineer with a focus on scalable systems.",
    )


def make_llm_client(summary_text: str = "Tailored summary for the role."):
    content_block = MagicMock()
    content_block.text = summary_text
    message = MagicMock()
    message.content = [content_block]
    client = MagicMock()
    client.messages.create = MagicMock(return_value=message)
    return client


def test_tailor_returns_pdf_path(tmp_path):
    """tailor() returns the output_path and the file exists after generation."""
    output_path = str(tmp_path / "resume.pdf")
    llm = make_llm_client()
    tailor = ResumeTailor(llm_client=llm)
    profile = make_profile()
    result = tailor.tailor(profile, job_description="Looking for a Python engineer.", output_path=output_path)
    assert result == output_path
    assert pathlib.Path(output_path).exists()


def test_tailor_calls_llm(tmp_path):
    """tailor() calls the LLM with the job_description in the prompt."""
    output_path = str(tmp_path / "resume.pdf")
    job_description = "We need a cloud-native TypeScript developer."
    llm = make_llm_client()
    tailor = ResumeTailor(llm_client=llm)
    profile = make_profile()
    tailor.tailor(profile, job_description=job_description, output_path=output_path)

    assert llm.messages.create.called
    messages = llm.messages.create.call_args.kwargs["messages"]
    prompt_text = messages[0]["content"]
    assert job_description in prompt_text
