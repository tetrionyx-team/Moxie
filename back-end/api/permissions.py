from rest_framework import permissions
from api.models import get_user_admin_permissions, ALL_ADMIN_PERMISSIONS

def has_admin_permission(user, permission_name):
    """
    Checks if a user is authenticated, active, a staff member, and has the specified permission.
    Superusers automatically have all permissions.
    """
    if not user or not user.is_authenticated:
        return False
    if not user.is_staff or not user.is_active:
        return False
    if user.is_superuser:
        return True
    if not permission_name:
        return True

    user_perms = get_user_admin_permissions(user)
    return permission_name in user_perms

class HasAdminSectionPermission(permissions.BasePermission):
    """
    DRF Permission class for checking section-level admin permissions.
    Usage: set section_permission on the API view class.
    """
    section_permission = None

    def has_permission(self, request, view):
        sec_perm = getattr(view, 'section_permission', None)
        return has_admin_permission(request.user, sec_perm)

def make_admin_permission_class(permission_name):
    """Factory for creating DRF Permission classes bound to a specific permission name."""
    class DynamicAdminPermission(permissions.BasePermission):
        def has_permission(self, request, view):
            return has_admin_permission(request.user, permission_name)
    return DynamicAdminPermission
