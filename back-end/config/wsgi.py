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
    from api.models import StoreSettings

    # Ensure system StoreSettings singleton exists
    StoreSettings.objects.get_or_create(id=1)
except Exception:
    pass


