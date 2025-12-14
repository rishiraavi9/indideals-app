# Deals App Backend

Backend API for the Deals aggregation platform (Slickdeals for India).

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM
- **Authentication**: JWT with bcrypt
- **Validation**: Zod

## Features

- User authentication (signup/login)
- Deal CRUD operations
- Voting system (upvote/downvote)
- Categories management
- Comments and discussions
- Search and filtering
- Deal expiration tracking

## Setup

### Prerequisites

- Node.js 18+
- PostgreSQL 14+

### Installation

1. Install dependencies:
```bash
cd backend
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` and add your configuration:
```env
PORT=3001
DATABASE_URL=postgres://user:password@localhost:5432/deals_db
JWT_SECRET=your-super-secret-key-change-in-production
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

### Database Setup

1. Create PostgreSQL database:
```bash
createdb deals_db
```

2. Generate and run migrations:
```bash
npm run db:generate
npm run db:migrate
```

3. Seed the database:
```bash
npm run dev -- src/seed.ts
```

Or run manually:
```bash
tsx src/seed.ts
```

### Running the Server

Development mode (with hot reload):
```bash
npm run dev
```

Production build:
```bash
npm run build
npm start
```

The server will start on `http://localhost:3001`

## API Endpoints

### Authentication

- `POST /api/auth/signup` - Create new user account
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (requires auth)

### Deals

- `GET /api/deals` - Get all deals (supports filtering)
  - Query params: `tab`, `category`, `search`, `merchant`, `limit`, `offset`
- `GET /api/deals/:id` - Get single deal
- `POST /api/deals` - Create deal (requires auth)
- `POST /api/deals/:id/vote` - Vote on deal (requires auth)

### Categories

- `GET /api/categories` - Get all categories
- `POST /api/categories` - Create category (requires auth)

### Comments

- `GET /api/deals/:dealId/comments` - Get comments for deal
- `POST /api/deals/:dealId/comments` - Create comment (requires auth)

## Database Schema

### Users
- Authentication and profile data
- Reputation tracking

### Categories
- Deal categorization (Electronics, Fashion, etc.)

### Deals
- Product information
- Pricing and discounts
- Vote counts
- Expiration tracking

### Votes
- Individual user votes
- Prevents duplicate voting

### Comments
- Threaded discussions
- Reply support

## Development

View database in Drizzle Studio:
```bash
npm run db:studio
```

## Demo Accounts

After seeding, you can use these accounts:

- **Email**: demo@deals.com / **Password**: password123
- **Email**: buyer@deals.com / **Password**: password123
