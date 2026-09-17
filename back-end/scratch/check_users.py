import os
import sys
import django

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth.models import User
from api.models import AdminProfile

print("=== ALL USERS ===")
for u in User.objects.all():
    profile = getattr(u, 'admin_profile', None)
    role = profile.role if profile else 'None'
    print(f"ID: {u.id} | Username: '{u.username}' | Email: '{u.email}' | Staff: {u.is_staff} | Superuser: {u.is_superuser} | Active: {u.is_active} | Role: {role}")
