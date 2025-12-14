# Deals App - Slickdeals for India

A full-stack deals aggregation platform built for the Indian market, similar to Slickdeals.

## Features

### Current Features
- **User Authentication**: Signup, login, JWT-based auth
- **Deal Management**: Create, browse, vote on deals
- **Categories**: Organized deal categories (Electronics, Fashion, etc.)
- **Voting System**: Upvote/downvote deals
- **Smart Filtering**: Filter by category, tabs (Frontpage/Popular/New)
- **Search**: Full-text search across deals
- **Comments**: Discuss deals with threaded comments (backend ready)
- **Reputation System**: User reputation tracking
- **Deal Scoring**: Smart scoring algorithm for deal ranking
- **Responsive UI**: Beautiful gradient design with smooth UX

### Tech Stack

**Frontend:**
- React 19 with TypeScript
- Vite for build tooling
- Context API for state management
- Custom API client with fetch

**Backend:**
- Node.js + Express
- PostgreSQL database
- Drizzle ORM
- JWT authentication
- Zod validation

## Project Structure

```
deals-app/
├── frontend/          # React frontend
│   ├── src/
│   │   ├── api/       # API client & endpoints
│   │   ├── components/ # React components
│   │   ├── context/   # React context (Auth)
│   │   ├── types.ts   # TypeScript types
│   │   └── App.tsx    # Main app component
│   └── package.json
│
└── backend/           # Express backend
    ├── src/
    │   ├── controllers/ # Request handlers
    │   ├── routes/     # API routes
    │   ├── models/     # (future)
    │   ├── middleware/ # Auth middleware
    │   ├── db/         # Database schema & connection
    │   ├── utils/      # Helper functions
    │   ├── config/     # Environment config
    │   └── index.ts    # Server entry point
    └── package.json
```

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Backend Setup

1. **Navigate to backend:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create PostgreSQL database:**
   ```bash
   createdb deals_db
   ```

4. **Configure environment:**
   ```bash
   cp .env.example .env
   ```

   Edit `.env`:
   ```env
   PORT=3001
   DATABASE_URL=postgres://user:password@localhost:5432/deals_db
   JWT_SECRET=your-super-secret-key-change-this
   NODE_ENV=development
   FRONTEND_URL=http://localhost:5173
   ```

5. **Run migrations:**
   ```bash
   npm run db:generate
   npm run db:migrate
   ```

6. **Seed database:**
   ```bash
   tsx src/seed.ts
   ```

7. **Start backend:**
   ```bash
   npm run dev
   ```

   Backend runs on `http://localhost:3001`

### Frontend Setup

1. **Navigate to frontend:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment:**
   ```bash
   cp .env.example .env
   ```

   Edit `.env`:
   ```env
   VITE_API_URL=http://localhost:3001/api
   ```

4. **Start frontend:**
   ```bash
   npm run dev
   ```

   Frontend runs on `http://localhost:5173`

### Demo Accounts

After seeding the database, use these credentials:

- **Email**: demo@deals.com
  **Password**: password123

- **Email**: buyer@deals.com
  **Password**: password123

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create account
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user (auth required)

### Deals
- `GET /api/deals` - List deals (supports filtering)
- `GET /api/deals/:id` - Get single deal
- `POST /api/deals` - Create deal (auth required)
- `POST /api/deals/:id/vote` - Vote on deal (auth required)

### Categories
- `GET /api/categories` - List categories
- `POST /api/categories` - Create category (auth required)

### Comments
- `GET /api/deals/:dealId/comments` - Get comments
- `POST /api/deals/:dealId/comments` - Create comment (auth required)

## Development

### Database Management

**Drizzle Studio** (visual database browser):
```bash
cd backend
npm run db:studio
```

**Generate new migration:**
```bash
npm run db:generate
```

**Run migrations:**
```bash
npm run db:migrate
```

### Building for Production

**Backend:**
```bash
cd backend
npm run build
npm start
```

**Frontend:**
```bash
cd frontend
npm run build
npm run preview
```

## Future Enhancements

- [ ] Image uploads for deals (Cloudinary integration ready)
- [ ] Deal expiration notifications
- [ ] Email notifications for hot deals
- [ ] Price history tracking
- [ ] Affiliate link management
- [ ] Admin dashboard
- [ ] User profiles page
- [ ] Deal alerts and saved searches
- [ ] Mobile app (React Native)
- [ ] Social sharing
- [ ] Deal verification system

## Architecture Decisions

### Why Drizzle ORM?
- Type-safe queries
- Excellent TypeScript support
- Lightweight and fast
- Great migration tooling

### Why PostgreSQL?
- Robust relational data
- Full-text search capabilities
- JSON support for flexibility
- Proven scalability

### Why Context API?
- Simple state management
- No extra dependencies
- Perfect for auth state
- Easy to extend to Redux/Zustand later

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - feel free to use this project for learning or commercial purposes!

## Support

For issues or questions, please open an issue on GitHub.

---

Built with ❤️ for the Indian deals community
