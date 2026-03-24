PNPM ?= corepack pnpm
UV ?= uv

.PHONY: install backend-sync lint test build verify api worker app regression backend-regression maestro-android-local maestro-ios-local

install:
	$(PNPM) install

backend-sync:
	$(UV) sync --directory backend

lint:
	$(PNPM) lint

test:
	$(PNPM) test

build:
	$(PNPM) build

verify: lint test build backend-regression

api:
	cd backend && PYTHONPATH=.. $(UV) run uvicorn backend.src.main:app --reload


worker:
	cd backend && PYTHONPATH=.. $(UV) run python -m backend.src.workers.notes

app:
	$(PNPM) --filter app start

regression: test backend-regression

backend-regression:
	$(UV) run --directory backend pytest --cov=backend.src --cov-report=term-missing

maestro-android-local:
	./scripts/maestro/run-local.sh android

maestro-ios-local:
	./scripts/maestro/run-local.sh ios
