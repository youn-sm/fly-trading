"""Serve web/ locally with caching off, so edits show up on a plain reload."""
import functools
import http.server
import sys
from pathlib import Path


class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    web = Path(__file__).resolve().parent.parent / "web"
    handler = functools.partial(NoCache, directory=str(web))
    print(f"http://localhost:{port}")
    http.server.ThreadingHTTPServer(("", port), handler).serve_forever()
