#!/usr/bin/env bash
# CI smoke test on an x86_64 emulator: install the debug APK, open it, and wait until the
# bundled SillyTavern serves its own UI on 127.0.0.1:8123. Then measure a second (warm) start.
# Usage: emulator-smoke.sh <apk> <output dir>
set -uo pipefail
APK=$1
OUT=$2
PKG=app.pockettavern.debug
ACTIVITY=$PKG/app.pockettavern.MainActivity
mkdir -p "$OUT"

collect() {
  adb exec-out screencap -p > "$OUT/$1-screen.png" || true
  adb shell run-as $PKG cat files/engine/runtime.log > "$OUT/$1-runtime.log" 2>&1 || true
  adb shell run-as $PKG cat files/engine/state > "$OUT/$1-state.txt" 2>&1 || true
  adb shell run-as $PKG du -sh files/engine/sillytavern files/engine/home > "$OUT/$1-disk.txt" 2>&1 || true
}

# Waits up to $2 seconds for SillyTavern's index page; prints the seconds it took.
wait_for_st() {
  local label=$1 limit=$2 start now
  start=$(date +%s)
  while true; do
    now=$(date +%s)
    if curl -s --max-time 3 -o "$OUT/$label-index.html" http://127.0.0.1:8123/ &&
       grep -q '<title>SillyTavern</title>' "$OUT/$label-index.html"; then
      echo "$label: SillyTavern answered after $((now - start)) s"
      echo "$((now - start))" > "$OUT/$label-seconds.txt"
      return 0
    fi
    if (( now - start > limit )); then
      echo "$label: no answer within $limit s"
      return 1
    fi
    if (( (now - start) % 15 == 0 )); then
      echo "  [$((now - start)) s] state=$(adb shell run-as $PKG cat files/engine/state 2>/dev/null)"
    fi
    sleep 1
  done
}

adb install -r -g "$APK" || exit 1
adb forward tcp:8123 tcp:8123
adb logcat -c || true

status=0
adb shell am start -W -n $ACTIVITY
if wait_for_st first 900; then
  code=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8123/lib.js)
  echo "lib.js (webpack bundle) HTTP $code"
  [ "$code" = 200 ] || status=1
  sleep 20 # let the WebView finish rendering ST's UI
else
  status=1
fi
collect first

# Warm start: kill everything, open again (no unpack, webpack cache present).
adb shell am force-stop $PKG
sleep 2
adb shell am start -W -n $ACTIVITY
if wait_for_st second 600; then sleep 15; else status=1; fi
collect second
adb logcat -d > "$OUT/logcat.txt" || true
exit $status
