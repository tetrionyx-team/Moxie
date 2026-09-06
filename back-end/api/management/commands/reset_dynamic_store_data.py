from django.core.management.base import BaseCommand
from django.db import transaction
from django.contrib.auth import get_user_model
from django.db.models import Q

from products.models import Product, ProductImage, ProductVariant, VariantImage, Review
from categories.models import Category, Subcategory
from banners.models import Banner
from api.models import (
    Order,
    OrderItem,
    CustomerProfile,
    AdminProfile,
    StoreSettings,
    Notification,
    Offer,
    AdminPasswordResetOTP,
    AdminPasswordResetToken,
)

User = get_user_model()


class Command(BaseCommand):
    help = "Safely reset all dynamic business & customer records from the database while preserving Admin, AdminProfile, and StoreSettings."

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Execute the reset without interactive prompt confirmation.',
        )
        parser.add_argument(
            '--noinput',
            '--no-input',
            action='store_true',
            help='Do NOT prompt the user for input of any kind.',
        )

    def get_counts(self):
        return {
            'Products': Product.objects.count(),
            'ProductImages': ProductImage.objects.count(),
            'ProductVariants': ProductVariant.objects.count(),
            'VariantImages': VariantImage.objects.count(),
            'Categories': Category.objects.count(),
            'Subcategories': Subcategory.objects.count(),
            'Banners': Banner.objects.count(),
            'Offers': Offer.objects.count(),
            'Orders': Order.objects.count(),
            'OrderItems': OrderItem.objects.count(),
            'Reviews': Review.objects.count(),
            'Notifications': Notification.objects.count(),
            'Customer Users': User.objects.filter(is_staff=False, is_superuser=False).count(),
            'CustomerProfiles': CustomerProfile.objects.count(),
            'CustomerPasswordResetOTPs': AdminPasswordResetOTP.objects.filter(user__is_staff=False).count(),
            'CustomerPasswordResetTokens': AdminPasswordResetToken.objects.filter(user__is_staff=False).count(),
            'Admin/Superuser Users': User.objects.filter(Q(is_staff=True) | Q(is_superuser=True)).count(),
            'AdminProfiles': AdminProfile.objects.count(),
            'StoreSettings': StoreSettings.objects.count(),
        }

    def print_counts_table(self, title, counts):
        self.stdout.write(self.style.MIGRATE_HEADING(f"\n=========================================="))
        self.stdout.write(self.style.MIGRATE_HEADING(f" {title}"))
        self.stdout.write(self.style.MIGRATE_HEADING(f"=========================================="))
        for key, val in counts.items():
            if 'Admin' in key or 'StoreSettings' in key:
                self.stdout.write(self.style.SUCCESS(f"  [PRESERVED] {key.ljust(28)}: {val}"))
            else:
                self.stdout.write(f"  [DYNAMIC]   {key.ljust(28)}: {val}")

    def handle(self, *args, **options):
        self.stdout.write(self.style.MIGRATE_HEADING("\n>>> STARTING MOXIE SAFE DYNAMIC DATA AUDIT <<<\n"))

        # Verify Admin exists before doing anything
        admins = User.objects.filter(Q(is_staff=True) | Q(is_superuser=True))
        if not admins.exists():
            self.stderr.write(self.style.ERROR("ERROR: No superuser or admin account found! Aborting safety reset."))
            return

        self.stdout.write(self.style.SUCCESS(f"Preserved Admin Account(s):"))
        for admin in admins:
            self.stdout.write(self.style.SUCCESS(
                f"  - ID: {admin.id}, Username: '{admin.username}', Email: '{admin.email}', "
                f"Superuser: {admin.is_superuser}, Staff: {admin.is_staff}, Active: {admin.is_active}"
            ))

        # Show BEFORE counts
        before_counts = self.get_counts()
        self.print_counts_table("RECORD COUNTS BEFORE RESET", before_counts)

        # Confirmation
        if not (options.get('force') or options.get('noinput')):
            confirm = input("\nAre you sure you want to delete all dynamic store data? (type 'yes' to proceed): ")
            if confirm.strip().lower() != 'yes':
                self.stdout.write(self.style.WARNING("\nReset cancelled by user."))
                return

        # Atomic Deletion
        self.stdout.write("\nPerforming atomic deletion of dynamic records...")
        try:
            with transaction.atomic():
                # 1. Product child images & variants
                VariantImage.objects.all().delete()
                ProductImage.objects.all().delete()
                ProductVariant.objects.all().delete()

                # 2. Reviews & Products
                Review.objects.all().delete()
                Product.objects.all().delete()

                # 3. Categories & Subcategories
                Subcategory.objects.all().delete()
                Category.objects.all().delete()

                # 4. Banners
                Banner.objects.all().delete()

                # 5. Offers
                Offer.objects.all().delete()

                # 6. Orders & OrderItems
                OrderItem.objects.all().delete()
                Order.objects.all().delete()

                # 7. Notifications
                Notification.objects.all().delete()

                # 8. Customers and customer profiles (EXCLUDING admin/staff)
                CustomerProfile.objects.all().delete()
                AdminPasswordResetOTP.objects.filter(user__is_staff=False, user__is_superuser=False).delete()
                AdminPasswordResetToken.objects.filter(user__is_staff=False, user__is_superuser=False).delete()
                User.objects.filter(is_staff=False, is_superuser=False).delete()

                # Safety checks inside atomic transaction
                remaining_admins = User.objects.filter(Q(is_staff=True) | Q(is_superuser=True)).count()
                if remaining_admins == 0:
                    raise RuntimeError("Admin accounts were accidentally deleted! Rolling back entire transaction.")

                if not StoreSettings.objects.exists():
                    raise RuntimeError("StoreSettings was accidentally deleted! Rolling back entire transaction.")

        except Exception as e:
            self.stderr.write(self.style.ERROR(f"\nFATAL ERROR DURING RESET: {str(e)}"))
            self.stderr.write(self.style.ERROR("Transaction rolled back completely. Database left unchanged."))
            raise

        # Show AFTER counts
        after_counts = self.get_counts()
        self.print_counts_table("RECORD COUNTS AFTER RESET", after_counts)

        self.stdout.write(self.style.SUCCESS("\n[SUCCESS] MOXIE DYNAMIC DATA RESET COMPLETED SUCCESSFULLY!"))
        self.stdout.write(self.style.SUCCESS("All static frontend design assets and Admin/StoreSettings are intact.\n"))
