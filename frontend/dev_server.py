"""Dev server — serves frontend/src, proxies /api/*, hot-reloads on file changes."""

import http.server
import json
import os
import socket
import urllib.request
import webbrowser
from pathlib import Path

os.chdir(os.path.join(os.path.dirname(__file__), "src"))

API_BACKEND = "http://localhost:8000"
SRC = Path(".")
WATCH_EXTS = {".html", ".css", ".js"}

RELOAD_SCRIPT = """<script>(function(){
  var t=0,css=0;
  setInterval(function(){
    fetch("/__reload").then(function(r){return r.json()}).then(function(d){
      if(!t){t=d.t;css=d.css;return}
      if(d.t>t){
        if(d.css>css&&d.t===d.css){
          document.querySelectorAll('link[rel="stylesheet"]').forEach(function(l){
            l.href=l.href.split("?")[0]+"?r="+d.css;
          });
          t=d.t;css=d.css;
        }else{location.reload()}
      }
    }).catch(function(){});
  },500);
})()</script>"""


def latest_mtime():
    best = 0
    best_css = 0
    for f in SRC.rglob("*"):
        if f.suffix in WATCH_EXTS:
            try:
                mt = f.stat().st_mtime
                if mt > best:
                    best = mt
                if f.suffix == ".css" and mt > best_css:
                    best_css = mt
            except OSError:
                pass
    return best, best_css


def find_port(start=3000):
    for port in range(start, start + 20):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(("", port))
                return port
            except OSError:
                continue
    return start


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

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
        t, css = latest_mtime()
        body = json.dumps({"t": t, "css": css}).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
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


port = find_port(3000)
url = f"http://localhost:{port}"
print(f"Frontend: {url}  (hot-reload enabled)")
print(f"API proxy: /api/* -> {API_BACKEND}")
webbrowser.open(url)
http.server.HTTPServer(("", port), Handler).serve_forever()
