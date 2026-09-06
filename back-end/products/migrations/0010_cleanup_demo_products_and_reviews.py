from django.db import migrations

def cleanup_demo_products_and_reviews(apps, schema_editor):
    Product = apps.get_model('products', 'Product')
    ProductImage = apps.get_model('products', 'ProductImage')
    Review = apps.get_model('products', 'Review')

    demo_product_names = [
        "Classic Black Watch", "Premium Silver Watch", "Sport Black Watch",
        "Smart Watch Pro", "Rose Gold Series", "Active Fit Watch",
        "Chrono Elite", "Aviator Watch", "Luxe Diamond Watch",
        "Minimalist Steel Watch", "Urban Digital Watch", "Vintage Leather Watch",
        "Vanguard Automatic", "Royal Oak Heritage", "Seafarer Diver 300M",
        "Cosmograph Racer", "Nautilus Steel Blue", "Speedmaster Apollo",
        "Grand Complication Rose", "Sky-Dweller Dual Time", "Daytona Chrono Gold",
        "Submariner Pro Black", "Heritage Chronometer", "Voyager World Time",
        "Calatrava Classic Silver", "Tourbillon Skeleton", "Aero Pilot Titanium",
        "Marine Master Ceramic"
    ]

    demo_review_names = ["Kavin", "Vishnu", "Ganesh", "Ananya Sharma", "Harish"]

    # Delete only demo reviews with specific seeded text or demo names
    Review.objects.filter(
        name__in=demo_review_names,
        image__in=["reviews/profile1.png", "reviews/profile2.png", "reviews/profile3.png"]
    ).delete()

    # Find demo products matching the exact names and containing demo image references
    demo_products = Product.objects.filter(name__in=demo_product_names)
    for p in demo_products:
        # Check if it has demo image references
        has_demo_img = ProductImage.objects.filter(product=p, image__startswith="products/watch").exists()
        if has_demo_img:
            ProductImage.objects.filter(product=p).delete()
            p.delete()

def noop(apps, schema_editor):
    pass

class Migration(migrations.Migration):
    dependencies = [
        ('products', '0009_productvariant_sizes'),
    ]
    operations = [
        migrations.RunPython(cleanup_demo_products_and_reviews, noop),
    ]
