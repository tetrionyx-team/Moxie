import os
import sys
import django

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from products.models import Product, ProductImage, ProductVariant, VariantImage
from banners.models import Banner

print("=== PRODUCTS ===")
for p in Product.objects.all():
    imgs = [f"{pi.id}:{pi.image.name}" for pi in p.images.all()]
    print(f"Product ID: {p.id}, Name: {p.name}, Price: {p.price}, Images: {imgs}")

print("\n=== VARIANTS ===")
for pv in ProductVariant.objects.all():
    imgs = [f"{vi.id}:{vi.image.name}" for vi in pv.images.all()]
    print(f"Variant ID: {pv.id}, Product: {pv.product.name if pv.product else None} (ID: {pv.product_id}), Color: {pv.color_name}, Images: {imgs}")

print("\n=== BANNERS ===")
for b in Banner.objects.all():
    print(f"Banner ID: {b.id}, Title: {b.title}, Subtitle: {b.subtitle}, Image: {b.image.name if b.image else None}")

print("\n=== MEDIA DIRECTORY FILES ===")
media_dir = os.path.join(BASE_DIR, 'media')
for root, dirs, files in os.walk(media_dir):
    for f in files:
        rel = os.path.relpath(os.path.join(root, f), media_dir)
        print(f"Media File: {rel}")
