import os
import sys
from django.core.management.base import BaseCommand
from django.conf import settings
from django.contrib.auth import get_user_model
from services.email_service import (
    get_active_email_provider,
    mask_email,
    send_admin_otp_email,
    send_transactional_email,
)


class Command(BaseCommand):
    help = 'Diagnose and test Moxie Admin OTP & transactional email delivery across SMTP and HTTPS transports'

    def add_arguments(self, parser):
        parser.add_argument(
            '--to',
            type=str,
            default=None,
            help='Target receiver email address (defaults to registered DB Admin email / ADMIN_EMAIL)'
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("=== MOXIE EMAIL DELIVERY DIAGNOSTIC SUITE ==="))

        provider = get_active_email_provider()
        self.stdout.write(self.style.SUCCESS(f"Active Email Provider: {provider.upper()}"))

        # 1. Check Database Admin User
        User = get_user_model()
        admin_user = User.objects.filter(is_staff=True).order_by('-is_superuser', 'id').first()
        db_admin_email = admin_user.email if admin_user and admin_user.email else None

        recipient = options.get('to')
        if not recipient:
            recipient = db_admin_email or os.environ.get('ADMIN_EMAIL') or settings.EMAIL_HOST_USER or 'tetrionyx@gmail.com'
        recipient = recipient.strip().lower()

        # 2. Environment & Settings Check
        self.stdout.write(f"EMAIL_PROVIDER: {os.environ.get('EMAIL_PROVIDER', '(auto-detected)')}")
        self.stdout.write(f"DEFAULT_FROM_EMAIL: {settings.DEFAULT_FROM_EMAIL}")

        if provider in ('gmail_api', 'gmail'):
            has_client_id = bool(os.environ.get('GMAIL_CLIENT_ID'))
            has_client_secret = bool(os.environ.get('GMAIL_CLIENT_SECRET'))
            has_refresh_token = bool(os.environ.get('GMAIL_REFRESH_TOKEN'))
            self.stdout.write(f"GMAIL_CLIENT_ID present: {has_client_id}")
            self.stdout.write(f"GMAIL_CLIENT_SECRET present: {has_client_secret}")
            self.stdout.write(f"GMAIL_REFRESH_TOKEN present: {has_refresh_token}")
            self.stdout.write(f"GMAIL_SENDER_EMAIL: {os.environ.get('GMAIL_SENDER_EMAIL', '(default)')}")
        elif provider == 'smtp':
            self.stdout.write(f"EMAIL_BACKEND: {settings.EMAIL_BACKEND}")
            self.stdout.write(f"EMAIL_HOST: {settings.EMAIL_HOST}")
            self.stdout.write(f"EMAIL_PORT: {settings.EMAIL_PORT}")
            self.stdout.write(f"EMAIL_USE_TLS: {settings.EMAIL_USE_TLS}")
            self.stdout.write(f"EMAIL_USE_SSL: {getattr(settings, 'EMAIL_USE_SSL', False)}")
            self.stdout.write(f"EMAIL_HOST_USER: {settings.EMAIL_HOST_USER}")
            has_password = bool(settings.EMAIL_HOST_PASSWORD)
            pw_len = len(settings.EMAIL_HOST_PASSWORD) if has_password else 0
            self.stdout.write(f"EMAIL_HOST_PASSWORD present: {has_password} (length: {pw_len} chars)")
        elif provider == 'resend':
            has_key = bool(os.environ.get('RESEND_API_KEY'))
            self.stdout.write(f"RESEND_API_KEY present: {has_key}")
            self.stdout.write(f"RESEND_FROM_EMAIL: {os.environ.get('RESEND_FROM_EMAIL', '(default)')}")
        elif provider in ('brevo', 'sendinblue'):
            has_key = bool(os.environ.get('BREVO_API_KEY') or os.environ.get('SENDINBLUE_API_KEY'))
            self.stdout.write(f"BREVO_API_KEY present: {has_key}")
            self.stdout.write(f"BREVO_FROM_EMAIL: {os.environ.get('BREVO_FROM_EMAIL', '(default)')}")
        elif provider == 'sendgrid':
            has_key = bool(os.environ.get('SENDGRID_API_KEY'))
            self.stdout.write(f"SENDGRID_API_KEY present: {has_key}")
            self.stdout.write(f"SENDGRID_FROM_EMAIL: {os.environ.get('SENDGRID_FROM_EMAIL', '(default)')}")
        elif provider == 'postmark':
            has_key = bool(os.environ.get('POSTMARK_SERVER_TOKEN'))
            self.stdout.write(f"POSTMARK_SERVER_TOKEN present: {has_key}")
            self.stdout.write(f"POSTMARK_FROM_EMAIL: {os.environ.get('POSTMARK_FROM_EMAIL', '(default)')}")
        elif provider == 'mailgun':
            has_key = bool(os.environ.get('MAILGUN_API_KEY'))
            self.stdout.write(f"MAILGUN_API_KEY present: {has_key}")
            self.stdout.write(f"MAILGUN_DOMAIN: {os.environ.get('MAILGUN_DOMAIN', '')}")

        if admin_user:
            self.stdout.write(self.style.SUCCESS(
                f"Staff user in DB: username='{admin_user.username}', email='{mask_email(admin_user.email)}', is_staff={admin_user.is_staff}, is_active={admin_user.is_active}"
            ))
        else:
            self.stdout.write(self.style.WARNING("No staff admin user found in database."))

        # 3. Attempt Sending Test Email
        self.stdout.write(self.style.NOTICE(f"\nAttempting test OTP email to '{mask_email(recipient)}' via provider [{provider.upper()}]..."))

        try:
            send_admin_otp_email(recipient, "849201")
            self.stdout.write(self.style.SUCCESS(f"[SUCCESS] OTP email dispatched successfully via {provider.upper()}!"))
            self.stdout.write(self.style.SUCCESS(f"Delivered to '{mask_email(recipient)}'."))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"[FAILED] Error Type: {type(e).__name__}"))
            self.stdout.write(self.style.ERROR(f"[FAILED] Error Details: {e}"))
            self.stdout.write(self.style.NOTICE("\n--- DIAGNOSTIC HINTS ---"))
            err_str = str(e).lower()
            if "10061" in err_str or "connection refused" in err_str or "timeout" in err_str:
                self.stdout.write(self.style.WARNING(
                    "SMTP Port Blocked: Render Free Web Services block outbound SMTP ports (25/465/587).\n"
                    "For Render Free backend, configure Gmail API over HTTPS:\n"
                    "  EMAIL_PROVIDER=gmail_api\n"
                    "  GMAIL_CLIENT_ID=...\n"
                    "  GMAIL_CLIENT_SECRET=...\n"
                    "  GMAIL_REFRESH_TOKEN=...\n"
                    "  GMAIL_SENDER_EMAIL=MOXIE <youraccount@gmail.com>"
                ))
            elif "invalid_grant" in err_str or "token" in err_str:
                self.stdout.write(self.style.WARNING(
                    "OAuth Token Error: Your GMAIL_REFRESH_TOKEN may be expired or revoked. Please regenerate your refresh token."
                ))
            elif "535" in err_str or "authentication" in err_str:
                self.stdout.write(self.style.WARNING(
                    "Authentication Failed: Check OAuth credentials or Gmail App Password."
                ))
