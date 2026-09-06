from .permissions_utils import (
    get_user_permissions,
    is_super_admin,
    get_first_allowed_admin_url,
    has_admin_permission,
)


def admin_permissions_context(request):
    """
    Context processor that injects current admin user's role and permission flags
    into all templates.
    """
    user = getattr(request, 'user', None)
    if not user or not user.is_authenticated or not getattr(user, 'is_staff', False):
        return {
            'user_permissions': [],
            'is_super_admin': False,
            'first_allowed_url': '/admin/login/',
        }

    perms_set = get_user_permissions(user)
    is_super = is_super_admin(user)
    first_url = get_first_allowed_admin_url(user)

    return {
        'user_permissions': list(perms_set),
        'is_super_admin': is_super,
        'first_allowed_url': first_url,
        'can_dashboard': is_super or 'dashboard' in perms_set,
        'can_products': is_super or 'products' in perms_set,
        'can_categories': is_super or 'categories' in perms_set,
        'can_banners': is_super or 'banners' in perms_set,
        'can_reviews': is_super or 'reviews' in perms_set,
        'can_offers': is_super or 'offers' in perms_set,
        'can_orders': is_super or 'orders' in perms_set,
        'can_customers': is_super or 'customers' in perms_set,
        'can_admin_users': is_super or 'admin_users' in perms_set,
        'can_messages': is_super or 'messages' in perms_set,
        'can_settings': is_super or 'settings' in perms_set,
    }


def store_settings_context(request):
    """
    Context processor that injects current StoreSettings into all templates.
    """
    try:
        from .models import StoreSettings
        settings_obj = StoreSettings.objects.filter(id=1).first()
        if not settings_obj:
            settings_obj, _ = StoreSettings.objects.get_or_create(id=1)
        return {
            'store_settings': settings_obj,
            'store_name': settings_obj.store_name or 'Moxie',
            'store_logo_url': settings_obj.store_logo.url if settings_obj.store_logo else None,
        }
    except Exception:
        return {
            'store_settings': None,
            'store_name': 'Moxie',
            'store_logo_url': None,
        }
