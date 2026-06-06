# A & K Analytics — Backend

Express API server for the AKAnalytics platform. Handles authentication, customer portal data, file uploads, live chat (Socket.IO), and admin management.

## Stack

- **Runtime**: Node.js 22+
- **Framework**: Express 4
- **Database**: MongoDB (Mongoose 6)
- **Auth**: JWT (jsonwebtoken) + bcryptjs
- **Real-time**: Socket.IO
- **Email**: Nodemailer (Gmail)
- **File uploads**: Multer (CSV/XLSX only, 10 MB max)

## Environment variables

Copy `.env.example` to `.env` and fill in the values:

| Variable | Description |
|---|---|
| `PORT` | Port to listen on (default: 3000) |
| `MONGO_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Secret for signing JWTs (min 32 chars) |
| `EMAIL_USER` | Gmail address for sending emails |
| `EMAIL_PASS` | Gmail app password (not your account password) |
| `DB_CREDS_SECRET` | 64-char hex string for encrypting stored DB credentials — generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `ALLOWED_ORIGIN` | Frontend URL for CORS (default: `https://akaana.netlify.app`) |

## Local development

```bash
npm install
cp .env.example .env   # fill in your values
npm run dev            # nodemon with auto-reload
```

Server runs on `http://localhost:3000`.

## Production

```bash
npm start              # node server.js
```

Deployed on [Render](https://render.com). The `Procfile` configures the start command. Set all environment variables in the Render dashboard under **Environment**.

## API reference

### Auth

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/users/signup` | — | Register (sends verification email) |
| GET | `/api/users/verify/:token` | — | Verify email |
| POST | `/api/users/login` | — | Login → returns JWT |
| GET | `/api/users/profile` | Bearer | Get current user profile |

### Customer portal

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/customer/dashboard` | Bearer | Dashboard URL |
| GET | `/api/customer/analytics` | Bearer | Analytics reports |
| GET | `/api/customer/bookings` | Bearer | List bookings |
| POST | `/api/customer/bookings` | Bearer | Create booking |
| DELETE | `/api/customer/bookings/:id` | Bearer | Cancel booking |
| POST | `/api/customer/upload` | Bearer | Upload CSV/XLSX for analysis |
| POST | `/api/customer/db-connect` | Bearer | Connect external database |

### Reviews

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/reviews` | — | Submit review |
| GET | `/api/reviews` | — | List approved reviews |
| GET | `/api/reviews/user/:name` | Bearer | User's own reviews |
| GET | `/api/reviews/pending` | Admin | Count unapproved |
| GET | `/api/reviews/all` | Admin | All reviews |
| PATCH | `/api/reviews/:id` | Admin | Approve/reject |

### Admin

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/admin/users` | Admin | List all users |
| PATCH | `/api/admin/users/:id` | Admin | Change user role |
| GET | `/api/admin/bookings` | Admin | List all bookings |
| PATCH | `/api/admin/bookings/:id` | Admin | Update booking status |
| GET | `/api/admin/support-tickets` | Admin | List support tickets |
| PATCH | `/api/admin/support-tickets/:id` | Admin | Update ticket status |

## Security notes

- Uploaded files are served from `/uploads` but require a valid JWT — they are not publicly accessible.
- Third-party database credentials are encrypted at rest using AES-256-CBC (`DB_CREDS_SECRET`).
- Auth endpoints are rate-limited to 20 requests per 15 minutes.
- `helmet` sets standard security headers on all responses.
- Admin access is determined by `user.role === 'admin'` in the database — no hardcoded emails or bypass tokens.
