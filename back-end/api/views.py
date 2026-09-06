import json
import re
import uuid
from datetime import datetime, timedelta
from django.conf import settings
from django.contrib.auth import authenticate, login as django_login, logout as django_logout, update_session_auth_hash
from django.contrib.auth.models import User
from django.core.mail import send_mail
from django.db import transaction
from django.db.models import Avg, DecimalField, ExpressionWrapper, F, Q, Sum
from django.db.models.functions import Coalesce
from django.utils import timezone
from django.utils.crypto import get_random_string
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator

from rest_framework import generics, permissions, status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from banners.models import Banner
from categories.models import Category, Subcategory
from products.models import Product, ProductImage, ProductVariant, Review, VariantImage

from .models import (
    AdminPasswordResetOTP,
    AdminPasswordResetToken,
    AdminProfile,
    CustomerProfile,
    Notification,
    Offer,
    Order,
    OrderItem,
    StoreSettings,
)
from .permissions_utils import (
    check_staff_api_permission,
    get_first_allowed_admin_url,
    get_user_permissions,
    has_admin_permission,
    is_super_admin,
)
from .razorpay_service import RazorpayService
from .serializers import (
    BannerSerializer,
    CategorySerializer,
    OrderCreateSerializer,
    ProductSerializer,
    ReviewSerializer,
    SubcategorySerializer,
)


# ==============================================================================
# Health Check
# ==============================================================================
class HealthCheckView(APIView):
    permission_classes = []
    authentication_classes = []

    def get(self, request):
        return Response({'status': 'ok'}, status=status.HTTP_200_OK)


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
        first_name = data.get('firstName', '').strip()
        last_name = data.get('lastName', '').strip()
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')

        if not email or not password:
            return Response({'error': 'Email and password are required.'}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(email=email).exists() or User.objects.filter(username=email).exists():
            return Response({'error': 'A user with this email address already exists.'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.create_user(
            username=email,
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name
        )
        CustomerProfile.objects.get_or_create(user=user)

        try:
            Notification.objects.create(
                title="New Customer Registration",
                sender=f"{first_name} {last_name}".strip() or email,
                sender_initial=(first_name[:1] or email[:1]).upper(),
                sender_color="#10b981",
                body=f"New customer registered: {email}",
                full_body=f"Name: {first_name} {last_name}\nEmail: {email}\nRegistered at: {timezone.now().strftime('%d %b %Y, %I:%M %p')}",
                category_badge="Customer",
                department="User Management",
                notification_type="registration",
                user=user,
                target_url="/admin/customers/"
            )
        except Exception:
            pass

        return Response({
            'success': True,
            'message': 'Account created successfully.',
            'user': {
                'id': user.id,
                'name': f"{first_name} {last_name}".strip() or email.split('@')[0].capitalize(),
                'email': user.email
            }
        }, status=status.HTTP_201_CREATED)


# ==============================================================================
# Categories & Subcategories
# ==============================================================================
class CategoryListView(generics.ListCreateAPIView):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer

    def get_queryset(self):
        if self.request.user.is_authenticated and self.request.user.is_staff:
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

    def get_queryset(self):
        if self.request.user.is_authenticated and self.request.user.is_staff:
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

    def get_queryset(self):
        if self.request.user.is_authenticated and self.request.user.is_staff:
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
            return Review.objects.all().order_by('-created_at')
        return Review.objects.filter(is_active=True, status='Approved').order_by('-created_at')

    def create(self, request, *args, **kwargs):
        settings_obj = StoreSettings.objects.filter(id=1).first()
        if settings_obj and not settings_obj.allow_reviews:
            return Response(
                {'error': 'Product reviews and ratings are currently disabled by store administration.'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        rev = serializer.save()
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
                target_url='/admin/review/'
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
# Shared Order Totals & Tax Calculation Helper
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
            # Inclusive Tax: Gross product subtotal already contains tax portion
            # tax_portion = round(gross_subtotal * rate / (100 + rate), 2)
            tax_amount = round(subtotal_val * tax_rate / (100.0 + tax_rate), 2)
            total_amount = round(subtotal_val + delivery_val, 2)
        else:
            # Exclusive Tax: Tax is added on top of subtotal
            # tax_amount = round(subtotal * rate / 100, 2)
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

        if not (settings_obj.online_payment_enabled and settings_obj.razorpay_enabled):
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

        serializer = OrderCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        req_payment_method = str(request.data.get('payment_method', '')).strip().lower()
        if req_payment_method in ['cod', 'cash on delivery', 'cash_on_delivery', 'cash']:
            if not (settings_obj.cod_available and settings_obj.cod_enabled):
                return Response(
                    {'error': 'Cash on Delivery is currently unavailable.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        data = serializer.validated_data
        items_data = data['items']

        with transaction.atomic():
            subtotal = 0
            total_quantity = 0
            order_items_to_create = []

            for item in items_data:
                product = Product.objects.get(id=item['product_id'])
                variant = None
                variant_id = item.get('variant_id')
                color_name = item.get('color_name')
                size = item.get('size')

                if variant_id:
                    try:
                        variant = ProductVariant.objects.get(id=variant_id, product=product)
                        color_name = color_name or variant.color_name
                    except ProductVariant.DoesNotExist:
                        pass

                if variant and (variant.discount_price or variant.price):
                    price = variant.discount_price if variant.discount_price is not None else variant.price
                else:
                    price = product.discount_price if product.discount_price is not None else product.price

                subtotal += float(price) * item['quantity']
                total_quantity += item['quantity']
                order_items_to_create.append({
                    'product': product,
                    'variant': variant,
                    'color_name': color_name,
                    'size': size,
                    'quantity': item['quantity'],
                    'price': price
                })

            if settings_obj.min_order_amount and float(settings_obj.min_order_amount) > 0:
                min_amt = float(settings_obj.min_order_amount)
                if subtotal < min_amt:
                    return Response(
                        {'error': f"Minimum order amount is ₹{min_amt:,.2f}."},
                        status=status.HTTP_400_BAD_REQUEST
                    )

            if settings_obj.max_order_amount and float(settings_obj.max_order_amount) > 0:
                max_amt = float(settings_obj.max_order_amount)
                if subtotal > max_amt:
                    return Response(
                        {'error': f"Maximum order amount is ₹{max_amt:,.2f}."},
                        status=status.HTTP_400_BAD_REQUEST
                    )

            # Online payments: Standard free delivery
            delivery_fee = 0.0
            totals = calculate_order_totals(subtotal, settings_obj, delivery_fee=delivery_fee)
            total_amount = totals['total_amount']
            amount_in_paise = int(round(total_amount * 100))

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

            order = Order.objects.create(
                user=user_obj,
                shipping_name=data['shipping_name'],
                shipping_phone=data['shipping_phone'],
                shipping_address=data['shipping_address'],
                shipping_city=data['shipping_city'],
                shipping_pincode=data['shipping_pincode'],
                subtotal_amount=subtotal,
                shipping_fee=totals['delivery_fee'],
                tax_type=totals['tax_type'],
                tax_rate=totals['tax_rate'],
                tax_amount=totals['tax_amount'],
                tax_included=totals['tax_included'],
                total_amount=total_amount,
                payment_status='Pending',
                order_status='Pending',
                razorpay_order_id=rzp_order['id'],
                order_number=''
            )
            order.order_number = f"{prefix}-{order.id:04d}"
            order.save(update_fields=['order_number'])

            for item_info in order_items_to_create:
                OrderItem.objects.create(
                    order=order,
                    product=item_info['product'],
                    variant=item_info['variant'],
                    color_name=item_info['color_name'],
                    size=item_info['size'],
                    quantity=item_info['quantity'],
                    price=item_info['price']
                )

            # Create Notification
            try:
                Notification.objects.create(
                    title=f"New Order #{order.id}",
                    sender=order.shipping_name,
                    sender_initial=order.shipping_name[:1].upper() if order.shipping_name else 'C',
                    body=f"New order placed for ₹{order.total_amount:.2f}",
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
            'currency': 'INR'
        }, status=status.HTTP_201_CREATED)


class CreateCodOrderView(APIView):
    def post(self, request):
        settings_obj, _ = StoreSettings.objects.get_or_create(id=1)
        if settings_obj.maintenance_mode:
            return Response(
                {'error': 'Store is currently under scheduled maintenance. Orders cannot be placed at this time.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        if settings_obj.require_login_before_checkout and not settings_obj.allow_guest_checkout:
            cust_email = (request.data.get('customer_email') or request.data.get('email') or '').strip()
            if not ((request.user and request.user.is_authenticated) or cust_email):
                return Response(
                    {'error': 'Login is required before checkout. Please sign in to complete your order.'},
                    status=status.HTTP_401_UNAUTHORIZED
                )

        if not (settings_obj.cod_available and settings_obj.cod_enabled):
            return Response(
                {'error': 'Cash on Delivery is currently unavailable.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        req_data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
        req_data['payment_method'] = 'cod'

        serializer = OrderCreateSerializer(data=req_data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        items_data = data['items']

        with transaction.atomic():
            subtotal = 0
            total_quantity = 0
            order_items_to_create = []

            for item in items_data:
                product = Product.objects.get(id=item['product_id'])
                variant = None
                variant_id = item.get('variant_id')
                color_name = item.get('color_name')
                size = item.get('size')

                if variant_id:
                    try:
                        variant = ProductVariant.objects.get(id=variant_id, product=product)
                        color_name = color_name or variant.color_name
                    except ProductVariant.DoesNotExist:
                        pass

                if variant and (variant.discount_price or variant.price):
                    price = variant.discount_price if variant.discount_price is not None else variant.price
                else:
                    price = product.discount_price if product.discount_price is not None else product.price

                subtotal += float(price) * item['quantity']
                total_quantity += item['quantity']
                order_items_to_create.append({
                    'product': product,
                    'variant': variant,
                    'color_name': color_name,
                    'size': size,
                    'quantity': item['quantity'],
                    'price': price
                })

            if settings_obj.min_order_amount and float(settings_obj.min_order_amount) > 0:
                min_amt = float(settings_obj.min_order_amount)
                if subtotal < min_amt:
                    return Response(
                        {'error': f"Minimum order amount is ₹{min_amt:,.2f}."},
                        status=status.HTTP_400_BAD_REQUEST
                    )

            if settings_obj.max_order_amount and float(settings_obj.max_order_amount) > 0:
                max_amt = float(settings_obj.max_order_amount)
                if subtotal > max_amt:
                    return Response(
                        {'error': f"Maximum order amount is ₹{max_amt:,.2f}."},
                        status=status.HTTP_400_BAD_REQUEST
                    )

            delivery_fee = 100.0
            totals = calculate_order_totals(subtotal, settings_obj, delivery_fee=delivery_fee)
            total_amount = totals['total_amount']

            prefix = settings_obj.order_prefix or 'MOX'
            user_obj = None
            if request.user and request.user.is_authenticated:
                user_obj = request.user
            else:
                cust_email = (request.data.get('customer_email') or request.data.get('email') or '').strip()
                if cust_email:
                    user_obj = User.objects.filter(email__iexact=cust_email).first() or User.objects.filter(username__iexact=cust_email).first()

            order = Order.objects.create(
                user=user_obj,
                shipping_name=data['shipping_name'],
                shipping_phone=data['shipping_phone'],
                shipping_address=data['shipping_address'],
                shipping_city=data['shipping_city'],
                shipping_pincode=data['shipping_pincode'],
                subtotal_amount=subtotal,
                shipping_fee=totals['delivery_fee'],
                tax_type=totals['tax_type'],
                tax_rate=totals['tax_rate'],
                tax_amount=totals['tax_amount'],
                tax_included=totals['tax_included'],
                total_amount=total_amount,
                payment_status='Pending (COD)',
                order_status='Pending',
                razorpay_order_id=f"cod_{uuid.uuid4().hex[:12]}",
                stock_decremented=bool(settings_obj.enable_stock_management),
                order_number=''
            )
            order.order_number = f"{prefix}-{order.id:04d}"
            order.save(update_fields=['order_number'])

            for item_info in order_items_to_create:
                OrderItem.objects.create(
                    order=order,
                    product=item_info['product'],
                    variant=item_info['variant'],
                    color_name=item_info['color_name'],
                    size=item_info['size'],
                    quantity=item_info['quantity'],
                    price=item_info['price']
                )
                if settings_obj.enable_stock_management:
                    v = item_info['variant']
                    p = item_info['product']
                    qty = item_info['quantity']
                    if v and v.stock is not None:
                        v.stock = max(0, v.stock - qty)
                        v.save(update_fields=['stock'])
                    if p and p.stock is not None:
                        p.stock = max(0, p.stock - qty)
                        p.save(update_fields=['stock'])

            # Create Notification
            try:
                Notification.objects.create(
                    title=f"New COD Order #{order.id}",
                    sender=order.shipping_name,
                    sender_initial=order.shipping_name[:1].upper() if order.shipping_name else 'C',
                    body=f"New Cash on Delivery order placed for ₹{order.total_amount:.2f}",
                    notification_type='order',
                    order=order,
                    user=order.user,
                    target_url='/admin/orders/'
                )
            except Exception:
                pass

        return Response({
            'success': True,
            'order_id': order.id,
            'order_number': order.order_number,
            'total_amount': order.total_amount,
            'payment_status': order.payment_status,
            'order_status': order.order_status
        }, status=status.HTTP_201_CREATED)


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

        if order.payment_status == 'Paid':
            return Response({
                'message': 'Payment already verified and captured.',
                'order_id': order.id
            }, status=status.HTTP_200_OK)

        rzp_service = RazorpayService()
        is_valid = rzp_service.verify_payment_signature(
            razorpay_order_id=razorpay_order_id,
            razorpay_payment_id=razorpay_payment_id,
            razorpay_signature=razorpay_signature
        )

        if not is_valid:
            order.payment_status = 'Failed'
            order.save()
            return Response(
                {'error': 'Signature verification failed. Potential tampering detected.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        store_settings = StoreSettings.objects.filter(id=1).first()
        auto_confirm = store_settings.auto_confirm_orders if store_settings else True

        with transaction.atomic():
            order.payment_status = 'Paid'
            order.order_status = 'Confirmed' if auto_confirm else 'Pending'
            order.razorpay_payment_id = razorpay_payment_id
            order.razorpay_signature = razorpay_signature
            order.save()

            if not order.stock_decremented:
                stock_mgmt_enabled = store_settings.enable_stock_management if store_settings else True
                low_stock_enabled = store_settings.low_stock_alert if store_settings else True
                min_thresh = store_settings.min_stock_threshold if (store_settings and store_settings.min_stock_threshold is not None) else 5

                if stock_mgmt_enabled:
                    for item in order.items.all():
                        if item.product:
                            item.product.stock = max(0, item.product.stock - item.quantity)
                            item.product.save()
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
                        if item.variant:
                            item.variant.stock = max(0, item.variant.stock - item.quantity)
                            item.variant.save()
                order.stock_decremented = True
                order.save()

        return Response({
            'message': 'Payment signature verified successfully.',
            'order_id': order.id
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
                                        if item.product:
                                            item.product.stock = max(0, item.product.stock - item.quantity)
                                            item.product.save()
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
                                        if item.variant:
                                            item.variant.stock = max(0, item.variant.stock - item.quantity)
                                            item.variant.save()
                                order.stock_decremented = True
                                order.save()
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
# Admin Auth APIs
# ==============================================================================
class AdminCheckAuthView(APIView):
    def get(self, request):
        if request.user.is_authenticated and request.user.is_staff and request.user.is_active:
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
    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')

        if not username or not password:
            return Response({'error': 'Username and password are required.'}, status=status.HTTP_400_BAD_REQUEST)

        user = authenticate(request, username=username, password=password)
        if user is not None and user.is_staff and user.is_active:
            django_login(request, user)
            perms = list(get_user_permissions(user))
            super_admin = is_super_admin(user)
            first_url = get_first_allowed_admin_url(user)
            role = 'Super Admin' if user.is_superuser else 'Staff Admin'
            if hasattr(user, 'admin_profile') and user.admin_profile:
                role = user.admin_profile.role or role
            return Response({
                'message': 'Login successful',
                'username': user.username,
                'email': user.email,
                'is_superuser': user.is_superuser,
                'is_super_admin': super_admin,
                'role': role,
                'permissions': perms,
                'first_allowed_url': first_url,
            }, status=status.HTTP_200_OK)

        return Response({'error': 'Invalid credentials or non-staff account.'}, status=status.HTTP_401_UNAUTHORIZED)


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

        notifications_data = []
        for n in qs[:100]:
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
        start_dt = parse_aware_datetime(data.get('start_datetime'))
        end_dt = parse_aware_datetime(data.get('end_datetime'))
        is_active = data.get('is_active', True)

        offer = Offer.objects.create(
            name=offer_text,
            title=offer_text,
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
        for field in ['name', 'title', 'description', 'discount_type', 'start_date', 'end_date', 'is_active']:
            if field in data:
                setattr(offer, field, data[field])
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

        if search_query:
            qs = qs.filter(
                Q(shipping_name__icontains=search_query) |
                Q(shipping_phone__icontains=search_query) |
                Q(razorpay_order_id__icontains=search_query) |
                Q(id__icontains=search_query)
            )

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
            orders_list.append({
                'id': o.id,
                'orderId': order_num,
                'order_number': order_num,
                'customer': {
                    'name': o.shipping_name,
                    'email': o.user.email if o.user and o.user.email else 'customer@example.com',
                    'phone': o.shipping_phone,
                    'initial': o.shipping_name[:1].upper() if o.shipping_name else 'C',
                },
                'date': o.created_at.strftime('%d %b %Y') if o.created_at else '',
                'fullDate': o.created_at.strftime('%b %d, %Y %I:%M %p') if o.created_at else '',
                'itemsCount': o.items.count(),
                'totalAmount': float(o.total_amount),
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
            order = Order.objects.prefetch_related('items__product', 'items__variant').get(pk=pk)
        except Order.DoesNotExist:
            return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)

        store_prefix = StoreSettings.objects.filter(id=1).values_list('order_prefix', flat=True).first() or 'MOX'
        order_num = order.order_number or f"{store_prefix}-{order.id:04d}"

        items_list = []
        for it in order.items.all():
            img_url = None
            if it.variant and it.variant.images.exists():
                img_obj = it.variant.images.first()
                if img_obj and img_obj.image:
                    img_url = img_obj.image.url
            elif it.product and it.product.images.exists():
                img_obj = it.product.images.first()
                if img_obj and img_obj.image:
                    img_url = img_obj.image.url

            items_list.append({
                'id': it.id,
                'productName': it.product.name if it.product else 'Product',
                'colorName': it.color_name or (it.variant.color_name if it.variant else ''),
                'size': it.size or '',
                'quantity': it.quantity,
                'price': float(it.price),
                'total': float(it.price * it.quantity),
                'image': img_url
            })

        subtotal = float(order.subtotal_amount) if order.subtotal_amount and float(order.subtotal_amount) > 0 else sum(i['total'] for i in items_list)
        shipping_fee = float(order.shipping_fee) if (order.shipping_fee is not None and float(order.shipping_fee) > 0) else max(0.0, float(order.total_amount) - subtotal - (float(order.tax_amount) if (order.tax_amount and not order.tax_included) else 0.0))
        tax_amt = float(order.tax_amount) if order.tax_amount else 0.0
        tax_rt = float(order.tax_rate) if order.tax_rate else 0.0
        tax_tp = order.tax_type or 'GST'
        tax_inc = bool(order.tax_included)

        order_detail = {
            'id': order.id,
            'orderId': order_num,
            'order_number': order_num,
            'date': order.created_at.strftime('%d %b %Y') if order.created_at else '',
            'fullDate': order.created_at.strftime('%b %d, %Y %I:%M %p') if order.created_at else '',
            'orderStatus': order.order_status,
            'paymentStatus': order.payment_status,
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
                'city': order.shipping_city,
                'pincode': order.shipping_pincode,
            },
            'items': items_list,
            'pricing': {
                'subtotal': subtotal,
                'shipping': shipping_fee,
                'tax': tax_amt,
                'tax_rate': tax_rt,
                'tax_type': tax_tp,
                'tax_included': tax_inc,
                'total': float(order.total_amount),
            },
            'paymentInfo': {
                'method': 'Razorpay' if order.razorpay_order_id and not str(order.razorpay_order_id).startswith('cod_') else 'COD',
                'status': order.payment_status,
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

        if 'order_status' in request.data:
            order.order_status = request.data['order_status']
        elif 'orderStatus' in request.data:
            order.order_status = request.data['orderStatus']

        if 'payment_status' in request.data:
            order.payment_status = request.data['payment_status']
        elif 'paymentStatus' in request.data:
            order.payment_status = request.data['paymentStatus']

        order.save()

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
        except Exception:
            pass

        return Response({
            'success': True,
            'id': order.id,
            'order_status': order.order_status,
            'orderStatus': order.order_status,
            'payment_status': order.payment_status,
            'paymentStatus': order.payment_status
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

        try:
            order = Order.objects.get(pk=pk)
        except Order.DoesNotExist:
            return Response({'error': 'Order not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Check ownership if authenticated user
        if request.user.is_authenticated and order.user and order.user != request.user and not request.user.is_staff:
            return Response({'error': 'You do not have permission to cancel this order.'}, status=status.HTTP_403_FORBIDDEN)

        # Check cancellable status
        cancellable_statuses = ['Pending', 'Confirmed', 'Processing', 'Placed']
        if order.order_status not in cancellable_statuses:
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
            order.save(update_fields=['order_status', 'updated_at'])

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
        username = data.get('username')
        password = data.get('password')
        email = data.get('email', '')
        name = data.get('name', '')
        first_name = data.get('first_name', '')
        last_name = data.get('last_name', '')
        if name and not first_name:
            parts = name.strip().split(' ', 1)
            first_name = parts[0]
            last_name = parts[1] if len(parts) > 1 else ''
        role = data.get('role', 'Staff Admin')
        permissions = data.get('permissions', [])
        is_active = data.get('is_active', True)

        if not username or not password:
            return Response({'error': 'Username and password are required.'}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(username=username).exists():
            return Response({'error': 'Username already exists.'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.create_user(
            username=username,
            password=password,
            email=email,
            first_name=first_name,
            last_name=last_name,
            is_staff=True,
            is_active=bool(is_active),
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
        err = check_staff_api_permission(request, 'admin_users')
        if err:
            return err
        try:
            u = User.objects.get(pk=pk, is_staff=True)
        except User.DoesNotExist:
            return Response({'error': 'Admin user not found'}, status=status.HTTP_404_NOT_FOUND)

        data = request.data
        name = data.get('name')
        if name is not None:
            parts = name.strip().split(' ', 1)
            u.first_name = parts[0]
            u.last_name = parts[1] if len(parts) > 1 else ''
        if 'first_name' in data:
            u.first_name = data['first_name']
        if 'last_name' in data:
            u.last_name = data['last_name']
        if 'email' in data:
            u.email = data['email']
        if 'is_active' in data:
            u.is_active = bool(data['is_active'])
        if 'password' in data and data['password']:
            u.set_password(data['password'])
        u.save()

        profile, _ = AdminProfile.objects.get_or_create(user=u)
        if 'role' in data:
            profile.role = data['role']
            u.is_superuser = (data['role'] == 'Super Admin')
            u.save()
        if 'permissions' in data:
            profile.permissions = data['permissions']
        profile.save()

        # Create audit notification
        try:
            admin_display_name = f"{u.first_name} {u.last_name}".strip() or u.username
            Notification.objects.create(
                title=f"Admin Account Updated: {admin_display_name}",
                sender="System Admin",
                sender_initial=admin_display_name[:1].upper() if admin_display_name else 'A',
                sender_color='#f59e0b',
                body=f"Admin profile details updated for '{admin_display_name}'.",
                full_body=f"Admin Name: {admin_display_name}\nUsername: {u.username}\nEmail: {u.email or 'N/A'}\nRole: {profile.role}\nStatus: {'Active' if u.is_active else 'Inactive'}",
                category_badge='Admin User',
                department='System',
                notification_type='admin_user_updated',
                user=u,
                target_url='/admin/users/'
            )
        except Exception:
            pass

        return Response({'success': True, 'id': u.id})

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

        if 'store_logo' in request.FILES:
            settings_obj.store_logo = request.FILES['store_logo']
        elif str(data.get('remove_store_logo', '')).lower() in ['true', '1'] or str(data.get('remove_logo', '')).lower() in ['true', '1']:
            if settings_obj.store_logo:
                try:
                    settings_obj.store_logo.delete(save=False)
                except Exception:
                    pass
        section = data.get('_section', '')
        if section == 'orders' or ('order_prefix' in data and 'store_name' not in data and 'maintenance_mode' not in data):
            order_prefix = str(data.get('order_prefix', settings_obj.order_prefix or '')).strip()
            if not order_prefix:
                return Response({'error': 'Order prefix is required.'}, status=status.HTTP_400_BAD_REQUEST)
            try:
                min_order = float(data.get('min_order_amount', settings_obj.min_order_amount or 0))
                if min_order < 0:
                    return Response({'error': 'Minimum order amount must be a non-negative number.'}, status=status.HTTP_400_BAD_REQUEST)
            except (ValueError, TypeError):
                return Response({'error': 'Invalid minimum order amount.'}, status=status.HTTP_400_BAD_REQUEST)

            try:
                max_order = float(data.get('max_order_amount', settings_obj.max_order_amount or 0))
                if max_order < 0:
                    return Response({'error': 'Maximum order amount must be a non-negative number.'}, status=status.HTTP_400_BAD_REQUEST)
            except (ValueError, TypeError):
                return Response({'error': 'Invalid maximum order amount.'}, status=status.HTTP_400_BAD_REQUEST)

        if section == 'tax' or ('tax_rate' in data and 'store_name' not in data and 'maintenance_mode' not in data and 'default_shipping_charge' not in data and 'order_prefix' not in data):
            try:
                tax_rate_val = float(data.get('tax_rate', settings_obj.tax_rate or 0))
                if tax_rate_val < 0 or tax_rate_val > 100:
                    return Response({'error': 'Tax rate must be a valid percentage between 0 and 100.'}, status=status.HTTP_400_BAD_REQUEST)
            except (ValueError, TypeError):
                return Response({'error': 'Invalid tax rate.'}, status=status.HTTP_400_BAD_REQUEST)

        if 'cod_available' in data:
            settings_obj.cod_enabled = settings_obj.cod_available
        elif 'cod_enabled' in data:
            settings_obj.cod_available = settings_obj.cod_enabled

        settings_obj.save()
        resp_data = self.get_settings_dict(settings_obj)

        if section == 'store':
            success_msg = 'Store operations updated successfully.'
        elif section == 'general':
            success_msg = 'General settings updated successfully.'
        elif section == 'orders' or ('order_prefix' in data and 'store_name' not in data and 'maintenance_mode' not in data and 'default_shipping_charge' not in data):
            success_msg = 'Order settings updated successfully.'
        elif section == 'shipping' or ('default_shipping_charge' in data and 'store_name' not in data):
            success_msg = 'Shipping settings updated successfully.'
        elif section == 'tax' or ('tax_rate' in data and 'store_name' not in data):
            success_msg = 'Tax settings updated successfully.'
        elif 'maintenance_mode' in data and 'store_name' not in data:
            success_msg = 'Store operations updated successfully.'
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
            send_mail(
                subject='Moxie Admin - SMTP Test Email',
                message='This is a test email sent from Moxie Admin Portal settings.',
                from_email=settings.DEFAULT_FROM_EMAIL if hasattr(settings, 'DEFAULT_FROM_EMAIL') else 'noreply@moxie.com',
                recipient_list=[to_email],
                fail_silently=False
            )
            return Response({'success': True, 'message': f'Test email sent to {to_email}'})
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
            from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@moxie.com')
            send_mail(
                subject='Moxie Admin - Password Reset Code',
                message=f'Your password reset verification code is: {otp_code}. This code is valid for 15 minutes.',
                from_email=from_email,
                recipient_list=[target_email],
                fail_silently=True
            )
        except Exception:
            pass

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
                'avg_selling_price': float(p.discount_price or p.price or 0),
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