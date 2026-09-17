import re
import logging
import os
from django.utils import timezone
from django.conf import settings

logger = logging.getLogger(__name__)

# Canonical Carrier Metadata
COURIER_CONFIG = {
    'ST_COURIER': {
        'code': 'ST_COURIER',
        'display_name': 'ST Courier',
        'tracking_label': 'AWB Number',
        'pattern': r'^(?:ST)?[0-9]{8,14}$',
        'portal_url': 'https://stcourier.com/track',
        'tracking_url_template': 'https://stcourier.com/track?awb={tracking_number}',
    },
    'INDIA_POST': {
        'code': 'INDIA_POST',
        'display_name': 'India Post',
        'tracking_label': 'Consignment / Article Number',
        'pattern': r'^[A-Za-z]{2}\s*[0-9]{9}\s*[A-Za-z]{2}$',
        'portal_url': 'https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx',
        'tracking_url_template': 'https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx',
    }
}

# Normalized Order Status Values
NORMALIZED_STATUS_MAP = {
    'confirmed': 'CONFIRMED',
    'order confirmed': 'CONFIRMED',
    'pending': 'CONFIRMED',
    'placed': 'CONFIRMED',
    'processing': 'PROCESSING',
    'in progress': 'PROCESSING',
    'packed': 'PACKED',
    'packing': 'PACKED',
    'shipped': 'SHIPPED',
    'booked': 'SHIPPED',
    'dispatched': 'SHIPPED',
    'manifested': 'SHIPPED',
    'in transit': 'IN_TRANSIT',
    'in_transit': 'IN_TRANSIT',
    'intransit': 'IN_TRANSIT',
    'reached hub': 'IN_TRANSIT',
    'dispatched to hub': 'IN_TRANSIT',
    'out for delivery': 'OUT_FOR_DELIVERY',
    'out_for_delivery': 'OUT_FOR_DELIVERY',
    'outfordelivery': 'OUT_FOR_DELIVERY',
    'delivered': 'DELIVERED',
    'completed': 'DELIVERED',
    'cancelled': 'CANCELLED',
    'returned': 'RETURNED',
}

STATUS_DISPLAY_NAMES = {
    'CONFIRMED': 'Order Confirmed',
    'PROCESSING': 'Processing',
    'PACKED': 'Packed',
    'SHIPPED': 'Shipped',
    'IN_TRANSIT': 'In Transit',
    'OUT_FOR_DELIVERY': 'Out for Delivery',
    'DELIVERED': 'Delivered',
    'CANCELLED': 'Cancelled',
    'RETURNED': 'Returned',
}


def normalize_courier_code(raw_name):
    """Normalizes carrier input to canonical key: ST_COURIER or INDIA_POST."""
    if not raw_name:
        return 'INDIA_POST'
    clean = str(raw_name).strip().upper().replace(' ', '_').replace('-', '_')
    if 'POST' in clean or 'INDIA' in clean or 'SPEED' in clean or 'ARTICLE' in clean:
        return 'INDIA_POST'
    if 'ST_COURIER' in clean or 'STCOURIER' in clean or clean == 'ST' or clean.startswith('ST_') or 'ST COURIER' in str(raw_name).upper():
        return 'ST_COURIER'
    return clean


def normalize_status(raw_status):
    """Maps arbitrary status text to canonical Moxie status enum."""
    if not raw_status:
        return 'CONFIRMED'
    key = str(raw_status).strip().lower().replace('_', ' ').replace('-', ' ')
    return NORMALIZED_STATUS_MAP.get(key, 'CONFIRMED')


def validate_tracking_number(courier_code, tracking_number):
    """
    Validates and cleans a tracking number according to carrier format.
    Returns (cleaned_tracking_number, is_valid, error_message).
    """
    if not tracking_number:
        return "", False, "Tracking number cannot be empty."

    cleaned = re.sub(r'[\s\-_]', '', str(tracking_number)).upper()
    canonical_code = normalize_courier_code(courier_code)
    cfg = COURIER_CONFIG.get(canonical_code)

    if not cfg:
        return cleaned, True, ""

    pattern = cfg.get('pattern')
    if pattern and not re.match(pattern, cleaned, re.IGNORECASE):
        expected = "8-14 digits (e.g. 12345678901)" if canonical_code == 'ST_COURIER' else "13-character alphanumeric (e.g. EM123456789IN)"
        return cleaned, False, f"Invalid format for {cfg['display_name']}. Expected format: {expected}."

    return cleaned, True, ""


def get_external_carrier_tracking_url(courier_name, tracking_number):
    """Returns the official web tracking link for the carrier."""
    code = normalize_courier_code(courier_name)
    cfg = COURIER_CONFIG.get(code, COURIER_CONFIG['INDIA_POST'])
    if tracking_number:
        return cfg['tracking_url_template'].format(tracking_number=tracking_number)
    return cfg['portal_url']


class CourierTrackingService:
    """
    Carrier adapter interface supporting hybrid tracking (Manual Admin + Live Carrier API fallback).
    Zero scraping rule: Uses approved APIs only if credentials exist; otherwise defaults safely to Admin source.
    """

    @classmethod
    def sync_carrier_status(cls, order):
        """
        Attempts to synchronize carrier tracking if official API credentials exist.
        Returns updated order or current order snapshot.
        """
        if order.tracking_source != 'CARRIER_API' or not order.tracking_id:
            return order

        courier_code = normalize_courier_code(order.courier_name)

        if courier_code == 'INDIA_POST':
            # Check for official India Post API credentials
            api_key = os.environ.get('INDIA_POST_API_KEY', '').strip()
            if not api_key:
                logger.info(f"India Post API credentials not present; using Admin tracking status for order #{order.id}.")
                return order
            # Carrier API integration hook for India Post

        elif courier_code == 'ST_COURIER':
            # Check for official ST Courier API credentials
            api_key = os.environ.get('ST_COURIER_API_KEY', '').strip()
            if not api_key:
                logger.info(f"ST Courier API credentials not present; using Admin tracking status for order #{order.id}.")
                return order
            # Carrier API integration hook for ST Courier

        return order
