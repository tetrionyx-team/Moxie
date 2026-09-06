from django.contrib import admin

from .models import Product, ProductImage, Review


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1
    max_num = 3



@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = (
        'name',
        'category',
        'subcategory',
        'price',
        'discount_price',
        'stock',
        'is_active',
        'created_at',
    )

    def changelist_view(self, request, extra_context=None):
        extra_context = extra_context or {}
        products = Product.objects.all()
        extra_context['total_products_count'] = products.count()
        extra_context['active_products_count'] = products.filter(is_active=True).count()
        extra_context['out_of_stock_count'] = products.filter(stock=0).count()
        extra_context['total_inventory_value'] = sum(p.price * p.stock for p in products)
        return super().changelist_view(request, extra_context=extra_context)

    def changeform_view(self, request, object_id=None, form_url='', extra_context=None):
        extra_context = extra_context or {}
        import json
        from categories.models import Category, Subcategory
        from django.core.serializers.json import DjangoJSONEncoder

        cats = list(Category.objects.all().order_by('name').values('id', 'name', 'slug', 'is_active'))
        subs = list(Subcategory.objects.all().order_by('name').values('id', 'name', 'slug', 'category_id', 'is_active'))
        for s in subs:
            s['categoryId'] = s['category_id']

        extra_context['categories_json'] = json.dumps(cats, cls=DjangoJSONEncoder)
        extra_context['subcategories_json'] = json.dumps(subs, cls=DjangoJSONEncoder)

        if object_id:
            try:
                obj = self.get_object(request, object_id)
                if obj:
                    initial_data = {
                        'name': obj.name,
                        'category': obj.category_id,
                        'subcategory': obj.subcategory_id,
                        'description': obj.description,
                        'price': str(obj.price),
                        'discount_price': str(obj.discount_price) if obj.discount_price else '',
                        'stock': obj.stock,
                    }
                    extra_context['initial_data_json'] = json.dumps(initial_data, cls=DjangoJSONEncoder)

                    variants = []
                    for v in obj.variants.all():
                        images = [{'id': img.id, 'url': img.image.url, 'is_primary': img.is_primary} for img in v.images.all()]
                        variants.append({
                            'id': v.id,
                            'color_name': v.color_name,
                            'color_code': v.color_code,
                            'price': str(v.price),
                            'discount_price': str(v.discount_price) if v.discount_price else '',
                            'stock': v.stock,
                            'sizes': v.sizes if isinstance(v.sizes, list) else [],
                            'is_active': v.is_active,
                            'images': images,
                            'existing_images': images,
                        })
                    extra_context['existing_variants_json'] = json.dumps(variants, cls=DjangoJSONEncoder)
            except Exception:
                pass

        return super().changeform_view(request, object_id=object_id, form_url=form_url, extra_context=extra_context)

    list_filter = (
        'category',
        'subcategory',
        'is_active',
    )

    search_fields = (
        'name',
        'description',
    )

    inlines = []

    def save_related(self, request, form, formsets, change):
        super().save_related(request, form, formsets, change)
        product = form.instance
        import json
        from .models import ProductVariant, VariantImage, ProductImage

        variant_payload = request.POST.get('variant_payload_json')
        if variant_payload:
            try:
                variants_data = json.loads(variant_payload)
                if isinstance(variants_data, list):
                    submitted_variant_ids = []

                    for v_idx, v_data in enumerate(variants_data):
                        v_id = v_data.get('id')
                        price_val = v_data.get('price') or product.price or 0
                        disc_val = v_data.get('discount_price') or None
                        if disc_val == '':
                            disc_val = None
                        stock_val = int(v_data.get('stock') or 0)
                        sizes_val = v_data.get('sizes') or []

                        if v_id and str(v_id).isdigit():
                            try:
                                variant_obj = ProductVariant.objects.get(id=int(v_id), product=product)
                                variant_obj.color_name = v_data.get('color_name') or 'Default'
                                variant_obj.color_code = v_data.get('color_code') or '#000000'
                                variant_obj.price = price_val
                                variant_obj.discount_price = disc_val
                                variant_obj.stock = stock_val
                                variant_obj.sizes = sizes_val
                                variant_obj.is_active = bool(v_data.get('is_active', True))
                                variant_obj.save()
                            except ProductVariant.DoesNotExist:
                                variant_obj = ProductVariant.objects.create(
                                    product=product,
                                    color_name=v_data.get('color_name') or 'Default',
                                    color_code=v_data.get('color_code') or '#000000',
                                    price=price_val,
                                    discount_price=disc_val,
                                    stock=stock_val,
                                    sizes=sizes_val,
                                    is_active=bool(v_data.get('is_active', True))
                                )
                        else:
                            variant_obj = ProductVariant.objects.create(
                                product=product,
                                color_name=v_data.get('color_name') or 'Default',
                                color_code=v_data.get('color_code') or '#000000',
                                price=price_val,
                                discount_price=disc_val,
                                stock=stock_val,
                                sizes=sizes_val,
                                is_active=bool(v_data.get('is_active', True))
                            )

                        submitted_variant_ids.append(variant_obj.id)

                        # Handle deleted images
                        deleted_img_ids = v_data.get('deleted_image_ids') or []
                        if deleted_img_ids:
                            VariantImage.objects.filter(variant=variant_obj, id__in=deleted_img_ids).delete()

                        primary_img_id = v_data.get('primary_image_id')
                        primary_img_index = v_data.get('primary_image_index', 0)

                        # Save new uploaded images
                        uploaded_files = []
                        f_idx = 0
                        while True:
                            key = f"variant_img_{v_idx}_{f_idx}"
                            if key in request.FILES:
                                uploaded_files.append(request.FILES[key])
                                f_idx += 1
                            else:
                                break

                        for u_idx, up_file in enumerate(uploaded_files):
                            is_prim = (not primary_img_id and primary_img_index == u_idx) or (u_idx == 0 and not variant_obj.images.filter(is_primary=True).exists())
                            VariantImage.objects.create(
                                variant=variant_obj,
                                image=up_file,
                                is_primary=is_prim
                            )
                            if not ProductImage.objects.filter(product=product).exists() or is_prim:
                                ProductImage.objects.create(
                                    product=product,
                                    image=up_file,
                                    is_primary=is_prim
                                )

                    if change and submitted_variant_ids:
                        ProductVariant.objects.filter(product=product).exclude(id__in=submitted_variant_ids).delete()

            except Exception as e:
                import logging
                logging.getLogger(__name__).error(f"Error saving product variants: {e}")


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = (
        'name',
        'rating',
        'is_active',
        'created_at',
    )

    list_filter = (
        'rating',
        'is_active',
    )

    search_fields = (
        'name',
        'text',
    )

