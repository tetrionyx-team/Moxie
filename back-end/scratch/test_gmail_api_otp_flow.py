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
from unittest.mock import patch, MagicMock
from datetime import timedelta
import importlib
import base64
import email
from email import policy

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


class GmailApiOtpFlowTestSuite(unittest.TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.User = get_user_model()
        self.test_username = 'test_gmail_admin'
        self.test_email = 'moxie_admin_target@gmail.com'
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

    def test_provider_resolution(self):
        """Verify EMAIL_PROVIDER values are correctly resolved."""
        with patch.dict(os.environ, {'EMAIL_PROVIDER': 'gmail_api'}):
            self.assertEqual(get_active_email_provider(), 'gmail_api')

        with patch.dict(os.environ, {'EMAIL_PROVIDER': 'smtp'}):
            self.assertEqual(get_active_email_provider(), 'smtp')

        with patch.dict(os.environ, {'EMAIL_PROVIDER': 'resend'}):
            self.assertEqual(get_active_email_provider(), 'resend')

        with patch.dict(os.environ, {'EMAIL_PROVIDER': '', 'GMAIL_REFRESH_TOKEN': 'test_token'}):
            self.assertEqual(get_active_email_provider(), 'gmail_api')

    @patch('google.oauth2.credentials.Credentials.refresh')
    @patch('services.email_service.build')
    def test_send_admin_otp_via_gmail_api(self, mock_build, mock_creds_refresh):
        """Verify Gmail API users().messages().send() is called with valid base64url payload."""
        mock_service = MagicMock()
        mock_build.return_value = mock_service
        mock_messages = MagicMock()
        mock_service.users().messages.return_value = mock_messages
        mock_send_exec = MagicMock()
        mock_messages.send.return_value = mock_send_exec
        mock_send_exec.execute.return_value = {'id': 'gmail_msg_id_123', 'threadId': 't123'}

        with patch.dict(os.environ, {
            'EMAIL_PROVIDER': 'gmail_api',
            'GMAIL_CLIENT_ID': 'test-client-id.apps.googleusercontent.com',
            'GMAIL_CLIENT_SECRET': 'test-client-secret',
            'GMAIL_REFRESH_TOKEN': 'test-refresh-token',
            'GMAIL_SENDER_EMAIL': 'MOXIE <tetrionyx@gmail.com>'
        }):
            sent = send_admin_otp_email(self.test_email, '739104')
            self.assertTrue(sent)

            # Verify build was called for gmail v1
            mock_build.assert_called_once()
            self.assertEqual(mock_build.call_args[0][0], 'gmail')
            self.assertEqual(mock_build.call_args[0][1], 'v1')

            # Verify messages.send was called
            mock_messages.send.assert_called_once()
            send_kwargs = mock_messages.send.call_args[1]
            self.assertEqual(send_kwargs.get('userId'), 'me')
            raw_b64 = send_kwargs.get('body', {}).get('raw')
            self.assertIsNotNone(raw_b64)

            # Decode raw message to verify MIME structure
            decoded_bytes = base64.urlsafe_b64decode(raw_b64.encode('utf-8'))
            parsed_msg = email.message_from_bytes(decoded_bytes, policy=policy.default)

            self.assertEqual(parsed_msg['To'], self.test_email)
            self.assertEqual(parsed_msg['From'], 'MOXIE <tetrionyx@gmail.com>')
            self.assertEqual(parsed_msg['Subject'], 'Your MOXIE Admin Verification Code')
            body_text = parsed_msg.get_body(preferencelist=('plain',)).get_content()
            self.assertIn('739104', body_text)
            self.assertIn('MOXIE Admin Verification', body_text)

    @patch('google.oauth2.credentials.Credentials.refresh')
    @patch('services.email_service.build')
    def test_full_admin_login_and_otp_verification(self, mock_build, mock_creds_refresh):
        """Full flow: Password login -> OTP via Gmail API -> OTP verification -> 2FA session established."""
        mock_service = MagicMock()
        mock_build.return_value = mock_service
        mock_messages = MagicMock()
        mock_service.users().messages.return_value = mock_messages
        mock_send_exec = MagicMock()
        mock_messages.send.return_value = mock_send_exec
        mock_send_exec.execute.return_value = {'id': 'msg_001'}

        with patch.dict(os.environ, {
            'EMAIL_PROVIDER': 'gmail_api',
            'GMAIL_CLIENT_ID': 'test_cid',
            'GMAIL_CLIENT_SECRET': 'test_sec',
            'GMAIL_REFRESH_TOKEN': 'test_ref',
            'GMAIL_SENDER_EMAIL': 'MOXIE <tetrionyx@gmail.com>'
        }):
            # 1. Step 1 Login
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

            # Extract generated OTP code from decoded base64 message
            send_kwargs = mock_messages.send.call_args[1]
            raw_b64 = send_kwargs.get('body', {}).get('raw')
            decoded = base64.urlsafe_b64decode(raw_b64.encode('utf-8')).decode('utf-8')
            import re
            code_match = re.search(r'\b\d{6}\b', decoded)
            self.assertIsNotNone(code_match)
            otp_code = code_match.group(0)

            # 2. Step 2 Failed verification with wrong OTP
            verify_view = AdminVerifyOtpView.as_view()
            bad_verify_req = self.factory.post('/api/admin/auth/verify-otp/', {'otp': '999999'}, format='json')
            bad_verify_req.session = session
            bad_resp = verify_view(bad_verify_req)
            self.assertEqual(bad_resp.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertFalse(session.get('admin_2fa_verified', False))

            # 3. Step 2 Successful verification with correct OTP
            good_verify_req = self.factory.post('/api/admin/auth/verify-otp/', {'otp': otp_code}, format='json')
            good_verify_req.session = session
            good_resp = verify_view(good_verify_req)
            self.assertEqual(good_resp.status_code, status.HTTP_200_OK)
            self.assertTrue(good_resp.data.get('success'))
            self.assertTrue(session.get('admin_2fa_verified'))

            # Verify OTP record is marked used in DB
            otp_record = AdminLoginOTP.objects.filter(user=self.admin_user).order_by('-created_at').first()
            self.assertTrue(otp_record.used)

    @patch('google.oauth2.credentials.Credentials.refresh')
    @patch('services.email_service.build')
    def test_gmail_api_failure_in_production_safely_blocks_login(self, mock_build, mock_creds_refresh):
        """When Gmail API HTTPS call fails in production (DEBUG=False), reject login and clean OTP."""
        mock_build.side_effect = RuntimeError("OAuth 2.0 invalid_grant: Token has been expired or revoked.")

        with patch.dict(os.environ, {
            'EMAIL_PROVIDER': 'gmail_api',
            'GMAIL_CLIENT_ID': 'test_cid',
            'GMAIL_CLIENT_SECRET': 'test_sec',
            'GMAIL_REFRESH_TOKEN': 'expired_token',
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


if __name__ == '__main__':
    suite = unittest.TestLoader().loadTestsFromTestCase(GmailApiOtpFlowTestSuite)
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    sys.exit(0 if result.wasSuccessful() else 1)
