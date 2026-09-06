from django.db import migrations

def cleanup_demo_products_and_reviews(apps, schema_editor):
    Product = apps.get_model('products', 'Product')
    ProductImage = apps.get_model('products', 'ProductImage')
    ProductVariant = apps.get_model('products', 'ProductVariant')
    VariantImage = apps.get_model('products', 'VariantImage')
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

    # 1. Delete seeded demo reviews
    Review.objects.filter(
        name__in=demo_review_names,
        image__in=["reviews/profile1.png", "reviews/profile2.png", "reviews/profile3.png"]
    ).delete()

    # 2. Delete demo products and all associated images and variants
    demo_products = Product.objects.filter(name__in=demo_product_names)
    for p in demo_products:
        # Delete variant images and variants
        variants = ProductVariant.objects.filter(product=p)
        for v in variants:
            VariantImage.objects.filter(variant=v).delete()
        variants.delete()

        # Delete product images
        ProductImage.objects.filter(product=p).delete()

        # Delete product
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
