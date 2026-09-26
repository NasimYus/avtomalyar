SHELL := /bin/bash
-include .env
export

MIGRATE := go run -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@v4.18.1
SQLC := go run github.com/sqlc-dev/sqlc/cmd/sqlc@v1.31.1

.PHONY: up down lint test e2e migrate-up migrate-down sqlc seed-admin seed-demo

up:
	docker compose up --build

down:
	docker compose down

lint:
	cd backend && go vet ./... && test -z "$$(gofmt -l .)" && golangci-lint run ./...
	cd frontend && npm run typecheck && npm run lint && npm run format && npm run fsd-lint

test:
	cd backend && go test ./...
	cd frontend && npm run test

# Needs a running, seeded stack and E2E_ADMIN_PASSWORD; see README → «E2E-тесты».
e2e:
	cd e2e && npm ci && npx playwright test

migrate-up:
	cd backend && $(MIGRATE) -database "$(DATABASE_URL)" -path migrations up

migrate-down:
	cd backend && $(MIGRATE) -database "$(DATABASE_URL)" -path migrations down 1

sqlc:
	cd backend && $(SQLC) generate

seed-admin:
	cd backend && go run ./cmd/seed admin

seed-demo:
	cd backend && go run ./cmd/seed demo
