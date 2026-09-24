# Автомаляр — программа лояльности

Веб-система учёта покупок дилеров и программа лояльности для магазина
автомалярной продукции «Автомаляр»: админ-панель + личный кабинет дилера.

Текущий статус: **Этап 1** — фундамент и справочники (см. `docs/` за
техническими заданиями, если они добавлены в репозиторий).

## Стек

- **Backend**: Go, chi, pgx/sqlc, PostgreSQL, golang-migrate, JWT + bcrypt.
- **Frontend**: React + TypeScript + Vite, Feature-Sliced Design, TanStack
  Query, Zustand, Tailwind CSS, react-i18next (ru/tg).
- **Инфраструктура**: Docker Compose, GitHub Actions CI.

## Быстрый старт (Docker)

```bash
cp .env.example .env
# отредактируйте .env — как минимум задайте JWT_SECRET
make up
```

В отдельном терминале, пока `postgres` контейнер поднят:

```bash
make migrate-up
make seed-admin
make seed-demo
```

`make seed-admin` выведет логин и пароль первого администратора один раз —
сохраните их.

Приложение будет доступно на `http://localhost` (фронтенд, проксирует
`/api` на backend), backend напрямую — на `http://localhost:8080`.

## Локальная разработка без Docker

Backend:

```bash
cd backend
cp ../.env.example .env   # либо экспортируйте переменные окружения вручную
go run ./cmd/api
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

## Полезные команды

| Команда | Что делает |
|---|---|
| `make up` / `make down` | Поднять/остановить окружение через Docker Compose |
| `make lint` | Линтеры backend (golangci-lint) и frontend (ESLint, Prettier, Steiger) |
| `make test` | Тесты backend (`go test`) и frontend (Vitest) |
| `make migrate-up` / `make migrate-down` | Применить/откатить миграции БД |
| `make sqlc` | Сгенерировать типобезопасные запросы из `backend/queries/*.sql` |
| `make seed-admin` | Создать первого администратора |
| `make seed-demo` | Заполнить БД демо-данными (города, грейды, призы, дилеры, покупки) |

Для `make lint` локально нужен установленный `golangci-lint`:

```bash
go install github.com/golangci/golangci-lint/v2/cmd/golangci-lint@latest
```

## Структура репозитория

```
avtomalyar/
├── backend/     # Go API: cmd/api, cmd/seed, internal/{config,domain,service,repository,auth,transport}
├── frontend/    # React + FSD: src/{app,pages,widgets,features,entities,shared}
├── docker-compose.yml
├── Makefile
└── .github/workflows/ci.yml
```

## Переменные окружения

См. `.env.example`. Обязательные для запуска — `JWT_SECRET` (production —
длинное случайное значение) и настройки PostgreSQL.
