from http.server import BaseHTTPRequestHandler, HTTPServer
import json
class H(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path in ("/api/tags", "/api/models"):
            resp = {"models": [{"name":"dummy:latest","size":123,"modified_at":"1970-01-01T00:00:00Z"}], "provider": "ollama"}
            self.send_response(200); self.send_header("Content-Type","application/json"); self.end_headers()
            self.wfile.write(json.dumps(resp).encode()); return
        if self.path in ("/", "/health"):
            self.send_response(200); self.send_header("Content-Type","application/json"); self.end_headers()
            self.wfile.write(b'{"ok":true}'); return
        self.send_response(404); self.end_headers()
    def log_message(self, *args, **kwargs): return
if __name__ == "__main__":
    HTTPServer(("127.0.0.1", 11434), H).serve_forever()
