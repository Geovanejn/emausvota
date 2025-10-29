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

**Recent Changes (October 29, 2025)**
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
Six main tables with relational integrity:
1. **users** - Authentication and role management
2. **positions** - Fixed leadership positions (Presidente, Vice-Presidente, 1º Secretário, 2º Secretário, Tesoureiro)
3. **elections** - Election instances with active/closed states
4. **candidates** - Links candidates to positions and elections
5. **votes** - Records votes with voter, candidate, position, and election tracking
6. **verification_codes** - Temporary email verification codes (15-minute expiry)

**Business Logic Constraints**
- One active election at a time
- One vote per user per position per election
- Users cannot vote multiple times for the same position

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
- Responsive design with mobile-first approach

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