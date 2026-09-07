from django.urls import path

from .views import (
    AdminApiLoginView,
    AdminApiLogoutView,
    AdminChangePasswordView,
    AdminCheckAuthView,
    AdminCustomerDeleteView,
    AdminCustomersView,
    AdminCustomerStatusView,
    AdminDashboardAnalyticsView,
    AdminDashboardSalesView,
    AdminForgotPasswordView,
    AdminNotificationDeleteView,
    AdminNotificationMarkAllReadView,
    AdminNotificationReadView,
    AdminNotificationsView,
    AdminOfferDetailView,
    AdminOffersView,
    AdminOrderDetailView,
    AdminOrdersView,
    AdminProfileSettingsView,
    AdminResendOtpView,
    AdminResetPasswordView,
    AdminSettingsView,
    AdminTestEmailView,
    AdminUserDetailView,
    AdminUsersView,
    AdminUserToggleActiveView,
    AdminVerifyOtpView,
    AdminVerifyResetCodeView,
    BannerDetailView,
    BannerListView,
    BannerTrackClickView,
    CategoryDetailView,
    CategoryListView,
    CreateCodOrderView,
    CreateRazorpayOrderView,
    CurrentOfferView,
    CustomerCancelOrderView,
    CustomerRegisterView,
    CustomerLoginView,
    CustomerLogoutView,
    CustomerAuthStatusView,
    CustomerGoogleLoginView,
    CustomerProfileView,
    CustomerOrdersView,
    CsrfTokenView,
    HealthCheckView,
    ProductDetailView,
    ProductListView,
    ProductVariantDetailView,
    PublicSettingsView,
    RazorpayWebhookView,
    ReviewDetailView,
    ReviewListView,
    SubcategoryDetailView,
    SubcategoryListCreateView,
    VerifyRazorpayPaymentView,
)

urlpatterns = [
    # Health Check & Public Settings & CSRF
    path('health/', HealthCheckView.as_view(), name='health-check'),
    path('csrf/', CsrfTokenView.as_view(), name='csrf-token'),
    path('auth/csrf/', CsrfTokenView.as_view(), name='auth-csrf-token'),
    path('public-settings/', PublicSettingsView.as_view(), name='public-settings'),
    path('public/settings/', PublicSettingsView.as_view(), name='public-settings-slash'),
    path('settings/public/', PublicSettingsView.as_view(), name='settings-public'),

    # Customer Authentication & Profile
    path('customer/register/', CustomerRegisterView.as_view(), name='customer-register'),
    path('register/', CustomerRegisterView.as_view(), name='customer-register-root'),
    path('auth/register/', CustomerRegisterView.as_view(), name='auth-register'),
    path('customer/login/', CustomerLoginView.as_view(), name='customer-login'),
    path('login/', CustomerLoginView.as_view(), name='customer-login-root'),
    path('auth/login/', CustomerLoginView.as_view(), name='auth-login'),
    path('customer/logout/', CustomerLogoutView.as_view(), name='customer-logout'),
    path('logout/', CustomerLogoutView.as_view(), name='customer-logout-root'),
    path('auth/logout/', CustomerLogoutView.as_view(), name='auth-logout'),
    path('customer/me/', CustomerAuthStatusView.as_view(), name='customer-auth-status'),
    path('auth/me/', CustomerAuthStatusView.as_view(), name='auth-me'),
    path('customer/google/', CustomerGoogleLoginView.as_view(), name='customer-google-login'),
    path('auth/google/', CustomerGoogleLoginView.as_view(), name='auth-google-login'),
    path('customer/profile/', CustomerProfileView.as_view(), name='customer-profile'),
    path('customer/orders/', CustomerOrdersView.as_view(), name='customer-orders-list'),

    # Admin Authentication
    path('admin/check-auth/', AdminCheckAuthView.as_view(), name='admin-api-check-auth'),
    path('admin/login/', AdminApiLoginView.as_view(), name='admin-api-login'),
    path('admin/verify-otp/', AdminVerifyOtpView.as_view(), name='admin-api-verify-otp'),
    path('admin/resend-otp/', AdminResendOtpView.as_view(), name='admin-api-resend-otp'),
    path('admin/logout/', AdminApiLogoutView.as_view(), name='admin-api-logout'),

    # Categories & Subcategories
    path('categories/', CategoryListView.as_view(), name='category-list'),
    path('categories/<int:pk>/', CategoryDetailView.as_view(), name='category-detail'),
    path('subcategories/', SubcategoryListCreateView.as_view(), name='subcategory-list'),
    path('subcategories/<int:pk>/', SubcategoryDetailView.as_view(), name='subcategory-detail'),

    # Products & Variants
    path('products/', ProductListView.as_view(), name='product-list'),
    path('admin/products/', ProductListView.as_view(), name='admin-product-list'),
    path('products/<int:pk>/', ProductDetailView.as_view(), name='product-detail'),
    path('variants/<int:pk>/', ProductVariantDetailView.as_view(), name='variant-detail'),

    # Banners
    path('banners/', BannerListView.as_view(), name='banner-list'),
    path('banners/<int:pk>/', BannerDetailView.as_view(), name='banner-detail'),
    path('banners/<int:pk>/click/', BannerTrackClickView.as_view(), name='banner-track-click'),

    # Reviews
    path('reviews/', ReviewListView.as_view(), name='review-list'),
    path('reviews/<int:pk>/', ReviewDetailView.as_view(), name='review-detail'),

    # Payments & Razorpay & COD
    path('payment/order/create/', CreateRazorpayOrderView.as_view(), name='payment-order-create'),
    path('payment/order/cod/', CreateCodOrderView.as_view(), name='payment-order-cod'),
    path('payment/cod/', CreateCodOrderView.as_view(), name='payment-cod-root'),
    path('orders/cod/', CreateCodOrderView.as_view(), name='orders-cod'),
    path('payment/verify/', VerifyRazorpayPaymentView.as_view(), name='payment-verify'),
    path('payment/webhook/', RazorpayWebhookView.as_view(), name='payment-webhook'),

    # Admin Notifications / Messages
    path('notifications/', AdminNotificationsView.as_view(), name='admin-notifications'),
    path('notifications/<int:pk>/read/', AdminNotificationReadView.as_view(), name='admin-notification-read'),
    path('notifications/mark-all-read/', AdminNotificationMarkAllReadView.as_view(), name='admin-notification-mark-all-read'),
    path('notifications/<int:pk>/delete/', AdminNotificationDeleteView.as_view(), name='admin-notification-delete'),

    # Admin & Public Offers
    path('offers/', AdminOffersView.as_view(), name='admin-offers'),
    path('offers/current/', CurrentOfferView.as_view(), name='current-offer'),
    path('offers/<int:pk>/', AdminOfferDetailView.as_view(), name='admin-offer-detail'),

    # Admin Orders
    path('admin-orders/', AdminOrdersView.as_view(), name='admin-orders'),
    path('admin-orders/<int:pk>/', AdminOrderDetailView.as_view(), name='admin-order-detail'),
    path('orders/<int:pk>/', AdminOrderDetailView.as_view(), name='order-detail'),
    path('customer/orders/<int:pk>/cancel/', CustomerCancelOrderView.as_view(), name='customer-order-cancel'),
    path('orders/<int:pk>/cancel/', CustomerCancelOrderView.as_view(), name='order-cancel'),

    # Admin Customers
    path('customers/', AdminCustomersView.as_view(), name='admin-customers'),
    path('customers/<int:pk>/status/', AdminCustomerStatusView.as_view(), name='admin-customer-status'),
    path('customers/<int:pk>/delete/', AdminCustomerDeleteView.as_view(), name='admin-customer-delete'),

    # Admin Users
    path('admin-users/', AdminUsersView.as_view(), name='admin-users'),
    path('admin-users/<int:pk>/', AdminUserDetailView.as_view(), name='admin-user-detail'),
    path('admin-users/<int:pk>/toggle-active/', AdminUserToggleActiveView.as_view(), name='admin-user-toggle-active'),

    # Admin Settings & Profile
    path('admin-settings/', AdminSettingsView.as_view(), name='admin-settings'),
    path('admin/settings/', AdminSettingsView.as_view(), name='admin-settings-alias'),
    path('admin-settings/profile/', AdminProfileSettingsView.as_view(), name='admin-profile-settings'),
    path('admin-settings/change-password/', AdminChangePasswordView.as_view(), name='admin-change-password'),
    path('admin/change-password/', AdminChangePasswordView.as_view(), name='admin-api-change-password'),
    path('admin-settings/test-email/', AdminTestEmailView.as_view(), name='admin-test-email'),
    path('admin-settings/forgot-password/', AdminForgotPasswordView.as_view(), name='admin-forgot-password'),
    path('admin-settings/verify-reset-code/', AdminVerifyResetCodeView.as_view(), name='admin-verify-reset-code'),
    path('admin-settings/reset-password/', AdminResetPasswordView.as_view(), name='admin-reset-password'),

    # Admin Dashboard
    path('admin-dashboard/analytics/', AdminDashboardAnalyticsView.as_view(), name='admin-dashboard-analytics'),
    path('admin-dashboard/sales/', AdminDashboardSalesView.as_view(), name='admin-dashboard-sales'),
]