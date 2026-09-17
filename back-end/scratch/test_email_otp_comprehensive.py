import os
import sys
import re
import hashlib
import json
from datetime import timedelta

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
from django.utils import timezone
from rest_framework.test import APIRequestFactory

from api.models import AdminLoginOTP
from api.views import (
    AdminApiLoginView,
    AdminVerifyOtpView,
    AdminResendOtpView,
    AdminCheckAuthView,
    AdminApiLogoutView
)

User = get_user_model()
rf = APIRequestFactory()

def add_session(request):
    middleware = SessionMiddleware(lambda req: None)
    middleware.process_request(request)
    request.session.save()
    return request

print("=" * 60)
print("RUNNING MOXIE ADMIN LOCAL EMAIL OTP TEST SUITE")
print("=" * 60)

# Clean up previous test users if any
User.objects.filter(username__in=["test_admin_user", "test_no_email_admin", "test_customer_user"]).delete()

admin_user = User.objects.create_user(
    username="test_admin_user",
    email="actual_admin_email@example.com",
    password="ValidAdminPassword123!"
)
admin_user.is_staff = True
admin_user.is_superuser = True
admin_user.save()

no_email_admin = User.objects.create_user(
    username="test_no_email_admin",
    email="",
    password="NoEmailAdminPass123!"
)
no_email_admin.is_staff = True
no_email_admin.save()

customer_user = User.objects.create_user(
    username="test_customer_user",
    email="customer@example.com",
    password="CustomerPass123!"
)
customer_user.is_staff = False
customer_user.save()

try:
    # -------------------------------------------------------------
    # TEST 1: Correct admin username + password
    # -------------------------------------------------------------
    req1 = rf.post('/api/admin/login/', data=json.dumps({
        "username": "test_admin_user",
        "password": "ValidAdminPassword123!"
    }), content_type="application/json")
    add_session(req1)
    res1 = AdminApiLoginView.as_view()(req1)
    
    assert res1.status_code == 200, f"Test 1 Failed: Expected 200, got {res1.status_code}"
    assert res1.data.get("otp_required") is True, "Test 1 Failed: otp_required should be True"
    assert res1.data.get("status") == "pending_otp", "Test 1 Failed: status should be pending_otp"
    assert res1.data.get("masked_email") is not None, "Test 1 Failed: masked_email missing"
    assert "otp" not in res1.data, "Test 1 Security Failed: OTP plaintext must NOT be in response"
    print("[PASS] TEST 1: Correct admin credentials initiates OTP challenge without authenticating dashboard.")

    # -------------------------------------------------------------
    # TEST 2: Check registered admin email received verification email
    # -------------------------------------------------------------
    assert len(mail.outbox) >= 1, "Test 2 Failed: No email found in outbox"
    sent_mail = mail.outbox[-1]
    assert sent_mail.subject == "Your MOXIE Admin verification code", f"Test 2 Failed: Unexpected subject {sent_mail.subject}"
    assert "actual_admin_email@example.com" in sent_mail.to, f"Test 2 Failed: Expected recipient actual_admin_email@example.com, got {sent_mail.to}"
    print("[PASS] TEST 2: Email sent to registered admin email with subject 'Your MOXIE Admin verification code'.")

    # -------------------------------------------------------------
    # TEST 3: Enter correct OTP within 5 minutes -> Admin authenticated
    # -------------------------------------------------------------
    otp_obj = AdminLoginOTP.objects.filter(user=admin_user, used=False).first()
    assert otp_obj is not None, "Test 3 Failed: No active OTP object found in DB"
    
    # Extract code from sent email body
    code_match = re.search(r'\b\d{6}\b', sent_mail.body)
    assert code_match is not None, "Test 3 Failed: Could not find 6-digit code in email body"
    correct_code = code_match.group(0)
    assert len(correct_code) == 6, f"Test 3 Failed: Code length is not 6 ({correct_code})"

    req3 = rf.post('/api/admin/verify-otp/', data=json.dumps({
        "otp": correct_code
    }), content_type="application/json")
    req3.session = req1.session
    res3 = AdminVerifyOtpView.as_view()(req3)
    
    assert res3.status_code == 200, f"Test 3 Failed: Expected 200, got {res3.status_code}"
    assert res3.data.get("success") is True, "Test 3 Failed: Expected success True"
    assert req3.session.get("admin_2fa_verified") is True, "Test 3 Failed: admin_2fa_verified not set"
    print("[PASS] TEST 3: Correct 6-digit OTP completes authentication and opens session.")

    # -------------------------------------------------------------
    # TEST 4: Wrong OTP -> Invalid code & attempt count increments
    # -------------------------------------------------------------
    # Request a new OTP
    req4_login = rf.post('/api/admin/login/', data=json.dumps({
        "username": "test_admin_user",
        "password": "ValidAdminPassword123!"
    }), content_type="application/json")
    add_session(req4_login)
    res4_login = AdminApiLoginView.as_view()(req4_login)
    assert res4_login.status_code == 200
    
    req4_verify = rf.post('/api/admin/verify-otp/', data=json.dumps({
        "otp": "999999"
    }), content_type="application/json")
    req4_verify.session = req4_login.session
    res4_verify = AdminVerifyOtpView.as_view()(req4_verify)
    assert res4_verify.status_code == 400, f"Test 4 Failed: Expected 400, got {res4_verify.status_code}"
    assert res4_verify.data.get("attempts_remaining") == 4, f"Test 4 Failed: Expected 4 attempts remaining, got {res4_verify.data}"
    print("[PASS] TEST 4: Wrong OTP rejected and remaining attempts decremented to 4.")

    # -------------------------------------------------------------
    # TEST 5: Enter OTP after 5 minutes (Expired OTP)
    # -------------------------------------------------------------
    otp_record_5 = AdminLoginOTP.objects.filter(user=admin_user, used=False).first()
    otp_record_5.expires_at = timezone.now() - timedelta(seconds=10)
    otp_record_5.save()
    
    req5 = rf.post('/api/admin/verify-otp/', data=json.dumps({
        "otp": "123456"
    }), content_type="application/json")
    req5.session = req4_login.session
    res5 = AdminVerifyOtpView.as_view()(req5)
    assert res5.status_code == 400, f"Test 5 Failed: Expected 400 for expired OTP, got {res5.status_code}"
    assert "expired" in res5.data.get("error", "").lower(), f"Test 5 Failed: Error message should mention expired: {res5.data}"
    print("[PASS] TEST 5: Expired OTP rejected properly.")

    # -------------------------------------------------------------
    # TEST 6: Resend OTP (Cooldown & Invalidate old OTP)
    # -------------------------------------------------------------
    # 6a. Try resend immediately (should be rate-limited by 60s cooldown)
    req6_cd = rf.post('/api/admin/resend-otp/', data=json.dumps({}), content_type="application/json")
    req6_cd.session = req4_login.session
    res6_cd = AdminResendOtpView.as_view()(req6_cd)
    assert res6_cd.status_code == 429, f"Test 6a Failed: Expected 429 for cooldown, got {res6_cd.status_code}"
    
    # 6b. Simulate cooldown passed
    past_time = timezone.now() - timedelta(seconds=65)
    AdminLoginOTP.objects.filter(user=admin_user).update(last_resend_at=past_time, created_at=past_time)
    
    req6_resend = rf.post('/api/admin/resend-otp/', data=json.dumps({}), content_type="application/json")
    req6_resend.session = req4_login.session
    res6_resend = AdminResendOtpView.as_view()(req6_resend)
    assert res6_resend.status_code == 200, f"Test 6b Failed: Expected 200, got {res6_resend.status_code}"
    assert res6_resend.data.get("resend_cooldown_seconds") == 60, "Test 6b Failed: Cooldown should be 60s"
    print("[PASS] TEST 6: Resend OTP enforces 60s cooldown and generates fresh OTP.")

    # -------------------------------------------------------------
    # TEST 7: Single-use OTP -> Try same OTP twice
    # -------------------------------------------------------------
    resend_mail = mail.outbox[-1]
    code_7 = re.search(r'\b\d{6}\b', resend_mail.body).group(0)
            
    # First use -> Success
    req7_1 = rf.post('/api/admin/verify-otp/', data=json.dumps({"otp": code_7}), content_type="application/json")
    req7_1.session = req4_login.session
    res7_1 = AdminVerifyOtpView.as_view()(req7_1)
    assert res7_1.status_code == 200, f"Test 7 First Use Failed: {res7_1.data}"
    
    # Second use -> Rejected
    req7_2 = rf.post('/api/admin/verify-otp/', data=json.dumps({"otp": code_7}), content_type="application/json")
    req7_2.session = req4_login.session
    res7_2 = AdminVerifyOtpView.as_view()(req7_2)
    assert res7_2.status_code in (400, 401), f"Test 7 Second Use Failed: Expected 400 or 401, got {res7_2.status_code}"
    print("[PASS] TEST 7: OTP cannot be reused twice (strictly single-use).")

    # -------------------------------------------------------------
    # TEST 8: Wrong admin password
    # -------------------------------------------------------------
    outbox_count_before = len(mail.outbox)
    req8 = rf.post('/api/admin/login/', data=json.dumps({
        "username": "test_admin_user",
        "password": "IncorrectPassword!"
    }), content_type="application/json")
    add_session(req8)
    res8 = AdminApiLoginView.as_view()(req8)
    assert res8.status_code == 401, f"Test 8 Failed: Expected 401, got {res8.status_code}"
    assert len(mail.outbox) == outbox_count_before, "Test 8 Failed: No email should be sent for wrong password"
    assert res8.data.get("error") == "Invalid admin credentials.", f"Test 8 Failed: Expected 'Invalid admin credentials.', got {res8.data}"
    print("[PASS] TEST 8: Wrong password rejected with 401 and no OTP email sent.")

    # -------------------------------------------------------------
    # TEST 9: Staff account without email
    # -------------------------------------------------------------
    req9 = rf.post('/api/admin/login/', data=json.dumps({
        "username": "test_no_email_admin",
        "password": "NoEmailAdminPass123!"
    }), content_type="application/json")
    add_session(req9)
    res9 = AdminApiLoginView.as_view()(req9)
    assert res9.status_code == 400, f"Test 9 Failed: Expected 400, got {res9.status_code}"
    assert "registered email address" in res9.data.get("error", ""), f"Test 9 Failed: {res9.data}"
    print("[PASS] TEST 9: Staff without email returns clear missing-email message without crashing.")

    # -------------------------------------------------------------
    # TEST 10: Customer account attempting admin login
    # -------------------------------------------------------------
    req10 = rf.post('/api/admin/login/', data=json.dumps({
        "username": "test_customer_user",
        "password": "CustomerPass123!"
    }), content_type="application/json")
    add_session(req10)
    res10 = AdminApiLoginView.as_view()(req10)
    assert res10.status_code == 401, f"Test 10 Failed: Expected 401, got {res10.status_code}"
    print("[PASS] TEST 10: Customer / non-staff account blocked from admin authentication.")

finally:
    # Cleanup
    User.objects.filter(username__in=["test_admin_user", "test_no_email_admin", "test_customer_user"]).delete()

print("=" * 60)
print("ALL 10 VERIFICATION TESTS PASSED PERFECTLY!")
print("=" * 60)
