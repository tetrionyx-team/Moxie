import sys
from django.core.management.base import BaseCommand
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.contrib.auth import get_user_model

class Command(BaseCommand):
    help = 'Diagnose and test Django SMTP email sending with professional deliverability layout'

    def add_arguments(self, parser):
        parser.add_argument(
            '--to',
            type=str,
            default='sivamurugan04012004@gmail.com',
            help='Target receiver email address (defaults to sivamurugan04012004@gmail.com)'
        )

    def handle(self, *args, **options):
        recipient = options['to'].strip().lower()
        self.stdout.write(self.style.NOTICE("=== MOXIE SMTP DIAGNOSTIC SUITE ==="))
        
        # 1. Environment & Settings Check
        self.stdout.write(f"EMAIL_BACKEND: {settings.EMAIL_BACKEND}")
        self.stdout.write(f"EMAIL_HOST: {settings.EMAIL_HOST}")
        self.stdout.write(f"EMAIL_PORT: {settings.EMAIL_PORT}")
        self.stdout.write(f"EMAIL_USE_TLS: {settings.EMAIL_USE_TLS}")
        self.stdout.write(f"EMAIL_USE_SSL: {getattr(settings, 'EMAIL_USE_SSL', False)}")
        self.stdout.write(f"EMAIL_HOST_USER: {settings.EMAIL_HOST_USER}")
        self.stdout.write(f"DEFAULT_FROM_EMAIL: {settings.DEFAULT_FROM_EMAIL}")
        
        has_password = bool(settings.EMAIL_HOST_PASSWORD)
        pw_len = len(settings.EMAIL_HOST_PASSWORD) if has_password else 0
        self.stdout.write(f"EMAIL_HOST_PASSWORD present: {has_password} (length: {pw_len})")

        # 2. Check Database Admin User
        User = get_user_model()
        admin_user = User.objects.filter(username='admin').first()
        if admin_user:
            self.stdout.write(self.style.SUCCESS(f"Admin user in DB: username='{admin_user.username}', email='{admin_user.email}', is_staff={admin_user.is_staff}, is_active={admin_user.is_active}"))
        else:
            self.stdout.write(self.style.WARNING("Admin user 'admin' not found in database."))

        # 3. Attempt Sending Email via EmailMultiAlternatives
        self.stdout.write(self.style.NOTICE(f"\nAttempting EmailMultiAlternatives to '{recipient}' from '{settings.DEFAULT_FROM_EMAIL}'..."))
        
        subject = "Your MOXIE Admin verification code"
        plain_message = (
            "MOXIE Admin Verification\n\n"
            "Your verification code is:\n\n"
            "849201\n\n"
            "This code expires in 5 minutes.\n\n"
            "If you did not attempt to sign in to MOXIE Admin, you can safely ignore this message.\n\n"
            "MOXIE"
        )
        html_message = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Your MOXIE Admin verification code</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
  <div style="max-width: 480px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; border: 1px solid #e2e8f0; padding: 36px 32px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04); text-align: center;">
    <div style="margin-bottom: 20px;">
      <h1 style="margin: 0; font-size: 26px; font-weight: 800; letter-spacing: 2px; color: #C9A35C; text-transform: uppercase;">MOXIE</h1>
    </div>
    <div style="margin-top: 16px;">
      <h2 style="font-size: 17px; font-weight: 700; color: #0f172a; margin-bottom: 8px;">Admin Verification</h2>
      <p style="font-size: 14px; color: #475569; margin-bottom: 20px; line-height: 1.5;">Use this verification code to complete your sign in:</p>
      <div style="background-color: #faf8f5; border: 1px solid #C9A35C; border-radius: 8px; padding: 16px; font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #0f172a; margin: 20px 0; font-family: monospace, Courier, sans-serif;">849201</div>
      <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin-top: 20px;">This code expires in <strong>5 minutes</strong>.</p>
    </div>
    <div style="margin-top: 28px; padding-top: 16px; border-top: 1px solid #f1f5f9; font-size: 12px; color: #94a3b8; line-height: 1.4;">
      If you did not request this code, you can safely ignore this email.<br>
      <span style="color: #64748b; font-weight: 600; margin-top: 6px; display: inline-block;">MOXIE Security</span>
    </div>
  </div>
</body>
</html>"""

        try:
            email = EmailMultiAlternatives(
                subject=subject,
                body=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[recipient],
                reply_to=['tetrionyx@gmail.com'],
            )
            email.attach_alternative(html_message, "text/html")
            res = email.send(fail_silently=False)
            
            if res == 1:
                self.stdout.write(self.style.SUCCESS(f"[SUCCESS] Email sent successfully! (return code: {res})"))
                self.stdout.write(self.style.SUCCESS(f"Delivered to '{recipient}' via '{settings.DEFAULT_FROM_EMAIL}'."))
            else:
                self.stdout.write(self.style.WARNING(f"[WARNING] email.send returned: {res}"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"[FAILED] Error Type: {type(e).__name__}"))
            self.stdout.write(self.style.ERROR(f"[FAILED] Error Details: {e}"))
            self.stdout.write(self.style.NOTICE("\n--- DIAGNOSTIC HINTS ---"))
            err_str = str(e).lower()
            if "10061" in err_str or "connection refused" in err_str:
                self.stdout.write(self.style.WARNING(
                    "Network/Firewall Block: Port 587 is blocked by local Windows Defender Firewall, antivirus, or ISP.\n"
                    "On cloud hosting (Render/production), outbound SMTP is open."
                ))
            elif "535" in err_str or "authentication" in err_str:
                self.stdout.write(self.style.WARNING(
                    "Authentication Failed: Verify that 2-Step Verification is enabled on tetrionyx@gmail.com and a 16-character App Password is used."
                ))
            elif "timeout" in err_str:
                self.stdout.write(self.style.WARNING(
                    "Connection Timeout: Could not reach smtp.gmail.com within the timeout period. Check internet/proxy."
                ))
