"""Dev server — serves frontend/src, proxies /api/*, hot-reloads on file changes."""

import http.server
import json
import os
import urllib.request
from pathlib import Path

os.chdir(os.path.join(os.path.dirname(__file__), "src"))

API_BACKEND = "http://localhost:8000"
SRC = Path(".")
WATCH_EXTS = {".html", ".css", ".js"}

RELOAD_SCRIPT = """<script>(function(){
  var t=0;
  setInterval(function(){
    fetch("/__reload").then(function(r){return r.json()}).then(function(d){
      if(t&&d.t>t) location.reload();
      t=d.t;
    }).catch(function(){});
  },500);
})()</script>"""


def latest_mtime():
    best = 0
    for f in SRC.rglob("*"):
        if f.suffix in WATCH_EXTS:
            try:
                mt = f.stat().st_mtime
                if mt > best:
                    best = mt
            except OSError:
                pass
    return best


class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        path = self.path.split("?")[0]

        if self.path.startswith("/api/"):
            self._proxy()
        elif path == "/__reload":
            self._reload_check()
        elif self.path == "/":
            self.send_response(302)
            self.send_header("Location", "/pages/Home/home.html")
            self.end_headers()
        elif path.endswith(".html"):
            self._serve_html(path)
        else:
            super().do_GET()

    def _reload_check(self):
        body = json.dumps({"t": latest_mtime()}).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Content-Length", len(body))
        self.end_headers()
        self.wfile.write(body)

    def _serve_html(self, path):
        fp = Path("." + path)
        if not fp.is_file():
            self.send_error(404, "File not found")
            return
        html = fp.read_text(encoding="utf-8")
        html = html.replace("</body>", RELOAD_SCRIPT + "\n</body>")
        body = html.encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", len(body))
        self.end_headers()
        self.wfile.write(body)

    def _proxy(self):
        url = f"{API_BACKEND}{self.path}"
        try:
            with urllib.request.urlopen(url) as resp:
                body = resp.read()
                self.send_response(resp.status)
                self.send_header("Content-Type", resp.headers.get("Content-Type", "application/json"))
                self.send_header("Content-Length", len(body))
                self.end_headers()
                self.wfile.write(body)
        except urllib.error.HTTPError as e:
            body = e.read()
            self.send_response(e.code)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", len(body))
            self.end_headers()
            self.wfile.write(body)
        except urllib.error.URLError:
            self.send_error(502, "Backend API unavailable")

    def log_message(self, format, *args):
        if "/__reload" not in str(args):
            super().log_message(format, *args)


print("Frontend: http://localhost:3000  (hot-reload enabled)")
print("API proxy: /api/* -> http://localhost:8000")
http.server.HTTPServer(("", 3000), Handler).serve_forever()
