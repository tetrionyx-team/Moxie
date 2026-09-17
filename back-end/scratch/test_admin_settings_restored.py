import os
import sys
import django
import json

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.test import RequestFactory
from django.contrib.auth.models import User
from api.models import StoreSettings, AdminProfile
from api.views import AdminSettingsView

def test_settings_flow():
    # Setup or retrieve superuser
    admin_user, _ = User.objects.get_or_create(username='admin_test_settings', defaults={'email': 'admin@moxie.com', 'is_staff': True, 'is_superuser': True})
    admin_user.is_staff = True
    admin_user.is_superuser = True
    admin_user.save()

    from django.contrib.sessions.backends.db import SessionStore
    
    def attach_session_and_auth(req):
        req.user = admin_user
        session = SessionStore()
        session['admin_2fa_verified'] = True
        session.create()
        req.session = session
        req._dont_enforce_csrf_checks = True
    factory = RequestFactory()
    view = AdminSettingsView.as_view()

    # 1. GET Settings
    req_get = factory.get('/api/admin-settings/')
    attach_session_and_auth(req_get)
    res_get = view(req_get)
    print("1. GET Status:", res_get.status_code)
    assert res_get.status_code == 200, f"Expected 200, got {res_get.status_code}"
    initial_data = res_get.data
    print("   Store Name:", initial_data.get('store_name'))
    print("   Stock Threshold:", initial_data.get('min_stock_threshold'))
    print("   Cancellation Limit:", initial_data.get('cancellation_time_limit'))
    print("   Payment Mode:", initial_data.get('payment', {}).get('mode'))
    print("   Low Stock Notif:", initial_data.get('low_stock_notification'))
    print("   Order Received Notif:", initial_data.get('order_received_notification'))
    print("   New Customer Notif:", initial_data.get('new_customer_signup_notification'))

    # 2. Update General Settings
    payload_gen = {
        'store_name': 'Moxie Luxury Studio',
        'store_phone': '+91 9999888877',
        '_section': 'general'
    }
    req_post_gen = factory.post('/api/admin-settings/', data=json.dumps(payload_gen), content_type='application/json')
    attach_session_and_auth(req_post_gen)
    res_post_gen = view(req_post_gen)
    print("2. POST General Status:", res_post_gen.status_code, getattr(res_post_gen, 'data', None))
    assert res_post_gen.status_code == 200
    assert res_post_gen.data.get('store_name') == 'Moxie Luxury Studio'

    # 3. Update Store Operations
    payload_store = {
        'store_status': 'Open',
        'maintenance_mode': False,
        'enable_stock_management': True,
        'low_stock_alert': True,
        'min_stock_threshold': 12,
        '_section': 'store'
    }
    req_post_store = factory.post('/api/admin-settings/', data=json.dumps(payload_store), content_type='application/json')
    attach_session_and_auth(req_post_store)
    res_post_store = view(req_post_store)
    print("3. POST Store Operations Status:", res_post_store.status_code)
    assert res_post_store.status_code == 200
    assert res_post_store.data.get('min_stock_threshold') == 12

    # 4. Update Order Settings
    payload_order = {
        'allow_order_cancellation': True,
        'cancellation_time_limit': '48 Hours',
        '_section': 'orders'
    }
    req_post_order = factory.post('/api/admin-settings/', data=json.dumps(payload_order), content_type='application/json')
    attach_session_and_auth(req_post_order)
    res_post_order = view(req_post_order)
    print("4. POST Order Settings Status:", res_post_order.status_code)
    assert res_post_order.status_code == 200
    assert res_post_order.data.get('cancellation_time_limit') == '48 Hours'

    # 5. Update Payment Settings
    payload_payment = {
        'mode': 'Live',
        'payment_currency': 'INR',
        'payment_timeout': '20 Minutes',
        'online_payment_enabled': True,
        'cod_enabled': True,
        '_section': 'payment'
    }
    req_post_pay = factory.post('/api/admin-settings/', data=json.dumps(payload_payment), content_type='application/json')
    attach_session_and_auth(req_post_pay)
    res_post_pay = view(req_post_pay)
    print("5. POST Payment Status:", res_post_pay.status_code)
    assert res_post_pay.status_code == 200
    assert res_post_pay.data.get('payment', {}).get('mode') == 'Live'
    assert res_post_pay.data.get('payment', {}).get('payment_timeout') == '20 Minutes'

    # 6. Update Notification Settings
    payload_notif = {
        'low_stock_notification': False,
        'order_received_notification': True,
        'new_customer_signup_notification': True,
        '_section': 'notifications'
    }
    req_post_notif = factory.post('/api/admin-settings/', data=json.dumps(payload_notif), content_type='application/json')
    attach_session_and_auth(req_post_notif)
    res_post_notif = view(req_post_notif)
    print("6. POST Notifications Status:", res_post_notif.status_code)
    assert res_post_notif.status_code == 200
    assert res_post_notif.data.get('low_stock_notification') is False
    assert res_post_notif.data.get('order_received_notification') is True

    # 7. Final GET to confirm all persist
    req_get2 = factory.get('/api/admin-settings/')
    attach_session_and_auth(req_get2)
    res_get2 = view(req_get2)
    print("7. Final GET Status:", res_get2.status_code)
    d = res_get2.data
    assert d.get('store_name') == 'Moxie Luxury Studio'
    assert d.get('min_stock_threshold') == 12
    assert d.get('cancellation_time_limit') == '48 Hours'
    assert d.get('payment', {}).get('mode') == 'Live'
    assert d.get('low_stock_notification') is False
    assert d.get('order_received_notification') is True

    print("\nALL ADMIN SETTINGS TESTS PASSED SUCCESSFULLY! [PASS]")

if __name__ == '__main__':
    test_settings_flow()
