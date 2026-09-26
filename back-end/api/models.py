from django.db import models
from django.contrib.auth.models import User
from products.models import Product, ProductVariant, Review
from categories.models import Category


class Address(models.Model):
    ADDRESS_TYPES = (
        ('Home', 'Home'),
        ('Work', 'Work'),
        ('Other', 'Other'),
    )

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='addresses')
    full_name = models.CharField(max_length=255)
    mobile_number = models.CharField(max_length=20)
    alternate_mobile_number = models.CharField(max_length=20, blank=True, null=True)
    address_line_1 = models.TextField()
    address_line_2 = models.CharField(max_length=255, blank=True, null=True)
    landmark = models.CharField(max_length=255, blank=True, null=True)
    city = models.CharField(max_length=100)
    district = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    pincode = models.CharField(max_length=20)
    address_type = models.CharField(max_length=20, choices=ADDRESS_TYPES, default='Home')
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-is_default', '-created_at']

    def save(self, *args, **kwargs):
        # If user has no other saved addresses, make this first one default
        if self.user_id:
            existing_count = Address.objects.filter(user_id=self.user_id).exclude(pk=self.pk).count()
            if existing_count == 0:
                self.is_default = True

        super().save(*args, **kwargs)

        # If this address is default, ensure all other addresses for this user are not default
        if self.is_default and self.user_id:
            Address.objects.filter(user_id=self.user_id).exclude(pk=self.pk).update(is_default=False)

    def __str__(self):
        return f"{self.full_name} - {self.address_type} ({self.user.username})"


class Order(models.Model):
    STATUS_CHOICES = (
        ('Pending', 'Pending'),
        ('Paid', 'Paid'),
        ('Partially Paid', 'Partially Paid'),
        ('Failed', 'Failed'),
        ('Refunded', 'Refunded'),
    )

    ORDER_STATUS_CHOICES = (
        ('Pending', 'Pending'),
        ('Confirmed', 'Confirmed'),
        ('Processing', 'Processing'),
        ('Packed', 'Packed'),
        ('Shipped', 'Shipped'),
        ('Out for Delivery', 'Out for Delivery'),
        ('Delivered', 'Delivered'),
        ('Cancelled', 'Cancelled'),
        ('Returned', 'Returned'),
    )

    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    shipping_name = models.CharField(max_length=255)
    shipping_phone = models.CharField(max_length=20)
    shipping_address = models.TextField()
    shipping_address_line_1 = models.TextField(blank=True, default='')
    shipping_address_line_2 = models.CharField(max_length=255, blank=True, default='')
    shipping_landmark = models.CharField(max_length=255, blank=True, default='')
    shipping_city = models.CharField(max_length=100)
    shipping_district = models.CharField(max_length=100, blank=True, default='')
    shipping_state = models.CharField(max_length=100, blank=True, default='')
    shipping_pincode = models.CharField(max_length=20)
    shipping_address_type = models.CharField(max_length=50, blank=True, default='Home')

    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    subtotal_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)
    shipping_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)
    shipping_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)
    balance_due = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)
    cod_advance_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)
    cod_advance_paid = models.BooleanField(default=False)
    payment_method = models.CharField(max_length=50, default='UPI')
    tax_type = models.CharField(max_length=50, default='GST', blank=True, null=True)
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0.0)
    tax_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)
    tax_included = models.BooleanField(default=False)
    payment_status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Pending')
    order_status = models.CharField(max_length=30, choices=ORDER_STATUS_CHOICES, default='Pending')

    # Courier & Tracking Information
    TRACKING_SOURCE_CHOICES = (
        ('ADMIN', 'Manual Admin'),
        ('CARRIER_API', 'Carrier API'),
    )
    COURIER_CHOICES = (
        ('ST_COURIER', 'ST Courier'),
        ('INDIA_POST', 'India Post'),
    )

    courier_name = models.CharField(max_length=100, blank=True, default='')
    tracking_id = models.CharField(max_length=100, blank=True, default='', db_index=True)
    shipping_status = models.CharField(max_length=50, blank=True, default='CONFIRMED')
    tracking_source = models.CharField(max_length=30, choices=TRACKING_SOURCE_CHOICES, default='ADMIN')
    carrier_status_raw = models.CharField(max_length=255, blank=True, default='')
    tracking_location = models.CharField(max_length=255, blank=True, default='')
    estimated_delivery = models.CharField(max_length=100, blank=True, default='')
    shipped_at = models.DateTimeField(null=True, blank=True)
    out_for_delivery_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    tracking_updated_at = models.DateTimeField(null=True, blank=True)
    tracking_locked = models.BooleanField(default=False)
    tracking_assigned_at = models.DateTimeField(null=True, blank=True)
    tracking_receipt = models.ImageField(upload_to='tracking_receipts/', null=True, blank=True)

    razorpay_order_id = models.CharField(max_length=255, unique=True)
    razorpay_payment_id = models.CharField(max_length=255, null=True, blank=True)
    razorpay_signature = models.CharField(max_length=255, null=True, blank=True)
    order_number = models.CharField(max_length=50, null=True, blank=True, db_index=True)
    stock_decremented = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Order {self.id} - {self.shipping_name} ({self.payment_status})"


class OrderStatusHistory(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='status_history')
    status = models.CharField(max_length=50)
    location = models.CharField(max_length=255, blank=True, default='')
    message = models.TextField(blank=True, default='')
    source = models.CharField(max_length=50, default='ADMIN')  # ADMIN, ST_COURIER, INDIA_POST, SYSTEM
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Order #{self.order_id} - {self.status} ({self.created_at})"


class NotificationLog(models.Model):
    CHANNELS = (
        ('WHATSAPP', 'WhatsApp'),
        ('EMAIL', 'Email'),
        ('SMS', 'SMS'),
    )
    STATUSES = (
        ('PENDING', 'Pending'),
        ('SENT', 'Sent'),
        ('FAILED', 'Failed'),
    )
    MESSAGE_TYPES = (
        ('ORDER_CONFIRMED', 'Order Confirmed'),
        ('SHIPPED', 'Order Shipped'),
        ('OUT_FOR_DELIVERY', 'Out for Delivery'),
        ('DELIVERED', 'Order Delivered'),
        ('CANCELLED', 'Order Cancelled'),
    )

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='notification_logs', null=True, blank=True)
    customer = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='notification_logs')
    channel = models.CharField(max_length=20, choices=CHANNELS, default='WHATSAPP')
    message_type = models.CharField(max_length=50, choices=MESSAGE_TYPES)
    recipient = models.CharField(max_length=50)  # e.g. 919876543210
    status = models.CharField(max_length=20, choices=STATUSES, default='PENDING')
    provider_message_id = models.CharField(max_length=255, blank=True, default='')
    idempotency_key = models.CharField(max_length=255, unique=True, db_index=True)
    payload_summary = models.TextField(blank=True, default='')
    error_code = models.CharField(max_length=100, blank=True, default='')
    error_message = models.TextField(blank=True, default='')
    retry_count = models.PositiveIntegerField(default=0)
    sent_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.channel} {self.message_type} -> {self.recipient} ({self.status})"


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True, blank=True)
    variant = models.ForeignKey(ProductVariant, on_delete=models.SET_NULL, null=True, blank=True)
    product_name = models.CharField(max_length=255, blank=True, default='')
    product_image = models.CharField(max_length=500, blank=True, default='')
    color_name = models.CharField(max_length=100, null=True, blank=True)
    size = models.CharField(max_length=50, null=True, blank=True)
    quantity = models.PositiveIntegerField(default=1)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    original_price = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)
    shipping_charge = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)

    def __str__(self):
        name = self.product_name or (self.product.name if self.product else "Unknown Product")
        return f"{self.quantity} x {name} (Order {self.order.id})"


class CustomerProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='customer_profile')
    mobile = models.CharField(max_length=20, null=True, blank=True)
    google_sub = models.CharField(max_length=255, null=True, blank=True)
    avatar = models.TextField(null=True, blank=True)
    profile_image = models.ImageField(upload_to='customer/profiles/', null=True, blank=True)

    def __str__(self):
        return f"CustomerProfile: {self.user.username}"


class AdminProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='admin_profile')
    role = models.CharField(max_length=100, default='Staff')
    permissions = models.JSONField(default=list, blank=True)
    phone = models.CharField(max_length=50, null=True, blank=True)
    profile_image = models.ImageField(upload_to='admin/profiles/', null=True, blank=True)

    def __str__(self):
        return f"AdminProfile: {self.user.username} ({self.role})"


class StoreSettings(models.Model):
    store_name = models.CharField(max_length=200, default='Moxie')
    store_email = models.EmailField(default='support@moxie.com')
    store_phone = models.CharField(max_length=50, default='+91 9876543210')
    store_address = models.TextField(default='123 Moxie Studio, Tech Park, Chennai, Tamil Nadu')
    store_description = models.TextField(default='Moxie E-Commerce - Premium Lifestyle & Fashion Products')
    website_url = models.URLField(default='https://moxie.com')
    currency = models.CharField(max_length=10, default='INR')
    timezone = models.CharField(max_length=50, default='Asia/Kolkata')
    store_status = models.CharField(max_length=20, default='Open', choices=[('Open', 'Open'), ('Maintenance', 'Maintenance')])
    allow_registration = models.BooleanField(default=True)
    allow_guest_browsing = models.BooleanField(default=True)
    require_login_before_checkout = models.BooleanField(default=False)
    allow_reviews = models.BooleanField(default=True)
    allow_wishlist = models.BooleanField(default=True)
    enable_product_search = models.BooleanField(default=True)
    order_prefix = models.CharField(max_length=20, default='MOX')
    min_order_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)
    max_order_amount = models.DecimalField(max_digits=10, decimal_places=2, default=100000.0)
    allow_order_cancellation = models.BooleanField(default=True)
    allow_returns = models.BooleanField(default=True)
    enable_shipping = models.BooleanField(default=True)
    free_shipping = models.BooleanField(default=True)
    free_shipping_min_amount = models.DecimalField(max_digits=10, decimal_places=2, default=999.0)
    default_shipping_charge = models.DecimalField(max_digits=10, decimal_places=2, default=100.0)
    processing_time = models.CharField(max_length=50, default='1-3 Days')
    delivery_estimate = models.CharField(max_length=50, default='3-7 Days')
    enable_tax = models.BooleanField(default=False)
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=18.0)
    tax_included = models.BooleanField(default=True)
    notify_order_created = models.BooleanField(default=True)
    notify_payment_success = models.BooleanField(default=True)
    notify_order_shipped = models.BooleanField(default=True)
    notify_order_delivered = models.BooleanField(default=True)
    allow_guest_checkout = models.BooleanField(default=True)
    allow_order_modification = models.BooleanField(default=False)
    auto_confirm_orders = models.BooleanField(default=True)
    cancellation_time_limit = models.CharField(max_length=50, default='24 Hours')
    city = models.CharField(max_length=100, default='Chennai')
    cod_available = models.BooleanField(default=True)
    cod_enabled = models.BooleanField(default=True)
    cod_advance_amount = models.DecimalField(max_digits=10, decimal_places=2, default=100.0)
    country = models.CharField(max_length=100, default='India')
    delivery_area = models.CharField(max_length=100, default='All India (Pan India)')
    email_notifications_enabled = models.BooleanField(default=True)
    enable_order_notifications = models.BooleanField(default=True)
    enable_order_tracking = models.BooleanField(default=True)
    enable_stock_management = models.BooleanField(default=True)
    express_delivery_days = models.CharField(max_length=50, default='1-2 Days')
    express_shipping_charge = models.DecimalField(max_digits=10, decimal_places=2, default=200.0)
    gst_number = models.CharField(max_length=50, default='33AAAAA0000A1Z5')
    low_stock_alert = models.BooleanField(default=True)
    maintenance_mode = models.BooleanField(default=False)
    min_stock_threshold = models.IntegerField(default=5)
    notify_low_stock = models.BooleanField(default=True)
    notify_new_customer = models.BooleanField(default=True)
    notify_order_cancelled = models.BooleanField(default=True)
    notify_order_confirmed = models.BooleanField(default=True)
    online_payment_enabled = models.BooleanField(default=True)
    order_auto_cancel_time = models.CharField(max_length=50, default='48 Hours')
    payment_currency = models.CharField(max_length=10, default='INR')
    payment_mode = models.CharField(max_length=20, default='Test')
    payment_timeout = models.CharField(max_length=50, default='15 Minutes')
    pincode = models.CharField(max_length=20, default='600001')
    razorpay_enabled = models.BooleanField(default=True)
    shipping_provider = models.CharField(max_length=100, default='Delhivery / Bluedart')
    smtp_from_email = models.CharField(max_length=200, default='noreply@moxie.com')
    smtp_host = models.CharField(max_length=200, default='smtp.gmail.com')
    smtp_port = models.IntegerField(default=587)
    smtp_user = models.CharField(max_length=200, default='support@moxie.com')
    state = models.CharField(max_length=100, default='Tamil Nadu')
    store_logo = models.ImageField(upload_to='settings/logos/', null=True, blank=True)
    tax_name = models.CharField(max_length=100, default='GST (Goods & Services Tax)')
    tax_type = models.CharField(max_length=50, default='GST')
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.store_name} Settings"


class Notification(models.Model):
    NOTIFICATION_TYPES = (
        ('registration', 'New Customer Registration'),
        ('login', 'Customer Login'),
        ('order', 'New Order'),
        ('order_status', 'Order Status Change'),
        ('review', 'New Product Review'),
        ('offer', 'Promotional Offer'),
        ('low_stock', 'Low Stock'),
        ('out_of_stock', 'Out of Stock'),
        ('product_created', 'Product Added'),
        ('product_updated', 'Product Updated'),
        ('contact_message', 'Customer Contact Message'),
        ('system', 'System Announcement'),
        ('admin_user_created', 'Admin User Created'),
        ('admin_user_updated', 'Admin User Updated'),
        ('admin_user_deleted', 'Admin User Deleted'),
    )

    title = models.CharField(max_length=255)
    sender = models.CharField(max_length=255, default='Website Customer')
    sender_initial = models.CharField(max_length=5, default='C')
    sender_color = models.CharField(max_length=20, default='#3b82f6')
    body = models.TextField()
    full_body = models.TextField(blank=True, null=True)
    recipients = models.CharField(max_length=100, default='Admin Team')
    department = models.CharField(max_length=100, default='Storefront')
    category_badge = models.CharField(max_length=100, default='Notification')
    notification_type = models.CharField(max_length=50, choices=NOTIFICATION_TYPES, default='system', blank=True)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='notifications')
    order = models.ForeignKey(Order, on_delete=models.SET_NULL, null=True, blank=True, related_name='notifications')
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True, blank=True, related_name='notifications')
    review = models.ForeignKey(Review, on_delete=models.SET_NULL, null=True, blank=True, related_name='notifications')
    target_url = models.CharField(max_length=255, null=True, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} ({'Read' if self.is_read else 'Unread'})"


class Offer(models.Model):
    DISCOUNT_TYPES = (
        ('Percentage', 'Percentage'),
        ('Fixed Amount', 'Fixed Amount'),
    )

    name = models.CharField(max_length=255)
    title = models.CharField(max_length=255, null=True, blank=True)
    emoji = models.CharField(max_length=20, blank=True, default='')
    description = models.TextField(blank=True, null=True)
    discount_type = models.CharField(max_length=20, choices=DISCOUNT_TYPES, default='Percentage')
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    start_datetime = models.DateTimeField(null=True, blank=True)
    end_datetime = models.DateTimeField(null=True, blank=True)
    applicable_categories = models.ManyToManyField(Category, blank=True, related_name='offers')
    applicable_products = models.ManyToManyField(Product, blank=True, related_name='offers')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class AdminPasswordResetOTP(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='admin_reset_otps')
    email = models.EmailField()
    otp_code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    attempts = models.IntegerField(default=0)
    used = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"OTP for {self.email}"


class AdminPasswordResetToken(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='admin_reset_tokens')
    token = models.CharField(max_length=128, unique=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    used = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"ResetToken for {self.user.username}"


class AdminLoginOTP(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='admin_login_otps')
    email = models.EmailField()
    otp_hash = models.CharField(max_length=128)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    attempts = models.IntegerField(default=0)
    resend_count = models.IntegerField(default=0)
    last_resend_at = models.DateTimeField(null=True, blank=True)
    used = models.BooleanField(default=False)
    is_locked = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"LoginOTP for {self.email} ({'Used' if self.used else 'Pending'})"


class CustomerPasswordResetOTP(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='customer_reset_otps')
    email = models.EmailField()
    otp_code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    attempts = models.IntegerField(default=0)
    used = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Customer OTP for {self.email}"


class CustomerPasswordResetToken(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='customer_reset_tokens')
    token = models.CharField(max_length=128, unique=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    used = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Customer ResetToken for {self.user.username}"


