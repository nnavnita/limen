"""Tiny stdlib server: JSON snapshots plus the static game files."""

import argparse
import json
import mimetypes
import os
import threading
import time
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from .state import build_snapshot

WEB_ROOT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "web")

# Rebuilding on every request would hammer the disk if several tabs are open.
MIN_REBUILD_SECONDS = 0.4
_cache = {"at": 0.0, "snapshot": None}
_cache_lock = threading.Lock()


def cached_snapshot():
    with _cache_lock:
        now = time.time()
        if _cache["snapshot"] is None or now - _cache["at"] > MIN_REBUILD_SECONDS:
            _cache["snapshot"] = build_snapshot()
            _cache["at"] = now
        return _cache["snapshot"]


class Handler(BaseHTTPRequestHandler):
    server_version = "limen"

    def log_message(self, *args):
        pass  # the office is the output, not a request log

    def _send(self, status, body, content_type):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        path = self.path.split("?", 1)[0]

        if path == "/api/state":
            body = json.dumps(cached_snapshot()).encode("utf-8")
            self._send(200, body, "application/json")
            return

        relative = "index.html" if path == "/" else path.lstrip("/")
        target = os.path.normpath(os.path.join(WEB_ROOT, relative))
        if not target.startswith(WEB_ROOT) or not os.path.isfile(target):
            self._send(404, b"not found", "text/plain")
            return

        content_type = mimetypes.guess_type(target)[0] or "application/octet-stream"
        with open(target, "rb") as handle:
            self._send(200, handle.read(), content_type)


def main():
    parser = argparse.ArgumentParser(description="Watch your Claude sessions work.")
    parser.add_argument("--port", type=int, default=4173)
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--no-open", action="store_true")
    args = parser.parse_args()

    server = ThreadingHTTPServer((args.host, args.port), Handler)
    url = "http://{}:{}/".format(args.host, args.port)
    print("limen: office open at " + url)
    print("       ctrl-c to close up")

    if not args.no_open:
        threading.Timer(0.6, webbrowser.open, [url]).start()

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nlimen: lights off")
        server.server_close()


if __name__ == "__main__":
    main()
