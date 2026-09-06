"""
URL configuration for Moxie project.
"""
import json
from datetime import timedelta
from django.contrib import admin
from django.conf import settings
from django.conf.urls.static import static
from django.urls import include, path, re_path
from django.views.static import serve
from django.shortcuts import redirect, render
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.db.models import DecimalField, ExpressionWrapper, F, Sum, Q
from django.db.models.functions import Coalesce
from django.utils import timezone

from api.permissions_utils import (
    admin_permission_required,
    is_super_admin,
    get_first_allowed_admin_url,
)
from api.models import StoreSettings, Order, Notification, Offer, AdminProfile
from products.models import Product, Review
from categories.models import Category
from banners.models import Banner
from django.contrib.auth.models import User

# Save original index view
original_index = admin.site.index

def custom_admin_index(request, extra_context=None):
    extra_context = extra_context or {}
    try:
        products = Product.objects.select_related('category').prefetch_related('images')
        inventory_expression = ExpressionWrapper(
            F('price') * F('stock'),
            output_field=DecimalField(max_digits=16, decimal_places=2),
        )
        inventory_value = products.aggregate(
            total=Coalesce(
                Sum(inventory_expression),
                0,
                output_field=DecimalField(max_digits=16, decimal_places=2),
            )
        )['total']

        today = timezone.localdate()
        activity = []
        sales_series = []
        all_orders = Order.objects.all()

        for offset in range(6, -1, -1):
            day = today - timedelta(days=offset)
            day_orders = all_orders.filter(created_at__date=day)
            day_rev = sum(float(o.total_amount) for o in day_orders if o.payment_status == 'Paid')
            activity.append({
                'label': day.strftime('%a'),
                'value': products.filter(created_at__date=day).count(),
            })
            sales_series.append({
                'date': day.strftime('%Y-%m-%d'),
                'label': day.strftime('%a'),
                'orders': day_orders.count(),
                'revenue': day_rev,
            })
        max_activity = max([point['value'] for point in activity] + [1])
        for point in activity:
            point['height'] = 16 + round((point['value'] / max_activity) * 74)

        category_stats = list(
            Category.objects.annotate(product_count=Sum('products__stock'))
            .order_by('-product_count', 'name')[:4]
        )
        category_total_stock = sum((item.product_count or 0) for item in category_stats) or 1
        for item in category_stats:
            item.share = round(((item.product_count or 0) / category_total_stock) * 100)

        stock_total = products.count() or 1
        in_stock = products.filter(stock__gt=10).count()
        low_stock = products.filter(stock__gt=0, stock__lte=10).count()
        out_of_stock = products.filter(stock=0).count()
        unavailable_products = products.filter(is_active=False).count()

        total_orders_count = all_orders.count()
        total_sales_amount = sum(float(o.total_amount) for o in all_orders if o.payment_status == 'Paid')

        extra_context.update({
            'total_users': User.objects.count(),
            'total_products': products.count(),
            'total_categories': Category.objects.count(),
            'total_banners': Banner.objects.count(),
            'total_reviews': Review.objects.count(),
            'total_orders': total_orders_count,
            'total_sales': total_sales_amount,
            'inventory_value': inventory_value,
            'active_products': products.filter(is_active=True).count(),
            'unavailable_products': unavailable_products,
            'top_products': products.order_by('-stock', '-created_at')[:4],
            'recent_products': products.order_by('-created_at')[:5],
            'catalog_activity': activity,
            'sales_series': sales_series,
            'category_stats': category_stats,
            'category_total_stock': category_total_stock,
            'in_stock': in_stock,
            'low_stock': low_stock,
            'out_of_stock': out_of_stock,
            'in_stock_percent': round((in_stock / stock_total) * 100),
            'low_stock_percent': round((low_stock / stock_total) * 100),
            'out_of_stock_percent': round((out_of_stock / stock_total) * 100),
            'unavailable_percent': round((unavailable_products / stock_total) * 100),
            'dashboard_date': today,
        })
    except Exception:
        pass
    
    response = original_index(request, extra_context=extra_context)
    response['Cache-Control'] = 'no-cache, no-store, must-revalidate, max-age=0'
    response['Pragma'] = 'no-cache'
    response['Expires'] = '0'
    return response

admin.site.index = custom_admin_index

# Custom branding for Django Admin
admin.site.site_header = "Moxie Admin Portal"
admin.site.site_title = "Moxie Admin Portal"
admin.site.index_title = "Welcome to Moxie Admin Portal"


def custom_logout(request):
    from django.contrib.auth import logout as django_logout
    django_logout(request)
    response = redirect('admin:login')
    response['Cache-Control'] = 'no-cache, no-store, must-revalidate, max-age=0'
    response['Pragma'] = 'no-cache'
    response['Expires'] = '0'
    return response


def custom_admin_login(request, extra_context=None):
    from django.contrib.auth import login as auth_login, authenticate
    from django.contrib.auth.models import User

    if request.user.is_authenticated and request.user.is_staff and request.user.is_active:
        response = redirect('/admin/')
        response['Cache-Control'] = 'no-cache, no-store, must-revalidate, max-age=0'
        return response

    error_message = None

    if request.method == 'POST':
        login_input = request.POST.get('username', '').strip()
        password_input = request.POST.get('password', '')

        user = None

        # 1. Try finding by username or email (case-insensitive)
        matched_users = list(User.objects.filter(
            Q(username__iexact=login_input) | Q(email__iexact=login_input)
        ))

        for u in matched_users:
            if u.check_password(password_input):
                user = u
                break

        # 2. Fallback standard Django authenticate
        if not user:
            user = authenticate(request, username=login_input, password=password_input)

        if user:
            if user.is_active and user.is_staff:
                user.backend = 'django.contrib.auth.backends.ModelBackend'
                auth_login(request, user)
                if not request.POST.get('remember_me'):
                    request.session.set_expiry(0)
                next_url = request.POST.get('next') or request.GET.get('next') or '/admin/'
                response = redirect(next_url)
                response['Cache-Control'] = 'no-cache, no-store, must-revalidate, max-age=0'
                return response
            elif not user.is_active:
                error_message = "This account is inactive. Please contact the administrator."
            else:
                error_message = "You do not have staff permissions to access the admin portal."
        else:
            error_message = "Please enter a correct username and password. Note that both fields may be case-sensitive."

    context = {
        'error_message': error_message,
        'app_path': request.get_full_path(),
        'username': request.POST.get('username', '') if request.method == 'POST' else '',
        'next': request.POST.get('next') or request.GET.get('next') or '',
        'title': 'Log in',
    }
    if extra_context:
        context.update(extra_context)

    response = render(request, 'admin/login.html', context)
    response['Cache-Control'] = 'no-cache, no-store, must-revalidate, max-age=0'
    response['Pragma'] = 'no-cache'
    response['Expires'] = '0'
    return response


def admin_dashboard_redirect(request):
    return redirect('/admin/')


def admin_review_redirect(request):
    return redirect('/admin/products/review/')


def _get_admin_info(user):
    profile, _ = AdminProfile.objects.get_or_create(user=user)
    full_name = f"{user.first_name} {user.last_name}".strip() or user.username
    profile_img_url = profile.profile_image.url if profile.profile_image else ''
    role = profile.role if profile.role else ('Super Admin' if user.is_superuser else 'Staff')
    mobile = profile.phone if profile.phone else ''

    return {
        'id': user.id,
        'firstName': user.first_name or '',
        'lastName': user.last_name or '',
        'fullName': full_name,
        'email': user.email or '',
        'username': user.username,
        'mobile': mobile,
        'role': role,
        'profileImage': profile_img_url,
        'dateJoined': user.date_joined.strftime('%d %b %Y') if user.date_joined else '',
        'lastLogin': user.last_login.strftime('%d %b %Y, %I:%M %p') if user.last_login else 'Never',
        'isActive': user.is_active,
        'isSuperuser': user.is_superuser,
    }


@admin_permission_required('orders')
def admin_orders_view(request):
    all_orders = Order.objects.prefetch_related('items__product').all().order_by('-created_at')
    orders_list = []
    store_prefix = StoreSettings.objects.filter(id=1).values_list('order_prefix', flat=True).first() or 'MOX'

    for o in all_orders:
        order_num = o.order_number or f"{store_prefix}-{o.id:04d}"
        orders_list.append({
            'id': o.id,
            'orderId': order_num,
            'customer': {
                'name': o.shipping_name or 'Customer',
                'email': o.user.email if o.user and o.user.email else 'customer@example.com',
                'phone': o.shipping_phone or '',
                'initial': o.shipping_name[:1].upper() if o.shipping_name else 'C',
            },
            'date': o.created_at.strftime('%d %b %Y') if o.created_at else '',
            'fullDate': o.created_at.strftime('%b %d, %Y %I:%M %p') if o.created_at else '',
            'itemsCount': o.items.count(),
            'totalAmount': float(o.total_amount),
            'paymentStatus': o.payment_status or 'Pending',
            'orderStatus': o.order_status or 'Pending',
            'razorpayOrderId': o.razorpay_order_id or '',
            'razorpayPaymentId': o.razorpay_payment_id or '',
        })

    total_rev = sum(float(o.total_amount) for o in all_orders if o.payment_status == 'Paid')

    context = {
        'title': 'Orders',
        'total_orders': all_orders.count(),
        'pending_orders': all_orders.filter(order_status='Pending').count(),
        'shipped_orders': all_orders.filter(order_status='Shipped').count(),
        'delivered_orders': all_orders.filter(order_status='Delivered').count(),
        'cancelled_orders': all_orders.filter(order_status='Cancelled').count(),
        'total_revenue': total_rev,
        'orders_list': orders_list,
        'csrf_token': get_token(request),
    }
    response = render(request, 'admin/orders.html', context)
    response['Cache-Control'] = 'no-cache, no-store, must-revalidate, max-age=0'
    response['Pragma'] = 'no-cache'
    response['Expires'] = '0'
    return response


@admin_permission_required('offers')
def admin_offers_view(request):
    now = timezone.now()
    offers = Offer.objects.prefetch_related('applicable_categories', 'applicable_products').all().order_by('-created_at')
    offers_data = []

    def _get_offer_status(o):
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

    for o in offers:
        status_str = _get_offer_status(o)
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

    products_data = [
        {
            'id': p.id,
            'name': p.name,
            'price': float(p.price),
            'stock': p.stock,
            'category_id': p.category_id,
            'image': p.images.first().image.url if p.images.exists() else '',
        }
        for p in Product.objects.all().order_by('name')
    ]

    categories_data = [
        {
            'id': c.id,
            'name': c.name,
        }
        for c in Category.objects.all().order_by('name')
    ]

    context = {
        'title': 'Offers & Discounts',
        'total_offers_count': len(offers_data),
        'offers_list': json.dumps(offers_data),
        'products_list': json.dumps(products_data),
        'categories_list': json.dumps(categories_data),
        'csrf_token': get_token(request),
    }
    response = render(request, 'admin/offers.html', context)
    response['Cache-Control'] = 'no-cache, no-store, must-revalidate, max-age=0'
    response['Pragma'] = 'no-cache'
    response['Expires'] = '0'
    return response


@admin_permission_required('messages')
def admin_messages_view(request):
    context = {
        'title': 'Messages',
        'csrf_token': get_token(request),
    }
    response = render(request, 'admin/messages.html', context)
    response['Cache-Control'] = 'no-cache, no-store, must-revalidate, max-age=0'
    response['Pragma'] = 'no-cache'
    response['Expires'] = '0'
    return response


@admin_permission_required('admin_users')
def admin_users_view(request):
    staff_users = User.objects.filter(is_staff=True).order_by('-date_joined')
    admins_list = []
    for u in staff_users:
        role = 'Super Admin' if u.is_superuser else 'Staff Admin'
        perms = []
        if hasattr(u, 'admin_profile') and u.admin_profile:
            if u.admin_profile.role:
                role = u.admin_profile.role
            perms = u.admin_profile.permissions or []

        admins_list.append({
            'id': u.id,
            'name': f"{u.first_name} {u.last_name}".strip() or u.username,
            'username': u.username,
            'email': u.email or '',
            'role': role,
            'is_active': u.is_active,
            'is_superuser': u.is_superuser,
            'last_login': u.last_login.strftime('%d %b %Y, %I:%M %p') if u.last_login else 'Never',
            'created_at': u.date_joined.strftime('%d %b %Y') if u.date_joined else '',
            'permissions': perms,
        })

    context = {
        'title': 'Admin Users',
        'total_admins_count': staff_users.count(),
        'active_admins_count': staff_users.filter(is_active=True).count(),
        'inactive_admins_count': staff_users.filter(is_active=False).count(),
        'super_admins_count': staff_users.filter(is_superuser=True).count(),
        'admin_users_list': admins_list,
        'current_user_id': request.user.id,
        'csrf_token': get_token(request),
    }
    response = render(request, 'admin/users.html', context)
    response['Cache-Control'] = 'no-cache, no-store, must-revalidate, max-age=0'
    response['Pragma'] = 'no-cache'
    response['Expires'] = '0'
    return response


def admin_profile_view(request):
    if not request.user.is_authenticated or not request.user.is_staff or not request.user.is_active:
        return redirect(f"/admin/login/?next={request.get_full_path()}")

    admin_info = _get_admin_info(request.user)
    context = {
        'title': 'Admin Profile',
        'admin_info': admin_info,
        'csrf_token': get_token(request),
    }
    response = render(request, 'admin/profile.html', context)
    response['Cache-Control'] = 'no-cache, no-store, must-revalidate, max-age=0'
    response['Pragma'] = 'no-cache'
    response['Expires'] = '0'
    return response


@admin_permission_required('settings')
def admin_settings_view(request):
    StoreSettings.objects.get_or_create(id=1)
    admin_info = _get_admin_info(request.user)
    context = {
        'title': 'Settings',
        'admin_info': admin_info,
        'csrf_token': get_token(request),
    }
    response = render(request, 'admin/settings.html', context)
    response['Cache-Control'] = 'no-cache, no-store, must-revalidate, max-age=0'
    response['Pragma'] = 'no-cache'
    response['Expires'] = '0'
    return response


@admin_permission_required('customers')
def admin_customers_view(request):
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
        if hasattr(u, 'customer_profile') and u.customer_profile and u.customer_profile.mobile:
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
            'createdAt': u.date_joined.strftime('%d %b %Y, %I:%M %p') if u.date_joined else '—',
            'orders_count': orders_count,
            'completed_orders_count': completed_orders,
            'total_spent': spent,
            'reviews_count': Review.objects.filter(user=u).count(),
        })

    context = {
        'title': 'Customers',
        'total_customers_count': customers.count(),
        'active_customers_count': customers.filter(is_active=True).count(),
        'inactive_customers_count': customers.filter(is_active=False).count(),
        'total_spent_all': total_spent_all,
        'customers_list': cust_list,
        'csrf_token': get_token(request),
    }
    response = render(request, 'admin/customers.html', context)
    response['Cache-Control'] = 'no-cache, no-store, must-revalidate, max-age=0'
    response['Pragma'] = 'no-cache'
    response['Expires'] = '0'
    return response


# Global 404 and 403 Handlers
def custom_page_not_found(request, exception=None):
    if request.path.startswith('/api/'):
        return JsonResponse({
            'error': 'Not Found',
            'detail': 'The requested API endpoint does not exist.'
        }, status=404)
    if request.path.startswith('/admin/'):
        return render(request, 'admin/404.html', {'title': 'Page Not Found'}, status=404)
    return render(request, '404.html', status=404)


def custom_permission_denied(request, exception=None):
    if request.path.startswith('/api/'):
        return JsonResponse({
            'error': 'Access Denied',
            'detail': 'You do not have permission to access this resource.'
        }, status=403)
    first_url = get_first_allowed_admin_url(request.user) if request.user.is_authenticated else '/admin/login/'
    return render(request, 'admin/access_denied.html', {
        'title': 'Access Denied',
        'first_allowed_url': first_url,
        'module_name': 'Requested',
    }, status=403)


handler404 = custom_page_not_found
handler403 = custom_permission_denied

urlpatterns = [
    path('admin/login/', custom_admin_login, name='custom_admin_login'),
    path('admin/logout/', custom_logout, name='custom_logout'),
    path('admin/dashboard/', admin_dashboard_redirect, name='admin_dashboard_redirect'),
    path('admin/orders/', admin_orders_view, name='admin_orders_view'),
    path('admin/offers/', admin_offers_view, name='admin_offers_view'),
    path('admin/messages/', admin_messages_view, name='admin_messages_view'),
    path('admin/users/', admin_users_view, name='admin_users_view'),
    path('admin/profile/', admin_profile_view, name='admin_profile_view'),
    path('admin/settings/', admin_settings_view, name='admin_settings_view'),
    path('admin/customers/', admin_customers_view, name='admin_customers_view'),
    path('admin/review/', admin_review_redirect, name='admin_review_redirect'),
    path('admin/products/add/', lambda r: redirect('/admin/products/product/add/')),
    path('admin/products/', lambda r: redirect('/admin/products/product/')),
    path('admin/categories/add/', lambda r: redirect('/admin/categories/category/add/')),
    path('admin/categories/', lambda r: redirect('/admin/categories/category/')),
    path('admin/banners/add/', lambda r: redirect('/admin/banners/banner/add/')),
    path('admin/banners/', lambda r: redirect('/admin/banners/banner/')),
    path('admin/password_change/', lambda r: redirect('/admin/profile/?tab=password')),
    path('admin/password-change/', lambda r: redirect('/admin/profile/?tab=password')),
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')),
    re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
]

if settings.DEBUG:
    urlpatterns += static(
        settings.MEDIA_URL,
        document_root=settings.MEDIA_ROOT
    )
