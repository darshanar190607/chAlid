

## Overview
ChAIid is a cutting-edge pediatric health platform designed specifically for the unique socio-economic needs of parents in developing regions. By blending Generative AI, visual analysis, and deep localization, ChAIid reduces the friction of proactive infant healthcare.

**Live Demo (Coming Soon)** | **Video Walkthrough (Coming Soon)**

## Key Features & Innovation
1. **Daily Photo Health Analyzer:** Our AI acts as a passive, daily check-up. Upload a photo of your infant, and the AI will analyze visual cues to detect early signs of illness or confirm healthy baseline metrics.
2. **AI Symptom Checker:** Multi-modal analysis (image + text) combining Groq/Llama3 and Gemini Vision to provide instant severity triage based on IAP/WHO guidelines.
3. **Smart Vaccine Tracker:** Automatically schedules required vaccines based on birthdate.
4. **Geo-Aware Hospital Locator:** Find nearby Primary Health Centres (PHCs) and NICU-equipped hospitals using integrated mapping.
5. **Localization:** Full support for Ayushman Bharat (ABHA ID), Tamil Nadu State schemes, and multilingual interfaces (i18next).

## Tech Stack
*   **Frontend:** Next.js 14 (App Router), React 19, Tailwind CSS, Framer Motion
*   **Backend:** Next.js API Routes, Vercel Serverless Functions
*   **Database:** Prisma ORM, Neon DB (Serverless Postgres), Upstash Redis (Caching/Rate Limiting)
*   **Authentication:** Firebase Auth
*   **AI Models:** Vercel AI SDK wrapping Groq (Llama-3), Google GenAI (Gemini-1.5-Flash)

## System Architecture
```mermaid
graph TD;
    A[Client UI - Next.js] -->|Auth| B(Firebase);
    A -->|API Requests| C[Next.js Serverless API];
    C -->|Rate Limit / Cache| D[(Upstash Redis)];
    C -->|ORM| E[(Neon Serverless Postgres)];
    C -->|LLM Chat| F[Groq API / Llama 3];
    C -->|Vision AI| G[Gemini API / GPT-4o];
```

## Quick Start (Local Development)

### Prerequisites
*   Node.js (v18+)
*   NPM or Yarn
*   A Neon Database connection string
*   Firebase Project Credentials

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/your-repo/chaiid.git
   cd chaiid
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Environment Setup:
   Copy `.env.example` to `.env` and fill in your keys:
   ```env
   DATABASE_URL="postgresql://user:pass@ep-endpoint.neon.tech/neondb"
   DIRECT_URL="postgresql://user:pass@ep-endpoint.neon.tech/neondb"
   FIREBASE_PROJECT_ID="..."
   FIREBASE_CLIENT_EMAIL="..."
   FIREBASE_PRIVATE_KEY="..."
   GEMINI_API_KEY="..."
   GROQ_API_KEY="..."
   GOOGLE_MAPS_PLATFORM_KEY="..."
   UPSTASH_REDIS_REST_URL="..."
   UPSTASH_REDIS_REST_TOKEN="..."
   ```
4. Run Database Migrations:
   ```bash
   npx prisma generate
   npx prisma db push
   ```
5. Start the development server:
   ```bash
   npm run dev
   ```
   Visit `http://localhost:3000` to view the app.

## Security & Compliance
*   **Data Protection:** Health data and PII are secured using strict RLS and environment isolation. Passwords and keys are never exposed.
*   **Content Security Policy:** Strict CSP headers and XSS protections (via DOMPurify) are implemented.
*   **Consent:** Explicit opt-in flows are required prior to any AI-based visual processing of infants.

## Business Model & Competitive Analysis

### Business Model (B2G2C)
ChAIid follows a **Business-to-Government-to-Consumer** model:
1.  **Public Health Integration:** Partner with State Governments (e.g., Tamil Nadu's Health Department) to integrate with the Makkalai Thedi Maruthuvam scheme.
2.  **Freemium AI:** Core triage and tracking are free. Premium features include 24/7 video consultation with pediatric specialists and advanced developmental milestone tracking.
3.  **Data Insights:** Anonymized health trends (e.g., localized outbreaks) provided to public health officials for proactive intervention.

### Competitive Analysis
| Feature | ChAIid | Traditional Apps | Google/Generic AI |
| :--- | :--- | :--- | :--- |
| **Vision Analysis** | Optimized for infant skin/eyes | None | Generic (Low safety) |
| **Localization** | ABHA ID / Indian Languages | English Only | Global (Not localized) |
| **Triage Flow** | WHO/IAP Guided | Static Articles | Unstructured |
| **Offline First** | PWA + Local Caching | Web Only | Cloud Only |

---
**ChAIid: Bridging the gap in pediatric health equity with AI.**

