# Moxie — Luxury Ecommerce Platform

Full-stack luxury ecommerce application with a React customer storefront, Django REST API backend, and an embedded React Admin Portal.

---

## 🚀 Fresh Clone Setup Guide (Windows / Any Laptop)

### 1. Prerequisites
- **Python 3.10+** (Ensure `python` and `pip` are in your PATH)
- **Node.js 18+** (Ensure `node` and `npm` are in your PATH)
- **Git**

---

### 2. Backend Setup (Django)

Open a PowerShell terminal in the repository root:

```powershell
# Navigate to backend directory
cd back-end

# Create a virtual environment
python -m venv venv

# Activate the virtual environment
.\venv\Scripts\Activate.ps1

# Upgrade pip and install all required packages
python -m pip install --upgrade pip
pip install -r requirements.txt

# Create your local environment file from the template
Copy-Item .env.example .env

# Run database migrations (defaults to local SQLite db.sqlite3)
python manage.py migrate

# (Optional) Create a superuser / admin user if starting fresh
python manage.py createsuperuser

# Start the Django development server
python manage.py runserver
```

> **Note:** The backend server runs at `http://127.0.0.1:8000/`.  
> - Admin Portal: `http://127.0.0.1:8000/admin/`  
> - REST API: `http://127.0.0.1:8000/api/`  
> - Visiting `http://127.0.0.1:8000/` automatically redirects to the Admin Portal.

---

### 3. Customer Frontend Setup (React)

Open a second terminal window:

```powershell
# Navigate to frontend directory
cd front-end

# Install dependencies
npm install

# Create your local environment file from the template
Copy-Item .env.example .env

# Start the customer development server
npm start
```

> **Note:** The Customer Storefront runs at `http://localhost:3000/`.  
> - Visiting `http://localhost:3000/admin` seamlessly redirects to the local Django Admin portal at `http://127.0.0.1:8000/admin/`.

---

### 4. (Optional) Admin React Portal Development / Rebuild

The compiled Admin React bundle is pre-built inside `back-end/static/admin/react/`.  
If you make changes to the Admin React source code in `back-end/react`, you can rebuild it:

```powershell
# Navigate to Admin React source
cd back-end/react

# Install dependencies
npm ci

# Build production assets for Django static distribution
npm run build
```

---

## 🔑 Local Development Notes

- **Database:** When `DATABASE_URL` is omitted in `.env`, Django automatically uses the local SQLite database (`db.sqlite3`).
- **Admin OTP in Local Dev:** By default in `.env.example`, `EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend` is configured. Any OTP generated during admin login will be printed directly in the backend terminal console for instant testing without needing real SMTP credentials.
- **Portability:** All asset and database paths use dynamic relative paths based on Django's `BASE_DIR`. The project can be cloned to any directory path on any drive without hardcoded path dependencies.
