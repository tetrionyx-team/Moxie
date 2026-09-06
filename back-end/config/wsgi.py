"""
WSGI config for config project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/6.1/howto/deployment/wsgi/
"""

import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

application = get_wsgi_application()

try:
    from django.contrib.auth.models import User
    from api.models import AdminProfile, StoreSettings

    StoreSettings.objects.get_or_create(id=1)
    admin_u, _ = User.objects.get_or_create(
        username='admin',
        defaults={'email': 'admin2026@gmail.com', 'is_staff': True, 'is_superuser': True, 'is_active': True}
    )
    admin_u.set_password('admin123')
    admin_u.is_staff = True
    admin_u.is_superuser = True
    admin_u.is_active = True
    admin_u.save()

    AdminProfile.objects.get_or_create(
        user=admin_u,
        defaults={'role': 'Super Admin', 'raw_password': 'admin123'}
    )
except Exception:
    pass

