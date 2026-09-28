"""Write long deterministic T001-T010 protocol PDFs into uploads/ and public/uploads/."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT_DIRS = [ROOT / "uploads", ROOT / "public" / "uploads"]

BASE_TRIALS = [
    ("T001", "Type 2 Diabetes Drug Trial", "Type 2 diabetes mellitus (T2DM)", 30, 65, "Any", "8.0", "18", "35", "Insulin", "oral study medicine compared with usual clinic care"),
    ("T002", "Intensive Glucose Control Study", "Type 2 diabetes mellitus", 40, 70, "Any", "9.0", "20", "40", "Insulin", "tighter glucose targets with extra clinic contact"),
    ("T003", "Hypertension Outcomes Trial", "Hypertension (HTN)", 35, 75, "Any", "10.0", "18", "40", "Spironolactone", "blood pressure outcomes over 12 months"),
    ("T004", "High Blood Pressure Lifestyle Trial", "High blood pressure", 25, 60, "Female", "7.5", "22", "32", "Lisinopril", "diet, walking, and home blood pressure logs"),
    ("T005", "COPD Inhaler Study", "Chronic obstructive pulmonary disease (COPD)", 40, 80, "Any", "10.0", "16", "35", "Prednisone", "inhaler technique and lung function checks"),
    ("T006", "Pulmonary Rehabilitation Trial", "Chronic obstructive pulmonary disease", 50, 75, "Any", "9.0", "18", "32", "Oxygen", "supervised exercise and breathing sessions"),
    ("T007", "Heart Failure Device Trial", "Heart failure", 45, 80, "Any", "10.0", "18", "40", "Digoxin", "device follow-up and heart clinic visits"),
    ("T008", "Obesity Weight Management Study", "Obesity", 21, 55, "Any", "8.5", "30", "50", "Semaglutide", "food plan, activity, and weekly weight review"),
    ("T009", "Type 1 Diabetes Closed Loop Trial", "Type 1 diabetes", 18, 45, "Any", "9.5", "18", "32", "Metformin", "closed-loop insulin device training"),
    ("T010", "CKD Progression Study", "Chronic kidney disease (CKD)", 30, 70, "Any", "8.5", "18", "38", "Ibuprofen", "kidney labs and medicine review"),
]


def build_trials() -> list[tuple]:
    trials = []
    for number in range(1, 101):
        base = BASE_TRIALS[(number - 1) % len(BASE_TRIALS)]
        if number <= len(BASE_TRIALS):
            trials.append(base)
            continue
        _, title, condition, min_age, max_age, gender, max_hba1c, min_bmi, max_bmi, excluded, focus = base
        trials.append(
            (
                f"T{number:03d}",
                f"{title} {number:03d}",
                condition,
                min_age,
                max_age,
                gender,
                max_hba1c,
                min_bmi,
                max_bmi,
                excluded,
                focus,
            )
        )
    return trials


TRIALS = BASE_TRIALS


def protocol_lines(row) -> list[str]:
    tid, title, condition, min_age, max_age, gender, max_hba1c, min_bmi, max_bmi, excluded, focus = row
    return [
        f"PROTOCOL {tid}",
        title,
        "Version 1.0. Summary for recruitment matching. Not a medical diagnosis.",
        "1. BACKGROUND",
        f"{tid} studies people with {condition}. The study question is {focus}.",
        "Sites keep usual clinic care unless the protocol names a change. Coordinators record visits and safety events.",
        "This document is long so retrieval can split background, criteria, visits, and safety into separate chunks.",
        "2. OBJECTIVES",
        f"Primary: describe recruitment for {title} using structured age, gender, condition, HbA1c, BMI, and excluded medicine.",
        "Secondary: count screening visits, contact attempts, and reasons a person does not continue.",
        "The matching engine does not decide medical eligibility. Screening remains with the study team.",
        "3. POPULATION",
        f"Condition of interest: {condition}.",
        f"Age inclusion: {min_age} to {max_age} years at consent.",
        f"Gender inclusion: {gender}. If Any, male and female may be listed.",
        f"HbA1c maximum allowed in the structured record: {max_hba1c}.",
        f"BMI inclusion window: {min_bmi} to {max_bmi}.",
        "People outside these numeric windows are not a potential match in the app, except a near miss on one numeric field.",
        "4. EXCLUSIONS",
        f"Excluded medicine for {tid}: {excluded}.",
        f"If current medicine canonicalizes to {excluded}, the medicine criterion fails and the trial is not shown as a potential match.",
        "Salt names such as hydrochloride are stripped before that compare. This section is only about medicine exclusion.",
        "Pregnancy, inability to attend visits, and missing contact details are recorded by the coordinator, not by the matching score.",
        "5. VISIT SCHEDULE",
        "Visit 0: phone or clinic pre-screen. Confirm identity and the trial identifier.",
        "Visit 1: screening labs and consent discussion. No result in this file is a diagnosis.",
        "Visit 2: baseline measures for the condition named above.",
        "Visit 3: week 4 safety check.",
        "Visit 4: week 12 primary follow-up.",
        "Visit 5: end of study or early exit. Missed visits are logged in recruitment status notes.",
        f"For {tid}, visit work follows {focus}.",
        "6. ASSESSMENTS",
        f"Condition review each visit for {condition}.",
        "Age is not re-scored after matching unless the coordinator edits the patient record.",
        f"HbA1c is compared with the trial maximum {max_hba1c} only in the structured engine.",
        f"BMI is compared with {min_bmi} to {max_bmi}.",
        "Ask answers must come from this protocol. Do not invent doses, brands, or extra hospitals.",
        "7. SAFETY",
        "Adverse events are reported to the coordinator. This PDF does not list emergency treatments.",
        f"People on {excluded} stay out of matching for {tid}.",
        "Device or inhaler issues, if any, are written in the visit note, not in the matching engine.",
        "8. DATA AND ASK",
        "Participant Ask may use this file as knowledge. The model may only restate text that appears here.",
        f"Trial id to cite: {tid}. Title to cite: {title}.",
        "Recruitment statuses after apply: Applied, Identified, Contacted, Screened, Enrolled.",
        "9. ADMINISTRATIVE",
        f"Sponsor file name: {tid}.pdf. Store under uploads and public/uploads.",
        "Chunking demo: background, population, exclusions, and visits should land in different chunks.",
        "End of protocol.",
    ]


def wrap(line: str, width: int = 88) -> list[str]:
    words = line.split()
    if not words:
        return [""]
    rows, current = [], words[0]
    for word in words[1:]:
        if len(current) + 1 + len(word) > width:
            rows.append(current)
            current = word
        else:
            current += " " + word
    rows.append(current)
    return rows


def esc(text: str) -> str:
    return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def paginate(lines: list[str], per_page: int = 46) -> list[list[str]]:
    wrapped: list[str] = []
    for line in lines:
        wrapped.extend(wrap(line))
        wrapped.append("")
    pages = []
    for i in range(0, len(wrapped), per_page):
        pages.append(wrapped[i : i + per_page])
    return pages or [[""]]


def build_pdf(lines: list[str]) -> bytes:
    pages = paginate(lines)
    page_count = len(pages)
    font_id = 3 + page_count * 2
    numbered: list[bytes | str] = [
        "<< /Type /Catalog /Pages 2 0 R >>",
        f"<< /Type /Pages /Kids [{' '.join(f'{3 + i} 0 R' for i in range(page_count))}] /Count {page_count} >>",
    ]
    streams: list[bytes] = []
    for page_lines in pages:
        cmds = ["BT /F1 11 Tf 50 770 Td 14 TL"]
        for line in page_lines:
            cmds.append(f"({esc(line)}) Tj T*")
        cmds.append("ET")
        streams.append("\n".join(cmds).encode("latin-1", "replace"))
    for i in range(page_count):
        numbered.append(
            f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents {3 + page_count + i} 0 R "
            f"/Resources << /Font << /F1 {font_id} 0 R >> >> >>"
        )
    numbered.extend(streams)
    numbered.append("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")

    rebuilt = [b"%PDF-1.4\n"]
    offsets = []
    n = 1
    for item in numbered:
        offsets.append(len(b"".join(rebuilt)))
        if isinstance(item, bytes):
            rebuilt.append(f"{n} 0 obj << /Length {len(item)} >> stream\n".encode() + item + b"\nendstream endobj\n")
        else:
            rebuilt.append(f"{n} 0 obj {item} endobj\n".encode())
        n += 1
    body = b"".join(rebuilt)
    xref = f"xref\n0 {n}\n0000000000 65535 f \n" + "".join(f"{off:010d} 00000 n \n" for off in offsets)
    trailer = f"trailer << /Size {n} /Root 1 0 R >>\nstartxref\n{len(body)}\n%%EOF\n"
    return body + xref.encode() + trailer.encode()


def main() -> None:
    for folder in OUT_DIRS:
        folder.mkdir(parents=True, exist_ok=True)
    for row in TRIALS:
        pdf = build_pdf(protocol_lines(row))
        name = f"{row[0]}.pdf"
        for folder in OUT_DIRS:
            (folder / name).write_bytes(pdf)
        print(name, len(pdf), "bytes")


if __name__ == "__main__":
    main()
