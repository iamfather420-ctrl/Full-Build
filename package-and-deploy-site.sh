#!/usr/bin/env bash
set -euo pipefail
ROOT="$(pwd)"
OUT="$ROOT/consolidated-site-output"
ART="$ROOT/site-artifacts"
TMPREP="$ROOT/.gh-pages-temp"
DOMAIN="uarefake.com"
GIT_REMOTE="origin"
PUSH_GHPAGES="${1:-false}"

echo "[INFO] Root: $ROOT"
rm -rf "$OUT" "$ART" "$TMPREP"
mkdir -p "$OUT" "$ART"

build_if_node() {
  dir="$1"
  if [ -f "$dir/package.json" ]; then
    echo "[BUILD] Found package.json in $dir"
    if grep -q '"build"' "$dir/package.json"; then
      echo "[BUILD] Running npm ci && npm run build in $dir"
      (cd "$dir" && npm ci --silent) || true
      (cd "$dir" && npm run build) || true
      for outdir in dist build public; do
        if [ -d "$dir/$outdir" ]; then
          echo "[COPY] $dir/$outdir -> $OUT"
          rsync -a --delete --exclude='node_modules' --exclude='.git' --exclude='*.apk' --exclude='*.zip' "$dir/$outdir"/ "$OUT"/ || true
        fi
      done
    else
      echo "[SKIP] No build script detected in $dir/package.json"
    fi
  fi
}

[ -d "Solvex-core" ] && build_if_node "Solvex-core"

for pkg in artifacts/* artifacts/*/* lib/* lib/*/*; do
  [ -d "$pkg" ] || continue
  build_if_node "$pkg"
done

CANDIDATES=(
  "artifacts/solvex/public"
  "artifacts/mockup-sandbox"
  "Solvex-core"
  "index.html"
  "public"
)

for p in "${CANDIDATES[@]}"; do
  if [ -e "$ROOT/$p" ]; then
    echo "[GATHER] adding $p"
    if [ -d "$ROOT/$p" ]; then
      rsync -a --exclude='node_modules' --exclude='.git' --exclude='*.apk' --exclude='*.zip' --exclude='attached_assets' "$ROOT/$p"/ "$OUT"/ || true
    else
      cp "$ROOT/$p" "$OUT"/ || true
    fi
  fi
done

rm -rf "$OUT/node_modules" "$OUT/.git" "$OUT/attached_assets" || true

FILE_COUNT=$(find "$OUT" -type f | wc -l || true)
if [ -z "$FILE_COUNT" ] || [ "$FILE_COUNT" -eq 0 ]; then
  echo "[WARN] No site files were produced into $OUT"
  echo "Check artifacts/solvex/public or Solvex-core build outputs and re-run."
  exit 0
fi

cd "$OUT"
echo "[INFO] Generating checksums..."
find . -type f -print0 | xargs -0 sha256sum > "$ART/site-files.sha256"
echo "[INFO] Recording sizes..."
find . -type f -printf '%P\t%s\n' > "$ART/site-files.sizes"
echo "[INFO] Creating summary..."
echo "Consolidated site summary generated on: $(date -u)" > "$ART/summary.txt"
echo "Top 200 files (path):" >> "$ART/summary.txt"
find . -type f -maxdepth 4 -printf '%P\n' | sed -n '1,200p' >> "$ART/summary.txt"
du -sh . >> "$ART/summary.txt"
echo "[INFO] Packing site-output to tarball..."
tar -czf "$ART/consolidated-site.tgz" -C "$OUT" . || true
echo "[INFO] Artifacts written to $ART"
cd "$ROOT"

echo "=== ARTIFACT SUMMARY ==="
echo "Files: $(wc -l < "$ART/site-files.sha256")"
ls -lh "$ART" || true

if [ "$PUSH_GHPAGES" = "true" ]; then
  echo "[DEPLOY] Preparing gh-pages branch"
  if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo "[ERROR] Not a git repository here. Aborting publish."
    exit 1
  fi
  git fetch "$GIT_REMOTE" || true
  rm -rf "$TMPREP"
  if git worktree add --detach "$TMPREP" >/dev/null 2>&1; then
    echo "[DEPLOY] worktree created at $TMPREP"
  else
    git clone --branch gh-pages --single-branch "$(git remote get-url $GIT_REMOTE)" "$TMPREP" || {
      mkdir -p "$TMPREP"
      (cd "$TMPREP" && git init && git checkout --orphan gh-pages)
    }
  fi
  (cd "$TMPREP" && git checkout gh-pages 2>/dev/null || git checkout --orphan gh-pages)
  rm -rf "$TMPREP"/* "$TMPREP"/.[!.]* 2>/dev/null || true
  rsync -a --delete "$OUT"/ "$TMPREP"/ || true
  echo "$DOMAIN" > "$TMPREP"/CNAME
  (cd "$TMPREP" && git add -A && git commit -m "Deploy site: $(date -u)" || true)
  echo "[DEPLOY] Pushing to $GIT_REMOTE gh-pages (force)"
  git -C "$TMPREP" push "$GIT_REMOTE" gh-pages --force
  echo "[DEPLOY] Done. Clean up"
  git worktree remove "$TMPREP" || rm -rf "$TMPREP"
  echo "[DEPLOY] Published to gh-pages"
else
  echo "[INFO] Deployment skipped. To push to gh-pages run: ./package-and-deploy-site.sh true"
fi
