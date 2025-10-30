# Emaús Vota - Election Management System

## Overview

Emaús Vota is a full-stack web application designed to manage elections for a church youth group (UMP Emaús). The system provides email-based authentication with verification codes, role-based access control (admin/member), election management, and voting functionality with real-time results. Built with a focus on trust, transparency, and accessibility, it follows civic tech design principles to ensure clarity during the voting process.

## User Preferences

Preferred communication style: Simple, everyday language.

## Project Status

**✅ Fully implemented and tested**
- Email-based authentication with 6-digit verification codes (15-minute validity)
- JWT token-based session management
- Role-based access control (admin/member) with auth-gated routing
- Election management (create, close elections)
- Candidate registration system
- Secure voting with duplicate prevention (one vote per position per election)
- Real-time results display with vote counts and percentages
- Admin panel for member registration
- Session persistence with automatic hydration
- Responsive UI following civic tech design principles
- Portuguese language interface

**Recent Changes (October 30, 2025)**
- ✅ **Per-position election control** - Each position opens individually with manual admin control
- ✅ **Attendance confirmation requirement** - Admin must confirm attendance before opening any position
- ✅ **Position-specific attendance snapshots** - Each position captures its own attendance count at opening time
- ✅ **Automatic majority-based closing** - Positions automatically close when a candidate reaches half+1 votes based on attendance snapshot
- ✅ **Data cleanup between positions** - Votes cleared when opening new positions, candidates preserved
- ✅ **State machine integrity** - Positions can only complete through automatic winner detection, not manual admin action
- ✅ **Single active position enforcement** - Only one position can be active at a time, preventing concurrent voting
- ✅ **Critical bug fixes (scrutiny system)**:
  - Added UNIQUE constraint on candidates(user_id, position_id, election_id) to prevent duplicate candidates
  - Added orphan cleanup migration to remove votes/winners referencing deleted duplicate candidates
  - Fixed automatic election closure to wait for ALL present members to vote before declaring winner
  - Fixed attendance list to exclude position-specific snapshots (filters WHERE election_position_id IS NULL)
  - Fixed results display by preserving candidate history across scrutiny rounds (candidates no longer deleted when advancing to 2nd scrutiny)
  - **Admin override for abstentions**: Added manual position closure with reason logging to handle cases where members leave early or abstain

**Previous Changes (October 29, 2025)**
- ✅ Implemented email-based authentication with verification codes
- ✅ Removed public registration - only admin can add members
- ✅ Added verification_codes table to database
- ✅ Updated login page to two-step flow (email → code)
- ✅ Fixed election results display bug (route ordering)
- ✅ Results now show vote counts and sort candidates by votes (descending)
- ✅ Updated position names to Portuguese (Presidente, Vice-Presidente, etc.)
- ✅ Admin can now register members with just name and email
- ✅ **Integrated Resend for automatic email delivery** - verification codes sent via email
- ✅ **Candidate selection from registered members** - admin selects members from dropdown instead of manual entry
- ✅ **Mobile optimization complete** - all pages now fully responsive with mobile-first design
- ✅ **Three-round scrutiny voting system** - candidates need half+1 votes to win, automatic progression through rounds
- ✅ **Gravatar integration** - candidate photos fetched from Gravatar using MD5 hash of email addresses
- ✅ **Per-position tie resolution** - admin can resolve ties independently for each position on third round
- ✅ **Admin candidate validation** - admins are prevented from being candidates
- ✅ **Election winners table** - separate table tracks winners per position for independent tie resolution
- ✅ **Single admin restriction** - Only marketingumpemaus@gmail.com can access admin panel
- ✅ **Election finalization** - Admin can finalize completed elections to archive them in history
- ✅ **Election history** - New "Histórico" tab shows archived elections with navigation to results
- ✅ **Historical results viewing** - Results page accepts electionId parameter to display past elections
- ✅ **Share results button** - Export election results as professional, institutional image with winners, votes, UMP logo and scripture verse
- ✅ **Multi-format image export** - Admin can choose between 9:16 (Stories - 1080x1920) or 4:5 (Feed - 1080x1350) aspect ratios
- ✅ **Custom design with user-provided assets:**
  - Background: "Fundo Layout stories" textured background (user-provided image)
  - Padding (Stories 9:16): 110px top, 80px bottom, 50px left/right
  - Padding (Feed 4:5): 50px top, 30px bottom, 40px left/right
  - Title: "ELEIÇÃO [YEAR]" bold black text with hollow/outline year (110px/90px font, no background)
  - Cards: Width 480px (Stories) / 420px (Feed), yellow header (#FFD84B) with position name in italic bold, positioned with translateY(-7px)
  - Card body: White background with candidate name (uppercase bold) and vote details
  - Photo: Circular 120px (Stories) / 90px (Feed) overlapping bottom of card (-50px/-40px offset)
  - Spacing (Stories 9:16): 60px between cards, 120px title→cards, 120px cards→verse, 100px verse→logo
  - Spacing (Feed 4:5): 50px between cards, 100px title→cards, 100px cards→verse, 50px verse→logo
  - Grid layout: 2x2 for first 4 positions, 5th position (Tesoureiro) centered below
  - Footer: Scripture verse in 3 lines with italic (28px/24px font) + UMP Emaús logo v3 (300px × 300px Stories / 200px × 200px Feed)
  - Typography: System fonts with bold weights, outline effect on year
  - Shadows: Subtle 0 4px 12px rgba(0,0,0,0.1) on cards
  - Layout optimized to fit within 1920px (Stories) and 1350px (Feed) canvas heights
- ✅ **Fixed duplicate endpoints** - Removed authenticated winners endpoint, now uses single public endpoint
- ✅ **Database reset** - All member and election data cleared, only admin account remains (UMP Emaús / marketingumpemaus@gmail.com)

## System Architecture

### Frontend Architecture

**Framework & Build Tools**
- **React 18** with TypeScript for type-safe component development
- **Vite** as the build tool and development server for fast HMR (Hot Module Replacement)
- **Wouter** for lightweight client-side routing with auth-gated route trees
- **TanStack Query (React Query)** for server state management, caching, and data fetching

**Routing Strategy**
- Separate route trees based on authentication state to prevent redirect loops
- Unauthenticated users: Access to "/" (login) and "/results" only
- Admin users: Access to "/admin", "/vote", and "/results" (default redirect to /admin)
- Member users: Access to "/vote" and "/results" (default redirect to /vote)
- Session persistence via localStorage with automatic hydration on page load

**UI Component System**
- **shadcn/ui** component library built on Radix UI primitives
- **Tailwind CSS** for utility-first styling with custom design tokens
- **Class Variance Authority (CVA)** for component variant management
- Design system follows Material Design principles with custom UMP Emaús branding (primary orange #FFA500)
- **Mobile-first responsive design** using Tailwind's `sm:` breakpoint (640px) for all pages

**State Management Pattern**
- React Context API for authentication state (`AuthProvider`)
- TanStack Query for server state and cache management
- Local storage for token persistence
- Component-level state with React hooks

**Form Handling**
- React Hook Form for form state management
- Zod for schema validation
- @hookform/resolvers for integrating Zod with React Hook Form

### Backend Architecture

**Server Framework**
- **Express.js** on Node.js for RESTful API endpoints
- **TypeScript** for type safety across the stack
- Custom middleware for request logging and authentication

**Authentication & Authorization**
- **Email-based authentication** with 6-digit verification codes
- **JWT (JSON Web Tokens)** for stateless authentication
- **bcrypt.js** for admin password hashing (legacy, admin only)
- Verification codes expire after 15 minutes
- Token-based auth with 7-day expiration
- Role-based access control with `isAdmin` and `isMember` flags
- Middleware functions: `authenticateToken`, `requireAdmin`, `requireMember`

**API Design**
- RESTful endpoints organized by domain:
  - `/api/auth/*` - Authentication (login with password for admin, request-code, verify-code)
  - `/api/admin/*` - Admin operations (add members)
  - `/api/elections/*` - Election management
  - `/api/candidates/*` - Candidate management
  - `/api/positions/*` - Fixed position retrieval (Portuguese names)
  - `/api/vote` - Vote submission
  - `/api/results/*` - Election results with vote counts

**Database Layer**
- **Better-SQLite3** for local SQLite database
- **Drizzle ORM** configured for PostgreSQL (future migration path)
- Storage abstraction pattern (`IStorage` interface) for potential database swapping
- Foreign key constraints enforced at database level

**Database Schema**
Seven main tables with relational integrity:
1. **users** - Authentication and role management (with Gravatar photo support via email MD5 hash)
2. **positions** - Fixed leadership positions (Presidente, Vice-Presidente, 1º Secretário, 2º Secretário, Tesoureiro)
3. **elections** - Election instances with active/closed states, current scrutiny round (1-3), and closedAt timestamp for archival
4. **candidates** - Links candidates to positions and elections (admins cannot be candidates)
5. **votes** - Records votes with voter, candidate, position, election, and scrutiny round tracking
6. **verification_codes** - Temporary email verification codes (15-minute expiry)
7. **election_winners** - Tracks winners per position (electionId + positionId + candidateId + wonAtScrutiny)

**Business Logic Constraints**
- One active election at a time
- One vote per user per position per election per scrutiny round
- Three-round scrutiny system: candidates need half+1 votes to win
- Third round limited to top 2 candidates per position
- Admin can manually resolve ties on third round independently for each position
- Admins cannot be registered as candidates

### External Dependencies

**Email Service**
- **Resend** - Transactional email delivery service
- Used for sending 6-digit verification codes during login
- Environment variable: `RESEND_API_KEY` (required for email functionality)
- Fallback: Codes printed to console if email fails

**UI Component Libraries**
- **@radix-ui/** - Accessible component primitives (24+ components including dialogs, dropdowns, tooltips)
- **lucide-react** - Icon library for consistent iconography

**Development Tools**
- **Drizzle Kit** - Database migration and schema management
- **esbuild** - Server-side bundling for production
- **tsx** - TypeScript execution for development

**CSS & Styling**
- **Tailwind CSS** with PostCSS and Autoprefixer
- Custom design tokens defined in CSS variables
- **Fully responsive mobile-first design:**
  - Mobile (< 640px): Card layouts, stacked headers, compact spacing
  - Desktop (≥ 640px): Table layouts, side-by-side headers, spacious padding
  - Breakpoint: Tailwind's `sm:` at 640px
  - All pages optimized: Login, Admin (dual-layout tables/cards), Vote, Results
  - Accessibility: aria-labels on icon-only mobile buttons

**Validation & Type Safety**
- **Zod** - Runtime schema validation
- **drizzle-zod** - Generates Zod schemas from Drizzle tables
- TypeScript for compile-time type checking

**Database**
- **better-sqlite3** - Currently used for local development
- **@neondatabase/serverless** - Configured for future PostgreSQL deployment
- Database stored in `/data/emaus-vota.db`

**Build & Deployment**
- Production build: Vite for client + esbuild for server
- Static assets served from `dist/public`
- Environment variable: `DATABASE_URL` for PostgreSQL connection (optional)
- CORS enabled for cross-origin requests

**Replit-Specific Integrations**
- **@replit/vite-plugin-runtime-error-modal** - Enhanced error display
- **@replit/vite-plugin-cartographer** - Development tooling
- **@replit/vite-plugin-dev-banner** - Development environment indicators