"""Generate the two sample referral-letter PDFs used to test document upload.

These are entirely fictional letters, written in the prose style a GP or social
worker would actually use, and are deliberately loosely consistent with two of
the patients in ``patients.json`` (PT-001 and PT-007). Run from the backend
directory:

    python scripts/generate_sample_pdfs.py
"""

from pathlib import Path

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer

# Resolve paths relative to the backend root so the script works from anywhere.
BACKEND_ROOT = Path(__file__).resolve().parent.parent
OUTPUT_DIR = BACKEND_ROOT / "data" / "sample_pdfs"


# Each letter is a list of paragraphs. Blank strings render as spacing.
GP_REFERRAL_LETTER = [
    "Cardiff Royal Infirmary -- Older Persons Mental Health",
    "GP Referral to Adult Social Services",
    "",
    "Date: 13 May 2026",
    "Re: Mrs Gwendoline Pritchard, DOB 04/02/1944, 12 Heol Hir, Llanishen, CF14",
    "",
    "Dear Social Work Team,",
    "",
    "I am writing to refer Mrs Pritchard, an 82-year-old lady with a diagnosis of "
    "Alzheimer's disease (moderate stage), who lives alone in Llanishen. She uses a "
    "walking frame following two near-falls on her stairs in the past month.",
    "",
    "Mrs Pritchard has increasing short-term memory difficulties. She repeats herself, "
    "forgets whether she has eaten, and becomes notably disoriented in the evenings. I "
    "have concerns about medication adherence, as her dosette boxes are frequently found "
    "full at review.",
    "",
    "There is a difference of opinion regarding personal care. Her daughter, who lives in "
    "Bristol and visits fortnightly, reports that her mother can no longer manage washing "
    "and dressing and needs hands-on help each morning. However, during a recent hospital "
    "admission the ward nursing record stated she was independent with all personal care. "
    "A home assessment to clarify this would be valuable.",
    "",
    "Key concerns are falls risk, social isolation and medication management. I would be "
    "grateful for a social care needs assessment with a view to a support package and "
    "possible assistive technology.",
    "",
    "Yours faithfully,",
    "Dr Helen Probert, GP, Llanishen Health Centre",
]

SOCIAL_WORK_SUMMARY = [
    "Cardiff Council -- Adult Social Services",
    "Social Worker Assessment Summary",
    "",
    "Date: 9 June 2026",
    "Re: Mrs Marian Hughes, age 90, city centre, CF10",
    "",
    "Summary of visit and concerns:",
    "",
    "Mrs Hughes is a 90-year-old lady with severe vascular dementia, referred by her GP "
    "following a welfare check. She lives alone and is a wheelchair user. She was recently "
    "discharged from hospital after a fall and a chest infection with no package of care in "
    "place, which the discharge team flagged as a concern.",
    "",
    "The ward nursing record documented that she required full assistance with all care "
    "during her admission. On my home visit I found Mrs Hughes cold, unkempt, and with very "
    "little food in the house. She was disoriented and could not reliably tell me what day "
    "it was. No family contact is currently known.",
    "",
    "This is a high-risk, safeguarding-level situation. Risks include falls, self-neglect, "
    "malnutrition and social isolation. I do not consider it safe for Mrs Hughes to remain "
    "at home without urgent, intensive support, and residential care may need to be "
    "considered. I am requesting an urgent crisis response and a full reassessment of her "
    "long-term care needs.",
    "",
    "Prepared by: J. Okafor, Social Worker, Adult Services",
]


def _build_pdf(file_path: Path, lines: list[str]) -> None:
    """Render a list of text lines into a simple, clean A4 PDF."""
    styles = getSampleStyleSheet()
    body = styles["BodyText"]
    title = styles["Heading2"]

    document = SimpleDocTemplate(
        str(file_path), pagesize=A4, topMargin=2 * cm, bottomMargin=2 * cm
    )
    flowables = []
    for index, line in enumerate(lines):
        if line == "":
            flowables.append(Spacer(1, 0.3 * cm))
        else:
            # Treat the first two non-empty lines as headings for a letterhead feel.
            style = title if index < 2 else body
            flowables.append(Paragraph(line, style))
    document.build(flowables)


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    _build_pdf(OUTPUT_DIR / "gp_referral_pritchard.pdf", GP_REFERRAL_LETTER)
    _build_pdf(OUTPUT_DIR / "social_work_summary_hughes.pdf", SOCIAL_WORK_SUMMARY)
    print(f"Wrote 2 sample PDFs to {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
