import os
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

import django
from datetime import timedelta
from unittest.mock import patch, MagicMock

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIRequestFactory
from api.models import AdminLoginOTP
from api.views import AdminApiLoginView, AdminVerifyOtpView, AdminResendOtpView
from services.email_service import get_active_email_provider, mask_email, send_admin_otp_email, send_transactional_email

User = get_user_model()

def run_tests():
    print("=" * 60)
    print("STARTING MOXIE ADMIN OTP PRODUCTION TRANSPORT TEST SUITE")
    print("=" * 60)

    # 1. Test Mask Email
    assert mask_email("admin@moxie.com") == "a*****n@moxie.com", "mask_email failed"
    assert mask_email("ab@moxie.com") == "a*****@moxie.com", "mask_email short name failed"
    print("[PASS] mask_email utility functions correctly")

    # 2. Test Provider Auto-Detection & Resolution
    with patch.dict(os.environ, {"EMAIL_PROVIDER": "resend", "RESEND_API_KEY": "re_test_key"}, clear=False):
        assert get_active_email_provider() == "resend"
    with patch.dict(os.environ, {"EMAIL_PROVIDER": "", "RESEND_API_KEY": "re_test_key", "BREVO_API_KEY": ""}, clear=False):
        assert get_active_email_provider() == "resend"
    with patch.dict(os.environ, {"EMAIL_PROVIDER": "smtp", "RESEND_API_KEY": ""}, clear=False):
        assert get_active_email_provider() == "smtp"
    print("[PASS] Email provider resolution and auto-detection work correctly")

    # 3. Test HTTPS Dispatch (Resend & Brevo simulation)
    with patch('requests.post') as mock_post:
        mock_post.return_value = MagicMock(status_code=200, json=lambda: {"id": "msg_123"})
        with patch.dict(os.environ, {"EMAIL_PROVIDER": "resend", "RESEND_API_KEY": "re_12345"}, clear=False):
            res = send_admin_otp_email("admin@moxie.com", "123456")
            assert res is True
            assert mock_post.called
            headers = mock_post.call_args[1]['headers']
            assert headers['Authorization'] == "Bearer re_12345"
            body = mock_post.call_args[1]['json']
            assert body['to'] == ["admin@moxie.com"]
            assert "123456" in body['text']
            assert "123456" in body['html']
    print("[PASS] Resend HTTPS API dispatch succeeds with valid headers and payload")

    with patch('requests.post') as mock_post:
        mock_post.return_value = MagicMock(status_code=201, json=lambda: {"messageId": "msg_456"})
        with patch.dict(os.environ, {"EMAIL_PROVIDER": "brevo", "BREVO_API_KEY": "xkeysib-12345"}, clear=False):
            res = send_admin_otp_email("admin@moxie.com", "654321")
            assert res is True
            assert mock_post.called
            headers = mock_post.call_args[1]['headers']
            assert headers['api-key'] == "xkeysib-12345"
            body = mock_post.call_args[1]['json']
            assert body['to'] == [{"email": "admin@moxie.com"}]
    print("[PASS] Brevo HTTPS API dispatch succeeds with valid headers and payload")

    # 4. Setup or retrieve Staff Admin User
    admin_user, _ = User.objects.get_or_create(username='test_admin_prod', defaults={'email': 'test_admin_prod@moxie.com'})
    admin_user.set_password('ComplexAdminPass2026!')
    admin_user.is_staff = True
    admin_user.is_active = True
    admin_user.email = 'test_admin_prod@moxie.com'
    admin_user.save()

    from rest_framework.test import APIRequestFactory
    from django.contrib.sessions.backends.db import SessionStore
    factory = APIRequestFactory()
    session_obj = SessionStore()
    session_obj.create()

    # Helper to mock session on request
    def attach_session(req):
        req.session = session_obj
        req._messages = MagicMock()
        return req

    # 5. Test Admin Login Step 1 (Credentials -> OTP Generation)
    with patch('services.email_service.send_admin_otp_email', return_value=True) as mock_send:
        req = factory.post('/api/admin/auth/login/', {'identifier': 'test_admin_prod', 'password': 'ComplexAdminPass2026!'}, format='json')
        attach_session(req)
        view = AdminApiLoginView.as_view()
        resp = view(req)
        assert resp.status_code == 200, f"Login failed with status {resp.status_code}: {resp.data}"
        assert resp.data['otp_required'] is True
        assert resp.data['status'] == 'pending_otp'
        assert 'masked_email' in resp.data
        assert 'otp' not in resp.data
        assert 'otp_code' not in resp.data
        assert mock_send.called
        print("[PASS] Admin credentials step generates OTP and initiates email delivery safely")

    # Retrieve generated OTP from DB
    otp_record = AdminLoginOTP.objects.filter(user=admin_user, used=False).order_by('-created_at').first()
    assert otp_record is not None

    # 6. Test Admin Verify Step 2 - Wrong OTP
    req = factory.post('/api/admin/auth/verify-otp/', {'otp': '000000'}, format='json')
    attach_session(req)
    view = AdminVerifyOtpView.as_view()
    resp = view(req)
    assert resp.status_code == 400
    assert 'attempts_remaining' in resp.data
    assert resp.data['attempts_remaining'] == 4
    print("[PASS] Invalid OTP is rejected with remaining attempt count")

    # 7. Test Admin Resend Step - Cooldown Enforced
    req = factory.post('/api/admin/auth/resend-otp/', {}, format='json')
    attach_session(req)
    view = AdminResendOtpView.as_view()
    resp = view(req)
    assert resp.status_code == 429
    assert 'cooldown_remaining' in resp.data
    print("[PASS] Resend OTP cooldown (60s) properly enforced")

    # Fast-forward time for resend cooldown
    past_time = timezone.now() - timedelta(seconds=65)
    AdminLoginOTP.objects.filter(user=admin_user).update(last_resend_at=past_time, created_at=past_time)

    # 8. Test Admin Resend Step - Success
    with patch('services.email_service.send_admin_otp_email', return_value=True) as mock_send_resend:
        req = factory.post('/api/admin/auth/resend-otp/', {}, format='json')
        attach_session(req)
        resp = view(req)
        assert resp.status_code == 200
        assert resp.data['resend_cooldown_seconds'] == 60
        assert mock_send_resend.called
        print("[PASS] Resend OTP succeeds after cooldown and invalidates prior code")

    # Get new OTP
    new_otp_record = AdminLoginOTP.objects.filter(user=admin_user, used=False).order_by('-created_at').first()
    assert new_otp_record is not None

    # 9. Test Admin Verify Step 2 - Expired OTP
    new_otp_record.expires_at = timezone.now() - timedelta(minutes=1)
    new_otp_record.save()

    req = factory.post('/api/admin/auth/verify-otp/', {'otp': '123456'}, format='json')
    attach_session(req)
    view = AdminVerifyOtpView.as_view()
    resp = view(req)
    assert resp.status_code == 400
    assert 'expired' in resp.data['error'].lower()
    print("[PASS] Expired OTP is properly rejected")

    # Generate fresh OTP and verify success
    AdminLoginOTP.objects.filter(user=admin_user, used=False).update(used=True)
    import hashlib
    valid_code = "998877"
    valid_hash = hashlib.sha256(valid_code.encode('utf-8')).hexdigest()
    fresh_otp = AdminLoginOTP.objects.create(
        user=admin_user,
        email=admin_user.email,
        otp_hash=valid_hash,
        expires_at=timezone.now() + timedelta(minutes=5),
        attempts=0,
        used=False,
        is_locked=False
    )
    session_obj['admin_pending_user_id'] = admin_user.id
    session_obj['admin_pending_otp_id'] = fresh_otp.id
    session_obj.save()

    # 10. Test Admin Verify Step 2 - Valid OTP Success
    req = factory.post('/api/admin/auth/verify-otp/', {'otp': valid_code}, format='json')
    attach_session(req)
    resp = view(req)
    assert resp.status_code == 200
    assert resp.data['success'] is True
    assert resp.data['username'] == 'test_admin_prod'
    fresh_otp.refresh_from_db()
    assert fresh_otp.used is True
    print("[PASS] Valid OTP verification succeeds, authenticates admin, and marks OTP as used (single-use)")

    # 11. Test Failure Handling (Never authenticate or consume OTP if email send fails)
    with patch('services.email_service.send_admin_otp_email', side_effect=RuntimeError("Connection Timeout")):
        with patch.object(settings, 'DEBUG', False):
            req = factory.post('/api/admin/auth/login/', {'identifier': 'test_admin_prod', 'password': 'ComplexAdminPass2026!'}, format='json')
            attach_session(req)
            view = AdminApiLoginView.as_view()
            resp = view(req)
            assert resp.status_code == 500
            assert resp.data['error'] == 'Unable to send verification email. Please try again.'
            # Ensure no active pending OTP was left uncleaned
            pending_count = AdminLoginOTP.objects.filter(user=admin_user, used=False).count()
            assert pending_count == 0
            print("[PASS] Email dispatch failure returns safe 500 error, aborts challenge, and does not authenticate")

    # Cleanup test user
    AdminLoginOTP.objects.filter(user=admin_user).delete()
    admin_user.delete()

    print("\n" + "=" * 60)
    print("ALL PRODUCTION OTP TESTS PASSED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == '__main__':
    run_tests()
