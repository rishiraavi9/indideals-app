# Install PostgreSQL

You need PostgreSQL to run the deals app. Choose one of these options:

## ✅ Option 1: Homebrew (Recommended for macOS)

### Install PostgreSQL
```bash
brew install postgresql@14
```

### Start PostgreSQL
```bash
brew services start postgresql@14
```

### Add to PATH
```bash
echo 'export PATH="/opt/homebrew/opt/postgresql@14/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

Or for bash:
```bash
echo 'export PATH="/opt/homebrew/opt/postgresql@14/bin:$PATH"' >> ~/.bash_profile
source ~/.bash_profile
```

### Create Database
```bash
createdb deals_db
```

### Verify Installation
```bash
psql deals_db
# You should see: deals_db=#
# Type \q to exit
```

---

## ✅ Option 2: Docker (No Installation Required)

### Install Docker Desktop
1. Download from: https://www.docker.com/products/docker-desktop
2. Install and start Docker Desktop

### Run PostgreSQL Container
```bash
docker run --name deals-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=deals_db \
  -e POSTGRES_USER=postgres \
  -p 5432:5432 \
  -d postgres:14
```

### Verify Container is Running
```bash
docker ps
# Should show deals-postgres container
```

### Stop PostgreSQL (when needed)
```bash
docker stop deals-postgres
```

### Start PostgreSQL Again
```bash
docker start deals-postgres
```

### Database Connection String
Your `backend/.env` should have:
```
DATABASE_URL=postgres://postgres:postgres@localhost:5432/deals_db
```

---

## ✅ Option 3: Postgres.app (Mac GUI App)

1. Download from: https://postgresapp.com/
2. Drag to Applications folder
3. Open Postgres.app
4. Click "Initialize" to create a new server
5. Add to PATH:
   ```bash
   echo 'export PATH="/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH"' >> ~/.zshrc
   source ~/.zshrc
   ```
6. Create database:
   ```bash
   createdb deals_db
   ```

---

## 🔧 After Installing PostgreSQL

### Step 1: Verify PostgreSQL is Running
```bash
psql --version
# Should show: psql (PostgreSQL) 14.x
```

### Step 2: Check Database Exists
```bash
psql -l | grep deals_db
```

### Step 3: Continue with App Setup
```bash
cd /Users/venkatarishikraavi/apps/deals-app/backend

# Generate migrations
npm run db:generate

# Run migrations
npm run db:migrate

# Seed data
tsx src/seed.ts
```

---

## ❓ Which Option Should I Choose?

- **New to databases?** → Use **Docker** (easiest, no system changes)
- **Prefer native install?** → Use **Homebrew** (best performance)
- **Want a GUI?** → Use **Postgres.app** (visual interface)

---

## 🆘 Troubleshooting

### "psql: command not found" after Homebrew install

Add to PATH manually:
```bash
# For Intel Mac
export PATH="/usr/local/opt/postgresql@14/bin:$PATH"

# For M1/M2 Mac
export PATH="/opt/homebrew/opt/postgresql@14/bin:$PATH"
```

### "Connection refused" error

PostgreSQL is not running. Start it:
```bash
# Homebrew
brew services start postgresql@14

# Docker
docker start deals-postgres

# Postgres.app
# Open the app and click the server
```

### "Database already exists"

That's fine! Continue with migrations:
```bash
cd backend
npm run db:generate
npm run db:migrate
tsx src/seed.ts
```

---

**Once PostgreSQL is installed and running, come back and run the setup commands!**
