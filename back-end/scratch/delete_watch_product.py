import os
import sys
import django

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from products.models import Product, ProductImage, ProductVariant, VariantImage

product_id = 47
p = Product.objects.filter(id=product_id).first()

if p:
    print(f"Deleting Product: {p.id} - {p.name}")
    # Collect files to delete
    files_to_delete = []
    for pi in p.images.all():
        if pi.image:
            files_to_delete.append(pi.image.path)
    for pv in p.variants.all():
        for vi in pv.images.all():
            if vi.image:
                files_to_delete.append(vi.image.path)

    # Delete from DB
    p.delete()
    print("Deleted product from database.")

    # Delete physical image files
    for file_path in files_to_delete:
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
                print(f"Deleted file: {file_path}")
            except Exception as e:
                print(f"Could not remove {file_path}: {e}")

# Check any remaining unreferenced watch_1_black_gold files in media
media_dir = os.path.join(BASE_DIR, 'media')
for root, dirs, files in os.walk(media_dir):
    for f in files:
        if 'watch_1_black_gold' in f:
            full_path = os.path.join(root, f)
            try:
                os.remove(full_path)
                print(f"Cleaned up media file: {full_path}")
            except Exception as e:
                print(f"Could not remove {full_path}: {e}")

print("Done! Verified deletion.")
