# Clinical Trial Patient Matching System

Coordinator screening support for synthetic clinical trial recruitment. This is **not** a medical diagnosis system and does not make autonomous clinical decisions. Eligibility is always determined by explicitly defined structured trial criteria.

## Stack

- React + Vite + JavaScript + Tailwind CSS
- Firebase Authentication
- Cloud Firestore
- Firebase Storage (optional CSV upload archive)
- Browser-side matching engine
- Browser-side embeddings via Transformers.js (`Xenova/all-MiniLM-L6-v2`)

There is no Express/Node/Python backend. CRUD runs from the React app through the Firebase SDK.

## Setup

1. Create a Firebase project.
2. Enable **Email/Password** authentication.
3. Create a Cloud Firestore database.
4. Deploy security rules from this repo:

```bash
firebase deploy --only firestore:rules,storage:rules
```

5. Copy environment variables:

```bash
cp .env.example .env
```

Fill in:

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

6. Install and run:

```bash
npm install
npm run dev
```

This is **not** a medical diagnosis system. Patients see **potential matches** only. Coordinators review criteria and complete screening.

## Two-sided flow

**Patient:** sign up → enter profile → automatic matching → see potential / close possible matches in plain language.

**Coordinator:** dashboard of registered patients → criterion PASS/FAIL → email the patient → Identified → Contacted → Screened → Enrolled.

## Demo flow

1. Sign up as a **coordinator**, seed 10 trials (and optional demo patients) from Data Setup.
2. Sign up as a **patient**, complete the clinical profile, and review potential matches.
3. Switch back to the coordinator account. Open the new participant and inspect PASS/FAIL reasons.
4. Email the patient from their stored address, then move Identified → Contacted → Screened → Enrolled.
5. Patient `P002` in the demo seed is a near match on HbA1c for T001.

## Matching rules

- Age, gender, HbA1c, BMI, and excluded medicine are deterministic.
- Condition terminology uses normalization + MiniLM embeddings + cosine similarity.
- Default technical similarity threshold: `0.75` (not medically validated).
- Semantic similarity cannot override failed structured criteria.
- Near-eligible means a small numeric miss within a configurable tolerance. Near-eligible is **not** eligible.

## Collections

- `/users`
- `/patients`
- `/trials`
- `/matches`
- `/recruitment`
