# HealthVault 🏥

A comprehensive health management platform built with React, TypeScript, and Vite. Track vitals, manage medications, store medical records, and get AI-powered health insights.

## ✨ Features

- **Vital Signs Tracking**: Monitor heart rate, blood pressure, and other health metrics
- **Medication Management**: Smart reminders and inventory tracking for medications
- **Medical Records**: Securely store and organize medical documents
- **AI Health Reports**: Get personalized health insights powered by advanced AI
- **Share Access**: Share health data securely with doctors and family
- **Privacy First**: End-to-end encrypted health data storage

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd healthvault
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
Create a `.env.local` file with your API keys:
```env
VITE_APPWRITE_ENDPOINT=https://your-appwrite-endpoint
VITE_APPWRITE_PROJECT_ID=your-project-id
VITE_GEMINI_API_KEY=your-gemini-api-key
VITE_OPENROUTER_API_KEY=your-openrouter-api-key
# ... other required variables
```

4. Start the development server
```bash
npm run dev
```

5. Open [http://localhost:5173](http://localhost:5173) in your browser

## 🏗️ Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS
- **Backend**: Appwrite
- **AI**: Google Gemini & OpenRouter (fallback)
- **Animations**: Framer Motion
- **Build Tool**: Vite
- **Icons**: Lucide React

## 📱 Pages

- **Landing Page**: Marketing page with feature overview
- **Dashboard**: Main health overview and quick actions
- **Vitals**: Track and log health measurements
- **Medications**: Manage prescriptions and reminders
- **Records**: Upload and organize medical documents
- **Reports**: AI-generated health insights and summaries
- **Share Access**: Securely share health data

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🔒 Privacy & Security

HealthVault prioritizes user privacy and data security:
- End-to-end encryption for all health data
- Secure authentication with Appwrite
- No third-party data sharing without explicit consent
- Compliant with healthcare data protection standards
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
