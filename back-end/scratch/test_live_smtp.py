import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django
django.setup()

from django.conf import settings
from django.core.mail import send_mail

print("Testing Gmail SMTP connection...")
print(f"EMAIL_HOST: {settings.EMAIL_HOST}")
print(f"EMAIL_PORT: {settings.EMAIL_PORT}")
print(f"EMAIL_USE_TLS: {settings.EMAIL_USE_TLS}")
print(f"EMAIL_HOST_USER: {settings.EMAIL_HOST_USER}")
print(f"DEFAULT_FROM_EMAIL: {settings.DEFAULT_FROM_EMAIL}")
print(f"Password configured: {'YES (length ' + str(len(settings.EMAIL_HOST_PASSWORD)) + ')' if settings.EMAIL_HOST_PASSWORD else 'NO'}")

try:
    result = send_mail(
        subject="MOXIE Email Test",
        message="MOXIE Gmail SMTP is working successfully with your Google App Password.",
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[settings.EMAIL_HOST_USER],
        fail_silently=False,
    )
    print(f"SUCCESS! send_mail return code: {result}")
except Exception as e:
    print(f"FAILED! Error type: {type(e).__name__}, Message: {e}")
