import logging
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from products.models import Product, ProductVariant, Review
from categories.models import Category, Subcategory
from banners.models import Banner
from .models import Notification

logger = logging.getLogger(__name__)


# ==============================================================================
# 1. Product & ProductVariant Signals
# ==============================================================================
@receiver(post_save, sender=Product)
def product_post_save_notification(sender, instance, created, **kwargs):
    try:
        # Avoid duplicate or suppressed notifications
        if getattr(instance, '_suppress_notification', False):
            return

        # Do not fire notifications on internal stock/status field updates
        update_fields = kwargs.get('update_fields')
        if update_fields:
            relevant_fields = set(update_fields) - {'stock', 'is_active', 'stock_decremented', 'updated_at'}
            if not relevant_fields:
                return

        cat_name = instance.category.name if instance.category else "Uncategorized"
        subcat_name = f" > {instance.subcategory.name}" if instance.subcategory else ""
        stock = getattr(instance, 'stock', 0) or 0
        price = getattr(instance, 'price', 0) or 0
        status_str = "Active" if instance.is_active else "Inactive"

        if created:
            Notification.objects.create(
                title=f"Product Added: {instance.name}",
                sender="Catalog Admin",
                sender_initial="P",
                sender_color="#10b981",
                body=f"New product '{instance.name}' was created with {stock} units in stock.",
                full_body=(
                    f"Product Name: {instance.name}\n"
                    f"Product ID: {instance.id}\n"
                    f"Category: {cat_name}{subcat_name}\n"
                    f"Price: ₹{price}\n"
                    f"Initial Stock: {stock} units\n"
                    f"Status: {status_str}"
                ),
                recipients="Admin Team",
                department="Catalog Management",
                category_badge="Products",
                notification_type="product_created",
                target_url=f"/admin/products/product/{instance.id}/change/",
            )
        else:
            stock_info = f" (Stock: {stock} units)"
            if stock == 0:
                stock_info = " (Out of Stock)"
            elif stock <= 5:
                stock_info = f" (Low Stock: {stock} units)"

            Notification.objects.create(
                title=f"Product Updated: {instance.name}",
                sender="Catalog Admin",
                sender_initial="P",
                sender_color="#6366f1",
                body=f"Product '{instance.name}' details were updated successfully{stock_info}.",
                full_body=(
                    f"Product Name: {instance.name}\n"
                    f"Product ID: {instance.id}\n"
                    f"Category: {cat_name}{subcat_name}\n"
                    f"Price: ₹{price}\n"
                    f"Current Stock: {stock} units\n"
                    f"Status: {status_str}"
                ),
                recipients="Admin Team",
                department="Catalog Management",
                category_badge="Products",
                notification_type="product_updated",
                target_url=f"/admin/products/product/{instance.id}/change/",
            )
    except Exception as e:
        logger.error(f"Error creating product save notification: {e}")


@receiver(post_delete, sender=Product)
def product_post_delete_notification(sender, instance, **kwargs):
    try:
        cat_name = instance.category.name if instance.category else "Uncategorized"
        Notification.objects.create(
            title=f"Product Deleted: {instance.name}",
            sender="Catalog Admin",
            sender_initial="P",
            sender_color="#ef4444",
            body=f"Product '{instance.name}' was permanently deleted from the catalog.",
            full_body=f"The product '{instance.name}' (ID: {instance.id}, Category: {cat_name}) has been permanently deleted from the store catalog.",
            recipients="Admin Team",
            department="Catalog Management",
            category_badge="Products",
            notification_type="product_deleted",
            target_url="/admin/products/product/",
        )
    except Exception as e:
        logger.error(f"Error creating product delete notification: {e}")


@receiver(post_save, sender=ProductVariant)
def product_variant_post_save_notification(sender, instance, created, **kwargs):
    try:
        if getattr(instance, '_suppress_notification', False):
            return
        product = instance.product
        if not product or getattr(product, '_suppress_notification', False):
            return

        # Recalculate parent product total stock and active state
        total_stock = sum(v.stock for v in product.variants.all())
        product.stock = total_stock
        has_active = product.variants.filter(is_active=True).exists()
        product.is_active = has_active
        try:
            product._suppress_notification = True
            product.save(update_fields=['stock', 'is_active'])
        finally:
            product._suppress_notification = False
    except Exception as e:
        logger.error(f"Error syncing variant stock: {e}")


@receiver(post_delete, sender=ProductVariant)
def product_variant_post_delete_notification(sender, instance, **kwargs):
    try:
        if getattr(instance, '_suppress_notification', False):
            return
        product = instance.product
        if not product or getattr(product, '_suppress_notification', False):
            return

        total_stock = sum(v.stock for v in product.variants.exclude(pk=instance.pk))
        product.stock = total_stock
        try:
            product._suppress_notification = True
            product.save(update_fields=['stock'])
        finally:
            product._suppress_notification = False

        cat_name = product.category.name if product.category else "Uncategorized"

        Notification.objects.create(
            title=f"Product Updated: {product.name}",
            sender="Catalog Admin",
            sender_initial="P",
            sender_color="#ef4444",
            body=f"Variant '{instance.color_name}' was removed from product '{product.name}'.",
            full_body=(
                f"Product Name: {product.name}\n"
                f"Removed Variant: {instance.color_name}\n"
                f"Remaining Total Stock: {total_stock} units\n"
                f"Category: {cat_name}"
            ),
            recipients="Admin Team",
            department="Catalog Management",
            category_badge="Products",
            notification_type="product_updated",
            target_url=f"/admin/products/product/{product.id}/change/",
        )
    except Exception as e:
        logger.error(f"Error creating variant delete notification: {e}")


# ==============================================================================
# 2. Category & Subcategory Signals
# ==============================================================================
@receiver(post_save, sender=Category)
def category_post_save_notification(sender, instance, created, **kwargs):
    try:
        if getattr(instance, '_suppress_notification', False):
            return
        if created:
            Notification.objects.create(
                title=f"Category Added: {instance.name}",
                sender="Category Admin",
                sender_initial="C",
                sender_color="#10b981",
                body=f"New category '{instance.name}' was created.",
                full_body=f"Category Name: {instance.name}\nSlug: {instance.slug}\nStatus: {'Active' if instance.is_active else 'Inactive'}",
                recipients="Admin Team",
                department="Category Management",
                category_badge="Products",
                notification_type="category_created",
                target_url="/admin/categories/category/",
            )
        else:
            Notification.objects.create(
                title=f"Category Updated: {instance.name}",
                sender="Category Admin",
                sender_initial="C",
                sender_color="#6366f1",
                body=f"Category '{instance.name}' was updated.",
                full_body=f"Category Name: {instance.name}\nSlug: {instance.slug}\nStatus: {'Active' if instance.is_active else 'Inactive'}",
                recipients="Admin Team",
                department="Category Management",
                category_badge="Products",
                notification_type="category_updated",
                target_url="/admin/categories/category/",
            )
    except Exception as e:
        logger.error(f"Error creating category save notification: {e}")


@receiver(post_delete, sender=Category)
def category_post_delete_notification(sender, instance, **kwargs):
    try:
        Notification.objects.create(
            title=f"Category Deleted: {instance.name}",
            sender="Category Admin",
            sender_initial="C",
            sender_color="#ef4444",
            body=f"Category '{instance.name}' was removed from the store.",
            full_body=f"Category '{instance.name}' (Slug: {instance.slug}) has been deleted.",
            recipients="Admin Team",
            department="Category Management",
            category_badge="Products",
            notification_type="category_deleted",
            target_url="/admin/categories/category/",
        )
    except Exception as e:
        logger.error(f"Error creating category delete notification: {e}")


@receiver(post_save, sender=Subcategory)
def subcategory_post_save_notification(sender, instance, created, **kwargs):
    try:
        if getattr(instance, '_suppress_notification', False):
            return
        cat_name = instance.category.name if instance.category else "Uncategorized"
        action_name = "Added" if created else "Updated"
        Notification.objects.create(
            title=f"Subcategory {action_name}: {instance.name}",
            sender="Category Admin",
            sender_initial="C",
            sender_color="#10b981" if created else "#6366f1",
            body=f"Subcategory '{instance.name}' (under '{cat_name}') was {action_name.lower()}.",
            full_body=f"Subcategory: {instance.name}\nParent Category: {cat_name}\nSlug: {instance.slug}\nStatus: {'Active' if instance.is_active else 'Inactive'}",
            recipients="Admin Team",
            department="Category Management",
            category_badge="Products",
            notification_type="category_created" if created else "category_updated",
            target_url="/admin/categories/category/",
        )
    except Exception as e:
        logger.error(f"Error creating subcategory save notification: {e}")


@receiver(post_delete, sender=Subcategory)
def subcategory_post_delete_notification(sender, instance, **kwargs):
    try:
        cat_name = instance.category.name if instance.category else "Uncategorized"
        Notification.objects.create(
            title=f"Subcategory Deleted: {instance.name}",
            sender="Category Admin",
            sender_initial="C",
            sender_color="#ef4444",
            body=f"Subcategory '{instance.name}' was removed.",
            full_body=f"Subcategory '{instance.name}' under '{cat_name}' has been deleted.",
            recipients="Admin Team",
            department="Category Management",
            category_badge="Products",
            notification_type="category_deleted",
            target_url="/admin/categories/category/",
        )
    except Exception as e:
        logger.error(f"Error creating subcategory delete notification: {e}")


# ==============================================================================
# 3. Banner Signals
# ==============================================================================
@receiver(post_save, sender=Banner)
def banner_post_save_notification(sender, instance, created, **kwargs):
    try:
        title_text = instance.title or "Promotional Banner"
        if created:
            Notification.objects.create(
                title=f"Banner Added: {title_text}",
                sender="Marketing Admin",
                sender_initial="B",
                sender_color="#10b981",
                body=f"New promotional banner '{title_text}' was published.",
                full_body=f"Banner Title: {title_text}\nSubtitle: {instance.subtitle or 'N/A'}\nPosition: {instance.display_order}\nStatus: {'Active' if instance.is_active else 'Inactive'}",
                recipients="Admin Team",
                department="Marketing Management",
                category_badge="Offers",
                notification_type="banner_created",
                target_url="/admin/banners/banner/",
            )
        else:
            Notification.objects.create(
                title=f"Banner Updated: {title_text}",
                sender="Marketing Admin",
                sender_initial="B",
                sender_color="#6366f1",
                body=f"Banner '{title_text}' was updated.",
                full_body=f"Banner Title: {title_text}\nSubtitle: {instance.subtitle or 'N/A'}\nPosition: {instance.display_order}\nStatus: {'Active' if instance.is_active else 'Inactive'}",
                recipients="Admin Team",
                department="Marketing Management",
                category_badge="Offers",
                notification_type="banner_updated",
                target_url="/admin/banners/banner/",
            )
    except Exception as e:
        logger.error(f"Error creating banner save notification: {e}")


@receiver(post_delete, sender=Banner)
def banner_post_delete_notification(sender, instance, **kwargs):
    try:
        title_text = instance.title or "Promotional Banner"
        Notification.objects.create(
            title=f"Banner Deleted: {title_text}",
            sender="Marketing Admin",
            sender_initial="B",
            sender_color="#ef4444",
            body=f"Banner '{title_text}' was removed from promotional display.",
            full_body=f"Promotional banner '{title_text}' has been deleted.",
            recipients="Admin Team",
            department="Marketing Management",
            category_badge="Offers",
            notification_type="banner_deleted",
            target_url="/admin/banners/banner/",
        )
    except Exception as e:
        logger.error(f"Error creating banner delete notification: {e}")
