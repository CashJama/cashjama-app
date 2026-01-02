# CashJama Admin Dashboard

Admin dashboard for CashJama platform.

## Features
- Admin-only login (OTP authentication)
- Dashboard with statistics
- User management
- Deposit/Job tracking
- BC Agent management (create, enable, disable, remove)

## Authorized Admin Numbers
- 9520497353
- 7409143674

## Development
```bash
yarn install
yarn dev
```

## Build
```bash
yarn build
```

## Deployment (Render)
1. Create new Web Service on Render
2. Connect to repository
3. Set root directory: `admin`
4. Runtime: Docker
5. Deploy!

## API Endpoints Used
- POST /api/auth/send-otp
- POST /api/auth/verify-otp
- GET /api/admin/stats
- GET /api/admin/users
- GET /api/admin/deposits
- GET /api/admin/bc-agents
- POST /api/admin/create-bc-agent
- PUT /api/admin/bc-agents/{id}/disable
- PUT /api/admin/bc-agents/{id}/enable
- DELETE /api/admin/bc-agents/{id}
