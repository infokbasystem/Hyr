#!/usr/bin/env bash
# Build production artifacts for manual deployment to the two IIS sites.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY="$ROOT/deploy"
BUILD_API=true
BUILD_WEB=true
SKIP_INSTALL=false
INCLUDE_CONFIG=false
API_URL="https://api.hyrsys.se/api"
TARGET=""
STAGING=""
INSTALLING=false
COMMITTED=false

usage() {
    cat <<'EOF'
Usage: ./deploy.sh [options]

Options:
  --api-only          Publish only the backend
  --web-only          Build only the frontend
  --skip-install      Skip npm dependency installation
  --include-config    Include IIS configuration and a backend settings template
                      for initial setup (edit placeholders before deployment)
  --api-url URL       Frontend API base URL (default: https://api.hyrsys.se/api)
  -h, --help          Show this help

Artifacts: deploy/backend and deploy/frontend. No transfer or database updates are performed.
Normal builds omit web.config and backend appsettings*.json to preserve server settings.
EOF
}

fail() {
    echo "Error: $*" >&2
    exit 1
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --api-only|--web-only)
            [[ -z "$TARGET" || "$TARGET" == "$1" ]] || fail "--api-only and --web-only cannot be combined."
            TARGET="$1"
            if [[ "$1" == "--api-only" ]]; then BUILD_WEB=false; else BUILD_API=false; fi
            ;;
        --skip-install) SKIP_INSTALL=true ;;
        --include-config) INCLUDE_CONFIG=true ;;
        --api-url)
            [[ $# -ge 2 && -n "$2" && "$2" != --* ]] || fail "--api-url requires an absolute HTTPS URL."
            API_URL="$2"
            shift
            ;;
        -h|--help) usage; exit 0 ;;
        *) usage >&2; fail "Unknown option: $1" ;;
    esac
    shift
done

if [[ "$BUILD_API" == true ]]; then
    command -v dotnet >/dev/null 2>&1 || fail "'dotnet' was not found on PATH."
fi
if [[ "$BUILD_WEB" == true ]]; then
    command -v npm >/dev/null 2>&1 || fail "'npm' was not found on PATH."
    command -v node >/dev/null 2>&1 || fail "'node' was not found on PATH."
    node --input-type=module - "$API_URL" <<'JS'
const value = process.argv[2];
try {
  const url = new URL(value);
  if (!value.startsWith('https://') || value !== value.trim() ||
      url.protocol !== 'https:' || !url.hostname || url.username || url.password ||
      url.search || url.hash || /\s/.test(value)) {
    throw new Error('Expected an absolute HTTPS URL without credentials, whitespace, query, or fragment.');
  }
} catch (error) {
  console.error(`Error: invalid --api-url: ${error.message}`);
  process.exit(1);
}
JS
    [[ -f "$ROOT/frontend/package-lock.json" ]] || fail "frontend/package-lock.json is required for reproducible builds."
fi

cleanup() {
    local status=$?
    trap - EXIT
    if [[ "$INSTALLING" == true && "$COMMITTED" == false ]]; then
        for target in backend frontend; do
            # A missing staged folder means that target was moved into its final location.
            if [[ -d "$STAGING/old-$target" ]]; then
                rm -rf "$DEPLOY/$target"
                mv "$STAGING/old-$target" "$DEPLOY/$target"
            elif [[ -f "$STAGING/install-$target" && ! -d "$STAGING/$target" ]]; then
                rm -rf "$DEPLOY/$target"
            fi
        done
    fi
    if [[ -n "$STAGING" ]]; then rm -rf "$STAGING"; fi
    if [[ $status -ne 0 ]]; then echo "Error: publishing failed; no new artifact set was committed." >&2; fi
    exit "$status"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

mkdir -p "$DEPLOY"
STAGING="$(mktemp -d "$DEPLOY/.staging.XXXXXX")"

if [[ "$BUILD_API" == true ]]; then
    echo "==> Publishing backend (Release / win-x64, framework-dependent)"
    DISABLE_WEB_CONFIG=true
    if [[ "$INCLUDE_CONFIG" == true ]]; then DISABLE_WEB_CONFIG=false; fi
    dotnet publish "$ROOT/backend/backend.csproj" \
        --configuration Release \
        --runtime win-x64 \
        --self-contained false \
        -p:IsTransformWebConfigDisabled="$DISABLE_WEB_CONFIG" \
        --output "$STAGING/backend"

    [[ -f "$STAGING/backend/Backend.dll" && -f "$STAGING/backend/Backend.runtimeconfig.json" ]] \
        || fail "Expected backend entry-point artifacts were not created."
    rm -f "$STAGING/backend"/appsettings*.json
    if [[ "$INCLUDE_CONFIG" == true ]]; then
        [[ -f "$STAGING/backend/web.config" ]] || fail "The Web SDK did not generate backend web.config."
        cp "$ROOT/deployment/appsettings.template.json" "$STAGING/backend/appsettings.json"
    else
        rm -f "$STAGING/backend/web.config"
    fi
fi

if [[ "$BUILD_WEB" == true ]]; then
    echo "==> Building frontend (production API: $API_URL)"
    (
        cd "$ROOT/frontend"
        if [[ "$SKIP_INSTALL" == false ]]; then
            # react-switch-selector still declares an older React peer range.
            npm ci --legacy-peer-deps
        fi
        VITE_API_URL="$API_URL" npm run build -- \
            --mode production --outDir "$STAGING/frontend" --emptyOutDir
    )
    [[ -f "$STAGING/frontend/index.html" ]] || fail "Expected frontend index.html was not created."
    if [[ "$INCLUDE_CONFIG" == true ]]; then
        cp "$ROOT/deployment/frontend.web.config" "$STAGING/frontend/web.config"
    else
        rm -f "$STAGING/frontend/web.config"
    fi
fi

# Commit only after every selected build succeeds; retain backups until all moves finish.
INSTALLING=true
for target in backend frontend; do
    if [[ -d "$STAGING/$target" ]]; then
        touch "$STAGING/install-$target"
        if [[ -e "$DEPLOY/$target" ]]; then
            [[ -d "$DEPLOY/$target" && ! -L "$DEPLOY/$target" ]] || fail "$DEPLOY/$target must be a regular directory."
            mv "$DEPLOY/$target" "$STAGING/old-$target"
        fi
        mv "$STAGING/$target" "$DEPLOY/$target"
    fi
done
COMMITTED=true

if [[ "$BUILD_API" == true ]]; then echo "==> API published to $DEPLOY/backend"; fi
if [[ "$BUILD_WEB" == true ]]; then echo "==> Web built to $DEPLOY/frontend"; fi
if [[ "$INCLUDE_CONFIG" == true && "$BUILD_API" == true ]]; then
    echo "==> INITIAL SETUP: replace appsettings.json placeholders and configure integration secrets before startup."
fi
echo "==> Done. Copy only the selected targets; preserve existing server configuration during normal updates."
