"""
Email Service Adapter for api package
Re-exports services.email_service functions for consistency
"""
from services.email_service import (
    get_active_email_provider,
    mask_email,
    send_admin_otp_email,
    send_transactional_email,
)

__all__ = [
    'get_active_email_provider',
    'mask_email',
    'send_admin_otp_email',
    'send_transactional_email',
]
