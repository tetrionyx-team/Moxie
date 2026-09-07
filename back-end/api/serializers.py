from rest_framework import serializers

from banners.models import Banner
from categories.models import Category, Subcategory
from products.models import Product, ProductImage, ProductVariant, Review, VariantImage


class SubcategorySerializer(serializers.ModelSerializer):
    category = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(),
        required=False,
        allow_null=True
    )
    category_id = serializers.IntegerField(write_only=True, required=False)

    class Meta:
        model = Subcategory
        fields = [
            'id',
            'category',
            'category_id',
            'name',
            'slug',
            'description',
            'is_active',
        ]

    def create(self, validated_data):
        category_id = validated_data.pop('category_id', None)
        if category_id and 'category' not in validated_data:
            try:
                validated_data['category'] = Category.objects.get(pk=category_id)
            except Category.DoesNotExist:
                raise serializers.ValidationError({'category': 'Category does not exist.'})
        elif 'category' not in validated_data or not validated_data.get('category'):
            raise serializers.ValidationError({'category': 'Category is required.'})

        if not validated_data.get('slug') and validated_data.get('name'):
            from django.utils.text import slugify
            base_slug = slugify(validated_data['name'])
            slug = base_slug
            counter = 1
            while Subcategory.objects.filter(slug=slug).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            validated_data['slug'] = slug
        return super().create(validated_data)


class CategorySerializer(serializers.ModelSerializer):
    subcategories = SubcategorySerializer(
        many=True,
        read_only=True
    )

    class Meta:
        model = Category
        fields = [
            'id',
            'name',
            'slug',
            'description',
            'is_active',
            'subcategories',
            'created_at',
            'updated_at',
        ]

    def create(self, validated_data):
        if not validated_data.get('slug') and validated_data.get('name'):
            from django.utils.text import slugify
            base_slug = slugify(validated_data['name'])
            slug = base_slug
            counter = 1
            while Category.objects.filter(slug=slug).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            validated_data['slug'] = slug
        return super().create(validated_data)

    def update(self, instance, validated_data):
        instance = super().update(instance, validated_data)
        request = self.context.get('request')
        if request and hasattr(request, 'data'):
            deleted_sub_ids = request.data.get('deleted_subcategories', [])
            if deleted_sub_ids:
                Subcategory.objects.filter(id__in=deleted_sub_ids, category=instance).delete()

            raw_subs = request.data.get('subcategories', [])
            if isinstance(raw_subs, list):
                from django.utils.text import slugify
                for s in raw_subs:
                    if not isinstance(s, dict):
                        continue
                    s_id = s.get('id')
                    s_name = (s.get('name') or '').strip()
                    if not s_name:
                        continue
                    s_active = s.get('is_active', s.get('isActive', True))
                    if s_id and not str(s_id).startswith('temp-'):
                        Subcategory.objects.filter(id=s_id, category=instance).update(
                            name=s_name,
                            is_active=s_active
                        )
                    else:
                        base_slug = slugify(s_name)
                        slug = base_slug
                        counter = 1
                        while Subcategory.objects.filter(slug=slug).exists():
                            slug = f"{base_slug}-{counter}"
                            counter += 1
                        Subcategory.objects.create(
                            category=instance,
                            name=s_name,
                            slug=slug,
                            is_active=s_active
                        )
        return instance


class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = [
            'id',
            'image',
            'is_primary',
        ]


class VariantImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = VariantImage
        fields = [
            'id',
            'image',
            'is_primary',
        ]


class ProductVariantSerializer(serializers.ModelSerializer):
    images = VariantImageSerializer(many=True, read_only=True)

    class Meta:
        model = ProductVariant
        fields = [
            'id',
            'color_name',
            'color_code',
            'price',
            'discount_price',
            'stock',
            'sizes',
            'is_active',
            'images',
        ]


class ProductSerializer(serializers.ModelSerializer):
    images = ProductImageSerializer(
        many=True,
        read_only=True
    )

    variants = ProductVariantSerializer(
        many=True,
        read_only=True
    )

    category_name = serializers.CharField(
        source='category.name',
        read_only=True,
        default=''
    )

    category_slug = serializers.CharField(
        source='category.slug',
        read_only=True,
        default=''
    )

    subcategory_name = serializers.CharField(
        source='subcategory.name',
        read_only=True,
        default=''
    )

    subcategory_slug = serializers.CharField(
        source='subcategory.slug',
        read_only=True,
        default=''
    )

    class Meta:
        model = Product
        fields = [
            'id',
            'name',
            'description',
            'category',
            'category_name',
            'category_slug',
            'subcategory',
            'subcategory_name',
            'subcategory_slug',
            'price',
            'discount_price',
            'stock',
            'is_active',
            'images',
            'variants',
            'created_at',
            'updated_at',
        ]


class BannerSerializer(serializers.ModelSerializer):
    media_type = serializers.SerializerMethodField()

    class Meta:
        model = Banner
        fields = [
            'id',
            'title',
            'subtitle',
            'image',
            'media_type',
            'button_text',
            'button_link',
            'display_order',
            'is_active',
            'created_at',
            'updated_at',
        ]
        extra_kwargs = {
            'image': {'required': False, 'allow_null': True},
            'title': {'required': False, 'allow_blank': True},
            'subtitle': {'required': False, 'allow_blank': True},
            'button_text': {'required': False, 'allow_blank': True},
            'button_link': {'required': False, 'allow_blank': True},
        }

    def get_media_type(self, obj):
        if not obj.image:
            return 'image'
        name = str(obj.image.name or '').lower()
        if any(name.endswith(ext) for ext in ['.mp4', '.webm', '.mov', '.ogg', '.m4v', '.ogv']):
            return 'video'
        return 'image'


class ReviewSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True, default='')
    product_id = serializers.IntegerField(required=False, write_only=True, allow_null=True)
    order_id = serializers.IntegerField(required=False, write_only=True, allow_null=True)

    class Meta:
        model = Review
        fields = [
            'id',
            'product',
            'product_id',
            'product_name',
            'order',
            'order_id',
            'name',
            'email',
            'rating',
            'image',
            'text',
            'is_verified',
            'status',
            'is_active',
            'created_at',
        ]
        extra_kwargs = {
            'product': {'required': False, 'allow_null': True},
            'order': {'required': False, 'allow_null': True},
            'name': {'required': False, 'allow_blank': True},
            'email': {'required': False, 'allow_null': True, 'allow_blank': True},
            'image': {'required': False, 'allow_null': True},
            'is_verified': {'required': False},
            'status': {'required': False},
            'is_active': {'required': False},
        }


class OrderItemCreateSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    variant_id = serializers.IntegerField(required=False, allow_null=True)
    color_name = serializers.CharField(max_length=100, required=False, allow_null=True, allow_blank=True)
    size = serializers.CharField(max_length=50, required=False, allow_null=True, allow_blank=True)
    quantity = serializers.IntegerField(min_value=1)


class OrderCreateSerializer(serializers.Serializer):
    shipping_name = serializers.CharField(max_length=255)
    shipping_phone = serializers.CharField(max_length=20)
    shipping_address = serializers.CharField()
    shipping_city = serializers.CharField(max_length=100)
    shipping_pincode = serializers.CharField(max_length=20)
    payment_method = serializers.CharField(max_length=50, required=False, default='razorpay', allow_blank=True)
    items = OrderItemCreateSerializer(many=True)

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError("Order must contain at least one item.")
        for item in value:
            try:
                prod = Product.objects.get(id=item['product_id'])
                if not prod.is_active:
                    raise serializers.ValidationError(f"Product '{prod.name}' is currently unavailable for sale.")

                variant_id = item.get('variant_id')
                if variant_id:
                    try:
                        variant = ProductVariant.objects.get(id=variant_id, product=prod)
                        if not variant.is_active:
                            raise serializers.ValidationError(f"Variant '{variant.color_name}' of '{prod.name}' is currently unavailable.")
                        if variant.stock < item['quantity']:
                            raise serializers.ValidationError(f"Insufficient stock for variant '{variant.color_name}' (available: {variant.stock}, requested: {item['quantity']}).")
                    except ProductVariant.DoesNotExist:
                        raise serializers.ValidationError(f"Variant with id {variant_id} does not exist for product '{prod.name}'.")
                else:
                    if prod.stock < item['quantity']:
                        raise serializers.ValidationError(f"Insufficient stock for product '{prod.name}' (available: {prod.stock}, requested: {item['quantity']}).")
            except Product.DoesNotExist:
                raise serializers.ValidationError(f"Product with id {item['product_id']} does not exist.")
        return value

    def validate(self, attrs):
        payment_method = str(attrs.get('payment_method', '')).strip().lower()
        if payment_method in ['cod', 'cash on delivery', 'cash_on_delivery', 'cash']:
            from .models import StoreSettings
            settings_obj, _ = StoreSettings.objects.get_or_create(id=1)
            if not (settings_obj.cod_available and settings_obj.cod_enabled):
                raise serializers.ValidationError({"error": "Cash on Delivery is currently unavailable."})
        return attrs