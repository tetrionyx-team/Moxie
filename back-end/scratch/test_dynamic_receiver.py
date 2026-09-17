import os
import sys
import json

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ['EMAIL_BACKEND'] = 'django.core.mail.backends.locmem.EmailBackend'
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django
django.setup()

from django.conf import settings
settings.EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'

from django.contrib.auth import get_user_model
from django.contrib.sessions.middleware import SessionMiddleware
from django.core import mail
from rest_framework.test import APIRequestFactory

from api.models import AdminLoginOTP
from api.views import AdminApiLoginView, AdminVerifyOtpView

User = get_user_model()
rf = APIRequestFactory()

def add_session(request):
    middleware = SessionMiddleware(lambda req: None)
    middleware.process_request(request)
    request.session.save()
    return request

print("==================================================")
print("TESTING DYNAMIC ADMIN EMAIL RECEIVER ARCHITECTURE")
print("==================================================")

# Setup 2 separate admin accounts with different emails
admin_a, _ = User.objects.get_or_create(username="admin_siva")
admin_a.email = "sivamurugan04012004@gmail.com"
admin_a.set_password("Siva@2004")
admin_a.is_staff = True
admin_a.is_superuser = True
admin_a.save()

admin_b, _ = User.objects.get_or_create(username="admin_harish")
admin_b.email = "harish_test@example.com"
admin_b.set_password("Harish@2026")
admin_b.is_staff = True
admin_b.is_superuser = True
admin_b.save()

try:
    # -------------------------------------------------------------
    # TEST 1: Admin A Login -> Email received at sivamurugan04012004@gmail.com
    # -------------------------------------------------------------
    req_a = rf.post('/api/admin/login/', data=json.dumps({
        "username": "admin_siva",
        "password": "Siva@2004"
    }), content_type="application/json")
    add_session(req_a)
    res_a = AdminApiLoginView.as_view()(req_a)
    
    assert res_a.status_code == 200, f"Test 1 Failed: {res_a.data}"
    assert res_a.data.get("otp_required") is True
    assert len(mail.outbox) == 1, "Email was not sent to outbox"
    email_a = mail.outbox[-1]
    assert "sivamurugan04012004@gmail.com" in email_a.to, f"Test 1 Failed: Expected to sivamurugan04012004@gmail.com, got {email_a.to}"
    assert email_a.from_email == settings.DEFAULT_FROM_EMAIL == "MOXIE <tetrionyx@gmail.com>", f"Expected from MOXIE <tetrionyx@gmail.com>, got {email_a.from_email}"
    print(f"[PASS] TEST 1: Admin A ('admin_siva') OTP sent dynamically to: {email_a.to} (FROM: {email_a.from_email})")

    # -------------------------------------------------------------
    # TEST 2: Admin B Login -> Email received at harish_test@example.com
    # -------------------------------------------------------------
    mail.outbox.clear()
    req_b = rf.post('/api/admin/login/', data=json.dumps({
        "username": "admin_harish",
        "password": "Harish@2026"
    }), content_type="application/json")
    add_session(req_b)
    res_b = AdminApiLoginView.as_view()(req_b)
    
    assert res_b.status_code == 200, f"Test 2 Failed: {res_b.data}"
    assert res_b.data.get("otp_required") is True
    assert len(mail.outbox) == 1, "Email was not sent to outbox"
    email_b = mail.outbox[-1]
    assert "harish_test@example.com" in email_b.to, f"Test 2 Failed: Expected to harish_test@example.com, got {email_b.to}"
    assert email_b.from_email == settings.DEFAULT_FROM_EMAIL == "MOXIE <tetrionyx@gmail.com>", f"Expected from MOXIE <tetrionyx@gmail.com>, got {email_b.from_email}"
    print(f"[PASS] TEST 2: Admin B ('admin_harish') OTP sent dynamically to: {email_b.to} (FROM: {email_b.from_email})")

    # -------------------------------------------------------------
    # TEST 3: Email changed dynamically in DB -> Next login uses new email
    # -------------------------------------------------------------
    admin_a.email = "sivamurugan_new@example.com"
    admin_a.save()
    
    mail.outbox.clear()
    req_a2 = rf.post('/api/admin/login/', data=json.dumps({
        "username": "admin_siva",
        "password": "Siva@2004"
    }), content_type="application/json")
    add_session(req_a2)
    res_a2 = AdminApiLoginView.as_view()(req_a2)
    
    assert res_a2.status_code == 200, f"Test 3 Failed: {res_a2.data}"
    assert len(mail.outbox) == 1
    email_a2 = mail.outbox[-1]
    assert "sivamurugan_new@example.com" in email_a2.to, f"Test 3 Failed: Expected to new email, got {email_a2.to}"
    print(f"[PASS] TEST 3: When Admin email changes in DB, OTP automatically goes to new email: {email_a2.to}")

finally:
    admin_a.delete()
    admin_b.delete()

print("==================================================")
print("ALL DYNAMIC EMAIL TESTS PASSED 100%!")
print("==================================================")
