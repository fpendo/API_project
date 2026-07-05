#!/usr/bin/env bash
# Deploy a Designo-generated site as the public Designo landing page.
#
#   ./deploy_landing.sh <project_id>
#
# The generated index.html is served at exactly /designo/ (nginx exact-match
# location); its relative assets (photos/, videos/, shadow files) are copied
# into /var/www/designo/ so they resolve under /designo/. The React SPA keeps
# serving /designo/login and all studio routes via the prefix location.
set -euo pipefail

PROJECT_ID="${1:?usage: deploy_landing.sh <project_id>}"
SITE_DIR="/opt/app/designo/storage/projects/${PROJECT_ID}/site"
WEB_ROOT="/var/www/designo"

[ -f "${SITE_DIR}/index.html" ] || { echo "no generated site at ${SITE_DIR}"; exit 1; }

mkdir -p "${WEB_ROOT}/landing"

# Inject a fixed "Log in" button — always applied so it's consistently
# styled regardless of what the model produced.
python3 - "$SITE_DIR/index.html" "${WEB_ROOT}/landing/index.html" <<'PY'
import sys, re

src, dst = sys.argv[1], sys.argv[2]
html = open(src, encoding="utf-8").read()

# Remove any existing model-generated login link first (we replace it)
html = re.sub(r'<a[^>]*href="/designo/login"[^>]*>.*?</a>', '', html, flags=re.S)

css = """
/* === Fixed studio login button (injected by deploy_landing.sh) === */
#studio-login-btn {
  position: fixed;
  top: 20px;
  right: 24px;
  z-index: 9999;
  font-family: 'Space Mono', 'Courier New', monospace;
  font-size: 11px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  text-decoration: none;
  color: rgba(255,255,255,0.85);
  background: rgba(0,0,0,0.45);
  border: 1px solid rgba(255,255,255,0.28);
  padding: 9px 20px;
  border-radius: 999px;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  transition: background 0.25s, border-color 0.25s, color 0.25s;
}
#studio-login-btn:hover {
  background: rgba(196,165,96,0.18);
  border-color: rgba(196,165,96,0.7);
  color: #c4a560;
}
"""

html = re.sub(r'(</style>)', css + r'\1', html, count=1)
btn = '\n<a id="studio-login-btn" href="/designo/login" aria-label="Studio login">Log in</a>\n'
html = re.sub(r'(<body[^>]*>)', r'\1' + btn, html, count=1)

open(dst, "w", encoding="utf-8").write(html)
print("landing/index.html written — login button injected")
PY

# Copy the site's assets + shadow files so relative URLs resolve under /designo/
for d in photos videos; do
    if [ -d "${SITE_DIR}/${d}" ]; then
        rm -rf "${WEB_ROOT:?}/${d}"
        cp -r "${SITE_DIR}/${d}" "${WEB_ROOT}/${d}"
        echo "copied ${d}/"
    fi
done
for f in llms.txt agent.json agent.html; do
    [ -f "${SITE_DIR}/${f}" ] && cp "${SITE_DIR}/${f}" "${WEB_ROOT}/${f}" && echo "copied ${f}"
done

chown -R www-data:www-data "${WEB_ROOT}"
echo "deployed project ${PROJECT_ID} as the Designo landing page"
