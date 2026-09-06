class AdminNoCacheMiddleware:
    """
    Middleware ensuring all Admin pages and Admin APIs are never cached by browser history or proxy.
    Prevents BFCache / back-button restoration of authenticated screens after logout or leaving admin.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        if request.path.startswith('/admin') or request.path.startswith('/api/admin'):
            response['Cache-Control'] = 'no-cache, no-store, must-revalidate, max-age=0, private'
            response['Pragma'] = 'no-cache'
            response['Expires'] = '0'
        return response
