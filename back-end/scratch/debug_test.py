import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django
django.setup()

from django.conf import settings
from django.core.mail import send_mail, get_connection

print("Settings backend:", settings.EMAIL_BACKEND)
conn = get_connection('django.core.mail.backends.locmem.EmailBackend')
print("Locmem conn:", conn)

from api.views import send_admin_otp_email
print("Imported send_admin_otp_email")

settings.EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'
print("Calling send_admin_otp_email...")
send_admin_otp_email("test@example.com", "123456")
print("Done send_admin_otp_email!")
