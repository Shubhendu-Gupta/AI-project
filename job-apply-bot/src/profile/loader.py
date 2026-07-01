import yaml
import pathlib
from dataclasses import dataclass
from typing import Optional

CONFIG_DIR = pathlib.Path(__file__).parent.parent.parent / 'config'


@dataclass
class UserProfile:
    first_name: str
    last_name: str
    email: str
    phone: str
    location: str
    linkedin_url: str
    github_url: str
    years_experience: int
    skills: list[str]
    education: list[dict]
    experience: list[dict]
    summary: str

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"


@dataclass
class SearchConfig:
    job_titles: list[str]
    locations: list[str]
    remote_only: bool
    salary_min: int
    experience_level: str
    exclude_keywords: list[str]


def load_profile(path: Optional[pathlib.Path] = None) -> UserProfile:
    profile_path = pathlib.Path(path) if path else CONFIG_DIR / 'profile.yaml'
    with profile_path.open('r', encoding='utf-8') as fh:
        data = yaml.safe_load(fh)

    required = [
        'first_name', 'last_name', 'email', 'phone', 'location',
        'linkedin_url', 'github_url', 'years_experience', 'skills',
        'education', 'experience', 'summary',
    ]
    missing = [field for field in required if field not in data]
    if missing:
        raise ValueError(
            f"profile.yaml is missing required fields: {', '.join(missing)}"
        )

    return UserProfile(
        first_name=data['first_name'],
        last_name=data['last_name'],
        email=data['email'],
        phone=data['phone'],
        location=data['location'],
        linkedin_url=data['linkedin_url'],
        github_url=data['github_url'],
        years_experience=int(data['years_experience']),
        skills=list(data['skills']),
        education=list(data['education']),
        experience=list(data['experience']),
        summary=data['summary'],
    )


def load_search_config(path: Optional[pathlib.Path] = None) -> SearchConfig:
    search_path = pathlib.Path(path) if path else CONFIG_DIR / 'search.yaml'
    with search_path.open('r', encoding='utf-8') as fh:
        data = yaml.safe_load(fh)

    required = [
        'job_titles', 'locations', 'remote_only', 'salary_min',
        'experience_level', 'exclude_keywords',
    ]
    missing = [field for field in required if field not in data]
    if missing:
        raise ValueError(
            f"search.yaml is missing required fields: {', '.join(missing)}"
        )

    return SearchConfig(
        job_titles=list(data['job_titles']),
        locations=list(data['locations']),
        remote_only=bool(data['remote_only']),
        salary_min=int(data['salary_min']),
        experience_level=str(data['experience_level']),
        exclude_keywords=list(data['exclude_keywords']),
    )


def load_qa_bank(path: Optional[pathlib.Path] = None) -> list[dict]:
    qa_path = pathlib.Path(path) if path else CONFIG_DIR / 'qa_bank.yaml'
    with qa_path.open('r', encoding='utf-8') as fh:
        data = yaml.safe_load(fh)

    if not isinstance(data, list):
        raise ValueError("qa_bank.yaml must be a list of {question, answer} mappings")

    entries = []
    for i, item in enumerate(data):
        if 'question' not in item or 'answer' not in item:
            raise ValueError(
                f"qa_bank.yaml entry {i} is missing 'question' or 'answer' key"
            )
        entries.append({'question': str(item['question']), 'answer': str(item['answer'])})

    return entries
