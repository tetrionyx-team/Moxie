import os
import sys
from django.core.management.base import BaseCommand
from django.conf import settings
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from google.auth.transport.requests import Request
from google.auth.exceptions import RefreshError
from services.email_service import mask_email, send_admin_otp_email


class Command(BaseCommand):
    help = 'Safe test for Gmail API OAuth credentials and token refresh without leaking secrets'

    def add_arguments(self, parser):
        parser.add_argument(
            '--send',
            action='store_true',
            help='Explicitly dispatch one real test email'
        )
        parser.add_argument(
            '--to',
            type=str,
            default=None,
            help='Recipient email address for test message (required if --send is specified)'
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("=== GMAIL API OAUTH DIAGNOSTIC ==="))

        client_id = os.environ.get('GMAIL_CLIENT_ID', '').strip()
        client_secret = os.environ.get('GMAIL_CLIENT_SECRET', '').strip()
        refresh_token = os.environ.get('GMAIL_REFRESH_TOKEN', '').strip()
        sender_email = os.environ.get('GMAIL_SENDER_EMAIL', 'tetrionyx@gmail.com').strip()

        has_client_id = bool(client_id)
        has_client_secret = bool(client_secret)
        has_refresh_token = bool(refresh_token)

        self.stdout.write(f"GMAIL_CLIENT_ID present: {has_client_id}")
        self.stdout.write(f"GMAIL_CLIENT_SECRET present: {has_client_secret}")
        self.stdout.write(f"GMAIL_REFRESH_TOKEN present: {has_refresh_token}")
        self.stdout.write(f"Sender: {mask_email(sender_email)}")

        if not has_client_id or not has_client_secret or not has_refresh_token:
            self.stdout.write(self.style.ERROR("\nGmail OAuth: FAIL"))
            self.stdout.write(self.style.ERROR("Gmail API: FAIL"))
            self.stdout.write(self.style.WARNING("Missing one or more required Gmail OAuth environment variables."))
            return

        # 1. Test OAuth Credential Refresh
        creds = Credentials(
            token=None,
            refresh_token=refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=client_id,
            client_secret=client_secret,
            scopes=["https://www.googleapis.com/auth/gmail.send"],
        )

        oauth_passed = False
        api_passed = False

        try:
            creds.refresh(Request())
            oauth_passed = True
            self.stdout.write(self.style.SUCCESS("Gmail OAuth: PASS"))
        except RefreshError as r_err:
            self.stdout.write(self.style.ERROR("Gmail OAuth: FAIL"))
            self.stdout.write(self.style.ERROR("Error: Gmail OAuth refresh token is invalid or revoked. Reauthorization required."))
        except Exception as exc:
            err_text = str(exc).lower()
            if "invalid_grant" in err_text:
                self.stdout.write(self.style.ERROR("Gmail OAuth: FAIL"))
                self.stdout.write(self.style.ERROR("Error: Gmail OAuth refresh token is invalid or revoked (invalid_grant)."))
            else:
                self.stdout.write(self.style.ERROR("Gmail OAuth: FAIL"))
                self.stdout.write(self.style.ERROR(f"Error: {type(exc).__name__}"))

        # 2. Test Gmail API Connectivity
        if oauth_passed:
            try:
                service = build('gmail', 'v1', credentials=creds, cache_discovery=False)
                profile = service.users().getProfile(userId='me').execute()
                profile_email = profile.get('emailAddress', sender_email)
                api_passed = True
                self.stdout.write(self.style.SUCCESS(f"Gmail API: PASS (Account: {mask_email(profile_email)})"))
            except Exception as api_err:
                self.stdout.write(self.style.ERROR("Gmail API: FAIL"))
                self.stdout.write(self.style.ERROR(f"API Error: {type(api_err).__name__}"))
        else:
            self.stdout.write(self.style.ERROR("Gmail API: FAIL"))

        # 3. Optional Email Send
        if options.get('send'):
            recipient = options.get('to') or sender_email
            self.stdout.write(self.style.NOTICE(f"\nSending single test email to {mask_email(recipient)}..."))
            try:
                send_admin_otp_email(recipient, "982314")
                self.stdout.write(self.style.SUCCESS(f"Email Send: PASS (Delivered to {mask_email(recipient)})"))
            except Exception as send_err:
                self.stdout.write(self.style.ERROR("Email Send: FAIL"))
                self.stdout.write(self.style.ERROR(f"Send Error: {type(send_err).__name__}"))
