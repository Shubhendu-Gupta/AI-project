import anthropic
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer

from src.profile.loader import UserProfile


class ResumeTailor:
    def __init__(self, llm_client=None):
        self._client = llm_client if llm_client else anthropic.Anthropic()

    def tailor(self, profile: UserProfile, job_description: str, output_path: str) -> str:
        """Generate a tailored PDF resume. Returns output_path."""
        tailored_summary = self._tailor_summary(profile, job_description)
        self._generate_pdf(profile, tailored_summary, output_path)
        return output_path

    def _tailor_summary(self, profile: UserProfile, job_description: str) -> str:
        prompt = (
            f"Rewrite this professional summary to match the job description. "
            f"2-3 sentences, first person, professional.\n\n"
            f"Original: {profile.summary}\n\nJob description: {job_description}\n\nReturn ONLY the summary."
        )
        response = self._client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=200,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.content[0].text.strip()

    def _generate_pdf(self, profile: UserProfile, summary: str, output_path: str) -> None:
        doc = SimpleDocTemplate(
            output_path,
            pagesize=letter,
            leftMargin=inch,
            rightMargin=inch,
            topMargin=inch,
            bottomMargin=inch,
        )
        styles = getSampleStyleSheet()
        name_style = ParagraphStyle("Name", fontSize=16, spaceAfter=4, fontName="Helvetica-Bold")
        section_style = ParagraphStyle("Section", fontSize=12, spaceAfter=2, fontName="Helvetica-Bold")
        body = styles["Normal"]
        name = f"{profile.first_name} {profile.last_name}"
        contact = f"{profile.email} | {profile.phone} | {profile.location}"
        elements = [
            Paragraph(name, name_style),
            Paragraph(contact, body),
            Spacer(1, 0.1 * inch),
            Paragraph("Summary", section_style),
            Paragraph(summary, body),
            Spacer(1, 0.1 * inch),
            Paragraph("Skills", section_style),
            Paragraph(", ".join(profile.skills), body),
            Spacer(1, 0.1 * inch),
            Paragraph("Experience", section_style),
        ]
        for exp in profile.experience:
            elements.append(Paragraph(
                f"<b>{exp.get('title')} at {exp.get('company')}</b> ({exp.get('start')} – {exp.get('end')})",
                body,
            ))
            for bullet in exp.get("bullets", []):
                elements.append(Paragraph(f"• {bullet}", body))
            elements.append(Spacer(1, 0.05 * inch))
        elements.append(Paragraph("Education", section_style))
        for edu in profile.education:
            elements.append(Paragraph(
                f"{edu.get('degree')}, {edu.get('institution')} ({edu.get('year')})",
                body,
            ))
        doc.build(elements)
