from django.contrib import admin
from api.permissions_utils import StaffPermissionAdminMixin
from .models import Category, Subcategory


class SubcategoryInline(StaffPermissionAdminMixin, admin.TabularInline):
    model = Subcategory
    extra = 1
    prepopulated_fields = {'slug': ('name',)}
    required_module = 'categories'


@admin.register(Category)
class CategoryAdmin(StaffPermissionAdminMixin, admin.ModelAdmin):
    required_module = 'categories'
    list_display = (
        'name',
        'slug',
        'is_active',
        'created_at',
        'updated_at',
    )

    prepopulated_fields = {'slug': ('name',)}

    list_filter = (
        'is_active',
    )

    search_fields = (
        'name',
        'description',
    )

    inlines = [SubcategoryInline]


@admin.register(Subcategory)
class SubcategoryAdmin(StaffPermissionAdminMixin, admin.ModelAdmin):
    required_module = 'categories'
    list_display = (
        'name',
        'slug',
        'category',
        'is_active',
        'created_at',
    )

    prepopulated_fields = {'slug': ('name',)}

    list_filter = (
        'category',
        'is_active',
    )

    search_fields = (
        'name',
        'description',
    )