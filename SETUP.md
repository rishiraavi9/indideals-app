# Quick Setup Guide

## 5-Minute Setup

### 1. Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend (in a new terminal)
cd frontend
npm install
```

### 2. Setup PostgreSQL

**Option A: Using existing PostgreSQL**
```bash
createdb deals_db
```

**Option B: Using Docker**
```bash
docker run --name deals-postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=deals_db \
  -p 5432:5432 \
  -d postgres:14
```

### 3. Configure Environment

**Backend** (`backend/.env`):
```bash
cd backend
cp .env.example .env
```

Edit `.env` with your database connection:
```env
PORT=3001
DATABASE_URL=postgres://postgres:password@localhost:5432/deals_db
JWT_SECRET=my-secret-key-change-this-in-production
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

**Frontend** (`frontend/.env`):
```bash
cd frontend
cp .env.example .env
```

Should contain:
```env
VITE_API_URL=http://localhost:3001/api
```

### 4. Initialize Database

```bash
cd backend

# Generate migrations
npm run db:generate

# Run migrations
npm run db:migrate

# Seed sample data
tsx src/seed.ts
```

### 5. Start Development Servers

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### 6. Open App

Visit: **http://localhost:5173**

Login with demo account:
- **Email**: demo@deals.com
- **Password**: password123

---

## Troubleshooting

### Port Already in Use

**Backend (3001):**
```bash
# Find process
lsof -i :3001

# Kill it
kill -9 <PID>
```

**Frontend (5173):**
```bash
# Find process
lsof -i :5173

# Kill it
kill -9 <PID>
```

### Database Connection Failed

1. Check PostgreSQL is running:
   ```bash
   psql -U postgres -d deals_db
   ```

2. Verify DATABASE_URL in `.env`

3. Check PostgreSQL logs:
   ```bash
   # macOS with Homebrew
   tail -f /usr/local/var/log/postgres.log
   ```

### Migration Errors

Reset database:
```bash
# Drop and recreate
dropdb deals_db
createdb deals_db

# Run migrations again
cd backend
npm run db:generate
npm run db:migrate
tsx src/seed.ts
```

### Module Not Found Errors

Clear node_modules and reinstall:
```bash
# Backend
cd backend
rm -rf node_modules package-lock.json
npm install

# Frontend
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### CORS Errors

1. Check `FRONTEND_URL` in backend `.env`
2. Verify frontend is running on correct port
3. Check browser console for exact error

---

## Next Steps

1. **Explore Features**:
   - Browse deals
   - Create a new deal
   - Vote on deals
   - Try search and filters
   - Check different categories

2. **Database Management**:
   ```bash
   cd backend
   npm run db:studio
   ```
   Opens visual database browser at http://localhost:4983

3. **API Testing**:
   - Import API collection in Postman/Insomnia
   - Test endpoints from README.md

4. **Code Exploration**:
   - Check [backend/README.md](backend/README.md) for API docs
   - Review [README.md](README.md) for architecture overview

---

## Production Deployment

See main [README.md](README.md) for production deployment guides.

---

Happy coding! 🚀
