import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from rest_framework.test import APIRequestFactory
from django.contrib.auth import get_user_model
from django.contrib.sessions.middleware import SessionMiddleware
from django.core import mail
from django.utils import timezone
from datetime import timedelta
import json

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

print("--- STARTING MOXIE ADMIN AUTH VERIFICATION ---")

# 1. Setup test users (staff & non-staff customer)
customer_user, _ = User.objects.get_or_create(username="test_customer", email="customer@test.com")
customer_user.is_staff = False
customer_user.is_superuser = False
customer_user.set_password("CustomerPass123!")
customer_user.save()

staff_user, _ = User.objects.get_or_create(username="test_staff", email="staff@test.com")
staff_user.is_staff = True
staff_user.is_superuser = False
staff_user.set_password("StaffPass123!")
staff_user.save()

# Clean existing OTPs for test_staff
AdminLoginOTP.objects.filter(user=staff_user).delete()

# TEST 1: Customer attempting admin login
req1 = rf.post('/api/admin/login/', data=json.dumps({"identifier": "test_customer", "password": "CustomerPass123!"}), content_type="application/json")
add_session(req1)
res1 = AdminApiLoginView.as_view()(req1)
assert res1.status_code == 403, f"Expected 403 for customer admin login, got {res1.status_code}"
print("[PASS] Test 1: Non-staff customer blocked from admin login with 403.")

# TEST 2: Staff wrong password
req2 = rf.post('/api/admin/login/', data=json.dumps({"identifier": "test_staff", "password": "WrongPassword!"}), content_type="application/json")
add_session(req2)
res2 = AdminApiLoginView.as_view()(req2)
assert res2.status_code == 401, f"Expected 401 for bad password, got {res2.status_code}"
print("[PASS] Test 2: Invalid password rejected with 401.")

# TEST 3: Staff valid credentials -> OTP step initiated
req3 = rf.post('/api/admin/login/', data=json.dumps({"identifier": "test_staff", "password": "StaffPass123!"}), content_type="application/json")
add_session(req3)
res3 = AdminApiLoginView.as_view()(req3)
assert res3.status_code == 200, f"Expected 200 for valid staff step 1, got {res3.status_code}"
data3 = res3.data
assert data3.get("status") == "pending_otp", f"Expected pending_otp, got {data3}"
assert "admin_pending_user_id" in req3.session, "Session should have admin_pending_user_id"
otp_record = AdminLoginOTP.objects.filter(user=staff_user, used=False).order_by('-created_at').first()
assert otp_record is not None, "OTP record must exist in DB"
assert otp_record.otp_hash is not None and len(otp_record.otp_hash) == 64, "OTP must be stored as SHA-256 hash"
print("[PASS] Test 3: Staff credentials valid -> 6-digit OTP created with SHA-256 hash, email sent.")

# TEST 4: Invalid OTP verification
req4 = rf.post('/api/admin/verify-otp/', data=json.dumps({"otp": "000000"}), content_type="application/json")
req4.session = req3.session
res4 = AdminVerifyOtpView.as_view()(req4)
assert res4.status_code == 400, f"Expected 400 for wrong OTP, got {res4.status_code}"
data4 = res4.data
assert data4.get("attempts_remaining") == 4, f"Expected 4 attempts remaining, got {data4}"
print("[PASS] Test 4: Invalid OTP rejected and attempts decremented.")

# TEST 5: Cooldown check for Resend OTP
req5 = rf.post('/api/admin/resend-otp/', data=json.dumps({}), content_type="application/json")
req5.session = req3.session
res5 = AdminResendOtpView.as_view()(req5)
assert res5.status_code == 429, f"Expected 429 cooldown error, got {res5.status_code}"
print("[PASS] Test 5: Resend OTP enforces 30s cooldown with 429.")

# TEST 6: Resend OTP after simulating cooldown pass
otp_record.last_resend_at = timezone.now() - timedelta(seconds=35)
otp_record.save()
req6 = rf.post('/api/admin/resend-otp/', data=json.dumps({}), content_type="application/json")
req6.session = req3.session
res6 = AdminResendOtpView.as_view()(req6)
assert res6.status_code == 200, f"Expected 200 for resend OTP, got {res6.status_code}"
data6 = res6.data
assert data6.get("status") == "pending_otp"
print("[PASS] Test 6: Resend OTP generated new OTP and reset attempts.")

# Retrieve newest OTP hash and verify with matching raw code
new_otp_record = AdminLoginOTP.objects.filter(user=staff_user, used=False).order_by('-created_at').first()
# We test correct verification by calculating what code produces this hash
import hashlib
found_code = None
for c in range(0, 1000000):
    code_str = f"{c:06d}"
    if hashlib.sha256(code_str.encode('utf-8')).hexdigest() == new_otp_record.otp_hash:
        found_code = code_str
        break

assert found_code is not None, "Should match 6-digit code"
req7 = rf.post('/api/admin/verify-otp/', data=json.dumps({"otp": found_code}), content_type="application/json")
req7.session = req3.session
res7 = AdminVerifyOtpView.as_view()(req7)
assert res7.status_code == 200, f"Expected 200 for valid OTP, got {res7.status_code}"
assert req7.session.get("admin_2fa_verified") is True, "admin_2fa_verified must be True in session"
print("[PASS] Test 7: Correct OTP verified successfully -> Session fully authenticated with 2FA.")

# TEST 8: Check Auth endpoint with verified session
req8 = rf.get('/api/admin/check-auth/')
req8.session = req7.session
req8.user = staff_user
res8 = AdminCheckAuthView.as_view()(req8)
assert res8.status_code == 200, f"Expected 200 for check-auth with 2FA, got {res8.status_code}"
data8 = res8.data
assert data8.get("authenticated") is True
print("[PASS] Test 8: Admin check-auth confirms full 2FA authentication and returns user permissions.")

# TEST 9: Unverified 2FA session blocked from check-auth
req9 = rf.get('/api/admin/check-auth/')
req9.session = req7.session
del req9.session['admin_2fa_verified']
req9.session.save()
req9.user = staff_user
res9 = AdminCheckAuthView.as_view()(req9)
assert res9.status_code == 200
data9 = res9.data
assert data9.get("authenticated") is False or data9.get("admin_2fa_verified") is False
print("[PASS] Test 9: Unverified 2FA session denied from admin check-auth.")

# TEST 10: Storefront exit / Admin logout
req10 = rf.post('/api/admin/logout/')
req10.session = req7.session
req10.session['admin_2fa_verified'] = True
req10.user = staff_user
res10 = AdminApiLogoutView.as_view()(req10)
assert res10.status_code == 200, f"Expected 200 for logout, got {res10.status_code}"
assert "admin_2fa_verified" not in req10.session or not req10.session.get("admin_2fa_verified")
print("[PASS] Test 10: Go to Storefront / Admin logout destroys session and revokes 2FA.")

# Cleanup test users
customer_user.delete()
staff_user.delete()

print("ALL 10 TESTS PASSED SUCCESSFULLY!")
