# RentrFlow – Agent–Contractor Job, Invoice, Tools & Communication Management

Web-only MERN + Socket.io platform for Agents and Contractors.

## Tech Stack

- Frontend: React + Tailwind + React Router + Axios + Socket.io Client
- Backend: Node.js + Express + JWT Auth + Socket.io Server
- Database: MongoDB (Mongoose)

## Monorepo Structure

- `frontend/` React app
- `backend/` Express API + Socket.io

## Setup

### 1) Backend

1. Create `backend/.env` from `backend/.env.example`
2. Install deps
   - `npm install`
3. Start
   - `npm run dev`

Backend health check:
- `GET http://localhost:5000/api/health`

### Demo Seed Data

To populate MongoDB with realistic demo data (users, jobs, work orders, invoices, messages, notifications):

1. Ensure your `backend/.env` contains a valid `MONGODB_URI`
2. Run:
   - From `backend/`: `npm run seed`
   - Or from repo root: `npm --prefix backend run seed`

To wipe and reseed from scratch:
- From `backend/`: `npm run seed:drop`
- Or from repo root: `npm --prefix backend run seed:drop`

Demo credentials (created by seed):
- Agent: `saviours.x.agent@gmail.com` / `SavioursX@123DemoA`
- Contractor: `saviours.x.contractor@gmail.com` / `SavioursX@123DemoC`

### 2) Frontend

1. Create `frontend/.env` from `frontend/.env.example`
2. Install deps
   - `npm install`
3. Start
   - `npm run dev`

App URL:
- `http://localhost:5173`

## Core Flows

### Authentication (Role-based)

- Agent login / Contractor login from the same toggle UI (based on your prototype)
- JWT stored using Remember-me (localStorage) or sessionStorage
- Role-based routing:
  - Agent: `/app/agent/*`
  - Contractor: `/app/contractor/*`

### Agent

- Post job
- View applicants & assign contractor
- Work order auto-created on assignment
- Invoice approval / rejection / mark paid

### Contractor

- View open jobs & apply
- View assigned jobs
- Update job lifecycle: `ASSIGNED -> IN_PROGRESS -> COMPLETED`
- Submit invoices

### Tools Hub (Unified)

Accessible from `/app/tools` for both roles.
Role-aware tools:
- Job Status Tracker
- Work Order Auto-Generator (Agent)
- Cost Estimation
- Document Upload & Management
- Notification Center
- Analytics Overview (charts)
- Settings & Role Preferences

### Real-time Chat (Socket.io)

- Job-scoped 1:1 chat between the Agent who owns the job and the assigned Contractor
- Stored in MongoDB for history
- UI available at `/app/chat/:jobId`

## Environment Variables

Backend (`backend/.env`):
- `MONGODB_URI`
- `JWT_SECRET`
- `CLIENT_ORIGIN` (comma-separated allowed origins, e.g. `http://localhost:5173`)

Frontend (`frontend/.env`):
- `VITE_API_URL` (e.g. `http://localhost:5000`)

## Notes

- File uploads are stored in `backend/uploads` by default (or `UPLOAD_DIR` if set).
- If you see editor warnings like `Unknown at rule @tailwind`, that’s an IDE CSS linter issue; Tailwind works at build-time via PostCSS.
