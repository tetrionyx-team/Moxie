from django.db import models
from django.contrib.auth.models import User
from products.models import Product, ProductVariant, Review
from categories.models import Category


class Order(models.Model):
    STATUS_CHOICES = (
        ('Pending', 'Pending'),
        ('Paid', 'Paid'),
        ('Failed', 'Failed'),
        ('Refunded', 'Refunded'),
    )

    ORDER_STATUS_CHOICES = (
        ('Pending', 'Pending'),
        ('Confirmed', 'Confirmed'),
        ('Processing', 'Processing'),
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
    shipping_city = models.CharField(max_length=100)
    shipping_pincode = models.CharField(max_length=20)

    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    subtotal_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)
    shipping_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)
    tax_type = models.CharField(max_length=50, default='GST', blank=True, null=True)
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0.0)
    tax_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)
    tax_included = models.BooleanField(default=False)
    payment_status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Pending')
    order_status = models.CharField(max_length=30, choices=ORDER_STATUS_CHOICES, default='Pending')

    razorpay_order_id = models.CharField(max_length=255, unique=True)
    razorpay_payment_id = models.CharField(max_length=255, null=True, blank=True)
    razorpay_signature = models.CharField(max_length=255, null=True, blank=True)
    order_number = models.CharField(max_length=50, null=True, blank=True)
    stock_decremented = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Order {self.id} - {self.shipping_name} ({self.payment_status})"


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True, blank=True)
    variant = models.ForeignKey(ProductVariant, on_delete=models.SET_NULL, null=True, blank=True)
    color_name = models.CharField(max_length=100, null=True, blank=True)
    size = models.CharField(max_length=50, null=True, blank=True)
    quantity = models.PositiveIntegerField(default=1)
    price = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        name = self.product.name if self.product else "Unknown Product"
        return f"{self.quantity} x {name} (Order {self.order.id})"


class CustomerProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='customer_profile')
    mobile = models.CharField(max_length=20, null=True, blank=True)
    google_sub = models.CharField(max_length=255, null=True, blank=True)

    def __str__(self):
        return f"CustomerProfile: {self.user.username}"


class AdminProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='admin_profile')
    role = models.CharField(max_length=100, default='Staff')
    permissions = models.JSONField(default=list, blank=True)
    raw_password = models.CharField(max_length=255, null=True, blank=True)
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

