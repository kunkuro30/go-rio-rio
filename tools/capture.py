#!/usr/bin/env python3
"""GO RIO RIO capture pipeline (house Playwright + Chrome pattern).
Serves the game locally, boots it live (start screen + attract camera),
then shoots the four submission scenes and three character-check views.
Submission JPEGs land in screenshots/ at exactly 1280x720; character
views land in gallery-check/ and never enter screenshots/.
Run with the pwenv interpreter: ~/workspace/tools/pwenv/bin/python tools/capture.py
"""
import subprocess
import sys
import time
from playwright.sync_api import sync_playwright

REPO = "/home/hatch/workspace/makefun-gta6-01/go-rio-rio"
PORT = 8907
BASE = f"http://127.0.0.1:{PORT}"
CHROME = "/home/hatch/workspace/tools/chrome-linux64/chrome"

server = subprocess.Popen(
    ["/home/hatch/workspace/tools/node24/bin/node", "serve.ts", "--port", str(PORT)],
    cwd=REPO, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(2)
total_errors = 0
try:
    with sync_playwright() as pw:
        browser = pw.chromium.launch(
            executable_path=CHROME,
            args=["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--no-sandbox"])
        page = browser.new_page(viewport={"width": 1280, "height": 720})
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)

        page.goto(BASE + "/", wait_until="load")
        try:
            page.wait_for_function("window.__game !== undefined", timeout=120000)
        except Exception as exc:
            print(f"live: BOOT TIMEOUT {exc}", flush=True)
            total_errors += 1
        page.wait_for_timeout(6000)
        page.screenshot(path=f"{REPO}/gallery-check/start-attract.jpg", type="jpeg", quality=85, timeout=240000)
        print(f"start attract: errors={len(errors)} {errors[:2]}", flush=True)
        total_errors += len(errors)

        def shoot(scene, out):
            global total_errors
            errors.clear()
            page.goto(f"{BASE}/?shot={scene}&seed=1", wait_until="load")
            try:
                page.wait_for_function("window.__shotReady === true", timeout=300000)
            except Exception as exc:
                print(f"{scene}: TIMEOUT {exc}", flush=True)
                total_errors += 1
                return
            page.wait_for_timeout(200)
            page.screenshot(path=out, type="jpeg", quality=82, timeout=240000)
            print(f"{scene}: errors={len(errors)} {errors[:2]}", flush=True)
            total_errors += len(errors)

        ALL = [("chase", "screenshots/1-chase.jpg"), ("beach", "screenshots/2-beach.jpg"),
               ("city", "screenshots/3-city.jpg"), ("mission", "screenshots/4-mission.jpg"),
               ("char-front", "gallery-check/char-front.jpg"), ("char-side", "gallery-check/char-side.jpg"),
               ("char-threeq", "gallery-check/char-threeq.jpg")]
        wanted = sys.argv[1:]
        for scene, rel in ALL:
            if wanted and scene not in wanted:
                continue
            shoot(scene, f"{REPO}/{rel}")
        browser.close()
finally:
    server.terminate()
print(f"TOTAL_PAGE_ERRORS={total_errors}", flush=True)
sys.exit(1 if total_errors else 0)
