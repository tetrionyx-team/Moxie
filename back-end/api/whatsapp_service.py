import os
import re
import logging
import json
import urllib.request
import urllib.error
from django.utils import timezone
from django.conf import settings
from .models import Order, NotificationLog

logger = logging.getLogger(__name__)


def get_whatsapp_config():
    """Retrieve WhatsApp configuration from settings or environment variables."""
    return {
        'access_token': os.environ.get('WHATSAPP_ACCESS_TOKEN', getattr(settings, 'WHATSAPP_ACCESS_TOKEN', '')).strip(),
        'phone_number_id': os.environ.get('WHATSAPP_PHONE_NUMBER_ID', getattr(settings, 'WHATSAPP_PHONE_NUMBER_ID', '')).strip(),
        'business_account_id': os.environ.get('WHATSAPP_BUSINESS_ACCOUNT_ID', getattr(settings, 'WHATSAPP_BUSINESS_ACCOUNT_ID', '')).strip(),
        'api_version': os.environ.get('WHATSAPP_API_VERSION', 'v21.0').strip(),
        'order_template': os.environ.get('WHATSAPP_ORDER_TEMPLATE', 'moxie_order_confirmed').strip(),
        'shipped_template': os.environ.get('WHATSAPP_SHIPPED_TEMPLATE', 'moxie_order_shipped').strip(),
        'out_for_delivery_template': os.environ.get('WHATSAPP_OUT_FOR_DELIVERY_TEMPLATE', 'moxie_out_for_delivery').strip(),
        'delivered_template': os.environ.get('WHATSAPP_DELIVERED_TEMPLATE', 'moxie_order_delivered').strip(),
        'frontend_url': os.environ.get('FRONTEND_URL', 'http://localhost:5173').rstrip('/'),
    }


def normalize_indian_phone(raw_phone):
    """
    Normalizes Indian phone numbers into international format: 91XXXXXXXXXX.
    Returns normalized string or None if invalid.
    """
    if not raw_phone:
        return None
    digits = re.sub(r'\D', '', str(raw_phone))
    if not digits:
        return None

    if len(digits) == 10 and digits[0] in '6789':
        return f"91{digits}"
    elif len(digits) == 11 and digits.startswith('0') and digits[1] in '6789':
        return f"91{digits[1:]}"
    elif len(digits) == 12 and digits.startswith('91') and digits[2] in '6789':
        return digits

    # General international number validation (10 to 15 digits)
    if len(digits) >= 10:
        return digits
    return None


def build_order_items_summary(order):
    """
    Dynamically constructs snapshot item summary from order items.
    """
    items = order.items.all()
    if not items.exists():
        return "1x Moxie Item"

    item_lines = []
    for it in items:
        p_name = it.product_name or (it.product.name if it.product else 'Moxie Product')
        details = []
        if it.color_name and it.color_name.lower() != 'default':
            details.append(f"Color: {it.color_name}")
        if it.size and it.size.lower() != 'regular':
            details.append(f"Size: {it.size}")
        detail_str = f" ({', '.join(details)})" if details else ""
        item_lines.append(f"• {p_name}{detail_str}\n  Qty: {it.quantity} | ₹{float(it.price):,.2f}")

    return "\n".join(item_lines)


def send_whatsapp_payload(recipient_phone, message_type, order, text_body, template_name=None, template_components=None):
    """
    Sends WhatsApp message via Meta Cloud API with idempotency and non-blocking logging.
    """
    config = get_whatsapp_config()
    clean_phone = normalize_indian_phone(recipient_phone)

    if not clean_phone:
        logger.warning(f"WhatsApp dispatch skipped: Invalid phone '{recipient_phone}' for order #{order.id}")
        return False, "INVALID_PHONE"

    # Idempotency key
    tracking_suffix = str(order.tracking_id or order.shipping_status or '').strip()
    idempotency_key = f"wa_{message_type.lower()}_{order.id}_{tracking_suffix}".replace(' ', '_')

    # Check if already sent
    existing_log = NotificationLog.objects.filter(idempotency_key=idempotency_key, status='SENT').first()
    if existing_log:
        logger.info(f"WhatsApp message already sent for key {idempotency_key}. Skipping duplicate.")
        return True, "ALREADY_SENT"

    # Create/update log entry
    log_entry, _ = NotificationLog.objects.get_or_create(
        idempotency_key=idempotency_key,
        defaults={
            'order': order,
            'customer': order.user,
            'channel': 'WHATSAPP',
            'message_type': message_type,
            'recipient': clean_phone,
            'status': 'PENDING',
            'payload_summary': text_body[:1000],
        }
    )

    access_token = config['access_token']
    phone_number_id = config['phone_number_id']
    api_version = config['api_version']

    # If configuration is missing, log failure gracefully
    if not access_token or not phone_number_id:
        err_msg = "WhatsApp configuration missing (WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID not set)."
        logger.warning(err_msg)
        log_entry.status = 'FAILED'
        log_entry.error_code = 'CONFIG_MISSING'
        log_entry.error_message = err_msg
        log_entry.save()
        return False, "CONFIG_MISSING"

    url = f"https://graph.facebook.com/{api_version}/{phone_number_id}/messages"

    # Build request body
    if template_name and template_components:
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": clean_phone,
            "type": "template",
            "template": {
                "name": template_name,
                "language": {"code": "en"},
                "components": template_components
            }
        }
    else:
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": clean_phone,
            "type": "text",
            "text": {
                "preview_url": True,
                "body": text_body
            }
        }

    try:
        data = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request(
            url,
            data=data,
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            }
        )

        with urllib.request.urlopen(req, timeout=15) as resp:
            resp_body = resp.read().decode('utf-8')
            resp_json = json.loads(resp_body)
            msg_id = ""
            if resp_json.get('messages') and len(resp_json['messages']) > 0:
                msg_id = resp_json['messages'][0].get('id', '')

            log_entry.status = 'SENT'
            log_entry.provider_message_id = msg_id
            log_entry.sent_at = timezone.now()
            log_entry.error_code = ''
            log_entry.error_message = ''
            log_entry.save()
            logger.info(f"WhatsApp {message_type} sent successfully to {clean_phone} (Msg ID: {msg_id})")
            return True, msg_id

    except urllib.error.HTTPError as e:
        err_body = e.read().decode('utf-8') if e.fp else str(e)
        logger.error(f"WhatsApp API HTTP Error ({e.code}): {err_body}")
        log_entry.status = 'FAILED'
        log_entry.error_code = f"HTTP_{e.code}"
        log_entry.error_message = err_body[:1000]
        log_entry.retry_count += 1
        log_entry.save()
        return False, f"HTTP_{e.code}"

    except Exception as e:
        logger.error(f"WhatsApp network dispatch error: {e}")
        log_entry.status = 'FAILED'
        log_entry.error_code = 'NETWORK_ERROR'
        log_entry.error_message = str(e)[:1000]
        log_entry.retry_count += 1
        log_entry.save()
        return False, str(e)


# ==============================================================================
# High-Level WhatsApp Event Senders
# ==============================================================================

def send_order_confirmation_whatsapp(order):
    """
    Sends Order Confirmation WhatsApp notification after successful payment / COD advance.
    """
    try:
        config = get_whatsapp_config()
        recipient = order.shipping_phone or (order.user.customer_profile.mobile if hasattr(order.user, 'customer_profile') else '')
        order_num = order.order_number or f"MX{order.id:04d}"
        customer_name = order.shipping_name or (order.user.first_name if order.user else 'Customer')
        items_summary = build_order_items_summary(order)
        total_amt = f"₹{float(order.total_amount):,.2f}"
        pay_method = order.payment_method or 'UPI'
        track_link = f"{config['frontend_url']}/my-orders/{order_num}"
        address_summary = f"{order.shipping_city}, {order.shipping_state or 'India'} - {order.shipping_pincode}"

        message_text = (
            f"✨ *MOXIE — Order Confirmed*\n\n"
            f"Hi {customer_name},\n\n"
            f"Thank you for shopping with *MOXIE*.\n"
            f"Your order *#{order_num}* has been successfully confirmed.\n\n"
            f"📦 *ORDER DETAILS*\n"
            f"{items_summary}\n\n"
            f"*Order Total:* {total_amt}\n"
            f"*Payment:* {pay_method}\n"
            f"*Status:* Confirmed\n\n"
            f"📍 *Delivery Address:*\n{address_summary}\n\n"
            f"We'll notify you again when your order is shipped.\n\n"
            f"🔗 *View Order:* {track_link}\n\n"
            f"*MOXIE*\n_Wear Your Mood._"
        )

        return send_whatsapp_payload(
            recipient_phone=recipient,
            message_type='ORDER_CONFIRMED',
            order=order,
            text_body=message_text,
            template_name=config.get('order_template')
        )
    except Exception as e:
        logger.error(f"Error in send_order_confirmation_whatsapp: {e}")
        return False, str(e)


def send_shipment_whatsapp(order):
    """
    Sends Order Shipped WhatsApp notification when admin saves shipment details.
    """
    try:
        config = get_whatsapp_config()
        recipient = order.shipping_phone
        order_num = order.order_number or f"MX{order.id:04d}"
        customer_name = order.shipping_name or 'Customer'
        courier = "ST Courier" if "ST" in (order.courier_name or "").upper() else ("India Post" if "POST" in (order.courier_name or "").upper() else (order.courier_name or "Express Courier"))
        tracking_no = order.tracking_id or f"TRK{order.id:04d}"
        track_url = f"{config['frontend_url']}/track?tracking={tracking_no}"

        message_text = (
            f"📦 *MOXIE — Your Order Has Shipped*\n\n"
            f"Hi {customer_name},\n\n"
            f"Good news — your MOXIE order *#{order_num}* has been shipped.\n\n"
            f"🚚 *Courier:* {courier}\n"
            f"🔢 *Tracking Number:* {tracking_no}\n"
            f"📍 *Current Status:* Shipped\n"
            f"📅 *Estimated Delivery:* {order.estimated_delivery or '3-5 Business Days'}\n\n"
            f"🔗 *Track your shipment:*\n{track_url}\n\n"
            f"We'll keep you updated until delivery.\n\n"
            f"*MOXIE*\n_Wear Your Mood._"
        )

        return send_whatsapp_payload(
            recipient_phone=recipient,
            message_type='SHIPPED',
            order=order,
            text_body=message_text,
            template_name=config.get('shipped_template')
        )
    except Exception as e:
        logger.error(f"Error in send_shipment_whatsapp: {e}")
        return False, str(e)


def send_out_for_delivery_whatsapp(order):
    """
    Sends Out for Delivery WhatsApp notification.
    """
    try:
        config = get_whatsapp_config()
        recipient = order.shipping_phone
        order_num = order.order_number or f"MX{order.id:04d}"
        customer_name = order.shipping_name or 'Customer'
        courier = "ST Courier" if "ST" in (order.courier_name or "").upper() else ("India Post" if "POST" in (order.courier_name or "").upper() else (order.courier_name or "Courier Partner"))
        tracking_no = order.tracking_id or f"TRK{order.id:04d}"
        track_url = f"{config['frontend_url']}/track?tracking={tracking_no}"

        balance_notice = ""
        if float(order.balance_due or 0) > 0:
            balance_notice = f"\n💵 *Amount Due on Delivery:* ₹{float(order.balance_due):,.2f}\n"

        message_text = (
            f"🚚 *MOXIE — Out for Delivery*\n\n"
            f"Hi {customer_name},\n\n"
            f"Your order *#{order_num}* is *out for delivery today*.\n\n"
            f"📦 *Courier:* {courier}\n"
            f"🔢 *Tracking:* {tracking_no}\n"
            f"{balance_notice}"
            f"Please keep your phone available for the delivery partner.\n\n"
            f"🔗 *Live Tracking:* {track_url}\n\n"
            f"*MOXIE*\n_Wear Your Mood._"
        )

        return send_whatsapp_payload(
            recipient_phone=recipient,
            message_type='OUT_FOR_DELIVERY',
            order=order,
            text_body=message_text,
            template_name=config.get('out_for_delivery_template')
        )
    except Exception as e:
        logger.error(f"Error in send_out_for_delivery_whatsapp: {e}")
        return False, str(e)


def send_delivered_whatsapp(order):
    """
    Sends Order Delivered WhatsApp notification.
    """
    try:
        config = get_whatsapp_config()
        recipient = order.shipping_phone
        order_num = order.order_number or f"MX{order.id:04d}"
        customer_name = order.shipping_name or 'Customer'
        review_url = f"{config['frontend_url']}/my-orders/{order_num}"

        message_text = (
            f"🤍 *MOXIE — Delivered*\n\n"
            f"Hi {customer_name},\n\n"
            f"Your order *#{order_num}* has been *delivered successfully*.\n\n"
            f"We hope you love your purchase! Thank you for choosing MOXIE.\n\n"
            f"⭐ *Rate & Review your items:*\n{review_url}\n\n"
            f"*MOXIE*\n_Wear Your Mood._"
        )

        return send_whatsapp_payload(
            recipient_phone=recipient,
            message_type='DELIVERED',
            order=order,
            text_body=message_text,
            template_name=config.get('delivered_template')
        )
    except Exception as e:
        logger.error(f"Error in send_delivered_whatsapp: {e}")
        return False, str(e)


def retry_whatsapp_notification(notification_log_id):
    """
    Retries sending a previously failed WhatsApp notification.
    """
    try:
        log = NotificationLog.objects.get(id=notification_log_id)
        if not log.order:
            return False, "NO_ORDER_ATTACHED"

        order = log.order
        if log.message_type == 'ORDER_CONFIRMED':
            return send_order_confirmation_whatsapp(order)
        elif log.message_type == 'SHIPPED':
            return send_shipment_whatsapp(order)
        elif log.message_type == 'OUT_FOR_DELIVERY':
            return send_out_for_delivery_whatsapp(order)
        elif log.message_type == 'DELIVERED':
            return send_delivered_whatsapp(order)
        return False, "UNKNOWN_TYPE"
    except NotificationLog.DoesNotExist:
        return False, "LOG_NOT_FOUND"
    except Exception as e:
        return False, str(e)
