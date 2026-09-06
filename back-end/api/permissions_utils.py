from functools import wraps
from django.shortcuts import render, redirect
from django.http import JsonResponse
from rest_framework.permissions import BasePermission
from rest_framework.exceptions import PermissionDenied


MODULE_DEFINITIONS = [
    ('dashboard', 'Dashboard', '/admin/dashboard/', ['dashboard']),
    ('products', 'Products', '/admin/products/product/', ['products', 'product']),
    ('categories', 'Categories', '/admin/categories/category/', ['categories', 'category', 'subcategories', 'subcategory']),
    ('banners', 'Banners', '/admin/banners/banner/', ['banners', 'banner']),
    ('reviews', 'Reviews', '/admin/review/', ['reviews', 'review']),
    ('offers', 'Offers', '/admin/offers/', ['offers', 'offer']),
    ('orders', 'Orders', '/admin/orders/', ['orders', 'order']),
    ('customers', 'Customers', '/admin/customers/', ['customers', 'customer']),
    ('admin_users', 'Admin Users', '/admin/users/', ['admin_users', 'admin users', 'users', 'staff', 'admin user']),
    ('messages', 'Messages', '/admin/messages/', ['messages', 'message', 'notifications', 'notification']),
    ('settings', 'Settings', '/admin/settings/', ['settings', 'setting', 'config']),
    ('payments', 'Payments', '/admin/orders/', ['payments', 'payment']),
]

ALL_MODULE_KEYS = [item[0] for item in MODULE_DEFINITIONS]


def normalize_perm_key(perm_str):
    """Normalize any casing or spacing permission string into canonical key."""
    if not perm_str:
        return ''
    cleaned = str(perm_str).strip().lower().replace(' ', '_').replace('-', '_')
    for canonical_key, _, _, aliases in MODULE_DEFINITIONS:
        if cleaned == canonical_key:
            return canonical_key
        for alias in aliases:
            if cleaned == alias.lower().replace(' ', '_').replace('-', '_'):
                return canonical_key
    return cleaned


def is_super_admin(user):
    """Check if user has full Super Admin privileges."""
    if not user or not user.is_authenticated:
        return False
    if getattr(user, 'is_superuser', False):
        return True
    if hasattr(user, 'admin_profile') and user.admin_profile:
        role = getattr(user.admin_profile, 'role', '')
        if role and role.strip().lower() == 'super admin':
            return True
    return False


def get_user_permissions(user):
    """
    Returns a set of canonical permission keys allowed for the user.
    Super Admins receive all permissions.
    """
    if not user or not user.is_authenticated or not getattr(user, 'is_staff', False) or not getattr(user, 'is_active', False):
        return set()

    if is_super_admin(user):
        return set(ALL_MODULE_KEYS)

    perms = set()
    if hasattr(user, 'admin_profile') and user.admin_profile:
        raw_perms = user.admin_profile.permissions or []
        for p in raw_perms:
            normalized = normalize_perm_key(p)
            if normalized:
                perms.add(normalized)

    # If an existing staff user has no permissions explicitly saved, default to standard modules or empty
    return perms


def has_admin_permission(user, module):
    """
    Check whether a staff user has permission for a specific module.
    """
    if not user or not user.is_authenticated or not getattr(user, 'is_staff', False) or not getattr(user, 'is_active', False):
        return False

    if is_super_admin(user):
        return True

    target_key = normalize_perm_key(module)
    user_perms = get_user_permissions(user)
    return target_key in user_perms


def get_first_allowed_admin_url(user):
    """
    Finds the first allowed admin page URL for the user.
    """
    if not user or not user.is_authenticated:
        return '/admin/login/'

    if is_super_admin(user):
        return '/admin/dashboard/'

    user_perms = get_user_permissions(user)
    for canonical_key, _, url, _ in MODULE_DEFINITIONS:
        if canonical_key in user_perms:
            return url

    # Default fallback
    return '/admin/profile/'


def admin_permission_required(module):
    """
    Django view decorator that verifies the staff member is permitted to access the module.
    Renders an Access Denied template (with HTTP 403) or returns JSON error if unauthorized.
    """
    def decorator(view_func):
        @wraps(view_func)
        def _wrapped_view(request, *args, **kwargs):
            if not request.user.is_authenticated:
                return redirect(f"/admin/login/?next={request.get_full_path()}")

            if not request.user.is_staff or not request.user.is_active:
                return redirect(f"/admin/login/?next={request.get_full_path()}")

            if has_admin_permission(request.user, module):
                return view_func(request, *args, **kwargs)

            # Check if this is an API or JSON request
            if request.path.startswith('/api/') or request.headers.get('x-requested-with') == 'XMLHttpRequest' or 'application/json' in request.headers.get('Accept', ''):
                return JsonResponse({
                    'error': f"Access Denied: You do not have permission to access the {module.replace('_', ' ').title()} module."
                }, status=403)

            # Render full Access Denied page
            first_url = get_first_allowed_admin_url(request.user)
            context = {
                'module_name': module.replace('_', ' ').title(),
                'first_allowed_url': first_url,
                'title': 'Access Denied',
            }
            return render(request, 'admin/access_denied.html', context, status=403)

        return _wrapped_view
    return decorator


from rest_framework.response import Response
from rest_framework import status


def check_staff_api_permission(request, module):
    """
    Helper for API views to check permission for staff users.
    Returns None if authorized, or a 403 Response if unauthorized.
    """
    if not request.user or not request.user.is_authenticated:
        return Response({'error': 'Authentication required.'}, status=status.HTTP_401_UNAUTHORIZED)

    if not request.user.is_staff or not request.user.is_active:
        return Response({'error': 'Staff access required.'}, status=status.HTTP_403_FORBIDDEN)

    if not has_admin_permission(request.user, module):
        return Response({
            'error': f"Permission denied. You do not have permission to access the {module.replace('_', ' ').title()} module."
        }, status=status.HTTP_403_FORBIDDEN)

    return None


class HasAdminModulePermission(BasePermission):
    """
    DRF Permission class for enforcing admin module permissions.
    """
    module_name = None

    def __init__(self, module_name=None):
        if module_name:
            self.module_name = module_name

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if not request.user.is_staff or not request.user.is_active:
            return False
        module = self.module_name or getattr(view, 'required_admin_module', None)
        if not module:
            return True
        return has_admin_permission(request.user, module)


def custom_permission_denied_view(request, exception=None):
    """
    Custom 403 error handler for Django and ModelAdmins.
    """
    first_url = get_first_allowed_admin_url(request.user) if request.user.is_authenticated else '/admin/login/'
    context = {
        'module_name': 'requested',
        'first_allowed_url': first_url,
        'title': 'Access Denied',
    }
    return render(request, 'admin/access_denied.html', context, status=403)
