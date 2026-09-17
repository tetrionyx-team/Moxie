import os
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django_setup = True
import django
django.setup()

from django.test import RequestFactory
from django.contrib.auth.models import User
from django.contrib.sessions.middleware import SessionMiddleware
from api.models import CustomerProfile, StoreSettings
from api.views import CustomerGoogleLoginView, CustomerAuthStatusView

def add_session_to_request(request):
    middleware = SessionMiddleware(lambda req: None)
    middleware.process_request(request)
    request.session.save()

def test_google_auth_flow():
    factory = RequestFactory()
    view = CustomerGoogleLoginView.as_view()
    me_view = CustomerAuthStatusView.as_view()

    # Ensure store allows registration
    store, _ = StoreSettings.objects.get_or_create(id=1)
    store.allow_registration = True
    store.save()

    test_email = 'testgoogleuser_auto@example.com'
    # Clean up test user if exists
    User.objects.filter(email=test_email).delete()

    print("--- 1. Testing Google Sign-in for New User (Auto Account Creation) ---")
    req = factory.post('/api/auth/google/', {
        'action': 'login',
        'email': test_email,
        'name': 'Google Test User',
        'firebaseUid': 'fb_uid_123456',
        'avatar': 'https://example.com/avatar.jpg',
    }, content_type='application/json')
    add_session_to_request(req)

    res = view(req)
    print(f"Status: {res.status_code}, Data: {res.data}")
    assert res.status_code in (200, 201), f"Expected 200 or 201, got {res.status_code}"
    assert res.data.get('authenticated') is True
    assert res.data.get('user', {}).get('email') == test_email

    print("\n--- 2. Testing Session Verification via /auth/me/ ---")
    me_req = factory.get('/api/auth/me/')
    me_req.session = req.session
    me_req.user = User.objects.get(email=test_email)
    me_res = me_view(me_req)
    print(f"AuthMe Status: {me_res.status_code}, Data: {me_res.data}")
    assert me_res.status_code == 200
    assert me_res.data.get('authenticated') is True

    print("\n--- 3. Testing Google Sign-in for Existing User ---")
    req2 = factory.post('/api/auth/google/', {
        'action': 'login',
        'email': test_email,
        'name': 'Google Test User',
        'firebaseUid': 'fb_uid_123456',
    }, content_type='application/json')
    add_session_to_request(req2)
    res2 = view(req2)
    print(f"Status: {res2.status_code}, Data: {res2.data}")
    assert res2.status_code == 200
    assert res2.data.get('authenticated') is True
    assert res2.data.get('isNewUser') is False

    print("\n--- 4. Testing Google Sign-in with Register Action ---")
    req3 = factory.post('/api/auth/google/', {
        'action': 'register',
        'email': test_email,
        'name': 'Google Test User',
        'firebaseUid': 'fb_uid_123456',
    }, content_type='application/json')
    add_session_to_request(req3)
    res3 = view(req3)
    print(f"Status: {res3.status_code}, Data: {res3.data}")
    assert res3.status_code == 200
    assert res3.data.get('authenticated') is True

    # Clean up
    User.objects.filter(email=test_email).delete()
    print("\n>>> ALL GOOGLE AUTH TESTS PASSED SUCCESSFULLY! <<<")

if __name__ == '__main__':
    test_google_auth_flow()
