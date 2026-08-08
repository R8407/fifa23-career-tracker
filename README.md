# FIFA 23 Player Career Mode Tracker

A full-featured web dashboard for tracking your FIFA 23 Player Career Mode progress. Built with React, TypeScript, and Tailwind CSS.

## Features

- **Overview Dashboard** — Season stats, goals, assists, ratings at a glance
- **Player Profile** — Detailed attributes, growth tracking
- **Season History** — Performance metrics, MOTM awards, tactical analysis
- **Trophy Room** — Team trophies, individual awards, MOTM (with real images)
- **Hall of Fame** — Immortal records chase, compare against legends
- **League Universe** — Top scorers from your career save
- **News Feed** — CBS-style pundit ticker with dynamic commentary
- **Social Hub** — Fan debates, DMs from legends/agents/coaches (with LLM integration)
- **Compare Legends** — Head-to-head vs football legends
- **Records & Projections** — Career trajectory predictions

## Quick Start

```bash
# Clone
git clone https://github.com/yourusername/fifa23-career-tracker.git
cd fifa23-career-tracker

# Install
npm install

# Run (demo mode)
npm run dev
```

Open `http://localhost:3000` — works immediately with demo data.

## Connecting Real Data

### Option 1: Upload JSON
1. Run `unified.py` with FIFA 23 Live Editor CSVs
2. In the app, click the upload button in the header
3. Select your `career_export.json`

### Option 2: Auto-sync (Linux)
```bash
# Set up alias in ~/.zshrc or ~/.bashrc
alias cmsync="python3 unified.py --input-dir '/path/to/career_data' --output-db career.sqlite --output-json career_export.json"

# Run
cmsync
```

## Architecture

```
Codebase/
├── src/
│   ├── components/        # React components
│   │   ├── OverviewView.tsx
│   │   ├── TrophyRoomView.tsx
│   │   ├── NewsFeed.tsx
│   │   ├── SocialMediaView.tsx
│   │   └── ...
│   ├── data/
│   │   └── demo_career_export.json   # Demo data (works out of box)
│   ├── utils/
│   │   ├── dataAdapter.ts    # JSON → UI data transform
│   │   ├── llm.ts            # Optional LLM integration
│   │   └── audio.ts          # Sound effects
│   ├── types.ts              # TypeScript interfaces
│   └── App.tsx               # Main app
├── models/                    # Trophy images (MOTM.webp, EPL.webp, etc.)
└── package.json
```

### Data Flow

```
FIFA 23 Live Editor
    ↓ (Lua script exports CSVs)
unified.py
    ↓ (reads CSVs → SQLite → JSON)
career_export.json
    ↓ (frontend imports)
dataAdapter.ts → React Components
```

## Optional: LLM Integration

The Social Hub DMs can use a local LLM for dynamic responses.

### Setup

```bash
# Install llama.cpp (Arch Linux)
yay -S llama.cpp

# Start server
llama-server -m /path/to/Phi-3-mini-4k-instruct-q4.gguf \
  --host 0.0.0.0 --port 8080 -c 2048 -t 4
```

Or use the included script:
```bash
./career.sh --llm
```

### Supported Models
- **Phi-3-mini** (recommended) — 3.8B, fast, good at conversation
- Any GGUF instruct model works

## Scripts

```bash
./career.sh --pre       # Start dev server (Lutris pre-launch)
./career.sh --post      # Kill all services (Lutris post-launch)
./career.sh --pre --llm # Start server + LLM
./career.sh --sync      # Push career data to frontend
./career.sh --stop      # Kill everything
```

## Tech Stack

- **React 18** + TypeScript
- **Vite** — Fast dev server
- **Tailwind CSS** — Styling
- **Lucide React** — Icons
- **canvas-confetti** — Celebration effects

## Demo Data

The app ships with demo data featuring:
- Player: Ethan Ampadu (RW, Spezia, Wales)
- Season 1: 4 goals, 16 assists, 7.67 avg rating, 7 MOTM
- Broken record: Spezia all-time season assists
- 3 news articles, pundit ticker, fan debates

## License

MIT
