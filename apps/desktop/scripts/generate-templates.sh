#!/usr/bin/env bash
#
# Generate pre-built Expo template archives for offline scaffolding.
#
# Usage: ./scripts/generate-templates.sh
#
# Creates resources/expo-templates/{blank,tabs,drawer}.tar.gz
# plus a manifest.json with SDK version and generation timestamp.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
OUTPUT_DIR="$PROJECT_ROOT/resources/expo-templates"
TEMPLATES=("blank" "tabs" "drawer")

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Create temp workspace
TMPDIR_PATH=$(mktemp -d)
echo "Working in $TMPDIR_PATH"

cleanup() {
  echo "Cleaning up $TMPDIR_PATH"
  rm -rf "$TMPDIR_PATH"
}
trap cleanup EXIT

# Generate each template
for tpl in "${TEMPLATES[@]}"; do
  echo ""
  echo "==> Generating template: $tpl"

  npx --yes create-expo-app "template-$tpl" \
    --template "$tpl" \
    --no-install \
    2>&1 | tail -5 || true

  # Move into temp dir (create-expo-app creates in cwd)
  mv "template-$tpl" "$TMPDIR_PATH/" 2>/dev/null || \
    mv "$TMPDIR_PATH/template-$tpl" "$TMPDIR_PATH/template-$tpl" 2>/dev/null || true

  # Create tarball excluding .git
  echo "    Archiving $tpl..."
  tar -czf "$OUTPUT_DIR/$tpl.tar.gz" \
    --exclude='.git' \
    -C "$TMPDIR_PATH" "template-$tpl"

  echo "    Created $OUTPUT_DIR/$tpl.tar.gz"
done

# Detect Expo SDK version from the first template
SDK_VERSION="unknown"
PKG_JSON="$TMPDIR_PATH/template-blank/package.json"
if [ -f "$PKG_JSON" ]; then
  SDK_VERSION=$(node -e "console.log(require('$PKG_JSON').dependencies?.expo ?? 'unknown')")
fi

# Write manifest
cat > "$OUTPUT_DIR/manifest.json" <<EOF
{
  "generatedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "expoSdkVersion": "$SDK_VERSION",
  "templates": ["blank", "tabs", "drawer"]
}
EOF

echo ""
echo "Done! Templates saved to $OUTPUT_DIR"
echo "SDK version: $SDK_VERSION"
