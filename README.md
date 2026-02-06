# Crypto Pulse

Real-time crypto price dashboard powered by FastAPI (SSE) and a React + Tailwind UI.

## One command to run

```bash
docker compose up --build
```

Then open:

```
http://localhost:5173
```

## What’s running

- **Frontend:** Vite + React + Tailwind on `http://localhost:5173`
- **Backend:** FastAPI on `http://localhost:8000`
  - JSON: `http://localhost:8000/api/crypto`
  - SSE: `http://localhost:8000/api/crypto/stream`

## Stop

Press `Ctrl+C` in the terminal running Docker Compose.
