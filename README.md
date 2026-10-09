# Tech Start Hackathon 2026

A small full-stack demo app built with:

- Frontend: Next.js + React
- Backend: Node.js + Express
- Persistence: SQLite
- API docs: Swagger UI

## Overview

This project separates the user interface from the API so the application stays maintainable and easier to extend.

The frontend is responsible for rendering pages and UI components.
The backend is responsible for handling HTTP requests, business logic, and database access.

For reference, UI and logic can be found prototyped here: https://www.figma.com/design/NsAFWkz6tAjDKgAce2XTQL/Tech-Start-Hackathon-2026?node-id=0-1&p=f&t=L2cuoC5xpPPSd3T8-0

The JIRA board that we will be using to keep track of work items can be found here: https://techstartxcursor2026.atlassian.net/jira/software/projects/SCRUM/boards/1?filter=&groupBy=none

If you're ever assigned to write user stories, this will be the guide that we're using: https://www.atlassian.com/agile/project-management/user-stories.

## Project Plan
The project will be done through Agile sprints. 
- **Agile Sprints**: are essentially short, fixed periods of time where the team plans, develops, tests, and reviews a specific set of features or tasks. 
  - At the end of each sprint, the team reviews the completed work and uses the feedback to plan the next sprint.
  - Our sprints will be ~1 week long just cause we don't have too much time until the product has to be finished.
  - This is a really common practice in corporate!

The project will follow the following sprint cycle:
```
                    ┌─────────────────────┐
              ┌────►│  Product Backlog    │ : lower priority
              │     └─────────┬───────────┘
              │               ↓
              │     ┌─────────────────────┐
              │     │  Sprint Planning    │ 
              │     └─────────┬───────────┘
              │               ↓
              │     ┌─────────────────────┐
              │     │ Sprint Development  │ : coding time!!
              │     └─────────┬───────────┘
              │               ↓
              │     ┌─────────────────────┐
              │     │ Testing & Review    │ : PR code review
              │     └─────────┬───────────┘
              │               ↓
              │     ┌─────────────────────┐
              │     │   Sprint Review     │ 
              │     └─────────┬───────────┘
              │               ↓
              │     ┌─────────────────────┐
              └─────┤ Sprint Retrospective│ : reflection 
                    └─────────────────────┘
```
## Architecture

### High-level flow

```text
┌──────────────────────┐
│       Next.js        │
│   Frontend / UI      │
└──────────┬───────────┘
           │ HTTP requests
           ▼
┌──────────────────────┐
│       Express        │
│     Backend API      │
│                      │
│ Routes               │
│ Controllers          │
│ Services             │
│ Authentication       │
│ Authorization        │
└──────────┬───────────┘
           │ SQL queries
           ▼
┌──────────────────────┐
│       SQLite         │
│      Database        │
└──────────────────────┘
```


### Request lifecycle

A typical request follows this path:

1. The browser loads the frontend page.
2. The frontend renders UI and may call backend APIs.
3. The Express server receives the request.
4. `routes/*.js` match the URL.
5. `controllers/*.js` handle the HTTP request and response.
6. `services/*.js` contain business logic.
7. `models/*.js` interact with the database.
8. SQLite returns or stores data.
9. The controller sends a JSON response back to the frontend.

### Backend structure

```text
backend/
├── src/
│   ├── app.js                # Express app config and middleware
│   ├── server.js             # Starts the server
│   ├── config/
│   │   ├── database.js       # SQLite connection setup
│   │   ├── logger.js         # Structured logging configuration
│   │   └── swagger.js        # Swagger/OpenAPI config
│   ├── controllers/
│   │   └── health/
│   │       └── health.controller.js
│   ├── routes/
│   │   └── health/
│   │       └── health.routes.js
│   ├── services/
│   │   └── health/
│   │       └── health.service.js
│   ├── models/
│   │   └── health/
│   │       └── health.model.js
│   └── ...
├── migrations/
│   ├── MIGRATIONS.md         # migration usage notes
│   └── *.js                 # timestamped migration files
├── scripts/
│   └── migrate.js           # migration runner
├── database.sqlite          # SQLite database file
├── database.json           # local DB metadata/config if needed
├── package.json
├── .eslintrc.js
├── .prettierrc
├── LINTING_AND_FORMATTING.md
├── LOGGING.md
├── server.js               # legacy entrypoint for direct app startup
└── ...
```

### Frontend structure

```text
frontend/
├── pages/
│   ├── _app.js
│   ├── index.js
│   └── welcome-page/
│       └── index.js
├── components/
│   └── welcome-page/
│       ├── login-register-card.js
│       └── particle-background.js
├── styles/
│   └── globals.css
├── package.json
├── next.config.js
└── ...
```

## API design

The backend exposes a small API with a layered design:

- `GET /api` → API metadata
- `GET /api/health` → health check response
- `GET /swagger-ui` → Swagger UI documentation site

### Example health flow

```text
GET /api/health
    -> health.routes.js
    -> health.controller.js
    -> health.service.js
    -> health.model.js
    -> SQLite check
    -> response JSON
```

The health endpoint returns structured JSON such as:

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "message": "Backend is healthy and ready",
    "service": "backend",
    "database": "sqlite",
    "timestamp": "2026-10-03T00:00:00.000Z",
    "uptime": 12.34
  }
}
```

## Security posture

The backend includes basic hardening middleware:

- `helmet` to add security headers
- `cors` with explicit options
- JSON body size limits to reduce abuse
- centralized error handling

**Important limitations:**
- Authentication and authorization are not yet implemented
- Input validation is not yet implemented
- This is suitable for demos and learning, not production use
- Architecture is not the same as security; good structure alone does not make an app secure

To move toward production-grade security, you would need to add:
- User authentication (e.g., JWT, OAuth)
- Input validation and sanitization
- API authorization and access control
- Secure secret management
- HTTPS enforcement
- Request/response logging and monitoring

## Swagger documentation

Swagger is served from the backend and kept separate from the frontend UI flow.
This keeps the docs in the API layer rather than mixing them into the UI layer.

Open Swagger here:

- http://localhost:5001/swagger-ui

## Setup

### 1. Install dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
```

You can also run the project-wide setup helper if you have `just` installed:

```bash
just install
```

### 2. Start the backend

```bash
cd backend
npm run dev
```

Or with the justfile:

```bash
just backend-dev
```

### 3. Start the frontend

```bash
cd frontend
npm run dev
```

Or with the justfile:

```bash
just frontend-dev
```

### 4. Open the app

- Frontend: http://localhost:3000
- Backend API: http://localhost:5001
- Swagger UI: http://localhost:5001/swagger-ui

## Justfile

This project includes a `justfile` at the root to make common setup and workflow commands easier to run consistently.

Use it to see all available commands:

```bash
just --list
```

Common commands include:

```bash
just install
just backend-dev
just backend-start
just backend-test
just backend-test-watch
just backend-lint
just backend-lint-fix
just backend-format
just backend-format-check
just frontend-dev
just frontend-build
just frontend-start
just check
just ci
just all
```

The `justfile` keeps the most common project tasks in one place so contributors do not need to remember each individual npm command.

## Database migrations

The backend includes a basic SQLite migration workflow for creating, applying, and rolling back schema changes.

Create a migration:

```bash
cd backend
npm run migrate:create -- create_users_table
```

Run all pending migrations:

```bash
cd backend
npm run migrate:up
```

Check migration status:

```bash
cd backend
npm run migrate:status
```

Revert the most recent migration:

```bash
cd backend
npm run migrate:down
```

Revert back to a specific migration point:

```bash
cd backend
npm run migrate:down -- create_users_table
```

This is useful when iterating on the schema during development and when you want a repeatable database change history for the project.

## Why this architecture works well

This structure is a good pattern for a small hackathon or MVP app because it keeps responsibilities separated:

- frontend handles user interface
- backend handles API logic
- service layer handles business logic
- model layer handles data access
- SQLite handles persistence
- Swagger documents the API separately

That makes the app easier to understand, test, and extend as more features are added.

## Best practices in progress

This app intentionally keeps things simple for learning and demos. To move toward production-grade code, consider adding:

### Logging & observability
- Structured logging 
- Request IDs for tracing requests across logs
- Never log secrets, passwords, or sensitive tokens

### Code quality
- ESLint for linting
- Prettier for consistent formatting
- Pre-commit hooks to enforce standards

### Database migrations
- A migration tool for sqlite3
- Version control for schema changes
- Safe rollback procedures

### Justfile
This is here for you to be able to run commands easily, and have all of your commands in one place.

## Notes

- The app is intentionally simple and beginner-friendly.
- SQLite is suitable for local development, demos, and single-instance deployments.
  - SQLite handles concurrent writes poorly and is not ideal for multi-instance deployments.
  - For production use with multiple instances, consider PostgreSQL or another robust database.
- The app is designed so future features can be added without rewriting the whole structure.