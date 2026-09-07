from django.contrib import admin
from .models import Banner


@admin.register(Banner)
class BannerAdmin(admin.ModelAdmin):
    list_display = (
        'title',
        'display_order',
        'is_active',
        'created_at',
        'updated_at',
    )

    list_filter = (
        'is_active',
    )

    search_fields = (
        'title',
        'subtitle',
    )

    ordering = (
        'display_order',
        '-created_at',
    )

    def changelist_view(self, request, extra_context=None):
        extra_context = extra_context or {}
        total = Banner.objects.count()
        active = Banner.objects.filter(is_active=True).count()
        extra_context['total_banners_count'] = total
        extra_context['active_banners_count'] = active
        extra_context['inactive_banners_count'] = total - active
        return super().changelist_view(request, extra_context=extra_context)