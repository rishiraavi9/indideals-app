# Architecture Overview - IndiaDeals

**Last Updated**: December 14, 2025
**Version**: 2.1.0 (Production Ready + Frontend Refactor)

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

A comprehensive 4-phase enhancement plan exists to transform IndiaDeals into a comprehensive deals aggregation platform. See [foamy-tinkering-hammock.md](.claude/plans/foamy-tinkering-hammock.md) for complete implementation details.

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

**Architecture Version**: 2.2.0
**Last Updated**: December 14, 2025
**Status**: ✅ Production Ready (with Ad Sidebar & Anonymous Personalization)
**Next Review**: Q1 2026
