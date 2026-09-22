import re
from rest_framework import serializers

from banners.models import Banner
from categories.models import Category, Subcategory
from products.models import Product, ProductImage, ProductVariant, Review, VariantImage, FeaturedProduct
from .models import Address


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
    video = serializers.SerializerMethodField()

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
            'video',
        ]

    def get_video(self, obj):
        if obj.video:
            req = self.context.get('request')
            return req.build_absolute_uri(obj.video.url) if req else obj.video.url
        return None


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

    image = serializers.SerializerMethodField()
    primary_image = serializers.SerializerMethodField()
    video = serializers.SerializerMethodField()
    media = serializers.SerializerMethodField()
    rating = serializers.SerializerMethodField()
    average_rating = serializers.SerializerMethodField()
    review_count = serializers.SerializerMethodField()
    original_price = serializers.SerializerMethodField()

    def get_image(self, obj):
        for v in obj.variants.all():
            v_img = v.images.filter(is_primary=True).first() or v.images.first()
            if v_img and v_img.image:
                req = self.context.get('request')
                return req.build_absolute_uri(v_img.image.url) if req else v_img.image.url
        prim = obj.images.filter(is_primary=True).first() or obj.images.first()
        if prim and prim.image:
            req = self.context.get('request')
            return req.build_absolute_uri(prim.image.url) if req else prim.image.url
        return None

    def get_primary_image(self, obj):
        return self.get_image(obj)

    def get_video(self, obj):
        if obj.video:
            req = self.context.get('request')
            return req.build_absolute_uri(obj.video.url) if req else obj.video.url
        return None

    def get_media(self, obj):
        items = []
        req = self.context.get('request')
        for img in obj.images.all():
            if img.image:
                url = req.build_absolute_uri(img.image.url) if req else img.image.url
                items.append({
                    'id': img.id,
                    'type': 'IMAGE',
                    'url': url,
                    'is_primary': img.is_primary,
                })
        if obj.video:
            url = req.build_absolute_uri(obj.video.url) if req else obj.video.url
            items.append({
                'id': f'video-{obj.id}',
                'type': 'VIDEO',
                'url': url,
                'is_primary': False,
            })
        return items

    def get_rating(self, obj):
        return obj.average_rating

    def get_average_rating(self, obj):
        return obj.average_rating

    def get_review_count(self, obj):
        return obj.review_count

    def get_original_price(self, obj):
        if obj.original_price is not None and float(obj.original_price) > float(obj.price):
            return float(obj.original_price)
        if obj.discount_price is not None and 0 < float(obj.discount_price) < float(obj.price):
            return float(obj.price)
        return None

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
            'original_price',
            'discount_price',
            'shipping_charge',
            'stock',
            'is_active',
            'image',
            'primary_image',
            'video',
            'media',
            'rating',
            'average_rating',
            'review_count',
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


class AddressSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source='full_name', required=False)
    phone = serializers.CharField(source='mobile_number', required=False)
    flat = serializers.CharField(source='address_line_1', required=False)
    area = serializers.CharField(source='address_line_2', required=False, allow_blank=True, allow_null=True)
    type = serializers.CharField(source='address_type', required=False)
    isDefault = serializers.BooleanField(source='is_default', required=False)

    class Meta:
        model = Address
        fields = [
            'id',
            'full_name',
            'name',
            'mobile_number',
            'phone',
            'alternate_mobile_number',
            'address_line_1',
            'flat',
            'address_line_2',
            'area',
            'landmark',
            'city',
            'district',
            'state',
            'pincode',
            'address_type',
            'type',
            'is_default',
            'isDefault',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def to_internal_value(self, data):
        data = data.copy() if hasattr(data, 'copy') else dict(data)
        if 'name' in data and 'full_name' not in data:
            data['full_name'] = data['name']
        if 'phone' in data and 'mobile_number' not in data:
            data['mobile_number'] = data['phone']
        if 'flat' in data and 'address_line_1' not in data:
            data['address_line_1'] = data['flat']
        if 'area' in data and 'address_line_2' not in data:
            data['address_line_2'] = data['area']
        if 'type' in data and 'address_type' not in data:
            data['address_type'] = data['type']
        if 'isDefault' in data and 'is_default' not in data:
            data['is_default'] = data['isDefault']
        return super().to_internal_value(data)

    def validate_full_name(self, value):
        val = str(value or '').strip()
        if not val:
            raise serializers.ValidationError("Full Name is required.")
        return val

    def validate_mobile_number(self, value):
        val = re.sub(r'\D', '', str(value or ''))
        if len(val) != 10:
            raise serializers.ValidationError("Please enter a valid 10-digit mobile number.")
        return val

    def validate_alternate_mobile_number(self, value):
        if not value:
            return ''
        val = re.sub(r'\D', '', str(value or ''))
        if val and len(val) != 10:
            raise serializers.ValidationError("Alternate mobile number must be a valid 10-digit number.")
        return val

    def validate_address_line_1(self, value):
        val = str(value or '').strip()
        if not val:
            raise serializers.ValidationError("Address line 1 (House / Flat / Building) is required.")
        return val

    def validate_city(self, value):
        val = str(value or '').strip()
        if not val:
            raise serializers.ValidationError("City is required.")
        return val

    def validate_district(self, value):
        val = str(value or '').strip()
        return val

    def validate_state(self, value):
        val = str(value or '').strip()
        if not val:
            raise serializers.ValidationError("State is required.")
        return val

    def validate_pincode(self, value):
        val = re.sub(r'\D', '', str(value or ''))
        if len(val) != 6:
            raise serializers.ValidationError("Pincode must be a 6-digit number.")
        return val

    def validate_address_type(self, value):
        val = str(value or 'Home').strip().capitalize()
        if val not in ['Home', 'Work', 'Other']:
            val = 'Home'
        return val

    def validate(self, attrs):
        if not attrs.get('district') and attrs.get('city'):
            attrs['district'] = attrs['city']
        return attrs


class OrderItemCreateSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    variant_id = serializers.IntegerField(required=False, allow_null=True)
    color_name = serializers.CharField(max_length=100, required=False, allow_null=True, allow_blank=True)
    size = serializers.CharField(max_length=50, required=False, allow_null=True, allow_blank=True)
    quantity = serializers.IntegerField(min_value=1)


class OrderCreateSerializer(serializers.Serializer):
    shipping_name = serializers.CharField(max_length=255)
    shipping_phone = serializers.CharField(max_length=20)
    shipping_address = serializers.CharField(required=False, allow_blank=True, default='')
    shipping_address_line_1 = serializers.CharField(required=False, allow_blank=True, default='')
    shipping_address_line_2 = serializers.CharField(required=False, allow_blank=True, default='')
    shipping_landmark = serializers.CharField(required=False, allow_blank=True, default='')
    shipping_city = serializers.CharField(max_length=100)
    shipping_district = serializers.CharField(max_length=100, required=False, allow_blank=True, default='')
    shipping_state = serializers.CharField(max_length=100, required=False, allow_blank=True, default='')
    shipping_pincode = serializers.CharField(max_length=20)
    shipping_address_type = serializers.CharField(max_length=50, required=False, allow_blank=True, default='Home')
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
        # Ensure shipping_address is filled from line 1 / line 2 if not given
        if not attrs.get('shipping_address'):
            line1 = attrs.get('shipping_address_line_1', '').strip()
            line2 = attrs.get('shipping_address_line_2', '').strip()
            landmark = attrs.get('shipping_landmark', '').strip()
            parts = [p for p in [line1, line2, landmark] if p]
            attrs['shipping_address'] = ', '.join(parts) if parts else attrs.get('shipping_city', '')

        if not attrs.get('shipping_address_line_1'):
            attrs['shipping_address_line_1'] = attrs.get('shipping_address', '')

        if not attrs.get('shipping_district'):
            attrs['shipping_district'] = attrs.get('shipping_city', '')

        payment_method = str(attrs.get('payment_method', '')).strip().lower()
        if payment_method in ['cod', 'cash on delivery', 'cash_on_delivery', 'cash']:
            from .models import StoreSettings
            settings_obj, _ = StoreSettings.objects.get_or_create(id=1)
            if not (settings_obj.cod_available and settings_obj.cod_enabled):
                raise serializers.ValidationError({"error": "Cash on Delivery is currently unavailable."})
        return attrs


def safe_build_uri(req, url):
    if not url:
        return None
    if req:
        try:
            return req.build_absolute_uri(url)
        except Exception:
            return url
    return url


class FeaturedProductVariantImageSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = VariantImage
        fields = ['id', 'image', 'url', 'is_primary']

    def get_url(self, obj):
        if obj.image:
            return safe_build_uri(self.context.get('request'), obj.image.url)
        return ''


class FeaturedProductVariantSerializer(serializers.ModelSerializer):
    images = FeaturedProductVariantImageSerializer(many=True, read_only=True)

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


class FeaturedProductProductSummarySerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()
    variants = FeaturedProductVariantSerializer(many=True, read_only=True)
    rating = serializers.SerializerMethodField()
    average_rating = serializers.SerializerMethodField()
    review_count = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id',
            'name',
            'description',
            'price',
            'original_price',
            'discount_price',
            'shipping_charge',
            'stock',
            'is_active',
            'image',
            'rating',
            'average_rating',
            'review_count',
            'variants',
        ]

    def get_rating(self, obj):
        return obj.average_rating

    def get_average_rating(self, obj):
        return obj.average_rating

    def get_review_count(self, obj):
        return obj.review_count

    def get_image(self, obj):
        req = self.context.get('request')
        for v in obj.variants.all():
            v_img = v.images.filter(is_primary=True).first() or v.images.first()
            if v_img and v_img.image:
                return safe_build_uri(req, v_img.image.url)
        prim = obj.images.filter(is_primary=True).first() or obj.images.first()
        if prim and prim.image:
            return safe_build_uri(req, prim.image.url)
        return None


class FeaturedProductSerializer(serializers.ModelSerializer):
    product = FeaturedProductProductSummarySerializer(read_only=True)
    feature_type_display = serializers.CharField(source='get_feature_type_display', read_only=True)
    showcase_image = serializers.SerializerMethodField()
    display_image = serializers.SerializerMethodField()

    class Meta:
        model = FeaturedProduct
        fields = [
            'id',
            'product',
            'feature_type',
            'feature_type_display',
            'display_image',
            'showcase_image',
            'badge_text',
            'sort_order',
            'is_active',
            'start_date',
            'end_date',
            'created_at',
            'updated_at',
        ]

    def get_display_image(self, obj):
        if obj.display_image:
            return safe_build_uri(self.context.get('request'), obj.display_image.url)
        return None

    def get_showcase_image(self, obj):
        if obj.display_image:
            return safe_build_uri(self.context.get('request'), obj.display_image.url)
        summary_ser = FeaturedProductProductSummarySerializer(obj.product, context=self.context)
        return summary_ser.get_image(obj.product)


class FeaturedProductAdminSerializer(serializers.ModelSerializer):
    product = FeaturedProductProductSummarySerializer(read_only=True)
    product_id = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.all(),
        source='product',
        write_only=True,
        required=False,
        allow_null=True
    )
    feature_type_display = serializers.CharField(source='get_feature_type_display', read_only=True)
    showcase_image = serializers.SerializerMethodField()

    class Meta:
        model = FeaturedProduct
        fields = [
            'id',
            'product',
            'product_id',
            'feature_type',
            'feature_type_display',
            'display_image',
            'showcase_image',
            'badge_text',
            'sort_order',
            'is_active',
            'start_date',
            'end_date',
            'created_at',
            'updated_at',
        ]

    def get_showcase_image(self, obj):
        if obj.display_image:
            return safe_build_uri(self.context.get('request'), obj.display_image.url)
        summary_ser = FeaturedProductProductSummarySerializer(obj.product, context=self.context)
        return summary_ser.get_image(obj.product)

    def validate(self, attrs):
        product = attrs.get('product') or (self.instance.product if self.instance else None)
        feature_type = attrs.get('feature_type') or (self.instance.feature_type if self.instance else None)

        if product and feature_type:
            qs = FeaturedProduct.objects.filter(product=product, feature_type=feature_type)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError({
                    'product_id': f"Product '{product.name}' is already featured under '{dict(FeaturedProduct.FEATURE_TYPES).get(feature_type, feature_type)}'."
                })

        start_date = attrs.get('start_date') if 'start_date' in attrs else (self.instance.start_date if self.instance else None)
        end_date = attrs.get('end_date') if 'end_date' in attrs else (self.instance.end_date if self.instance else None)

        if start_date and end_date and end_date <= start_date:
            raise serializers.ValidationError({
                'end_date': 'End time must be later than start time.'
            })

        return attrs
