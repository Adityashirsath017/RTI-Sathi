# RTI Clerk — Intelligent RTI Routing & Review Dashboard

> **AI-Augmented Statutory Routing Workbench for Right to Information (RTI) Clerks & Public Information Officers**

Part of the **RTI Black Hole** ecosystem, **RTI Clerk** empowers government routing clerks and administrative officers to review, clarify, and route citizen RTI applications with statutory confidence under the **Right to Information Act, 2005**.

---

## 🌟 Key Features

- **⚡ Real-Time Application Queues**: Live Firebase Firestore synchronization for pending, ambiguous, review, and clarified applications.
- **🎯 Statutory Confidence Scoring**: Automatic AI confidence metrics and jurisdiction detection to eliminate Section 6(3) transfer ping-pong.
- **💬 Bidirectional Clarification Loop**: Raise specific clarification questions to citizens and review their responses in real-time.
- **🔄 One-Click Statutory Routing & Overrides**: Route directly to the verified Public Authority with official dispatch slips, or override AI suggestions with statutory remarks.
- **🛡️ Immutable Audit Trails**: Section 26 compliance tracking with timestamped audit logs for every state transition and officer action.
- **🌐 8+ Indian Regional Languages**: Full localization support including English, Hindi (हिंदी), Marathi (मराठी), Gujarati (ગુજરાતી), Bengali (বাংলা), Tamil (தமிழ்), Telugu (తెలుగు), and Kannada (ಕನ್ನಡ).

---

## 🏗️ Architecture & Tech Stack

```
RTI-Clerk/
├── backend/
│   ├── functions/              # Cloud Functions (TypeScript)
│   ├── firestore.rules         # Security & Role-Based Access Control
│   ├── firestore.indexes.json  # Database Query Indexes
│   ├── storage.rules           # Cloud Storage Security Rules
│   └── firebase.json           # Firebase Project Configuration
├── frontend/
│   ├── src/
│   │   ├── components/         # Modular UI Components & Modals
│   │   ├── pages/              # Clerk Dashboard, Workspace, Audit, Queues
│   │   ├── services/           # Firebase & Application Data Services
│   │   ├── i18n/               # Multi-language Locales & Context
│   │   └── types/              # Statutory Data Types & Models
│   └── vite.config.ts          # Vite Configuration
├── final_project_report.md     # In-depth System Architecture Report
└── README.md
```

### Technologies Used
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide React
- **Backend & Cloud**: Firebase Authentication, Cloud Firestore, Cloud Functions, Cloud Storage
- **Deployment**: Firebase Hosting / Vercel

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Firebase CLI (`npm install -g firebase-tools`)

---

### Frontend Setup

1. **Navigate to the frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   Create a `.env` file from `.env.example`:
   ```bash
   cp .env.example .env
   ```
   Fill in your Firebase project configuration credentials.

4. **Start the development server**:
   ```bash
   npm run dev
   ```
   The dashboard runs on `http://localhost:5174`.

5. **Build for production**:
   ```bash
   npm run build
   ```

---

### Backend Setup & Deployment

1. **Navigate to the backend directory**:
   ```bash
   cd backend
   ```

2. **Install Cloud Functions dependencies**:
   ```bash
   cd functions
   npm install
   npm run build
   cd ..
   ```

3. **Deploy Firebase rules and functions**:
   ```bash
   firebase login
   firebase use <your-firebase-project-id>
   firebase deploy --only firestore:rules,firestore:indexes,storage:rules,functions
   ```

---

## 📜 Statutory Compliance & Security

- **Section 5(1)**: Designated PIO and APIO workflow mapping.
- **Section 6(1)**: Structured citizen subject matter review.
- **Section 6(3)**: 5-day statutory transfer protocol with automatic timestamping.
- **Role-Based Security**: Strict Firestore security rules ensuring only authorized clerks can inspect internal reviews and trigger dispatch actions.

---

## 📄 License
This project is developed for educational and public governance modernization purposes.
