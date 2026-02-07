"""Minimal dev server that serves frontend/src with home.html as the index.
Proxies /api/* requests to the backend on port 8000."""

import http.server
import os
import urllib.request

os.chdir(os.path.join(os.path.dirname(__file__), "src"))

API_BACKEND = "http://localhost:8000"


class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path.startswith("/api/"):
            self._proxy()
        elif self.path == "/":
            self.path = "/pages/Home/home.html"
            super().do_GET()
        else:
            super().do_GET()

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


print("Frontend: http://localhost:3000")
print("API proxy: /api/* -> http://localhost:8000")
http.server.HTTPServer(("", 3000), Handler).serve_forever()
