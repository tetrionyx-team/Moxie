#!/usr/bin/env bash
# exit on error
set -o errexit

pip install -r requirements.txt

# Build React Admin Bundle
if [ -d "react" ]; then
    echo "Building React Admin Application..."
    cd react
    npm ci
    npm run build
    cd ..
fi

python manage.py migrate
python manage.py collectstatic --no-input

# Automatically ensure superuser admin exists on Render database
python manage.py shell -c "from django.contrib.auth.models import User; u, created = User.objects.get_or_create(username='admin', defaults={'email':'admin2026@gmail.com', 'is_staff':True, 'is_superuser':True}); u.set_password('admin123'); u.is_staff=True; u.is_superuser=True; u.save(); print('Superuser admin created/updated successfully')"
