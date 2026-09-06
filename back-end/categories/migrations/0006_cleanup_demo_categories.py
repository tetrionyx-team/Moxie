from django.db import migrations

def cleanup_demo_categories(apps, schema_editor):
    Category = apps.get_model('categories', 'Category')
    Subcategory = apps.get_model('categories', 'Subcategory')

    demo_category_slugs = [
        "watches", "accessories", "gadgets", "fashion-bags",
        "die-cast-cars", "footwear", "clothing", "electronics-cameras"
    ]

    demo_categories = Category.objects.filter(slug__in=demo_category_slugs)
    for cat in demo_categories:
        # Delete related subcategories
        Subcategory.objects.filter(category=cat).delete()
        cat.delete()

def noop(apps, schema_editor):
    pass

class Migration(migrations.Migration):
    dependencies = [
        ('categories', '0005_seed_categories_subcategories'),
        ('products', '0010_cleanup_demo_products_and_reviews'),
    ]
    operations = [
        migrations.RunPython(cleanup_demo_categories, noop),
    ]
