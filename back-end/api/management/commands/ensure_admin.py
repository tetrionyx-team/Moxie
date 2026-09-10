import os
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db.models import Q
from api.models import AdminProfile
from api.permissions_utils import ALL_MODULE_KEYS


class Command(BaseCommand):
    help = (
        "Safely create or update the production Django superuser / admin account "
        "using environment variables (ADMIN_USERNAME, ADMIN_EMAIL, ADMIN_PASSWORD)."
    )

    def handle(self, *args, **options):
        username = os.environ.get('ADMIN_USERNAME', '').strip()
        email = os.environ.get('ADMIN_EMAIL', '').strip()
        password = os.environ.get('ADMIN_PASSWORD', '').strip()

        if not username and email:
            username = email.split('@')[0]

        if not username or not password:
            self.stdout.write(
                self.style.WARNING(
                    "[ensure_admin] ADMIN_USERNAME and ADMIN_PASSWORD environment variables are required. "
                    "Skipping superuser creation/update."
                )
            )
            return

        if not email:
            self.stdout.write(
                self.style.WARNING(
                    "[ensure_admin] WARNING: ADMIN_EMAIL is not set. "
                    "Two-factor authentication (2FA) OTP code delivery requires a valid email address on the staff account."
                )
            )

        User = get_user_model()

        # Match user by username or email case-insensitively
        lookup = Q(username__iexact=username)
        if email:
            lookup |= Q(email__iexact=email)

        user = User.objects.filter(lookup).first()
        created = False

        if not user:
            user = User(username=username)
            created = True

        # Ensure all administrative flags and attributes are properly set
        user.username = username
        if email:
            user.email = email
        user.is_staff = True
        user.is_superuser = True
        user.is_active = True
        user.set_password(password)
        user.save()

        # Ensure associated AdminProfile exists with full Super Admin privileges
        profile, _ = AdminProfile.objects.get_or_create(user=user)
        profile.role = 'Super Admin'
        profile.permissions = list(ALL_MODULE_KEYS)
        profile.save()

        action = "Created new" if created else "Updated existing"
        masked_email = user.email if user.email else "(NO EMAIL SET - 2FA will require email)"
        self.stdout.write(
            self.style.SUCCESS(
                f"[ensure_admin] {action} superuser account '{user.username}' "
                f"[email: {masked_email}, is_staff=True, is_superuser=True, is_active=True]."
            )
        )

