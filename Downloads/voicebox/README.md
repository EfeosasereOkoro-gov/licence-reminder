# VoiceBox

A high-engagement team tool that ensures every role has a voice in meetings. VoiceBox intelligently selects speakers using a fairness algorithm that prevents dominant voices from overshadowing quieter team members.

## Features

- **Role-Aware Selection** — never picks two people from the same role in a single round
- **Fairness Algorithm** — participants who have already spoken are 95% less likely to be selected again in the same session
- **Gender Balance** — automatically balances gender representation (minimum 1 male and 1 female per selection of 4)
- **Persistent Stats** — selection counts are saved locally in the browser across page refreshes
- **Team Roster Sidebar** — view all 29 team members sorted by fewest selections, with a live call count bar
- **Animated UI** — smooth spring animations on speaker card reveal
- **Mobile Optimised** — responsive layout works on any device without excessive scrolling

## Tech Stack

| Layer | Library |
|---|---|
| Framework | React 19 + Vite 6 |
| Styling | Tailwind CSS 4 |
| Animations | Motion (Framer Motion) |
| Icons | Lucide React |
| Language | TypeScript |

## Getting Started

### Prerequisites

- Node.js 18+

### Install & Run

```bash
npm install
npm run dev
```

The app runs at `http://localhost:3000`.

### Build for Production

```bash
npm run build
npm run preview
```

## Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `GEMINI_API_KEY` | Gemini AI API key (injected automatically in AI Studio) |
| `APP_URL` | The URL where the app is hosted |

## How to Use

1. **Randomize** — click the "Randomize" button to select 4 speakers
2. **View Selected** — the 4 chosen team members appear as high-visibility cards
3. **Track History** — check the sidebar to see the full roster and how many times each person has been called
4. **Reset** — use "Reset Stats" in the top bar to clear selection history for a new meeting

## Selection Algorithm

Each time a person is selected, their probability weight is multiplied by `0.05`, making them 95% less likely to appear in the next round.

**Constraints enforced per selection:**
- Exactly 4 speakers
- Each speaker must have a unique role
- At least 1 male and 1 female speaker

The algorithm retries up to 50 times to find a valid combination satisfying all constraints.

## Roles

`Dev` · `Designer` · `Product Manager` · `Delivery Manager` · `Facilitator` · `Communications` · `Content Writer` · `Infrastructure`

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server on port 3000 |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | TypeScript type check |
| `npm run clean` | Remove `dist` and `server.js` |

---

Built for high-engagement collaboration — GovTech Barbados © 2026
