<div align="center">

# 🚨 NearHelp

**Community-Powered Real-Time Emergency Response Platform**

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![MongoDB](https://img.shields.io/badge/MongoDB-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Socket.io](https://img.shields.io/badge/Socket.io-4-010101?logo=socket.io)](https://socket.io/)
[![Express](https://img.shields.io/badge/Express-5-000000?logo=express)](https://expressjs.com/)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)

NearHelp enables communities to respond to emergencies in real time. Users broadcast SOS incidents, and the system **auto-dispatches** nearby volunteers using AI-powered ranking, geospatial queries, real-time maps, per-incident chat, and SMS alerts.

[Features](#-features) · [Quick Start](#-quick-start) · [API Reference](#-api-reference) · [Architecture](#-architecture) · [Contributing](#-contributing)

</div>

---

## ✨ Features

| Category | Highlights |
|---|---|
| **SOS Broadcasting** | One-tap incident reporting with configurable alert radius (500 m – 2 km) and auto-severity computation |
| **AI Auto-Dispatch** | Ranks nearby volunteers via composite scoring (rating 60 % + trust 20 % + skill match 15 % + proximity 5 %), then re-ranks with GPT-4o-mini |
| **Real-Time Map** | Leaflet-powered interactive map showing live incidents, community resources, skilled responders, and user location |
| **Per-Incident Chat** | Socket.io room-based messaging for responder coordination on each incident |
| **AI Crisis Guidance** | Context-aware first-response instructions, emergency summaries, and post-resolution debriefs |
| **Volunteer Assessment** | Adaptive AI-generated questions per incident type, scored 0–100 with grade |
| **Skill Registry** | Five skill categories (medical, rescue, technical, security, support) with geo-discovery of nearby skilled users |
| **Community Resources** | Crowd-sourced emergency resources (AEDs, hospitals, fire stations, pharmacies, shelters, etc.) with admin verification |
| **SMS Notifications** | OTP-based passwordless auth and emergency dispatch alerts via Fast2SMS |
| **Guardian Mode** | Designated guardians receive priority notification before the wider community |
| **Admin Dashboard** | Full incident/user management, filters by type/severity/status, suspension controls, and analytics |
| **Trust & Safety** | Trust scores, false-alert tracking, and user suspension system |

---

## 🛠 Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, Vite 7, Tailwind CSS 4, React Router 7, Leaflet / React-Leaflet 5, Lucide Icons, Socket.io Client |
| **Backend** | Node.js 18+, Express 5, Mongoose 9, Socket.io 4, JWT, bcrypt 6, Multer 2 |
| **Database** | MongoDB with 2dsphere geospatial indexes and GeoJSON |
| **AI / LLM** | OpenAI API (GPT-4o-mini default) for dispatch ranking, crisis guidance, and volunteer assessment |
| **SMS** | Fast2SMS (OTP delivery + emergency alerts) |
| **Storage** | Cloudinary (avatar uploads) |
| **Auth** | Phone + OTP passwordless authentication with JWT access/refresh tokens |

---

## 🚀 Quick Start

### Prerequisites

| Requirement | Version |
|---|---|
| [Node.js](https://nodejs.org/) | >= 18 |
| [MongoDB](https://www.mongodb.com/) | Local instance or Atlas cluster |
| npm | Bundled with Node.js |

### 1. Clone the Repository

```bash
git clone https://github.com/<your-username>/nearhelp.git
cd nearhelp
```

### 2. Run Setup

```bash
chmod +x setup.sh web.sh
./setup.sh
```

The setup script will:
- Verify Node.js 18+ and npm
- Create `.env` from `.env.example`
- Install backend and frontend dependencies
- Create required directories (`backend/public/avatars`)
- Seed the admin user (requires `MONGO_URI`)

### 3. Configure Environment

Edit the `.env` file in the project root:

```env
# ── Server ──
PORT=5050
NODE_ENV=development
CORS_ORIGIN_DEV=http://localhost:5173
CORS_ORIGIN_PROD=https://your-domain.com

# ── Database ──
MONGO_URI=mongodb://localhost:27017/nearhelp

# ── Auth ──
ENCRYPTION_ROUND=10
ACCESS_TOKEN_SECRET=<random-secret>
ACCESS_TOKEN_EXPIRY=1d
REFRESH_TOKEN_SECRET=<random-secret>
REFRESH_TOKEN_EXPIRY=10d

# ── Cloudinary ──
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
DEFAULT_AVATAR=https://res.cloudinary.com/.../default-avatar.png

# ── SMS (Fast2SMS) ──
FAST2SMS_API_KEY=your_fast2sms_key
FAST2SMS_ROUTE=otp

# ── OpenAI ──
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini

# ── Admin Seed ──
ADMIN_PHONE=9999999999
ADMIN_NAME=Admin

# ── Frontend (prefixed with VITE_) ──
VITE_BASE_URL=http://localhost:5050/api/v1
```

### 4. Start Development Servers

```bash
./web.sh
```

| Service | URL |
|---|---|
| Frontend | `http://localhost:5173` |
| Backend API | `http://localhost:5050` |

Press **Ctrl + C** to gracefully stop both servers.

### Manual Start (Alternative)

```bash
# Terminal 1 — Backend
cd backend
npm run dev          # or: npm start

# Terminal 2 — Frontend
cd frontend
npm run dev
```

---

## 📁 Project Structure

```
nearhelp/
├── setup.sh                        # One-command project setup
├── web.sh                          # Start both servers
├── .env.example                    # Environment variable template
│
├── backend/
│   ├── package.json
│   └── src/
│       ├── index.js                # Server entry — HTTP + Socket.io bootstrap
│       ├── app.js                  # Express app — middleware, routes, error handling
│       ├── seedAdmin.js            # Admin user seeder
│       ├── socketInstance.js       # Socket.io singleton
│       ├── controllers/
│       │   ├── assistant.controller.js    # AI crisis guidance & volunteer assessment
│       │   ├── communityResource.controller.js
│       │   ├── incident.controller.js     # SOS create, respond, resolve, AI dispatch
│       │   ├── otp.controller.js          # OTP send & verify
│       │   ├── skill.controller.js        # Skill CRUD & geo-discovery
│       │   └── user.controller.js         # Auth, profile, admin operations
│       ├── db/
│       │   └── index.js            # MongoDB connection
│       ├── middlewares/
│       │   ├── auth.middleware.js   # JWT verification & role guard
│       │   ├── error.middleware.js  # Global error handler
│       │   └── multer.middleware.js # File upload config
│       ├── models/
│       │   ├── communityResource.model.js  # GeoJSON + type + verified
│       │   ├── incident.model.js           # GeoJSON + responders + AI dispatch
│       │   ├── otp.model.js                # TTL auto-delete
│       │   └── user.model.js               # GeoJSON + trustScore + skills + guardians
│       ├── routes/
│       │   ├── assistant.route.js
│       │   ├── communityResource.route.js
│       │   ├── incident.route.js
│       │   ├── otp.route.js
│       │   ├── skill.route.js
│       │   └── user.route.js
│       └── utils/
│           ├── alertSMS.js         # Emergency SMS dispatch
│           ├── ApiError.js         # Standardized error class
│           ├── ApiResponse.js      # Standardized response class
│           ├── asyncHandler.js     # Async route wrapper
│           ├── cloudinary.js       # Cloudinary upload/delete
│           ├── llm.js              # OpenAI integration
│           └── otpSMS.js           # OTP delivery via Fast2SMS
│
└── frontend/
    ├── package.json
    ├── index.html
    ├── vite.config.js
    └── src/
        ├── App.jsx                  # Route definitions
        ├── main.jsx                 # React entry
        ├── index.css                # Global styles (Tailwind)
        ├── socket.js                # Socket.io client singleton
        ├── api/
        │   └── axios.js             # Axios instance with interceptors
        ├── components/
        │   └── MapView.jsx          # Leaflet map — incidents, resources, users
        ├── context/
        │   └── AuthContext.jsx       # Auth state, login/logout, token refresh
        ├── pages/
        │   ├── AdminDashboard.jsx    # Incident & user management
        │   ├── CommunityResources.jsx
        │   ├── Login.jsx
        │   ├── OTPVerification.jsx
        │   ├── PhoneEntry.jsx
        │   ├── Register.jsx
        │   ├── ReportIncident.jsx    # SOS creation form
        │   ├── SkillRegistry.jsx
        │   ├── UserDashboard.jsx     # Live map, nearby incidents, response actions
        │   └── NotFound.jsx
        └── utils/
            └── MarkerIcons.jsx       # Custom Leaflet marker icons
```

---

## 📡 API Reference

All endpoints are prefixed with `/api/v1`. Protected routes require a `Bearer` token in the `Authorization` header.

### Authentication & Users

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/users/register` | — | Register (multipart: name, phone, password, avatar) |
| `POST` | `/users/login` | — | Login → triggers OTP |
| `POST` | `/users/send-otp` | — | Send OTP to phone |
| `POST` | `/users/verify-otp` | — | Verify OTP → returns tokens |
| `POST` | `/users/logout` | ✅ | Invalidate refresh token |
| `POST` | `/users/refresh-token` | — | Refresh access token |
| `GET` | `/users/me` | ✅ | Current user profile |
| `PATCH` | `/users/update-profile` | ✅ | Update name, phone |
| `PATCH` | `/users/update-avatar` | ✅ | Upload new avatar |
| `PATCH` | `/users/change-password` | ✅ | Change password |
| `PATCH` | `/users/location` | ✅ | Update GeoJSON location |
| `PUT` | `/users/guardians` | ✅ | Add/update guardian contacts |
| `GET` | `/users/admin/all` | ✅ Admin | List all users |
| `GET` | `/users/admin/stats` | ✅ Admin | Platform statistics |
| `PATCH` | `/users/admin/:userId/toggle-suspend` | ✅ Admin | Suspend/unsuspend a user |

### Incidents

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/incidents` | ✅ | Create SOS (auto-dispatch + AI) |
| `GET` | `/incidents` | ✅ | List open incidents |
| `GET` | `/incidents/nearby` | ✅ | Incidents within radius (query: `lat`, `lng`, `radius`) |
| `GET` | `/incidents/admin-summary` | ✅ Admin | Aggregated incident stats |
| `POST` | `/incidents/:id/respond` | ✅ | Volunteer responds to incident |
| `PATCH` | `/incidents/:id/resolve` | ✅ | Resolve/close incident |
| `GET` | `/incidents/:id/best-volunteer` | ✅ | AI-ranked best volunteer |
| `POST` | `/incidents/:id/notify-suggested` | ✅ | SMS notify suggested volunteers |

### AI Assistant

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/assistant/crisis-guidance` | ✅ | AI-generated first-response steps |
| `POST` | `/assistant/volunteer-questions` | ✅ | Adaptive assessment questions |
| `POST` | `/assistant/rate-volunteer` | ✅ | Score volunteer responses (0–100) |

### Skills

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/skills/options` | ✅ | Available skill categories |
| `GET` | `/skills/all` | ✅ | Leaderboard of skilled users |
| `GET` | `/skills/nearby` | ✅ | Nearby users by skill (geo query) |
| `GET` | `/skills/my` | ✅ | Current user's skills |
| `POST` | `/skills/my` | ✅ | Add/update skills |

### Community Resources

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/community-resources/types` | ✅ | Available resource types |
| `GET` | `/community-resources/nearby` | ✅ | Resources near location |
| `GET` | `/community-resources/emergency-services` | ✅ | Hospitals, fire, police, pharmacy within 10 km |
| `GET` | `/community-resources` | ✅ | List all resources |
| `POST` | `/community-resources` | ✅ | Add a new resource |
| `PATCH` | `/community-resources/:id/verify` | ✅ Admin | Verify a resource |
| `DELETE` | `/community-resources/:id` | ✅ Admin | Delete a resource |

---

## 🔌 Real-Time Events (Socket.io)

| Event | Direction | Description |
|---|---|---|
| `REGISTER_LOCATION` | Client → Server | Register user location for geo queries |
| `INCIDENT_UPDATE` | Client → Server | Create incident via WebSocket |
| `INCIDENT_NEARBY` | Server → Client | Broadcast new incident to nearby users |
| `INCIDENT_UPDATED` | Server → Client | Incident status change notification |
| `INCIDENT_CLOSED` | Server → Client | Incident resolved notification |
| `INCIDENT_RESPONDER` | Server → Client | New responder joined |
| `VOLUNTEER_DISPATCHED` | Server → Client | Volunteer dispatched notification |
| `JOIN_INCIDENT_CHAT` | Client → Server | Join per-incident chat room |
| `SEND_CHAT_MESSAGE` | Client → Server | Send message in incident chat |
| `CHAT_MESSAGE` | Server → Client | Receive chat message |

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Frontend                           │
│  React 19 · Vite 7 · Tailwind CSS 4 · Leaflet          │
│  ┌──────────┐ ┌────────────┐ ┌───────────────────────┐  │
│  │ Auth     │ │ Dashboard  │ │ Map + SOS + Chat      │  │
│  │ (OTP)   │ │ (Admin/User)│ │ (Real-time via WS)    │  │
│  └────┬─────┘ └─────┬──────┘ └──────────┬────────────┘  │
│       │              │                   │               │
└───────┼──────────────┼───────────────────┼───────────────┘
        │ REST API     │ REST API          │ WebSocket
        ▼              ▼                   ▼
┌─────────────────────────────────────────────────────────┐
│                      Backend                            │
│  Express 5 · Socket.io 4 · JWT · Mongoose 9            │
│  ┌──────────┐ ┌────────────┐ ┌───────────────────────┐  │
│  │ Auth     │ │ Incident   │ │ AI Engine             │  │
│  │ + OTP   │ │ + Dispatch │ │ (OpenAI GPT-4o-mini)  │  │
│  └────┬─────┘ └─────┬──────┘ └──────────┬────────────┘  │
│       │              │                   │               │
│  ┌────▼──────────────▼───────────────────▼────────────┐  │
│  │              MongoDB (2dsphere)                     │  │
│  │  Users · Incidents · Resources · OTPs              │  │
│  └────────────────────────────────────────────────────┘  │
│       │                          │                       │
│  ┌────▼─────┐           ┌───────▼──────┐                │
│  │ Fast2SMS │           │  Cloudinary  │                │
│  │ (OTP/SMS)│           │  (Avatars)   │                │
│  └──────────┘           └──────────────┘                │
└─────────────────────────────────────────────────────────┘
```

### AI Dispatch Pipeline

```
Incident Created
      │
      ▼
┌─────────────────────┐
│  Geospatial Query   │  ← MongoDB $near within radiusMeters
│  Find Nearby Users  │
└─────────┬───────────┘
          ▼
┌─────────────────────┐
│  Composite Scoring  │  ← volunteerRating (60%) + trustScore (20%)
│  (Deterministic)    │    + skillMatch (15%) + proximity (5%)
└─────────┬───────────┘
          ▼
┌─────────────────────┐
│  LLM Re-Ranking     │  ← GPT-4o-mini contextual re-rank
│  (OpenAI)           │
└─────────┬───────────┘
          ▼
┌─────────────────────┐
│  SMS + WebSocket     │  ← Notify top volunteers & broadcast
│  Notifications       │
└─────────────────────┘
```

---

## ⚙️ Environment Variables

| Variable | Description | Required | Default |
|---|---|---|---|
| `PORT` | Backend server port | No | `5050` |
| `NODE_ENV` | `development` or `production` | No | `production` |
| `CORS_ORIGIN_DEV` | Frontend URL in dev | No | — |
| `CORS_ORIGIN_PROD` | Frontend URL in prod | No | — |
| `MONGO_URI` | MongoDB connection string | **Yes** | — |
| `ENCRYPTION_ROUND` | bcrypt salt rounds | No | `10` |
| `ACCESS_TOKEN_SECRET` | JWT access token secret | **Yes** | — |
| `ACCESS_TOKEN_EXPIRY` | Access token TTL (e.g. `1d`) | **Yes** | — |
| `REFRESH_TOKEN_SECRET` | JWT refresh token secret | **Yes** | — |
| `REFRESH_TOKEN_EXPIRY` | Refresh token TTL (e.g. `10d`) | **Yes** | — |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | **Yes** | — |
| `CLOUDINARY_API_KEY` | Cloudinary API key | **Yes** | — |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | **Yes** | — |
| `DEFAULT_AVATAR` | Fallback avatar URL | No | — |
| `FAST2SMS_API_KEY` | Fast2SMS API key | **Yes** | — |
| `FAST2SMS_ROUTE` | Fast2SMS route type | No | `otp` |
| `OPENAI_API_KEY` | OpenAI API key | **Yes** | — |
| `OPENAI_MODEL` | OpenAI model identifier | No | `gpt-4o-mini` |
| `ADMIN_PHONE` | Admin user phone (seeder) | No | — |
| `ADMIN_NAME` | Admin user name (seeder) | No | — |
| `VITE_BASE_URL` | API base URL for frontend | **Yes** | — |

---

## 📜 Available Scripts

### Root

| Script | Command | Description |
|---|---|---|
| Setup | `./setup.sh` | Install deps, create `.env`, seed admin |
| Start | `./web.sh` | Launch backend + frontend concurrently |

### Backend (`cd backend`)

| Script | Command | Description |
|---|---|---|
| Start | `npm start` | Production server |
| Dev | `npm run dev` | Development with hot-reload (nodemon) |
| Seed | `npm run seed` | Seed admin user |

### Frontend (`cd frontend`)

| Script | Command | Description |
|---|---|---|
| Dev | `npm run dev` | Vite dev server with HMR |
| Build | `npm run build` | Production build |
| Preview | `npm run preview` | Preview production build locally |
| Lint | `npm run lint` | Run ESLint |

---

## 🔧 Troubleshooting

<details>
<summary><strong>MongoDB connection fails</strong></summary>

- Ensure MongoDB is running locally (`mongod`) or your Atlas URI is correct
- Verify `MONGO_URI` in `.env`
- Check network/firewall settings for Atlas connections

</details>

<details>
<summary><strong>Port already in use</strong></summary>

`web.sh` automatically kills stale processes on the configured ports. To change ports:
- Backend: update `PORT` in `.env`
- Frontend: Vite auto-increments if 5173 is taken

</details>

<details>
<summary><strong>SMS not sending</strong></summary>

- In development mode, SMS falls back to console logging when `FAST2SMS_API_KEY` is missing
- Ensure your Fast2SMS account is active and the API key is valid
- Check `FAST2SMS_ROUTE` is set to `otp`

</details>

<details>
<summary><strong>AI features not working</strong></summary>

- Verify `OPENAI_API_KEY` is set and has available credits
- Default model is `gpt-4o-mini` — override with `OPENAI_MODEL`
- Check backend logs for OpenAI API errors

</details>

<details>
<summary><strong>Module not found errors</strong></summary>

```bash
./setup.sh   # Re-run setup to reinstall all dependencies
```

</details>

---

## 🤝 Contributing

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/my-feature`
3. **Commit** changes: `git commit -m 'feat: add my feature'`
4. **Push** to the branch: `git push origin feature/my-feature`
5. **Open** a Pull Request

Please follow [Conventional Commits](https://www.conventionalcommits.org/) for commit messages.

---

## 📄 License

This project is licensed under the [ISC License](https://opensource.org/licenses/ISC).

---

<div align="center">
  <sub>Built with ❤️ for safer communities</sub>
</div>
