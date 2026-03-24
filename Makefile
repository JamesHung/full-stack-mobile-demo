PNPM ?= corepack pnpm
UV ?= uv

.PHONY: install backend-sync lint test build verify api worker app regression backend-regression maestro-android-local maestro-ios-local android-apk

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

android-apk:
	$(PNPM) install
	cd android && bundle config set --local path 'vendor/bundle' && bundle install --quiet
	cd app && $(PNPM) exec expo prebuild --platform android --clean
	echo "sdk.dir=$$HOME/Library/Android/sdk" > app/android/local.properties
	cd android && \
		KEYSTORE_PASSWORD=$(KEYSTORE_PASSWORD) \
		KEY_ALIAS=$(KEY_ALIAS) \
		KEY_PASSWORD=$(KEY_PASSWORD) \
		bundle exec fastlane android build_and_export_apk
