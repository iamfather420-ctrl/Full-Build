#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# SOLVEX + DAISY HAMINJA AI/UI/OS — AUTHORITATIVE PUBLICATION & VERIFICATION SCRIPT
# ==============================================================================
# Target Repository: iamfather420-ctrl/Full-Build
# Target Branch:     main
# Commit to Publish: 25f65b16be2a12c8f52975172fcf3e870c94cb23
# Expected Base:     a5ae6a4f928b80460519a9b493c1355916351967
# ==============================================================================

COMMIT="25f65b16be2a12c8f52975172fcf3e870c94cb23"
EXPECTED_BASE="a5ae6a4f928b80460519a9b493c1355916351967"

echo "===================================================================="
echo " 1. Confirm the original commit exists locally."
echo "===================================================================="
if ! git cat-file -e "${COMMIT}^{commit}" 2>/dev/null; then
  echo "ERROR: Commit ${COMMIT} does not exist in local Git object database."
  echo "Ensure this script is run from the repository root on the authoring workstation."
  exit 1
fi

echo "Commit ${COMMIT} verified in local git objects:"
git show --no-patch --format=fuller "$COMMIT"

echo ""
echo "===================================================================="
echo " 2. Fetch the latest main and confirm the expected base is present."
echo "===================================================================="
git fetch origin main
REMOTE_MAIN="$(git rev-parse origin/main)"
echo "Current origin/main: $REMOTE_MAIN"

echo ""
echo "===================================================================="
echo " 3. Verify remote main matches expected base."
echo "===================================================================="
if [ "$REMOTE_MAIN" != "$EXPECTED_BASE" ]; then
  echo "STOP: origin/main has changed (found: $REMOTE_MAIN, expected: $EXPECTED_BASE)."
  echo "Reinspect ancestry and divergence before pushing."
  exit 1
fi
echo "CONFIRMED: origin/main matches expected base: $EXPECTED_BASE"

echo ""
echo "===================================================================="
echo " 4. Verify ancestry and perform safe fast-forward push."
echo "===================================================================="
if git merge-base --is-ancestor origin/main "$COMMIT"; then
  echo "Ancestry confirmed. Attempting normal, non-force push."
  git push origin "${COMMIT}:refs/heads/main"
else
  echo "STOP: repair commit is not a direct descendant of origin/main."
  echo "No push performed. Inspecting divergence between origin/main and commit:"
  git log --graph --oneline --decorate origin/main "$COMMIT" -30
  exit 1
fi

echo ""
echo "===================================================================="
echo " 5. Verify the published branch points to the intended commit."
echo "===================================================================="
git fetch origin main
PUBLISHED="$(git rev-parse origin/main)"
echo "Published origin/main: $PUBLISHED"

if [ "$PUBLISHED" = "$COMMIT" ]; then
  echo "===================================================================="
  echo "CONFIRMED: intended commit ${COMMIT} is published on origin/main."
  echo "GitHub Actions will trigger .github/workflows/verify-authoritative.yml"
  echo "===================================================================="
else
  echo "STOP: remote main does not point to the intended commit."
  exit 1
fi
