SHELL := /bin/bash
.DEFAULT_GOAL := help

PYTHON     := python3
NPM        := npm
DEV_PORT   := 8743
PID_FILE   := .dev.pid

# ─── Composite ────────────────────────────────────────────────────────────────

.PHONY: up
up: ## Start backend (bg) + Tauri dev window (fg). Ctrl-C stops both.
	@echo "[up] Starting Python backend on port $(DEV_PORT)..."
	@$(PYTHON) backend/main.py --port $(DEV_PORT) & echo $$! > $(PID_FILE)
	@trap '$(MAKE) --no-print-directory down' EXIT; \
	 echo "[up] Starting Tauri dev..."; \
	 fuser -k 1420/tcp 2>/dev/null || true; \
	 $(NPM) run tauri dev

.PHONY: down
down: ## Kill background dev processes started by `make up`.
	@if [ -f $(PID_FILE) ]; then \
	  PID=$$(cat $(PID_FILE)); \
	  if kill -0 $$PID 2>/dev/null; then \
	    echo "[down] Stopping backend (PID $$PID)..."; \
	    kill $$PID; \
	  fi; \
	  rm -f $(PID_FILE); \
	else \
	  echo "[down] No PID file found, nothing to stop."; \
	fi

# ─── Individual services ──────────────────────────────────────────────────────

.PHONY: backend
backend: ## Start only the Python FastAPI backend (foreground).
	$(PYTHON) backend/main.py --port $(DEV_PORT)

.PHONY: frontend
frontend: ## Start only the Vite dev server (no Tauri window).
	$(NPM) run dev

.PHONY: tauri
tauri: ## Start full Tauri dev (Vite + Rust shell). Requires backend running.
	$(NPM) run tauri dev

# ─── Install ──────────────────────────────────────────────────────────────────

.PHONY: install
install: install-js install-py ## Install all dependencies.

.PHONY: install-js
install-js: ## Install Node dependencies.
	$(NPM) install

.PHONY: install-py
install-py: ## Install Python dependencies.
	$(PYTHON) -m pip install --user -r backend/requirements.txt

# ─── Build ────────────────────────────────────────────────────────────────────

.PHONY: build
build: ## Build frontend + Tauri release bundle.
	$(NPM) run tauri build

.PHONY: build-frontend
build-frontend: ## Build only the React/Vite frontend.
	$(NPM) run build

# ─── Quality ──────────────────────────────────────────────────────────────────

.PHONY: check
check: check-ts check-rust ## Run all type/compile checks.

.PHONY: check-ts
check-ts: ## Type-check TypeScript.
	$(NPM) exec tsc -- --noEmit

.PHONY: check-rust
check-rust: ## Run cargo check on the Tauri shell.
	cargo check --manifest-path src-tauri/Cargo.toml

.PHONY: lint
lint: lint-py lint-js ## Lint Python and TypeScript.

.PHONY: lint-py
lint-py: ## Lint Python backend with ruff (installs if missing).
	@if ! command -v ruff &>/dev/null; then \
	  echo "[lint-py] ruff not found, installing..."; \
	  $(PYTHON) -m pip install --user ruff; \
	fi
	ruff check backend/

.PHONY: lint-js
lint-js: ## Lint TypeScript/React with eslint (installs if missing).
	@if ! $(NPM) exec --no -- eslint --version &>/dev/null; then \
	  echo "[lint-js] eslint not found, installing..."; \
	  $(NPM) install --save-dev eslint @eslint/js typescript-eslint; \
	fi
	$(NPM) exec eslint -- src/

.PHONY: test
test: test-py ## Run all tests.

.PHONY: test-py
test-py: ## Run Python backend tests with pytest.
	@if ! command -v pytest &>/dev/null; then \
	  echo "[test-py] pytest not found, installing..."; \
	  $(PYTHON) -m pip install --user pytest pytest-asyncio httpx; \
	fi
	pytest backend/tests/ -v

# ─── Clean ────────────────────────────────────────────────────────────────────

.PHONY: clean
clean: ## Remove all build artifacts and caches.
	rm -rf dist node_modules/.vite
	cargo clean --manifest-path src-tauri/Cargo.toml
	find backend -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	rm -f $(PID_FILE)

.PHONY: clean-all
clean-all: clean ## Also remove node_modules and pip-installed packages.
	rm -rf node_modules

# ─── Help ─────────────────────────────────────────────────────────────────────

.PHONY: help
help: ## Show this help message.
	@echo "Rocket Game Launcher — dev commands"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*##' $(MAKEFILE_LIST) \
	  | awk 'BEGIN {FS = ":.*## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'
