#!/usr/bin/env python3
"""
AR Development Server with HTTPS support and correct 3D MIME types.
Supports:
- glTF (.gltf) -> model/gltf+json
- GLB (.glb) -> model/gltf-binary
- USDZ (.usdz) -> model/vnd.usdz+zip (crucial for iOS Quick Look)
- MindAR (.mind) -> application/octet-stream
- HDRI (.hdr) -> image/vnd.radiance
"""

import os
import sys
import ssl
import socket
import argparse
import datetime
from http.server import HTTPServer, SimpleHTTPRequestHandler

# Define custom MIME types for 3D & AR formats
MIME_TYPES = {
    '.glb': 'model/gltf-binary',
    '.gltf': 'model/gltf+json',
    '.usdz': 'model/vnd.usdz+zip',
    '.mind': 'application/octet-stream',
    '.hdr': 'image/vnd.radiance',
    '.webp': 'image/webp',
    '.wasm': 'application/wasm'
}

class ARRequestHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        # Enable CORS and SharedArrayBuffer headers for modern WebXR / TF.js
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type')
        super().end_headers()

    def copyfile(self, source, outputfile):
        try:
            super().copyfile(source, outputfile)
        except (ConnectionResetError, ConnectionAbortedError, BrokenPipeError, ssl.SSLError):
            pass

    def guess_type(self, path):
        ext = os.path.splitext(path)[1].lower()
        if ext in MIME_TYPES:
            return MIME_TYPES[ext]
        return super().guess_type(path)


def get_local_ip():
    """Finds the machine's local IP address on the current Wi-Fi/LAN."""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # Does not actually send data, just connects socket to route to gateway
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
    except Exception:
        ip = '127.0.0.1'
    finally:
        s.close()
    return ip


def generate_self_signed_cert(cert_file='cert.pem', key_file='key.pem', ip='127.0.0.1'):
    """Generates a self-signed SSL certificate using cryptography library."""
    try:
        from cryptography import x509
        from cryptography.x509.oid import NameOID
        from cryptography.hazmat.primitives import hashes
        from cryptography.hazmat.primitives.asymmetric import rsa
        from cryptography.hazmat.primitives import serialization
        import ipaddress

        key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        subject = issuer = x509.Name([
            x509.NameAttribute(NameOID.COMMON_NAME, "Local AR Dev Server"),
            x509.NameAttribute(NameOID.ORGANIZATION_NAME, "WebAR Lab"),
        ])

        san_list = [
            x509.DNSName("localhost"),
            x509.IPAddress(ipaddress.IPv4Address("127.0.0.1")),
        ]
        try:
            san_list.append(x509.IPAddress(ipaddress.IPv4Address(ip)))
        except Exception:
            pass

        cert = (
            x509.CertificateBuilder()
            .subject_name(subject)
            .issuer_name(issuer)
            .public_key(key.public_key())
            .serial_number(x509.random_serial_number())
            .not_valid_before(datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=1))
            .not_valid_after(datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=365))
            .add_extension(x509.SubjectAlternativeName(san_list), critical=False)
            .sign(key, hashes.SHA256())
        )

        with open(key_file, "wb") as f:
            f.write(key.private_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PrivateFormat.TraditionalOpenSSL,
                encryption_algorithm=serialization.NoEncryption(),
            ))

        with open(cert_file, "wb") as f:
            f.write(cert.public_bytes(serialization.Encoding.PEM))

        return True
    except Exception as e:
        print(f"[!] Warning: Could not generate self-signed certificate: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(description="WebAR Dev Server")
    parser.add_argument("--port", type=int, default=8000, help="Port to serve on (default: 8000)")
    parser.add_argument("--http", action="store_true", help="Serve over plain HTTP instead of HTTPS")
    args = parser.parse_args()

    local_ip = get_local_ip()
    use_https = not args.http

    cert_file = "cert.pem"
    key_file = "key.pem"

    if use_https:
        if not (os.path.exists(cert_file) and os.path.exists(key_file)):
            print("[*] Generating local SSL certificate for HTTPS...")
            generate_self_signed_cert(cert_file, key_file, local_ip)

        if not (os.path.exists(cert_file) and os.path.exists(key_file)):
            print("[!] Falling back to HTTP mode.")
            use_https = False

    protocol = "https" if use_https else "http"
    server_address = ("0.0.0.0", args.port)

    httpd = HTTPServer(server_address, ARRequestHandler)

    if use_https:
        ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        ctx.load_cert_chain(certfile=cert_file, keyfile=key_file)
        httpd.socket = ctx.wrap_socket(httpd.socket, server_side=True)

    print("\n" + "=" * 65)
    print("      [+] WebAR Development Server running!")
    print("=" * 65)
    print(f"  * Local machine:  {protocol}://localhost:{args.port}")
    print(f"  * Mobile Wi-Fi:   {protocol}://{local_ip}:{args.port}")
    print("=" * 65)
    if use_https:
        print("  [!] Mobile browser notice:")
        print("      Tap 'Advanced' -> 'Proceed to site (unsafe)'")
        print("      (because the SSL certificate is locally generated for development).")
    else:
        print("  [!] Note: For WebXR and camera, HTTPS or chrome://flags is required.")
    print("  Press Ctrl+C to stop.")
    print("=" * 65 + "\n")

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n[*] Сервер остановлен.")
        httpd.server_close()


if __name__ == "__main__":
    main()
