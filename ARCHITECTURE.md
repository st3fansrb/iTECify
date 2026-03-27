# iTECify — Architecture Overview

iTECify is a collaborative web-based code editor inspired by VS Code, built for real-time coding sessions, sandboxed execution, and team collaboration.

---

## Stack Overview

```
iTECify/
├── frontend/   # Vite + React + TypeScript + Tailwind CSS
└── backend/    # Node.js + Express
```

---

## Monaco Editor (UI)

**Package:** `@monaco-editor/react`

Monaco is the same editor engine that powers VS Code. Integration approach:

- Mounted as a React component (`<Editor />`) inside the main workspace pane.
- Language, theme, and options are passed as props and controlled via React state.
- **Collaborative editing:** We will sync editor content through Supabase Realtime channels. Each keystroke delta is broadcast to all connected clients and applied via Monaco's `ITextModel` API to avoid full-document overwrites.
- Multiple cursors per collaborator will be rendered using Monaco's `deltaDecorations` API with color-coded overlays per user.

---

## Supabase (Database & Auth)

**Services used:** Auth, PostgreSQL, Realtime, Storage

### Auth
- Users authenticate via Supabase Auth (email/password + OAuth providers).
- JWT tokens are passed to the Express backend in `Authorization` headers and verified server-side using the Supabase service key.

### Database (PostgreSQL)
Core tables:

| Table | Purpose |
|---|---|
| `users` | Extended user profiles (username, avatar) |
| `projects` | Code projects owned by a user or team |
| `files` | Files within a project (path, language, content) |
| `collaborators` | Many-to-many: users ↔ projects with roles |
| `sessions` | Active collaborative sessions |

### Realtime
- Each open file subscribes to a Supabase Realtime channel (e.g. `file:<file_id>`).
- Presence is used to track which users are active in a session and their cursor positions.

### Storage
- Project file snapshots and user avatars are stored in Supabase Storage buckets.

---

## Docker (Sandboxed Code Execution)

**Purpose:** Run user-submitted code safely without risking host system access.

### Architecture

```
Browser → POST /api/execute → Express backend → Docker SDK → Container → stdout/stderr → Response
```

### How it works

1. The frontend sends a code payload `{ language, code }` to `POST /api/execute`.
2. The Express backend uses the **Dockerode** library to spin up a short-lived container from a language-specific image (e.g. `node:20-alpine`, `python:3.12-slim`).
3. The container runs with strict resource limits:
   - **CPU:** 0.5 cores max
   - **Memory:** 128 MB max
   - **Network:** disabled (`--network none`)
   - **Filesystem:** read-only with a tmpfs `/tmp`
   - **Timeout:** 10 seconds hard kill
4. stdout and stderr are streamed back to the client via the API response.
5. The container is destroyed immediately after execution.

### Supported Languages (Phase 1)
- JavaScript / TypeScript (Node.js)
- Python
- Go
- Java (OpenJDK)

### Security Layers
- Containers run as non-root user (`--user 1000:1000`)
- No privileged mode
- Seccomp profile applied
- Rate limiting on `/api/execute` per user (Supabase JWT-identified)

---

## Data Flow Summary

```
User types code
    ↓
Monaco Editor onChange
    ↓
Supabase Realtime broadcast → other collaborators' editors update
    ↓
User clicks "Run"
    ↓
POST /api/execute (with JWT)
    ↓
Express validates JWT via Supabase
    ↓
Dockerode spawns sandboxed container
    ↓
Output streamed back → displayed in terminal panel
```

---

## Environment Variables

### Backend (`backend/.env`)
```
PORT=3001
CLIENT_URL=http://localhost:5173
SUPABASE_URL=...
SUPABASE_SERVICE_KEY=...
```

### Frontend (`frontend/.env`)
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_API_URL=http://localhost:3001
```
