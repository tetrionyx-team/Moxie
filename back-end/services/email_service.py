"""
Moxie Email Delivery Service Abstraction
=========================================
Primary Production Transport:
1. Gmail API over HTTPS (OAuth 2.0 refresh token)

Secondary Fallbacks:
2. Resend HTTPS API (Only when verified custom domain is configured)
3. SMTP (Only when explicitly configured)
4. Console / Testing Transport (Local dev)

Provides unified, secure API for Admin OTP verification emails and transactional store messages.
"""

import os
import json
import logging
import base64
import socket
import smtplib
import requests
from email.message import EmailMessage
from django.conf import settings
from django.core.mail import EmailMultiAlternatives

from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from google.auth.transport.requests import Request
from google.auth.exceptions import RefreshError

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


def is_resend_custom_domain_configured():
    """
    Checks if a valid, non-sandbox, non-gmail custom domain is configured for Resend.
    Resend rejects unverified domains and does not permit gmail.com senders.
    """
    resend_key = os.environ.get('RESEND_API_KEY', '').strip()
    if not resend_key:
        return False

    sender = os.environ.get('RESEND_FROM_EMAIL', '').strip() or os.environ.get('DEFAULT_FROM_EMAIL', '').strip()
    if not sender or '@' not in sender:
        return False

    sender_lower = sender.lower()
    # Reject sandbox and unverified public providers
    if 'gmail.com' in sender_lower or 'resend.dev' in sender_lower or 'onboarding@' in sender_lower:
        return False

    return True


def get_active_email_provider():
    """
    Resolves the active email transport provider based on environment configuration.
    Primary production provider is Gmail API.
    """
    explicit = os.environ.get('EMAIL_PROVIDER', '').strip().lower()
    if explicit:
        return explicit

    # 1. Primary Production Transport: Gmail API
    if (
        os.environ.get('GMAIL_REFRESH_TOKEN', '').strip()
        and os.environ.get('GMAIL_CLIENT_ID', '').strip()
        and os.environ.get('GMAIL_CLIENT_SECRET', '').strip()
    ):
        return 'gmail_api'

    # 2. Secondary: Resend (Only if verified custom domain is configured)
    if is_resend_custom_domain_configured():
        return 'resend'

    # 3. Brevo (if configured)
    if os.environ.get('BREVO_API_KEY', '').strip() or os.environ.get('SENDINBLUE_API_KEY', '').strip():
        return 'brevo'

    # 4. Fallback to SMTP or standard Django EmailBackend
    backend = getattr(settings, 'EMAIL_BACKEND', '')
    if 'console' in backend.lower():
        return 'console'

    return 'gmail_api'


def get_configured_providers():
    """
    Returns an ordered list of providers that have valid configuration in environment.
    Strict Priority:
    1. Gmail API (Primary)
    2. Resend (ONLY if verified custom domain is configured)
    3. Brevo (if configured)
    4. SMTP (ONLY if explicitly configured or local dev)
    """
    explicit = os.environ.get('EMAIL_PROVIDER', '').strip().lower()
    if explicit:
        return [explicit]

    providers = []

    # 1. Primary: Gmail API
    if (
        os.environ.get('GMAIL_REFRESH_TOKEN', '').strip()
        and os.environ.get('GMAIL_CLIENT_ID', '').strip()
        and os.environ.get('GMAIL_CLIENT_SECRET', '').strip()
    ):
        providers.append('gmail_api')

    # 2. Secondary: Resend (only if verified custom domain is available)
    if is_resend_custom_domain_configured():
        providers.append('resend')

    # 3. Brevo
    if os.environ.get('BREVO_API_KEY', '').strip() or os.environ.get('SENDINBLUE_API_KEY', '').strip():
        providers.append('brevo')

    # 4. Local console / SMTP
    backend = getattr(settings, 'EMAIL_BACKEND', '')
    if 'console' in backend.lower():
        providers.append('console')
    elif getattr(settings, 'DEBUG', False) and getattr(settings, 'EMAIL_HOST_PASSWORD', None):
        providers.append('smtp')

    if not providers:
        # Default to gmail_api to enforce diagnostic error handling
        providers.append('gmail_api')

    return providers


def parse_sender_info(from_email_str=None):
    """
    Extracts name and email address from formatted sender string like 'MOXIE <sender@domain.com>'.
    """
    from_name = os.environ.get('EMAIL_FROM_NAME', '').strip() or 'MOXIE'
    raw = from_email_str or getattr(settings, 'DEFAULT_FROM_EMAIL', f'{from_name} <tetrionyx@gmail.com>')
    raw = str(raw).strip()
    if '<' in raw and '>' in raw:
        name_part = raw.split('<')[0].strip().strip('"\'')
        email_part = raw.split('<')[1].split('>')[0].strip()
        return name_part or from_name, email_part
    return from_name, raw


def _send_via_gmail_api(to_email, subject, html_content, text_content, from_email=None, reply_to=None):
    """
    Sends email via Google Gmail API (HTTPS) using OAuth 2.0 server-side refresh token.
    Gracefully handles and safely logs invalid_grant / RefreshError without leaking secrets.
    """
    client_id = os.environ.get('GMAIL_CLIENT_ID', '').strip()
    client_secret = os.environ.get('GMAIL_CLIENT_SECRET', '').strip()
    refresh_token = os.environ.get('GMAIL_REFRESH_TOKEN', '').strip()
    sender_raw = (
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
    try:
        if not creds.valid:
            creds.refresh(Request())
    except RefreshError as r_err:
        logger.error("Gmail OAuth refresh token is invalid or revoked. Reauthorization required.")
        raise RuntimeError("Gmail OAuth refresh token is invalid or revoked. Reauthorization required.") from r_err
    except Exception as exc:
        err_msg = str(exc).lower()
        if "invalid_grant" in err_msg or "bad request" in err_msg:
            logger.error("Gmail OAuth refresh token is invalid or revoked. Reauthorization required.")
            raise RuntimeError("Gmail OAuth refresh token is invalid or revoked. Reauthorization required.") from exc
        logger.error("Gmail OAuth token refresh failed: %s", type(exc).__name__)
        raise RuntimeError(f"Gmail OAuth token refresh failed: {type(exc).__name__}") from exc

    try:
        service = build('gmail', 'v1', credentials=creds, cache_discovery=False)

        msg = EmailMessage()
        msg['Subject'] = subject
        msg['From'] = sender_raw
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
    except Exception as api_err:
        err_str = str(api_err).lower()
        if "invalid_grant" in err_str:
            logger.error("Gmail OAuth refresh token is invalid or revoked. Reauthorization required.")
            raise RuntimeError("Gmail OAuth refresh token is invalid or revoked. Reauthorization required.") from api_err
        logger.error("Gmail API message send failed: %s", type(api_err).__name__)
        raise RuntimeError(f"Gmail API send failed: {type(api_err).__name__}") from api_err


def _send_via_resend(to_email, subject, html_content, text_content, from_email=None, reply_to=None):
    """
    Sends email via Resend HTTPS API.
    Only called when a verified custom domain sender is configured.
    """
    api_key = os.environ.get('RESEND_API_KEY', '').strip()
    if not api_key:
        raise ValueError("RESEND_API_KEY is not configured in environment variables.")

    if not is_resend_custom_domain_configured():
        raise RuntimeError(
            "Resend custom domain is not verified. "
            "Please verify a domain at resend.com/domains and set RESEND_FROM_EMAIL with the verified domain."
        )

    from_name = os.environ.get('EMAIL_FROM_NAME', '').strip() or 'MOXIE'
    sender = os.environ.get('RESEND_FROM_EMAIL', '').strip() or os.environ.get('DEFAULT_FROM_EMAIL', '').strip()

    if '<' not in sender and '@' in sender:
        sender = f"{from_name} <{sender}>"

    payload = {
        "from": sender,
        "to": [to_email] if isinstance(to_email, str) else to_email,
        "subject": subject,
        "html": html_content,
        "text": text_content,
    }
    if reply_to:
        payload["reply_to"] = reply_to

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "User-Agent": "MoxieBackend/1.0",
    }

    timeout = int(os.environ.get('EMAIL_HTTP_TIMEOUT', 15))
    resp = requests.post("https://api.resend.com/emails", json=payload, headers=headers, timeout=timeout)
    if resp.status_code not in (200, 201, 202):
        try:
            err_data = resp.json()
            err_msg = err_data.get('message', resp.text)
        except Exception:
            err_msg = resp.text
        raise RuntimeError(f"Resend API error (HTTP {resp.status_code}): {err_msg}")

    return True


def _send_via_brevo(to_email, subject, html_content, text_content, from_email=None, reply_to=None):
    """
    Sends email via Brevo / Sendinblue HTTPS API.
    """
    api_key = os.environ.get('BREVO_API_KEY', os.environ.get('SENDINBLUE_API_KEY', '')).strip()
    if not api_key:
        raise ValueError("BREVO_API_KEY is not configured in environment variables.")

    from_raw = from_email or os.environ.get('BREVO_FROM_EMAIL') or getattr(settings, 'DEFAULT_FROM_EMAIL', 'MOXIE <noreply@moxiestore.com>')
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


def _send_via_smtp(to_email, subject, html_content, text_content, from_email=None, reply_to=None):
    """
    Sends email via Django SMTP EmailBackend. Catches authentication and network errors cleanly.
    """
    from_name = os.environ.get('EMAIL_FROM_NAME', '').strip() or 'MOXIE'
    default_from = getattr(settings, 'DEFAULT_FROM_EMAIL', None) or f"{from_name} <noreply@moxiestore.com>"
    host_user = getattr(settings, 'EMAIL_HOST_USER', None) or os.environ.get('EMAIL_HOST_USER', None)
    sender = from_email or default_from
    reply_list = [reply_to] if reply_to else ([host_user] if host_user else [])

    try:
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
    except (smtplib.SMTPAuthenticationError, smtplib.SMTPSenderRefused) as auth_err:
        logger.error("SMTP authentication failed. Check credentials.")
        raise RuntimeError(f"SMTP Authentication Error: {type(auth_err).__name__}") from auth_err
    except (OSError, socket.error, socket.timeout) as net_err:
        logger.error("SMTP network error / port unreachable: %s", type(net_err).__name__)
        raise RuntimeError(f"SMTP Network Error: {type(net_err).__name__}") from net_err


def send_transactional_email(to_email, subject, html_content, text_content, from_email=None, reply_to=None):
    """
    Unified dispatcher for transactional emails across supported transports.
    Routes cleanly with strict provider ordering and controlled error handling.
    """
    configured_providers = get_configured_providers()
    if not configured_providers:
        configured_providers = [get_active_email_provider()]

    last_exception = None
    for provider in configured_providers:
        logger.info("Email provider selected: %s", provider)
        try:
            if provider in ('gmail_api', 'gmail'):
                return _send_via_gmail_api(to_email, subject, html_content, text_content, from_email, reply_to)
            elif provider == 'resend':
                return _send_via_resend(to_email, subject, html_content, text_content, from_email, reply_to)
            elif provider in ('brevo', 'sendinblue'):
                return _send_via_brevo(to_email, subject, html_content, text_content, from_email, reply_to)
            elif provider in ('console', 'mock', 'test'):
                return True
            elif provider == 'smtp':
                return _send_via_smtp(to_email, subject, html_content, text_content, from_email, reply_to)
            else:
                raise ValueError(f"Unknown or unsupported EMAIL_PROVIDER: '{provider}'")
        except Exception as e:
            last_exception = e
            logger.warning(
                "Email provider '%s' failed for %s: %s. Checking next provider...",
                provider,
                mask_email(to_email),
                type(e).__name__
            )

    logger.error(
        "All configured email transports failed | recipient=%s | last_provider=%s",
        mask_email(to_email),
        configured_providers[-1] if configured_providers else 'none'
    )
    if last_exception:
        raise last_exception
    raise RuntimeError("No email transport provider could deliver the message.")


def send_admin_otp_email(target_email, otp_code):
    """
    Sends the cryptographically secure 6-digit OTP to the registered admin email
    using the active production transport (Gmail API over HTTPS / verified Resend / SMTP).
    Preserves exact MOXIE branded HTML & text content and 5-minute expiry notices.
    """
    subject = 'Your MOXIE Admin Verification Code'
    from_name = os.environ.get('EMAIL_FROM_NAME', '').strip() or 'MOXIE'

    from_email = (
        os.environ.get('GMAIL_SENDER_EMAIL', '').strip()
        or os.environ.get('DEFAULT_FROM_EMAIL', '').strip()
        or getattr(settings, 'DEFAULT_FROM_EMAIL', None)
        or f"{from_name} <tetrionyx@gmail.com>"
    )

    host_user = getattr(settings, 'EMAIL_HOST_USER', None) or os.environ.get('EMAIL_HOST_USER', None)

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
