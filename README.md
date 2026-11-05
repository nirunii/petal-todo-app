# 🌸 Petal

**Plan your day, gently.** Petal is a full-stack to-do and notes app with a calm, mobile-style interface. Tasks and notes live in one place, organised by colour-coded projects.

**Live demo:** https://YOUR-USERNAME.github.io/petal-todo-app/ *(runs in your browser; data is saved only on your device)*

<p align="center">
  <img src="docs/screenshots/welcome.png" width="19%" alt="Welcome screen" />
  <img src="docs/screenshots/today.png" width="19%" alt="Today screen" />
  <img src="docs/screenshots/upcoming.png" width="19%" alt="Upcoming screen" />
  <img src="docs/screenshots/notes.png" width="19%" alt="Notes screen" />
  <img src="docs/screenshots/task.png" width="19%" alt="Task details screen" />
</p>

## Features

- **Accounts:** sign up and log in with a hashed password and a 7-day token.
- **Projects:** every account starts with Work, Personal, Study and Health. Create more with your own colours.
- **Tasks:** date, time, priority (low, medium, high), details and subtasks.
- **Today view:** progress ring, "Up next" card, overdue tasks, project filters and a collapsible completed list.
- **Upcoming view:** a seven-day strip; tap a day to see its tasks.
- **Notes:** pin, search, filter by project, and link a note to a task.
- **Profile:** tasks done, current day streak and number of projects.
- **Demo mode:** the same app running entirely in the browser, no server needed.

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18, Vite 5, React Router 6 |
| Backend | Node.js, Express 4 |
| Database | PostgreSQL (`pg`) |
| Auth | bcryptjs, JSON Web Tokens |
| Deployment (demo) | GitHub Actions, GitHub Pages |

## Getting started

**Requirements:** Node.js 18 or newer and PostgreSQL.

### 1. Clone and create the database

```bash
git clone https://github.com/YOUR-USERNAME/petal-todo-app.git
cd petal-todo-app
createdb petal
```

On Windows, if `createdb` is not found: `psql -U postgres -c "CREATE DATABASE petal;"`

### 2. Start the backend

```bash
cd server
cp .env.example .env      # Windows: copy .env.example .env
```

Open `.env` and set your own values:

| Variable | Meaning |
| --- | --- |
| `DATABASE_URL` | e.g. `postgres://postgres:yourpassword@localhost:5432/petal` |
| `JWT_SECRET` | a long random string used to sign login tokens |
| `PORT` | API port (default `4000`) |
| `CLIENT_ORIGIN` | frontend address allowed by CORS (default `http://localhost:5173`) |

```bash
npm install
npm run migrate           # creates the tables
npm run dev               # http://localhost:4000
```

### 3. Start the frontend (second terminal)

```bash
cd client
npm install
npm run dev               # http://localhost:5173
```

Open http://localhost:5173, create an account and start planning.

### Run again later

PostgreSQL running, then `npm run dev` in `server`, and `npm run dev` in `client`. No need to install or migrate again.

### Try the demo version locally (no database)

```bash
cd client
npm install
VITE_DEMO=true npm run dev        # PowerShell: $env:VITE_DEMO="true"; npm run dev
```

## How it works

```
Browser (React)  --/api requests + Bearer token-->  Express API  --SQL-->  PostgreSQL
```

- The React app calls the API through one wrapper (`client/src/api.js`) that adds the login token.
- The API checks the token, validates the input and runs parameterised SQL filtered by the user's id.
- In development, Vite forwards `/api` requests to `localhost:4000`.
- In demo mode, `api.js` calls `demoApi.js` instead, which imitates the API and stores data in `localStorage`.

## Project structure

```
petal/
├── client/                 React app (Vite)
│   └── src/
│       ├── pages/          Today, Upcoming, Projects, Notes, NoteEditor, TaskForm, Profile, Auth, Welcome
│       ├── components/     Nav, TaskCard, Flower, Icon
│       ├── api.js          fetch wrapper (and demo switch)
│       ├── demoApi.js      browser-only fake API
│       ├── auth.jsx        login state
│       └── dates.js        local date helpers
├── server/
│   └── src/
│       ├── routes/         auth, projects, tasks, notes, stats
│       ├── schema.sql      database tables
│       ├── middleware.js   token check, helpers
│       ├── db.js           PostgreSQL connection
│       └── index.js        Express app
└── .github/workflows/      builds and deploys the demo to GitHub Pages
```

## API overview

All routes start with `/api`. Everything except register, login and health needs `Authorization: Bearer <token>`.

| Area | Endpoints |
| --- | --- |
| Auth | `POST /auth/register`, `POST /auth/login`, `GET /auth/me` |
| Projects | `GET /projects`, `POST /projects`, `DELETE /projects/:id` |
| Tasks | `GET /tasks`, `GET /tasks/overdue`, `GET/PATCH/DELETE /tasks/:id`, `POST /tasks` |
| Subtasks | `POST /tasks/:id/subtasks`, `PATCH/DELETE /tasks/subtasks/:id` |
| Notes | `GET /notes`, `GET/PATCH/DELETE /notes/:id`, `POST /notes` |
| Stats | `GET /stats` |

## Database

Five tables: `users`, `projects`, `tasks`, `subtasks` and `notes`. Deleting a user removes all their data. Deleting a project keeps its tasks and notes. See [`server/src/schema.sql`](server/src/schema.sql).

## Security

- Passwords hashed with bcrypt
- JWTs that expire after 7 days
- Parameterised SQL queries
- Every query scoped to the logged-in user
- CORS limited to the configured frontend address
- Secrets kept in `.env`, which is not committed

## Ideas for the future

- httpOnly cookie sessions, login rate limiting and password reset
- Automated API tests
- Reminders and recurring tasks
- Renaming projects, and pagination for large lists

## Author

Built by **YOUR NAME** · [LinkedIn](https://www.linkedin.com/in/YOUR-PROFILE) · [GitHub](https://github.com/YOUR-USERNAME)
