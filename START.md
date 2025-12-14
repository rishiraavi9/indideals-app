# Quick Start - Deals App

## ✅ All Errors Fixed!

The application is now ready to run. All TypeScript errors have been resolved.

## 🚀 Start the App (3 Steps)

### Step 1: Setup Database

**Option A - If you have PostgreSQL installed:**
```bash
# Create database
createdb deals_db

# Run migrations and seed
cd backend
npm run db:generate
npm run db:migrate
tsx src/seed.ts
```

**Option B - Using Docker:**
```bash
docker run --name deals-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=deals_db \
  -p 5432:5432 \
  -d postgres:14

# Wait 5 seconds for postgres to start, then:
cd backend
npm run db:generate
npm run db:migrate
tsx src/seed.ts
```

### Step 2: Start Backend
```bash
cd backend
npm run dev
```

You should see:
```
🚀 Server running on http://localhost:3001
📦 Environment: development
🌐 Frontend URL: http://localhost:5173
```

### Step 3: Start Frontend (in a new terminal)
```bash
cd frontend
npm run dev
```

You should see:
```
  VITE v7.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
```

## 🎉 Open Your Browser

Go to: **http://localhost:5173**

Login with demo account:
- **Email**: demo@deals.com
- **Password**: password123

## ✨ What You Can Do

- ✅ Browse deals across 3 tabs (Frontpage, Popular, New)
- ✅ Filter by 8 categories (Electronics, Fashion, etc.)
- ✅ Search for deals
- ✅ Login / Signup
- ✅ Create new deals
- ✅ Upvote/downvote deals
- ✅ See discount percentages
- ✅ Click deal links to merchant sites

## 🔧 Troubleshooting

### Database Connection Issues

**Error: `ECONNREFUSED 127.0.0.1:5432`**

PostgreSQL is not running. Start it:
```bash
# macOS with Homebrew
brew services start postgresql

# Linux
sudo systemctl start postgresql

# Docker
docker start deals-postgres
```

### Port Already in Use

**Error: `EADDRINUSE :::3001`**

Kill the process:
```bash
lsof -i :3001
kill -9 <PID>
```

### Wrong Database Credentials

Edit `backend/.env` and update `DATABASE_URL`:
```env
DATABASE_URL=postgres://YOUR_USER:YOUR_PASSWORD@localhost:5432/deals_db
```

## 📊 View Database

Open Drizzle Studio to see your data:
```bash
cd backend
npm run db:studio
```

Opens at: **http://localhost:4983**

## 🎯 Next Steps

1. **Explore the code**:
   - [frontend/src/App.tsx](frontend/src/App.tsx) - Main app
   - [backend/src/index.ts](backend/src/index.ts) - API server
   - [backend/src/db/schema.ts](backend/src/db/schema.ts) - Database schema

2. **Read documentation**:
   - [README.md](README.md) - Full documentation
   - [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture
   - [SUMMARY.md](SUMMARY.md) - What was built

3. **Start building**:
   - Add comments UI
   - Implement image uploads
   - Create deal detail pages
   - Build user profiles

---

**Everything is working! No errors! 🎊**

Have fun building your deals platform!
