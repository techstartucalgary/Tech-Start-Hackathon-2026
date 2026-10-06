set shell := ["bash", "-cu"]

default:
    @just --list

# Install dependencies
install-backend:
    cd backend && npm install

install-frontend:
    cd frontend && npm install

install:
    just install-backend
    just install-frontend

# Backend app commands
backend-dev:
    cd backend && npm run dev

backend-start:
    cd backend && npm start

backend-test: install-backend
    cd backend && npm test -- --runInBand

backend-test-watch: install-backend
    cd backend && npm run test:watch

backend-lint: install-backend
    cd backend && npm run lint

backend-lint-fix: install-backend
    cd backend && npm run lint:fix

backend-format: install-backend
    cd backend && npm run format

backend-format-check: install-backend
    cd backend && npx prettier --check "src/**/*.js"

backend-check: install-backend
    just backend-lint
    just backend-test

backend-ci: install-backend
    just backend-lint
    just backend-format-check
    just backend-test

# Frontend app commands
frontend-dev: install-frontend
    cd frontend && npm run dev

frontend-build: install-frontend
    cd frontend && npm run build

frontend-start: install-frontend
    cd frontend && npm start

# Project-wide commands
check:
    just backend-check
    just frontend-build

ci:
    just backend-ci
    just frontend-build

all:
    just install
    just ci
