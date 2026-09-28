"""Ask using hardcoded T001-T010 trial prompts and sends the full prompt to Groq.

Usage:
  python bot.py T001 "What is the age range?"
"""

from __future__ import annotations

import sys

from groq_client import groq_answer

TRIALS = [
    {
        "trial_id": "T001",
        "title": "Type 2 Diabetes Drug Trial",
        "condition": "T2DM",
        "min_age": 30,
        "max_age": 65,
        "gender": "Any",
        "max_hba1c": 8.0,
        "min_bmi": 18,
        "max_bmi": 35,
        "excluded_medicine": "Insulin",
        "abstract": "This Phase 3 trial evaluates the efficacy and safety of a novel oral hypoglycemic agent in adults with poorly controlled Type 2 Diabetes Mellitus.",
    },
    {
        "trial_id": "T002",
        "title": "Intensive Glucose Control Study",
        "condition": "Type 2 Diabetes Mellitus",
        "min_age": 40,
        "max_age": 70,
        "gender": "Any",
        "max_hba1c": 9.0,
        "min_bmi": 20,
        "max_bmi": 40,
        "excluded_medicine": "Insulin",
        "abstract": "An observational study comparing standard versus intensive glycemic control strategies for preventing microvascular complications in patients with long-standing Type 2 Diabetes.",
    },
    {
        "trial_id": "T003",
        "title": "Hypertension Outcomes Trial",
        "condition": "HTN",
        "min_age": 35,
        "max_age": 75,
        "gender": "Any",
        "max_hba1c": 10.0,
        "min_bmi": 18,
        "max_bmi": 40,
        "excluded_medicine": "Spironolactone",
        "abstract": "This study investigates the long-term cardiovascular outcomes of a new combination therapy for patients with treatment-resistant hypertension.",
    },
    {
        "trial_id": "T004",
        "title": "High Blood Pressure Lifestyle Trial",
        "condition": "High Blood Pressure",
        "min_age": 25,
        "max_age": 60,
        "gender": "Female",
        "max_hba1c": 7.5,
        "min_bmi": 22,
        "max_bmi": 32,
        "excluded_medicine": "Lisinopril",
        "abstract": "A randomized clinical trial examining the impact of a structured dietary intervention combined with moderate exercise on lowering blood pressure in females.",
    },
    {
        "trial_id": "T005",
        "title": "COPD Inhaler Study",
        "condition": "COPD",
        "min_age": 40,
        "max_age": 80,
        "gender": "Any",
        "max_hba1c": 10.0,
        "min_bmi": 16,
        "max_bmi": 35,
        "excluded_medicine": "Prednisone",
        "abstract": "A double-blind study assessing the bronchodilatory effects and safety profile of a next-generation long-acting muscarinic antagonist inhaler for severe COPD.",
    },
    {
        "trial_id": "T006",
        "title": "Pulmonary Rehabilitation Trial",
        "condition": "Chronic Obstructive Pulmonary Disease",
        "min_age": 50,
        "max_age": 75,
        "gender": "Any",
        "max_hba1c": 9.0,
        "min_bmi": 18,
        "max_bmi": 32,
        "excluded_medicine": "Oxygen",
        "abstract": "This trial explores the effectiveness of a 12-week comprehensive pulmonary rehabilitation program on the exercise capacity of patients with moderate COPD.",
    },
    {
        "trial_id": "T007",
        "title": "Heart Failure Device Trial",
        "condition": "Heart Failure",
        "min_age": 45,
        "max_age": 80,
        "gender": "Any",
        "max_hba1c": 10.0,
        "min_bmi": 18,
        "max_bmi": 40,
        "excluded_medicine": "Digoxin",
        "abstract": "A trial testing a new implantable hemodynamic monitoring device for early detection of fluid retention in chronic heart failure patients.",
    },
    {
        "trial_id": "T008",
        "title": "Obesity Weight Management Study",
        "condition": "Obesity",
        "min_age": 21,
        "max_age": 55,
        "gender": "Any",
        "max_hba1c": 8.5,
        "min_bmi": 30,
        "max_bmi": 50,
        "excluded_medicine": "Semaglutide",
        "abstract": "An evaluation of a multimodal weight management program incorporating behavioral therapy and metabolic tracking for severe obesity.",
    },
    {
        "trial_id": "T009",
        "title": "Type 1 Diabetes Closed Loop Trial",
        "condition": "Type 1 Diabetes",
        "min_age": 18,
        "max_age": 45,
        "gender": "Any",
        "max_hba1c": 9.5,
        "min_bmi": 18,
        "max_bmi": 32,
        "excluded_medicine": "Metformin",
        "abstract": "This study tests a novel artificial pancreas system featuring predictive algorithms to automate insulin delivery for individuals with Type 1 Diabetes.",
    },
    {
        "trial_id": "T010",
        "title": "CKD Progression Study",
        "condition": "CKD",
        "min_age": 30,
        "max_age": 70,
        "gender": "Any",
        "max_hba1c": 8.5,
        "min_bmi": 18,
        "max_bmi": 38,
        "excluded_medicine": "Ibuprofen",
        "abstract": "A longitudinal cohort study monitoring the renal function decline and associated risk factors in patients with early-stage Chronic Kidney Disease.",
    },
]


def get_trial(trial_id: str) -> dict | None:
    key = trial_id.strip().upper()
    return next((item for item in TRIALS if item["trial_id"] == key), None)


def full_context(trial: dict) -> str:
    return (
        f"TRIAL PROMPT: {trial['trial_id']} - {trial['title']}\n"
        f"Abstract: {trial.get('abstract', 'No abstract available.')}\n"
        f"Condition: {trial['condition']}\n"
        f"Age range: {trial['min_age']} to {trial['max_age']} years\n"
        f"Gender: {trial['gender']}\n"
        f"Maximum HbA1c: {trial['max_hba1c']}\n"
        f"BMI range: {trial['min_bmi']} to {trial['max_bmi']}\n"
        f"Excluded medicine: {trial['excluded_medicine']}\n"
        "Answer only from this selected trial prompt. Do not mix facts from another trial. "
        "If the answer is absent, say it is not in this trial record. Do not give medical advice."
    )


def ask(trial_id: str, question: str) -> str:
    trial = get_trial(trial_id)
    if not trial:
        return "Unknown trial. Use T001 to T010."
    question = question.strip()
    if not question:
        return "Ask a question about this trial."
    context = full_context(trial)
    print(f"[bot.py] sending FULL hardcoded trial prompt to Groq ({len(context)} chars, no FAISS)")
    answer = groq_answer(question, context)
    if not answer or answer.startswith("[groq"):
        return context.split("\n")[0] + "\n" + (answer or "Groq unavailable. Hardcoded trial prompt was prepared.")
    return answer


def main() -> None:
    if len(sys.argv) >= 3:
        print(ask(sys.argv[1], " ".join(sys.argv[2:])))
        return
    print("Trials: T001-T010. Empty line to exit.")
    trial_id = input("Trial ID: ").strip() or "T001"
    while True:
        question = input("Ask: ").strip()
        if not question:
            break
        print(ask(trial_id, question))


if __name__ == "__main__":
    main()
