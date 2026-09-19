import os
import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()

import unittest
from unittest.mock import patch
from datetime import timedelta
import importlib

from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIRequestFactory
from rest_framework import status

from services.email_service import (
    get_active_email_provider,
    send_admin_otp_email,
    mask_email,
)
import api.services.email_service as api_services_email
import api.email_service as api_email
from api.models import AdminLoginOTP, AdminProfile
from api.views import AdminApiLoginView, AdminVerifyOtpView, AdminResendOtpView


def get_test_session():
    engine = importlib.import_module(settings.SESSION_ENGINE)
    store = engine.SessionStore()
    store.create()
    return store


class ResendOtpFlowTestSuite(unittest.TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.User = get_user_model()
        self.test_username = 'test_resend_admin'
        self.test_email = 'admin_target@example.com'
        self.test_password = 'SecureTestPassword123!'

        # Clean existing test user if any
        self.User.objects.filter(username=self.test_username).delete()

        # Create staff admin user
        self.admin_user = self.User.objects.create_user(
            username=self.test_username,
            email=self.test_email,
            password=self.test_password,
            is_staff=True,
            is_superuser=True,
            is_active=True
        )
        AdminProfile.objects.create(user=self.admin_user, role='Super Admin')

    def tearDown(self):
        AdminLoginOTP.objects.filter(user=self.admin_user).delete()
        self.admin_user.delete()

    def test_email_service_imports_and_providers(self):
        """Verify module exports across all service import paths."""
        self.assertEqual(api_services_email.send_admin_otp_email, send_admin_otp_email)
        self.assertEqual(api_email.send_admin_otp_email, send_admin_otp_email)

        with patch.dict(os.environ, {'EMAIL_PROVIDER': 'resend'}):
            self.assertEqual(get_active_email_provider(), 'resend')

        with patch.dict(os.environ, {'EMAIL_PROVIDER': 'smtp'}):
            self.assertEqual(get_active_email_provider(), 'smtp')

    @patch('resend.Emails.send')
    def test_send_admin_otp_email_via_resend_sdk(self, mock_resend_send):
        """Verify Resend Python SDK is invoked with correct payload and headers."""
        mock_resend_send.return_value = {'id': 'resend_email_test_id_123'}

        with patch.dict(os.environ, {
            'EMAIL_PROVIDER': 'resend',
            'RESEND_API_KEY': 're_test_dummy_key',
            'RESEND_FROM_EMAIL': 'MOXIE <test-sender@domain.com>'
        }):
            sent = send_admin_otp_email(self.test_email, '654321')
            self.assertTrue(sent)
            mock_resend_send.assert_called_once()
            call_args = mock_resend_send.call_args[0][0]
            self.assertEqual(call_args['to'], [self.test_email])
            self.assertEqual(call_args['from'], 'MOXIE <test-sender@domain.com>')
            self.assertIn('654321', call_args['html'])
            self.assertIn('654321', call_args['text'])
            self.assertIn('MOXIE Admin Verification', call_args['subject'])

    @patch('resend.Emails.send')
    def test_full_login_otp_verification_flow(self, mock_resend_send):
        """Step 1: Login triggers OTP via Resend -> Step 2: Verify OTP -> Step 3: Authenticated."""
        mock_resend_send.return_value = {'id': 'resend_123'}

        with patch.dict(os.environ, {
            'EMAIL_PROVIDER': 'resend',
            'RESEND_API_KEY': 're_test_key',
            'RESEND_FROM_EMAIL': 'MOXIE <onboarding@resend.dev>'
        }):
            # Step 1: Login Request
            session = get_test_session()
            login_view = AdminApiLoginView.as_view()
            req = self.factory.post('/api/admin/auth/login/', {
                'identifier': self.test_username,
                'password': self.test_password
            }, format='json')
            req.session = session

            resp = login_view(req)
            self.assertEqual(resp.status_code, status.HTTP_200_OK)
            self.assertTrue(resp.data.get('otp_required'))
            self.assertEqual(resp.data.get('status'), 'pending_otp')
            self.assertIn('masked_email', resp.data)

            # Check DB OTP created
            otp_record = AdminLoginOTP.objects.filter(user=self.admin_user, used=False).first()
            self.assertIsNotNone(otp_record)
            self.assertEqual(otp_record.email, self.test_email)

            # Step 2: Failed verification with wrong OTP
            verify_view = AdminVerifyOtpView.as_view()
            verify_req = self.factory.post('/api/admin/auth/verify-otp/', {
                'otp': '000000'
            }, format='json')
            verify_req.session = session

            verify_resp = verify_view(verify_req)
            self.assertEqual(verify_resp.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertFalse(session.get('admin_2fa_verified', False))

            # Step 3: Successful verification with correct OTP
            call_args = mock_resend_send.call_args[0][0]
            import re
            otp_match = re.search(r'\b\d{6}\b', call_args['text'])
            self.assertIsNotNone(otp_match)
            actual_code = otp_match.group(0)

            verify_req_valid = self.factory.post('/api/admin/auth/verify-otp/', {
                'otp': actual_code
            }, format='json')
            verify_req_valid.session = session

            verify_resp_valid = verify_view(verify_req_valid)
            self.assertEqual(verify_resp_valid.status_code, status.HTTP_200_OK)
            self.assertTrue(verify_resp_valid.data.get('success'))
            self.assertTrue(session.get('admin_2fa_verified'))

            # Check OTP is marked used
            otp_record.refresh_from_db()
            self.assertTrue(otp_record.used)

    @patch('resend.Emails.send')
    def test_resend_failure_in_production_blocks_login(self, mock_resend_send):
        """When Resend HTTPS API raises an error, login is rejected and OTP deleted."""
        mock_resend_send.side_effect = RuntimeError("Resend API key is invalid or rate limited")

        with patch.dict(os.environ, {
            'EMAIL_PROVIDER': 'resend',
            'RESEND_API_KEY': 'invalid_key',
            'DEBUG': 'False'
        }):
            with patch.object(settings, 'DEBUG', False):
                session = get_test_session()
                login_view = AdminApiLoginView.as_view()
                req = self.factory.post('/api/admin/auth/login/', {
                    'identifier': self.test_username,
                    'password': self.test_password
                }, format='json')
                req.session = session

                resp = login_view(req)
                self.assertEqual(resp.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
                self.assertEqual(resp.data.get('error'), 'Unable to send verification email. Please try again.')

                # OTP record must not remain active
                otp_count = AdminLoginOTP.objects.filter(user=self.admin_user, used=False).count()
                self.assertEqual(otp_count, 0)
                self.assertNotIn('admin_pending_user_id', session)

    @patch('resend.Emails.send')
    def test_resend_cooldown_and_limit(self, mock_resend_send):
        """Verify 60-second cooldown is enforced on resend requests."""
        mock_resend_send.return_value = {'id': 'resend_123'}

        with patch.dict(os.environ, {
            'EMAIL_PROVIDER': 'resend',
            'RESEND_API_KEY': 're_test_key'
        }):
            session = get_test_session()
            login_view = AdminApiLoginView.as_view()
            req = self.factory.post('/api/admin/auth/login/', {
                'identifier': self.test_username,
                'password': self.test_password
            }, format='json')
            req.session = session
            login_view(req)

            # Immediate resend should trigger 429 Cooldown
            resend_view = AdminResendOtpView.as_view()
            resend_req = self.factory.post('/api/admin/auth/resend-otp/', {}, format='json')
            resend_req.session = session

            resend_resp = resend_view(resend_req)
            self.assertEqual(resend_resp.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
            self.assertIn('cooldown_remaining', resend_resp.data)

            # Move last_resend_at back 65 seconds
            otp_record = AdminLoginOTP.objects.filter(user=self.admin_user).order_by('-created_at').first()
            past = timezone.now() - timedelta(seconds=65)
            AdminLoginOTP.objects.filter(id=otp_record.id).update(created_at=past, last_resend_at=past)

            # Resend should now succeed
            resend_resp_ok = resend_view(resend_req)
            self.assertEqual(resend_resp_ok.status_code, status.HTTP_200_OK)
            self.assertEqual(resend_resp_ok.data.get('message'), 'New verification code sent.')


if __name__ == '__main__':
    suite = unittest.TestLoader().loadTestsFromTestCase(ResendOtpFlowTestSuite)
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    sys.exit(0 if result.wasSuccessful() else 1)
