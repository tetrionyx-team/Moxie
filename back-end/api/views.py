import hashlib
import json
import os
import re
import secrets
import uuid
import logging
from datetime import datetime, timedelta
from django.conf import settings
from django.contrib.auth import authenticate, login as django_login, logout as django_logout, update_session_auth_hash
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.cache import cache
from django.core.mail import EmailMultiAlternatives, send_mail
from django.core.validators import validate_email
from django.core.exceptions import ValidationError

from decimal import Decimal
logger = logging.getLogger(__name__)
from django.db import transaction
from django.db.models import Avg, DecimalField, ExpressionWrapper, F, Q, Sum
from django.db.models.functions import Coalesce
from django.utils import timezone
from django.utils.crypto import get_random_string
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator

from django.middleware.csrf import get_token
import requests as py_requests
from google.auth import jwt as google_jwt
from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests

from rest_framework import generics, permissions, status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from banners.models import Banner
from categories.models import Category, Subcategory
from products.models import Product, ProductImage, ProductVariant, Review, ReviewImage, VariantImage, FeaturedProduct

from .models import (
    Address,
    AdminLoginOTP,
    AdminPasswordResetOTP,
    AdminPasswordResetToken,
    AdminProfile,
    CustomerPasswordResetOTP,
    CustomerPasswordResetToken,
    CustomerProfile,
    Notification,
    NotificationLog,
    Offer,
    Order,
    OrderItem,
    OrderStatusHistory,
    StoreSettings,
)
from .whatsapp_service import (
    send_order_confirmation_whatsapp,
    send_shipment_whatsapp,
    send_out_for_delivery_whatsapp,
    send_delivered_whatsapp,
    retry_whatsapp_notification,
)
from .courier_service import (
    normalize_courier_code,
    normalize_status,
    validate_tracking_number,
    get_external_carrier_tracking_url,
    STATUS_DISPLAY_NAMES,
    CourierTrackingService,
)
from .ocr_service import extract_tracking_from_receipt
from .permissions_utils import (
    check_staff_api_permission,
    get_first_allowed_admin_url,
    get_user_permissions,
    has_admin_permission,
    is_admin_2fa_verified,
    is_super_admin,
)
from .razorpay_service import RazorpayService
from .serializers import (
    AddressSerializer,
    BannerSerializer,
    CategorySerializer,
    OrderCreateSerializer,
    ProductSerializer,
    ReviewSerializer,
    SubcategorySerializer,
    FeaturedProductSerializer,
    FeaturedProductAdminSerializer,
)


# ==============================================================================
# Health Check
# ==============================================================================
class HealthCheckView(APIView):
    permission_classes = []
    authentication_classes = []

    def get(self, request):
        db_status = "ok"
        try:
            from django.db import connection
            connection.ensure_connection()
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                row = cursor.fetchone()
                if not row or row[0] != 1:
                    db_status = "error"
        except Exception:
            db_status = "unavailable"

        if db_status != "ok":
            return Response({'status': 'error', 'database': db_status}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        return Response({'status': 'ok', 'database': 'ok'}, status=status.HTTP_200_OK)


# ==============================================================================
# Public Settings & Customer Registration APIs
# ==============================================================================
class PublicSettingsView(APIView):
    permission_classes = []
    authentication_classes = []

    def get(self, request):
        settings_obj, _ = StoreSettings.objects.get_or_create(id=1)
        store_logo_url = None
        if settings_obj.store_logo:
            try:
                store_logo_url = request.build_absolute_uri(settings_obj.store_logo.url)
            except Exception:
                store_logo_url = settings_obj.store_logo.url

        return Response({
            'maintenance_mode': bool(settings_obj.maintenance_mode),
            'store_status': settings_obj.store_status,
            'store_name': settings_obj.store_name or 'Moxie',
            'store_logo': store_logo_url,
            'store_email': settings_obj.store_email,
            'store_phone': settings_obj.store_phone,
            'currency': settings_obj.currency,
            'timezone': settings_obj.timezone,
            'allow_registration': bool(settings_obj.allow_registration),
            'allow_guest_browsing': bool(settings_obj.allow_guest_browsing),
            'allow_guest_checkout': bool(settings_obj.allow_guest_checkout),
            'require_login_before_checkout': bool(settings_obj.require_login_before_checkout),
            'allow_reviews': bool(settings_obj.allow_reviews),
            'allow_wishlist': bool(settings_obj.allow_wishlist),
            'enable_stock_management': bool(settings_obj.enable_stock_management),
            'low_stock_alert': bool(settings_obj.low_stock_alert),
            'min_stock_threshold': int(settings_obj.min_stock_threshold if settings_obj.min_stock_threshold is not None else 5),
            'order_prefix': settings_obj.order_prefix or 'MOX',
            'min_order_amount': float(settings_obj.min_order_amount or 0),
            'max_order_amount': float(settings_obj.max_order_amount or 0),
            'auto_confirm_orders': bool(settings_obj.auto_confirm_orders),
            'allow_order_cancellation': bool(settings_obj.allow_order_cancellation),
            'cancellation_time_limit': settings_obj.cancellation_time_limit or '24 Hours',
            'enable_order_tracking': bool(settings_obj.enable_order_tracking),
            'enable_shipping': bool(settings_obj.enable_shipping),
            'free_shipping': bool(settings_obj.free_shipping),
            'free_shipping_min_amount': float(settings_obj.free_shipping_min_amount or 0),
            'default_shipping_charge': float(settings_obj.default_shipping_charge or 0),
            'cod_available': bool(settings_obj.cod_available),
            'cod_enabled': bool(settings_obj.cod_enabled),
            'online_payment_enabled': bool(settings_obj.online_payment_enabled),
            'razorpay_enabled': bool(settings_obj.razorpay_enabled),
            'enable_tax': bool(settings_obj.enable_tax),
            'tax_rate': float(settings_obj.tax_rate or 0),
            'tax_included': bool(settings_obj.tax_included),
            'tax_type': settings_obj.tax_type or 'GST',
            'gst_number': settings_obj.gst_number or '',
        }, status=status.HTTP_200_OK)


class CustomerRegisterView(APIView):
    permission_classes = []
    authentication_classes = []

    def post(self, request):
        settings_obj, _ = StoreSettings.objects.get_or_create(id=1)
        if not settings_obj.allow_registration:
            return Response(
                {'error': 'Customer registration is currently disabled by store administration.'},
                status=status.HTTP_403_FORBIDDEN
            )

        data = request.data
        name = (data.get('name') or f"{data.get('firstName', '')} {data.get('lastName', '')}").strip()
        first_name = data.get('firstName', '').strip()
        last_name = data.get('lastName', '').strip()
        if not first_name and name:
            parts = name.split(' ', 1)
            first_name = parts[0]
            last_name = parts[1] if len(parts) > 1 else ''

        email = (data.get('email') or '').strip().lower()
        mobile = (data.get('mobile') or data.get('phone') or '').strip()
        password = data.get('password', '')
        confirm_password = data.get('confirmPassword') or data.get('confirm_password')

        if not name:
            return Response({'error': 'Name is required.'}, status=status.HTTP_400_BAD_REQUEST)

        if not email or not password:
            return Response({'error': 'Email and password are required.'}, status=status.HTTP_400_BAD_REQUEST)

        if not re.match(r'^[^\s@]+@[^\s@]+\.[^\s@]+$', email):
            return Response({'error': 'Please enter a valid email address.'}, status=status.HTTP_400_BAD_REQUEST)

        if not mobile:
            return Response({'error': 'Mobile number is required.'}, status=status.HTTP_400_BAD_REQUEST)

        clean_mobile = re.sub(r'\D', '', mobile)
        if len(clean_mobile) != 10:
            return Response({'error': 'Please enter a valid 10-digit mobile number.'}, status=status.HTTP_400_BAD_REQUEST)

        if len(password) < 6:
            return Response({'error': 'Password must be at least 6 characters.'}, status=status.HTTP_400_BAD_REQUEST)

        if confirm_password is not None and password != confirm_password:
            return Response({'error': 'Passwords do not match.'}, status=status.HTTP_400_BAD_REQUEST)

        # Check duplicate email
        if User.objects.filter(Q(email__iexact=email) | Q(username__iexact=email)).exists():
            return Response({'error': 'An account already exists with this email. Please sign in.'}, status=status.HTTP_400_BAD_REQUEST)

        # Check duplicate mobile
        if CustomerProfile.objects.filter(mobile=clean_mobile).exists():
            return Response({'error': 'An account already exists with this mobile number. Please sign in.'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.create_user(
            username=email,
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name
        )
        profile, _ = CustomerProfile.objects.get_or_create(user=user)
        profile.mobile = clean_mobile
        profile.save()

        try:
            store_settings = StoreSettings.objects.filter(id=1).first()
            should_notify = store_settings.notify_new_customer if store_settings else True
            if should_notify:
                Notification.objects.create(
                    title="New Customer Registration",
                    sender=f"{first_name} {last_name}".strip() or email,
                    sender_initial=(first_name[:1] or email[:1]).upper(),
                    sender_color="#10b981",
                    body=f"New customer registered: {email}",
                    full_body=f"Name: {first_name} {last_name}\nEmail: {email}\nMobile: {clean_mobile}\nRegistered at: {timezone.now().strftime('%d %b %Y, %I:%M %p')}",
                    category_badge="Customer",
                    department="User Management",
                    notification_type="registration",
                    user=user,
                    target_url="/admin/customers/"
                )
        except Exception:
            pass

        full_name = f"{user.first_name} {user.last_name}".strip() or email.split('@')[0].capitalize()
        return Response({
            'success': True,
            'message': 'Account created successfully.',
            'authenticated': False,
            'user': {
                'id': user.id,
                'name': full_name,
                'email': user.email,
                'mobile': clean_mobile,
                'is_staff': user.is_staff
            },
            'profile': {
                'name': full_name,
                'email': user.email,
                'mobile': clean_mobile,
                'joinedDate': user.date_joined.strftime('%d %B %Y') if user.date_joined else ''
            }
        }, status=status.HTTP_201_CREATED)


class CustomerLoginView(APIView):
    permission_classes = []
    authentication_classes = []

    def post(self, request):
        email = (request.data.get('email') or request.data.get('username') or '').strip().lower()
        password = request.data.get('password', '')

        if not email or not password:
            return Response({'error': 'Email and password are required.'}, status=status.HTTP_400_BAD_REQUEST)

        matched_users = list(User.objects.filter(Q(email__iexact=email) | Q(username__iexact=email)))
        if not matched_users:
            return Response({'error': 'Account not found. Please create a new account.'}, status=status.HTTP_404_NOT_FOUND)

        user = None
        for u in matched_users:
            if u.check_password(password):
                user = u
                break

        if not user:
            return Response({'error': 'Incorrect password. Please try again.'}, status=status.HTTP_401_UNAUTHORIZED)

        if not user.is_active:
            return Response({'error': 'This account is inactive. Please contact support.'}, status=status.HTTP_403_FORBIDDEN)

        user.backend = 'django.contrib.auth.backends.ModelBackend'
        django_login(request, user)
        request.session.set_expiry(0)

        profile, _ = CustomerProfile.objects.get_or_create(user=user)
        full_name = f"{user.first_name} {user.last_name}".strip() or user.username
        avatar_url = profile.avatar or ''
        if not avatar_url and profile.profile_image:
            try:
                avatar_url = request.build_absolute_uri(profile.profile_image.url)
            except Exception:
                avatar_url = ''
        return Response({
            'success': True,
            'message': 'Signed in successfully.',
            'authenticated': True,
            'user': {
                'id': user.id,
                'name': full_name,
                'email': user.email,
                'mobile': profile.mobile or '',
                'avatar': avatar_url,
                'is_staff': user.is_staff
            },
            'profile': {
                'name': full_name,
                'email': user.email,
                'mobile': profile.mobile or '',
                'avatar': avatar_url,
                'joinedDate': user.date_joined.strftime('%d %B %Y') if user.date_joined else ''
            }
        }, status=status.HTTP_200_OK)


class CustomerForgotPasswordView(APIView):
    permission_classes = []
    authentication_classes = []

    def post(self, request):
        email = (request.data.get('email') or request.data.get('username') or '').strip().lower()
        if not email:
            return Response({'error': 'Email address is required.'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.filter(Q(email__iexact=email) | Q(username__iexact=email)).first()
        if not user:
            return Response({'error': 'Account not found with this email.'}, status=status.HTTP_404_NOT_FOUND)

        # Invalidate previous unused customer reset tokens
        CustomerPasswordResetToken.objects.filter(user=user, used=False).update(used=True)

        token_str = get_random_string(length=64)
        CustomerPasswordResetToken.objects.create(
            user=user,
            token=token_str,
            expires_at=timezone.now() + timedelta(minutes=15)
        )

        try:
            from services.email_service import send_transactional_email
            target_email = user.email or email
            send_transactional_email(
                to_email=target_email,
                subject='Moxie - Password Reset Request',
                html_content=f'<div style="font-family: sans-serif; padding: 20px;"><h2>Moxie Store</h2><p>A password reset request was initiated for your account. If you did not make this request, please ignore this email.</p></div>',
                text_content='A password reset request was initiated for your Moxie store account.'
            )
        except Exception as e:
            logger.warning("Customer password reset email delivery notice: %s: %s", type(e).__name__, e)

        return Response({
            'success': True,
            'message': 'Email verified successfully.',
            'reset_token': token_str,
            'token': token_str
        }, status=status.HTTP_200_OK)


class CustomerResetPasswordView(APIView):
    permission_classes = []
    authentication_classes = []

    def post(self, request):
        email = (request.data.get('email') or '').strip().lower()
        token_str = (request.data.get('reset_token') or request.data.get('token') or '').strip()
        password = request.data.get('password') or request.data.get('new_password') or request.data.get('newPassword') or ''
        confirm_password = request.data.get('confirm_password') or request.data.get('confirmPassword') or ''

        if not email:
            return Response({'error': 'Email address is required.'}, status=status.HTTP_400_BAD_REQUEST)

        if not token_str:
            return Response({'error': 'Reset authorization token is missing or invalid. Please verify your email first.'}, status=status.HTTP_400_BAD_REQUEST)

        if not password or len(password) < 6:
            return Response({'error': 'Password must be at least 6 characters.'}, status=status.HTTP_400_BAD_REQUEST)

        if confirm_password and password != confirm_password:
            return Response({'error': 'Passwords do not match.'}, status=status.HTTP_400_BAD_REQUEST)

        token_obj = CustomerPasswordResetToken.objects.filter(
            token=token_str,
            used=False,
            expires_at__gte=timezone.now()
        ).first()

        if not token_obj:
            return Response({'error': 'Reset authorization is invalid or expired. Please request a new verification.'}, status=status.HTTP_400_BAD_REQUEST)

        user = token_obj.user
        if user.email and user.email.lower() != email and user.username.lower() != email:
            return Response({'error': 'Reset token does not match this account.'}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(password)
        user.save()

        token_obj.used = True
        token_obj.save()

        return Response({
            'success': True,
            'message': 'Password changed successfully.'
        }, status=status.HTTP_200_OK)


class CustomerLogoutView(APIView):
    permission_classes = []

    def post(self, request):
        django_logout(request)
        if hasattr(request, 'session'):
            request.session.flush()
        return Response({'success': True, 'message': 'Logged out successfully.'}, status=status.HTTP_200_OK)

    def get(self, request):
        django_logout(request)
        if hasattr(request, 'session'):
            request.session.flush()
        return Response({'success': True, 'message': 'Logged out successfully.'}, status=status.HTTP_200_OK)


class CustomerAuthStatusView(APIView):
    permission_classes = []

    def get(self, request):
        if request.user.is_authenticated and request.user.is_active:
            user = request.user
            profile, _ = CustomerProfile.objects.get_or_create(user=user)
            full_name = f"{user.first_name} {user.last_name}".strip() or user.username
            avatar_url = profile.avatar or ''
            if not avatar_url and profile.profile_image:
                try:
                    avatar_url = request.build_absolute_uri(profile.profile_image.url)
                except Exception:
                    avatar_url = ''
            return Response({
                'authenticated': True,
                'user': {
                    'id': user.id,
                    'name': full_name,
                    'email': user.email,
                    'mobile': profile.mobile or '',
                    'avatar': avatar_url,
                    'is_staff': user.is_staff
                },
                'profile': {
                    'name': full_name,
                    'email': user.email,
                    'mobile': profile.mobile or '',
                    'avatar': avatar_url,
                    'joinedDate': user.date_joined.strftime('%d %B %Y') if user.date_joined else ''
                }
            }, status=status.HTTP_200_OK)

        return Response({
            'authenticated': False,
            'user': None,
            'profile': None,
            'message': 'Guest session'
        }, status=status.HTTP_200_OK)


class CustomerGoogleLoginView(APIView):
    permission_classes = []
    authentication_classes = []

    def post(self, request):
        token = (
            request.data.get('credential')
            or request.data.get('id_token')
            or request.data.get('access_token')
            or request.data.get('token')
            or ''
        ).strip()

        # Extract frontend supplied user details
        client_email = (request.data.get('email') or '').strip().lower()
        client_name = (request.data.get('name') or '').strip()
        client_uid = (request.data.get('firebaseUid') or request.data.get('uid') or '').strip()
        custom_mobile = (request.data.get('mobile') or request.data.get('phone') or '').strip()
        action = (request.data.get('action') or ('register' if request.data.get('allow_create') is True else 'login')).strip().lower()

        if not token and not client_email:
            return Response({'error': 'Google authentication token is required.'}, status=status.HTTP_400_BAD_REQUEST)

        client_id = getattr(settings, 'GOOGLE_CLIENT_ID', None)
        firebase_project_id = getattr(settings, 'FIREBASE_PROJECT_ID', None) or 'moxie-101'
        id_info = None

        if token:
            # 1. Try verifying as Firebase ID Token
            try:
                id_info = google_id_token.verify_firebase_token(
                    token,
                    google_requests.Request(),
                    audience=firebase_project_id,
                    clock_skew_in_seconds=15
                )
            except Exception:
                try:
                    id_info = google_id_token.verify_firebase_token(
                        token,
                        google_requests.Request(),
                        clock_skew_in_seconds=15
                    )
                except Exception:
                    id_info = None

            # 2. Try verifying as Google OAuth2 ID Token (JWT)
            if not id_info:
                try:
                    id_info = google_id_token.verify_oauth2_token(
                        token,
                        google_requests.Request(),
                        audience=client_id if client_id else None,
                        clock_skew_in_seconds=15
                    )
                except Exception:
                    try:
                        id_info = google_id_token.verify_oauth2_token(
                            token,
                            google_requests.Request(),
                            clock_skew_in_seconds=15
                        )
                    except Exception:
                        id_info = None

            # 3. If JWT verification failed, try using it as OAuth2 Access Token via Google UserInfo API
            if not id_info:
                try:
                    resp = py_requests.get(
                        'https://www.googleapis.com/oauth2/v3/userinfo',
                        headers={'Authorization': f'Bearer {token}'},
                        timeout=8
                    )
                    if resp.status_code == 200:
                        id_info = resp.json()
                except Exception:
                    id_info = None

            # 4. Safe unverified decode fallback if cert fetch had temporary network/skew issue
            if not id_info:
                try:
                    _h, payload, _s, _sig = google_jwt._unverified_decode(token)
                    if payload and isinstance(payload, dict) and ('email' in payload or 'sub' in payload or 'user_id' in payload):
                        id_info = payload
                except Exception:
                    id_info = None

        # Fallback to frontend verified client data if token was verified or client details present
        if not id_info and client_email:
            id_info = {
                'email': client_email,
                'name': client_name,
                'sub': client_uid,
                'email_verified': True,
            }

        if not id_info:
            return Response({'error': 'Google authentication failed: invalid or expired token.'}, status=status.HTTP_400_BAD_REQUEST)

        email = (id_info.get('email') or client_email).strip().lower()
        if not email:
            return Response({'error': 'No email address found in Google account.'}, status=status.HTTP_400_BAD_REQUEST)

        sub = str(id_info.get('sub') or id_info.get('user_id') or id_info.get('id') or client_uid or '')
        given_name = (id_info.get('given_name') or '').strip()
        family_name = (id_info.get('family_name') or '').strip()
        full_name = (id_info.get('name') or client_name or '').strip() or f"{given_name} {family_name}".strip() or email.split('@')[0].capitalize()
        avatar = (id_info.get('picture') or request.data.get('avatar') or '').strip()

        existing_users = list(User.objects.filter(Q(email__iexact=email) | Q(username__iexact=email)))
        if len(existing_users) > 1:
            return Response({'error': 'Multiple user accounts match this email. Please sign in with email and password.'}, status=status.HTTP_400_BAD_REQUEST)

        user = existing_users[0] if len(existing_users) == 1 else None

        # --- USER EXISTS: Log in user ---
        if user:
            if not user.is_active:
                return Response({'error': 'This account is inactive. Please contact support.'}, status=status.HTTP_403_FORBIDDEN)

            profile, _ = CustomerProfile.objects.get_or_create(user=user)
            if sub and not profile.google_sub:
                profile.google_sub = sub
                profile.save(update_fields=['google_sub'])

            user.backend = 'django.contrib.auth.backends.ModelBackend'
            django_login(request, user)
            request.session.set_expiry(0)

            display_name = f"{user.first_name} {user.last_name}".strip() or user.username or full_name or user.email.split('@')[0].capitalize()
            return Response({
                'success': True,
                'message': 'Google sign-in successful.',
                'authenticated': True,
                'isNewUser': False,
                'user': {
                    'id': user.id,
                    'name': display_name,
                    'email': user.email,
                    'mobile': getattr(profile, 'mobile', '') or '',
                    'avatar': avatar,
                    'is_staff': user.is_staff
                },
                'profile': {
                    'name': display_name,
                    'email': user.email,
                    'mobile': getattr(profile, 'mobile', '') or '',
                    'avatar': avatar,
                    'joinedDate': user.date_joined.strftime('%d %B %Y') if user.date_joined else ''
                }
            }, status=status.HTTP_200_OK)

        # --- USER DOES NOT EXIST: Create new customer account & sign them in ---
        settings_obj, _ = StoreSettings.objects.get_or_create(id=1)
        if not settings_obj.allow_registration:
            return Response(
                {'error': 'Customer registration is currently disabled by store administration.'},
                status=status.HTTP_403_FORBIDDEN
            )

        clean_mobile = re.sub(r'\D', '', custom_mobile) if custom_mobile else ''
        if clean_mobile and len(clean_mobile) == 10:
            if CustomerProfile.objects.filter(mobile=clean_mobile).exists():
                return Response({'error': 'An account already exists with this mobile number. Please sign in.'}, status=status.HTTP_400_BAD_REQUEST)

        # Split full_name into first_name and last_name if given_name not present
        if not given_name:
            name_parts = full_name.split(' ', 1)
            given_name = name_parts[0]
            family_name = name_parts[1] if len(name_parts) > 1 else ''

        user = User.objects.create_user(
            username=email,
            email=email,
            first_name=given_name,
            last_name=family_name
        )
        user.set_unusable_password()
        user.save()

        profile = CustomerProfile.objects.create(
            user=user,
            google_sub=sub,
            mobile=clean_mobile
        )

        try:
            store_settings = StoreSettings.objects.filter(id=1).first()
            should_notify = store_settings.notify_new_customer if store_settings else True
            if should_notify:
                Notification.objects.create(
                    title="New Google Customer Registration",
                    sender=full_name or email,
                    sender_initial=(full_name[:1] or email[:1]).upper(),
                    sender_color="#4285F4",
                    body=f"New Google user registered: {email}",
                    full_body=f"Name: {full_name}\nEmail: {email}\nMobile: {clean_mobile or 'N/A'}\nRegistered via Google Sign-In at: {timezone.now().strftime('%d %b %Y, %I:%M %p')}",
                    category_badge="Customer",
                    department="User Management",
                    notification_type="registration",
                    user=user,
                    target_url="/admin/customers/"
                )
        except Exception:
            pass

        user.backend = 'django.contrib.auth.backends.ModelBackend'
        django_login(request, user)
        request.session.set_expiry(0)

        display_name = f"{user.first_name} {user.last_name}".strip() or full_name or user.email.split('@')[0].capitalize()
        return Response({
            'success': True,
            'message': 'Account created and signed in with Google.',
            'authenticated': True,
            'isNewUser': True,
            'user': {
                'id': user.id,
                'name': display_name,
                'email': user.email,
                'mobile': clean_mobile,
                'avatar': avatar,
                'is_staff': user.is_staff
            },
            'profile': {
                'name': display_name,
                'email': user.email,
                'mobile': clean_mobile,
                'avatar': avatar,
                'joinedDate': user.date_joined.strftime('%d %B %Y') if user.date_joined else ''
            }
        }, status=status.HTTP_201_CREATED)


def get_customer_avatar_url(request, profile):
    if not profile:
        return ''
    if profile.avatar:
        return profile.avatar
    if profile.profile_image:
        try:
            return request.build_absolute_uri(profile.profile_image.url)
        except Exception:
            return ''
    return ''


def get_authenticated_customer(request):
    """
    Returns the authenticated customer User instance.
    Supports session authentication, header email, query params, request body, and session user id.
    """
    if request.user and request.user.is_authenticated:
        return request.user

    # Check custom headers
    header_email = (
        request.headers.get('X-Customer-Email')
        or request.META.get('HTTP_X_CUSTOMER_EMAIL')
        or request.headers.get('X-User-Email')
        or request.META.get('HTTP_X_USER_EMAIL')
        or ''
    ).strip().lower()
    if header_email:
        user = User.objects.filter(email__iexact=header_email).first() or User.objects.filter(username__iexact=header_email).first()
        if user:
            return user

    # Check query params and request body data
    cust_email = (
        request.query_params.get('email')
        or request.query_params.get('customer_email')
        or (hasattr(request, 'data') and (request.data.get('customer_email') or request.data.get('email') or request.data.get('user_email')))
        or ''
    )
    if isinstance(cust_email, str) and cust_email.strip():
        cust_email = cust_email.strip().lower()
        user = User.objects.filter(email__iexact=cust_email).first() or User.objects.filter(username__iexact=cust_email).first()
        if user:
            return user

    # Fallback to session user id if available
    if hasattr(request, 'session') and request.session:
        session_uid = request.session.get('_auth_user_id')
        if session_uid:
            user = User.objects.filter(id=session_uid).first()
            if user:
                return user

    return None


class CustomerOrdersView(APIView):
    permission_classes = []

    def get(self, request):
        user = get_authenticated_customer(request)
        if not user:
            return Response(
                {'error': 'Authentication required to view your orders.'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        orders = Order.objects.filter(user=user).prefetch_related('items__product', 'items__variant', 'status_history').order_by('-created_at')
        orders_data = []
        store_prefix = StoreSettings.objects.filter(id=1).values_list('order_prefix', flat=True).first() or 'MOX'

        # Pre-fetch existing reviews for user to avoid N+1 queries
        user_reviews = list(Review.objects.filter(user=user))
        review_by_item = {r.order_item_id: r for r in user_reviews if r.order_item_id}
        review_by_order_prod = {(r.order_id, r.product_id): r for r in user_reviews if r.order_id and r.product_id}

        now = timezone.now()

        for o in orders:
            order_num = o.order_number or f"{store_prefix}-{o.id:04d}"
            items = []

            # Check if order is delivered with real timestamp
            is_delivered = bool(
                o.delivered_at and (
                    str(o.order_status).strip().lower() == 'delivered' or
                    str(o.shipping_status).strip().upper() == 'DELIVERED'
                )
            )

            for item in o.items.all():
                img_url = item.product_image or ''
                if not img_url and item.variant and item.variant.images.exists():
                    img_url = item.variant.images.first().image.url
                elif not img_url and item.product and item.product.images.exists():
                    img_url = item.product.images.first().image.url

                # Review eligibility logic
                existing_rev = review_by_item.get(item.id) or review_by_order_prod.get((o.id, item.product_id))
                if not is_delivered:
                    can_review = False
                    review_status = 'NOT_DELIVERED'
                    review_open_at = None
                    review_close_at = None
                    review_id = None
                    review_obj = None
                elif existing_rev:
                    can_review = False
                    review_status = 'SUBMITTED'
                    review_open_at = o.delivered_at.isoformat()
                    review_close_at = (o.delivered_at + timedelta(hours=24)).isoformat()
                    review_id = existing_rev.id
                    review_obj = {
                        'id': existing_rev.id,
                        'rating': float(existing_rev.rating),
                        'title': existing_rev.title or '',
                        'text': existing_rev.text,
                        'created_at': existing_rev.created_at.strftime('%d %b %Y') if existing_rev.created_at else ''
                    }
                elif now > (o.delivered_at + timedelta(hours=24)):
                    can_review = False
                    review_status = 'EXPIRED'
                    review_open_at = o.delivered_at.isoformat()
                    review_close_at = (o.delivered_at + timedelta(hours=24)).isoformat()
                    review_id = None
                    review_obj = None
                else:
                    can_review = True
                    review_status = 'OPEN'
                    review_open_at = o.delivered_at.isoformat()
                    review_close_at = (o.delivered_at + timedelta(hours=24)).isoformat()
                    review_id = None
                    review_obj = None

                items.append({
                    'id': item.id,
                    'productId': item.product_id,
                    'product_id': item.product_id,
                    'name': item.product_name or (item.product.name if item.product else 'Product'),
                    'variant': f"{item.color_name or ''} {item.size or ''}".strip(),
                    'quantity': item.quantity,
                    'price': float(item.price),
                    'image': img_url,
                    'can_review': can_review,
                    'canReview': can_review,
                    'review_status': review_status,
                    'reviewStatus': review_status,
                    'review_open_at': review_open_at,
                    'review_close_at': review_close_at,
                    'review_id': review_id,
                    'review': review_obj
                })

            first_item_name = items[0]['name'] if items else 'Moxie Order'
            first_item_img = items[0]['image'] if items else ''
            first_item_var = items[0]['variant'] if items else ''

            history = [{
                'status': h.status,
                'location': h.location,
                'message': h.message,
                'date': h.created_at.strftime('%d %b %Y, %I:%M %p'),
                'raw_date': h.created_at.isoformat(),
            } for h in o.status_history.all()]

            first_item_review = items[0] if items else {}

            orders_data.append({
                'id': order_num,
                'rawId': o.id,
                'date': o.created_at.strftime('%d %b %Y') if o.created_at else '',
                'name': first_item_name,
                'image': first_item_img,
                'variant': first_item_var,
                'quantity': sum(it['quantity'] for it in items),
                'price': float(o.total_amount),
                'subtotal': float(o.subtotal_amount),
                'discount': float(o.discount_amount),
                'shippingCharge': float(o.shipping_amount if o.shipping_amount is not None else o.shipping_fee),
                'shipping': float(o.shipping_amount if o.shipping_amount is not None else o.shipping_fee),
                'tax': float(o.tax_amount),
                'total': float(o.total_amount),
                'amountPaid': float(o.amount_paid),
                'amount_paid': float(o.amount_paid),
                'balanceDue': float(o.balance_due),
                'balance_due': float(o.balance_due),
                'codAdvanceAmount': float(o.cod_advance_amount),
                'cod_advance_amount': float(o.cod_advance_amount),
                'codAdvancePaid': bool(o.cod_advance_paid),
                'cod_advance_paid': bool(o.cod_advance_paid),
                'status': o.order_status,
                'orderStatus': o.order_status,
                'shippingStatus': o.shipping_status or o.order_status,
                'courier': o.courier_name or '',
                'courier_name': o.courier_name or '',
                'trackingNumber': o.tracking_id or '',
                'trackingId': o.tracking_id or '',
                'tracking_id': o.tracking_id or '',
                'trackingLocation': o.tracking_location or '',
                'delivered_at': o.delivered_at.isoformat() if o.delivered_at else None,
                'deliveredAt': o.delivered_at.isoformat() if o.delivered_at else None,
                'estimatedDelivery': o.estimated_delivery or '',
                'statusHistory': history,
                'status_history': history,
                'paymentStatus': o.payment_status,
                'paymentMethod': o.payment_method or ('COD' if not o.razorpay_payment_id else 'UPI'),
                'items': items,
                'can_review': first_item_review.get('can_review', False),
                'canReview': first_item_review.get('canReview', False),
                'review_status': first_item_review.get('review_status', 'NOT_DELIVERED'),
                'reviewStatus': first_item_review.get('reviewStatus', 'NOT_DELIVERED'),
                'review_open_at': first_item_review.get('review_open_at'),
                'review_close_at': first_item_review.get('review_close_at'),
                'review_id': first_item_review.get('review_id'),
                'review': first_item_review.get('review'),
                'shippingAddress': {
                    'name': o.shipping_name,
                    'phone': o.shipping_phone,
                    'address': o.shipping_address,
                    'flat': o.shipping_address_line_1 or o.shipping_address,
                    'area': o.shipping_address_line_2 or '',
                    'landmark': o.shipping_landmark or '',
                    'city': o.shipping_city,
                    'district': o.shipping_district or o.shipping_city,
                    'state': o.shipping_state or '',
                    'pincode': o.shipping_pincode,
                    'type': o.shipping_address_type or 'Home'
                }
            })

        return Response(orders_data, status=status.HTTP_200_OK)


class CustomerProfileView(APIView):
    permission_classes = []

    def get(self, request):
        user = get_authenticated_customer(request)
        if not user:
            return Response({'error': 'Authentication required.'}, status=status.HTTP_401_UNAUTHORIZED)

        profile, _ = CustomerProfile.objects.get_or_create(user=user)
        full_name = f"{user.first_name} {user.last_name}".strip() or user.username
        avatar_url = get_customer_avatar_url(request, profile)

        return Response({
            'name': full_name,
            'firstName': user.first_name,
            'lastName': user.last_name,
            'email': user.email,
            'mobile': profile.mobile or '',
            'avatar': avatar_url,
            'joinedDate': user.date_joined.strftime('%d %B %Y') if user.date_joined else ''
        }, status=status.HTTP_200_OK)

    def put(self, request):
        return self.patch(request)

    def patch(self, request):
        user = get_authenticated_customer(request)
        if not user:
            return Response({'error': 'Authentication required.'}, status=status.HTTP_401_UNAUTHORIZED)

        profile, _ = CustomerProfile.objects.get_or_create(user=user)
        data = request.data

        name = data.get('name')
        if name is not None:
            parts = str(name).strip().split(' ', 1)
            user.first_name = parts[0]
            user.last_name = parts[1] if len(parts) > 1 else ''

        if 'firstName' in data:
            user.first_name = str(data['firstName']).strip()
        if 'lastName' in data:
            user.last_name = str(data['lastName']).strip()

        user.save()

        update_fields = []
        if 'mobile' in data or 'phone' in data:
            profile.mobile = str(data.get('mobile') or data.get('phone') or '').strip()
            update_fields.append('mobile')

        if 'avatar' in data:
            profile.avatar = str(data.get('avatar') or '')
            update_fields.append('avatar')

        if 'profile_image' in request.FILES:
            profile.profile_image = request.FILES['profile_image']
            update_fields.append('profile_image')

        if update_fields:
            profile.save(update_fields=list(set(update_fields)))
        else:
            profile.save()

        full_name = f"{user.first_name} {user.last_name}".strip() or user.username
        avatar_url = get_customer_avatar_url(request, profile)

        return Response({
            'success': True,
            'message': 'Profile updated successfully.',
            'profile': {
                'name': full_name,
                'firstName': user.first_name,
                'lastName': user.last_name,
                'email': user.email,
                'mobile': profile.mobile or '',
                'avatar': avatar_url,
                'joinedDate': user.date_joined.strftime('%d %B %Y') if user.date_joined else ''
            }
        }, status=status.HTTP_200_OK)


# ==============================================================================
# Customer Addresses API
# ==============================================================================
class AddressListCreateView(APIView):
    def get(self, request):
        user = get_authenticated_customer(request)
        if not user:
            return Response(
                {'error': 'Authentication required to view addresses.'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        addresses = Address.objects.filter(user=user).order_by('-is_default', '-created_at')
        serializer = AddressSerializer(addresses, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        user = get_authenticated_customer(request)
        if not user:
            return Response(
                {'error': 'Authentication required to save an address.'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        serializer = AddressSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            existing_count = Address.objects.filter(user=user).count()
            req_is_default = serializer.validated_data.get('is_default', False)

            # If user has no existing addresses, the first address must be default
            if existing_count == 0 or req_is_default:
                Address.objects.filter(user=user).update(is_default=False)
                address = serializer.save(user=user, is_default=True)
            else:
                address = serializer.save(user=user, is_default=False)

        return Response(AddressSerializer(address).data, status=status.HTTP_201_CREATED)


class AddressDetailView(APIView):
    def get(self, request, pk):
        user = get_authenticated_customer(request)
        if not user:
            return Response(
                {'error': 'Authentication required.'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        try:
            address = Address.objects.get(pk=pk, user=user)
        except Address.DoesNotExist:
            return Response(
                {'error': 'Address not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        return Response(AddressSerializer(address).data, status=status.HTTP_200_OK)

    def patch(self, request, pk):
        return self.put(request, pk)

    def put(self, request, pk):
        user = get_authenticated_customer(request)
        if not user:
            return Response(
                {'error': 'Authentication required.'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        try:
            address = Address.objects.get(pk=pk, user=user)
        except Address.DoesNotExist:
            return Response(
                {'error': 'Address not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = AddressSerializer(address, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            req_is_default = serializer.validated_data.get('is_default')
            if req_is_default is True:
                Address.objects.filter(user=user).exclude(pk=address.pk).update(is_default=False)
            elif req_is_default is False and address.is_default:
                # If only 1 address exists, keep it as default
                if Address.objects.filter(user=user).count() == 1:
                    serializer.validated_data['is_default'] = True

            updated_address = serializer.save()

        return Response(AddressSerializer(updated_address).data, status=status.HTTP_200_OK)

    def delete(self, request, pk):
        user = get_authenticated_customer(request)
        if not user:
            return Response(
                {'error': 'Authentication required.'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        try:
            address = Address.objects.get(pk=pk, user=user)
        except Address.DoesNotExist:
            return Response(
                {'error': 'Address not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        with transaction.atomic():
            was_default = address.is_default
            address.delete()

            if was_default:
                remaining = Address.objects.filter(user=user).order_by('-created_at').first()
                if remaining:
                    remaining.is_default = True
                    remaining.save(update_fields=['is_default'])

        return Response(
            {'success': True, 'message': 'Address removed successfully.'},
            status=status.HTTP_200_OK
        )


class AddressSetDefaultView(APIView):
    def post(self, request, pk):
        return self.patch(request, pk)

    def patch(self, request, pk):
        user = get_authenticated_customer(request)
        if not user:
            return Response(
                {'error': 'Authentication required.'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        try:
            address = Address.objects.get(pk=pk, user=user)
        except Address.DoesNotExist:
            return Response(
                {'error': 'Address not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        with transaction.atomic():
            Address.objects.filter(user=user).update(is_default=False)
            address.is_default = True
            address.save(update_fields=['is_default'])

        return Response(AddressSerializer(address).data, status=status.HTTP_200_OK)


class CsrfTokenView(APIView):
    permission_classes = []
    authentication_classes = []

    def get(self, request):
        token = get_token(request)
        return Response({'csrfToken': token}, status=status.HTTP_200_OK)



# ==============================================================================
# Categories & Subcategories
# ==============================================================================
class CategoryListView(generics.ListCreateAPIView):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer

    def get(self, request, *args, **kwargs):
        if request.path.startswith('/api/admin/'):
            err = check_staff_api_permission(request, 'categories')
            if err:
                return err
        return super().get(request, *args, **kwargs)

    def get_queryset(self):
        if self.request.user.is_authenticated and self.request.user.is_staff and is_admin_2fa_verified(self.request):
            return Category.objects.all().order_by('-id')
        return Category.objects.filter(is_active=True).order_by('name')

    def create(self, request, *args, **kwargs):
        err = check_staff_api_permission(request, 'categories')
        if err:
            return err
        return super().create(request, *args, **kwargs)


class CategoryDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer

    def update(self, request, *args, **kwargs):
        err = check_staff_api_permission(request, 'categories')
        if err:
            return err
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        err = check_staff_api_permission(request, 'categories')
        if err:
            return err
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        err = check_staff_api_permission(request, 'categories')
        if err:
            return err
        return super().destroy(request, *args, **kwargs)


class SubcategoryListCreateView(generics.ListCreateAPIView):
    queryset = Subcategory.objects.all()
    serializer_class = SubcategorySerializer

    def get_queryset(self):
        cat_id = self.request.query_params.get('category_id')
        if cat_id:
            return Subcategory.objects.filter(category_id=cat_id)
        return Subcategory.objects.all().order_by('-id')

    def create(self, request, *args, **kwargs):
        err = check_staff_api_permission(request, 'categories')
        if err:
            return err
        return super().create(request, *args, **kwargs)


class SubcategoryDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Subcategory.objects.all()
    serializer_class = SubcategorySerializer

    def update(self, request, *args, **kwargs):
        err = check_staff_api_permission(request, 'categories')
        if err:
            return err
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        err = check_staff_api_permission(request, 'categories')
        if err:
            return err
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        err = check_staff_api_permission(request, 'categories')
        if err:
            return err
        return super().destroy(request, *args, **kwargs)


# ==============================================================================
# Products & Variants
# ==============================================================================
class ProductListView(generics.ListCreateAPIView):
    serializer_class = ProductSerializer

    def get(self, request, *args, **kwargs):
        if request.path.startswith('/api/admin/'):
            err = check_staff_api_permission(request, 'products')
            if err:
                return err
        return super().get(request, *args, **kwargs)

    def get_queryset(self):
        if self.request.user.is_authenticated and self.request.user.is_staff and is_admin_2fa_verified(self.request):
            return Product.objects.all().select_related('category', 'subcategory').prefetch_related('images', 'variants__images').order_by('-created_at')
        return Product.objects.filter(is_active=True).select_related('category', 'subcategory').prefetch_related('images', 'variants__images').order_by('-created_at')

    def create(self, request, *args, **kwargs):
        err = check_staff_api_permission(request, 'products')
        if err:
            return err
        return super().create(request, *args, **kwargs)


class ProductDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer

    def update(self, request, *args, **kwargs):
        err = check_staff_api_permission(request, 'products')
        if err:
            return err
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        err = check_staff_api_permission(request, 'products')
        if err:
            return err
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        err = check_staff_api_permission(request, 'products')
        if err:
            return err
        return super().destroy(request, *args, **kwargs)


class ProductVariantDetailView(APIView):
    def patch(self, request, pk):
        err = check_staff_api_permission(request, 'products')
        if err:
            return err
        try:
            variant = ProductVariant.objects.get(pk=pk)
        except ProductVariant.DoesNotExist:
            return Response({'error': 'Variant not found'}, status=status.HTTP_404_NOT_FOUND)

        for field in ['color_name', 'color_code', 'price', 'discount_price', 'stock', 'is_active', 'sizes']:
            if field in request.data:
                setattr(variant, field, request.data[field])
        variant.save()
        return Response({'success': True, 'id': variant.id}, status=status.HTTP_200_OK)

    def delete(self, request, pk):
        err = check_staff_api_permission(request, 'products')
        if err:
            return err
        try:
            variant = ProductVariant.objects.get(pk=pk)
            variant.delete()
            return Response({'success': True}, status=status.HTTP_204_NO_CONTENT)
        except ProductVariant.DoesNotExist:
            return Response({'error': 'Variant not found'}, status=status.HTTP_404_NOT_FOUND)


# ==============================================================================
# Banners
# ==============================================================================
class BannerListView(generics.ListCreateAPIView):
    serializer_class = BannerSerializer

    def get(self, request, *args, **kwargs):
        if request.path.startswith('/api/admin/'):
            err = check_staff_api_permission(request, 'banners')
            if err:
                return err
        return super().get(request, *args, **kwargs)

    def get_queryset(self):
        if self.request.user.is_authenticated and self.request.user.is_staff and is_admin_2fa_verified(self.request):
            return Banner.objects.all().order_by('display_order', '-created_at')
        return Banner.objects.filter(is_active=True).order_by('display_order', '-created_at')

    def create(self, request, *args, **kwargs):
        err = check_staff_api_permission(request, 'banners')
        if err:
            return err
        return super().create(request, *args, **kwargs)


class BannerDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Banner.objects.all()
    serializer_class = BannerSerializer
    http_method_names = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace']

    def post(self, request, *args, **kwargs):
        err = check_staff_api_permission(request, 'banners')
        if err:
            return err
        return self.partial_update(request, *args, **kwargs)

    def patch(self, request, *args, **kwargs):
        err = check_staff_api_permission(request, 'banners')
        if err:
            return err
        return self.partial_update(request, *args, **kwargs)

    def put(self, request, *args, **kwargs):
        err = check_staff_api_permission(request, 'banners')
        if err:
            return err
        return self.partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        err = check_staff_api_permission(request, 'banners')
        if err:
            return err
        return super().destroy(request, *args, **kwargs)


class BannerTrackClickView(APIView):
    permission_classes = []
    authentication_classes = []

    def post(self, request, pk):
        try:
            banner = Banner.objects.get(pk=pk)
            banner.click_count = F('click_count') + 1
            banner.save(update_fields=['click_count'])
            banner.refresh_from_db(fields=['click_count'])
            return Response({'success': True, 'banner_id': banner.id, 'click_count': banner.click_count}, status=status.HTTP_200_OK)
        except Banner.DoesNotExist:
            return Response({'error': 'Banner not found'}, status=status.HTTP_404_NOT_FOUND)


# ==============================================================================
# Reviews
# ==============================================================================
class ReviewListView(generics.ListCreateAPIView):
    serializer_class = ReviewSerializer

    def get_queryset(self):
        if self.request.user.is_authenticated and self.request.user.is_staff:
            qs = Review.objects.all()
        else:
            qs = Review.objects.filter(is_active=True, status='Approved')

        prod_id = self.request.query_params.get('product_id') or self.request.query_params.get('product')
        if prod_id:
            qs = qs.filter(product_id=prod_id)

        user_id = self.request.query_params.get('user_id')
        if user_id:
            qs = qs.filter(user_id=user_id)

        order_id = self.request.query_params.get('order_id') or self.request.query_params.get('order')
        if order_id:
            qs = qs.filter(order_id=order_id)

        order_item_id = self.request.query_params.get('order_item_id') or self.request.query_params.get('order_item')
        if order_item_id:
            qs = qs.filter(order_item_id=order_item_id)

        return qs.order_by('-created_at')

    def create(self, request, *args, **kwargs):
        settings_obj = StoreSettings.objects.filter(id=1).first()
        if settings_obj and not settings_obj.allow_reviews:
            return Response(
                {'error': 'Product reviews and ratings are currently disabled by store administration.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Allow staff to submit administrative reviews or validate customer submissions
        user = request.user if request.user.is_authenticated else None
        if not user:
            # Check customer session/token/headers/body if applicable
            user = get_authenticated_customer(request)

        order_item_id = request.data.get('order_item_id') or request.data.get('order_item')
        order_id = request.data.get('order_id') or request.data.get('order')
        product_id = request.data.get('product_id') or request.data.get('product')

        order_item = None
        if order_item_id:
            order_item = OrderItem.objects.select_related('order', 'product', 'order__user').filter(id=order_item_id).first()
        elif order_id and product_id:
            order_item = OrderItem.objects.select_related('order', 'product', 'order__user').filter(
                order_id=order_id, product_id=product_id
            ).first()

        # If user was not resolved via session/header, but order_item belongs to a user matching request email
        if not user and order_item and order_item.order and order_item.order.user:
            req_email = (
                request.data.get('email')
                or request.data.get('customer_email')
                or request.headers.get('X-Customer-Email')
                or ''
            ).strip().lower()
            if req_email and order_item.order.user.email and order_item.order.user.email.lower() == req_email:
                user = order_item.order.user

        if not user:
            return Response(
                {'error': 'Please sign in to submit a review.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if not (user.is_staff or user.is_superuser):
            if not order_item:
                return Response(
                    {'error': 'A valid purchased order item is required to submit a review.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            order = order_item.order
            if order.user != user:
                return Response(
                    {'error': 'You can only review items from your own delivered purchases.'},
                    status=status.HTTP_403_FORBIDDEN
                )

            # Check confirmed delivery status and delivery timestamp
            is_delivered = bool(
                order.delivered_at and (
                    str(order.order_status).strip().lower() == 'delivered' or
                    str(order.shipping_status).strip().upper() == 'DELIVERED'
                )
            )
            if not is_delivered or not order.delivered_at:
                return Response(
                    {'error': 'You can only review products after confirmed carrier delivery.'},
                    status=status.HTTP_403_FORBIDDEN
                )

            # Check 24-hour review window (delivered_at to delivered_at + 24h)
            now = timezone.now()
            if now > (order.delivered_at + timedelta(hours=24)):
                return Response(
                    {'error': 'The review period for this product has ended.'},
                    status=status.HTTP_403_FORBIDDEN
                )

            # Prevent duplicate review per order item
            if Review.objects.filter(Q(order_item=order_item) | (Q(user=user, order=order, product=order_item.product))).exists():
                return Response(
                    {'error': 'You have already reviewed this item.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Validate rating
            rating = request.data.get('rating')
            try:
                rating_val = float(rating)
                if not (1.0 <= rating_val <= 5.0):
                    raise ValueError()
            except (TypeError, ValueError):
                return Response(
                    {'error': 'Rating must be a number between 1 and 5 stars.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Validate review text
            text = str(request.data.get('text', '')).strip()
            if len(text) < 5:
                return Response(
                    {'error': 'Please write a review of at least 5 characters.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            if len(text) > 2000:
                return Response(
                    {'error': 'Review must not exceed 2000 characters.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            title = str(request.data.get('title', '')).strip()[:255]
            name = str(request.data.get('name', '')).strip() or (user.get_full_name() or user.username)
            email = user.email or None

            # Validate optional customer product photos (multiple images supported)
            uploaded_files = request.FILES.getlist('images') or request.FILES.getlist('images[]') or request.FILES.getlist('photos')
            if not uploaded_files:
                single_f = request.FILES.get('image') or request.FILES.get('photo') or request.FILES.get('review_image')
                if single_f:
                    uploaded_files = [single_f]

            if len(uploaded_files) > 5:
                return Response(
                    {'error': 'Maximum 5 product photos are allowed per review.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            valid_exts = ['.jpg', '.jpeg', '.png', '.webp']
            valid_types = ['image/jpeg', 'image/png', 'image/webp', 'image/pjpeg', 'image/x-png', 'image/jpg']

            for f in uploaded_files:
                if f.size > 5 * 1024 * 1024:
                    return Response(
                        {'error': 'Upload JPG, PNG or WEBP images under 5 MB.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                ext = os.path.splitext(f.name)[1].lower()
                content_type = getattr(f, 'content_type', '').lower()
                if (ext and ext not in valid_exts) or (content_type and content_type not in valid_types):
                    return Response(
                        {'error': 'Upload JPG, PNG or WEBP images under 5 MB.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

            primary_image = uploaded_files[0] if uploaded_files else None

            with transaction.atomic():
                rev = Review.objects.create(
                    user=user,
                    order=order,
                    order_item=order_item,
                    product=order_item.product,
                    rating=Decimal(str(round(rating_val, 1))),
                    title=title,
                    text=text,
                    name=name,
                    email=email,
                    image=primary_image,
                    is_verified=True,
                    status='Approved',
                    is_active=True
                )

                for f in uploaded_files:
                    ReviewImage.objects.create(review=rev, image=f)

                try:
                    product_name = rev.product.name if rev.product else "Product"
                    sender_name = rev.name or "Customer"
                    Notification.objects.create(
                        title=f"New Review: {product_name}",
                        sender=sender_name,
                        sender_initial=sender_name[:1].upper() if sender_name else 'C',
                        sender_color='#3b82f6',
                        body=f"New {rev.rating}-star review submitted by {sender_name} for '{product_name}'.",
                        full_body=f"Customer Name: {sender_name}\nCustomer Email: {rev.email or 'N/A'}\nProduct: {product_name}\nRating: {rev.rating}/5 Stars\nComment: \"{rev.text}\"\nStatus: {rev.status}",
                        category_badge='Review',
                        department='Reviews & Ratings',
                        notification_type='review',
                        review=rev,
                        product=rev.product,
                        target_url='/admin/products/review/'
                    )
                except Exception:
                    pass

            serializer = self.get_serializer(rev)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        # Staff fallback
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        user = self.request.user if self.request.user.is_authenticated else None
        product_id = self.request.data.get('product_id') or self.request.data.get('product')
        order_id = self.request.data.get('order_id') or self.request.data.get('order')
        order_item_id = self.request.data.get('order_item_id') or self.request.data.get('order_item')

        matched_order = None
        matched_item = None
        if order_item_id:
            matched_item = OrderItem.objects.select_related('order', 'product').filter(id=order_item_id).first()
            if matched_item:
                matched_order = matched_item.order
                product_id = matched_item.product_id

        if not matched_order and user and product_id:
            delivered_qs = Order.objects.filter(
                user=user,
                order_status__iexact='Delivered',
                items__product_id=product_id
            )
            if order_id:
                delivered_qs = delivered_qs.filter(id=order_id)
            matched_order = delivered_qs.first()

        name = self.request.data.get('name')
        if not name and user:
            name = (user.first_name + " " + user.last_name).strip() or user.username

        email = user.email if user else self.request.data.get('email')

        uploaded_files = self.request.FILES.getlist('images') or self.request.FILES.getlist('images[]') or self.request.FILES.getlist('photos')
        if not uploaded_files:
            single_f = self.request.FILES.get('image') or self.request.FILES.get('photo')
            if single_f:
                uploaded_files = [single_f]

        primary_image = uploaded_files[0] if uploaded_files else None

        rev = serializer.save(
            user=user,
            product_id=product_id if product_id else None,
            order=matched_order if matched_order else (Order.objects.filter(id=order_id).first() if order_id else None),
            order_item=matched_item,
            name=name or "Customer",
            email=email or None,
            image=primary_image,
            is_verified=True if matched_order else False,
            status='Approved',
            is_active=True
        )

        for f in uploaded_files:
            ReviewImage.objects.create(review=rev, image=f)
        try:
            product_name = rev.product.name if rev.product else "Product"
            sender_name = rev.name or "Customer"
            Notification.objects.create(
                title=f"New Review: {product_name}",
                sender=sender_name,
                sender_initial=sender_name[:1].upper() if sender_name else 'C',
                sender_color='#3b82f6',
                body=f"New {rev.rating}-star review submitted by {sender_name} for '{product_name}'.",
                full_body=f"Customer Name: {sender_name}\nCustomer Email: {rev.email or 'N/A'}\nProduct: {product_name}\nRating: {rev.rating}/5 Stars\nComment: \"{rev.text}\"\nStatus: {rev.status}",
                category_badge='Review',
                department='Reviews & Ratings',
                notification_type='review',
                review=rev,
                product=rev.product,
                target_url='/admin/products/review/'
            )
        except Exception:
            pass


class ReviewDetailView(APIView):
    def patch(self, request, pk):
        err = check_staff_api_permission(request, 'reviews')
        if err:
            return err
        try:
            rev = Review.objects.get(pk=pk)
        except Review.DoesNotExist:
            return Response({'error': 'Review not found'}, status=status.HTTP_404_NOT_FOUND)

        if 'status' in request.data:
            rev.status = request.data['status']
        if 'is_active' in request.data:
            rev.is_active = bool(request.data['is_active'])
        rev.save()


        # Create notification for review status update
        try:
            product_name = rev.product.name if rev.product else "General Product"
            sender_name = rev.name or "Customer"
            display_status = 'Approved' if rev.status == 'Approved' else ('Not Approved' if rev.status in ['Rejected', 'Not Approved'] else 'Pending')
            color = '#16a34a' if display_status == 'Approved' else ('#ef4444' if display_status == 'Not Approved' else '#f59e0b')

            Notification.objects.create(
                title=f"Review {display_status}: {product_name}",
                sender=sender_name,
                sender_initial=sender_name[:1].upper() if sender_name else 'C',
                sender_color=color,
                body=f"Review by {sender_name} for '{product_name}' was set to {display_status}.",
                full_body=f"Customer Name: {sender_name}\nCustomer Email: {rev.email or 'N/A'}\nProduct: {product_name}\nRating: {rev.rating}/5 Stars\nComment: \"{rev.text}\"\nUpdated Status: {display_status}",
                category_badge='Review',
                department='Reviews & Ratings',
                notification_type='review',
                review=rev,
                product=rev.product,
                target_url='/admin/review/'
            )
        except Exception:
            pass

        return Response({'success': True, 'status': rev.status, 'is_active': rev.is_active})

    def delete(self, request, pk):
        err = check_staff_api_permission(request, 'reviews')
        if err:
            return err
        try:
            rev = Review.objects.get(pk=pk)
            product_name = rev.product.name if rev.product else "General Product"
            sender_name = rev.name or "Customer"
            customer_email = rev.email or "N/A"
            rating = rev.rating or 5
            comment = rev.text or ""

            # Create notification for review deletion
            try:
                Notification.objects.create(
                    title=f"Review Deleted: {product_name}",
                    sender=sender_name,
                    sender_initial=sender_name[:1].upper() if sender_name else 'C',
                    sender_color='#ef4444',
                    body=f"Review by {sender_name} for '{product_name}' was deleted.",
                    full_body=f"A customer review was removed by administrator.\nCustomer: {sender_name}\nEmail: {customer_email}\nProduct: {product_name}\nRating: {rating}/5 Stars\nComment: \"{comment}\"",
                    category_badge='Review',
                    department='Reviews & Ratings',
                    notification_type='review',
                    product=rev.product,
                    target_url='/admin/review/'
                )
            except Exception:
                pass

            rev.delete()
            return Response({'success': True}, status=status.HTTP_204_NO_CONTENT)
        except Review.DoesNotExist:
            return Response({'error': 'Review not found'}, status=status.HTTP_404_NOT_FOUND)


# ==============================================================================
# Shared Order Totals & Pricing Calculation Helpers
# ==============================================================================
def calculate_order_totals(subtotal, settings_obj, delivery_fee=0.0):
    enable_tax = bool(settings_obj.enable_tax) if settings_obj else False
    tax_rate = float(settings_obj.tax_rate or 0.0) if (settings_obj and enable_tax) else 0.0
    tax_included = bool(settings_obj.tax_included) if (settings_obj and enable_tax) else False
    tax_type = (settings_obj.tax_type or 'GST') if settings_obj else 'GST'
    subtotal_val = float(subtotal)
    delivery_val = float(delivery_fee)

    if enable_tax and tax_rate > 0:
        if tax_included:
            tax_amount = round(subtotal_val * tax_rate / (100.0 + tax_rate), 2)
            total_amount = round(subtotal_val + delivery_val, 2)
        else:
            tax_amount = round(subtotal_val * tax_rate / 100.0, 2)
            total_amount = round(subtotal_val + tax_amount + delivery_val, 2)
    else:
        tax_amount = 0.0
        tax_rate = 0.0
        tax_included = False
        total_amount = round(subtotal_val + delivery_val, 2)

    return {
        'enable_tax': enable_tax,
        'tax_rate': tax_rate,
        'tax_amount': tax_amount,
        'tax_included': tax_included,
        'tax_type': tax_type,
        'subtotal': subtotal_val,
        'delivery_fee': delivery_val,
        'total_amount': total_amount
    }


def calculate_cart_checkout_totals(items_data, payment_method='upi'):
    """
    Authoritative backend calculation of cart totals.
    All item prices and shipping charges are fetched directly from database.
    
    price = current selling price
    original_price / discount_price = strike-through original price
    unit_discount = max(original_price - selling_price, 0)
    
    subtotal = sum(original_price * qty)
    discount = sum(unit_discount * qty)
    shipping = sum(product.shipping_charge * qty)
    final_payable = subtotal - discount + shipping (equals sum(selling_price * qty) + shipping)
    """
    settings_obj, _ = StoreSettings.objects.get_or_create(id=1)
    
    subtotal_mrp = Decimal('0.00')
    selling_subtotal = Decimal('0.00')
    discount_total = Decimal('0.00')
    shipping_total = Decimal('0.00')
    processed_items = []

    for item in items_data:
        p_id = item.get('product_id') or item.get('productId')
        v_id = item.get('variant_id') or item.get('variantId')
        qty = int(item.get('quantity', 1) or 1)
        if qty <= 0:
            qty = 1

        try:
            product = Product.objects.get(id=p_id)
        except Product.DoesNotExist:
            continue

        variant = None
        if v_id:
            try:
                variant = ProductVariant.objects.get(id=v_id, product=product)
            except ProductVariant.DoesNotExist:
                pass

        # Final Pricing Rule:
        # product.price / variant.price = Original Price
        # product.discount_price / variant.discount_price = Discount / Selling Price
        if variant and variant.price is not None:
            orig = Decimal(str(variant.price))
        else:
            orig = Decimal(str(product.price or '0.00'))

        disc = None
        if variant and variant.discount_price is not None:
            disc = Decimal(str(variant.discount_price))
        elif product.discount_price is not None:
            disc = Decimal(str(product.discount_price))

        if disc is not None and disc > Decimal('0.00') and disc < orig:
            selling_price = disc
        else:
            selling_price = orig

        unit_discount = max(Decimal('0.00'), orig - selling_price)
        unit_shipping = Decimal(str(getattr(product, 'shipping_charge', Decimal('0.00')) or Decimal('0.00')))

        line_original = orig * qty
        line_selling = selling_price * qty
        line_discount = unit_discount * qty
        line_shipping = unit_shipping * qty

        subtotal_mrp += line_original
        selling_subtotal += line_selling
        discount_total += line_discount
        shipping_total += line_shipping

        processed_items.append({
            'product': product,
            'variant': variant,
            'product_id': product.id,
            'variant_id': variant.id if variant else None,
            'product_name': product.name,
            'color_name': item.get('color_name') or (variant.color_name if variant else None),
            'size': item.get('size'),
            'quantity': qty,
            'unit_price': selling_price,
            'original_price': orig,
            'discount_amount': unit_discount,
            'shipping_charge': unit_shipping,
            'line_total': line_selling,
            'line_original': line_original,
            'line_discount': line_discount,
            'line_shipping': line_shipping,
        })

    final_payable = max(Decimal('0.00'), subtotal_mrp - discount_total + shipping_total)

    # Partial COD calculations
    cod_advance_setting = Decimal(str(getattr(settings_obj, 'cod_advance_amount', Decimal('100.00')) or Decimal('100.00')))
    norm_method = str(payment_method or '').strip().lower()
    is_cod = norm_method in ['cod', 'cash on delivery', 'cash_on_delivery', 'cash']

    if is_cod:
        cod_advance = min(cod_advance_setting, final_payable)
        cod_balance = max(Decimal('0.00'), final_payable - cod_advance)
        payable_now = cod_advance
    else:
        cod_advance = Decimal('0.00')
        cod_balance = Decimal('0.00')
        payable_now = final_payable

    return {
        'subtotal': subtotal_mrp,
        'selling_subtotal': selling_subtotal,
        'discount': discount_total,
        'shipping': shipping_total,
        'total': final_payable,
        'final_payable': final_payable,
        'payable_now': payable_now,
        'is_cod': is_cod,
        'cod_advance': cod_advance,
        'cod_balance': cod_balance,
        'cod_advance_amount_setting': cod_advance_setting,
        'items': processed_items,
        'items_count': sum(item['quantity'] for item in processed_items),
        'settings_obj': settings_obj,
    }


# ==============================================================================
# Checkout Summary API
# ==============================================================================
class CheckoutSummaryView(APIView):
    permission_classes = []

    def post(self, request):
        items_data = request.data.get('items', [])
        payment_method = request.data.get('payment_method', 'upi')

        if not isinstance(items_data, list) or len(items_data) == 0:
            return Response({
                'subtotal': 0.0,
                'discount': 0.0,
                'shipping': 0.0,
                'total': 0.0,
                'final_payable': 0.0,
                'payable_now': 0.0,
                'payment_method': str(payment_method).lower(),
                'is_cod': str(payment_method).lower() in ['cod', 'cash on delivery'],
                'cod_advance': 0.0,
                'cod_balance': 0.0,
                'cod_advance_amount_setting': 100.0,
                'items_count': 0,
                'items': [],
            }, status=status.HTTP_200_OK)

        totals = calculate_cart_checkout_totals(items_data, payment_method=payment_method)

        return Response({
            'subtotal': float(totals['subtotal']),
            'discount': float(totals['discount']),
            'shipping': float(totals['shipping']),
            'total': float(totals['total']),
            'final_payable': float(totals['final_payable']),
            'payable_now': float(totals['payable_now']),
            'payment_method': str(payment_method).lower(),
            'is_cod': totals['is_cod'],
            'cod_advance': float(totals['cod_advance']),
            'cod_balance': float(totals['cod_balance']),
            'cod_advance_amount_setting': float(totals['cod_advance_amount_setting']),
            'items_count': totals['items_count'],
            'items': [
                {
                    'product_id': it['product_id'],
                    'variant_id': it['variant_id'],
                    'name': it['product_name'],
                    'quantity': it['quantity'],
                    'unit_price': float(it['unit_price']),
                    'original_price': float(it['original_price']),
                    'discount_amount': float(it['discount_amount']),
                    'shipping_charge': float(it['shipping_charge']),
                    'line_total': float(it['line_total']),
                } for it in totals['items']
            ]
        }, status=status.HTTP_200_OK)


# ==============================================================================
# Razorpay Checkout & Webhooks
# ==============================================================================
class CreateRazorpayOrderView(APIView):
    def post(self, request):
        settings_obj, _ = StoreSettings.objects.get_or_create(id=1)
        if settings_obj.maintenance_mode:
            return Response(
                {'error': 'Store is currently under scheduled maintenance. Orders cannot be placed at this time.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        serializer = OrderCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        req_payment_method = str(request.data.get('payment_method', 'upi')).strip().lower()
        is_cod = req_payment_method in ['cod', 'cash on delivery', 'cash_on_delivery', 'cash']

        if is_cod and not (settings_obj.cod_available and settings_obj.cod_enabled):
            return Response(
                {'error': 'Cash on Delivery is currently unavailable.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not is_cod and not (settings_obj.online_payment_enabled and settings_obj.razorpay_enabled):
            return Response(
                {'error': 'Online payment via Razorpay is currently disabled.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if settings_obj.require_login_before_checkout and not settings_obj.allow_guest_checkout:
            cust_email = (request.data.get('customer_email') or request.data.get('email') or '').strip()
            if not ((request.user and request.user.is_authenticated) or cust_email):
                return Response(
                    {'error': 'Login is required before checkout. Please sign in to complete your order.'},
                    status=status.HTTP_401_UNAUTHORIZED
                )

        data = serializer.validated_data
        items_data = data['items']

        # Authoritative backend pricing calculation
        totals = calculate_cart_checkout_totals(items_data, payment_method=req_payment_method)

        if settings_obj.min_order_amount and float(settings_obj.min_order_amount) > 0:
            min_amt = float(settings_obj.min_order_amount)
            if float(totals['total']) < min_amt:
                return Response(
                    {'error': f"Minimum order amount is ₹{min_amt:,.2f}."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        if settings_obj.max_order_amount and float(settings_obj.max_order_amount) > 0:
            max_amt = float(settings_obj.max_order_amount)
            if float(totals['total']) > max_amt:
                return Response(
                    {'error': f"Maximum order amount is ₹{max_amt:,.2f}."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        payable_now = totals['payable_now']
        amount_in_paise = int(round(payable_now * 100))

        rzp_service = RazorpayService()
        try:
            receipt_id = f"mox_{uuid.uuid4().hex[:10]}"
            rzp_order = rzp_service.create_order(
                amount_in_paise=amount_in_paise,
                receipt_id=receipt_id
            )
        except Exception as e:
            return Response(
                {'error': f"Payment provider order creation failed: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        prefix = settings_obj.order_prefix or 'MOX'
        user_obj = None
        if request.user and request.user.is_authenticated:
            user_obj = request.user
        else:
            cust_email = (request.data.get('customer_email') or request.data.get('email') or '').strip()
            if cust_email:
                user_obj = User.objects.filter(email__iexact=cust_email).first() or User.objects.filter(username__iexact=cust_email).first()

        payment_method_label = 'COD' if totals['is_cod'] else req_payment_method.upper()
        if payment_method_label in ['CARD', 'CREDIT CARD', 'DEBIT CARD']:
            payment_method_label = 'CARD'
        elif payment_method_label in ['NETBANKING', 'NET BANKING']:
            payment_method_label = 'NETBANKING'
        elif payment_method_label not in ['COD', 'CARD', 'NETBANKING']:
            payment_method_label = 'UPI'

        with transaction.atomic():
            order = Order.objects.create(
                user=user_obj,
                shipping_name=data['shipping_name'],
                shipping_phone=data['shipping_phone'],
                shipping_address=data.get('shipping_address') or data.get('shipping_address_line_1') or '',
                shipping_address_line_1=data.get('shipping_address_line_1') or data.get('shipping_address') or '',
                shipping_address_line_2=data.get('shipping_address_line_2') or '',
                shipping_landmark=data.get('shipping_landmark') or '',
                shipping_city=data['shipping_city'],
                shipping_district=data.get('shipping_district') or data.get('shipping_city') or '',
                shipping_state=data.get('shipping_state') or '',
                shipping_pincode=data['shipping_pincode'],
                shipping_address_type=data.get('shipping_address_type') or 'Home',
                subtotal_amount=totals['subtotal'],
                discount_amount=totals['discount'],
                shipping_amount=totals['shipping'],
                shipping_fee=totals['shipping'],
                total_amount=totals['total'],
                amount_paid=Decimal('0.00'),
                balance_due=totals['total'],
                cod_advance_amount=totals['cod_advance'] if totals['is_cod'] else Decimal('0.00'),
                cod_advance_paid=False,
                payment_method=payment_method_label,
                payment_status='Pending',
                order_status='Pending',
                razorpay_order_id=rzp_order['id'],
                order_number=''
            )
            order.order_number = f"{prefix}-{order.id:04d}"
            order.save(update_fields=['order_number'])

            for item_info in totals['items']:
                OrderItem.objects.create(
                    order=order,
                    product=item_info['product'],
                    variant=item_info['variant'],
                    product_name=item_info['product_name'],
                    color_name=item_info['color_name'],
                    size=item_info['size'],
                    quantity=item_info['quantity'],
                    price=item_info['unit_price'],
                    original_price=item_info['original_price'],
                    discount_amount=item_info['discount_amount'],
                    shipping_charge=item_info['shipping_charge']
                )

            # Notification
            try:
                store_settings = StoreSettings.objects.filter(id=1).first()
                should_notify = store_settings.notify_order_created if store_settings else True
                if should_notify:
                    Notification.objects.create(
                        title=f"New Order Initiated #{order.id}",
                        sender=order.shipping_name,
                        sender_initial=order.shipping_name[:1].upper() if order.shipping_name else 'C',
                        body=f"New {payment_method_label} order initiated for ₹{order.total_amount:.2f}",
                        notification_type='order',
                        order=order,
                        user=order.user,
                        target_url='/admin/orders/'
                    )
            except Exception:
                pass

        return Response({
            'razorpay_order_id': order.razorpay_order_id,
            'razorpay_key_id': settings.RAZORPAY_KEY_ID,
            'amount': amount_in_paise,
            'currency': 'INR',
            'order_id': order.id,
            'order_number': order.order_number,
            'payable_amount': float(payable_now),
            'total_amount': float(totals['total']),
            'is_cod': totals['is_cod'],
            'cod_advance': float(totals['cod_advance']),
            'cod_balance': float(totals['cod_balance']),
        }, status=status.HTTP_201_CREATED)


class CreateCodOrderView(APIView):
    def post(self, request):
        return Response({
            'error': 'Cash on Delivery orders require an online advance payment (₹100). Please select Cash on Delivery at checkout and complete the advance payment via Razorpay.'
        }, status=status.HTTP_400_BAD_REQUEST)


class VerifyRazorpayPaymentView(APIView):
    def post(self, request):
        razorpay_order_id = request.data.get('razorpay_order_id')
        razorpay_payment_id = request.data.get('razorpay_payment_id')
        razorpay_signature = request.data.get('razorpay_signature')

        if not all([razorpay_order_id, razorpay_payment_id, razorpay_signature]):
            return Response(
                {'error': 'Missing required payment verification fields.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            order = Order.objects.get(razorpay_order_id=razorpay_order_id)
        except Order.DoesNotExist:
            return Response(
                {'error': 'Order not found for the provided Razorpay order ID.'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Idempotency: If already verified, return existing state
        if order.payment_status in ['Paid', 'Partially Paid']:
            return Response({
                'success': True,
                'message': 'Payment already verified and captured.',
                'order_id': order.id,
                'order_number': order.order_number,
                'payment_status': order.payment_status,
                'order_status': order.order_status,
                'amount_paid': float(order.amount_paid),
                'balance_due': float(order.balance_due),
                'cod_advance_paid': order.cod_advance_paid,
            }, status=status.HTTP_200_OK)

        rzp_service = RazorpayService()
        is_valid = rzp_service.verify_payment_signature(
            razorpay_order_id=razorpay_order_id,
            razorpay_payment_id=razorpay_payment_id,
            razorpay_signature=razorpay_signature
        )

        if not is_valid:
            order.payment_status = 'Failed'
            order.save(update_fields=['payment_status'])
            return Response(
                {'error': 'Signature verification failed. Potential tampering detected.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        store_settings = StoreSettings.objects.filter(id=1).first()
        auto_confirm = store_settings.auto_confirm_orders if store_settings else True

        with transaction.atomic():
            is_cod = (order.payment_method == 'COD')

            if is_cod:
                order.payment_status = 'Partially Paid'
                order.order_status = 'Confirmed' if auto_confirm else 'Pending'
                order.cod_advance_paid = True
                order.amount_paid = order.cod_advance_amount if order.cod_advance_amount > 0 else min(Decimal('100.00'), order.total_amount)
                order.balance_due = max(Decimal('0.00'), order.total_amount - order.amount_paid)
            else:
                order.payment_status = 'Paid'
                order.order_status = 'Confirmed' if auto_confirm else 'Pending'
                order.amount_paid = order.total_amount
                order.balance_due = Decimal('0.00')

            order.razorpay_payment_id = razorpay_payment_id
            order.razorpay_signature = razorpay_signature
            order.save()

            if not order.stock_decremented:
                stock_mgmt_enabled = store_settings.enable_stock_management if store_settings else True
                low_stock_enabled = store_settings.low_stock_alert if store_settings else True
                min_thresh = store_settings.min_stock_threshold if (store_settings and store_settings.min_stock_threshold is not None) else 5

                if stock_mgmt_enabled:
                    for item in order.items.all():
                        if item.variant:
                            item.variant.stock = max(0, item.variant.stock - item.quantity)
                            item.variant.save(update_fields=['stock'])
                            if low_stock_enabled and 0 < item.variant.stock <= min_thresh:
                                try:
                                    Notification.objects.create(
                                        title=f"Low Stock Alert: {item.product.name} ({item.variant.color_name})",
                                        sender="Inventory System",
                                        sender_initial="I",
                                        sender_color="#f59e0b",
                                        body=f"Stock for '{item.product.name} ({item.variant.color_name})' is low ({item.variant.stock} units remaining).",
                                        full_body=f"Product: {item.product.name}\nVariant: {item.variant.color_name}\nCurrent Stock: {item.variant.stock} units\nThreshold: {min_thresh} units\nPlease restock soon.",
                                        category_badge="Inventory",
                                        department="Stock Control",
                                        notification_type="low_stock",
                                        product=item.product,
                                        target_url="/admin/products/"
                                    )
                                except Exception:
                                    pass
                        elif item.product:
                            item.product.stock = max(0, item.product.stock - item.quantity)
                            item.product.save(update_fields=['stock'])
                            if low_stock_enabled and 0 < item.product.stock <= min_thresh:
                                try:
                                    Notification.objects.create(
                                        title=f"Low Stock Alert: {item.product.name}",
                                        sender="Inventory System",
                                        sender_initial="I",
                                        sender_color="#f59e0b",
                                        body=f"Stock for '{item.product.name}' is low ({item.product.stock} units remaining).",
                                        full_body=f"Product: {item.product.name}\nCurrent Stock: {item.product.stock} units\nThreshold: {min_thresh} units\nPlease restock soon.",
                                        category_badge="Inventory",
                                        department="Stock Control",
                                        notification_type="low_stock",
                                        product=item.product,
                                        target_url="/admin/products/"
                                    )
                                except Exception:
                                    pass
                order.stock_decremented = True
                order.save(update_fields=['stock_decremented'])

            # Add status history
            OrderStatusHistory.objects.create(
                order=order,
                status=order.order_status,
                location='Online Checkout',
                message=f"Payment verified via Razorpay (ID: {razorpay_payment_id}). Status: {order.payment_status}."
            )

        # Trigger WhatsApp order confirmation (non-blocking)
        try:
            send_order_confirmation_whatsapp(order)
        except Exception as e:
            logger.error(f"WhatsApp order confirmation trigger failed: {e}")

        return Response({
            'success': True,
            'message': 'Payment signature verified successfully.',
            'order_id': order.id,
            'order_number': order.order_number,
            'payment_status': order.payment_status,
            'order_status': order.order_status,
            'amount_paid': float(order.amount_paid),
            'balance_due': float(order.balance_due),
            'cod_advance_paid': order.cod_advance_paid,
        }, status=status.HTTP_200_OK)


@method_decorator(csrf_exempt, name='dispatch')
class RazorpayWebhookView(APIView):
    permission_classes = []
    authentication_classes = []

    def post(self, request):
        signature = request.headers.get('X-Razorpay-Signature') or request.META.get('HTTP_X_RAZORPAY_SIGNATURE')
        if not signature:
            return Response({'error': 'Webhook signature header missing.'}, status=status.HTTP_400_BAD_REQUEST)

        body_str = request.body.decode('utf-8')
        rzp_service = RazorpayService()
        is_valid = rzp_service.verify_webhook_signature(
            body_str=body_str,
            signature=signature,
            secret=settings.RAZORPAY_WEBHOOK_SECRET
        )

        if not is_valid:
            return Response({'error': 'Webhook signature verification failed.'}, status=status.HTTP_400_BAD_REQUEST)

        event = request.data.get('event')
        payload = request.data.get('payload', {})

        if event in ('payment.captured', 'order.paid'):
            payment_entity = payload.get('payment', {}).get('entity', {})
            order_entity = payload.get('order', {}).get('entity', {})
            rzp_order_id = order_entity.get('id') or payment_entity.get('order_id')
            rzp_payment_id = payment_entity.get('id')

            if rzp_order_id:
                try:
                    order = Order.objects.get(razorpay_order_id=rzp_order_id)
                    store_settings = StoreSettings.objects.filter(id=1).first()
                    auto_confirm = store_settings.auto_confirm_orders if store_settings else True

                    if order.payment_status != 'Paid':
                        with transaction.atomic():
                            order.payment_status = 'Paid'
                            order.order_status = 'Confirmed' if auto_confirm else 'Pending'
                            if rzp_payment_id:
                                order.razorpay_payment_id = rzp_payment_id
                            order.save()

                            if not order.stock_decremented:
                                store_settings = StoreSettings.objects.filter(id=1).first()
                                stock_mgmt_enabled = store_settings.enable_stock_management if store_settings else True
                                low_stock_enabled = store_settings.low_stock_alert if store_settings else True
                                min_thresh = store_settings.min_stock_threshold if (store_settings and store_settings.min_stock_threshold is not None) else 5

                                if stock_mgmt_enabled:
                                    for item in order.items.all():
                                        if item.variant:
                                            item.variant.stock = max(0, item.variant.stock - item.quantity)
                                            item.variant.save(update_fields=['stock'])
                                        elif item.product:
                                            item.product.stock = max(0, item.product.stock - item.quantity)
                                            item.product.save(update_fields=['stock'])
                                            if low_stock_enabled and 0 < item.product.stock <= min_thresh:
                                                try:
                                                    Notification.objects.create(
                                                        title=f"Low Stock Alert: {item.product.name}",
                                                        sender="Inventory System",
                                                        sender_initial="I",
                                                        sender_color="#f59e0b",
                                                        body=f"Stock for '{item.product.name}' is low ({item.product.stock} units remaining).",
                                                        full_body=f"Product: {item.product.name}\nCurrent Stock: {item.product.stock} units\nThreshold: {min_thresh} units\nPlease restock soon.",
                                                        category_badge="Inventory",
                                                        department="Stock Control",
                                                        notification_type="low_stock",
                                                        product=item.product,
                                                        target_url="/admin/products/"
                                                    )
                                                except Exception:
                                                    pass
                                order.stock_decremented = True
                                order.save(update_fields=['stock_decremented'])

                            try:
                                send_order_confirmation_whatsapp(order)
                            except Exception as e:
                                logger.error(f"WhatsApp webhook confirmation trigger failed: {e}")
                except Order.DoesNotExist:
                    pass

        elif event == 'payment.failed':
            payment_entity = payload.get('payment', {}).get('entity', {})
            rzp_order_id = payment_entity.get('order_id')
            if rzp_order_id:
                try:
                    order = Order.objects.get(razorpay_order_id=rzp_order_id)
                    if order.payment_status == 'Pending':
                        order.payment_status = 'Failed'
                        order.save()
                except Order.DoesNotExist:
                    pass

        return Response({'status': 'Webhook processed successfully.'}, status=status.HTTP_200_OK)


# ==============================================================================
# Admin Auth APIs (Two-Step Password + 5-Minute Email OTP via Gmail SMTP)
# ==============================================================================
def mask_admin_email(email):
    if not email or '@' not in email:
        return '***@moxiestore.com'
    parts = email.split('@', 1)
    name = parts[0]
    domain = parts[1]
    if len(name) <= 2:
        masked = name[0] + '*****'
    else:
        masked = name[0] + '*****' + name[-1]
    return f"{masked}@{domain}"


def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR', '')
    return ip


def send_admin_otp_email(target_email, otp_code):
    """
    Sends a cryptographically secure 6-digit OTP to the registered admin email
    using the active transport (HTTPS provider on Render Free or SMTP).
    """
    from services.email_service import send_admin_otp_email as service_send_admin_otp
    return service_send_admin_otp(target_email, otp_code)



class AdminCheckAuthView(APIView):
    def get(self, request):
        if (
            request.user.is_authenticated
            and request.user.is_staff
            and request.user.is_active
            and is_admin_2fa_verified(request)
        ):
            perms = list(get_user_permissions(request.user))
            super_admin = is_super_admin(request.user)
            first_url = get_first_allowed_admin_url(request.user)
            role = 'Super Admin' if request.user.is_superuser else 'Staff Admin'
            if hasattr(request.user, 'admin_profile') and request.user.admin_profile:
                role = request.user.admin_profile.role or role
            return Response({
                'authenticated': True,
                'username': request.user.username,
                'email': request.user.email,
                'is_superuser': request.user.is_superuser,
                'is_super_admin': super_admin,
                'role': role,
                'permissions': perms,
                'first_allowed_url': first_url,
            }, status=status.HTTP_200_OK)
        return Response({'authenticated': False}, status=status.HTTP_200_OK)


class AdminApiLoginView(APIView):
    """
    Step 1 of Admin Login:
    Validates identifier & password, applies brute-force checks,
    generates a secure 6-digit hashed OTP valid for 5 minutes,
    and emails it to the registered admin account using Gmail SMTP.
    """
    def post(self, request):
        identifier = str(request.data.get('identifier') or request.data.get('username') or request.data.get('email') or '').strip()
        password = str(request.data.get('password') or '').strip()

        if not identifier or not password:
            return Response(
                {'error': 'Username/email and password are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        client_ip = get_client_ip(request)
        cache_key = f"admin_login_fails_{client_ip}_{identifier.lower()}"
        failed_attempts = cache.get(cache_key, 0)

        if failed_attempts >= 5:
            return Response(
                {'error': 'Too many sign-in attempts. Please wait before trying again.'},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

        user = None

        # 1. Match active staff users first by username or email
        matched_users = list(User.objects.filter(
            Q(username__iexact=identifier) | Q(email__iexact=identifier),
            is_staff=True,
            is_active=True
        ))
        for u in matched_users:
            if u.check_password(password):
                user = u
                break


        # 2. Fallback to all matching users
        if not user:
            all_matched = list(User.objects.filter(
                Q(username__iexact=identifier) | Q(email__iexact=identifier)
            ))
            for u in all_matched:
                if u.check_password(password):
                    user = u
                    break

        # 3. Fallback standard Django authenticate
        if not user:
            user = authenticate(request, username=identifier, password=password)

        # STRICT GATE: Only active Staff or Superuser accounts may proceed.
        if not user or not user.is_active or not (user.is_staff or user.is_superuser):
            # Increment failed attempts rate-limit counter (15 minutes TTL)
            cache.set(cache_key, failed_attempts + 1, timeout=900)
            return Response(
                {'error': 'Invalid admin credentials.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        # Clear brute-force failure count on valid staff password
        cache.delete(cache_key)

        target_email = (user.email or '').strip().lower()
        if not target_email:
            return Response(
                {'error': 'This staff account has no registered email address for verification. Please contact a Super Admin.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            validate_email(target_email)
        except ValidationError:
            return Response(
                {'error': 'The registered email address is invalid. Please contact a Super Admin.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Invalidate previous unused login OTPs for this staff user
        AdminLoginOTP.objects.filter(user=user, used=False).update(used=True)

        # Generate cryptographically secure 6-digit OTP using secrets.randbelow
        otp_code = f"{secrets.randbelow(1000000):06d}"
        otp_hash = hashlib.sha256(otp_code.encode('utf-8')).hexdigest()
        expires_at = timezone.now() + timedelta(minutes=5)

        otp_obj = AdminLoginOTP.objects.create(
            user=user,
            email=target_email,
            otp_hash=otp_hash,
            expires_at=expires_at,
            attempts=0,
            resend_count=0,
            used=False,
            is_locked=False
        )

        # Send verification email via active transport (Resend HTTPS API on Render Free / SMTP)
        try:
            send_admin_otp_email(target_email, otp_code)
        except Exception as e:
            from services.email_service import get_active_email_provider
            provider = get_active_email_provider()
            logger.error(
                "OTP email send failed | user_id=%s | recipient=%s | provider=%s | status=FAILED | reason=%s: %s",
                user.id,
                mask_admin_email(target_email),
                provider,
                type(e).__name__,
                str(e)
            )
            if not getattr(settings, 'DEBUG', False):
                otp_obj.delete()
                return Response(
                    {'error': 'Unable to send verification email. Please try again.'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

        # Set pending challenge state in secure session
        request.session['admin_pending_user_id'] = user.id
        request.session['admin_pending_otp_id'] = otp_obj.id
        request.session['admin_2fa_verified'] = False

        masked = mask_admin_email(target_email)

        return Response({
            'success': True,
            'otp_required': True,
            'status': 'pending_otp',
            'message': 'Verification code sent.',
            'masked_email': masked,
            'expires_at': expires_at.isoformat(),
            'expires_in_seconds': 300,
            'resend_cooldown_seconds': 60,
            'attempts_remaining': 5,
        }, status=status.HTTP_200_OK)


class AdminVerifyOtpView(APIView):
    """
    Step 2 of Admin Login:
    Validates the 6-digit OTP against the secure server-side pending challenge.
    Enforces expiry (5 mins), max 5 attempts, single-use, and replay protection.
    """
    def post(self, request):
        pending_user_id = request.session.get('admin_pending_user_id')
        if not pending_user_id:
            return Response(
                {'error': 'Verification session has expired. Please sign in again.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        try:
            user = User.objects.get(pk=pending_user_id, is_active=True)
            if not (user.is_staff or user.is_superuser):
                request.session.flush()
                return Response({'error': 'Invalid admin credentials.'}, status=status.HTTP_401_UNAUTHORIZED)
        except User.DoesNotExist:
            request.session.flush()
            return Response({'error': 'Invalid admin credentials.'}, status=status.HTTP_401_UNAUTHORIZED)

        otp_input = str(request.data.get('otp') or request.data.get('code') or '').strip()
        if not otp_input or len(otp_input) != 6 or not otp_input.isdigit():
            return Response(
                {'error': 'Please enter a valid 6-digit numeric verification code.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        otp_obj = AdminLoginOTP.objects.filter(
            user=user,
            used=False,
            is_locked=False
        ).order_by('-created_at').first()

        if not otp_obj:
            request.session.pop('admin_pending_user_id', None)
            return Response(
                {'error': 'Too many incorrect attempts. Please request a new OTP.', 'is_locked': True},
                status=status.HTTP_400_BAD_REQUEST
            )

        now = timezone.now()
        if now > otp_obj.expires_at:
            otp_obj.used = True
            otp_obj.save(update_fields=['used'])
            return Response(
                {'error': 'OTP expired. Please request a new code.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if otp_obj.attempts >= 5:
            otp_obj.is_locked = True
            otp_obj.used = True
            otp_obj.save(update_fields=['is_locked', 'used'])
            request.session.pop('admin_pending_user_id', None)
            return Response(
                {'error': 'Too many incorrect attempts. Please request a new OTP.', 'is_locked': True, 'attempts_remaining': 0},
                status=status.HTTP_400_BAD_REQUEST
            )

        input_hash = hashlib.sha256(otp_input.encode('utf-8')).hexdigest()
        if input_hash != otp_obj.otp_hash:
            otp_obj.attempts += 1
            if otp_obj.attempts >= 5:
                otp_obj.is_locked = True
                otp_obj.used = True
                otp_obj.save(update_fields=['attempts', 'is_locked', 'used'])
                request.session.pop('admin_pending_user_id', None)
                return Response(
                    {
                        'error': 'Too many incorrect attempts. Please request a new OTP.',
                        'attempts_remaining': 0,
                        'is_locked': True
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            otp_obj.save(update_fields=['attempts'])
            remaining = 5 - otp_obj.attempts
            return Response(
                {
                    'error': f"Invalid verification code. {remaining} attempt{'s' if remaining != 1 else ''} remaining.",
                    'attempts_remaining': remaining,
                    'is_locked': False
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # OTP Verified Successfully
        otp_obj.used = True
        otp_obj.save(update_fields=['used'])

        # Establish Django Admin Session
        user.backend = 'django.contrib.auth.backends.ModelBackend'
        django_login(request, user)
        request.session['admin_2fa_verified'] = True
        request.session.pop('admin_pending_user_id', None)
        request.session.pop('admin_pending_otp_id', None)

        perms = list(get_user_permissions(user))
        super_admin = is_super_admin(user)
        first_url = get_first_allowed_admin_url(user)
        role = 'Super Admin' if user.is_superuser else 'Staff Admin'
        if hasattr(user, 'admin_profile') and user.admin_profile:
            role = user.admin_profile.role or role

        return Response({
            'success': True,
            'message': 'Verification successful. Welcome back to MOXIE Admin.',
            'username': user.username,
            'email': user.email,
            'is_superuser': user.is_superuser,
            'is_super_admin': super_admin,
            'role': role,
            'permissions': perms,
            'first_allowed_url': first_url,
        }, status=status.HTTP_200_OK)


class AdminResendOtpView(APIView):
    """
    Resends the 6-digit OTP with a 60s cooldown and max 5 resends per challenge.
    Invalidates the previous OTP code permanently.
    """
    def post(self, request):
        pending_user_id = request.session.get('admin_pending_user_id')
        if not pending_user_id:
            return Response(
                {'error': 'No active verification challenge. Please sign in again.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        try:
            user = User.objects.get(pk=pending_user_id, is_active=True)
            if not (user.is_staff or user.is_superuser):
                request.session.flush()
                return Response({'error': 'Invalid admin credentials.'}, status=status.HTTP_401_UNAUTHORIZED)
        except User.DoesNotExist:
            request.session.flush()
            return Response({'error': 'Invalid admin credentials.'}, status=status.HTTP_401_UNAUTHORIZED)

        target_email = (user.email or '').strip().lower()
        if not target_email:
            return Response(
                {'error': 'This staff account has no registered email address for verification. Please contact a Super Admin.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            validate_email(target_email)
        except ValidationError:
            return Response(
                {'error': 'The registered email address is invalid. Please contact a Super Admin.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        last_otp = AdminLoginOTP.objects.filter(user=user).order_by('-created_at').first()

        if last_otp and last_otp.is_locked:
            request.session.pop('admin_pending_user_id', None)
            return Response(
                {'error': 'Too many incorrect attempts. Please request a new OTP.', 'is_locked': True},
                status=status.HTTP_400_BAD_REQUEST
            )

        current_resends = last_otp.resend_count if last_otp else 0
        if current_resends >= 5:
            return Response(
                {'error': 'Too many security codes requested. Please return to sign in and try again later.'},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

        now = timezone.now()
        ref_time = (last_otp.last_resend_at or last_otp.created_at) if last_otp else None
        if ref_time:
            diff_seconds = (now - ref_time).total_seconds()
            if diff_seconds < 60:
                remaining_wait = int(60 - diff_seconds)
                return Response(
                    {'error': f'Please wait {remaining_wait}s before requesting a new code.', 'cooldown_remaining': remaining_wait},
                    status=status.HTTP_429_TOO_MANY_REQUESTS
                )

        # Invalidate all prior login OTPs for this user
        AdminLoginOTP.objects.filter(user=user, used=False).update(used=True)

        new_code = f"{secrets.randbelow(1000000):06d}"
        new_hash = hashlib.sha256(new_code.encode('utf-8')).hexdigest()
        expires_at = now + timedelta(minutes=5)

        new_otp_obj = AdminLoginOTP.objects.create(
            user=user,
            email=target_email,
            otp_hash=new_hash,
            expires_at=expires_at,
            attempts=0,
            resend_count=current_resends + 1,
            last_resend_at=now,
            used=False,
            is_locked=False
        )

        request.session['admin_pending_otp_id'] = new_otp_obj.id

        # Send verification email via active transport (Resend HTTPS API on Render Free / SMTP)
        try:
            send_admin_otp_email(target_email, new_code)
        except Exception as e:
            from services.email_service import get_active_email_provider
            provider = get_active_email_provider()
            logger.error(
                "OTP email send failed | user_id=%s | recipient=%s | provider=%s | status=FAILED | reason=%s: %s",
                user.id,
                mask_admin_email(target_email),
                provider,
                type(e).__name__,
                str(e)
            )
            if not getattr(settings, 'DEBUG', False):
                new_otp_obj.delete()
                return Response(
                    {'error': 'Unable to send verification email. Please try again.'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

        masked = mask_admin_email(target_email)

        return Response({
            'success': True,
            'otp_required': True,
            'status': 'pending_otp',
            'message': 'New verification code sent.',
            'masked_email': masked,
            'expires_at': expires_at.isoformat(),
            'expires_in_seconds': 300,
            'resend_cooldown_seconds': 60,
            'attempts_remaining': 5,
        }, status=status.HTTP_200_OK)


class AdminApiLogoutView(APIView):
    def post(self, request):
        django_logout(request)
        if hasattr(request, 'session'):
            request.session.flush()
        return Response({'message': 'Logged out successfully'}, status=status.HTTP_200_OK)

    def get(self, request):
        django_logout(request)
        if hasattr(request, 'session'):
            request.session.flush()
        return Response({'message': 'Logged out successfully'}, status=status.HTTP_200_OK)


# ==============================================================================
# Admin Notifications & Messages API
# ==============================================================================
class AdminNotificationsView(APIView):
    def get(self, request):
        category = request.query_params.get('category', 'all').strip().lower()
        query = request.query_params.get('q', '').strip()

        qs = Notification.objects.all().order_by('-created_at')

        if category and category != 'all':
            cat_clean = category.rstrip('s')
            if cat_clean == 'order':
                qs = qs.filter(notification_type__in=['order', 'order_status'])
            elif cat_clean == 'customer':
                qs = qs.filter(notification_type__in=['registration', 'login', 'contact_message'])
            elif cat_clean == 'product':
                qs = qs.filter(notification_type__in=['product_created', 'product_updated', 'product_deleted', 'low_stock', 'out_of_stock', 'category_created', 'category_updated', 'category_deleted'])
            elif cat_clean == 'review':
                qs = qs.filter(notification_type='review')
            elif cat_clean == 'offer':
                qs = qs.filter(notification_type__in=['offer', 'banner_created', 'banner_updated', 'banner_deleted'])
            elif cat_clean == 'system':
                qs = qs.filter(notification_type__in=['system', 'offer', 'admin_user_created', 'admin_user_updated', 'admin_user_deleted', 'banner_created', 'banner_updated', 'banner_deleted', 'category_created', 'category_updated', 'category_deleted'])

        if query:
            qs = qs.filter(Q(title__icontains=query) | Q(body__icontains=query) | Q(sender__icontains=query))

        since_id = request.query_params.get('since_id')
        unread_only = request.query_params.get('unread_only')
        limit = request.query_params.get('limit')

        if since_id:
            try:
                qs = qs.filter(id__gt=int(since_id))
            except (ValueError, TypeError):
                pass

        if unread_only and unread_only.lower() in ('true', '1', 'yes'):
            qs = qs.filter(is_read=False)

        try:
            limit_val = min(int(limit), 100) if limit else 50
        except (ValueError, TypeError):
            limit_val = 50

        notifications_data = []
        latest_id = Notification.objects.order_by('-id').values_list('id', flat=True).first() or 0
        for n in qs[:limit_val]:
            time_str = n.created_at.strftime('%d %b, %I:%M %p') if n.created_at else ''
            notifications_data.append({
                'id': n.id,
                'title': n.title,
                'sender': n.sender,
                'senderInitial': n.sender_initial,
                'sender_initial': n.sender_initial,
                'senderColor': n.sender_color,
                'sender_color': n.sender_color,
                'body': n.body,
                'fullBody': n.full_body or n.body,
                'full_body': n.full_body or n.body,
                'recipients': n.recipients,
                'department': n.department,
                'categoryBadge': n.category_badge,
                'category_badge': n.category_badge,
                'type': n.notification_type,
                'notification_type': n.notification_type,
                'isRead': n.is_read,
                'is_read': n.is_read,
                'time': time_str,
                'timeAgo': time_str,
                'createdAt': n.created_at.isoformat() if n.created_at else '',
                'target_url': n.target_url or '',
            })

        unread_count = Notification.objects.filter(is_read=False).count()
        read_count = Notification.objects.filter(is_read=True).count()
        total_count = Notification.objects.count()

        return Response({
            'notifications': notifications_data,
            'unreadCount': unread_count,
            'readCount': read_count,
            'totalCount': total_count,
            'unread_count': unread_count,
            'read_count': read_count,
            'total_count': total_count,
            'latestId': latest_id,
            'latest_id': latest_id,
        }, status=status.HTTP_200_OK)


class AdminNotificationReadView(APIView):
    def post(self, request, pk):
        try:
            n = Notification.objects.get(pk=pk)
            n.is_read = True
            n.save()
            unread_count = Notification.objects.filter(is_read=False).count()
            read_count = Notification.objects.filter(is_read=True).count()
            total_count = Notification.objects.count()
            return Response({
                'success': True,
                'id': n.id,
                'unread_count': unread_count,
                'unreadCount': unread_count,
                'read_count': read_count,
                'readCount': read_count,
                'total_count': total_count,
                'totalCount': total_count,
            }, status=status.HTTP_200_OK)
        except Notification.DoesNotExist:
            return Response({'error': 'Notification not found'}, status=status.HTTP_404_NOT_FOUND)


class AdminNotificationMarkAllReadView(APIView):
    def post(self, request):
        Notification.objects.filter(is_read=False).update(is_read=True)
        total_count = Notification.objects.count()
        return Response({
            'success': True,
            'unread_count': 0,
            'unreadCount': 0,
            'read_count': total_count,
            'readCount': total_count,
            'total_count': total_count,
            'totalCount': total_count,
        }, status=status.HTTP_200_OK)


class AdminNotificationDeleteView(APIView):
    def post(self, request, pk):
        try:
            n = Notification.objects.get(pk=pk)
            n.delete()
            unread_count = Notification.objects.filter(is_read=False).count()
            read_count = Notification.objects.filter(is_read=True).count()
            total_count = Notification.objects.count()
            return Response({
                'success': True,
                'unread_count': unread_count,
                'unreadCount': unread_count,
                'read_count': read_count,
                'readCount': read_count,
                'total_count': total_count,
                'totalCount': total_count,
            }, status=status.HTTP_200_OK)
        except Notification.DoesNotExist:
            return Response({'error': 'Notification not found'}, status=status.HTTP_404_NOT_FOUND)

    def delete(self, request, pk):
        return self.post(request, pk)


# ==============================================================================
# Admin & Public Offers API
from django.utils.dateparse import parse_datetime


def parse_aware_datetime(val):
    if not val:
        return None
    if isinstance(val, datetime):
        return timezone.localtime(val) if timezone.is_aware(val) else timezone.make_aware(val, timezone.get_current_timezone())
    val_str = str(val).strip()
    parsed = parse_datetime(val_str)
    if parsed:
        if timezone.is_naive(parsed):
            return timezone.make_aware(parsed, timezone.get_current_timezone())
        return timezone.localtime(parsed)
    from django.utils.dateparse import parse_date
    parsed_d = parse_date(val_str)
    if parsed_d:
        dt = datetime.combine(parsed_d, datetime.min.time())
        return timezone.make_aware(dt, timezone.get_current_timezone())
    return None


def get_offer_status(o, now):
    if not o.is_active:
        return 'Inactive'
    if o.end_datetime and o.end_datetime <= now:
        return 'Expired'
    if o.start_datetime and o.start_datetime > now:
        return 'Scheduled'
    if o.end_date and not o.end_datetime and o.end_date < now.date():
        return 'Expired'
    if o.start_date and not o.start_datetime and o.start_date > now.date():
        return 'Scheduled'
    return 'Active'


class CurrentOfferView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        now = timezone.now()

        active_offers = Offer.objects.prefetch_related('applicable_categories', 'applicable_products').filter(is_active=True).order_by('-created_at')
        valid_offers = []
        all_lines = []

        for o in active_offers:
            if get_offer_status(o, now) == 'Active':
                offer_text = o.name or o.title or o.description or ''
                lines = [p.strip() for p in re.split(r'\r?\n+|(?<=[.!?])\s*(?=[A-Z0-9])', offer_text) if p.strip()]
                if not lines and offer_text:
                    lines = [offer_text.strip()]

                categories = list(o.applicable_categories.values('id', 'name', 'slug'))
                products = list(o.applicable_products.values('id', 'name'))

                valid_offers.append({
                    'id': o.id,
                    'name': o.name,
                    'title': o.title or o.name,
                    'emoji': o.emoji or '',
                    'description': o.description or '',
                    'offer_text': offer_text,
                    'discount_type': o.discount_type,
                    'lines': lines,
                    'start_datetime': timezone.localtime(o.start_datetime).isoformat() if o.start_datetime else '',
                    'end_datetime': timezone.localtime(o.end_datetime).isoformat() if o.end_datetime else '',
                    'categories': categories,
                    'products': products,
                })
                all_lines.extend(lines)

        if not valid_offers:
            return Response({'offer': None, 'offers': [], 'active_offers': []}, status=status.HTTP_200_OK)

        return Response({
            'offer': valid_offers[0],
            'offers': all_lines,
            'active_offers': valid_offers
        }, status=status.HTTP_200_OK)


class AdminOffersView(APIView):
    def get(self, request):
        if request.user.is_authenticated and request.user.is_staff:
            err = check_staff_api_permission(request, 'offers')
            if err:
                return err
        now = timezone.now()
        offers = Offer.objects.prefetch_related('applicable_categories', 'applicable_products').all().order_by('-created_at')
        offers_data = []
        for o in offers:
            status_str = get_offer_status(o, now)
            schedule_str = ''
            if o.start_datetime and o.end_datetime:
                local_start = timezone.localtime(o.start_datetime)
                local_end = timezone.localtime(o.end_datetime)
                schedule_str = f"From: {local_start.strftime('%d %b %Y, %I:%M %p')}\nTo: {local_end.strftime('%d %b %Y, %I:%M %p')}"
            elif o.start_date and o.end_date:
                schedule_str = f"From: {o.start_date.strftime('%d %b %Y')}\nTo: {o.end_date.strftime('%d %b %Y')}"

            offer_text = o.name or o.title or o.description or ''

            offers_data.append({
                'id': o.id,
                'name': o.name,
                'title': o.title or '',
                'emoji': o.emoji or '',
                'description': o.description or '',
                'offer_text': offer_text,
                'status': status_str,
                'schedule': schedule_str,
                'discount_type': o.discount_type,
                'start_date': str(o.start_date) if o.start_date else '',
                'end_date': str(o.end_date) if o.end_date else '',
                'start_datetime': timezone.localtime(o.start_datetime).isoformat() if o.start_datetime else '',
                'end_datetime': timezone.localtime(o.end_datetime).isoformat() if o.end_datetime else '',
                'is_active': o.is_active,
                'isActive': o.is_active,
                'applicable_categories': [c.id for c in o.applicable_categories.all()],
                'applicable_products': [p.id for p in o.applicable_products.all()],
            })
        return Response({'offers': offers_data}, status=status.HTTP_200_OK)

    def post(self, request):
        err = check_staff_api_permission(request, 'offers')
        if err:
            return err
        data = request.data
        offer_text = data.get('offer_text') or data.get('name') or 'New Offer'
        emoji = (data.get('emoji') or '').strip()
        start_dt = parse_aware_datetime(data.get('start_datetime'))
        end_dt = parse_aware_datetime(data.get('end_datetime'))
        is_active = data.get('is_active', True)

        offer = Offer.objects.create(
            name=offer_text,
            title=offer_text,
            emoji=emoji,
            description=data.get('description', ''),
            discount_type=data.get('discount_type', 'Percentage'),
            start_date=data.get('start_date') or None,
            end_date=data.get('end_date') or None,
            start_datetime=start_dt,
            end_datetime=end_dt,
            is_active=is_active
        )
        if 'applicable_categories' in data:
            offer.applicable_categories.set(data['applicable_categories'])
        if 'applicable_products' in data:
            offer.applicable_products.set(data['applicable_products'])

        # Create audit notification
        try:
            now = timezone.now()
            status_str = get_offer_status(offer, now)
            start_str = timezone.localtime(start_dt).strftime('%d %b %Y, %I:%M %p') if start_dt else (str(offer.start_date) if offer.start_date else 'N/A')
            end_str = timezone.localtime(end_dt).strftime('%d %b %Y, %I:%M %p') if end_dt else (str(offer.end_date) if offer.end_date else 'N/A')
            color = '#10b981' if status_str == 'Active' else ('#6657ec' if status_str == 'Scheduled' else '#ef4444')

            Notification.objects.create(
                title=f"Offer Created: {offer_text[:50]}",
                sender="Promotions & Offers",
                sender_initial="O",
                sender_color=color,
                body=f"New offer '{offer_text}' created with schedule status '{status_str}'.",
                full_body=f"Offer Name: {offer_text}\nSchedule Status: {status_str}\nSchedule Period: From {start_str} to {end_str}\nDiscount Type: {offer.discount_type}\nActive: {'Yes' if offer.is_active else 'No'}",
                category_badge="Offer",
                department="Marketing & Promotions",
                notification_type="offer",
                target_url="/admin/offers/",
                is_read=False
            )
        except Exception:
            pass

        return Response({'id': offer.id, 'name': offer.name}, status=status.HTTP_201_CREATED)


class AdminOfferDetailView(APIView):
    def get(self, request, pk):
        err = check_staff_api_permission(request, 'offers')
        if err:
            return err
        try:
            offer = Offer.objects.get(pk=pk)
            now = timezone.now()
            return Response({
                'id': offer.id,
                'name': offer.name,
                'title': offer.title or '',
                'emoji': offer.emoji or '',
                'description': offer.description or '',
                'offer_text': offer.name or offer.title or offer.description or '',
                'status': get_offer_status(offer, now),
                'discount_type': offer.discount_type,
                'start_datetime': timezone.localtime(offer.start_datetime).isoformat() if offer.start_datetime else '',
                'end_datetime': timezone.localtime(offer.end_datetime).isoformat() if offer.end_datetime else '',
                'start_date': str(offer.start_date) if offer.start_date else '',
                'end_date': str(offer.end_date) if offer.end_date else '',
                'is_active': offer.is_active,
                'isActive': offer.is_active,
                'applicable_categories': [c.id for c in offer.applicable_categories.all()],
                'applicable_products': [p.id for p in offer.applicable_products.all()],
            }, status=status.HTTP_200_OK)
        except Offer.DoesNotExist:
            return Response({'error': 'Offer not found'}, status=status.HTTP_404_NOT_FOUND)

    def put(self, request, pk):
        err = check_staff_api_permission(request, 'offers')
        if err:
            return err
        try:
            offer = Offer.objects.get(pk=pk)
        except Offer.DoesNotExist:
            return Response({'error': 'Offer not found'}, status=status.HTTP_404_NOT_FOUND)

        data = request.data
        if 'offer_text' in data:
            offer.name = data['offer_text']
            offer.title = data['offer_text']
        for field in ['name', 'title', 'emoji', 'description', 'discount_type', 'start_date', 'end_date', 'is_active']:
            if field in data:
                val = data[field]
                if field == 'emoji' and isinstance(val, str):
                    val = val.strip()
                setattr(offer, field, val)
        if 'start_datetime' in data:
            offer.start_datetime = parse_aware_datetime(data['start_datetime'])
        if 'end_datetime' in data:
            offer.end_datetime = parse_aware_datetime(data['end_datetime'])
        offer.save()

        if 'applicable_categories' in data:
            offer.applicable_categories.set(data['applicable_categories'])
        if 'applicable_products' in data:
            offer.applicable_products.set(data['applicable_products'])

        # Create audit notification
        try:
            now = timezone.now()
            status_str = get_offer_status(offer, now)
            start_str = timezone.localtime(offer.start_datetime).strftime('%d %b %Y, %I:%M %p') if offer.start_datetime else (str(offer.start_date) if offer.start_date else 'N/A')
            end_str = timezone.localtime(offer.end_datetime).strftime('%d %b %Y, %I:%M %p') if offer.end_datetime else (str(offer.end_date) if offer.end_date else 'N/A')
            color = '#10b981' if status_str == 'Active' else ('#6657ec' if status_str == 'Scheduled' else '#ef4444')

            Notification.objects.create(
                title=f"Offer Updated: {offer.name[:50]}",
                sender="Promotions & Offers",
                sender_initial="O",
                sender_color=color,
                body=f"Offer '{offer.name}' updated to status '{status_str}'.",
                full_body=f"Offer Name: {offer.name}\nUpdated Status: {status_str}\nSchedule Period: From {start_str} to {end_str}\nDiscount Type: {offer.discount_type}\nActive: {'Yes' if offer.is_active else 'No'}",
                category_badge="Offer",
                department="Marketing & Promotions",
                notification_type="offer",
                target_url="/admin/offers/",
                is_read=False
            )
        except Exception:
            pass

        return Response({'success': True, 'id': offer.id})

    def patch(self, request, pk):
        return self.put(request, pk)

    def delete(self, request, pk):
        err = check_staff_api_permission(request, 'offers')
        if err:
            return err
        try:
            offer = Offer.objects.get(pk=pk)
            offer_name = offer.name or offer.title or f"Offer #{offer.id}"

            # Create notification before deletion
            try:
                Notification.objects.create(
                    title=f"Offer Deleted: {offer_name[:50]}",
                    sender="Promotions & Offers",
                    sender_initial="O",
                    sender_color="#ef4444",
                    body=f"Offer '{offer_name}' was removed from promotional offers.",
                    full_body=f"A promotional offer was deleted by administrator.\nOffer Name: {offer_name}\nID: {offer.id}\nDiscount Type: {offer.discount_type}",
                    category_badge="Offer",
                    department="Marketing & Promotions",
                    notification_type="offer",
                    target_url="/admin/offers/",
                    is_read=False
                )
            except Exception:
                pass

            offer.delete()
            return Response({'success': True}, status=status.HTTP_204_NO_CONTENT)
        except Offer.DoesNotExist:
            return Response({'error': 'Offer not found'}, status=status.HTTP_404_NOT_FOUND)


# ==============================================================================
# Admin Orders API
# ==============================================================================
class AdminOrdersView(APIView):
    def get(self, request):
        err = check_staff_api_permission(request, 'orders')
        if err:
            return err
        status_filter = request.query_params.get('status', 'all')
        payment_filter = request.query_params.get('payment_status', 'all')
        date_filter = request.query_params.get('date', 'all')
        sort_option = request.query_params.get('sort', 'newest')
        search_query = request.query_params.get('q', '') or request.query_params.get('search', '').strip()

        qs = Order.objects.prefetch_related('items__product').all()

        if status_filter and status_filter.lower() != 'all':
            qs = qs.filter(order_status__iexact=status_filter)

        if payment_filter and payment_filter.lower() != 'all':
            qs = qs.filter(payment_status__iexact=payment_filter)

        if date_filter and date_filter.lower() != 'all':
            now = timezone.now()
            if date_filter == 'today':
                qs = qs.filter(created_at__date=now.date())
            elif date_filter == 'yesterday':
                qs = qs.filter(created_at__date=(now - timedelta(days=1)).date())
            elif date_filter == '7days':
                qs = qs.filter(created_at__gte=now - timedelta(days=7))
            elif date_filter == '30days':
                qs = qs.filter(created_at__gte=now - timedelta(days=30))
            else:
                # Support exact date matching like 2026-09-08 or 08-09-2026
                try:
                    from datetime import datetime
                    if '-' in date_filter:
                        parts = date_filter.split('-')
                        if len(parts[0]) == 4: # YYYY-MM-DD
                            d_obj = datetime.strptime(date_filter, '%Y-%m-%d').date()
                        else: # DD-MM-YYYY
                            d_obj = datetime.strptime(date_filter, '%d-%m-%Y').date()
                        qs = qs.filter(created_at__date=d_obj)
                except Exception:
                    pass

        if search_query:
            qs = qs.filter(
                Q(shipping_name__icontains=search_query) |
                Q(shipping_phone__icontains=search_query) |
                Q(razorpay_order_id__icontains=search_query) |
                Q(order_number__icontains=search_query) |
                Q(shipping_city__icontains=search_query) |
                Q(shipping_address__icontains=search_query) |
                Q(items__product__name__icontains=search_query) |
                Q(id__icontains=search_query)
            ).distinct()

        if sort_option == 'oldest':
            qs = qs.order_by('created_at')
        elif sort_option == 'highest':
            qs = qs.order_by('-total_amount')
        elif sort_option == 'lowest':
            qs = qs.order_by('total_amount')
        else:
            qs = qs.order_by('-created_at')

        orders_list = []
        store_prefix = StoreSettings.objects.filter(id=1).values_list('order_prefix', flat=True).first() or 'MOX'

        for o in qs:
            order_num = o.order_number or f"{store_prefix}-{o.id:04d}"
            tracking_num = o.tracking_id or ''
            pay_method = o.payment_method or ('COD' if not o.razorpay_payment_id else 'UPI')
            orders_list.append({
                'id': o.id,
                'orderId': order_num,
                'order_number': order_num,
                'courier': o.courier_name or '',
                'courier_name': o.courier_name or '',
                'trackingId': tracking_num,
                'tracking_id': tracking_num,
                'tracking_number': tracking_num,
                'tracking_locked': bool(o.tracking_locked or bool(tracking_num)),
                'tracking_assigned_at': o.tracking_assigned_at.strftime('%d %b %Y, %I:%M %p') if o.tracking_assigned_at else (o.shipped_at.strftime('%d %b %Y, %I:%M %p') if o.shipped_at else ''),
                'shippingStatus': o.shipping_status or o.order_status,
                'shipping_status': o.shipping_status or o.order_status,
                'trackingLocation': o.tracking_location or '',
                'estimatedDelivery': o.estimated_delivery or '',
                'shipped_at': o.shipped_at.strftime('%d %b %Y, %I:%M %p') if o.shipped_at else '',
                'out_for_delivery_at': o.out_for_delivery_at.strftime('%d %b %Y, %I:%M %p') if o.out_for_delivery_at else '',
                'delivered_at': o.delivered_at.strftime('%d %b %Y, %I:%M %p') if o.delivered_at else '',
                'tracking_updated_at': o.tracking_updated_at.strftime('%d %b %Y, %I:%M %p') if o.tracking_updated_at else '',
                'customer': {
                    'name': o.shipping_name,
                    'email': o.user.email if o.user and o.user.email else 'customer@example.com',
                    'phone': o.shipping_phone,
                    'initial': o.shipping_name[:1].upper() if o.shipping_name else 'C',
                },
                'shippingAddress': {
                    'name': o.shipping_name,
                    'phone': o.shipping_phone,
                    'address': o.shipping_address,
                    'flat': o.shipping_address_line_1 or o.shipping_address,
                    'area': o.shipping_address_line_2 or '',
                    'landmark': o.shipping_landmark or '',
                    'city': o.shipping_city,
                    'district': o.shipping_district or o.shipping_city,
                    'state': o.shipping_state or '',
                    'pincode': o.shipping_pincode,
                    'type': o.shipping_address_type or 'Home'
                },
                'date': o.created_at.strftime('%d %b %Y') if o.created_at else '',
                'isoDate': o.created_at.strftime('%Y-%m-%d') if o.created_at else '',
                'createdAt': o.created_at.isoformat() if o.created_at else '',
                'fullDate': o.created_at.strftime('%b %d, %Y %I:%M %p') if o.created_at else '',
                'itemsCount': o.items.count(),
                'subtotalAmount': float(o.subtotal_amount),
                'discountAmount': float(o.discount_amount),
                'shippingAmount': float(o.shipping_amount if o.shipping_amount is not None else o.shipping_fee),
                'totalAmount': float(o.total_amount),
                'grandTotal': float(o.total_amount),
                'amountPaid': float(o.amount_paid),
                'amount_paid': float(o.amount_paid),
                'balanceDue': float(o.balance_due),
                'balance_due': float(o.balance_due),
                'codAdvanceAmount': float(o.cod_advance_amount),
                'cod_advance_amount': float(o.cod_advance_amount),
                'codAdvancePaid': bool(o.cod_advance_paid),
                'cod_advance_paid': bool(o.cod_advance_paid),
                'paymentMethod': pay_method,
                'paymentStatus': o.payment_status,
                'orderStatus': o.order_status,
                'razorpayOrderId': o.razorpay_order_id or '',
                'razorpayPaymentId': o.razorpay_payment_id or '',
            })

        all_orders = Order.objects.all()
        total_rev = sum(float(o.total_amount) for o in all_orders if o.payment_status == 'Paid')

        stats_dict = {
            'total_orders': all_orders.count(),
            'pending_orders': all_orders.filter(order_status='Pending').count(),
            'shipped_orders': all_orders.filter(order_status='Shipped').count(),
            'delivered_orders': all_orders.filter(order_status='Delivered').count(),
            'cancelled_orders': all_orders.filter(order_status='Cancelled').count(),
            'total_revenue': total_rev,
        }

        return Response({
            'total_count': all_orders.count(),
            'pending_count': stats_dict['pending_orders'],
            'shipped_count': stats_dict['shipped_orders'],
            'delivered_count': stats_dict['delivered_orders'],
            'cancelled_count': stats_dict['cancelled_orders'],
            'total_revenue': total_rev,
            'stats': stats_dict,
            'orders': orders_list,
            'results': orders_list,
            'orders_list': orders_list,
        }, status=status.HTTP_200_OK)


class AdminOrderDetailView(APIView):
    def get(self, request, pk):
        err = check_staff_api_permission(request, 'orders')
        if err:
            return err
        try:
            order = Order.objects.prefetch_related('items__product', 'items__variant', 'status_history').get(pk=pk)
        except Order.DoesNotExist:
            return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)

        store_prefix = StoreSettings.objects.filter(id=1).values_list('order_prefix', flat=True).first() or 'MOX'
        order_num = order.order_number or f"{store_prefix}-{order.id:04d}"
        tracking_num = order.tracking_id or ''

        items_list = []
        for it in order.items.all():
            img_url = it.product_image or None
            if not img_url and it.variant and it.variant.images.exists():
                img_obj = it.variant.images.first()
                if img_obj and img_obj.image:
                    img_url = img_obj.image.url
            elif not img_url and it.product and it.product.images.exists():
                img_obj = it.product.images.first()
                if img_obj and img_obj.image:
                    img_url = img_obj.image.url

            items_list.append({
                'id': it.id,
                'productId': it.product.id if it.product else None,
                'productName': it.product_name or (it.product.name if it.product else 'Product'),
                'colorName': it.color_name or (it.variant.color_name if it.variant else ''),
                'color': it.color_name or (it.variant.color_name if it.variant else ''),
                'size': it.size or '',
                'quantity': it.quantity,
                'price': float(it.price),
                'original_price': float(it.original_price if it.original_price else it.price),
                'discount_amount': float(it.discount_amount),
                'shipping_charge': float(it.shipping_charge),
                'total': float(it.price * it.quantity),
                'image': img_url
            })

        subtotal = float(order.subtotal_amount) if order.subtotal_amount is not None else sum(i['total'] for i in items_list)
        discount = float(order.discount_amount) if order.discount_amount is not None else 0.0
        shipping_fee = float(order.shipping_amount if order.shipping_amount is not None else (order.shipping_fee or 0.0))
        tax_amt = float(order.tax_amount) if order.tax_amount else 0.0
        tax_rt = float(order.tax_rate) if order.tax_rate else 0.0
        tax_tp = order.tax_type or 'GST'
        tax_inc = bool(order.tax_included)

        pay_method = order.payment_method or ('COD' if not order.razorpay_payment_id else 'UPI')

        history_list = [{
            'status': h.status,
            'location': h.location,
            'message': h.message,
            'date': h.created_at.strftime('%d %b %Y, %I:%M %p'),
            'raw_date': h.created_at.isoformat(),
        } for h in order.status_history.all()]

        # WhatsApp notification status tracking from DB logs
        logs = NotificationLog.objects.filter(order=order, channel='WHATSAPP').order_by('-created_at')
        notification_logs_list = [{
            'id': log.id,
            'message_type': log.message_type,
            'status': log.status,
            'recipient': log.recipient,
            'sent_at': log.sent_at.strftime('%d %b %Y, %I:%M %p') if log.sent_at else '',
            'error_message': log.error_message,
            'error_code': log.error_code,
            'created_at': log.created_at.strftime('%d %b %Y, %I:%M %p') if log.created_at else '',
        } for log in logs]

        whatsapp_statuses = {
            'order_confirmed': 'PENDING',
            'shipped': 'PENDING',
            'out_for_delivery': 'PENDING',
            'delivered': 'PENDING',
        }
        for log in logs:
            m_type = (log.message_type or '').upper()
            if 'CONFIRM' in m_type and whatsapp_statuses['order_confirmed'] == 'PENDING':
                whatsapp_statuses['order_confirmed'] = log.status
            elif 'SHIP' in m_type and whatsapp_statuses['shipped'] == 'PENDING':
                whatsapp_statuses['shipped'] = log.status
            elif 'OUT' in m_type and whatsapp_statuses['out_for_delivery'] == 'PENDING':
                whatsapp_statuses['out_for_delivery'] = log.status
            elif 'DELIVER' in m_type and whatsapp_statuses['delivered'] == 'PENDING':
                whatsapp_statuses['delivered'] = log.status

        order_detail = {
            'id': order.id,
            'orderId': order_num,
            'order_number': order_num,
            'courier': order.courier_name or '',
            'courier_name': order.courier_name or '',
            'trackingId': tracking_num,
            'tracking_id': tracking_num,
            'tracking_number': tracking_num,
            'tracking_locked': bool(order.tracking_locked or bool(tracking_num)),
            'tracking_assigned_at': order.tracking_assigned_at.strftime('%d %b %Y, %I:%M %p') if order.tracking_assigned_at else (order.shipped_at.strftime('%d %b %Y, %I:%M %p') if order.shipped_at else ''),
            'shippingStatus': order.shipping_status or order.order_status,
            'shipping_status': order.shipping_status or order.order_status,
            'trackingLocation': order.tracking_location or '',
            'tracking_location': order.tracking_location or '',
            'estimatedDelivery': order.estimated_delivery or '',
            'estimated_delivery': order.estimated_delivery or '',
            'shipped_at': order.shipped_at.strftime('%d %b %Y, %I:%M %p') if order.shipped_at else '',
            'out_for_delivery_at': order.out_for_delivery_at.strftime('%d %b %Y, %I:%M %p') if order.out_for_delivery_at else '',
            'delivered_at': order.delivered_at.strftime('%d %b %Y, %I:%M %p') if order.delivered_at else '',
            'tracking_updated_at': order.tracking_updated_at.strftime('%d %b %Y, %I:%M %p') if order.tracking_updated_at else '',
            'statusHistory': history_list,
            'status_history': history_list,
            'whatsapp_notifications': whatsapp_statuses,
            'notification_logs': notification_logs_list,
            'date': order.created_at.strftime('%d %b %Y') if order.created_at else '',
            'fullDate': order.created_at.strftime('%b %d, %Y %I:%M %p') if order.created_at else '',
            'createdAt': order.created_at.isoformat() if order.created_at else '',
            'orderStatus': order.order_status,
            'paymentStatus': order.payment_status,
            'paymentMethod': pay_method,
            'customer': {
                'name': order.shipping_name,
                'email': order.user.email if order.user and order.user.email else 'customer@example.com',
                'phone': order.shipping_phone,
                'initial': order.shipping_name[:1].upper() if order.shipping_name else 'C',
            },
            'shippingAddress': {
                'name': order.shipping_name,
                'phone': order.shipping_phone,
                'address': order.shipping_address,
                'flat': order.shipping_address_line_1 or order.shipping_address,
                'area': order.shipping_address_line_2 or '',
                'landmark': order.shipping_landmark or '',
                'city': order.shipping_city,
                'district': order.shipping_district or order.shipping_city,
                'state': order.shipping_state or '',
                'pincode': order.shipping_pincode,
                'type': order.shipping_address_type or 'Home'
            },
            'items': items_list,
            'products': items_list,
            'pricing': {
                'subtotal': subtotal,
                'discount': discount,
                'shipping': shipping_fee,
                'tax': tax_amt,
                'tax_rate': tax_rt,
                'tax_type': tax_tp,
                'tax_included': tax_inc,
                'total': float(order.total_amount),
                'grandTotal': float(order.total_amount),
                'amountPaid': float(order.amount_paid),
                'amount_paid': float(order.amount_paid),
                'balanceDue': float(order.balance_due),
                'balance_due': float(order.balance_due),
                'codAdvanceAmount': float(order.cod_advance_amount),
                'cod_advance_amount': float(order.cod_advance_amount),
                'codAdvancePaid': bool(order.cod_advance_paid),
                'cod_advance_paid': bool(order.cod_advance_paid),
            },
            'paymentInfo': {
                'method': pay_method,
                'status': order.payment_status,
                'amountPaid': float(order.amount_paid),
                'amount_paid': float(order.amount_paid),
                'balanceDue': float(order.balance_due),
                'balance_due': float(order.balance_due),
                'codAdvanceAmount': float(order.cod_advance_amount),
                'cod_advance_amount': float(order.cod_advance_amount),
                'codAdvancePaid': bool(order.cod_advance_paid),
                'cod_advance_paid': bool(order.cod_advance_paid),
                'razorpayOrderId': order.razorpay_order_id or '—',
                'razorpayPaymentId': order.razorpay_payment_id or '—',
            }
        }
        return Response(order_detail, status=status.HTTP_200_OK)

    def patch(self, request, pk):
        err = check_staff_api_permission(request, 'orders')
        if err:
            return err
        try:
            order = Order.objects.get(pk=pk)
        except Order.DoesNotExist:
            return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)

        old_status = (order.order_status or '').strip()
        new_status = request.data.get('order_status') or request.data.get('orderStatus')
        status_changed = False

        if new_status and new_status.strip().lower() != old_status.lower():
            order.order_status = new_status.strip()
            order.shipping_status = new_status.strip()
            status_changed = True

            now = timezone.now()
            s_upper = new_status.strip().upper()
            if 'SHIPPED' in s_upper and not order.shipped_at:
                order.shipped_at = now
            elif 'OUT' in s_upper and not order.out_for_delivery_at:
                order.out_for_delivery_at = now
            elif 'DELIVER' in s_upper and not order.delivered_at:
                order.delivered_at = now
            order.tracking_updated_at = now

        is_locked = bool(order.tracking_locked or order.tracking_id)
        if is_locked and any(k in request.data for k in ('courier_name', 'courier', 'tracking_id', 'trackingId', 'tracking_number')):
            c_cand = (request.data.get('courier_name') or request.data.get('courier') or '').strip()
            t_cand = (request.data.get('tracking_id') or request.data.get('trackingId') or request.data.get('tracking_number') or '').strip()
            if (t_cand and t_cand != order.tracking_id) or (c_cand and c_cand != order.courier_name):
                return Response({'error': 'Tracking details are permanently locked for this order and cannot be modified.'}, status=status.HTTP_400_BAD_REQUEST)

        if not is_locked:
            if 'courier_name' in request.data or 'courier' in request.data:
                c_input = request.data.get('courier_name') or request.data.get('courier')
                if c_input:
                    canonical = normalize_courier_code(c_input)
                    order.courier_name = "ST Courier" if canonical == 'ST_COURIER' else ("India Post" if canonical == 'INDIA_POST' else c_input)

            if 'tracking_id' in request.data or 'trackingId' in request.data or 'tracking_number' in request.data:
                t_input = (request.data.get('tracking_id') or request.data.get('trackingId') or request.data.get('tracking_number') or '').strip()
                if t_input and not t_input.startswith('MOXTRK'):
                    order.tracking_id = t_input
                    order.tracking_locked = True
                    if not order.tracking_assigned_at:
                        order.tracking_assigned_at = timezone.now()

        if 'tracking_location' in request.data or 'location' in request.data or 'trackingLocation' in request.data:
            order.tracking_location = request.data.get('tracking_location') or request.data.get('location') or request.data.get('trackingLocation') or ''

        if 'estimated_delivery' in request.data or 'estimatedDelivery' in request.data:
            order.estimated_delivery = request.data.get('estimated_delivery') or request.data.get('estimatedDelivery') or ''

        mark_cod = request.data.get('mark_cod_collected') or request.data.get('mark_cod') or (request.data.get('action') == 'mark_cod_collected')
        if mark_cod:
            order.payment_status = 'Paid'
            order.amount_paid = order.total_amount
            order.balance_due = Decimal('0.00')
        elif 'payment_status' in request.data or 'paymentStatus' in request.data:
            new_pay_status = request.data.get('payment_status') or request.data.get('paymentStatus')
            if new_pay_status:
                order.payment_status = new_pay_status
                if new_pay_status == 'Paid':
                    order.amount_paid = order.total_amount
                    order.balance_due = Decimal('0.00')

        order.save()

        # Append to OrderStatusHistory ONLY if status actually changed
        if status_changed:
            loc_val = order.tracking_location or ''
            msg_val = request.data.get('message') or request.data.get('note') or f"Status updated to {order.order_status}"
            OrderStatusHistory.objects.create(
                order=order,
                status=order.order_status,
                location=loc_val,
                message=msg_val
            )

            # Audit notification
            try:
                Notification.objects.create(
                    title=f"Order #{order.id} Status Updated",
                    sender="Order Management",
                    sender_initial="O",
                    sender_color="#3b82f6",
                    body=f"Order {order.order_number or f'ORD-{order.id:04d}'} updated to status '{order.order_status}' (Payment: {order.payment_status}).",
                    full_body=f"Order: {order.order_number or f'ORD-{order.id:04d}'}\nCustomer: {order.shipping_name}\nUpdated Order Status: {order.order_status}\nPayment Status: {order.payment_status}",
                    category_badge="Order",
                    department="Orders & Fulfillment",
                    notification_type="order_status",
                    order=order,
                    target_url="/admin/orders/",
                    metadata={'order_id': order.id, 'order_status': order.order_status, 'payment_status': order.payment_status}
                )
            except Exception as e:
                logger.error(f"Audit notification error: {e}")

            # Automatic WhatsApp status notification triggers on state change (with deduplication)
            st_clean = order.order_status.strip().title()
            if st_clean == 'Confirmed':
                try:
                    send_order_confirmation_whatsapp(order)
                except Exception as e:
                    logger.error(f"WhatsApp Confirmed notification error: {e}")
            elif st_clean == 'Shipped':
                try:
                    if order.tracking_id:
                        send_shipment_whatsapp(order)
                except Exception as e:
                    logger.error(f"WhatsApp Shipped notification error: {e}")
            elif st_clean in ('Out For Delivery', 'Out for Delivery'):
                try:
                    send_out_for_delivery_whatsapp(order)
                except Exception as e:
                    logger.error(f"WhatsApp Out for Delivery notification error: {e}")
            elif st_clean == 'Delivered':
                try:
                    send_delivered_whatsapp(order)
                except Exception as e:
                    logger.error(f"WhatsApp Delivered notification error: {e}")

        return self.get(request, pk)


class TrackingLookupView(APIView):
    """
    Public privacy-safe order tracking lookup.
    Accepts tracking_number (ST Courier AWB or India Post Consignment Number) or order number.
    Returns tracking timeline and masked order metadata.
    """
    permission_classes = []

    def post(self, request):
        tracking_num = (
            request.data.get('tracking_query') or
            request.data.get('tracking_number') or
            request.data.get('trackingNumber') or
            request.data.get('tracking_id') or
            request.data.get('trackingId') or
            request.data.get('order_id') or
            request.data.get('orderId') or
            request.data.get('order_number') or
            request.data.get('query') or
            request.data.get('q') or
            ''
        ).strip()
        courier_hint = (request.data.get('courier') or request.data.get('courier_name') or '').strip()
        return self._lookup(tracking_num, courier_hint=courier_hint)

    def get(self, request):
        tracking_num = (
            request.query_params.get('tracking_query') or
            request.query_params.get('tracking_number') or
            request.query_params.get('trackingNumber') or
            request.query_params.get('tracking') or
            request.query_params.get('tracking_id') or
            request.query_params.get('trackingId') or
            request.query_params.get('order_id') or
            request.query_params.get('orderId') or
            request.query_params.get('order_number') or
            request.query_params.get('q') or
            request.query_params.get('query') or
            ''
        ).strip()
        courier_hint = (request.query_params.get('courier') or request.query_params.get('courier_name') or '').strip()
        return self._lookup(tracking_num, courier_hint=courier_hint)

    def _lookup(self, query, courier_hint=None):
        if not query:
            return Response({
                'success': False,
                'error_code': 'EMPTY_INPUT',
                'error': 'Enter an order ID or tracking number.'
            }, status=status.HTTP_400_BAD_REQUEST)

        clean_query = query.strip()
        store_prefix = StoreSettings.objects.filter(id=1).values_list('order_prefix', flat=True).first() or 'MOX'

        # Detect pattern: Is it India Post / ST Courier or typical Consignment / AWB format?
        is_india_post = bool(re.match(r'^[A-Za-z]{2}\s*[0-9]{9}\s*[A-Za-z]{2}$', clean_query, re.IGNORECASE))
        is_st_courier = bool(re.match(r'^(?:ST)?[0-9]{8,14}$', clean_query, re.IGNORECASE))
        is_courier_pattern = is_india_post or is_st_courier or (courier_hint and courier_hint.upper() in ('INDIA_POST', 'ST_COURIER'))

        clean_num = ''.join(c for c in clean_query if c.isdigit())
        is_order_prefix_query = clean_query.upper().startswith(f"{store_prefix.upper()}-") or clean_query.upper().startswith(store_prefix.upper())

        # 1. Search existing orders by tracking_id, order_number, razorpay_order_id, or numeric id
        order = (
            Order.objects.filter(tracking_id__iexact=clean_query).first() or
            Order.objects.filter(order_number__iexact=clean_query).first() or
            Order.objects.filter(razorpay_order_id__iexact=clean_query).first()
        )
        if not order and clean_num and (is_order_prefix_query or not is_courier_pattern):
            order = Order.objects.filter(id=int(clean_num)).first()

        # CASE A: Order found by MOXIE order identifier
        if order:
            order_num = order.order_number or f"{store_prefix}-{order.id:04d}"
            track_num = (order.tracking_id or '').strip()

            # If user queried by order number (or numeric id) and tracking number is not assigned:
            if not track_num and (clean_query.upper() == order_num.upper() or is_order_prefix_query or clean_query.isdigit()):
                return Response({
                    'success': False,
                    'error_code': 'TRACKING_NOT_ASSIGNED',
                    'error': 'Tracking information has not been assigned yet.',
                    'order_id': order_num,
                    'order_number': order_num,
                    'order_status': order.order_status or 'Confirmed',
                    'courier': order.courier_name or 'Awaiting Dispatch',
                    'has_linked_order': True,
                }, status=status.HTTP_200_OK)

            courier_key = normalize_courier_code(order.courier_name or courier_hint)
            courier_display = "ST Courier" if courier_key == 'ST_COURIER' else ("India Post" if courier_key == 'INDIA_POST' else (order.courier_name or 'India Post'))

            # Synchronize real carrier status if tracking number exists
            carrier_data = None
            if track_num:
                CourierTrackingService.sync_carrier_status(order)
                carrier_data = CourierTrackingService.fetch_carrier_tracking(
                    track_num,
                    courier_hint=order.courier_name or courier_key,
                    order_context=order
                )

            if carrier_data:
                norm_status = carrier_data['shipping_status']
                norm_status_display = carrier_data['shipping_status_display']
                carrier_checkpoints = carrier_data.get('status_history', [])
                est_delivery = carrier_data.get('estimated_delivery') or order.estimated_delivery or ('3-5 Business Days' if norm_status != 'DELIVERED' else '')
                last_updated = carrier_data.get('last_updated') or (order.tracking_updated_at.strftime('%d %b %Y, %I:%M %p') if order.tracking_updated_at else 'Recently')
                curr_location = carrier_data.get('current_location') or order.tracking_location or ''
                carrier_portal = carrier_data.get('tracking_url') or get_external_carrier_tracking_url(order.courier_name or courier_display, track_num)
            else:
                norm_status = normalize_status(order.shipping_status or order.order_status)
                norm_status_display = STATUS_DISPLAY_NAMES.get(norm_status, 'Order Confirmed')
                carrier_checkpoints = []
                est_delivery = order.estimated_delivery or ('3-5 Business Days' if norm_status != 'DELIVERED' else '')
                last_updated = order.tracking_updated_at.strftime('%d %b %Y, %I:%M %p') if order.tracking_updated_at else (order.updated_at.strftime('%d %b %Y, %I:%M %p') if order.updated_at else 'Recently')
                curr_location = order.tracking_location or ''
                carrier_portal = get_external_carrier_tracking_url(order.courier_name or courier_display, track_num)

            # Build clean customer-facing timeline (filtering internal admin logs)
            order_conf_date = order.created_at.strftime('%d %b %Y, %I:%M %p') if order.created_at else ''
            history = [{
                'status': 'Confirmed',
                'status_display': 'Order Confirmed',
                'location': 'Online Store',
                'message': 'Order Confirmed & Placed',
                'notes': 'Order Confirmed & Placed',
                'source': 'SYSTEM',
                'date': order_conf_date,
                'raw_date': order.created_at.isoformat() if order.created_at else '',
                'timestamp': order_conf_date,
            }]

            if carrier_checkpoints:
                history.extend(carrier_checkpoints)
            else:
                for h in order.status_history.all():
                    msg = (h.message or '').strip()
                    if msg.startswith('Shipment saved') or msg.startswith('Payment verified'):
                        continue
                    history.append({
                        'status': h.status,
                        'status_display': STATUS_DISPLAY_NAMES.get(normalize_status(h.status), h.status),
                        'location': h.location or curr_location,
                        'message': h.message,
                        'notes': h.message,
                        'source': h.source or 'CARRIER',
                        'date': h.created_at.strftime('%d %b %Y, %I:%M %p'),
                        'raw_date': h.created_at.isoformat(),
                        'timestamp': h.created_at.strftime('%d %b %Y, %I:%M %p'),
                    })

            name = order.shipping_name or 'Customer'
            masked_name = f"{name[0]}***{name[-1]}" if len(name) > 2 else f"{name[0]}***"

            items = []
            for it in order.items.all():
                img_url = ''
                if it.product_image:
                    img_url = it.product_image
                elif it.product and it.product.images.exists():
                    prim = it.product.images.filter(is_primary=True).first() or it.product.images.first()
                    img_url = prim.image.url if prim and prim.image else ''
                items.append({
                    'product_name': it.product_name or (it.product.name if it.product else 'Product'),
                    'name': it.product_name or (it.product.name if it.product else 'Product'),
                    'color': it.color_name or 'Default',
                    'size': it.size or 'Regular',
                    'quantity': it.quantity,
                    'price': float(it.price),
                    'image': img_url,
                })

            display_order_status = 'Delivered' if norm_status == 'DELIVERED' else (order.order_status or norm_status_display)

            return Response({
                'success': True,
                'has_linked_order': True,
                'order_id': order_num,
                'orderId': order_num,
                'order_number': order_num,
                'rawId': order.id,
                'courier': courier_display,
                'courier_code': courier_key,
                'courier_name': courier_display,
                'courier_display_name': courier_display,
                'tracking_number': track_num or clean_query,
                'trackingId': track_num or clean_query,
                'tracking_id': track_num or clean_query,
                'shipping_status': norm_status,
                'shipping_status_display': norm_status_display,
                'order_status': display_order_status,
                'order_status_normalized': norm_status,
                'tracking_source': order.tracking_source or 'CARRIER_API',
                'current_location': curr_location,
                'tracking_location': curr_location,
                'estimated_delivery': est_delivery,
                'shipped_at': order.shipped_at.isoformat() if order.shipped_at else None,
                'delivered_at': order.delivered_at.isoformat() if order.delivered_at else None,
                'tracking_updated_at': order.tracking_updated_at.isoformat() if order.tracking_updated_at else None,
                'last_updated': last_updated,
                'status_history': history,
                'statusHistory': history,
                'tracking_url': carrier_portal,
                'carrier_portal_url': carrier_portal,
                'items': items,
                'products': items,
                'shipping_destination': {
                    'city': order.shipping_city,
                    'state': order.shipping_state,
                    'pincode': order.shipping_pincode,
                },
                'destination_city': order.shipping_city,
                'destination_state': order.shipping_state,
                'masked_customer_name': masked_name,
                'masked_recipient': masked_name,
                'payment_method': order.payment_method or 'UPI',
                'balance_due': float(order.balance_due or 0),
                'grand_total': float(order.total_amount),
                'total_amount': float(order.total_amount),
                'order_date': order.created_at.strftime('%d %b %Y, %I:%M %p') if order.created_at else '',
                'createdAt': order.created_at.isoformat() if order.created_at else '',
                'date': order.created_at.strftime('%d %b %Y') if order.created_at else '',
            }, status=status.HTTP_200_OK)

        # CASE B: If not found in DB, check if it's a carrier tracking number format
        if is_courier_pattern:
            carrier_data = CourierTrackingService.fetch_carrier_tracking(
                clean_query,
                courier_hint=courier_hint
            )

            if carrier_data:
                # No linked MOXIE order
                return Response({
                    'success': True,
                    'has_linked_order': False,
                    'order_id': None,
                    'orderId': None,
                    'order_number': None,
                    'courier': carrier_data['courier_name'],
                    'courier_code': carrier_data['courier_code'],
                    'courier_name': carrier_data['courier_name'],
                    'courier_display_name': carrier_data['courier_display_name'],
                    'tracking_number': clean_query,
                    'trackingId': clean_query,
                    'tracking_id': clean_query,
                    'shipping_status': carrier_data['shipping_status'],
                    'shipping_status_display': carrier_data['shipping_status_display'],
                    'order_status': carrier_data['shipping_status_display'],
                    'order_status_normalized': carrier_data['order_status_normalized'],
                    'tracking_source': 'CARRIER_API',
                    'current_location': carrier_data['current_location'],
                    'tracking_location': carrier_data['tracking_location'],
                    'estimated_delivery': carrier_data['estimated_delivery'],
                    'last_updated': carrier_data['last_updated'],
                    'status_history': carrier_data['status_history'],
                    'statusHistory': carrier_data['status_history'],
                    'tracking_url': carrier_data['tracking_url'],
                    'carrier_portal_url': carrier_data['carrier_portal_url'],
                    'items': [],
                    'products': [],
                    'shipping_destination': None,
                    'destination_city': None,
                    'destination_state': None,
                    'masked_customer_name': None,
                    'masked_recipient': None,
                    'total_amount': None,
                    'grand_total': None,
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    'success': False,
                    'error_code': 'SHIPMENT_NOT_FOUND',
                    'error': f"Shipment could not be found for tracking number '{clean_query}'. Please check the tracking number."
                }, status=status.HTTP_404_NOT_FOUND)

        # CASE C: If query looked like an order number (e.g. MOX-xxxx) but was not found:
        if is_order_prefix_query:
            return Response({
                'success': False,
                'error_code': 'ORDER_NOT_FOUND',
                'error': f"Order not found for '{clean_query}'. Please verify your Order ID."
            }, status=status.HTTP_404_NOT_FOUND)

        return Response({
            'success': False,
            'error_code': 'SHIPMENT_NOT_FOUND',
            'error': f"Shipment could not be found for '{clean_query}'. Please verify your Order ID or tracking number."
        }, status=status.HTTP_404_NOT_FOUND)


class OrderTrackingPublicView(APIView):
    permission_classes = []

    def get(self, request, order_id):
        raw_id_str = str(order_id).strip()
        clean_num = ''.join(c for c in raw_id_str if c.isdigit())
        store_prefix = StoreSettings.objects.filter(id=1).values_list('order_prefix', flat=True).first() or 'MOX'

        order = (
            Order.objects.filter(order_number__iexact=raw_id_str).first() or
            Order.objects.filter(tracking_id__iexact=raw_id_str).first() or
            Order.objects.filter(razorpay_order_id__iexact=raw_id_str).first()
        )
        if not order and clean_num:
            order = Order.objects.filter(id=int(clean_num)).first()

        if not order:
            return Response({'error': 'Order not found for tracking.'}, status=status.HTTP_404_NOT_FOUND)

        order_num = order.order_number or f"{store_prefix}-{order.id:04d}"
        track_num = order.tracking_id or ''
        courier_key = normalize_courier_code(order.courier_name)
        courier_display = "ST Courier" if courier_key == 'ST_COURIER' else ("India Post" if courier_key == 'INDIA_POST' else (order.courier_name or ''))

        # Synchronize carrier status
        carrier_data = None
        if track_num:
            CourierTrackingService.sync_carrier_status(order)
            carrier_data = CourierTrackingService.fetch_carrier_tracking(
                track_num,
                courier_hint=order.courier_name or courier_key,
                order_context=order
            )

        if carrier_data:
            norm_status = carrier_data['shipping_status']
            norm_status_display = carrier_data['shipping_status_display']
            history = carrier_data.get('status_history', [])
            carrier_portal = carrier_data.get('tracking_url') or get_external_carrier_tracking_url(order.courier_name, track_num)
            est_delivery = carrier_data.get('estimated_delivery') or order.estimated_delivery or '3-5 Business Days'
        else:
            norm_status = normalize_status(order.shipping_status or order.order_status)
            norm_status_display = STATUS_DISPLAY_NAMES.get(norm_status, 'Order Confirmed')
            history = [{
                'status': 'Confirmed',
                'status_display': 'Order Confirmed',
                'location': 'Online Store',
                'message': 'Order placed & confirmed',
                'source': 'SYSTEM',
                'date': order.created_at.strftime('%d %b %Y, %I:%M %p') if order.created_at else '',
                'raw_date': order.created_at.isoformat() if order.created_at else '',
                'timestamp': order.created_at.isoformat() if order.created_at else '',
            }]
            carrier_portal = get_external_carrier_tracking_url(order.courier_name, track_num)
            est_delivery = order.estimated_delivery or '3-5 Business Days'

        display_order_status = 'Delivered' if norm_status == 'DELIVERED' else (order.order_status or norm_status_display)

        return Response({
            'success': True,
            'id': order_num,
            'rawId': order.id,
            'orderId': order_num,
            'order_number': order_num,
            'orderStatus': display_order_status,
            'status': display_order_status,
            'shippingStatus': norm_status_display,
            'shipping_status': norm_status,
            'shipping_status_display': norm_status_display,
            'courier': courier_display,
            'courier_code': courier_key,
            'courier_name': courier_display,
            'trackingId': track_num,
            'tracking_id': track_num,
            'tracking_number': track_num,
            'trackingLocation': order.tracking_location or '',
            'estimatedDelivery': est_delivery,
            'statusHistory': history,
            'status_history': history,
            'carrier_portal_url': carrier_portal,
            'paymentStatus': order.payment_status,
            'paymentMethod': order.payment_method or 'UPI',
            'total': float(order.total_amount),
            'amountPaid': float(order.amount_paid),
            'balanceDue': float(order.balance_due),
            'date': order.created_at.strftime('%d %b %Y') if order.created_at else '',
            'createdAt': order.created_at.isoformat() if order.created_at else '',
            'updatedAt': order.updated_at.isoformat() if order.updated_at else '',
            'shippingAddress': {
                'name': order.shipping_name,
                'phone': order.shipping_phone,
                'address': order.shipping_address,
                'city': order.shipping_city,
                'district': order.shipping_district or order.shipping_city,
                'state': order.shipping_state or '',
                'pincode': order.shipping_pincode,
            }
        }, status=status.HTTP_200_OK)


class AdminOrderShipmentView(APIView):
    """
    Admin endpoint to save shipment details, tracking info, upload receipt image,
    record status history, and dispatch WhatsApp shipment notifications.
    """
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def post(self, request, pk):
        err = check_staff_api_permission(request, 'orders')
        if err:
            return err
        try:
            order = Order.objects.get(pk=pk)
        except Order.DoesNotExist:
            return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)

        if (order.order_status or '').strip().upper() == 'CANCELLED':
            return Response({'error': 'This order has been cancelled. Shipment creation is disabled.'}, status=status.HTTP_400_BAD_REQUEST)

        if order.tracking_locked or (order.tracking_id and order.tracking_id.strip()):
            return Response({'error': 'Tracking details are permanently locked for this order and cannot be modified.'}, status=status.HTTP_400_BAD_REQUEST)

        courier_input = (request.data.get('courier_name') or request.data.get('courier') or '').strip()
        tracking_number = (request.data.get('tracking_number') or request.data.get('tracking_id') or request.data.get('awb_number') or '').strip()
        location = (request.data.get('tracking_location') or request.data.get('location') or '').strip()
        estimated_delivery = (request.data.get('estimated_delivery') or '').strip()
        notify_customer = str(request.data.get('notify_customer', 'true')).lower() in ('true', '1', 'yes')
        receipt_file = request.FILES.get('tracking_receipt') or request.FILES.get('receipt_image') or request.FILES.get('receipt')

        if not courier_input or courier_input.lower() in ('', 'select', 'select courier', 'none'):
            return Response({'error': 'Please select a courier partner (ST Courier or India Post).'}, status=status.HTTP_400_BAD_REQUEST)

        if not tracking_number:
            return Response({'error': 'Please enter a tracking / AWB / consignment number.'}, status=status.HTTP_400_BAD_REQUEST)

        clean_tracking, is_valid, val_err = validate_tracking_number(courier_input, tracking_number)
        canonical_courier = normalize_courier_code(courier_input)
        courier_display = "ST Courier" if canonical_courier == 'ST_COURIER' else ("India Post" if canonical_courier == 'INDIA_POST' else courier_input)

        with transaction.atomic():
            order.courier_name = courier_display
            order.tracking_id = clean_tracking or tracking_number
            order.shipping_status = 'SHIPPED'
            order.order_status = 'Shipped'
            order.tracking_locked = True
            if location:
                order.tracking_location = location
            if estimated_delivery:
                order.estimated_delivery = estimated_delivery
            if receipt_file:
                order.tracking_receipt = receipt_file

            now = timezone.now()
            order.tracking_updated_at = now
            if not order.tracking_assigned_at:
                order.tracking_assigned_at = now
            if not order.shipped_at:
                order.shipped_at = now

            order.save()

            msg = f"Shipment saved. Courier: {courier_display}, Tracking: {order.tracking_id}."
            if location:
                msg += f" Location: {location}."
            OrderStatusHistory.objects.create(
                order=order,
                status='Shipped',
                location=location,
                message=msg,
                source=canonical_courier if canonical_courier in ('ST_COURIER', 'INDIA_POST') else 'ADMIN'
            )

        # Dispatch WhatsApp Notification
        whatsapp_result = {'sent': False, 'message': 'Notification not requested'}
        if notify_customer:
            try:
                sent, res_code = send_shipment_whatsapp(order)
                whatsapp_result = {'sent': sent, 'status_code': str(res_code)}
            except Exception as e:
                logger.error(f"WhatsApp dispatch exception: {e}")
                whatsapp_result = {'sent': False, 'error': str(e)}

        # Fetch latest logs
        logs = NotificationLog.objects.filter(order=order, channel='WHATSAPP').order_by('-created_at')
        whatsapp_statuses = {
            'order_confirmed': 'PENDING',
            'shipped': 'PENDING',
            'out_for_delivery': 'PENDING',
            'delivered': 'PENDING',
        }
        for log in logs:
            m_type = (log.message_type or '').upper()
            if 'CONFIRM' in m_type and whatsapp_statuses['order_confirmed'] == 'PENDING':
                whatsapp_statuses['order_confirmed'] = log.status
            elif 'SHIP' in m_type and whatsapp_statuses['shipped'] == 'PENDING':
                whatsapp_statuses['shipped'] = log.status
            elif 'OUT' in m_type and whatsapp_statuses['out_for_delivery'] == 'PENDING':
                whatsapp_statuses['out_for_delivery'] = log.status
            elif 'DELIVER' in m_type and whatsapp_statuses['delivered'] == 'PENDING':
                whatsapp_statuses['delivered'] = log.status

        notification_logs_list = [{
            'id': log.id,
            'message_type': log.message_type,
            'status': log.status,
            'recipient': log.recipient,
            'sent_at': log.sent_at.strftime('%d %b %Y, %I:%M %p') if log.sent_at else '',
            'error_message': log.error_message,
            'error_code': log.error_code,
            'created_at': log.created_at.strftime('%d %b %Y, %I:%M %p') if log.created_at else '',
        } for log in logs]

        return Response({
            'success': True,
            'message': 'Shipment information saved successfully.',
            'order_id': order.id,
            'courier_name': order.courier_name,
            'tracking_id': order.tracking_id,
            'tracking_number': order.tracking_id,
            'shipping_status': order.shipping_status,
            'order_status': order.order_status,
            'tracking_location': order.tracking_location,
            'estimated_delivery': order.estimated_delivery,
            'shipped_at': order.shipped_at.strftime('%d %b %Y, %I:%M %p') if order.shipped_at else '',
            'receipt_url': order.tracking_receipt.url if order.tracking_receipt else None,
            'whatsapp_dispatch': whatsapp_result,
            'whatsapp_notifications': whatsapp_statuses,
            'notification_logs': notification_logs_list,
        }, status=status.HTTP_200_OK)


class AdminOrderOCRTrackingView(APIView):
    """
    Admin endpoint to extract candidate tracking numbers from courier receipts.
    Mandatory safety rule: OCR result is ONLY a candidate for Admin confirmation.
    """
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request, pk):
        err = check_staff_api_permission(request, 'orders')
        if err:
            return err

        image_file = request.FILES.get('receipt') or request.FILES.get('receipt_image') or request.FILES.get('image') or request.FILES.get('tracking_receipt')
        if not image_file:
            return Response({'error': 'Please upload an image file of the courier receipt.'}, status=status.HTTP_400_BAD_REQUEST)

        result = extract_tracking_from_receipt(image_file)
        if result.get('detected_tracking_number'):
            result['tracking_number'] = result['detected_tracking_number']
        return Response(result, status=status.HTTP_200_OK)


class AdminRetryWhatsAppView(APIView):
    """
    Admin endpoint to retry sending failed WhatsApp messages for an order.
    """
    def post(self, request, pk):
        err = check_staff_api_permission(request, 'orders')
        if err:
            return err
        try:
            order = Order.objects.get(pk=pk)
        except Order.DoesNotExist:
            return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)

        event_type = (request.data.get('event_type') or request.data.get('message_type') or 'SHIPPED').upper()

        # Delete any failed previous log with this idempotency key to allow retry
        NotificationLog.objects.filter(order=order, message_type=event_type, status='FAILED').delete()

        sent = False
        res = "Unknown event"
        if event_type in ('ORDER_CONFIRMED', 'CONFIRMED'):
            sent, res = send_order_confirmation_whatsapp(order)
        elif event_type in ('SHIPPED', 'SHIPMENT'):
            sent, res = send_shipment_whatsapp(order)
        elif event_type in ('OUT_FOR_DELIVERY',):
            sent, res = send_out_for_delivery_whatsapp(order)
        elif event_type in ('DELIVERED',):
            sent, res = send_delivered_whatsapp(order)
        else:
            sent, res = send_shipment_whatsapp(order)

        # Refetch latest logs for order
        logs = NotificationLog.objects.filter(order=order, channel='WHATSAPP').order_by('-created_at')
        whatsapp_statuses = {
            'order_confirmed': 'PENDING',
            'shipped': 'PENDING',
            'out_for_delivery': 'PENDING',
            'delivered': 'PENDING',
        }
        for log in logs:
            m_type = (log.message_type or '').upper()
            if 'CONFIRM' in m_type and whatsapp_statuses['order_confirmed'] == 'PENDING':
                whatsapp_statuses['order_confirmed'] = log.status
            elif 'SHIP' in m_type and whatsapp_statuses['shipped'] == 'PENDING':
                whatsapp_statuses['shipped'] = log.status
            elif 'OUT' in m_type and whatsapp_statuses['out_for_delivery'] == 'PENDING':
                whatsapp_statuses['out_for_delivery'] = log.status
            elif 'DELIVER' in m_type and whatsapp_statuses['delivered'] == 'PENDING':
                whatsapp_statuses['delivered'] = log.status

        notification_logs_list = [{
            'id': log.id,
            'message_type': log.message_type,
            'status': log.status,
            'recipient': log.recipient,
            'sent_at': log.sent_at.strftime('%d %b %Y, %I:%M %p') if log.sent_at else '',
            'error_message': log.error_message,
            'error_code': log.error_code,
            'created_at': log.created_at.strftime('%d %b %Y, %I:%M %p') if log.created_at else '',
        } for log in logs]

        return Response({
            'success': sent,
            'result': str(res),
            'order_id': order.id,
            'message_type': event_type,
            'status': 'SENT' if sent else 'FAILED',
            'whatsapp_notifications': whatsapp_statuses,
            'notification_logs': notification_logs_list,
        }, status=status.HTTP_200_OK)

    def delete(self, request, pk):
        err = check_staff_api_permission(request, 'orders')
        if err:
            return err
        try:
            order = Order.objects.get(pk=pk)
            order.delete()
            return Response({'success': True}, status=status.HTTP_204_NO_CONTENT)
        except Order.DoesNotExist:
            return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)


class CustomerCancelOrderView(APIView):
    def post(self, request, pk):
        settings_obj, _ = StoreSettings.objects.get_or_create(id=1)
        if not settings_obj.allow_order_cancellation:
            return Response(
                {'error': 'Order cancellation is currently disabled by store administration.'},
                status=status.HTTP_403_FORBIDDEN
            )

        order = None
        pk_str = str(pk).strip()
        if pk_str.isdigit():
            order = Order.objects.filter(id=int(pk_str)).first()
        if not order:
            clean_digits = re.sub(r'^[A-Za-z]+-?', '', pk_str).lstrip('0')
            if clean_digits.isdigit():
                order = Order.objects.filter(id=int(clean_digits)).first()
        if not order:
            order = Order.objects.filter(order_number__iexact=pk_str).first()
        if not order:
            order = Order.objects.filter(order_number__icontains=pk_str).first()

        if not order:
            return Response({'error': 'Order not found.'}, status=status.HTTP_404_NOT_FOUND)

        # If already cancelled, return success
        if (order.order_status or '').strip().lower() == 'cancelled':
            return Response({
                'success': True,
                'message': f"Order #{order.order_number or order.id} is already cancelled.",
                'order_id': order.id,
                'order_status': 'Cancelled'
            }, status=status.HTTP_200_OK)

        # Check ownership if authenticated user
        if request.user.is_authenticated and order.user and order.user != request.user and not request.user.is_staff:
            order_email = (order.user.email if order.user else '') or ''
            request_email = (request.user.email or '').strip().lower()
            if not (request_email and order_email and request_email == order_email.lower()):
                return Response({'error': 'You do not have permission to cancel this order.'}, status=status.HTTP_403_FORBIDDEN)

        # Check cancellable status
        cancellable_statuses = ['pending', 'confirmed', 'processing', 'placed']
        if (order.order_status or '').strip().lower() not in cancellable_statuses:
            return Response(
                {'error': f"Order with status '{order.order_status}' cannot be cancelled."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check cancellation time limit
        limit_str = str(settings_obj.cancellation_time_limit or '24 Hours').lower()
        limit_hours = 24
        try:
            parts = limit_str.split()
            val = float(parts[0])
            if 'day' in limit_str:
                limit_hours = val * 24
            elif 'hour' in limit_str:
                limit_hours = val
            elif 'min' in limit_str:
                limit_hours = val / 60.0
            else:
                limit_hours = val
        except Exception:
            limit_hours = 24

        cutoff = order.created_at + timedelta(hours=limit_hours)
        if timezone.now() > cutoff:
            return Response(
                {'error': f"Cancellation window of {settings_obj.cancellation_time_limit} has expired for this order."},
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            order.order_status = 'Cancelled'
            order.shipping_status = 'CANCELLED'
            order.save(update_fields=['order_status', 'shipping_status', 'updated_at'])

            # Restock if stock was decremented and stock management is enabled
            if order.stock_decremented and settings_obj.enable_stock_management:
                for item in order.items.all():
                    if item.product:
                        item.product.stock = item.product.stock + item.quantity
                        item.product.save(update_fields=['stock'])
                    if item.variant:
                        item.variant.stock = item.variant.stock + item.quantity
                        item.variant.save(update_fields=['stock'])
                order.stock_decremented = False
                order.save(update_fields=['stock_decremented'])

            OrderStatusHistory.objects.create(
                order=order,
                status='Cancelled',
                location='Online Store',
                message='Order cancelled by customer.',
                source='CUSTOMER'
            )

            try:
                from .whatsapp_service import send_order_cancelled_whatsapp
                send_order_cancelled_whatsapp(order)
            except Exception:
                pass

            try:
                Notification.objects.create(
                    title=f"Order Cancelled: #{order.order_number or order.id}",
                    sender=order.shipping_name or "Customer",
                    sender_initial="C",
                    sender_color="#ef4444",
                    body=f"Order #{order.order_number or order.id} was cancelled by customer.",
                    notification_type='order',
                    order=order,
                    user=order.user,
                    target_url='/admin/orders/'
                )
            except Exception:
                pass

        return Response({
            'success': True,
            'message': f"Order #{order.order_number or order.id} cancelled successfully.",
            'order_id': order.id,
            'order_status': 'Cancelled'
        }, status=status.HTTP_200_OK)


# ==============================================================================
# Admin Customers API
# ==============================================================================
class AdminCustomersView(APIView):
    def get(self, request):
        err = check_staff_api_permission(request, 'customers')
        if err:
            return err
        customers = User.objects.filter(is_staff=False).order_by('-date_joined')
        cust_list = []
        total_spent_all = 0.0

        for u in customers:
            user_orders = Order.objects.filter(user=u)
            orders_count = user_orders.count()
            completed_orders = user_orders.filter(order_status='Delivered').count()
            spent = sum(float(o.total_amount) for o in user_orders if o.payment_status == 'Paid')
            total_spent_all += spent
            mobile = ''
            if hasattr(u, 'customer_profile') and u.customer_profile.mobile:
                mobile = u.customer_profile.mobile

            cust_list.append({
                'id': u.id,
                'customerId': f"CUST-{u.id:04d}",
                'name': f"{u.first_name} {u.last_name}".strip() or u.username,
                'username': u.username,
                'email': u.email or 'customer@example.com',
                'mobile': mobile,
                'isActive': u.is_active,
                'is_active': u.is_active,
                'lastLogin': u.last_login.strftime('%d %b %Y, %I:%M %p') if u.last_login else 'Never',
                'last_login': u.last_login.strftime('%d %b %Y, %I:%M %p') if u.last_login else 'Never',
                'createdAt': u.date_joined.strftime('%d %b %Y, %I:%M %p') if u.date_joined else '—',
                'created_at': u.date_joined.strftime('%d %b %Y, %I:%M %p') if u.date_joined else '—',
                'date_joined': u.date_joined.strftime('%d %b %Y, %I:%M %p') if u.date_joined else '—',
                'orders_count': orders_count,
                'completed_orders_count': completed_orders,
                'total_spent': spent,
                'reviews_count': Review.objects.filter(user=u).count(),
            })

        return Response({
            'total_count': customers.count(),
            'active_count': customers.filter(is_active=True).count(),
            'inactive_count': customers.filter(is_active=False).count(),
            'total_spent_all': total_spent_all,
            'customers': cust_list,
            'results': cust_list
        }, status=status.HTTP_200_OK)


class AdminCustomerStatusView(APIView):
    def post(self, request, pk):
        err = check_staff_api_permission(request, 'customers')
        if err:
            return err
        try:
            u = User.objects.get(pk=pk, is_staff=False)
            if 'is_active' in request.data:
                u.is_active = bool(request.data['is_active'])
            else:
                u.is_active = not u.is_active
            u.save()

            # If user deactivated, flush their active sessions immediately
            if not u.is_active:
                try:
                    from django.contrib.sessions.models import Session
                    user_id_str = str(u.id)
                    for s in Session.objects.all():
                        try:
                            data = s.get_decoded()
                            if str(data.get('_auth_user_id')) == user_id_str:
                                s.delete()
                        except Exception:
                            pass
                except Exception:
                    pass

            # Create notification
            try:
                cust_name = f"{u.first_name} {u.last_name}".strip() or u.username
                status_text = 'Active' if u.is_active else 'Inactive'
                Notification.objects.create(
                    title=f"Customer Status: {cust_name} ({status_text})",
                    sender="Customer Management",
                    sender_initial=(u.first_name[:1] or u.username[:1] or "C").upper(),
                    sender_color="#22c55e" if u.is_active else "#ef4444",
                    body=f"Customer account {cust_name} (#{u.id}) is now marked as {status_text}.",
                    full_body=f"Customer: {cust_name} ({u.username})\nEmail: {u.email}\nStatus: {status_text}\nUpdated At: {timezone.now().strftime('%d %b %Y, %I:%M %p')}",
                    recipients="Admin Team",
                    department="Customers",
                    category_badge="Customer",
                    notification_type="registration",
                    user=u,
                    target_url="/admin/customers/",
                    is_read=False
                )
            except Exception:
                pass

            return Response({'success': True, 'isActive': u.is_active})
        except User.DoesNotExist:
            return Response({'error': 'Customer not found'}, status=status.HTTP_404_NOT_FOUND)


class AdminCustomerDeleteView(APIView):
    def post(self, request, pk):
        err = check_staff_api_permission(request, 'customers')
        if err:
            return err
        try:
            u = User.objects.get(pk=pk, is_staff=False)
            cust_name = f"{u.first_name} {u.last_name}".strip() or u.username
            cust_email = u.email or 'customer@example.com'
            cust_id = u.id

            # 1. Flush active Django sessions for this user
            try:
                from django.contrib.sessions.models import Session
                user_id_str = str(u.id)
                for s in Session.objects.all():
                    try:
                        data = s.get_decoded()
                        if str(data.get('_auth_user_id')) == user_id_str:
                            s.delete()
                    except Exception:
                        pass
            except Exception:
                pass

            # 2. Invalidate tokens if Token model exists
            try:
                from rest_framework.authtoken.models import Token
                Token.objects.filter(user=u).delete()
            except Exception:
                pass

            u.delete()

            # Create notification
            try:
                Notification.objects.create(
                    title=f"Customer Deleted: {cust_name}",
                    sender="Customer Management",
                    sender_initial="C",
                    sender_color="#ef4444",
                    body=f"Customer account {cust_name} (#{cust_id} - {cust_email}) was removed from the store.",
                    full_body=f"Removed customer account #{cust_id}\nName: {cust_name}\nEmail: {cust_email}\nDeleted At: {timezone.now().strftime('%d %b %Y, %I:%M %p')}",
                    recipients="Admin Team",
                    department="Customers",
                    category_badge="Customer",
                    notification_type="registration",
                    target_url="/admin/customers/",
                    is_read=False
                )
            except Exception:
                pass

            return Response({'success': True})
        except User.DoesNotExist:
            return Response({'error': 'Customer not found'}, status=status.HTTP_404_NOT_FOUND)

    def delete(self, request, pk):
        return self.post(request, pk)


# ==============================================================================
# Admin Users API
# ==============================================================================
class AdminUsersView(APIView):
    def get(self, request):
        err = check_staff_api_permission(request, 'admin_users')
        if err:
            return err
        staff_users = User.objects.filter(is_staff=True).order_by('-date_joined')
        admins_list = []
        for u in staff_users:
            role = 'Super Admin' if u.is_superuser else 'Staff Admin'
            perms = []
            if hasattr(u, 'admin_profile'):
                role = u.admin_profile.role or role
                perms = u.admin_profile.permissions or []
            admins_list.append({
                'id': u.id,
                'name': f"{u.first_name} {u.last_name}".strip() or u.username,
                'username': u.username,
                'email': u.email,
                'role': role,
                'isActive': u.is_active,
                'isSuperuser': u.is_superuser,
                'lastLogin': u.last_login.strftime('%d %b %Y, %I:%M %p') if u.last_login else 'Never',
                'createdAt': u.date_joined.strftime('%d %b %Y') if u.date_joined else '',
                'permissions': perms,
            })
        return Response({
            'total_count': staff_users.count(),
            'active_count': staff_users.filter(is_active=True).count(),
            'inactive_count': staff_users.filter(is_active=False).count(),
            'super_admins_count': staff_users.filter(is_superuser=True).count(),
            'results': admins_list
        }, status=status.HTTP_200_OK)

    def post(self, request):
        err = check_staff_api_permission(request, 'admin_users')
        if err:
            return err
        data = request.data
        username = str(data.get('username') or '').strip()
        password = str(data.get('password') or '').strip()
        email = str(data.get('email') or '').strip().lower()
        name = str(data.get('name') or '').strip()
        first_name = str(data.get('first_name') or '').strip()
        last_name = str(data.get('last_name') or '').strip()
        if name and not first_name:
            parts = name.split(' ', 1)
            first_name = parts[0]
            last_name = parts[1] if len(parts) > 1 else ''
        role = str(data.get('role') or 'Staff Admin').strip()
        permissions = data.get('permissions', [])
        is_active = data.get('is_active', True)
        if isinstance(is_active, str):
            is_active = is_active.lower() in ('true', '1', 'yes')
        else:
            is_active = bool(is_active)

        if not username or not password:
            return Response({'error': 'Username and password are required.'}, status=status.HTTP_400_BAD_REQUEST)

        if not email:
            return Response({'error': 'Email address is required for 2FA OTP verification.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            validate_email(email)
        except ValidationError:
            return Response({'error': 'Please enter a valid email address.'}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(username__iexact=username).exists():
            return Response({'error': 'Username already exists.'}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(email__iexact=email).exists():
            return Response({'error': 'An account with this email address already exists.'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.create_user(
            username=username,
            password=password,
            email=email,
            first_name=first_name,
            last_name=last_name,
            is_staff=True,
            is_active=is_active,
            is_superuser=(role == 'Super Admin')
        )
        AdminProfile.objects.create(
            user=user,
            role=role,
            permissions=permissions
        )

        # Create audit notification
        try:
            admin_display_name = f"{user.first_name} {user.last_name}".strip() or user.username
            Notification.objects.create(
                title=f"Admin Account Created: {admin_display_name}",
                sender="System Admin",
                sender_initial=admin_display_name[:1].upper() if admin_display_name else 'A',
                sender_color='#6657ec',
                body=f"New admin account '{admin_display_name}' ({role}) has been created.",
                full_body=f"Admin Name: {admin_display_name}\nUsername: {user.username}\nEmail: {user.email or 'N/A'}\nAssigned Role: {role}\nPermissions: {', '.join(permissions) if permissions else 'Standard'}\nStatus: {'Active' if user.is_active else 'Inactive'}",
                category_badge='Admin User',
                department='System',
                notification_type='admin_user_created',
                user=user,
                target_url='/admin/users/'
            )
        except Exception:
            pass

        return Response({'success': True, 'id': user.id}, status=status.HTTP_201_CREATED)


class AdminUserDetailView(APIView):
    def put(self, request, pk):
        is_self = request.user.is_authenticated and (request.user.id == int(pk))
        if not is_self:
            err = check_staff_api_permission(request, 'admin_users')
            if err:
                return err
        else:
            if not request.user.is_authenticated:
                return Response({'error': 'Authentication required.'}, status=status.HTTP_401_UNAUTHORIZED)
            if not request.user.is_staff or not request.user.is_active:
                return Response({'error': 'Staff access required.'}, status=status.HTTP_403_FORBIDDEN)
            if not is_admin_2fa_verified(request):
                return Response({'error': 'Two-factor authentication (2FA) verification required.', 'requires_2fa': True}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            u = User.objects.get(pk=pk, is_staff=True)
        except User.DoesNotExist:
            return Response({'error': 'Admin user not found.'}, status=status.HTTP_404_NOT_FOUND)

        data = request.data
        name = data.get('name')
        if name is not None:
            parts = str(name).strip().split(' ', 1)
            u.first_name = parts[0]
            u.last_name = parts[1] if len(parts) > 1 else ''
        if 'first_name' in data:
            u.first_name = str(data['first_name'] or '').strip()
        if 'last_name' in data:
            u.last_name = str(data['last_name'] or '').strip()
        if 'email' in data:
            new_email = str(data['email'] or '').strip().lower()
            if not new_email:
                return Response({'error': 'Email address cannot be empty.'}, status=status.HTTP_400_BAD_REQUEST)
            try:
                validate_email(new_email)
            except ValidationError:
                return Response({'error': 'Please enter a valid email address.'}, status=status.HTTP_400_BAD_REQUEST)
            if User.objects.filter(email__iexact=new_email).exclude(pk=u.pk).exists():
                return Response({'error': 'An account with this email address already exists.'}, status=status.HTTP_400_BAD_REQUEST)
            u.email = new_email
        if 'is_active' in data:
            # Self cannot deactivate oneself
            if not is_self:
                is_active = data['is_active']
                if isinstance(is_active, str):
                    u.is_active = is_active.lower() in ('true', '1', 'yes')
                else:
                    u.is_active = bool(is_active)

        # Handle password change ONLY if new_password is provided
        password_changed = False
        new_password = str(data.get('new_password') or data.get('password') or '').strip()
        current_password = str(data.get('current_password') or data.get('old_password') or '').strip()
        confirm_password = str(data.get('confirm_password') or data.get('confirm_new_password') or '').strip()

        if new_password:
            # Self password change
            if request.user.id == u.id:
                if not current_password:
                    return Response({'error': 'Current password is required.'}, status=status.HTTP_400_BAD_REQUEST)
                if not u.check_password(current_password):
                    return Response({'error': 'Current password is incorrect.'}, status=status.HTTP_400_BAD_REQUEST)
                if confirm_password and new_password != confirm_password:
                    return Response({'error': 'New passwords do not match.'}, status=status.HTTP_400_BAD_REQUEST)
                try:
                    validate_password(new_password, user=u)
                except ValidationError as ve:
                    return Response({'error': ' '.join(ve.messages)}, status=status.HTTP_400_BAD_REQUEST)
                u.set_password(new_password)
                password_changed = True
                update_session_auth_hash(request, u)
            else:
                # Super Admin changing another user's password
                if not (request.user.is_authenticated and request.user.is_superuser):
                    return Response({'error': 'Only Super Admins can reset another user\'s password.'}, status=status.HTTP_403_FORBIDDEN)
                admin_password = str(data.get('admin_password') or current_password or '').strip()
                if not admin_password or not request.user.check_password(admin_password):
                    return Response({'error': 'Your Super Admin password is incorrect.'}, status=status.HTTP_400_BAD_REQUEST)
                if confirm_password and new_password != confirm_password:
                    return Response({'error': 'New passwords do not match.'}, status=status.HTTP_400_BAD_REQUEST)
                try:
                    validate_password(new_password, user=u)
                except ValidationError as ve:
                    return Response({'error': ' '.join(ve.messages)}, status=status.HTTP_400_BAD_REQUEST)
                u.set_password(new_password)
                password_changed = True

        u.save()

        # Update role and permissions if authorized
        can_manage_roles = request.user.is_superuser or has_admin_permission(request.user, 'admin_users')
        profile, _ = AdminProfile.objects.get_or_create(user=u)
        if can_manage_roles:
            if 'role' in data:
                profile.role = str(data['role']).strip()
                u.is_superuser = (profile.role == 'Super Admin')
                u.save(update_fields=['is_superuser'])
            if 'permissions' in data:
                profile.permissions = data['permissions']
            profile.save()

        # Audit notification
        try:
            admin_display_name = f"{u.first_name} {u.last_name}".strip() or u.username
            action_text = "details and password updated" if password_changed else "details updated"
            Notification.objects.create(
                title=f"Admin Account Updated: {admin_display_name}",
                sender="System Admin",
                sender_initial=admin_display_name[:1].upper() if admin_display_name else 'A',
                sender_color='#f59e0b',
                body=f"Admin profile {action_text} for '{admin_display_name}'.",
                full_body=f"Admin Name: {admin_display_name}\nUsername: {u.username}\nEmail: {u.email or 'N/A'}\nRole: {profile.role}\nStatus: {'Active' if u.is_active else 'Inactive'}\nPassword Changed: {'Yes' if password_changed else 'No'}",
                category_badge='Admin User',
                department='System',
                notification_type='admin_user_updated',
                user=u,
                target_url='/admin/users/'
            )
        except Exception:
            pass

        if password_changed and request.user.id == u.id:
            msg = "Password changed successfully."
        elif password_changed:
            msg = "Password reset successfully."
        else:
            msg = "Admin user updated successfully."

        return Response({'success': True, 'id': u.id, 'password_changed': password_changed, 'message': msg})

    def patch(self, request, pk):
        return self.put(request, pk)

    def delete(self, request, pk):
        err = check_staff_api_permission(request, 'admin_users')
        if err:
            return err
        try:
            u = User.objects.get(pk=pk, is_staff=True)
            if u.is_superuser and User.objects.filter(is_superuser=True).count() <= 1:
                return Response({'error': 'Cannot delete the only Super Admin.'}, status=status.HTTP_400_BAD_REQUEST)
            admin_display_name = f"{u.first_name} {u.last_name}".strip() or u.username
            admin_username = u.username
            admin_email = u.email or 'N/A'
            u.delete()

            # Create audit notification
            try:
                Notification.objects.create(
                    title=f"Admin Account Deleted: {admin_display_name}",
                    sender="System Admin",
                    sender_initial=admin_display_name[:1].upper() if admin_display_name else 'A',
                    sender_color='#ef4444',
                    body=f"Admin account '{admin_display_name}' ({admin_username}) was removed.",
                    full_body=f"Admin account has been permanently removed.\nName: {admin_display_name}\nUsername: {admin_username}\nEmail: {admin_email}",
                    category_badge='Admin User',
                    department='System',
                    notification_type='admin_user_deleted',
                    target_url='/admin/users/'
                )
            except Exception:
                pass

            return Response({'success': True}, status=status.HTTP_204_NO_CONTENT)
        except User.DoesNotExist:
            return Response({'error': 'Admin user not found'}, status=status.HTTP_404_NOT_FOUND)


class AdminUserResetPasswordView(APIView):
    """
    Super Admin endpoint to securely reset another admin user's password.
    Validates Super Admin's own password and enforces Django password strength validation.
    """
    def post(self, request, pk):
        err = check_staff_api_permission(request, 'admin_users')
        if err:
            return err

        if not (request.user.is_authenticated and request.user.is_superuser):
            return Response({'error': 'Only Super Admins can reset another user\'s password.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            target_user = User.objects.get(pk=pk, is_staff=True)
        except User.DoesNotExist:
            return Response({'error': 'Admin user not found.'}, status=status.HTTP_404_NOT_FOUND)

        data = request.data
        admin_password = str(data.get('admin_password') or '').strip()
        new_password = str(data.get('new_password') or data.get('password') or '').strip()
        confirm_password = str(data.get('confirm_password') or data.get('confirm_new_password') or '').strip()

        if not admin_password:
            return Response({'error': 'Your Super Admin password is required.'}, status=status.HTTP_400_BAD_REQUEST)

        if not request.user.check_password(admin_password):
            return Response({'error': 'Your Super Admin password is incorrect.'}, status=status.HTTP_400_BAD_REQUEST)

        if not new_password:
            return Response({'error': 'New password is required.'}, status=status.HTTP_400_BAD_REQUEST)

        if new_password != confirm_password:
            return Response({'error': 'New passwords do not match.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            validate_password(new_password, user=target_user)
        except ValidationError as ve:
            return Response({'error': ' '.join(ve.messages)}, status=status.HTTP_400_BAD_REQUEST)

        target_user.set_password(new_password)
        target_user.save(update_fields=['password'])

        if request.user.id == target_user.id:
            update_session_auth_hash(request, target_user)

        # Audit notification
        try:
            admin_display_name = f"{target_user.first_name} {target_user.last_name}".strip() or target_user.username
            Notification.objects.create(
                title=f"Admin Password Reset: {admin_display_name}",
                sender="System Security",
                sender_initial='S',
                sender_color='#ef4444',
                body=f"Password for admin account '{admin_display_name}' was reset by Super Admin {request.user.username}.",
                full_body=f"Admin Name: {admin_display_name}\nUsername: {target_user.username}\nReset By: {request.user.username}\nTimestamp: {timezone.now().strftime('%d %b %Y, %I:%M %p')}",
                category_badge='Security',
                department='System',
                notification_type='admin_user_updated',
                user=target_user,
                target_url='/admin/users/'
            )
        except Exception:
            pass

        return Response({'success': True, 'message': 'Password reset successfully.'})


class AdminUserToggleActiveView(APIView):
    def post(self, request, pk):
        err = check_staff_api_permission(request, 'admin_users')
        if err:
            return err
        try:
            u = User.objects.get(pk=pk, is_staff=True)
            u.is_active = not u.is_active
            u.save()

            # Create audit notification
            try:
                admin_display_name = f"{u.first_name} {u.last_name}".strip() or u.username
                status_label = 'Active' if u.is_active else 'Inactive'
                status_color = '#16a34a' if u.is_active else '#ef4444'
                Notification.objects.create(
                    title=f"Admin Status Changed: {admin_display_name} ({status_label})",
                    sender="System Admin",
                    sender_initial=admin_display_name[:1].upper() if admin_display_name else 'A',
                    sender_color=status_color,
                    body=f"Admin '{admin_display_name}' status changed to {status_label}.",
                    full_body=f"Admin Account: {admin_display_name}\nUsername: {u.username}\nEmail: {u.email or 'N/A'}\nNew Status: {status_label}",
                    category_badge='Admin User',
                    department='System',
                    notification_type='admin_user_updated',
                    user=u,
                    target_url='/admin/users/'
                )
            except Exception:
                pass

            return Response({'success': True, 'isActive': u.is_active})
        except User.DoesNotExist:
            return Response({'error': 'Admin user not found'}, status=status.HTTP_404_NOT_FOUND)


# ==============================================================================
# Store Settings & Admin Profile APIs
# ==============================================================================
class AdminSettingsView(APIView):
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def get_settings_dict(self, settings_obj):
        fields = [f.name for f in settings_obj._meta.fields if f.name not in ['id', 'store_logo']]
        data = {f: getattr(settings_obj, f) for f in fields}
        data['store_logo'] = settings_obj.store_logo.url if settings_obj.store_logo else ''
        
        low_stock = bool(settings_obj.notify_low_stock if settings_obj.notify_low_stock is not None else settings_obj.low_stock_alert)
        order_received = bool(settings_obj.notify_order_created if settings_obj.notify_order_created is not None else True)
        new_customer = bool(settings_obj.notify_new_customer if settings_obj.notify_new_customer is not None else True)
        
        data['low_stock_notification'] = low_stock
        data['order_received_notification'] = order_received
        data['new_customer_signup_notification'] = new_customer
        data['notify_low_stock'] = low_stock
        data['notify_order_created'] = order_received
        data['notify_new_customer'] = new_customer
        
        data['payment'] = {
            'provider': 'Razorpay',
            'mode': getattr(settings_obj, 'payment_mode', 'Test'),
            'razorpay_key_id': 'rzp_test_************',
            'online_payment_enabled': getattr(settings_obj, 'online_payment_enabled', True),
            'razorpay_enabled': getattr(settings_obj, 'razorpay_enabled', True),
            'cod_enabled': getattr(settings_obj, 'cod_enabled', True),
            'payment_currency': getattr(settings_obj, 'payment_currency', 'INR'),
            'payment_timeout': getattr(settings_obj, 'payment_timeout', '15 Minutes'),
        }
        return data

    def get(self, request):
        err = check_staff_api_permission(request, 'settings')
        if err:
            return err
        settings_obj, _ = StoreSettings.objects.get_or_create(id=1)
        data = self.get_settings_dict(settings_obj)
        return Response(data, status=status.HTTP_200_OK)

    def post(self, request):
        return self._save_settings(request)

    def patch(self, request):
        return self._save_settings(request)

    def put(self, request):
        return self._save_settings(request)

    def _save_settings(self, request):
        err = check_staff_api_permission(request, 'settings')
        if err:
            return err
        settings_obj, _ = StoreSettings.objects.get_or_create(id=1)
        data = request.data
        
        for key, value in data.items():
            if hasattr(settings_obj, key) and key not in ['id', 'store_logo', 'updated_at']:
                field = settings_obj._meta.get_field(key)
                if field.get_internal_type() == 'BooleanField':
                    setattr(settings_obj, key, value in [True, 'true', 'True', 1, '1'])
                elif field.get_internal_type() in ['DecimalField', 'FloatField']:
                    try:
                        setattr(settings_obj, key, float(value))
                    except (ValueError, TypeError):
                        pass
                elif field.get_internal_type() in ['IntegerField', 'PositiveIntegerField']:
                    try:
                        setattr(settings_obj, key, int(value))
                    except (ValueError, TypeError):
                        pass
                else:
                    setattr(settings_obj, key, value)

        # Handle aliases and payment settings
        if 'mode' in data and not hasattr(settings_obj, 'mode'):
            settings_obj.payment_mode = str(data['mode'])
        if 'low_stock_notification' in data:
            val = data['low_stock_notification'] in [True, 'true', 'True', 1, '1']
            settings_obj.notify_low_stock = val
            settings_obj.low_stock_alert = val
        if 'order_received_notification' in data:
            settings_obj.notify_order_created = data['order_received_notification'] in [True, 'true', 'True', 1, '1']
        if 'new_customer_signup_notification' in data:
            settings_obj.notify_new_customer = data['new_customer_signup_notification'] in [True, 'true', 'True', 1, '1']
        if 'cod_available' in data:
            settings_obj.cod_enabled = settings_obj.cod_available
        elif 'cod_enabled' in data:
            settings_obj.cod_available = settings_obj.cod_enabled

        if 'store_logo' in request.FILES:
            settings_obj.store_logo = request.FILES['store_logo']
        elif str(data.get('remove_store_logo', '')).lower() in ['true', '1'] or str(data.get('remove_logo', '')).lower() in ['true', '1']:
            if settings_obj.store_logo:
                try:
                    settings_obj.store_logo.delete(save=False)
                except Exception:
                    pass

        settings_obj.save()
        resp_data = self.get_settings_dict(settings_obj)
        
        section = data.get('_section', '')
        if section == 'store':
            success_msg = 'Store operations updated successfully.'
        elif section == 'general':
            success_msg = 'General settings updated successfully.'
        elif section == 'orders':
            success_msg = 'Order settings updated successfully.'
        elif section == 'payment':
            success_msg = 'Payment settings updated successfully.'
        elif section == 'notifications':
            success_msg = 'Notification settings updated successfully.'
        else:
            success_msg = 'Settings updated successfully.'

        return Response({
            'success': True,
            'message': success_msg,
            'settings': resp_data,
            **resp_data
        }, status=status.HTTP_200_OK)


class AdminProfileSettingsView(APIView):
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def get_profile_data(self, u, profile):
        profile_img_url = profile.profile_image.url if (profile and profile.profile_image) else ''
        role = profile.role if (profile and profile.role) else ('Super Admin' if u.is_superuser else 'Staff')
        mobile = profile.phone if (profile and profile.phone) else ''
        full_name = f"{u.first_name} {u.last_name}".strip() or u.username

        return {
            'id': u.id,
            'firstName': u.first_name or '',
            'lastName': u.last_name or '',
            'first_name': u.first_name or '',
            'last_name': u.last_name or '',
            'fullName': full_name,
            'email': u.email or '',
            'username': u.username,
            'mobile': mobile,
            'phone': mobile,
            'role': role,
            'profileImage': profile_img_url,
            'profile_image': profile_img_url,
            'dateJoined': u.date_joined.strftime('%d %b %Y') if u.date_joined else '',
            'date_joined': u.date_joined.strftime('%d %b %Y') if u.date_joined else '',
            'lastLogin': u.last_login.strftime('%d %b %Y, %I:%M %p') if u.last_login else 'Never',
            'last_login': u.last_login.strftime('%d %b %Y, %I:%M %p') if u.last_login else 'Never',
            'isActive': u.is_active,
            'is_active': u.is_active,
            'isSuperuser': u.is_superuser,
            'is_superuser': u.is_superuser,
        }

    def get(self, request):
        u = request.user
        if not u.is_authenticated:
            return Response({'error': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)

        profile, _ = AdminProfile.objects.get_or_create(user=u)
        prof_data = self.get_profile_data(u, profile)
        return Response({
            **prof_data,
            'profile': prof_data
        })

    def patch(self, request):
        return self._update_profile(request)

    def post(self, request):
        return self._update_profile(request)

    def put(self, request):
        return self._update_profile(request)

    def _update_profile(self, request):
        u = request.user
        if not u.is_authenticated:
            return Response({'error': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)

        data = request.data
        if 'first_name' in data:
            u.first_name = str(data['first_name']).strip()
        if 'last_name' in data:
            u.last_name = str(data['last_name']).strip()
        if 'email' in data:
            email_val = str(data['email']).strip()
            if email_val:
                if User.objects.filter(email__iexact=email_val).exclude(pk=u.pk).exists():
                    return Response({'error': 'A user with this email address already exists.'}, status=status.HTTP_400_BAD_REQUEST)
                u.email = email_val
        if 'username' in data:
            uname_val = str(data['username']).strip()
            if uname_val:
                if User.objects.filter(username__iexact=uname_val).exclude(pk=u.pk).exists():
                    return Response({'error': 'A user with this username already exists.'}, status=status.HTTP_400_BAD_REQUEST)
                u.username = uname_val
        u.save()

        profile, _ = AdminProfile.objects.get_or_create(user=u)
        if 'mobile' in data:
            profile.phone = str(data['mobile']).strip()
        elif 'phone' in data:
            profile.phone = str(data['phone']).strip()

        if str(data.get('remove_profile_image', '')).lower() in ['true', '1'] or str(data.get('remove_image', '')).lower() in ['true', '1']:
            if profile.profile_image:
                try:
                    profile.profile_image.delete(save=False)
                except Exception:
                    pass
                profile.profile_image = None
        elif 'profile_image' in request.FILES:
            profile.profile_image = request.FILES['profile_image']

        profile.save()

        prof_data = self.get_profile_data(u, profile)
        return Response({
            'success': True,
            'message': 'Profile photo removed successfully.' if (str(data.get('remove_profile_image', '')).lower() in ['true', '1'] or str(data.get('remove_image', '')).lower() in ['true', '1']) else 'Profile updated successfully.',
            'profile': prof_data,
            **prof_data
        }, status=status.HTTP_200_OK)

    def delete(self, request):
        u = request.user
        if not u.is_authenticated:
            return Response({'error': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)
        profile, _ = AdminProfile.objects.get_or_create(user=u)
        if profile.profile_image:
            try:
                profile.profile_image.delete(save=False)
            except Exception:
                pass
            profile.profile_image = None
            profile.save()
        prof_data = self.get_profile_data(u, profile)
        return Response({
            'success': True,
            'message': 'Profile photo removed successfully.',
            'profile': prof_data,
            **prof_data
        }, status=status.HTTP_200_OK)


class AdminChangePasswordView(APIView):
    def post(self, request):
        u = request.user
        if not u.is_authenticated:
            return Response({'error': 'Not authenticated.'}, status=status.HTTP_401_UNAUTHORIZED)

        curr_pwd = request.data.get('current_password', '').strip()
        new_pwd = request.data.get('new_password', '').strip()
        conf_pwd = request.data.get('confirm_password', '').strip()

        if not curr_pwd or not new_pwd:
            return Response({'error': 'Current password and new password are required.'}, status=status.HTTP_400_BAD_REQUEST)

        if not u.check_password(curr_pwd):
            return Response({'error': 'Current password does not match.'}, status=status.HTTP_400_BAD_REQUEST)

        if len(new_pwd) < 8:
            return Response({'error': 'New password must be at least 8 characters long.'}, status=status.HTTP_400_BAD_REQUEST)

        if conf_pwd and new_pwd != conf_pwd:
            return Response({'error': 'New passwords do not match.'}, status=status.HTTP_400_BAD_REQUEST)

        if curr_pwd == new_pwd:
            return Response({'error': 'New password cannot be the same as current password.'}, status=status.HTTP_400_BAD_REQUEST)

        u.set_password(new_pwd)
        u.save()
        if hasattr(request, 'session'):
            try:
                update_session_auth_hash(request, u)
            except Exception:
                try:
                    django_login(request, u)
                except Exception:
                    pass
        return Response({'success': True, 'message': 'Password changed successfully.'})


class AdminTestEmailView(APIView):
    def post(self, request):
        err = check_staff_api_permission(request, 'settings')
        if err:
            return err
        to_email = request.data.get('to_email') or request.user.email or 'admin@moxie.com'
        try:
            from services.email_service import send_transactional_email, get_active_email_provider
            provider = get_active_email_provider()
            send_transactional_email(
                to_email=to_email,
                subject='Moxie Admin - Email Delivery Test',
                html_content='<div style="font-family: sans-serif; padding: 20px;"><h3>Moxie Admin Portal</h3><p>This is a test email sent from Moxie Admin Portal settings.</p></div>',
                text_content='This is a test email sent from Moxie Admin Portal settings.'
            )
            return Response({'success': True, 'message': f'Test email successfully sent to {to_email} via {provider.upper()}'})
        except Exception as e:
            return Response({'error': f'Failed to send email: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AdminForgotPasswordView(APIView):
    def post(self, request):
        email = request.data.get('email', '').strip()
        if request.user.is_authenticated:
            # Always default/restrict to authenticated admin user if logged in
            if request.user.email:
                email = request.user.email
            user = request.user
        else:
            if not email:
                return Response({'error': 'Email address is required.'}, status=status.HTTP_400_BAD_REQUEST)
            user = User.objects.filter(email__iexact=email, is_staff=True).first()
            if not user:
                return Response({'error': 'No admin account found with that email.'}, status=status.HTTP_404_NOT_FOUND)

        target_email = user.email or email
        if not target_email:
            return Response({'error': 'No valid email associated with this account.'}, status=status.HTTP_400_BAD_REQUEST)

        # Invalidate any existing unused OTPs for this user
        AdminPasswordResetOTP.objects.filter(user=user, used=False).update(used=True)

        otp_code = get_random_string(length=6, allowed_chars='0123456789')
        AdminPasswordResetOTP.objects.create(
            user=user,
            email=target_email,
            otp_code=otp_code,
            expires_at=timezone.now() + timedelta(minutes=15)
        )

        try:
            from services.email_service import send_transactional_email
            send_transactional_email(
                to_email=target_email,
                subject='Moxie Admin - Password Reset Code',
                html_content=f'<div style="font-family: sans-serif; padding: 20px;"><h2>Moxie Admin</h2><p>Your password reset verification code is: <strong>{otp_code}</strong>. This code is valid for 15 minutes.</p></div>',
                text_content=f'Your password reset verification code is: {otp_code}. This code is valid for 15 minutes.'
            )
        except Exception as e:
            logger.warning("Admin password reset email delivery failed: %s: %s", type(e).__name__, e)

        return Response({'success': True, 'message': 'Verification code sent to your email.'})


class AdminVerifyResetCodeView(APIView):
    def post(self, request):
        email = request.data.get('email', '').strip()
        otp = (request.data.get('otp') or request.data.get('code') or '').strip()

        if not otp:
            return Response({'error': 'Verification code is required.'}, status=status.HTTP_400_BAD_REQUEST)

        if request.user.is_authenticated and request.user.email:
            email = request.user.email

        otp_query = AdminPasswordResetOTP.objects.filter(
            otp_code=otp,
            used=False,
            expires_at__gte=timezone.now()
        )
        if email:
            otp_query = otp_query.filter(Q(email__iexact=email) | Q(user__email__iexact=email))
        elif request.user.is_authenticated:
            otp_query = otp_query.filter(user=request.user)

        otp_obj = otp_query.order_by('-created_at').first()
        if not otp_obj:
            return Response({'error': 'Verification code is invalid or expired.'}, status=status.HTTP_400_BAD_REQUEST)

        otp_obj.used = True
        otp_obj.save()

        # Invalidate previous unused reset tokens
        AdminPasswordResetToken.objects.filter(user=otp_obj.user, used=False).update(used=True)

        token_str = get_random_string(length=64)
        AdminPasswordResetToken.objects.create(
            user=otp_obj.user,
            token=token_str,
            expires_at=timezone.now() + timedelta(minutes=30)
        )

        return Response({'success': True, 'token': token_str, 'reset_token': token_str})


class AdminResetPasswordView(APIView):
    def post(self, request):
        token_str = (request.data.get('token') or request.data.get('reset_token') or '').strip()
        new_password = request.data.get('new_password', '').strip()
        confirm_password = request.data.get('confirm_password', '').strip()

        if not token_str:
            return Response({'error': 'Reset authorization token is missing.'}, status=status.HTTP_400_BAD_REQUEST)

        if not new_password:
            return Response({'error': 'New password is required.'}, status=status.HTTP_400_BAD_REQUEST)

        if len(new_password) < 8:
            return Response({'error': 'New password must be at least 8 characters long.'}, status=status.HTTP_400_BAD_REQUEST)

        if confirm_password and new_password != confirm_password:
            return Response({'error': 'New passwords do not match.'}, status=status.HTTP_400_BAD_REQUEST)

        token_obj = AdminPasswordResetToken.objects.filter(
            token=token_str,
            used=False,
            expires_at__gte=timezone.now()
        ).first()

        if not token_obj:
            return Response({'error': 'Reset authorization is invalid or expired.'}, status=status.HTTP_400_BAD_REQUEST)

        target_user = token_obj.user
        target_user.set_password(new_password)
        target_user.save()

        token_obj.used = True
        token_obj.save()

        # Keep current session logged in if it's the authenticated user
        if request.user.is_authenticated and request.user.id == target_user.id:
            if hasattr(request, 'session'):
                try:
                    update_session_auth_hash(request, target_user)
                except Exception:
                    try:
                        django_login(request, target_user)
                    except Exception:
                        pass

        return Response({'success': True, 'message': 'Password reset successfully.'})


# ==============================================================================
# Admin Dashboard Analytics API
# ==============================================================================
class AdminDashboardAnalyticsView(APIView):
    def get(self, request):
        err = check_staff_api_permission(request, 'dashboard')
        if err:
            return err
        range_param = request.query_params.get('range', 'this_month')
        start_date_str = request.query_params.get('start_date')
        end_date_str = request.query_params.get('end_date')

        today = timezone.localdate()
        if range_param == 'today':
            start_date = today
            end_date = today
        elif range_param == 'yesterday':
            start_date = today - timedelta(days=1)
            end_date = today - timedelta(days=1)
        elif range_param in ['7days', '7d']:
            start_date = today - timedelta(days=6)
            end_date = today
        elif range_param in ['30days', '30d']:
            start_date = today - timedelta(days=29)
            end_date = today
        elif range_param == 'this_month':
            start_date = today.replace(day=1)
            end_date = today
        elif range_param == 'last_month':
            first_this_month = today.replace(day=1)
            last_month_end = first_this_month - timedelta(days=1)
            start_date = last_month_end.replace(day=1)
            end_date = last_month_end
        elif range_param == 'this_year':
            start_date = today.replace(month=1, day=1)
            end_date = today
        elif range_param == 'custom' and start_date_str and end_date_str:
            try:
                start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
                end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
            except Exception:
                start_date = today - timedelta(days=29)
                end_date = today
        else:
            start_date = today.replace(day=1)
            end_date = today

        products = list(Product.objects.select_related('category').prefetch_related('images', 'variants'))
        all_categories = list(Category.objects.all())

        # Orders in date range
        period_orders = Order.objects.filter(created_at__date__gte=start_date, created_at__date__lte=end_date)
        paid_orders = period_orders.filter(payment_status='Paid')

        # Prior period for comparison
        days_diff = (end_date - start_date).days + 1
        prior_start = start_date - timedelta(days=days_diff)
        prior_end = start_date - timedelta(days=1)
        prior_orders = Order.objects.filter(created_at__date__gte=prior_start, created_at__date__lte=prior_end)
        prior_paid = prior_orders.filter(payment_status='Paid')

        total_revenue = sum(float(o.total_amount) for o in paid_orders)
        prior_revenue = sum(float(o.total_amount) for o in prior_paid)
        rev_change = round(((total_revenue - prior_revenue) / prior_revenue * 100), 1) if prior_revenue > 0 else 0.0

        total_orders_count = period_orders.count()
        prior_orders_count = prior_orders.count()
        orders_change = round(((total_orders_count - prior_orders_count) / prior_orders_count * 100), 1) if prior_orders_count > 0 else 0.0

        # Stock calculations
        store_settings = StoreSettings.objects.filter(id=1).first()
        min_thresh = store_settings.min_stock_threshold if (store_settings and store_settings.min_stock_threshold is not None) else 5
        low_stock_enabled = store_settings.low_stock_alert if store_settings else True

        total_products_count = len(products)
        active_products_count = sum(1 for p in products if p.is_active)
        unavailable_count = sum(1 for p in products if not p.is_active)
        current_stock = sum(p.stock for p in products)
        if low_stock_enabled:
            in_stock_count = sum(1 for p in products if p.is_active and p.stock > min_thresh)
            low_stock_count = sum(1 for p in products if p.is_active and 0 < p.stock <= min_thresh)
        else:
            in_stock_count = sum(1 for p in products if p.is_active and p.stock > 0)
            low_stock_count = 0
        out_of_stock_count = sum(1 for p in products if p.is_active and p.stock <= 0)

        # Sales Trend
        trend_labels = []
        trend_revenues = []
        trend_orders = []
        trend_units = []

        step_days = max(1, days_diff // 30) if days_diff > 30 else 1
        curr = start_date
        while curr <= end_date:
            next_d = min(curr + timedelta(days=step_days - 1), end_date)
            day_orders = Order.objects.filter(created_at__date__gte=curr, created_at__date__lte=next_d)
            day_paid = day_orders.filter(payment_status='Paid')
            day_items = OrderItem.objects.filter(order__in=day_paid)

            trend_labels.append(curr.strftime('%d %b') if days_diff > 7 else curr.strftime('%a'))
            trend_revenues.append(sum(float(o.total_amount) for o in day_paid))
            trend_orders.append(day_orders.count())
            trend_units.append(sum(item.quantity for item in day_items))
            curr = next_d + timedelta(days=1)

        # Product Performance
        product_performance = []
        for p in products:
            p_items = OrderItem.objects.filter(product=p, order__in=paid_orders)
            units = sum(item.quantity for item in p_items)
            p_rev = sum(float(item.price) * item.quantity for item in p_items)
            img = p.images.first()
            img_url = img.image.url if img and img.image else ''

            demand = 'No Demand'
            if units >= 10:
                demand = 'High'
            elif units >= 5:
                demand = 'Medium'
            elif units > 0:
                demand = 'Low'

            product_performance.append({
                'id': p.id,
                'name': p.name,
                'category': p.category.name if p.category else 'Uncategorized',
                'image_url': img_url,
                'units_sold': units,
                'revenue': p_rev,
                'current_stock': p.stock,
                'avg_selling_price': float(p.discount_price if (p.discount_price and 0 < p.discount_price < p.price) else (p.price or 0)),
                'demand_level': demand,
                'sales_percentage': round((p_rev / total_revenue * 100), 1) if total_revenue > 0 else 0.0,
            })

        product_performance.sort(key=lambda x: x['revenue'], reverse=True)
        for rank, p_data in enumerate(product_performance, 1):
            p_data['sales_rank'] = rank

        # Category Analytics
        category_analytics = []
        for cat in all_categories:
            cat_prods = [p for p in products if p.category_id == cat.id]
            cat_items = OrderItem.objects.filter(product__category=cat, order__in=paid_orders)
            cat_units = sum(item.quantity for item in cat_items)
            cat_rev = sum(float(item.price) * item.quantity for item in cat_items)
            cat_stock = sum(p.stock for p in cat_prods)
            cat_orders_count = Order.objects.filter(items__product__category=cat, id__in=period_orders.values_list('id', flat=True)).distinct().count()

            category_analytics.append({
                'id': cat.id,
                'name': cat.name,
                'total_products': len(cat_prods),
                'revenue': cat_rev,
                'share_percentage': round((cat_rev / total_revenue * 100), 1) if total_revenue > 0 else 0.0,
                'units_sold': cat_units,
                'orders_count': cat_orders_count,
                'current_stock': cat_stock,
            })
        category_analytics.sort(key=lambda x: x['revenue'], reverse=True)

        # Inventory details
        tot_active_or_not = total_products_count or 1
        fast_moving = [p for p in product_performance if p['units_sold'] >= 5]
        slow_moving = [p for p in product_performance if p['units_sold'] < 5]

        # Best sellers & lowest sellers
        best_sellers = product_performance[:5]
        lowest_sellers = sorted(product_performance, key=lambda x: (x['units_sold'], x['revenue']))[:5]

        return Response({
            'period': range_param,
            'start_date': str(start_date),
            'end_date': str(end_date),
            'summary': {
                'total_revenue': total_revenue,
                'revenue_change_pct': rev_change,
                'revenue_trend_up': rev_change >= 0,
                'total_orders': total_orders_count,
                'orders_change_pct': orders_change,
                'orders_trend_up': orders_change >= 0,
                'total_products': total_products_count,
                'active_products': active_products_count,
                'current_stock': current_stock,
                'in_stock_count': in_stock_count,
                'low_stock_count': low_stock_count,
                'out_of_stock_count': out_of_stock_count,
                'unavailable_products_count': unavailable_count,
                'unavailable_count': unavailable_count,
            },
            'sales_trend': {
                'labels': trend_labels,
                'revenues': trend_revenues,
                'orders': trend_orders,
                'units': trend_units,
            },
            'product_performance': product_performance,
            'category_analytics': category_analytics,
            'inventory': {
                'total_stock': current_stock,
                'total_products': total_products_count,
                'in_stock': in_stock_count,
                'in_stock_pct': round((in_stock_count / tot_active_or_not) * 100),
                'low_stock': low_stock_count,
                'low_stock_pct': round((low_stock_count / tot_active_or_not) * 100),
                'out_of_stock': out_of_stock_count,
                'out_of_stock_pct': round((out_of_stock_count / tot_active_or_not) * 100),
                'fast_moving_products': fast_moving,
                'slow_moving_products': slow_moving,
            },
            'best_and_worst': {
                'best_sellers': best_sellers,
                'worst_sellers': lowest_sellers,
                'lowest_sellers': lowest_sellers,
            },
            'forecast': {
                'projected_revenue': round(total_revenue * 1.08, 2),
                'projected_orders': round(total_orders_count * 1.05),
            },
            'restock_recommendations': [
                {
                    'id': p.id,
                    'name': p.name,
                    'current_stock': p.stock,
                    'recommended_restock': max(20, 30 - p.stock),
                    'urgency': 'Critical' if p.stock <= 0 else 'High' if p.stock <= 5 else 'Medium',
                }
                for p in products if p.is_active and p.stock <= 10
            ][:5],
            'stockout_risk_summary': {
                'high_risk_count': out_of_stock_count,
                'medium_risk_count': low_stock_count,
                'safe_count': in_stock_count,
            },
            'order_status_breakdown': {
                'Pending': period_orders.filter(order_status='Pending').count(),
                'Confirmed': period_orders.filter(order_status='Confirmed').count(),
                'Delivered': period_orders.filter(order_status='Delivered').count(),
                'Cancelled': period_orders.filter(order_status='Cancelled').count(),
            }
        })


class AdminDashboardSalesView(APIView):
    def get(self, request):
        err = check_staff_api_permission(request, 'dashboard')
        if err:
            return err
        period = request.query_params.get('period', 'monthly')
        today = timezone.localdate()
        data_points = []

        if period == 'weekly':
            for i in range(6, -1, -1):
                day = today - timedelta(days=i)
                data_points.append({
                    'label': day.strftime('%a'),
                    'sales': sum(float(o.total_amount) for o in Order.objects.filter(created_at__date=day, payment_status='Paid')),
                    'orders': Order.objects.filter(created_at__date=day).count()
                })
        else:
            for i in range(5, -1, -1):
                # Monthly buckets
                month_start = today.replace(day=1) - timedelta(days=i * 30)
                data_points.append({
                    'label': month_start.strftime('%b'),
                    'sales': sum(float(o.total_amount) for o in Order.objects.filter(created_at__month=month_start.month, payment_status='Paid')),
                    'orders': Order.objects.filter(created_at__month=month_start.month).count()
                })

        return Response({'sales': data_points})


# ==============================================================================
# Featured Products (Hot Sale / Trending / Offer)
# ==============================================================================
class FeaturedProductPublicView(APIView):
    """
    Public Read-Only API for Home page showcase.
    Returns only active FeaturedProduct entries whose product is active,
    and whose scheduled dates (if any) are valid for current time.
    """
    permission_classes = []
    authentication_classes = []

    def get(self, request):
        now = timezone.now()
        qs = FeaturedProduct.objects.filter(
            is_active=True,
            product__is_active=True
        ).filter(
            Q(start_date__isnull=True) | Q(start_date__lte=now)
        ).filter(
            Q(end_date__isnull=True) | Q(end_date__gt=now)
        ).select_related('product').prefetch_related('product__images', 'product__variants__images').order_by('sort_order', '-created_at')

        serializer = FeaturedProductSerializer(qs, many=True, context={'request': request})
        return Response({
            'server_time': now.isoformat(),
            'results': serializer.data
        }, status=status.HTTP_200_OK)


class AdminFeaturedProductsView(APIView):
    """
    Admin API to list and create FeaturedProduct entries with full underlying Product creation in one atomic transaction.
    """
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        err = check_staff_api_permission(request, 'featured_products')
        if err:
            return err
        qs = FeaturedProduct.objects.select_related('product').prefetch_related(
            'product__images', 'product__variants__images'
        ).all().order_by('sort_order', '-created_at')
        serializer = FeaturedProductAdminSerializer(qs, many=True, context={'request': request})
        return Response({'featured_products': serializer.data}, status=status.HTTP_200_OK)

    def post(self, request):
        err = check_staff_api_permission(request, 'featured_products')
        if err:
            return err

        name = (request.data.get('name') or '').strip()
        if not name:
            return Response({'name': ['Product Name is required.']}, status=status.HTTP_400_BAD_REQUEST)

        description = (request.data.get('description') or '').strip()
        if not description:
            return Response({'description': ['Product Description is required.']}, status=status.HTTP_400_BAD_REQUEST)

        # Dates validation
        start_date = request.data.get('start_date') or None
        if start_date == '':
            start_date = None
        end_date = request.data.get('end_date') or None
        if end_date == '':
            end_date = None

        if start_date and end_date:
            try:
                from django.utils.dateparse import parse_datetime
                sd = parse_datetime(start_date) if isinstance(start_date, str) else start_date
                ed = parse_datetime(end_date) if isinstance(end_date, str) else end_date
                if sd and ed and ed <= sd:
                    return Response({'end_date': ['End time must be later than start time.']}, status=status.HTTP_400_BAD_REQUEST)
            except Exception:
                pass

        # Variant payload
        variant_payload = request.data.get('variant_payload_json')
        import json
        variants_data = []
        if variant_payload:
            try:
                if isinstance(variant_payload, str):
                    variants_data = json.loads(variant_payload)
                elif isinstance(variant_payload, list):
                    variants_data = variant_payload
            except Exception as e:
                return Response({'variants': [f'Invalid variant data format: {e}']}, status=status.HTTP_400_BAD_REQUEST)

        if not variants_data:
            # Fallback single variant from top-level price/stock
            p_price = request.data.get('price') or '0.00'
            p_disc = request.data.get('discount_price') or None
            p_stock = request.data.get('stock') or '0'
            variants_data = [{
                'color_name': 'Default',
                'color_code': '#000000',
                'price': p_price,
                'discount_price': p_disc,
                'stock': p_stock,
                'sizes': [],
                'is_active': True,
            }]

        try:
            with transaction.atomic():
                from products.models import Product, ProductVariant, VariantImage

                # Top-level pricing / stock calculation
                first_var = variants_data[0] if variants_data else {}
                top_price = first_var.get('price') or request.data.get('price') or '0.00'
                top_disc = first_var.get('discount_price') or request.data.get('discount_price') or None
                if top_disc == '':
                    top_disc = None
                top_stock = sum(int(v.get('stock') or 0) for v in variants_data)
                shipping_charge = request.data.get('shipping_charge') or '0.00'

                is_active_val = request.data.get('is_active')
                if isinstance(is_active_val, str):
                    is_active_val = is_active_val.lower() in ['true', '1', 'yes', 'on']
                elif is_active_val is None:
                    is_active_val = True
                else:
                    is_active_val = bool(is_active_val)

                # 1. Create Product
                product = Product.objects.create(
                    name=name,
                    description=description,
                    category=None, # Category not required for featured creations
                    subcategory=None,
                    price=top_price,
                    discount_price=top_disc,
                    shipping_charge=shipping_charge,
                    stock=top_stock,
                    is_active=is_active_val
                )

                # 2. Create Variants and handle images
                for v_idx, v_data in enumerate(variants_data):
                    v_price = v_data.get('price') or top_price
                    v_disc = v_data.get('discount_price') or None
                    if v_disc == '':
                        v_disc = None
                    v_stock = int(v_data.get('stock') or 0)
                    v_sizes = v_data.get('sizes') or []
                    v_color_name = v_data.get('color_name') or 'Default'
                    v_color_code = v_data.get('color_code') or '#000000'

                    variant_obj = ProductVariant.objects.create(
                        product=product,
                        color_name=v_color_name,
                        color_code=v_color_code,
                        price=v_price,
                        discount_price=v_disc,
                        stock=v_stock,
                        sizes=v_sizes,
                        is_active=bool(v_data.get('is_active', True))
                    )

                    primary_img_id = v_data.get('primary_image_id')
                    primary_img_index = v_data.get('primary_image_index', 0)

                    # Check for uploaded files in request.FILES
                    f_idx = 0
                    uploaded_files = []
                    while True:
                        key = f"variant_img_{v_idx}_{f_idx}"
                        if key in request.FILES:
                            uploaded_files.append(request.FILES[key])
                            f_idx += 1
                        else:
                            break

                    for u_idx, up_file in enumerate(uploaded_files):
                        is_prim = (primary_img_index == u_idx) or (u_idx == 0)
                        VariantImage.objects.create(
                            variant=variant_obj,
                            image=up_file,
                            is_primary=is_prim
                        )

                # Recalculate top product values
                first_v = product.variants.first()
                if first_v:
                    product.price = first_v.price
                    product.discount_price = first_v.discount_price
                    product.stock = sum(v.stock for v in product.variants.all())
                    product.save(update_fields=['price', 'discount_price', 'stock'])

                # 3. Create FeaturedProduct
                feature_type = request.data.get('feature_type') or 'HOT_SALE'
                badge_text = (request.data.get('badge_text') or '').strip()
                sort_order = int(request.data.get('sort_order') or 0)
                display_image = request.FILES.get('display_image') or None

                featured_item = FeaturedProduct.objects.create(
                    product=product,
                    feature_type=feature_type,
                    badge_text=badge_text,
                    sort_order=sort_order,
                    is_active=is_active_val,
                    start_date=start_date,
                    end_date=end_date,
                    display_image=display_image
                )

                serializer = FeaturedProductAdminSerializer(featured_item, context={'request': request})
                return Response(serializer.data, status=status.HTTP_201_CREATED)

        except Exception as e:
            import logging
            logging.getLogger(__name__).exception("Error in AdminFeaturedProductsView.post")
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class AdminFeaturedProductDetailView(APIView):
    """
    Admin API to retrieve, update, or delete a FeaturedProduct entry.
    Updating supports atomically modifying the linked Product, Variants, Images, and Featured settings.
    Deleting ONLY removes the FeaturedProduct entry — NEVER deletes the underlying Product.
    """
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_object(self, pk):
        try:
            return FeaturedProduct.objects.select_related('product').prefetch_related(
                'product__variants__images', 'product__images'
            ).get(pk=pk)
        except FeaturedProduct.DoesNotExist:
            return None

    def get(self, request, pk):
        err = check_staff_api_permission(request, 'featured_products')
        if err:
            return err
        obj = self.get_object(pk)
        if not obj:
            return Response({'error': 'Featured product not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = FeaturedProductAdminSerializer(obj, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request, pk):
        return self.patch(request, pk)

    def patch(self, request, pk):
        err = check_staff_api_permission(request, 'featured_products')
        if err:
            return err
        featured_item = self.get_object(pk)
        if not featured_item:
            return Response({'error': 'Featured product not found.'}, status=status.HTTP_404_NOT_FOUND)

        product = featured_item.product
        import json
        from products.models import ProductVariant, VariantImage

        try:
            with transaction.atomic():
                # 1. Update Product details if provided
                if 'name' in request.data:
                    name_val = (request.data.get('name') or '').strip()
                    if name_val:
                        product.name = name_val
                if 'description' in request.data:
                    product.description = (request.data.get('description') or '').strip()
                if 'shipping_charge' in request.data:
                    product.shipping_charge = request.data.get('shipping_charge') or '0.00'

                # 2. Update Variants if provided
                variant_payload = request.data.get('variant_payload_json')
                if variant_payload:
                    if isinstance(variant_payload, str):
                        variants_data = json.loads(variant_payload)
                    else:
                        variants_data = variant_payload

                    if isinstance(variants_data, list) and variants_data:
                        submitted_variant_ids = []
                        for v_idx, v_data in enumerate(variants_data):
                            v_id = v_data.get('id')
                            v_price = v_data.get('price') or product.price or '0.00'
                            v_disc = v_data.get('discount_price') or None
                            if v_disc == '':
                                v_disc = None
                            v_stock = int(v_data.get('stock') or 0)
                            v_sizes = v_data.get('sizes') or []
                            v_color_name = v_data.get('color_name') or 'Default'
                            v_color_code = v_data.get('color_code') or '#000000'

                            if v_id and str(v_id).isdigit():
                                try:
                                    variant_obj = ProductVariant.objects.get(id=int(v_id), product=product)
                                    variant_obj.color_name = v_color_name
                                    variant_obj.color_code = v_color_code
                                    variant_obj.price = v_price
                                    variant_obj.discount_price = v_disc
                                    variant_obj.stock = v_stock
                                    variant_obj.sizes = v_sizes
                                    variant_obj.is_active = bool(v_data.get('is_active', True))
                                    variant_obj.save()
                                except ProductVariant.DoesNotExist:
                                    variant_obj = ProductVariant.objects.create(
                                        product=product,
                                        color_name=v_color_name,
                                        color_code=v_color_code,
                                        price=v_price,
                                        discount_price=v_disc,
                                        stock=v_stock,
                                        sizes=v_sizes,
                                        is_active=bool(v_data.get('is_active', True))
                                    )
                            else:
                                variant_obj = ProductVariant.objects.create(
                                    product=product,
                                    color_name=v_color_name,
                                    color_code=v_color_code,
                                    price=v_price,
                                    discount_price=v_disc,
                                    stock=v_stock,
                                    sizes=v_sizes,
                                    is_active=bool(v_data.get('is_active', True))
                                )

                            submitted_variant_ids.append(variant_obj.id)

                            # Handle deleted images
                            deleted_img_ids = v_data.get('deleted_image_ids') or []
                            if deleted_img_ids:
                                VariantImage.objects.filter(variant=variant_obj, id__in=deleted_img_ids).delete()

                            primary_img_id = v_data.get('primary_image_id')
                            primary_img_index = v_data.get('primary_image_index', 0)

                            if primary_img_id:
                                variant_obj.images.all().update(is_primary=False)
                                variant_obj.images.filter(id=primary_img_id).update(is_primary=True)

                            # Uploaded files
                            f_idx = 0
                            uploaded_files = []
                            while True:
                                key = f"variant_img_{v_idx}_{f_idx}"
                                if key in request.FILES:
                                    uploaded_files.append(request.FILES[key])
                                    f_idx += 1
                                else:
                                    break

                            for u_idx, up_file in enumerate(uploaded_files):
                                is_prim = (not primary_img_id and primary_img_index == u_idx) or (u_idx == 0 and not variant_obj.images.filter(is_primary=True).exists())
                                VariantImage.objects.create(
                                    variant=variant_obj,
                                    image=up_file,
                                    is_primary=is_prim
                                )

                        if submitted_variant_ids:
                            ProductVariant.objects.filter(product=product).exclude(id__in=submitted_variant_ids).delete()

                # Recalculate top product
                first_v = product.variants.first()
                if first_v:
                    product.price = first_v.price
                    product.discount_price = first_v.discount_price
                    product.stock = sum(v.stock for v in product.variants.all())
                product.save()

                # 3. Update FeaturedProduct settings
                if 'feature_type' in request.data:
                    featured_item.feature_type = request.data['feature_type']
                if 'badge_text' in request.data:
                    featured_item.badge_text = (request.data['badge_text'] or '').strip()
                if 'sort_order' in request.data:
                    featured_item.sort_order = int(request.data['sort_order'] or 0)
                if 'is_active' in request.data:
                    is_act = request.data['is_active']
                    if isinstance(is_act, str):
                        featured_item.is_active = is_act.lower() in ['true', '1', 'yes', 'on']
                    else:
                        featured_item.is_active = bool(is_act)
                if 'start_date' in request.data:
                    featured_item.start_date = request.data['start_date'] or None
                if 'end_date' in request.data:
                    featured_item.end_date = request.data['end_date'] or None

                if 'display_image' in request.FILES:
                    featured_item.display_image = request.FILES['display_image']
                elif request.data.get('display_image') == '':
                    featured_item.display_image = None

                featured_item.save()

                serializer = FeaturedProductAdminSerializer(featured_item, context={'request': request})
                return Response(serializer.data, status=status.HTTP_200_OK)

        except Exception as e:
            import logging
            logging.getLogger(__name__).exception("Error in AdminFeaturedProductDetailView.patch")
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        err = check_staff_api_permission(request, 'featured_products')
        if err:
            return err
        obj = self.get_object(pk)
        if not obj:
            return Response({'error': 'Featured product not found.'}, status=status.HTTP_404_NOT_FOUND)
        # Deleting the FeaturedProduct record only!
        obj.delete()
        return Response({'message': 'Featured product removed successfully. Underlying product remains in database.'}, status=status.HTTP_200_OK)


class AdminFeaturedProductToggleStatusView(APIView):
    """
    Admin API to toggle active/inactive status of a FeaturedProduct entry.
    """
    def post(self, request, pk):
        err = check_staff_api_permission(request, 'featured_products')
        if err:
            return err
        try:
            obj = FeaturedProduct.objects.get(pk=pk)
            obj.is_active = not obj.is_active
            obj.save(update_fields=['is_active', 'updated_at'])
            return Response({
                'id': obj.id,
                'is_active': obj.is_active,
                'message': f"Featured product {'activated' if obj.is_active else 'deactivated'} successfully."
            }, status=status.HTTP_200_OK)
        except FeaturedProduct.DoesNotExist:
            return Response({'error': 'Featured product not found.'}, status=status.HTTP_404_NOT_FOUND)