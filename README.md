# IICCI Trade Analytics

IICCI Trade Analytics is a full-stack platform for exploring bilateral import-export data between India and Italy.

The project is designed for India-Italy trade analysis across years, HS2 and HS4 codes, sectors, product categories, and specific product groupings used by IICCI.

It includes:

- A React dashboard for filtering and visualizing trade data
- A Django REST backend for authentication, analytics, trade-table queries, and admin operations
- Google sign-in with Firebase Auth
- Admin approval for new accounts before dashboard access is granted
- Excel-based trade data import with both append and replace modes

All trade values on the platform are treated as euro-denominated values and are displayed with the `€` symbol in the UI.

## Stack

- Frontend: React, React Router, Recharts, Firebase Web SDK
- Backend: Django, Django REST Framework, PostgreSQL
- Auth: Firebase Auth + Django session auth
- Deployment: Railway-compatible frontend build, Django backend with Gunicorn/WhiteNoise

## Repository Structure

```text
.
├── backend/    # Django API, auth, admin, import, analytics
└── frontend/   # React dashboard and admin UI
```

## Trade Analysis Features

- Dashboard filters for year, country flow, HS2, HS4, sector, product category, and specific products
- Keyword search across trade classifications
- KPI cards for bilateral trade and directional trade flows
- Year-wise trade comparison between Indian imports from Italy and Italian imports from India
- Sector breakdown and top-product analysis for India-Italy trade
- Paginated trade table with Excel and CSV export of filtered trade records, in the source workbook layout
- Google signup flow with pending approval, admin approval, and rejection states
- Admin data import panel with:
  - `Add Data` for appending new rows
  - `Replace Dataset` for full replacement of the existing dataset
- Short-lived backend caching for dashboard responses

## Local Development

### 1. Backend setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

The backend runs at `http://localhost:8000`.

### 2. Frontend setup

```bash
cd frontend
npm install
cp .env.example .env
npm start
```

The frontend runs at `http://localhost:3000`.

## Environment Variables

### Backend

Defined in [backend/.env.example](backend/.env.example).

Important values:

- `SECRET_KEY`
- `DEBUG`
- `ALLOWED_HOSTS`
- `DATABASE_URL` or the individual `DB_*` variables
- `CORS_ALLOWED_ORIGINS`
- `CSRF_TRUSTED_ORIGINS`
- `FIREBASE_SERVICE_ACCOUNT_KEY_JSON`
- `DASHBOARD_CACHE_TTL_SECONDS`

### Frontend

Defined in [frontend/.env.example](frontend/.env.example).

Important values:

- `REACT_APP_API_BASE`
- `REACT_APP_FIREBASE_API_KEY`
- `REACT_APP_FIREBASE_AUTH_DOMAIN`
- `REACT_APP_FIREBASE_PROJECT_ID`
- `REACT_APP_FIREBASE_APP_ID`
- `REACT_APP_FIREBASE_MESSAGING_SENDER_ID`

## Authentication Flow

1. A user signs up with Google in the frontend.
2. Firebase returns an ID token.
3. The backend verifies the token with the Firebase Admin SDK.
4. New users are created in Django with a `pending` approval status.
5. An admin approves or rejects the request from the admin panel.
6. Only approved users receive authenticated dashboard access.

## Data Import

The admin panel supports Excel uploads at the backend endpoint `POST /api/admin/import-excel/`.

Supported modes:

- `append`: adds uploaded rows to the existing dataset
- `replace`: deletes the existing dataset and imports the uploaded workbook

Notes:

- Accepted file types are `.xlsx` and `.xls`
- Current append mode does not de-duplicate rows
- Import completion clears backend dashboard cache
- The admin UI also clears cached filter options in the browser after import

### Workbook format

The workbook layout is defined once in [backend/core/tradeformat.py](backend/core/tradeformat.py)
and shared by the importer, the management command, and both exporters, so an
uploaded file and a downloaded one cannot drift apart.

Two rules the format depends on:

- **A row is either HS2-level or HS4-level.** HS2 rows leave column D blank and
  carry their values in K/L; HS4 rows carry theirs in M/N. No row uses both pairs.
  Analytics queries rely on this to avoid double-counting.
- **A blank value cell is not a zero.** It means no figure was reported and is
  stored as `NULL`, exported as a blank cell, and shown as `—` in the table.
  Aggregations skip nulls rather than counting them as zero.

HS codes are stored as zero-padded text. Excel saves chapter `01` as text but
chapter `10` as a number, so without padding the same code can arrive in two
forms and split into two separate filter values.

## Data Export

The trade table exports the current filter selection in the same 14-column
layout the client uploads, so a downloaded file can be edited and re-imported
with no changes:

- `GET /api/trade/export/xlsx/`
- `GET /api/trade/export/csv/`

Both require an authenticated session and accept the same query parameters as
`GET /api/trade/table/`.

## API Overview

Core API routes are defined in [backend/core/urls.py](backend/core/urls.py).

Key endpoints:

- `GET /api/auth/csrf/`
- `POST /api/auth/firebase/`
- `POST /api/auth/logout/`
- `GET /api/auth/me/`
- `GET /api/stats/dashboard/`
- `GET /api/stats/filters/`
- `GET /api/trade/table/`
- `GET /api/trade/export/xlsx/`
- `GET /api/trade/export/csv/`
- `GET /api/admin/stats/`
- `POST /api/admin/import-excel/`
- `POST /api/admin/users/<id>/approve/`
- `POST /api/admin/users/<id>/reject/`

## Data Model

The main trade data model is [backend/core/models.py](backend/core/models.py).

Each `TradeRecord` stores:

- Year and optional quarter
- HS2 / HS4 codes
- Descriptions and sector metadata, including the HS2 sector description
- Product category and keyword classification
- India-Italy trade values for:
  - Indian imports from Italy
  - Italian imports from India

User approval state is stored in `UserProfile.approval_status`.

## Build Commands

Backend:

```bash
cd backend
python3 -m py_compile core/views.py
```

Frontend:

```bash
cd frontend
npm run build
```

## Deployment Notes

- The frontend includes [frontend/railway.json](frontend/railway.json) for a static Railway deployment.
- The backend is set up for production with Gunicorn, WhiteNoise, secure cookies, trusted origins, and PostgreSQL.
- In production, Django uses `DATABASE_URL` when provided.

## Admin Access

Use Django admin at `/admin/` for superuser-level management, and use the app’s `/admin` route for the custom React admin interface.
