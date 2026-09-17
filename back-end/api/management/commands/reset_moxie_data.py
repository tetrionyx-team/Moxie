import os
from django.core.management.base import BaseCommand
from django.db import transaction, connection
from django.contrib.auth import get_user_model
from django.db.models import Q
from django.conf import settings
from django.core.management.color import no_style
from django.contrib.admin.models import LogEntry

from products.models import Product, ProductImage, ProductVariant, VariantImage, Review, FeaturedProduct
from categories.models import Category, Subcategory
from banners.models import Banner
from api.models import (
    Order,
    OrderItem,
    OrderStatusHistory,
    Address,
    CustomerProfile,
    AdminProfile,
    StoreSettings,
    Notification,
    Offer,
    AdminLoginOTP,
    AdminPasswordResetOTP,
    AdminPasswordResetToken,
)

User = get_user_model()


class Command(BaseCommand):
    help = "Safely reset all dynamic business & customer records from the database, reset ID sequences to 1, and remove dynamic media."

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Report models, record counts, and media files that will be removed without deleting anything.',
        )
        parser.add_argument(
            '--confirm',
            '--force',
            '--noinput',
            '--no-input',
            action='store_true',
            dest='confirmed',
            help='Execute the reset without interactive prompt confirmation.',
        )

    def get_business_models(self):
        return [
            OrderStatusHistory,
            OrderItem,
            Order,
            FeaturedProduct,
            VariantImage,
            ProductVariant,
            ProductImage,
            Review,
            Product,
            Subcategory,
            Category,
            Banner,
            Address,
            Offer,
            Notification,
            CustomerProfile,
            AdminLoginOTP,
            AdminPasswordResetOTP,
            AdminPasswordResetToken,
            LogEntry,
        ]

    def get_counts(self):
        return {
            'Products': Product.objects.count(),
            'ProductImages': ProductImage.objects.count(),
            'ProductVariants': ProductVariant.objects.count(),
            'VariantImages': VariantImage.objects.count(),
            'FeaturedProducts': FeaturedProduct.objects.count(),
            'Categories': Category.objects.count(),
            'Subcategories': Subcategory.objects.count(),
            'Banners': Banner.objects.count(),
            'Offers': Offer.objects.count(),
            'Orders': Order.objects.count(),
            'OrderItems': OrderItem.objects.count(),
            'OrderStatusHistory': OrderStatusHistory.objects.count(),
            'Addresses': Address.objects.count(),
            'Reviews': Review.objects.count(),
            'Notifications': Notification.objects.count(),
            'Customer Profiles': CustomerProfile.objects.count(),
            'Customer Users': User.objects.filter(is_staff=False, is_superuser=False).count(),
            'Admin Login OTPs': AdminLoginOTP.objects.count(),
            'Admin Password Reset OTPs': AdminPasswordResetOTP.objects.count(),
            'Admin Password Reset Tokens': AdminPasswordResetToken.objects.count(),
            'Admin Action Logs': LogEntry.objects.count(),
            'Admin/Staff Users': User.objects.filter(Q(is_staff=True) | Q(is_superuser=True)).count(),
            'AdminProfiles': AdminProfile.objects.count(),
            'StoreSettings': StoreSettings.objects.count(),
        }

    def get_dynamic_media_files(self):
        media_root = getattr(settings, 'MEDIA_ROOT', '')
        if not media_root or not os.path.exists(media_root):
            return []

        dynamic_dirs = ['products', 'variant_products', 'featured_products', 'banners', 'reviews', 'categories', 'offers']
        found_files = []

        for d in dynamic_dirs:
            target_dir = os.path.join(media_root, d)
            if os.path.exists(target_dir):
                for root, _, files in os.walk(target_dir):
                    for f in files:
                        if not f.startswith('.'):
                            found_files.append(os.path.join(root, f))
        return found_files

    def print_counts_table(self, title, counts):
        self.stdout.write(self.style.MIGRATE_HEADING(f"\n=========================================="))
        self.stdout.write(self.style.MIGRATE_HEADING(f" {title}"))
        self.stdout.write(self.style.MIGRATE_HEADING(f"=========================================="))
        for key, val in counts.items():
            if 'Admin/Staff' in key or 'AdminProfiles' in key or 'StoreSettings' in key:
                self.stdout.write(self.style.SUCCESS(f"  [PRESERVED] {key.ljust(28)}: {val}"))
            else:
                self.stdout.write(f"  [CLEARED]   {key.ljust(28)}: {val}")

    def reset_sequences(self, models):
        self.stdout.write("\nResetting primary-key sequences for cleared business tables...")
        table_names = [m._meta.db_table for m in models]
        vendor = connection.vendor

        with connection.cursor() as cursor:
            if vendor == 'sqlite':
                # Check if sqlite_sequence exists
                cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='sqlite_sequence';")
                if cursor.fetchone():
                    for t in table_names:
                        cursor.execute("DELETE FROM sqlite_sequence WHERE name = %s;", [t])
                self.stdout.write(self.style.SUCCESS(f"  [SQLITE] Reset sqlite_sequence for {len(table_names)} tables."))

            elif vendor == 'postgresql':
                for t in table_names:
                    try:
                        cursor.execute(f"ALTER SEQUENCE IF EXISTS {t}_id_seq RESTART WITH 1;")
                    except Exception as e:
                        self.stdout.write(self.style.WARNING(f"  Could not alter sequence for {t}: {e}"))

                style = no_style()
                sql_list = connection.ops.sequence_reset_sql(style, models)
                for sql in sql_list:
                    try:
                        cursor.execute(sql)
                    except Exception:
                        pass
                self.stdout.write(self.style.SUCCESS(f"  [POSTGRESQL] Reset ID sequences for {len(table_names)} tables."))

            else:
                style = no_style()
                sql_list = connection.ops.sequence_reset_sql(style, models)
                for sql in sql_list:
                    try:
                        cursor.execute(sql)
                    except Exception:
                        pass
                self.stdout.write(self.style.SUCCESS(f"  [{vendor.upper()}] Sequence reset commands executed."))

    def handle(self, *args, **options):
        is_dry_run = options.get('dry_run', False)
        is_confirmed = options.get('confirmed', False)

        self.stdout.write(self.style.MIGRATE_HEADING("\n>>> MOXIE CLEAN DATABASE RESET & SEQUENCE SYNC <<<\n"))

        # Verify Admin exists before doing anything
        admins = User.objects.filter(Q(is_staff=True) | Q(is_superuser=True))
        if not admins.exists():
            self.stderr.write(self.style.ERROR("ERROR: No superuser or staff admin account found! Aborting safety reset."))
            return

        self.stdout.write(self.style.SUCCESS(f"Preserved Admin Account(s):"))
        for admin in admins:
            self.stdout.write(self.style.SUCCESS(
                f"  - ID: {admin.id}, Username: '{admin.username}', Email: '{admin.email}', "
                f"Superuser: {admin.is_superuser}, Staff: {admin.is_staff}, Active: {admin.is_active}"
            ))

        before_counts = self.get_counts()
        self.print_counts_table("CURRENT RECORD COUNTS", before_counts)

        media_files = self.get_dynamic_media_files()
        self.stdout.write(f"\nDynamic Media Files Detected ({len(media_files)} files):")
        for mf in media_files[:10]:
            self.stdout.write(f"  - {os.path.relpath(mf, getattr(settings, 'MEDIA_ROOT', ''))}")
        if len(media_files) > 10:
            self.stdout.write(f"  ... and {len(media_files) - 10} more files.")

        if is_dry_run:
            self.stdout.write(self.style.WARNING("\n[DRY RUN] Dry-run completed. No database rows or files were modified.\n"))
            return

        # Prompt for confirmation if not explicitly passed
        if not is_confirmed:
            confirm = input("\nAre you sure you want to permanently delete all dynamic store data & media? (type 'yes' to proceed): ")
            if confirm.strip().lower() != 'yes':
                self.stdout.write(self.style.WARNING("\nReset cancelled by user."))
                return

        # Atomic Deletion
        self.stdout.write("\nPerforming atomic deletion of dynamic records...")
        business_models = self.get_business_models()

        try:
            with transaction.atomic():
                # 1. Orders & Tracking
                OrderStatusHistory.objects.all().delete()
                OrderItem.objects.all().delete()
                Order.objects.all().delete()

                # 2. Products, Variants & Images
                FeaturedProduct.objects.all().delete()
                VariantImage.objects.all().delete()
                ProductImage.objects.all().delete()
                ProductVariant.objects.all().delete()
                Review.objects.all().delete()
                Product.objects.all().delete()

                # 3. Categories & Subcategories
                Subcategory.objects.all().delete()
                Category.objects.all().delete()

                # 4. Banners & Offers
                Banner.objects.all().delete()
                Offer.objects.all().delete()

                # 5. Addresses & Notifications
                Address.objects.all().delete()
                Notification.objects.all().delete()

                # 6. Customer users and auth tokens (EXCLUDING admin/staff)
                CustomerProfile.objects.all().delete()
                AdminLoginOTP.objects.all().delete()
                AdminPasswordResetOTP.objects.filter(user__is_staff=False, user__is_superuser=False).delete()
                AdminPasswordResetToken.objects.filter(user__is_staff=False, user__is_superuser=False).delete()
                LogEntry.objects.all().delete()
                User.objects.filter(is_staff=False, is_superuser=False).delete()
                User.objects.filter(Q(username__startswith='test_admin') | Q(username__startswith='admin_test')).exclude(username='admin').delete()

                # Safety checks inside atomic transaction
                remaining_admins = User.objects.filter(Q(is_staff=True) | Q(is_superuser=True)).count()
                if remaining_admins == 0:
                    raise RuntimeError("Admin accounts were accidentally deleted! Rolling back entire transaction.")

                if not StoreSettings.objects.exists():
                    # Ensure StoreSettings(id=1) exists
                    StoreSettings.objects.create(id=1, store_name='MOXIE')

            # 7. Sequence Reset
            self.reset_sequences(business_models)

        except Exception as e:
            self.stderr.write(self.style.ERROR(f"\nFATAL ERROR DURING RESET: {str(e)}"))
            self.stderr.write(self.style.ERROR("Transaction rolled back completely. Database left unchanged."))
            raise

        # 8. Dynamic Media Removal
        deleted_media_count = 0
        for mf in media_files:
            try:
                if os.path.exists(mf):
                    os.remove(mf)
                    deleted_media_count += 1
            except Exception as e:
                self.stdout.write(self.style.WARNING(f"  Could not delete media file '{mf}': {e}"))

        self.stdout.write(self.style.SUCCESS(f"\nRemoved {deleted_media_count} dynamic uploaded media files."))

        # Show AFTER counts
        after_counts = self.get_counts()
        self.print_counts_table("RECORD COUNTS AFTER RESET", after_counts)

        self.stdout.write(self.style.SUCCESS("\n[SUCCESS] MOXIE DYNAMIC DATA RESET & SEQUENCE SYNC COMPLETED!"))
        self.stdout.write(self.style.SUCCESS("Database is clean, sequences reset to 1, and static MOXIE assets remain intact.\n"))
