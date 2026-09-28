import re

abstracts = {
    "T001": "This Phase 3 trial evaluates the efficacy and safety of a novel oral hypoglycemic agent in adults with poorly controlled Type 2 Diabetes Mellitus.",
    "T002": "An observational study comparing standard versus intensive glycemic control strategies for preventing microvascular complications in patients with long-standing Type 2 Diabetes.",
    "T003": "This study investigates the long-term cardiovascular outcomes of a new combination therapy for patients with treatment-resistant hypertension.",
    "T004": "A randomized clinical trial examining the impact of a structured dietary intervention combined with moderate exercise on lowering blood pressure in females.",
    "T005": "A double-blind study assessing the bronchodilatory effects and safety profile of a next-generation long-acting muscarinic antagonist inhaler for severe COPD.",
    "T006": "This trial explores the effectiveness of a 12-week comprehensive pulmonary rehabilitation program on the exercise capacity of patients with moderate COPD.",
    "T007": "A trial testing a new implantable hemodynamic monitoring device for early detection of fluid retention in chronic heart failure patients.",
    "T008": "An evaluation of a multimodal weight management program incorporating behavioral therapy and metabolic tracking for severe obesity.",
    "T009": "This study tests a novel artificial pancreas system featuring predictive algorithms to automate insulin delivery for individuals with Type 1 Diabetes.",
    "T010": "A longitudinal cohort study monitoring the renal function decline and associated risk factors in patients with early-stage Chronic Kidney Disease."
}

with open("bot.py", "r", encoding="utf-8") as f:
    content = f.read()

# Add abstract to each dictionary in TRIALS
for trial_id, abstract in abstracts.items():
    pattern = rf'("trial_id": "{trial_id}".*?"excluded_medicine": "[^"]+",)'
    
    def replacer(match):
        return match.group(1) + f'\n        "abstract": "{abstract}",'
        
    content = re.sub(pattern, replacer, content, flags=re.DOTALL)

old_func = '''def full_context(trial: dict) -> str:
    return (
        f"TRIAL PROMPT: {trial['trial_id']} - {trial['title']}\\n"
        f"Condition: {trial['condition']}\\n"
        f"Age range: {trial['min_age']} to {trial['max_age']} years\\n"
        f"Gender: {trial['gender']}\\n"
        f"Maximum HbA1c: {trial['max_hba1c']}\\n"
        f"BMI range: {trial['min_bmi']} to {trial['max_bmi']}\\n"
        f"Excluded medicine: {trial['excluded_medicine']}\\n"
        "Answer only from this selected trial prompt. Do not mix facts from another trial. "
        "If the answer is absent, say it is not in this trial record. Do not give medical advice."
    )'''

new_func = '''def full_context(trial: dict) -> str:
    return (
        f"TRIAL PROMPT: {trial['trial_id']} - {trial['title']}\\n"
        f"Abstract: {trial.get('abstract', 'No abstract available.')}\\n"
        f"Condition: {trial['condition']}\\n"
        f"Age range: {trial['min_age']} to {trial['max_age']} years\\n"
        f"Gender: {trial['gender']}\\n"
        f"Maximum HbA1c: {trial['max_hba1c']}\\n"
        f"BMI range: {trial['min_bmi']} to {trial['max_bmi']}\\n"
        f"Excluded medicine: {trial['excluded_medicine']}\\n"
        "Answer only from this selected trial prompt. Do not mix facts from another trial. "
        "If the answer is absent, say it is not in this trial record. Do not give medical advice."
    )'''

content = content.replace(old_func, new_func)

with open("bot.py", "w", encoding="utf-8") as f:
    f.write(content)
print("Updated bot.py")
