# Flight Management System

SkyBooker is a full-stack flight booking and management platform. It allows users to search for flights, book tickets, manage their bookings and profiles, and for admins to manage flights, bookings, and users. The system is built with a modern React/Next.js frontend and a Node.js/Express backend, using Supabase as the database and authentication provider.

---

## Table of Contents
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Setup & Installation](#setup--installation)
- [Environment Variables](#environment-variables)
- [Running the Project](#running-the-project)
- [API Overview](#api-overview)
- [Admin Panel](#admin-panel)
- [Testing](#testing)
- [License](#license)

---

## Features

### User Features
- Search for flights by origin, destination, and date
- Book one-way or round-trip flights
- Select seat class and view available seats
- Manage bookings (view, cancel, download e-ticket)
- User authentication (register, login, reset password)
- Profile management (personal info, saved payment methods)
- Dashboard with booking stats and trip history

### Admin Features
- Dashboard with metrics (total bookings, users, revenue, cancellations)
- Manage all bookings (filter, search, pagination)
- Manage flights (view, filter, update status)
- Manage users (view, filter, pagination)
- Visual analytics (charts for bookings, revenue, status distribution)

---

## Tech Stack
- **Frontend:** React, Next.js, TypeScript, Tailwind CSS, Radix UI, Recharts
- **Backend:** Node.js, Express, Supabase (Postgres), @supabase/supabase-js
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth
- **Email:** Nodemailer (Gmail)
- **PDF Generation:** PDFKit
- **Testing:** Jest, Supertest
- **Containerization:** Docker, Docker Compose

---

## Project Structure

```
Flight-management-system/
  backend/         # Express API, Supabase integration, admin endpoints
  frontend/        # Next.js app, user/admin UI, API calls
  docker-compose.yml
  README.md
```

---

## Setup & Installation

### Prerequisites
- Node.js (v18+ recommended)
- Yarn (or npm)
- Docker & Docker Compose (for containerized setup)
- Supabase project (see [Supabase](https://supabase.com/))

### 1. Clone the Repository
```bash
git clone <repo-url>
cd Flight-management-system
```

### 2. Configure Environment Variables

#### Backend (`backend/.env`):
```
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_KEY=your-supabase-service-role-key
EMAIL_USER=your-gmail-address
EMAIL_PASSWORD=your-gmail-app-password
```

#### Frontend (`frontend/.env`):
```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_API_BASE=http://localhost:4000/api
```

> **Note:** You must create these `.env` files manually. Never commit secrets to version control.

### 3. Install Dependencies

#### Backend
```bash
cd backend
yarn install
```

#### Frontend
```bash
cd ../frontend
yarn install
```

### 4. Database Setup
- Create a Supabase project and copy your API keys.
- Run the SQL scripts in `frontend/scripts/` to create tables and seed data:
  - `01-create-tables.sql`
  - `02-seed-data.sql`
  - `03-seed-flights.sql`
- You can use the Supabase SQL editor or CLI.

### 5. Running the Project

#### With Docker Compose (Recommended)
```bash
docker-compose up --build
```
- Frontend: http://localhost:3000
- Backend:  http://localhost:4000/api

#### Manually (Dev Mode)
- **Backend:**
  ```bash
  cd backend
  yarn dev
  # or: yarn start
  ```
- **Frontend:**
  ```bash
  cd frontend
  yarn dev
  # or: yarn start
  ```

---

## API Overview

The backend exposes a RESTful API for flights, bookings, users, payments, and admin operations. See [`frontend/public/openapi.json`](frontend/public/openapi.json) for the OpenAPI spec.

**Main Endpoints:**
- `GET /api/flights` - Search flights
- `POST /api/bookings` - Create booking
- `GET /api/bookings?userId=...` - Get user bookings
- `GET /api/airports` - List airports
- `GET /api/user-profile?user_id=...` - Get user profile
- `POST /api/saved-payments` - Save payment method
- `GET /api/saved-payments?user_id=...` - Get saved payments
- `GET /api/admin/metrics` - Admin dashboard metrics
- `GET /api/admin/bookings` - Admin bookings management
- `GET /api/admin/flights` - Admin flights management
- `GET /api/admin/users` - Admin users management

---

## Admin Panel

- Accessible at `/admin` after logging in as an admin user.
- Features:
  - Dashboard with key metrics and charts
  - Manage bookings: filter, search, paginate, view details
  - Manage flights: filter, update status, paginate
  - Manage users: filter, paginate, view details
- Sidebar navigation for quick access to all admin features.

---

## Testing

### Backend
```bash
cd backend
yarn test
```

### Frontend
- (Add your preferred frontend testing tools)

---

## License

This project is licensed under the MIT License.
