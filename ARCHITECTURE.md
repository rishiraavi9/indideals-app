# Architecture Overview - DesiDealsAI

**Domain**: desidealsai.com
**Last Updated**: December 23, 2025
**Version**: 2.7.0 (AI-Powered Deal Platform with Cost-Free AI Features, i18n, PWA & Mobile-First Architecture)

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            Browser / Mobile                              │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │              React Frontend (Port 5174/5177)                    │    │
│  │                                                                  │    │
│  │  ├─ Components                                                  │    │
│  │  │  ├─ App.tsx (React Router setup)  🔄 UPDATED               │    │
│  │  │  ├─ Layout.tsx (Header + Footer wrapper)  🎨 NEW           │    │
│  │  │  ├─ Header.tsx (reusable header)  🎨 NEW                   │    │
│  │  │  ├─ Footer.tsx (reusable footer)  🎨 NEW                   │    │
│  │  │  ├─ HomePage.tsx (main page)  🎨 UPDATED                   │    │
│  │  │  ├─ DealPage.tsx (full page view)  🎨 NEW                  │    │
│  │  │  ├─ CompactDealCard.tsx (Slickdeals UI)  🎨 UPDATED        │    │
│  │  │  ├─ PostDealModal.tsx                                       │    │
│  │  │  ├─ AuthModal.tsx                                           │    │
│  │  │  ├─ AlertsManager.tsx  🔔 NEW                               │    │
│  │  │  └─ ProfileSettings.tsx                                     │    │
│  │  │                                                              │    │
│  │  ├─ Context                                                     │    │
│  │  │  ├─ AuthContext (JWT + refresh tokens)  🔐 ENHANCED        │    │
│  │  │  └─ AlertsContext  🔔 NEW                                   │    │
│  │  │                                                              │    │
│  │  └─ API Client                                                  │    │
│  │     ├─ client.ts (base API client with auth)  🔐              │    │
│  │     ├─ auth.ts (login, signup, refresh, logout)  🔐           │    │
│  │     ├─ deals.ts (CRUD, vote, activity tracking)               │    │
│  │     ├─ categories.ts                                           │    │
│  │     ├─ comments.ts                                             │    │
│  │     ├─ search.ts (Elasticsearch)  ⚡                            │    │
│  │     ├─ affiliate.ts (click tracking)  💰 NEW                  │    │
│  │     ├─ alerts.ts (subscribe, manage)  🔔 NEW                   │    │
│  │     └─ gdpr.ts (export, delete)  🔒 NEW                        │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                              ↕ HTTPS/JSON                               │
└─────────────────────────────────────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                    Express API Server (Port 3001)                        │
│                     🔒 PRODUCTION HARDENED                               │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │                   Security Middleware                           │    │
│  │  ├─ Helmet (Security Headers)  🔒 NEW                          │    │
│  │  │  ├─ HSTS (Force HTTPS)                                      │    │
│  │  │  ├─ CSP (Content Security Policy)                           │    │
│  │  │  ├─ X-Frame-Options (Clickjacking)                          │    │
│  │  │  └─ X-Content-Type-Options                                  │    │
│  │  │                                                              │    │
│  │  ├─ CORS Configuration  🔒 UPDATED                             │    │
│  │  │  ├─ Whitelisted origins (ports 5173, 5174, 5176, 5177)     │    │
│  │  │  └─ Credentials support enabled                            │    │
│  │  │                                                              │    │
│  │  ├─ Rate Limiting  ⚡ ENHANCED                                  │    │
│  │  │  ├─ Memory-based (single instance)                          │    │
│  │  │  └─ Redis-based (multi-instance)  💾 NEW                    │    │
│  │  │     ├─ API: 100 req/15min                                   │    │
│  │  │     ├─ Auth: 5 req/15min                                    │    │
│  │  │     ├─ Search: 20 req/1min                                  │    │
│  │  │     └─ Deal Creation: 10/hour                               │    │
│  │  │                                                              │    │
│  │  ├─ Input Sanitization (DOMPurify)  🔒 NEW                     │    │
│  │  ├─ Body Size Limits (10kb)  🔒 NEW                            │    │
│  │  ├─ CORS (Strict Whitelist)  🔒 ENHANCED                       │    │
│  │  ├─ Cookie Parser                                              │    │
│  │  └─ JWT Authentication  🔐 ENHANCED                             │    │
│  │     ├─ Access tokens (15min)                                   │    │
│  │     └─ Refresh tokens (7 days)                                 │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                                  ↓                                       │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │                        Routes                                   │    │
│  │                                                                  │    │
│  │  Authentication & User Management                               │    │
│  │  ├─ /api/auth/signup                                           │    │
│  │  ├─ /api/auth/login                                            │    │
│  │  ├─ /api/auth/refresh  🔐 NEW                                  │    │
│  │  ├─ /api/auth/logout  🔐 NEW                                   │    │
│  │  ├─ /api/auth/logout-all  🔐 NEW                               │    │
│  │  ├─ /api/auth/me                                               │    │
│  │  ├─ /api/auth/forgot-password  📧 NEW                          │    │
│  │  ├─ /api/auth/reset-password  📧 NEW                           │    │
│  │  ├─ /api/auth/verify-email  📧 NEW                             │    │
│  │  └─ /api/auth/send-verification  📧 NEW                        │    │
│  │                                                                  │    │
│  │  Deals & Content                                                │    │
│  │  ├─ /api/deals (list, create, get, update, delete)            │    │
│  │  ├─ /api/deals/:id/vote                                        │    │
│  │  ├─ /api/deals/:id/comments                                    │    │
│  │  ├─ /api/categories                                            │    │
│  │  └─ /api/comments/:id/vote                                     │    │
│  │                                                                  │    │
│  │  Search & Discovery                                             │    │
│  │  ├─ /api/search/deals  ⚡                                       │    │
│  │  └─ /api/search/autocomplete  ⚡                                │    │
│  │                                                                  │    │
│  │  Alerts System  🔔 NEW                                          │    │
│  │  ├─ /api/alerts (create, list, update, delete)                │    │
│  │  ├─ /api/alerts/:id/notifications                              │    │
│  │  └─ /api/alerts/:id/test                                       │    │
│  │                                                                  │    │
│  │  GDPR & Privacy  🔒 NEW                                         │    │
│  │  ├─ /api/gdpr/export (data export)                            │    │
│  │  ├─ /api/gdpr/delete-account                                   │    │
│  │  └─ /api/gdpr/data-processing-info                            │    │
│  │                                                                  │    │
│  │  Health & Monitoring  💚 NEW                                    │    │
│  │  ├─ /health (comprehensive)                                    │    │
│  │  ├─ /health/live (liveness probe)                              │    │
│  │  └─ /health/ready (readiness probe)                            │    │
│  │                                                                  │    │
│  │  Other Services                                                 │    │
│  │  ├─ /api/scraper (deal scraping)                               │    │
│  │  ├─ /api/affiliate (tracking)                                  │    │
│  │  └─ /api/auth/google|facebook (OAuth)                          │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                                  ↓                                       │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │                      Controllers                                │    │
│  │  ├─ auth.controller.ts  🔐 ENHANCED                            │    │
│  │  ├─ deals.controller.ts (+ alert triggers)  🔔                 │    │
│  │  ├─ categories.controller.ts                                   │    │
│  │  ├─ comments.controller.ts                                     │    │
│  │  ├─ search.controller.ts  ⚡                                    │    │
│  │  ├─ alerts.controller.ts  🔔 NEW                               │    │
│  │  ├─ password-reset.controller.ts  📧 NEW                       │    │
│  │  └─ gdpr.controller.ts  🔒 NEW                                 │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                                  ↓                                       │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │                  Services & Business Logic                      │    │
│  │                                                                  │    │
│  │  ├─ Drizzle ORM (PostgreSQL)                                   │    │
│  │  │  ├─ Type-safe queries                                       │    │
│  │  │  ├─ Relations & joins                                       │    │
│  │  │  └─ Migrations                                              │    │
│  │  │                                                              │    │
│  │  ├─ elasticsearch.service.ts  ⚡                                │    │
│  │  │  ├─ Index management (deals index)                          │    │
│  │  │  ├─ Full-text search (fuzzy matching)                       │    │
│  │  │  ├─ Autocomplete (prefix matching)                          │    │
│  │  │  ├─ Aggregations (categories, price ranges)                 │    │
│  │  │  └─ Authentication  🔒 NEW                                  │    │
│  │  │                                                              │    │
│  │  ├─ cache.service.ts  💾                                        │    │
│  │  │  ├─ Cache-aside pattern                                     │    │
│  │  │  ├─ Redis client management                                 │    │
│  │  │  ├─ TTL configurations (60s-3600s)                          │    │
│  │  │  ├─ Cache invalidation (wildcard patterns)                  │    │
│  │  │  └─ Password authentication  🔒 NEW                         │    │
│  │  │                                                              │    │
│  │  ├─ alert-matcher.service.ts  🔔 NEW                           │    │
│  │  │  ├─ Match deals to alert criteria                           │    │
│  │  │  ├─ Duplicate prevention                                    │    │
│  │  │  ├─ Instant notifications                                   │    │
│  │  │  └─ Daily/weekly digest processing                          │    │
│  │  │                                                              │    │
│  │  ├─ email.service.ts  📧 ENHANCED                              │    │
│  │  │  ├─ SMTP configuration (SendGrid compatible)                │    │
│  │  │  ├─ Password reset emails                                   │    │
│  │  │  ├─ Email verification                                      │    │
│  │  │  ├─ Welcome emails                                          │    │
│  │  │  └─ Deal alert notifications  🔔 NEW                        │    │
│  │  │                                                              │    │
│  │  ├─ tokens.service.ts  🔐 NEW                                  │    │
│  │  │  ├─ Generate access tokens (JWT, 15min)                     │    │
│  │  │  ├─ Generate refresh tokens (crypto, 7 days)                │    │
│  │  │  ├─ Verify & validate tokens                                │    │
│  │  │  ├─ Revoke tokens (logout)                                  │    │
│  │  │  └─ Cleanup expired tokens                                  │    │
│  │  │                                                              │    │
│  │  └─ logger.service.ts  📊 NEW                                  │    │
│  │     ├─ Winston structured logging                              │    │
│  │     ├─ File rotation (error, security, combined)               │    │
│  │     ├─ Auth event logging                                      │    │
│  │     └─ Security event tracking                                 │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │                   Middleware & Utilities                        │    │
│  │  ├─ auth.middleware.ts (JWT verification)                      │    │
│  │  ├─ sanitize.middleware.ts  🔒 NEW                             │    │
│  │  ├─ redis-rate-limit.middleware.ts  ⚡ NEW                     │    │
│  │  ├─ health.utils.ts  💚 NEW                                    │    │
│  │  └─ tokens.utils.ts  🔐 NEW                                    │    │
│  └────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
     ↓                    ↓                    ↓                ↓
┌──────────────┐  ┌──────────────────┐  ┌─────────────┐  ┌─────────────┐
│  PostgreSQL  │  │  Elasticsearch   │  │    Redis    │  │    SMTP     │
│   (5432)     │  │     (9200)       │  │   (6379)    │  │  Service    │
│              │  │                  │  │             │  │             │
│  Source of   │  │  🔒 Authenticated│  │ 🔒 Password │  │  SendGrid/  │
│  Truth       │  │     (elastic)    │  │   Protected │  │   Gmail     │
│              │  │                  │  │             │  │             │
│  Tables:     │  │  Indexes:        │  │  Caches:    │  │  Emails:    │
│  ├─ users    │  │  └─ deals        │  │  ├─ Search  │  │  ├─ Alerts  │
│  ├─ deals    │  │     ├─ Full-text│  │  ├─ Deals   │  │  ├─ Reset   │
│  ├─categories│  │     ├─ Autocmpl │  │  ├─ Aggrs   │  │  └─ Verify  │
│  ├─ votes    │  │     ├─ Facets   │  │  └─ Rate    │  └─────────────┘
│  ├─ comments │  │     └─ Fuzzy    │  │     Limits  │
│  ├─ activity │  │                  │  │             │
│  ├─ affilit  │  │  Kibana (5601)  │  │  TTL:       │
│  ├─ alerts🔔│  │  (Dashboard)     │  │  60s-3600s  │
│  ├─ alert_  │  │                  │  │             │
│  │   notifs │  │                  │  │  Invalid:   │
│  ├─ refresh │  │                  │  │  on writes  │
│  │   tokens │  │                  │  │             │
│  ├─ password│  │                  │  │             │
│  │   reset  │  │                  │  │             │
│  └─ email_  │  │                  │  │             │
│     verify  │  │                  │  │             │
└──────────────┘  └──────────────────┘  └─────────────┘
```

---

## Frontend Architecture 🎨

### Component Hierarchy & Routing

```
BrowserRouter (main.tsx)
  └─ AuthProvider
      └─ App.tsx (Router configuration)
          ├─ Route: "/" → HomePage
          │   └─ (Header + Content + Footer embedded)  ⏳ TODO: Refactor to use Layout
          │
          └─ Route: "/deal/:dealId" → DealPage
              └─ Layout component
                  ├─ Header (reusable)
                  ├─ Main content (deal details + comments)
                  └─ Footer (reusable)
```

### Layout Pattern (DRY Principle)

**Design Pattern**: Layout wrapper component for consistent header/footer across pages

```typescript
// Layout.tsx - Wrapper component
interface LayoutProps {
  children: ReactNode;
  onPostDealClick?: () => void;
  onAnalyticsClick?: () => void;
  onProfileClick?: () => void;
  onLoginClick?: () => void;
}

// Usage in DealPage.tsx
<Layout onPostDealClick={...} onLoginClick={...}>
  {/* Page content */}
</Layout>
```

**Benefits**:
- ✅ DRY (Don't Repeat Yourself) - No header/footer duplication
- ✅ Consistent UI across all pages
- ✅ Easy to update global elements (one place)
- ✅ Props-based customization for page-specific behaviors

### Reusable Components

**Header.tsx** - Global navigation and search
- Search bar with autocomplete (300ms debounce)
- User authentication state (login/logout)
- Navigation actions (Post Deal, Analytics, Profile)
- User reputation badge display

**Footer.tsx** - Site-wide footer
- Quick links (Home, Categories, Deals)
- Support links (Contact, FAQ, Report)
- Legal links (Privacy Policy, Terms, GDPR)
- Social media links
- Copyright and disclaimer

**CompactDealCard.tsx** - Slickdeals-style deal card
- Hover-based voting UI (👍 expands to show 👍👎)
- 4-icon action layout: Vote | Comment | Share | Cart
- Transparent gray icons (#9ca3af) with hover effect (#6b7280)
- Web Share API with clipboard fallback
- Affiliate link tracking before redirect
- Login requirement for voting
- Anonymous tracking on view/upvote 🎯 NEW

**Ad Sidebar Component** 🎯 NEW
- Three 300px-wide ad slots (sticky positioning)
- Gradient backgrounds (purple, pink, orange)
- CTA buttons for engagement
- Persistent visibility while scrolling
- Easy to integrate with ad networks (Google AdSense, etc.)

### Routing Strategy

**React Router v6** - Client-side navigation

```typescript
// Routes
GET  /                    → HomePage (deal listing)
GET  /deal/:dealId        → DealPage (full deal view)
GET  /search?q=...        → SearchResultsPage (search results)
GET  /user/:userId        → UserProfilePage (user profile)
```

**Navigation Features**:
- `useNavigate()` for programmatic navigation
- `useParams()` for URL parameters
- `useSearchParams()` for query strings
- No page reload on navigation (SPA)

### Deal Page Architecture

**Full Page Design** (vs previous modal overlay):

```
┌─────────────────────────────────────────────────────┐
│ Header (consistent with HomePage)                   │
├──────────────────────────┬──────────────────────────┤
│                          │                          │
│  Deal Content            │  Ad Zone 1               │
│  - Image                 │  (300x250)               │
│  - Title                 │                          │
│  - Price                 │  ----------------------  │
│  - Description           │                          │
│  - Actions (vote, share) │  Ad Zone 2               │
│  - Comments section      │  (300x600 sticky)        │
│                          │                          │
└──────────────────────────┴──────────────────────────┘
│ Footer (consistent with HomePage)                   │
└─────────────────────────────────────────────────────┘
```

**Benefits over Modal**:
- ✅ Dedicated URL for sharing (SEO-friendly)
- ✅ More space for content and ads
- ✅ Better user experience (no overlay)
- ✅ Browser back button works correctly
- ✅ Consistent header/footer navigation

### Slickdeals-Style UI Design

**Visual Design Principles**:
- Clean, minimal button styling (no backgrounds on actions)
- Icon-first approach (emojis for visual clarity)
- Hover states for interactivity feedback
- Gray color scheme (#9ca3af → #6b7280)
- Vote state colors: green (#10b981), red (#dc2626)

**4-Icon Action Layout**:
```
┌──────────────────────────────────────────────┐
│  👍 74  |  💬 0  |  ↗  |           🛒        │
│  Vote   |Comment |Share|          Cart      │
└──────────────────────────────────────────────┘
```

**Hover Interaction**:
- Default: Single thumbs up with score
- On hover: Expands to show both 👍 and 👎 buttons
- Always shows comment count (even if 0)
- Share uses Web Share API (mobile) or clipboard (desktop)

### State Management

**Context API Pattern**:
- `AuthContext` - User authentication state, JWT tokens
- `AlertsContext` - Deal alerts management (future)

**Local State**:
- `useState` for component-level state
- `useEffect` for side effects (data fetching, subscriptions)
- `useRef` for DOM references (search input, autocomplete)

### API Integration

**Centralized API Client** (`api/client.ts`):
```typescript
class ApiClient {
  private baseUrl: string;
  private token: string | null;

  setToken(token: string | null) { /* JWT token management */ }

  private async request<T>(endpoint: string, options: RequestInit): Promise<T> {
    // Adds Authorization header
    // Handles errors
    // Returns typed response
  }

  get<T>(endpoint: string): Promise<T>
  post<T>(endpoint: string, data?: unknown): Promise<T>
  put<T>(endpoint: string, data?: unknown): Promise<T>
  delete<T>(endpoint: string): Promise<T>
}
```

**API Modules**:
- `deals.ts` - Deal CRUD, voting, activity tracking
- `auth.ts` - Login, signup, logout, refresh
- `search.ts` - Elasticsearch queries, autocomplete
- `comments.ts` - Comment CRUD, voting
- `affiliate.ts` - Click tracking, URL redirection

### Performance Optimizations

**Debounced Search**:
```typescript
useEffect(() => {
  const timer = setTimeout(() => {
    if (searchQuery.length >= 2) {
      searchApi.autocomplete(searchQuery).then(setSuggestions);
    }
  }, 300); // 300ms debounce
  return () => clearTimeout(timer);
}, [searchQuery]);
```

**Conditional Rendering**:
- Show skeleton loaders during data fetch
- Lazy load images (native `loading="lazy"`)
- Virtualization for long lists (future enhancement)

**Event Optimization**:
- `stopPropagation()` to prevent card click when clicking buttons
- Inline hover handlers for better performance (no re-renders)

### Accessibility Considerations

- ✅ Semantic HTML elements
- ✅ ARIA labels for icon buttons (`title` attributes)
- ✅ Keyboard navigation support
- ✅ Color contrast compliance (gray #9ca3af on white)
- ⏳ Screen reader announcements (future enhancement)
- ⏳ Focus management (future enhancement)

### Pending Refactoring

**HomePage.tsx** ⏳ TODO:
- Currently 966 lines (too large)
- Header/Footer embedded (violates DRY)
- Needs to be refactored to use Layout component
- Marked with TODO comment at line 3

**Estimated Effort**: 2-3 hours to safely refactor without breaking existing functionality

---

## Data Flow Diagrams

### 1. User Authentication Flow (Enhanced)

```
Browser → POST /api/auth/login
          { email, password }
              ↓
     🔒 Rate Limiter (5 req/15min)
              ↓
     🔒 Input Sanitization
              ↓
     Auth Controller
              ↓
     ┌─ Check user exists
     ├─ Timing attack prevention (always hash)
     ├─ Verify password (bcrypt)
     └─ If valid:
         ├─ Generate access token (JWT, 15min)  🔐
         ├─ Generate refresh token (crypto, 7 days)  🔐
         ├─ Store refresh token in DB
         ├─ Log auth success  📊
         └─ Return both tokens
              ↓
     Browser stores tokens
              ↓
     Subsequent requests:
     Authorization: Bearer <access-token>
              ↓
     When access token expires:
     POST /api/auth/refresh
     { refreshToken }
              ↓
     New access + refresh tokens
```

### 2. Deal Creation + Alert Notification Flow

```
Browser → POST /api/deals
          { title, price, ... }
              ↓
     🔐 JWT Authentication
              ↓
     ⚡ Rate Limiter (10 deals/hour)
              ↓
     🔒 Input Sanitization
              ↓
     Deals Controller:
     ├─ Validate input (Zod)
     ├─ Calculate discount %
     ├─ Insert into PostgreSQL
     └─ Deal created with ID
              ↓
     Async operations (parallel):
              ↓
     ┌──────────────┬──────────────────┬─────────────────────┐
     │              │                  │                     │
     ↓              ↓                  ↓                     ↓
  Index in    Invalidate        Process Alerts      Track Activity
  Elasticsearch   Cache         🔔 NEW
     │              │                  │                     │
     ├─ Full-text   ├─ deals:*        ├─ Find active alerts │
     ├─ Autocmpl    ├─ search:*       ├─ Match criteria:    │
     └─ Facets      └─ aggr:*         │   ├─ Keyword        │
                                      │   ├─ Category       │
                                      │   ├─ Min discount   │
                                      │   ├─ Max price      │
                                      │   └─ Merchant       │
                                      │                     │
                                      ├─ Check duplicates   │
                                      ├─ Send email 📧      │
                                      ├─ Record notific     │
                                      └─ Update alert stats │
                                                ↓
                                    Email sent to subscribers
```

### 3. Search Flow (with Caching)

```
Browser → GET /api/search/deals?q=laptop
              ↓
     ⚡ Rate Limiter (20 req/min)
              ↓
     Cache Check:
     Key: search:laptop:page:1
              ↓
     Cache HIT? ─YES→ Return cached results (60s TTL)
        │
        NO
        ↓
     Elasticsearch Query:
     ├─ Full-text search on title/description
     ├─ Fuzzy matching (typo tolerance)
     ├─ Aggregations (categories, price ranges)
     └─ Pagination
              ↓
     Store in Redis (60s TTL)
              ↓
     Return results to browser
```

### 4. Alert Subscription Flow

```
Browser → POST /api/alerts
          { keyword: "sony headphones",
            minDiscount: 20,
            maxPrice: 500000 }
              ↓
     🔐 JWT Authentication
              ↓
     🔒 Input Sanitization
              ↓
     Alerts Controller:
     ├─ Validate input (Zod)
     ├─ Check duplicate keyword
     ├─ Create alert in DB
     └─ Return alert config
              ↓
     Browser shows: "Alert created!"
              ↓
     When matching deal posted:
              ↓
     Alert Matcher Service:
     ├─ Checks all active "instant" alerts
     ├─ Matches deal to alert criteria
     ├─ Prevents duplicates
     ├─ Sends HTML email 📧
     ├─ Records notification
     └─ Updates alert stats
              ↓
     User receives email:
     "🔥 Deal Alert: Sony WH-1000XM5 - ₹19,999"
```

### 5. Anonymous Personalization Flow 🎯 NEW

```
User Action (view/click/upvote)
              ↓
     trackBrowsingActivity()
     (Client-side, no server call)
              ↓
     localStorage.getItem('indiaDeals_browsingHistory')
              ↓
     Add new activity item:
     {
       dealId: "abc123",
       categoryId: "electronics",
       timestamp: 1734192000000,
       activityType: "upvote"  // or view/click/save
     }
              ↓
     Keep last 50 items (rolling window)
              ↓
     Filter items > 30 days old
              ↓
     localStorage.setItem('indiaDeals_browsingHistory', updated)
              ↓
     Next page load:
     ├─ getPreferredCategories()
     ├─ Calculate weighted scores:
     │  ├─ upvote: 3x weight
     │  ├─ save: 2.5x weight
     │  ├─ click: 2x weight
     │  └─ view: 1x weight
     ├─ Sort by score
     └─ Return top 5 categories
              ↓
     Load personalized deals:
     ├─ Has browsing history? → GET /api/deals?tab=personalized&categories=electronics,fashion
     └─ No history? → GET /api/deals?tab=popular (fallback)
              ↓
     Display "Just For You" with smart badge:
     ├─ Logged in: "Based on your activity"
     ├─ Anonymous with history: "Based on your browsing"
     └─ New user: "Popular deals"
```

**Privacy Features**:
- ✅ All data stored in localStorage (client-side only)
- ✅ Auto-expires data > 30 days
- ✅ No server tracking for anonymous users
- ✅ User can clear anytime via browser storage
- ✅ Anonymous ID format: `anon_timestamp_randomstring`

---

### 6. GDPR Data Export Flow

```
Browser → GET /api/gdpr/export
              ↓
     🔐 JWT Authentication
              ↓
     GDPR Controller:
     ├─ Fetch user profile
     ├─ Fetch user's deals
     ├─ Fetch user's comments
     ├─ Fetch user's votes
     ├─ Fetch user activity
     ├─ Fetch affiliate clicks
     ├─ Remove sensitive data (passwordHash)
     └─ Include data retention policy
              ↓
     📊 Log security event
              ↓
     Return complete JSON export
              ↓
     Browser downloads data
```

---

## Database Schema (Enhanced)

### Core Tables

**users** - User accounts
- id, email, username, passwordHash
- avatarUrl, reputation
- emailVerified 🔐 NEW
- googleId, facebookId (OAuth)
- createdAt, updatedAt

**deals** - Deal listings
- id, title, description
- price, originalPrice, discountPercentage
- merchant, url, imageUrl
- userId (FK), categoryId (FK)
- upvotes, downvotes, commentCount, viewCount
- isExpired, festiveTags, seasonalTag
- createdAt, updatedAt, expiresAt

**categories** - Deal categories
- id, name, slug, description, icon

**votes** - User votes on deals
- id, userId (FK), dealId (FK)
- voteType (1 or -1)

**comments** - Comments on deals
- id, content, userId (FK), dealId (FK)
- parentId (FK, for replies)
- upvotes, downvotes

**comment_votes** - User votes on comments
- id, userId (FK), commentId (FK)
- voteType (1 or -1)

**user_activity** - Activity tracking
- id, userId (FK), dealId (FK), categoryId (FK)
- activityType (view, click, vote, comment)

**affiliate_clicks** - Affiliate tracking
- id, dealId (FK), userId (FK)
- anonymousId, ipAddress, userAgent
- merchant, affiliateUrl
- converted, convertedAt, estimatedCommission

### Authentication Tables 🔐 NEW

**refresh_tokens** - JWT refresh tokens
- id, userId (FK), token (unique)
- expiresAt, createdAt, revoked
- ipAddress, userAgent (device tracking)

**password_reset_tokens** - Password reset
- id, userId (FK), token (unique)
- expiresAt, createdAt, used

**email_verification_tokens** - Email verification
- id, userId (FK), token (unique)
- expiresAt, createdAt, used

### Alerts System 🔔 NEW

**alerts** - User alert subscriptions
- id, userId (FK)
- keyword (required)
- categoryId (FK, optional)
- minDiscount, maxPrice, merchant (optional)
- isActive, frequency (instant/daily/weekly)
- lastNotified, notificationCount
- createdAt, updatedAt

**alert_notifications** - Alert history
- id, alertId (FK), dealId (FK)
- sentAt, emailStatus (sent/failed/bounced)

---

## Technology Stack

### Backend
- **Framework**: Express.js (Node.js)
- **Language**: TypeScript
- **ORM**: Drizzle ORM
- **Database**: PostgreSQL 14+
- **Search**: Elasticsearch 8.11.0
- **Cache**: Redis 7+
- **Authentication**: JWT + Refresh Tokens 🔐
- **Email**: Nodemailer (SMTP) 📧
- **Logging**: Winston 📊
- **Validation**: Zod
- **Security**:
  - Helmet (headers) 🔒
  - bcrypt (password hashing)
  - DOMPurify (input sanitization)
  - express-rate-limit / Redis rate limit ⚡

### Frontend
- **Framework**: React 18
- **Language**: TypeScript
- **Build Tool**: Vite
- **Routing**: React Router v6 🎨
- **Styling**: Inline CSS-in-JS (Slickdeals-inspired)
- **State Management**: Context API (AuthContext)
- **HTTP Client**: Fetch API (Centralized ApiClient)
- **UI Pattern**: Layout wrapper with reusable Header/Footer 🎨
- **Mobile Framework**: Capacitor 6 (iOS & Android) 📱 NEW
  - Push Notifications (@capacitor/push-notifications)
  - Native Share (@capacitor/share)
  - Haptic Feedback (@capacitor/haptics)
  - Status Bar (@capacitor/status-bar)
  - Splash Screen (@capacitor/splash-screen)
  - App State Management (@capacitor/app)

### DevOps & Infrastructure
- **Containerization**: Docker, Docker Compose
- **Process Manager**: PM2 (for VPS deployments)
- **Reverse Proxy**: Nginx
- **SSL**: Let's Encrypt (Certbot)
- **Monitoring**: Health endpoints, Winston logs
- **Web Deployment**:
  - Render.com (recommended)
  - Railway.app
  - Traditional VPS (DigitalOcean, AWS)
- **Mobile Deployment**: 📱 IMPLEMENTED
  - iOS: Apple App Store (Capacitor + Xcode or EAS Build)
  - Android: Google Play Store (Capacitor + GitHub Actions CI/CD)
  - Automated builds via GitHub Actions (no local Android Studio needed)
  - See [MOBILE_APP_SETUP.md](MOBILE_APP_SETUP.md) and [MOBILE_DEPLOYMENT_GUIDE.md](MOBILE_DEPLOYMENT_GUIDE.md)

---

## Performance Optimizations

### 1. Caching Strategy 💾
```typescript
// Cache layers
├─ Search Results (60s TTL)
├─ Deal Details (5min TTL)
├─ Categories List (30min TTL)
├─ User Profiles (30min TTL)
└─ Aggregations (5min TTL)

// Invalidation triggers
├─ New deal created → Invalidate deals:*, search:*, aggr:*
├─ Deal updated → Invalidate deal:{id}, search:*, aggr:*
├─ Deal deleted → Invalidate deal:{id}, deals:*, search:*
└─ Vote changed → Invalidate deal:{id}
```

### 2. Database Indexing
```sql
-- All critical queries are indexed
├─ users: email, username, googleId, facebookId
├─ deals: userId, categoryId, createdAt, merchant, isFeatured
├─ votes: (userId, dealId) compound
├─ comments: dealId, userId, parentId
├─ alerts: userId, keyword, categoryId, isActive
└─ alert_notifications: (alertId, dealId) compound
```

### 3. Rate Limiting ⚡
```typescript
// Multi-tier rate limiting
├─ API Level: 100 req/15min (all endpoints)
├─ Auth: 5 req/15min (login/signup)
├─ Search: 20 req/1min
└─ Deal Creation: 10 deals/hour per user

// Redis-based (multi-instance compatible)
├─ Sliding window algorithm
├─ Distributed counting
└─ Automatic cleanup
```

### 4. Async Processing
```typescript
// Non-blocking operations
├─ Elasticsearch indexing → Async
├─ Cache invalidation → Async
├─ Alert processing → Async
├─ Email sending → Async
└─ Activity tracking → Async
```

---

## Security Features 🔒

### 1. Authentication & Authorization
- ✅ JWT access tokens (15 min expiry)
- ✅ Refresh tokens (7 day expiry, revocable)
- ✅ Logout from all devices capability
- ✅ Password reset with secure tokens (1 hour expiry)
- ✅ Email verification
- ✅ Timing attack prevention in login
- ✅ Strong password requirements (8+ chars, complexity)

### 2. Input Validation & Sanitization
- ✅ Zod schema validation (type-safe)
- ✅ DOMPurify sanitization (XSS prevention)
- ✅ Request body size limits (10kb)
- ✅ SQL injection prevention (Drizzle ORM parameterized queries)

### 3. Headers & Network Security
- ✅ Helmet.js security headers
- ✅ HSTS (Force HTTPS in production)
- ✅ Content Security Policy (CSP)
- ✅ X-Frame-Options (Clickjacking prevention)
- ✅ X-Content-Type-Options (MIME sniffing prevention)
- ✅ CORS with strict whitelist

### 4. Rate Limiting & DoS Protection
- ✅ Memory-based rate limiting (single instance)
- ✅ Redis-based rate limiting (multi-instance)
- ✅ Different limits per endpoint type
- ✅ Failed login tracking

### 5. Data Protection
- ✅ Password hashing (bcrypt with salt)
- ✅ Token encryption (crypto.randomBytes)
- ✅ Database credentials secured in environment variables
- ✅ Redis password protection
- ✅ Elasticsearch authentication

### 6. Logging & Monitoring 📊
- ✅ Structured logging (Winston)
- ✅ Auth event logging (success/failure)
- ✅ Security event tracking
- ✅ Error logging with stack traces (dev only)
- ✅ File rotation (daily logs)

### 7. GDPR Compliance
- ✅ Data export (Article 15 - Right to Access)
- ✅ Account deletion (Article 17 - Right to Erasure)
- ✅ Data transparency (processing information)
- ✅ Smart data anonymization

---

## Scalability Considerations

### Horizontal Scaling
```
┌─────────────────────────────────────────────┐
│         Load Balancer (Nginx/HAProxy)       │
└─────────────────────────────────────────────┘
         │              │              │
    ┌────┴───┐    ┌────┴───┐    ┌────┴───┐
    │ API #1 │    │ API #2 │    │ API #3 │
    └────┬───┘    └────┬───┘    └────┬───┘
         └─────────┬──────────────────┘
                   │
    ┌──────────────┴─────────────────────┐
    │                                    │
┌───┴────┐  ┌──────────┐  ┌────────────┐
│  Redis │  │ Postgres │  │Elasticsearch│
│ (Shared)  │(Primary) │  │  (Cluster) │
└────────┘  └──────────┘  └────────────┘
```

**Features supporting scale:**
- ✅ Stateless API servers (JWT)
- ✅ Redis-based rate limiting (shared state)
- ✅ Redis-based caching (shared state)
- ✅ Refresh tokens in database (shared state)
- ✅ PostgreSQL connection pooling
- ✅ Elasticsearch cluster support

### Vertical Scaling
- Database connection pooling
- Redis memory optimization
- Elasticsearch heap size tuning
- Node.js worker threads (future)

---

## Deployment Architecture

### Production Topology (Recommended)

```
Internet
   ↓
Cloudflare CDN (SSL, DDoS protection)
   ↓
Load Balancer
   ↓
┌─────────────┬─────────────┬─────────────┐
│  API #1     │   API #2    │   API #3    │
│  (Render/   │  (Auto-     │  (Auto-     │
│   Railway)  │   scaling)  │   scaling)  │
└─────────────┴─────────────┴─────────────┘
       ↓             ↓             ↓
┌──────────────────────────────────────────┐
│            Managed Services               │
├──────────────┬───────────────┬───────────┤
│  Supabase/  │    Upstash    │  Elastic  │
│   RDS       │    (Redis)    │   Cloud   │
│ (Postgres)  │               │    (ES)   │
└──────────────┴───────────────┴───────────┘
```

**Managed Services Used:**
- **Database**: Supabase (free tier) or AWS RDS
- **Redis**: Upstash (free tier) or AWS ElastiCache
- **Elasticsearch**: Elastic Cloud or AWS OpenSearch
- **Email**: SendGrid (100 emails/day free)
- **Monitoring**: Built-in health checks + Sentry
- **Logs**: Winston file rotation or CloudWatch

---

## API Response Times (Target)

| Operation | Target | Actual (with cache) |
|-----------|--------|---------------------|
| Login | < 200ms | ~150ms |
| Get Deals | < 100ms | ~50ms (cached) |
| Create Deal | < 300ms | ~200ms |
| Search | < 200ms | ~80ms (cached) |
| Vote | < 100ms | ~60ms |
| Alert Check | Async | Background |
| Email Send | Async | Background |

---

## Environment Variables

See [.env.production.example](backend/.env.production.example) for complete list.

**Critical Variables:**
```env
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://...
JWT_SECRET=<128-char-secret>
REDIS_URL=rediss://...
REDIS_PASSWORD=<strong-password>
ELASTICSEARCH_URL=https://...
ELASTICSEARCH_PASSWORD=<strong-password>
SMTP_HOST=smtp.sendgrid.net
SMTP_USER=apikey
SMTP_PASS=<sendgrid-api-key>
FROM_EMAIL=noreply@yourdomain.com
FRONTEND_URL=https://yourdomain.com
```

---

## Documentation Index

- **[README.md](README.md)** - Getting started, installation
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - This file (system design)
- **[foamy-tinkering-hammock.md](.claude/plans/foamy-tinkering-hammock.md)** - 4-phase roadmap 🚀
- **[FEATURE_FLAGS_GUIDE.md](FEATURE_FLAGS_GUIDE.md)** - Feature flags & phase control 🚩
- **[MOBILE_DEPLOYMENT_GUIDE.md](MOBILE_DEPLOYMENT_GUIDE.md)** - iOS & Android deployment 📱
- **[API_REFERENCE.md](API_REFERENCE.md)** - Complete API documentation
- **[PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md)** - Deployment guide
- **[PRODUCTION_READINESS.md](PRODUCTION_READINESS.md)** - Production checklist
- **[SECURITY_AUDIT.md](SECURITY_AUDIT.md)** - Security analysis
- **[SECURITY_FIXES.md](SECURITY_FIXES.md)** - Security implementation
- **[ALERTS_SYSTEM.md](ALERTS_SYSTEM.md)** - Alerts feature guide
- **[CACHE_TESTING_GUIDE.md](CACHE_TESTING_GUIDE.md)** - Cache testing

---

## Monitoring & Observability

### Health Checks
```
GET /health           - Comprehensive (DB, Redis, ES)
GET /health/live      - Liveness probe (server running)
GET /health/ready     - Readiness probe (ready for traffic)
```

### Logs
```
logs/error.log       - Errors only
logs/security.log    - Auth & security events
logs/combined.log    - All logs
```

### Metrics (Future Enhancement)
- Request duration histograms
- Cache hit/miss rates
- Alert processing times
- Email delivery rates
- Error rates by endpoint

---

## Recent Changes

### v2.5.0 - i18n, PWA & Mobile-First Architecture (December 21, 2025) 🌍📱

**Major Release** - Comprehensive internationalization, Progressive Web App support, and mobile-first UI architecture.

---

### v2.4.1 - Anti-Bot Protection for Scrapers (December 21, 2025) 🛡️

**1. User-Agent Rotation**
- ✅ Pool of 8 different browser User-Agent strings
- ✅ Random selection for each request
- ✅ Includes Chrome, Firefox, Safari, Edge, Mobile browsers

**2. Rate Limiting**
- ✅ 2.5-second delay between requests per domain
- ✅ Per-domain tracking with `Map<string, number>`
- ✅ Automatic wait before each merchant request

**3. Retry with Exponential Backoff**
- ✅ 3 retry attempts for 500/503 errors
- ✅ Exponential backoff: 2s → 4s → 8s
- ✅ Graceful handling of `ECONNRESET` errors

**4. Reduced Scraping Intensity**
- ✅ `dealsPerChannel`: 30 → 15 (reduced)
- ✅ `delayBetweenChannels`: 2000ms → 5000ms (increased)
- ✅ Title extraction fixed for `NUMBER₹` format

**Files Modified:**
- `backend/src/services/affiliate.service.ts`
- `backend/src/config/telegram-channels.ts`
- `backend/src/services/scrapers/telegram-scraper.service.ts`

---

### v2.4.0 - AI-Powered Deal Platform (December 21, 2025) 🤖

**Major Release** - This version adds AI quality scoring, automated deal verification, Telegram scraping, price tracking, wishlist functionality, and a complete UI modernization.

---

### v2.3.0 - Telegram Scraper & Two-Phase Algorithm (December 21, 2025) 📡

**1. Telegram Channel Scraping**
- ✅ Automated deal scraping from multiple Telegram channels
- ✅ Configurable channels in `backend/src/config/telegram-channels.ts`
- ✅ Currently enabled: MahidharZone, iamprasadtech, TechFactsDeals
- ✅ Scheduled via Bull queue (every 2 hours by default)

**2. Two-Phase Scraping Algorithm**
- ✅ Phase 1: Scrape NEW messages (newest first, catches new posts)
- ✅ Phase 2: BACKFILL older messages (continues from oldest known)
- ✅ Boolean flags to enable/disable each phase independently
- ✅ Configurable max pages per phase (10 pages = 500 messages)

**3. Deal Processing Pipeline**
- ✅ URL expansion (amzn.to, fkrt.co → full URLs)
- ✅ Affiliate tag replacement with our tags
- ✅ ML-based deduplication using TF-IDF + cosine similarity
- ✅ Roundup post filtering (skip posts with >2 URLs)
- ✅ Price extraction from merchant pages
- ✅ Product image extraction with fallbacks

**4. ML Deduplication**
- ✅ TF-IDF vectorization of deal titles
- ✅ Cosine similarity scoring (0-100%)
- ✅ Decision logic: >70% similar + better price → replace existing
- ✅ Located in: `backend/src/services/ml-deduplication.service.ts`

**Files Created/Modified:**
- `backend/src/services/scrapers/telegram-scraper.service.ts`
- `backend/src/config/telegram-channels.ts`
- `backend/src/services/ml-deduplication.service.ts`
- `backend/src/services/affiliate.service.ts`
- `backend/src/jobs/telegram-scraper.job.ts`

---

### v2.2.5 - AI Quality Scoring System (December 21, 2025) 🧠

**1. Smart Deal Scoring Algorithm**
- ✅ Multi-factor AI scoring (0-100 scale)
- ✅ Located in: `backend/src/services/ai/deal-quality.service.ts`

**2. Scoring Components (Weighted)**
- ✅ Value Proposition (40%) - Is this actually a good price?
  - Discount quality (tier-based, 0-40 points)
  - Historical price analysis vs median (0-40 points)
  - Absolute savings bonus (₹50k+ savings = 20 points)
- ✅ Authenticity (25%) - Can we trust this deal?
  - Merchant trust score (Amazon/Flipkart = 35 points)
  - Deal verification status (30 points if verified)
  - Completeness check (URL, image, description)
  - Red flags detection (auto-flagged, suspicious discounts)
- ✅ Urgency (20%) - Should user act now?
  - Freshness scoring (posted <2 hours = 40 points)
  - Price trend analysis (dropping = high score)
  - Expiration urgency
- ✅ Social Proof (15%) - Community validation
  - Vote quality (upvote/downvote ratio)
  - Comment engagement
  - View count interest

**3. AI Badges & Reasoning**
- ✅ Auto-generated badges: 💎 Exceptional, 🔥 Hot, ⭐ Great, 👍 Good
- ✅ Context badges: 💰 Best Price, ✅ Verified, ⚡ Act Fast, ❤️ Community Favorite
- ✅ Human-readable reasoning explaining the score

**4. API Endpoints**
- ✅ `GET /api/ai/score/:dealId` - Get AI score for a deal
- ✅ `GET /api/ai/top-deals` - Get top-scoring deals
- ✅ `POST /api/ai/recalculate/:dealId` - Recalculate score

---

### v2.2.4 - Deal Verification System (December 21, 2025) ✅

**1. Automated Verification**
- ✅ URL accessibility check (HEAD/GET with redirects)
- ✅ Price scraping from merchant pages
- ✅ Community signal analysis (downvote ratio)
- ✅ User trust score consideration
- ✅ Located in: `backend/src/services/deal-verifier.service.ts`

**2. Verification Types**
- ✅ `initial` - When deal is first created
- ✅ `periodic` - Scheduled every 6 hours via Bull queue
- ✅ `manual` - Triggered via admin/API

**3. Verification Results**
- ✅ `verified` - URL works, price matches (±5%)
- ✅ `flagged` - URL issues or price mismatch >20%
- ✅ `failed` - URL dead (404/410) or sold out

**4. Merchant-Specific Detection**
- ✅ Amazon: Checks #add-to-cart-button, #availability
- ✅ Flipkart: Checks Add to Cart vs Notify Me buttons
- ✅ Generic: Conservative sold-out text detection

**5. Database Updates**
- ✅ Updates deal: `verified`, `verificationStatus`, `urlAccessible`, `priceMatch`
- ✅ Logs all attempts to `deal_verification_logs` table
- ✅ Updates `price_history` with scraped prices

---

### v2.2.3 - Bull Queue Job System (December 21, 2025) ⚙️

**1. Queue Infrastructure**
- ✅ 7 Bull queues with Redis backend
- ✅ Bull Board dashboard at `/admin/queues`
- ✅ Feature flag controlled activation

**2. Available Queues**
```
emailQueue           - Email notifications
priceTrackerQueue    - Price tracking (hourly)
scraperQueue         - Legacy scraping
dealVerifierQueue    - Deal verification (every 6 hours)
alertProcessorQueue  - Daily/weekly alert digests
cleanupQueue         - Database cleanup (daily at 2 AM)
telegramScraperQueue - Telegram scraping (every 2 hours)
```

**3. Job Retry Policy**
- ✅ 3 retry attempts with exponential backoff (2s base)
- ✅ Keep last 100 completed jobs
- ✅ Keep last 500 failed jobs for debugging

**4. Scheduled Jobs**
- ✅ Daily alerts: 9 AM every day
- ✅ Weekly alerts: 9 AM every Monday
- ✅ Price tracking: Every hour
- ✅ Deal verification: Every 6 hours
- ✅ Cleanup: 2 AM daily
- ✅ Telegram scraping: Configurable (default every 2 hours)

---

### v2.2.2 - Wishlist System (December 21, 2025) ❤️

**1. Backend API**
- ✅ `POST /api/wishlist` - Save deal to wishlist
- ✅ `GET /api/wishlist` - Get user's wishlist (paginated)
- ✅ `DELETE /api/wishlist/:dealId` - Remove from wishlist
- ✅ `PATCH /api/wishlist/:dealId` - Update notes
- ✅ `GET /api/wishlist/check/:dealId` - Check if deal is saved

**2. Features**
- ✅ Personal notes for saved deals
- ✅ Handles unauthenticated users gracefully (returns false)
- ✅ Prevents duplicate saves (409 Conflict)
- ✅ Database table: `saved_deals`

**3. Frontend Integration**
- ✅ Heart/bookmark button on deal cards
- ✅ Wishlist page component
- ✅ Real-time wishlist status

---

### v2.2.1 - Token Refresh System (December 21, 2025) 🔐

**1. Dual Token Authentication**
- ✅ Access tokens: JWT, 15 minute expiry
- ✅ Refresh tokens: Crypto random, 7 day expiry, stored in DB
- ✅ Located in: `backend/src/utils/tokens.ts`

**2. Token Management**
- ✅ `generateAccessToken(userId)` - Short-lived JWT
- ✅ `generateRefreshToken(userId, ip, userAgent)` - Stored in DB
- ✅ `verifyAccessToken(token)` - Validate JWT
- ✅ `verifyRefreshToken(token)` - Check DB + expiry + revoked
- ✅ `revokeRefreshToken(token)` - Single logout
- ✅ `revokeAllUserTokens(userId)` - Logout all devices
- ✅ `cleanupExpiredTokens()` - Periodic cleanup

**3. Security Features**
- ✅ IP address and User-Agent tracking per token
- ✅ Token revocation support
- ✅ Automatic expired token cleanup
- ✅ Security event logging (token_refreshed)

**4. API Endpoints**
- ✅ `POST /api/auth/refresh` - Exchange refresh token
- ✅ `POST /api/auth/logout` - Revoke current refresh token
- ✅ `POST /api/auth/logout-all` - Revoke all user tokens

---

### v2.2.0 - Ad Sidebar & Anonymous Personalization (December 14, 2025) 🎯

**1. Two-Column Layout with Dedicated Ad Sidebar**
- ✅ Refactored main content to use flexbox two-column layout
- ✅ Main content area: `flex: 1 1 auto` (responsive width)
- ✅ Ad sidebar: `flex: 0 0 300px` (fixed 300px, sticky positioning)
- ✅ 20px gap between content and ads for visual separation

**2. Ad Sidebar Implementation**
- ✅ Three vertically-stacked ad slots (300px wide each)
- ✅ Sticky positioning (`position: sticky, top: 20px`) - stays visible on scroll
- ✅ Ad Slot 1: Purple gradient - "Your Ad Here" (general promotion)
- ✅ Ad Slot 2: Pink gradient - "Sponsored Deal" (seasonal offers)
- ✅ Ad Slot 3: Orange gradient - "Brand Spotlight" (brand promotion)
- ✅ Each ad has CTA button for engagement tracking
- ✅ Professional gradient backgrounds with box shadows

**3. Content Layout Updates**
- ✅ "Just For You" section: 6 cards in carousel (previously had inline ad)
- ✅ "Festive & Seasonal Deals": 6 cards in grid (previously had inline ad)
- ✅ All other content sections use full width of content area
- ✅ Removed inline ads to eliminate visual clutter

**4. Anonymous Personalization System** 🎯 NEW
- ✅ Client-side tracking system using localStorage
- ✅ Works without login (Instagram/Facebook-style)
- ✅ Smart fallback: New users see popular deals, returning users see personalized
- ✅ Tracks 4 activity types with weighted scoring:
  - Views (1x weight) - Basic signal
  - Clicks (2x weight) - Medium signal
  - Upvotes (3x weight) - Strong signal
  - Saves (2.5x weight) - Strong signal
- ✅ Analyzes top 5 preferred categories from last 50 activities
- ✅ Auto-expires data older than 30 days for privacy
- ✅ Dynamic badge text: "Popular deals" → "Based on your browsing" → "Based on your activity"

**5. New Utility Module**
- ✅ Created `/frontend/src/utils/anonymousTracking.ts`
- ✅ Functions:
  - `getAnonymousUserId()` - Generate/retrieve anonymous ID
  - `trackBrowsingActivity()` - Track user interactions
  - `getBrowsingHistory()` - Retrieve activity history
  - `getPreferredCategories()` - Calculate category preferences
  - `clearBrowsingHistory()` - Privacy-friendly data clearing

**6. Enhanced Vote Tracking**
- ✅ Upvotes now tracked for personalization (even for logged-in users)
- ✅ Improves recommendation quality based on engagement

**Benefits**:
- 📈 Better monetization with dedicated, persistent ad sidebar
- 🎯 Improved personalization without requiring login
- 🔄 More ad inventory (3 vertical slots vs 2 inline)
- ✨ Cleaner UI with separated content and ads
- 📱 Privacy-friendly (client-side only, auto-expiring data)
- 🚀 Progressive enhancement (better experience as user engages)

---

### v2.1.0 - Frontend Architecture Refactor (December 14, 2025) 🎨

**1. Component Reusability (DRY Principle)**
- ✅ Created `Layout.tsx` wrapper component
- ✅ Created reusable `Header.tsx` component with search and auth
- ✅ Created reusable `Footer.tsx` component
- ⏳ TODO: Refactor `HomePage.tsx` to use Layout (currently 966 lines)

**2. React Router Implementation**
- ✅ Migrated from modal-based deal view to full page navigation
- ✅ Dedicated URLs for deals: `/deal/:dealId`
- ✅ SEO-friendly routing with proper URL structure
- ✅ Browser back button support

**3. DealPage Full Page Design**
- ✅ Two-column layout (content + ad zones)
- ✅ Ad placements: 300x250 and 300x600 sticky sidebar
- ✅ Consistent Header/Footer using Layout component
- ✅ Better monetization potential with dedicated page space

**4. Slickdeals-Style UI**
- ✅ Redesigned `CompactDealCard.tsx` with clean icon-only buttons
- ✅ 4-icon action layout: Vote | Comment | Share | Cart
- ✅ Hover-based voting (👍 expands to 👍👎)
- ✅ Web Share API integration with clipboard fallback
- ✅ Transparent gray icons with hover effects

**5. Backend Updates**
- ✅ CORS configuration updated to support multiple dev ports (5173, 5174, 5176, 5177)
- ✅ Affiliate tracking API integration in deal cards

**Impact**:
- Better user experience with dedicated deal pages
- Improved code maintainability (DRY principle)
- Enhanced monetization with ad zones
- Modern, clean UI matching industry standards (Slickdeals)
- SEO-friendly URL structure

---

## Future Roadmap 🚀

A comprehensive 4-phase enhancement plan exists to transform DesiDealsAI into a comprehensive deals aggregation platform. See [foamy-tinkering-hammock.md](.claude/plans/foamy-tinkering-hammock.md) for complete implementation details.

### Feature Flag System 🚩

All phases are controlled via **environment variable feature flags** that allow enabling/disabling features without code changes. See [FEATURE_FLAGS_GUIDE.md](FEATURE_FLAGS_GUIDE.md) for complete documentation.

**How to Enable Phases:**

```bash
# In backend/.env file

# Phase 1 Features (ALREADY ENABLED by default)
FEATURE_BULL_QUEUES=true
FEATURE_PRICE_TRACKING=true
FEATURE_DEAL_VERIFICATION=true
FEATURE_EMAIL_ALERTS=true
FEATURE_WISHLIST_API=true
FEATURE_COUPONS_API=true

# Phase 2 Features (Enable when implemented)
FEATURE_BROWSER_EXTENSION_API=true
FEATURE_PWA_FEATURES=true
FEATURE_PUSH_NOTIFICATIONS=true
FEATURE_CASHBACK_DISPLAY=true

# Phase 3 Features (Enable when implemented)
FEATURE_WEBSOCKETS=true
FEATURE_ML_RECOMMENDATIONS=true
FEATURE_ADMIN_DASHBOARD=true

# Phase 4 Features (Enable when implemented)
FEATURE_ADVANCED_CACHING=true
FEATURE_CDN_INTEGRATION=true
FEATURE_MONITORING=true
```

**Quick Start:**
1. Edit `backend/.env` and add feature flags
2. Restart server: `npm run dev` or `pm2 restart deals-backend`
3. Check startup logs for enabled features

**API Protection:**
When a feature is disabled, API endpoints return `503 Service Unavailable` with a clear message.

### Phase 1: Foundation & Core Features (Weeks 1-3) ⏳
**Goal**: Add automated deal sourcing and price tracking infrastructure

- **Job Queue Infrastructure** ⭐ CRITICAL
  - Bull.js with Redis for background processing
  - Jobs: daily/weekly alerts, merchant scraping, price tracking, deal verification
  - Bull Board dashboard for monitoring

- **Price History & Tracking**
  - Database tables: `price_history`, `price_alerts`
  - Price trend charts (recharts)
  - Price drop alerts

- **Merchant API Integration Framework**
  - Database tables: `merchants`, `merchant_products`
  - Abstract merchant service class
  - Amazon, Flipkart, Myntra integrations
  - Deal deduplication system

- **Deal Verification & Auto-Expiry**
  - Background job to check deal availability
  - Auto-mark expired deals
  - Email notifications to deal creators

### Phase 2: User Experience Enhancements (Weeks 4-6) ⏳
**Goal**: Improve user engagement with wishlist, coupons, and browser extension

- **Wishlist / Save for Later**
  - Database table: `saved_deals`
  - Heart/bookmark button on cards
  - Wishlist page
  - Price drop notifications for saved deals

- **Coupon Code Management**
  - Database tables: `coupons`, `coupon_usage`
  - Coupon submission and verification
  - Copy-to-clipboard functionality
  - User feedback (worked/didn't work)

- **Browser Extension**
  - Manifest V3 (Chrome, Firefox, Edge)
  - Price comparison on merchant sites
  - Quick deal posting
  - Price history overlay
  - Deal alerts via desktop notifications

- **Mobile-First PWA**
  - Service worker for offline support
  - "Add to Home Screen" capability
  - Push notifications
  - Responsive design optimization

### Phase 3: Advanced Features (Weeks 7-9) ⏳
**Goal**: Add real-time updates, cashback, AI recommendations, and admin tools

- **Real-time Updates with WebSockets**
  - Socket.io integration
  - Live deal updates, votes, comments
  - Online user count

- **Cashback Integration**
  - Database table: `cashback_programs`
  - Display cashback rates from CRED, Rakuten, Paytm
  - Calculate total savings (discount + cashback)

- **ML-Based Recommendations**
  - Collaborative filtering
  - User clustering
  - Deal recommendations engine
  - TensorFlow.js integration

- **Admin Dashboard**
  - User management
  - Deal moderation queue
  - Merchant configuration
  - Analytics dashboard
  - Job queue monitoring (Bull Board)

### Phase 4: Scale & Optimize (Weeks 10-12) ⏳
**Goal**: Production hardening and infrastructure scaling

- **Performance Optimizations**
  - Database query optimization (EXPLAIN ANALYZE)
  - Expanded Redis caching
  - CDN for images (Cloudinary)
  - API compression (gzip)
  - Connection pooling tuning

- **Monitoring & Observability**
  - Sentry error tracking
  - Prometheus + Grafana metrics
  - Uptime monitoring (UptimeRobot)
  - Log aggregation (ELK/Datadog)

- **Infrastructure**
  - Docker containerization
  - Kubernetes deployment
  - Database replication (read replicas)
  - Load balancing
  - Auto-scaling

### Success Metrics by Phase

| Phase | Key Metrics |
|-------|-------------|
| Phase 1 | 1000+ jobs/day, 500+ deals tracked, 3+ merchant integrations |
| Phase 2 | 10% users with wishlists, 100+ coupons, 1000+ extension installs |
| Phase 3 | <100ms WebSocket latency, 50%+ deals with cashback, >5% ML CTR |
| Phase 4 | <200ms p95 response time, 99.9% uptime, <0.1% error rate |

**Total Estimated Timeline**: 8-12 weeks
**Current Phase**: Pre-Phase 1 (Foundation complete, phases not started)

---

---

## Telegram Scraper System (NEW - December 21, 2025)

### Overview

Automated deal scraping from Telegram channels with intelligent deduplication and affiliate link processing.

### Configuration

Located in: `backend/src/config/telegram-channels.ts`

```typescript
export const TELEGRAM_SCRAPER_CONFIG = {
  dealsPerChannel: 30,           // Target deals per channel per run
  scheduleCron: '0 */2 * * *',   // Every 2 hours
  delayBetweenChannels: 2000,    // 2 seconds between channels
  minDealsToImport: 1,           // Minimum deals to proceed
  maxUrlsPerDeal: 2,             // Skip roundup posts with more URLs
  enablePhase1NewDeals: true,    // Enable/disable Phase 1
  enablePhase2Backfill: true,    // Enable/disable Phase 2
  maxPagesPerPhase: 10,          // Max pages per phase (50 msgs/page)
};

export const TELEGRAM_CHANNELS: TelegramChannel[] = [
  { url: 'https://t.me/s/MahidharZone', username: 'MahidharZone', enabled: true },
  { url: 'https://t.me/s/iamprasadtech', username: 'iamprasadtech', enabled: true },
  { url: 'https://t.me/s/TechFactsDeals', username: 'TechFactsDeals', enabled: true },
];
```

### Two-Phase Scraping Algorithm

```
Channel Timeline: [A] → [B] → [C] → [D] → [E] → [F]
                  oldest                    newest

Morning Run:
  Scraped D, C, B (newest first) - stopped at limit
  A never reached

Evening Run (new posts E, F added):
  PHASE 1 - NEW DEALS:
  ├─ Start from F (newest)
  ├─ Scrape F → E → D (processed) → C (processed)
  └─ Stop when hitting processed zone

  PHASE 2 - BACKFILL:
  ├─ Find oldest known message (B)
  ├─ Continue backwards: before B → A → ...
  └─ Stop at beginning of channel

Result: Both new (E, F) and old (A) deals captured!
```

### Deal Processing Pipeline

```
Telegram Message
       │
       ▼
┌──────────────────┐
│ Parse Deal Info  │  Extract: title, price, URL, image
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Roundup Filter   │  Skip posts with >2 URLs (compilation posts)
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ URL Expansion    │  Expand: amzn.to, fkrt.co → full URLs
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Affiliate Swap   │  Replace affiliate tags with ours
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ ML Deduplication │  Check similarity against existing deals
│                  │  If duplicate with better price → replace
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Price Extraction │  Scrape actual price from merchant site
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Image Extraction │  Fetch product image from merchant
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ AI Quality Score │  Calculate 0-100 score
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Save to Database │  Insert deal + price history + telegram_messages
└──────────────────┘
```

### ML Deduplication

Located in: `backend/src/services/ml-deduplication.service.ts`

1. **Text Normalization** - Remove emojis, lowercase, remove filler words
2. **TF-IDF Vectorization** - Convert titles to term frequency vectors
3. **Cosine Similarity** - Score 0-100% similarity
4. **Decision Logic**:
   - Similarity > 70% AND new price < existing → Replace existing deal
   - Similarity > 70% AND new price >= existing → Skip
   - Similarity <= 70% → Import as new deal

### URL Processing

**Shortened URL Expansion**:
```
amzn.to/xyz     → amazon.in/dp/B0ABC123?tag=...
fkrt.co/abc     → flipkart.com/product/p/...
myntr.in/xyz    → myntra.com/product/...
bit.ly/abc      → actual destination
```

**Affiliate Tag Replacement**:
```typescript
// Original: https://amazon.in/dp/B0ABC?tag=someone-else-21
// Processed: https://amazon.in/dp/B0ABC?tag=indiadeals-21
```

### Image Extraction

Located in: `backend/src/controllers/scraper.controller.ts`

1. Expand shortened URL (if needed)
2. Fetch HTML from merchant page
3. Extract image using merchant-specific patterns:
   - Amazon: `landingImage`, `data-old-hires`, `images-amazon.com`
   - Flipkart: `rukminim1.flixcart.com` URLs
   - Generic: `og:image`, `twitter:image` meta tags
4. Validate: Must be from known CDN, valid extension, not tracking pixel

### Database Tables

```sql
-- Track processed Telegram messages
telegram_messages (
  id, message_id, channel_username, deal_id,
  processed, skipped_reason, posted_at, created_at
)

-- Indexes for efficient queries
CREATE INDEX telegram_messages_message_id_idx ON telegram_messages(message_id);
CREATE INDEX telegram_messages_channel_idx ON telegram_messages(channel_username);
CREATE INDEX telegram_messages_posted_at_idx ON telegram_messages(posted_at);
```

### Logging

View scraper logs:
```bash
# Real-time formatted logs
tail -f backend/logs/combined.log | jq .

# Filter telegram logs
grep "Telegram" backend/logs/combined.log | jq .

# Check last scraper run
grep "Job Complete" backend/logs/combined.log | tail -5
```

### Manual Trigger

The scraper can be triggered manually via Bull Board:
`http://localhost:3001/admin/queues`

Or programmatically:
```typescript
import { TelegramScraperService } from './services/scrapers/telegram-scraper.service.js';
await TelegramScraperService.scrapeAndImport(30); // 30 deals per channel
```

---

## AI Quality Scoring Details

Located in: `backend/src/services/ai/deal-quality.service.ts`

### Scoring Algorithm

```
Total Score = (Value × 0.40) + (Authenticity × 0.25) + (Urgency × 0.20) + (Social × 0.15)

Value Proposition (0-100):
├─ Discount Quality (0-40)
│   ├─ 80%+ discount = 40 points
│   ├─ 60%+ = 35, 40%+ = 28, 25%+ = 20, 15%+ = 12
│   └─ Penalty: Suspicious discounts (>70% on items <₹1000)
├─ Price History (0-40)
│   ├─ All-time low = 40 points
│   ├─ 30% below median = 38, 20% = 32, 10% = 25
│   └─ Above median = penalty (5-10 points)
└─ Absolute Savings Bonus (0-20)
    ├─ ₹50k+ savings = 20, ₹20k+ = 15, ₹10k+ = 12
    └─ ₹5k+ = 8, ₹2k+ = 5, ₹1k+ = 3

Authenticity (0-100):
├─ Merchant Trust (0-40)
│   ├─ Amazon/Flipkart = 35, Myntra/Ajio = 30-32
│   └─ Unknown merchants scored by historical performance
├─ Verification (0-30)
│   ├─ Verified = 30, URL accessible = 25
│   └─ Unverified with URL = 18, No URL = 10
├─ Completeness (0-15)
│   └─ URL + Image + Description (5 pts each)
└─ Red Flags (penalty)
    └─ Auto-flagged (-10), No URL (-5), >85% discount (-5)

Urgency (0-100):
├─ Freshness (0-40)
│   ├─ <2 hours = 40, <6 hours = 38, <24 hours = 35
│   └─ <48 hours = 30, <72 hours = 25, <1 week = 20
├─ Price Trend (0-30)
│   ├─ Dropping fast = 30, Dropping = 25
│   └─ Stable = 15, Rising = 5-10
└─ Expiration (0-30)
    ├─ <6 hours = 30, <24 hours = 25
    └─ <2 days = 20, <1 week = 15

Social Proof (0-100):
├─ Vote Quality (0-50)
│   ├─ Positive ratio × 50, with engagement bonus
│   └─ New deals get base 40 (not penalized for being new)
├─ Discussion (0-30)
│   └─ 6 points per comment (max 30)
└─ Interest (0-20)
    └─ log10(views) × 8
```

### Badge Generation

| Score Range | Primary Badge |
|-------------|---------------|
| 85-100 | 💎 Exceptional Deal |
| 75-84 | 🔥 Hot Deal |
| 65-74 | ⭐ Great Deal |
| 55-64 | 👍 Good Deal |

**Context Badges:**
- 💰 Best Price - Value score ≥75
- 📉 Huge Discount - 70%+ discount
- ✅ Verified - Authenticity ≥80
- ⚡ Act Fast - Urgency ≥80
- ❤️ Community Favorite - Social ≥75
- 🌟 Trending - 50+ upvotes
- 🆕 New - Posted <24 hours ago

---

## Cost-Free AI Features (v2.7.0) 🤖

All features run locally using statistical algorithms - **NO external API calls**, completely cost-free.

### AI Services Overview

| Feature | File | Purpose |
|---------|------|---------|
| Fraud Detection | `fraud-detection.service.ts` | Detect fake/spam deals |
| Price Prediction | `price-prediction.service.ts` | Forecast price trends |
| Smart Alerts | `smart-alerts.service.ts` | Intelligent price drop alerts |
| Deal Summarizer | `deal-summarizer.service.ts` | Generate deal summaries |
| Personalization | `personalization.service.ts` | User recommendations |

Located in: `backend/src/services/ai/`

---

### 1. Fraud Detection Service

Detects fake, spam, and suspicious deals using multiple signals.

**Algorithms:**
- **Z-Score Analysis**: Detect price anomalies vs merchant/category averages
- **Pattern Matching**: Regex detection of spam indicators (urgency spam, fake discounts, suspicious claims)
- **Velocity Detection**: Flag users posting >5 similar deals/hour
- **Merchant Risk Profiling**: Track flagged/expired deal ratios per merchant

**Risk Score Components:**
```
Overall Risk = weighted(Price Anomaly, Title Suspicion, Velocity, Merchant Risk)

Price Anomaly Score (0-100):
├─ Z-score deviation from category average
├─ Comparison to merchant price history
└─ Suspicious discount patterns (95%+ off = red flag)

Title Suspicion Score (0-100):
├─ Urgency spam ("hurry", "limited", "grab now")
├─ Fake discount claims ("99% off")
├─ Suspicious formatting (!!!!, excessive emojis)
└─ All-caps abuse, repetitive text

Velocity Score (0-100):
├─ Similar deals from same user in last hour
├─ Title similarity using Jaccard coefficient
└─ Same merchant/category flood detection

Merchant Risk Score (0-100):
├─ Historical flag rate
├─ Quick expiration rate
└─ Verification success rate
```

**Auto Actions:**
| Risk Score | Action |
|------------|--------|
| 80-100 | Hide deal, manual review required |
| 60-79 | Flag for review |
| 40-59 | Allow with monitoring |
| 0-39 | Allow (low risk) |

**Integration:**
- Runs automatically on deal creation
- Integrated in `deals.controller.ts` and `telegram-scraper.service.ts`

**API Endpoints:**
- `GET /api/ai/fraud-analysis/:dealId` - Get fraud analysis for a deal
- `GET /api/ai/high-risk-deals?minRisk=60` - List high-risk deals

---

### 2. Price Prediction Service

Predicts future prices using historical data and statistical models.

**Algorithms:**
- **Linear Regression**: Calculate trend slope for next 7 days
- **Simple Moving Average (SMA)**: 7-day and 14-day averages
- **Exponential Moving Average (EMA)**: Weight recent prices more
- **Day-of-Week Analysis**: Find best days to buy
- **Flash Sale Detection**: Identify sudden drops that recover quickly

**Prediction Output:**
```
{
  currentPrice: 12999,
  predictedPrice: 11499,        // Expected in 7 days
  trend: "down",                // up, down, stable
  trendStrength: 75,            // 0-100 confidence
  bestBuyDay: "Monday",         // Best day historically
  flashSalePattern: true,       // Flash sales detected
  nextFlashSaleDate: "2025-01-15",
  priceVolatility: 35,          // 0-100 volatility score
  lowestPriceLast30Days: 10999,
  highestPriceLast30Days: 15999,
  recommendation: "wait"        // buy_now, wait, skip
}
```

**Trend Detection:**
| Slope | Trend | Strength |
|-------|-------|----------|
| > 0.01 | Rising | Based on R² |
| < -0.01 | Falling | Based on R² |
| -0.01 to 0.01 | Stable | High if flat |

**API Endpoints:**
- `GET /api/ai/price-prediction/:dealId` - Get full prediction
- `GET /api/ai/best-buy-time/:dealId` - Get buy timing recommendation
- `GET /api/ai/dropping-prices` - Deals likely to drop soon

---

### 3. Smart Alerts Service

Enhances traditional price alerts with AI-powered predictions.

**Features:**
- **Drop Probability**: Calculate chance of hitting target price
- **Flash Sale Alerts**: Notify when flash sale pattern detected
- **Buy Timing Suggestions**: Wait vs buy now recommendations

**Alert Types:**
| Type | Description |
|------|-------------|
| `fixed` | Traditional - alert when price ≤ target |
| `smart` | AI-powered with drop predictions |
| `flash_sale` | Alert when flash sale expected |

**Drop Probability Calculation:**
```
Base Probability = 30%

Factors:
├─ Trend down: +25%
├─ Trend up: -20%
├─ Flash sale pattern: +20%
├─ High volatility: +15%
├─ Target near historical low: +15%
├─ Target way below historical low: -20%
└─ Required drop >50%: -30%
```

**Recommendations:**
| Condition | Recommendation |
|-----------|----------------|
| Current ≤ Target | Buy Now |
| Drop < 5% needed | Buy Now |
| Flash sale in <14 days | Wait |
| Strong downward trend | Wait |
| Drop probability ≥70% | Wait |
| Unrealistic target | Suggest realistic price |

**API Endpoints:**
- `POST /api/ai/smart-alert/suggest` - Get smart alert suggestion
- `POST /api/ai/smart-alert/create` - Create smart alert (auth required)

---

### 4. Deal Summarizer Service

Generates human-readable deal summaries using template-based text generation.

**Features:**
- Product name extraction (removes noise, prices, emojis)
- Value point detection (free shipping, bank offers, etc.)
- Quality tier classification
- Buy recommendation generation

**Value Points Detected:**
- Free Shipping
- No-Cost EMI
- Bank Offers
- Exchange Offer
- Cashback
- Prime/Plus benefits
- Extended Warranty
- Bundle Deal
- Limited Time

**Summary Templates:**
```javascript
excellent: "{{product}} at {{discount}}% off - {{priceStatus}}!"
good: "Save ₹{{savings}} on {{product}} - {{priceStatus}}"
average: "{{product}} at ₹{{price}} ({{discount}}% off)"
```

**Output:**
```json
{
  "headline": "Sony WH-1000XM5 at 35% off - Lowest Price Ever!",
  "productName": "Sony WH-1000XM5 Headphones",
  "valuePoints": ["Free Shipping", "No-Cost EMI", "Bank Offer 10%"],
  "priceAnalysis": {
    "currentPrice": 22990,
    "savings": 12000,
    "discountPercent": 34,
    "priceStatus": "Lowest Price"
  },
  "buyRecommendation": {
    "action": "buy",
    "confidence": 85,
    "reasoning": "Best price with excellent value"
  },
  "qualityTier": "excellent"
}
```

**API Endpoints:**
- `GET /api/ai/summary/:dealId` - Get deal summary
- `POST /api/ai/summaries` - Batch generate summaries (max 20)

---

### 5. Personalization Service

Provides personalized deal recommendations using collaborative and content-based filtering.

**Algorithms:**
- **User Profile Building**: Aggregate preferences from votes, views, saved deals
- **Cosine Similarity**: Find users with similar preference vectors
- **Content-Based Scoring**: Match deal attributes to user preferences
- **Hybrid Ranking**: 60% collaborative + 40% content-based

**User Profile Components:**
```
Preference Vector (20 dimensions):
├─ [0-9]: Category weights (top 10 categories)
├─ [10-14]: Merchant weights (top 5 merchants)
├─ [15]: Average price preference (normalized)
├─ [16]: Price range width preference
├─ [17]: Discount preference (normalized)
└─ [18-19]: Reserved
```

**Scoring Formula:**
```
Content Score =
  (Category Match × 0.4) +
  (Merchant Match × 0.3) +
  (Price Range Match × 0.2) +
  (Discount Match × 0.1)

Collaborative Score = Σ(similarity × liked_deal_score)

Hybrid Score = (Collaborative × 0.6) + (Content × 0.4) + Popularity Boost
```

**API Endpoints (all require auth):**
- `GET /api/ai/personalized-deals` - Get personalized recommendations
- `GET /api/ai/user-profile` - Get user's preference profile
- `GET /api/ai/similar-users` - Find similar users
- `GET /api/ai/explain-recommendation/:dealId` - Explain why deal was recommended

---

### Database Schema for AI Features

**New Tables:**
```sql
-- Fraud Analysis
fraud_analysis (
  id, deal_id, overall_risk_score,
  price_anomaly_score, title_suspicion_score,
  velocity_score, merchant_risk_score,
  flags[], auto_action, reviewed_by, reviewed_at
)

-- Merchant Risk Profiles
merchant_risk_profiles (
  id, merchant_name, risk_score,
  total_deals, flagged_deals, expired_quickly,
  verification_success_rate, last_deal_at
)

-- Price Predictions
price_predictions (
  id, deal_id, current_price, predicted_price,
  predicted_date, confidence, trend, trend_strength,
  best_buy_day, flash_sale_pattern, next_flash_sale_date,
  price_volatility, lowest_price_last_30_days,
  highest_price_last_30_days, recommendation
)

-- User Profiles
user_profiles (
  id, user_id, preferred_categories[],
  preferred_merchants[], preferred_price_range{},
  avg_liked_discount, activity_vector[],
  total_interactions, last_activity_at
)

-- User Similarity Cache
user_similarity_cache (
  id, user_id, similar_user_id,
  similarity_score, common_categories,
  common_merchants, vote_agreement
)
```

**Enhanced Columns:**
```sql
-- Added to deals table
ai_summary JSONB,
ai_summary_updated_at TIMESTAMP,
fraud_risk_score INTEGER

-- Added to price_alerts table
alert_type VARCHAR(20),  -- 'fixed', 'smart', 'flash_sale'
predicted_drop_date TIMESTAMP,
drop_probability INTEGER,
suggested_wait_days INTEGER
```

---

## Deal Verification Details

Located in: `backend/src/services/deal-verifier.service.ts`

### Verification Flow

```
Deal Created/Scheduled
       │
       ▼
┌──────────────────┐
│ URL Check        │  HEAD/GET request with redirects
│ (10s timeout)    │
└────────┬─────────┘
         │
    ┌────┴────┐
    │ 200 OK? │
    └────┬────┘
         │
    YES ─┴─ NO → Flag or Expire (404/410)
         │
         ▼
┌──────────────────┐
│ Price Scraping   │  Cheerio CSS selectors
│ (15s timeout)    │  Merchant-specific patterns
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Sold Out Check   │  Amazon: #add-to-cart-button
│                  │  Flipkart: Notify Me button
└────────┬─────────┘
         │
    ┌────┴────┐
    │ Sold Out│
    └────┬────┘
         │
    YES ─┴─ NO
     ↓       ↓
   Expire   Continue
             │
             ▼
┌──────────────────┐
│ Price Match      │  ±5% tolerance
│ Check            │
└────────┬─────────┘
         │
    ┌────┴────┐
    │>20% diff│
    └────┬────┘
         │
    YES ─┴─ NO
     ↓       ↓
   Flag   Verified
         │
         ▼
┌──────────────────┐
│ Update DB        │  verified, status, priceMatch
│ Log Attempt      │  Insert to verification_logs
│ Update Price     │  Insert to price_history
│ Recalc AI Score  │  Trigger quality recalculation
└──────────────────┘
```

### Verification Statuses

| Status | Meaning | Trigger |
|--------|---------|---------|
| `pending` | Not yet verified | Initial state |
| `verified` | URL works, price OK | Successful check |
| `flagged` | Issues detected | Price mismatch, URL issues |
| `failed` | Deal invalid | 404/410, sold out |

---

## Internationalization (i18n) System

Located in: `frontend/src/i18n/`

### Supported Languages

| Code | Language | Native Name | Status |
|------|----------|-------------|--------|
| en | English | English | ✅ Complete (default) |
| hi | Hindi | हिंदी | ✅ Complete |
| ta | Tamil | தமிழ் | ✅ Complete |
| te | Telugu | తెలుగు | ✅ Complete |

### Implementation Stack

- **i18next** (v25.7.3) - Core i18n framework
- **react-i18next** (v16.5.0) - React integration
- **i18next-browser-languagedetector** (v8.2.0) - Browser language detection

### Configuration

```typescript
// frontend/src/i18n/index.ts
export const supportedLanguages = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिंदी' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
];

// Storage key: 'indiadeals_language' in localStorage
// Fallback language: English (en)
// Detection order: localStorage > navigator.language
```

### Translation File Structure

Each locale JSON (`frontend/src/i18n/locales/*.json`) contains:

| Section | Description | Key Count |
|---------|-------------|-----------|
| common | Basic UI terms (loading, save, cancel) | 25+ |
| nav | Navigation labels | 11 |
| home | Hero section, features | 35+ |
| deals | Deal terminology (price, discount, merchant) | 25+ |
| aiScore | AI quality scoring labels | 25+ |
| dealPage | Deal detail page text | 20+ |
| profile | Account and settings | 40+ |
| search | Search functionality | 20+ |
| auth | Authentication text | 15+ |
| languages | Language name mappings | 10 |
| time | Relative time with pluralization | 15+ |

**Total: ~450+ translation keys per language**

### Dynamic Content Translation

```typescript
// frontend/src/services/translation.service.ts
export async function translateText(text: string, targetLang: string): Promise<string>
export async function translateDeal<T>(deal: T, targetLang: string): Promise<T>
export async function translateDeals<T>(deals: T[], targetLang: string): Promise<T[]>
```

Features:
- ✅ Google Translate API integration (free endpoint)
- ✅ Client-side caching with 24-hour expiry
- ✅ Batch translation with rate limiting (5 items/batch)
- ✅ Graceful fallback to original text on error

### Custom React Hooks

```typescript
// frontend/src/hooks/useTranslatedDeals.ts
export function useTranslatedDeals<T>(deals: T[]): {
  translatedDeals: T[];
  isTranslating: boolean;
}

export function useTranslatedText(text: string): {
  translatedText: string;
  isTranslating: boolean;
}
```

### Language Switching

- **Desktop**: Profile Settings page → Language selector grid
- **Mobile**: MobileProfile → Language selection modal
- Real-time switching without page reload
- Preference persisted in localStorage

---

## Progressive Web App (PWA)

### Service Worker

Located in: `frontend/public/sw.js`

**Caching Strategies:**

| Strategy | Use Case | Behavior |
|----------|----------|----------|
| Network First | API calls | Try network, cache fallback |
| Cache First | Images | Return cached, network fallback |
| Stale While Revalidate | Static assets | Serve cached, update background |

**Cache Names:**
- `indiadeals-v1` - Static assets
- `indiadeals-dynamic-v1` - Dynamic content
- `indiadeals-images-v1` - Image cache

**Background Sync:**
```javascript
// Tags for offline actions
'sync-wishlist'  - Sync saved deals when back online
'sync-votes'     - Sync upvotes/downvotes offline
```

**Periodic Sync:**
- `update-deals` tag - Background deal updates every 24+ hours

**Push Notifications:**
- Vibration feedback: [100ms, 50ms, 100ms]
- Badge and icon support
- Action buttons: "View Deal", "Dismiss"
- Tag-based notification grouping

### PWA Manifest

Located in: `frontend/public/manifest.json`

```json
{
  "name": "DesiDealsAI - AI-Powered Deal Discovery",
  "display": "standalone",
  "theme_color": "#667eea",
  "background_color": "#0a0a0a",
  "lang": "en-IN",
  "categories": ["shopping", "lifestyle", "finance"]
}
```

**App Shortcuts:**
- 🔥 Hot Deals (70%+ discount)
- ❤️ My Wishlist
- 🔔 Price Alerts

**Share Target:**
- Accept shared text, URL, and title
- GET method for share handling

---

## Mobile-First Architecture

### Mobile Components (17 total)

Located in: `frontend/src/components/mobile/`

| Component | Description |
|-----------|-------------|
| **MobileApp** | Main container with pull-to-refresh |
| **MobileHeader** | Dynamic header with filters |
| **MobileBottomNav** | 5-tab navigation with badges |
| **MobileHome** | Personalized deal feed |
| **MobileSearch** | Full-text search interface |
| **MobileForums** | Community discussions |
| **MobileProfile** | Account management |
| **MobilePostDeal** | In-app deal posting |
| **MobileAlerts** | Deal notifications |
| **MobileDealCard** | Optimized deal display |
| **MobileCarousel** | Horizontal scrolling |
| **MobileCategoryScroll** | Category browsing |
| **MobileFilterChips** | Multi-select filters |
| **MobileCategories** | Category grid view |
| **MobileNotifications** | Slide-out drawer |
| **MobileDealPage** | Full deal detail |

### Mobile Hooks

**usePullToRefresh:**
```typescript
const { pullDistance, isPulling, isRefreshing } = usePullToRefresh(onRefresh);
// - 80px threshold to trigger refresh
// - 120px max pull distance
// - 0.5x resistance curve
```

**useHaptics:**
```typescript
const haptics = useHaptics();
haptics.impact('light' | 'medium' | 'heavy');
haptics.selection();
haptics.success();
haptics.warning();
haptics.error();

// Patterns (ms):
// light: 10, medium: 20, heavy: 30
// selection: [5, 5, 5]
// success: [10, 50, 10]
// warning: [20, 30, 20]
// error: [30, 20, 30, 20, 30]
```

### Mobile Features

- ✅ Safe area padding for notch/status bar
- ✅ Pull-to-refresh with visual feedback
- ✅ Haptic feedback on all interactions
- ✅ Real-time notification count (60s polling)
- ✅ Bottom sheet modals
- ✅ Swipe gestures

---

## Price History & Tracking

### Components

- `frontend/src/components/PriceHistoryChart.tsx`
- `frontend/src/api/priceHistory.ts`

### Chart Features

- Interactive SVG-based price chart
- Configurable time periods: 7, 30, 90 days
- Price statistics: lowest, highest, average, current
- "All-time low" indicator with badge
- Gradient area fill visualization
- Responsive scaling

### Smart Recommendations

| Price Position | Recommendation |
|----------------|----------------|
| All-time low | 🎯 Buy Now! |
| Below average | 👍 Good Price |
| Near average | ⏳ Consider Waiting |
| Above average | 🚫 Wait for Drop |

### API Endpoints

```
GET  /price-history/deals/{dealId}?days={7|30|90}
POST /deals/{dealId}/price-alerts
GET  /price-alerts?active={boolean}
PATCH /price-alerts/{alertId}
DELETE /price-alerts/{alertId}
```

---

## Price Alerts System

### Alert Types

**1. Price Drop Alerts:**
- Set target price for specific deal
- Preset buttons: -5%, -10%, -20%, -30%
- Custom target price input
- Email notification when triggered

**2. Keyword Alerts:**
- Keyword-based deal matching
- Filters: min discount, max price
- Frequency: instant, daily, weekly
- Matches new deals in real-time

### UI Components

- `PriceAlertModal.tsx` - Price alert creation
- `AlertsPage.tsx` - Two-tab alert management

---

## Notifications System

### Notification Types

| Type | Description |
|------|-------------|
| `price_drop` | Price alert triggered |
| `deal_alert` | Keyword match found |
| `wishlist` | Item status change |
| `system` | General notifications |

### API Endpoints

```
GET  /notifications?limit=20&offset=0&unread=true
GET  /notifications/unread-count
PATCH /notifications/{id}/read
POST /notifications/mark-all-read
DELETE /notifications/{id}
```

### Features

- Slide-out notification drawer
- Unread count badge (polled every 60s)
- Mark single/all as read
- Navigation to deal from notification
- Icon mapping per notification type
- Haptic feedback on interactions

---

## Image Services

### Image Proxy Service

Located in: `backend/src/services/image-proxy.service.ts`

- File-based caching system
- In-memory LRU cache (100 items)
- MD5 hash-based cache keys
- 15-second timeout per request

### Image Fallback Service

Located in: `backend/src/services/image-fallback.service.ts`

**Merchant-Specific Extraction:**

| Merchant | Selectors |
|----------|-----------|
| Amazon | `landingImage`, `imgBlkFront`, `data-old-hires` |
| Flipkart | Dynamic classes, resolution upgrade (128→832) |
| Generic | `og:image`, `twitter:image` meta tags |

---

## Email Service

Located in: `backend/src/services/email.service.ts`

### Email Types

| Type | Description |
|------|-------------|
| Welcome | Account verification complete |
| Verification | Email confirmation link |
| Password Reset | 1-hour token expiry |
| Deal Alert | Formatted deal card with image |
| Price Drop | Target price reached |
| Deal Expired | Automatic expiration notice |

### Features

- HTML and plain text versions
- SMTP with nodemailer
- Company branding templates
- Affiliate link support
- Unsubscribe links
- Error logging and retry

---

## Affiliate Link Management

Located in: `backend/src/services/affiliate.service.ts`

### URL Processing Pipeline

```
1. Expand shortened URLs (amzn.to, fkrt.co, bit.ly)
2. Rate limit (2.5s per domain)
3. Random User-Agent selection
4. Replace affiliate tags
5. Clean tracking parameters
6. Extract price information
```

### Supported Merchants

| Merchant | Tag Parameter | Price Selectors |
|----------|--------------|-----------------|
| Amazon | `tag` | `.a-price-whole`, `#priceblock_*` |
| Flipkart | `affid` | `.hZ3P6w`, `._30jeq3` |
| Myntra | - | `.pdp-price`, `.pdp-mrp` |
| Ajio | - | `.prod-sp`, `.price-value` |

### Anti-Bot Protection

- 8 rotating User-Agent strings
- 2.5-second delay per domain
- 3 retries with exponential backoff
- ECONNRESET handling

---

**Architecture Version**: 2.5.0
**Last Updated**: December 21, 2025
**Status**: ✅ Production Ready (AI-Powered Platform with i18n, PWA & Mobile-First Architecture)
**Next Review**: Q1 2026
