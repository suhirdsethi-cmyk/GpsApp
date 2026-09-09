# GPS Phone Location Tracking Application (Consensual Location Sharing)

A complete, production-ready full-stack **GPS Phone Location Tracking Application** built with **React** (Frontend) and **Python FastAPI** (Backend). 

Designed strictly for **consensual location sharing only**: A person whose phone is being tracked must explicitly initiate and authorize location sharing for a specified duration, and can manually stop it at any time.

---

## 🌟 Features & Main Concepts

- **Explicit Consensual Sharing**: Trackers cannot activate tracking remotely without the sharer's explicit authorization.
- **Duration Selection**: Share location for 15m, 30m, 1h, 2h, 4h, 8h, 12h, 24h, custom duration (hours & minutes), custom start/end time range, or until stopped.
- **Automatic Expiration**: Background server worker auto-expires sessions when duration finishes and broadcasts expiration events.
- **Real-Time Tracking**: WebSockets stream live latitude, longitude, accuracy, speed, and heading updates every 10 seconds.
- **Interactive Live Map**: Supports Google Maps JS API with interactive accuracy circle, user position marker, trail polyline, follow user toggle, and automatic Leaflet/OpenStreetMap fallback.
- **Connection Invitation System**: Sharers generate 6-character invitation codes (e.g. `7K4P9Q`). Viewers enter the code, and sharers explicitly approve access.
- **Tracking History**: View past recorded routes, duration, GPS breadcrumbs, and delete history for user privacy.
- **Mobile First Design**: Mobile bottom navigation bar, status overlay cards, and large primary action buttons.

---

## 🛠️ Technology Stack

### Frontend
- **React.js 18** + Vite
- **React Router v6**
- **Tailwind CSS** + Glassmorphism UI
- **Google Maps JS API** (with `@react-google-maps/api` & Leaflet fallback)
- **HTML5 Geolocation API** (`navigator.geolocation`)
- **WebSockets** (`ws://`)
- **Lucide React Icons**

### Backend
- **Python 3.11 / 3.14**
- **FastAPI** & Uvicorn
- **SQLAlchemy ORM** (PostgreSQL & SQLite support)
- **WebSockets** (`/ws/tracking/{session_id}`)
- **JWT Authentication** & bcrypt password hashing
- **Pydantic v2** validation schemas
- **Async Background Tasks** for session expiration

---

## 🚀 Quick Start (Local Setup)

### 1. Prerequisites
- Python 3.11+
- Node.js v18+ & npm

### 2. Backend Setup
```bash
# Navigate to backend
cd backend

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env

# Run unit and integration tests
python -m pytest tests

# Start FastAPI development server
uvicorn app.main:app --reload --port 8000
```
- OpenAPI Documentation: `http://localhost:8000/docs`

### 3. Frontend Setup
```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start React Vite dev server
npm run dev
```
- Open browser at: `http://localhost:5173`

---

## 🐳 Docker Deployment

To launch PostgreSQL, FastAPI Backend, and React Frontend using Docker Compose:

```bash
docker-compose up --build
```

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000`
- PostgreSQL: `localhost:5432`

---

## 📱 Mobile Background GPS Architecture (Section 22)

Standard web browsers (iOS Safari & Android Chrome) restrict background GPS tracking when a web tab is minimized to conserve battery life and enforce privacy.

For full background tracking support when the phone screen is locked:
1. Wrap the React codebase using **Capacitor**: `npx cap init` & `npx cap add android` / `npx cap add ios`.
2. Integrate `@capacitor-community/background-geolocation` in `frontend/src/services/geolocation.js`.
3. Configure iOS `UIBackgroundModes` (`location`) and Android `ACCESS_BACKGROUND_LOCATION` manifest permissions.

---

## 📡 API Reference Summary

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/auth/register` | Register new user account |
| `POST` | `/auth/login` | Login and receive JWT access token |
| `GET` | `/auth/me` | Fetch current user profile |
| `POST` | `/tracking/start` | Start tracking session with duration |
| `POST` | `/tracking/stop` | Stop active tracking session |
| `GET` | `/tracking/active` | Get active tracking sessions for user |
| `GET` | `/tracking/history` | List tracking session history |
| `DELETE` | `/tracking/history/{id}` | Delete session history record |
| `POST` | `/locations` | Submit GPS location update |
| `GET` | `/locations/latest/{session_id}`| Fetch latest location point |
| `GET` | `/locations/history/{session_id}`| Fetch location history polylines |
| `POST` | `/connections/invite` | Generate 6-char invitation code |
| `POST` | `/connections/accept` | Redeem invitation code |
| `POST` | `/connections/approve/{id}`| Approve connection request |
| `WS` | `/ws/tracking/{session_id}` | Real-time WebSocket location stream |

---

## 🛡️ Privacy & Security

- Password hashes stored securely via bcrypt.
- JWT authentication enforced on every location endpoint & WebSocket connection.
- Viewer permission checks ensure only explicit accepted connections can view live locations during active sessions.
- Session auto-expiration terminates updates automatically.
