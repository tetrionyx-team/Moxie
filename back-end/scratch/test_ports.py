import os
import sys
import socket
import smtplib
import ssl

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django
django.setup()
from django.conf import settings

hosts = ['smtp.gmail.com']
ports = [587, 465]

print("=== SOCKET CONNECTIVITY TEST ===")
for port in ports:
    for host in hosts:
        try:
            sock = socket.create_connection((host, port), timeout=5)
            print(f"[OK] Connected to {host}:{port} via {sock.getpeername()}")
            sock.close()
        except Exception as e:
            print(f"[FAIL] Could not connect to {host}:{port} - {type(e).__name__}: {e}")

print("\n=== SMTPLIB TEST (PORT 587 STARTTLS) ===")
try:
    server = smtplib.SMTP('smtp.gmail.com', 587, timeout=10)
    server.starttls()
    server.login(settings.EMAIL_HOST_USER, settings.EMAIL_HOST_PASSWORD)
    print("[OK] SMTP STARTTLS (587) login succeeded!")
    server.quit()
except Exception as e:
    print(f"[FAIL] SMTP STARTTLS (587) failed - {type(e).__name__}: {e}")

