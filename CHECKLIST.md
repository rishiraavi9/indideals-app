# Setup Checklist

Use this checklist to ensure everything is set up correctly.

## ✅ Prerequisites

- [ ] Node.js 18+ installed (`node --version`)
- [ ] PostgreSQL 14+ installed (`psql --version`)
- [ ] npm or yarn installed (`npm --version`)
- [ ] Code editor (VS Code recommended)
- [ ] Terminal access

## ✅ Backend Setup

- [ ] Navigate to backend directory
- [ ] Install dependencies (`npm install`)
- [ ] Create `.env` file from `.env.example`
- [ ] Configure DATABASE_URL in `.env`
- [ ] Configure JWT_SECRET in `.env`
- [ ] PostgreSQL database created (`createdb deals_db`)
- [ ] Migrations generated (`npm run db:generate`)
- [ ] Migrations applied (`npm run db:migrate`)
- [ ] Database seeded (`tsx src/seed.ts`)
- [ ] Backend starts successfully (`npm run dev`)
- [ ] Backend running on http://localhost:3001
- [ ] Health check works: http://localhost:3001/health

## ✅ Frontend Setup

- [ ] Navigate to frontend directory
- [ ] Install dependencies (`npm install`)
- [ ] Create `.env` file from `.env.example`
- [ ] Configure VITE_API_URL in `.env`
- [ ] Frontend starts successfully (`npm run dev`)
- [ ] Frontend running on http://localhost:5173
- [ ] No console errors in browser

## ✅ Testing Features

### Authentication
- [ ] Open app at http://localhost:5173
- [ ] Click "Login / Sign Up" button
- [ ] Login with demo account (demo@deals.com / password123)
- [ ] See username and reputation in header
- [ ] Logout works correctly

### Deals Browsing
- [ ] See list of deals on Frontpage tab
- [ ] Switch to Popular tab - deals update
- [ ] Switch to New tab - deals update
- [ ] Search for "AirPods" - results filter correctly
- [ ] Clear search - all deals return

### Categories
- [ ] See category buttons (Electronics, Fashion, etc.)
- [ ] Click Electronics category - deals filter
- [ ] Click "All" button - all deals return
- [ ] Categories work with tabs

### Voting
- [ ] Login if not already
- [ ] Click upvote button on a deal
- [ ] See upvote count increase
- [ ] See button highlight (green border)
- [ ] Click upvote again - vote removed
- [ ] Try downvote - works correctly

### Creating Deals
- [ ] Click "Post Deal" button
- [ ] If not logged in, see auth modal
- [ ] After login, see post deal modal
- [ ] Fill in title, price, merchant
- [ ] Optional: add description, original price, URL, category
- [ ] Submit deal successfully
- [ ] Redirected to "New" tab
- [ ] See your new deal in the list

## ✅ Database Verification

- [ ] Open Drizzle Studio (`cd backend && npm run db:studio`)
- [ ] Studio opens at http://localhost:4983
- [ ] See all tables: users, deals, categories, votes, comments
- [ ] Browse users table - see demo accounts
- [ ] Browse deals table - see seeded deals
- [ ] Browse categories table - see 8 categories

## ✅ API Testing (Optional)

Using curl or Postman:

- [ ] Health check: `curl http://localhost:3001/health`
- [ ] Login:
  ```bash
  curl -X POST http://localhost:3001/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"demo@deals.com","password":"password123"}'
  ```
- [ ] Get deals: `curl http://localhost:3001/api/deals`
- [ ] Get categories: `curl http://localhost:3001/api/categories`

## ✅ Code Quality Checks

- [ ] No TypeScript errors in backend (`cd backend && npm run build`)
- [ ] No TypeScript errors in frontend (`cd frontend && npm run build`)
- [ ] No ESLint errors in frontend (`cd frontend && npm run lint`)
- [ ] All files use consistent formatting

## ❌ Common Issues & Solutions

### Port Already in Use
**Problem**: Error: listen EADDRINUSE :::3001
**Solution**:
```bash
lsof -i :3001
kill -9 <PID>
```

### Database Connection Failed
**Problem**: Error: connect ECONNREFUSED 127.0.0.1:5432
**Solution**:
1. Start PostgreSQL: `brew services start postgresql` (macOS)
2. Check DATABASE_URL in .env
3. Verify database exists: `psql -l`

### Module Not Found
**Problem**: Error: Cannot find module 'xyz'
**Solution**:
```bash
rm -rf node_modules package-lock.json
npm install
```

### CORS Errors
**Problem**: Access-Control-Allow-Origin error in browser
**Solution**:
1. Check FRONTEND_URL in backend/.env
2. Ensure it matches frontend port (http://localhost:5173)
3. Restart backend server

### Token Invalid
**Problem**: 401 Unauthorized errors
**Solution**:
1. Clear localStorage in browser console: `localStorage.clear()`
2. Login again
3. Check JWT_SECRET is same in .env

## 🎉 Success Criteria

You've successfully set up the app when:

✅ Backend runs without errors
✅ Frontend runs without errors
✅ Can login with demo account
✅ Can browse and filter deals
✅ Can create a new deal
✅ Can vote on deals
✅ Database has seeded data
✅ No console errors in browser
✅ API endpoints respond correctly

## 📚 Next Steps

Once everything is checked:

1. Review [SUMMARY.md](SUMMARY.md) to understand what was built
2. Read [README.md](README.md) for architecture details
3. Check [backend/README.md](backend/README.md) for API documentation
4. Start building new features!

---

**Need help?** Check the troubleshooting sections in [SETUP.md](SETUP.md)
