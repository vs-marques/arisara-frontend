# Arisara Admin Dashboard

Admin dashboard for managing Arisara AI Concierge instances (powered by Nyoka backend).

## Features

- 🔐 Authentication (JWT)
- 📄 Document management (upload, RAG)
- ⚙️ Prompt configuration
- 📊 Analytics & usage tracking
- 💬 Live AI testing
- 🎨 Modern UI with Tailwind CSS & Shadcn/ui

## Tech Stack

- **Frontend:** React 18 + TypeScript
- **Build:** Vite
- **UI:** Tailwind CSS + Shadcn/ui
- **Router:** React Router v6
- **HTTP:** Axios
- **Forms:** React Hook Form + Zod

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- Nyoka backend running (default: http://localhost:8001)

### Installation

```bash
# Install dependencies
npm install
# or
bun install

# Create .env file
cp .env.example .env

# Start development server
npm run dev
# or
bun dev
```

### Build

```bash
npm run build
# or
bun build
```

## Project Structure

```
arisara-frontend/
├── src/
│   ├── components/     # Reusable components
│   ├── pages/          # Page components
│   ├── lib/            # Utilities
│   ├── hooks/          # Custom hooks
│   ├── App.tsx         # Main app component
│   ├── main.tsx        # Entry point
│   └── index.css       # Global styles
├── public/             # Static assets
└── package.json        # Dependencies
```

## Environment Variables

```env
VITE_BACKEND_URL=http://localhost:8001
VITE_DEV_PORT=5173
```

## License

Proprietary - Arisara (Nyoka-powered)

