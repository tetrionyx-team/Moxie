from django.db import models
from django.contrib.auth.models import User
from categories.models import Category


class Product(models.Model):
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)

    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='products'
    )

    subcategory = models.ForeignKey(
        'categories.Subcategory',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='products'
    )

    price = models.DecimalField(max_digits=10, decimal_places=2)

    original_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True
    )

    discount_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True
    )

    shipping_charge = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0.00
    )

    stock = models.PositiveIntegerField(default=0)

    video = models.FileField(
        upload_to='products/videos/',
        blank=True,
        null=True
    )

    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def average_rating(self):
        approved = self.reviews.filter(is_active=True, status='Approved')
        if not approved.exists():
            return None
        from django.db.models import Avg
        avg = approved.aggregate(Avg('rating'))['rating__avg']
        return round(float(avg), 1) if avg is not None else None

    @property
    def review_count(self):
        return self.reviews.filter(is_active=True, status='Approved').count()

    def __str__(self):
        return self.name


class ProductImage(models.Model):
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='images'
    )

    image = models.ImageField(upload_to='products/')

    is_primary = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.product.name} Image"


class ProductVariant(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='variants')
    color_name = models.CharField(max_length=100)
    color_code = models.CharField(max_length=50, default='#000000')
    price = models.DecimalField(max_digits=10, decimal_places=2)
    discount_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    stock = models.PositiveIntegerField(default=0)
    sizes = models.JSONField(default=list, blank=True)
    video = models.FileField(
        upload_to='variant_products/videos/',
        blank=True,
        null=True
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.product.name} - {self.color_name}"


class VariantImage(models.Model):
    variant = models.ForeignKey(ProductVariant, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='variant_products/')
    is_primary = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.variant} Image"


class Review(models.Model):
    STATUS_CHOICES = (
        ('Approved', 'Approved'),
        ('Pending', 'Pending'),
        ('Rejected', 'Rejected'),
    )

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='reviews', null=True, blank=True)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, related_name='reviews', null=True, blank=True)
    order = models.ForeignKey('api.Order', on_delete=models.SET_NULL, related_name='reviews', null=True, blank=True)
    name = models.CharField(max_length=100)
    email = models.CharField(max_length=255, null=True, blank=True)
    rating = models.DecimalField(max_digits=3, decimal_places=1)
    image = models.ImageField(upload_to='reviews/', null=True, blank=True)
    text = models.TextField()
    is_verified = models.BooleanField(default=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Approved')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} - {self.rating}"


class FeaturedProduct(models.Model):
    FEATURE_TYPES = [
        ("HOT_SALE", "Hot Sale"),
        ("TRENDING", "Trending"),
        ("OFFER", "Offer"),
    ]

    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="featured_entries"
    )
    feature_type = models.CharField(
        max_length=20,
        choices=FEATURE_TYPES,
        default="HOT_SALE"
    )
    display_image = models.ImageField(
        upload_to="featured_products/",
        blank=True,
        null=True
    )
    badge_text = models.CharField(
        max_length=50,
        blank=True
    )
    sort_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    start_date = models.DateTimeField(
        blank=True,
        null=True
    )
    end_date = models.DateTimeField(
        blank=True,
        null=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['sort_order', '-created_at']
        unique_together = ('product', 'feature_type')

    def __str__(self):
        return f"{self.product.name} ({self.get_feature_type_display()})"