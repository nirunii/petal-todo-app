# Petal: full-stack to-do and notes app

React (Vite) frontend, Node + Express API, PostgreSQL database.

## Run it

1. Create a database:  `createdb petal`
2. Backend:
   ```
   cd server
   cp .env.example .env     # then edit DATABASE_URL and JWT_SECRET
   npm install
   npm run migrate          # creates the tables
   npm run dev              # http://localhost:4000
   ```
3. Frontend (second terminal):
   ```
   cd client
   npm install
   npm run dev              # http://localhost:5173
   ```
Open http://localhost:5173, create an account, and start planning.
