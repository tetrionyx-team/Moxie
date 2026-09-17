from django.contrib import admin
from .permissions_utils import StaffPermissionAdminMixin
from .models import Order, OrderItem

class OrderItemInline(StaffPermissionAdminMixin, admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ('product', 'quantity', 'price')
    required_module = 'orders'

@admin.register(Order)
class OrderAdmin(StaffPermissionAdminMixin, admin.ModelAdmin):
    required_module = 'orders'
    list_display = ('id', 'shipping_name', 'total_amount', 'payment_status', 'razorpay_order_id', 'created_at')
    list_filter = ('payment_status', 'created_at')
    search_fields = ('shipping_name', 'shipping_phone', 'razorpay_order_id', 'razorpay_payment_id')
    inlines = [OrderItemInline]
    readonly_fields = ('razorpay_order_id', 'razorpay_payment_id', 'razorpay_signature')
