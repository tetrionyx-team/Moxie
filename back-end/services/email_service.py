"""
Moxie Email Delivery Service Abstraction
=========================================
Supports multiple delivery transports:
1. Gmail API over HTTPS (Primary Render Free provider via OAuth 2.0 refresh token)
2. SMTP (Default / Paid Render instances / Local Dev fallback)
3. Resend HTTPS API (Alternative HTTPS provider)
4. Brevo / Sendinblue HTTPS API
5. SendGrid HTTPS API
6. Postmark HTTPS API
7. Mailgun HTTPS API
8. Console / Testing Transport

Provides unified API for Admin OTP verification emails and transactional store messages.
"""

import os
import json
import logging
import base64
import requests
from email.message import EmailMessage
from django.conf import settings
from django.core.mail import EmailMultiAlternatives

from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from google.auth.transport.requests import Request

import resend

logger = logging.getLogger(__name__)


def mask_email(email_str):
    """
    Masks an email for safe logging (e.g. j***e@example.com).
    Never leaks sensitive full email strings in security logs.
    """
    if not email_str or '@' not in email_str:
        return '***@***.***'
    try:
        name, domain = email_str.split('@', 1)
        if len(name) <= 2:
            masked_name = name[0] + '*****'
        else:
            masked_name = name[0] + '*****' + name[-1]
        return f"{masked_name}@{domain}"
    except Exception:
        return '***@***.***'


def get_active_email_provider():
    """
    Resolves the active email transport provider based on environment configuration.
    Explicit EMAIL_PROVIDER takes precedence ('gmail_api', 'smtp', 'resend', etc.).
    Otherwise auto-detects based on available API credentials.
    """
    explicit = os.environ.get('EMAIL_PROVIDER', '').strip().lower()
    if explicit:
        return explicit

    # Auto-detect HTTPS API providers
    if os.environ.get('GMAIL_REFRESH_TOKEN', '').strip():
        return 'gmail_api'
    if os.environ.get('RESEND_API_KEY', '').strip():
        return 'resend'
    if os.environ.get('BREVO_API_KEY', '').strip() or os.environ.get('SENDINBLUE_API_KEY', '').strip():
        return 'brevo'
    if os.environ.get('SENDGRID_API_KEY', '').strip():
        return 'sendgrid'
    if os.environ.get('POSTMARK_SERVER_TOKEN', '').strip():
        return 'postmark'
    if os.environ.get('MAILGUN_API_KEY', '').strip():
        return 'mailgun'

    # Fallback to SMTP or standard Django EmailBackend
    backend = getattr(settings, 'EMAIL_BACKEND', '')
    if 'console' in backend.lower():
        return 'console'

    return 'smtp'


def parse_sender_info(from_email_str=None):
    """
    Extracts name and email address from formatted sender string like 'MOXIE <sender@domain.com>'.
    """
    raw = from_email_str or getattr(settings, 'DEFAULT_FROM_EMAIL', 'MOXIE <noreply@moxie.com>')
    raw = str(raw).strip()
    if '<' in raw and '>' in raw:
        name_part = raw.split('<')[0].strip().strip('"\'')
        email_part = raw.split('<')[1].split('>')[0].strip()
        return name_part or 'MOXIE', email_part
    return 'MOXIE', raw


def _send_via_gmail_api(to_email, subject, html_content, text_content, from_email=None, reply_to=None):
    """
    Sends email via Google Gmail API (HTTPS) using OAuth 2.0 server-side refresh token.
    Works reliably on Render Free without requiring outbound SMTP ports (25/465/587).
    """
    client_id = os.environ.get('GMAIL_CLIENT_ID', '').strip()
    client_secret = os.environ.get('GMAIL_CLIENT_SECRET', '').strip()
    refresh_token = os.environ.get('GMAIL_REFRESH_TOKEN', '').strip()
    sender = (
        from_email
        or os.environ.get('GMAIL_SENDER_EMAIL', '').strip()
        or getattr(settings, 'DEFAULT_FROM_EMAIL', None)
        or 'MOXIE <tetrionyx@gmail.com>'
    )

    if not client_id or not client_secret or not refresh_token:
        missing = []
        if not client_id:
            missing.append('GMAIL_CLIENT_ID')
        if not client_secret:
            missing.append('GMAIL_CLIENT_SECRET')
        if not refresh_token:
            missing.append('GMAIL_REFRESH_TOKEN')
        raise ValueError(f"Gmail API credentials missing: {', '.join(missing)}")

    creds = Credentials(
        token=None,
        refresh_token=refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=client_id,
        client_secret=client_secret,
        scopes=["https://www.googleapis.com/auth/gmail.send"],
    )

    # Force token refresh if expired or not yet loaded
    if not creds.valid:
        creds.refresh(Request())

    service = build('gmail', 'v1', credentials=creds, cache_discovery=False)

    msg = EmailMessage()
    msg['Subject'] = subject
    msg['From'] = sender
    msg['To'] = to_email
    if reply_to:
        msg['Reply-To'] = reply_to

    # Plain text body
    msg.set_content(text_content)

    # Rich HTML body alternative
    if html_content:
        msg.add_alternative(html_content, subtype='html')

    # Encode message as URL-safe base64 string
    raw_message = base64.urlsafe_b64encode(msg.as_bytes()).decode('utf-8')

    # Send message using Gmail API users().messages().send over HTTPS
    service.users().messages().send(
        userId='me',
        body={'raw': raw_message}
    ).execute()

    return True


def _send_via_smtp(to_email, subject, html_content, text_content, from_email=None, reply_to=None):
    """
    Sends email via Django SMTP EmailBackend.
    """
    default_from = getattr(settings, 'DEFAULT_FROM_EMAIL', None) or 'MOXIE <tetrionyx@gmail.com>'
    host_user = getattr(settings, 'EMAIL_HOST_USER', None) or 'tetrionyx@gmail.com'
    sender = from_email or default_from
    reply_list = [reply_to] if reply_to else ([host_user] if host_user else [])

    email = EmailMultiAlternatives(
        subject=subject,
        body=text_content,
        from_email=sender,
        to=[to_email],
        reply_to=reply_list,
    )
    if html_content:
        email.attach_alternative(html_content, "text/html")

    sent_count = email.send(fail_silently=False)
    if sent_count < 1:
        raise RuntimeError("Django SMTP send returned 0 sent messages.")
    return True


def _send_via_resend(to_email, subject, html_content, text_content, from_email=None, reply_to=None):
    """
    Sends email via Resend Python SDK (HTTPS API).
    """
    api_key = os.environ.get('RESEND_API_KEY', '').strip()
    if not api_key:
        raise ValueError("RESEND_API_KEY is not configured in environment variables.")

    resend.api_key = api_key

    sender = (
        from_email
        or os.environ.get('RESEND_FROM_EMAIL', '').strip()
        or getattr(settings, 'DEFAULT_FROM_EMAIL', None)
        or 'MOXIE <onboarding@resend.dev>'
    )

    params = {
        "from": sender,
        "to": [to_email],
        "subject": subject,
        "html": html_content,
        "text": text_content,
    }
    if reply_to:
        params["reply_to"] = reply_to

    response = resend.Emails.send(params)
    if isinstance(response, dict) and response.get("error"):
        raise RuntimeError(f"Resend API error: {response.get('error')}")

    return True


def _send_via_brevo(to_email, subject, html_content, text_content, from_email=None, reply_to=None):
    """
    Sends email via Brevo / Sendinblue HTTPS API (https://api.brevo.com/v3/smtp/email).
    """
    api_key = os.environ.get('BREVO_API_KEY', os.environ.get('SENDINBLUE_API_KEY', '')).strip()
    if not api_key:
        raise ValueError("BREVO_API_KEY is not configured in environment variables.")

    from_raw = from_email or os.environ.get('BREVO_FROM_EMAIL') or getattr(settings, 'DEFAULT_FROM_EMAIL', 'MOXIE <noreply@moxie.com>')
    sender_name, sender_email = parse_sender_info(from_raw)

    payload = {
        "sender": {"name": sender_name, "email": sender_email},
        "to": [{"email": to_email}],
        "subject": subject,
        "textContent": text_content,
    }
    if html_content:
        payload["htmlContent"] = html_content
    if reply_to:
        reply_name, reply_addr = parse_sender_info(reply_to)
        payload["replyTo"] = {"name": reply_name, "email": reply_addr}

    headers = {
        "api-key": api_key,
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "MoxieBackend/1.0",
    }

    timeout = int(os.environ.get('EMAIL_HTTP_TIMEOUT', 15))
    resp = requests.post("https://api.brevo.com/v3/smtp/email", json=payload, headers=headers, timeout=timeout)

    if resp.status_code not in (200, 201, 202):
        try:
            err_msg = resp.json().get('message', resp.text)
        except Exception:
            err_msg = resp.text
        raise RuntimeError(f"Brevo API error (HTTP {resp.status_code}): {err_msg}")

    return True


def _send_via_sendgrid(to_email, subject, html_content, text_content, from_email=None, reply_to=None):
    """
    Sends email via SendGrid v3 Mail Send HTTPS API (https://api.sendgrid.com/v3/mail/send).
    """
    api_key = os.environ.get('SENDGRID_API_KEY', '').strip()
    if not api_key:
        raise ValueError("SENDGRID_API_KEY is not configured in environment variables.")

    from_raw = from_email or os.environ.get('SENDGRID_FROM_EMAIL') or getattr(settings, 'DEFAULT_FROM_EMAIL', 'MOXIE <noreply@moxie.com>')
    sender_name, sender_email = parse_sender_info(from_raw)

    contents = []
    if text_content:
        contents.append({"type": "text/plain", "value": text_content})
    if html_content:
        contents.append({"type": "text/html", "value": html_content})

    payload = {
        "personalizations": [{"to": [{"email": to_email}]}],
        "from": {"email": sender_email, "name": sender_name},
        "subject": subject,
        "content": contents,
    }
    if reply_to:
        reply_name, reply_addr = parse_sender_info(reply_to)
        payload["reply_to"] = {"email": reply_addr, "name": reply_name}

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "User-Agent": "MoxieBackend/1.0",
    }

    timeout = int(os.environ.get('EMAIL_HTTP_TIMEOUT', 15))
    resp = requests.post("https://api.sendgrid.com/v3/mail/send", json=payload, headers=headers, timeout=timeout)

    if resp.status_code not in (200, 201, 202):
        try:
            err_msg = resp.json()
        except Exception:
            err_msg = resp.text
        raise RuntimeError(f"SendGrid API error (HTTP {resp.status_code}): {err_msg}")

    return True


def _send_via_postmark(to_email, subject, html_content, text_content, from_email=None, reply_to=None):
    """
    Sends email via Postmark HTTPS API (https://api.postmarkapp.com/email).
    """
    server_token = os.environ.get('POSTMARK_SERVER_TOKEN', '').strip()
    if not server_token:
        raise ValueError("POSTMARK_SERVER_TOKEN is not configured in environment variables.")

    sender = from_email or os.environ.get('POSTMARK_FROM_EMAIL') or getattr(settings, 'DEFAULT_FROM_EMAIL', 'MOXIE <noreply@moxie.com>')

    payload = {
        "From": sender,
        "To": to_email,
        "Subject": subject,
        "TextBody": text_content,
    }
    if html_content:
        payload["HtmlBody"] = html_content
    if reply_to:
        payload["ReplyTo"] = reply_to

    headers = {
        "X-Postmark-Server-Token": server_token,
        "Content-Type": "application/json",
        "Accept": "application/json",
    }

    timeout = int(os.environ.get('EMAIL_HTTP_TIMEOUT', 15))
    resp = requests.post("https://api.postmarkapp.com/email", json=payload, headers=headers, timeout=timeout)

    if resp.status_code not in (200, 201, 202):
        try:
            err_msg = resp.json().get('Message', resp.text)
        except Exception:
            err_msg = resp.text
        raise RuntimeError(f"Postmark API error (HTTP {resp.status_code}): {err_msg}")

    return True


def _send_via_mailgun(to_email, subject, html_content, text_content, from_email=None, reply_to=None):
    """
    Sends email via Mailgun HTTPS API.
    """
    api_key = os.environ.get('MAILGUN_API_KEY', '').strip()
    domain = os.environ.get('MAILGUN_DOMAIN', '').strip()
    if not api_key or not domain:
        raise ValueError("MAILGUN_API_KEY and MAILGUN_DOMAIN must be configured.")

    sender = from_email or os.environ.get('MAILGUN_FROM_EMAIL') or getattr(settings, 'DEFAULT_FROM_EMAIL', 'MOXIE <noreply@moxie.com>')

    data = {
        "from": sender,
        "to": [to_email],
        "subject": subject,
        "text": text_content,
    }
    if html_content:
        data["html"] = html_content
    if reply_to:
        data["h:Reply-To"] = reply_to

    endpoint = f"https://api.mailgun.net/v3/{domain}/messages"
    timeout = int(os.environ.get('EMAIL_HTTP_TIMEOUT', 15))
    resp = requests.post(endpoint, auth=("api", api_key), data=data, timeout=timeout)

    if resp.status_code not in (200, 201, 202):
        try:
            err_msg = resp.json().get('message', resp.text)
        except Exception:
            err_msg = resp.text
        raise RuntimeError(f"Mailgun API error (HTTP {resp.status_code}): {err_msg}")

    return True


def send_transactional_email(to_email, subject, html_content, text_content, from_email=None, reply_to=None):
    """
    Unified dispatcher for transactional emails across all supported transports.
    Routes to the configured provider cleanly and transparently.
    """
    provider = get_active_email_provider()

    try:
        if provider in ('gmail_api', 'gmail'):
            return _send_via_gmail_api(to_email, subject, html_content, text_content, from_email, reply_to)
        elif provider == 'resend':
            return _send_via_resend(to_email, subject, html_content, text_content, from_email, reply_to)
        elif provider in ('brevo', 'sendinblue'):
            return _send_via_brevo(to_email, subject, html_content, text_content, from_email, reply_to)
        elif provider == 'sendgrid':
            return _send_via_sendgrid(to_email, subject, html_content, text_content, from_email, reply_to)
        elif provider == 'postmark':
            return _send_via_postmark(to_email, subject, html_content, text_content, from_email, reply_to)
        elif provider == 'mailgun':
            return _send_via_mailgun(to_email, subject, html_content, text_content, from_email, reply_to)
        elif provider in ('console', 'mock', 'test'):
            return True
        elif provider == 'smtp':
            return _send_via_smtp(to_email, subject, html_content, text_content, from_email, reply_to)
        else:
            raise ValueError(f"Unknown or unsupported EMAIL_PROVIDER: '{provider}'")
    except Exception as e:
        logger.error(
            "Admin OTP email delivery failed: %s: %s",
            type(e).__name__,
            str(e)
        )
        raise


def send_admin_otp_email(target_email, otp_code):
    """
    Sends the cryptographically secure 6-digit OTP to the registered admin email
    using the active production transport (Gmail API over HTTPS on Render Free or local SMTP).
    Preserves exact MOXIE branded HTML & text content and 5-minute expiry notices.
    """
    subject = 'Your MOXIE Admin Verification Code'
    from_email = (
        os.environ.get('GMAIL_SENDER_EMAIL', '').strip()
        or os.environ.get('RESEND_FROM_EMAIL', '').strip()
        or getattr(settings, 'DEFAULT_FROM_EMAIL', None)
        or 'MOXIE <tetrionyx@gmail.com>'
    )
    host_user = getattr(settings, 'EMAIL_HOST_USER', None) or 'tetrionyx@gmail.com'

    plain_message = (
        f"MOXIE Admin Verification\n\n"
        f"Your verification code is:\n\n"
        f"{otp_code}\n\n"
        f"This code expires in 5 minutes.\n\n"
        f"If you did not attempt to sign in to MOXIE Admin, you can safely ignore this message.\n\n"
        f"MOXIE"
    )

    html_message = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Your MOXIE Admin Verification Code</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
  <div style="max-width: 480px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; border: 1px solid #e2e8f0; padding: 36px 32px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04); text-align: center;">
    <div style="margin-bottom: 20px;">
      <h1 style="margin: 0; font-size: 26px; font-weight: 800; letter-spacing: 2px; color: #C9A35C; text-transform: uppercase;">MOXIE</h1>
    </div>
    <div style="margin-top: 16px;">
      <h2 style="font-size: 17px; font-weight: 700; color: #0f172a; margin-bottom: 8px;">Admin Verification</h2>
      <p style="font-size: 14px; color: #475569; margin-bottom: 20px; line-height: 1.5;">Use this verification code to complete your sign in:</p>
      <div style="background-color: #faf8f5; border: 1px solid #C9A35C; border-radius: 8px; padding: 16px; font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #0f172a; margin: 20px 0; font-family: monospace, Courier, sans-serif;">{otp_code}</div>
      <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin-top: 20px;">This code expires in <strong>5 minutes</strong>.</p>
    </div>
    <div style="margin-top: 28px; padding-top: 16px; border-top: 1px solid #f1f5f9; font-size: 12px; color: #94a3b8; line-height: 1.4;">
      If you did not request this code, you can safely ignore this email.<br>
      <span style="color: #64748b; font-weight: 600; margin-top: 6px; display: inline-block;">MOXIE Security</span>
    </div>
  </div>
</body>
</html>"""

    result = send_transactional_email(
        to_email=target_email,
        subject=subject,
        html_content=html_message,
        text_content=plain_message,
        from_email=from_email,
        reply_to=host_user,
    )
    logger.info("Admin OTP email delivery succeeded")
    return result
