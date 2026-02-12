# Fantasy Darts Betting

A fun fantasy betting platform for friends. Bet on tournament outcomes with fantasy tokens. **No real money involved.**

## Tech Stack

- **Backend**: Python 3.11+ / FastAPI / SQLAlchemy / PostgreSQL
- **Frontend**: Next.js / TypeScript / Tailwind CSS
- **Odds Engine**: Elo ratings + Monte Carlo simulation for dynamic odds
- **Betting**: Parimutuel (pool) and fixed odds markets

## Features

- User registration and email-based login (JWT auth)
- Tournament standings, Elo ratings, and match results
- Outright and match betting markets with dynamic odds
- Real-time activity feed via WebSocket
- Leaderboard with streaks, badges, and ROI tracking
- Admin panel: enter results, manage markets, view liability

## Live Demo

- **Frontend**: https://frontend-production-fd09.up.railway.app
- **Backend API**: https://backend-production-19be.up.railway.app
- **Health Check**: https://backend-production-19be.up.railway.app/api/health

Hosted on [Railway](https://railway.com) with PostgreSQL.

## Local Development

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Seed database with Elo-derived markets
python seed_markets.py

# Run server
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on http://localhost:3000, proxies `/api/*` to backend on port 8000.

### Environment Variables

Copy `.env.example` files in both `backend/` and `frontend/` directories.

| Variable | Service | Description |
|----------|---------|-------------|
| `DATABASE_URL` | Backend | PostgreSQL connection string (defaults to SQLite for dev) |
| `SECRET_KEY` | Backend | JWT signing secret (auto-generated in dev) |
| `CORS_ORIGINS` | Backend | Comma-separated allowed origins |
| `APP_URL` | Backend | Frontend URL for magic link emails |
| `NEXT_PUBLIC_API_URL` | Frontend | Backend API URL (leave unset for local dev proxy) |

## Disclaimer

This is a **fantasy game**. Tokens have **no cash value**. No real money is exchanged or can be won. For entertainment purposes only among friends. Participants must be 18+.

## License

Private project.
