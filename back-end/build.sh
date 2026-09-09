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
python manage.py ensure_admin

