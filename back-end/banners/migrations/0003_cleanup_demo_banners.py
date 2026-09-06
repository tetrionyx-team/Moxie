from django.db import migrations

def cleanup_demo_banners(apps, schema_editor):
    Banner = apps.get_model('banners', 'Banner')
    demo_titles = [
        "UPGRADE YOUR STYLE SHOP THE LATEST",
        "PREMIUM TECH. BETTER LIFESTYLE.",
        "PRODUCTS YOU'LL LOVE BEST QUALITY",
    ]
    # Remove only seeded demo banners
    Banner.objects.filter(title__in=demo_titles, image="banners/banner2.png").delete()

def noop(apps, schema_editor):
    pass

class Migration(migrations.Migration):
    dependencies = [
        ('banners', '0002_seed_banners'),
    ]
    operations = [
        migrations.RunPython(cleanup_demo_banners, noop),
    ]
