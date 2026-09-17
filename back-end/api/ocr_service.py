import re
import logging

logger = logging.getLogger(__name__)


def extract_tracking_from_text(raw_text):
    """
    Extracts candidate tracking number and carrier from raw text string.
    """
    if not raw_text:
        return {'detected_number': '', 'detected_courier': 'INDIA_POST', 'confidence': 'LOW'}

    # 1. Search for India Post Consignment Number (e.g., EM123456789IN, RK987654321IN)
    india_post_match = re.search(r'\b([A-Za-z]{2}\s*\d{9}\s*[A-Za-z]{2})\b', raw_text)
    if india_post_match:
        detected_number = re.sub(r'\s+', '', india_post_match.group(1)).upper()
        return {'detected_number': detected_number, 'detected_courier': 'INDIA_POST', 'confidence': 'HIGH'}

    # 2. Search for ST Courier AWB (e.g., 10-12 digits or ST prefix)
    st_match = re.search(r'\b(ST\d{8,12}|\d{10,12})\b', raw_text, re.IGNORECASE)
    if st_match:
        detected_number = re.sub(r'\s+', '', st_match.group(1)).upper()
        return {'detected_number': detected_number, 'detected_courier': 'ST_COURIER', 'confidence': 'HIGH'}

    return {'detected_number': '', 'detected_courier': 'INDIA_POST', 'confidence': 'LOW'}


def extract_tracking_from_receipt(image_file):
    """
    Extracts candidate tracking numbers from uploaded courier receipt image.
    Uses OCR with regex pattern matching.
    Returns dict with detected candidate, suggested courier, and review guidance.
    """
    raw_text = ""
    try:
        from PIL import Image
        import pytesseract

        img = Image.open(image_file)
        raw_text = pytesseract.image_to_string(img)
    except ImportError:
        logger.info("pytesseract/PIL not available. Scanning text stream if possible.")
    except Exception as e:
        logger.warning(f"OCR processing exception: {e}")

    extracted = extract_tracking_from_text(raw_text)
    detected_number = extracted['detected_number']
    detected_courier = extracted['detected_courier']
    confidence = extracted['confidence']

    if detected_number:
        return {
            'success': True,
            'detected_tracking_number': detected_number,
            'detected_courier': detected_courier,
            'confidence': confidence,
            'message': 'Tracking number detected. Please review and confirm below before saving.'
        }
    else:
        return {
            'success': False,
            'detected_tracking_number': '',
            'detected_courier': 'INDIA_POST',
            'confidence': 'LOW',
            'message': 'Tracking number could not be detected reliably. Please enter it manually.'
        }
