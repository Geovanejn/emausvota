# Emaús Vota - Election Management System

## Overview

Emaús Vota is a full-stack web application designed to manage elections for a church youth group (UMP Emaús). The system provides secure authentication, role-based access control (admin/member), election management, and voting functionality with real-time results. Built with a focus on trust, transparency, and accessibility, it follows civic tech design principles to ensure clarity during the voting process.

## User Preferences

Preferred communication style: Simple, everyday language.

## Project Status

**✅ Fully implemented and tested**
- Complete authentication system with JWT and bcrypt password hashing
- Role-based access control (admin/member) with auth-gated routing
- Election management (create, close elections)
- Candidate registration system
- Secure voting with duplicate prevention (one vote per position per election)
- Real-time results display
- Session persistence with automatic hydration
- Responsive UI following civic tech design principles
- All browser console errors resolved

**Recent Changes (October 29, 2025)**
- Fixed critical infinite loop issue by implementing separate route trees for different auth states
- Removed dynamic redirects in favor of conditional route rendering
- Cleaned up unused ProtectedRoute component
- Verified all authentication flows work correctly with session persistence

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
- **JWT (JSON Web Tokens)** for stateless authentication
- **bcrypt.js** for password hashing
- Token-based auth with 7-day expiration
- Role-based access control with `isAdmin` and `isMember` flags
- Middleware functions: `authenticateToken`, `requireAdmin`, `requireMember`

**API Design**
- RESTful endpoints organized by domain:
  - `/api/auth/*` - Authentication (login, register)
  - `/api/elections/*` - Election management
  - `/api/candidates/*` - Candidate management
  - `/api/positions/*` - Fixed position retrieval
  - `/api/vote` - Vote submission
  - `/api/results/*` - Election results

**Database Layer**
- **Better-SQLite3** for local SQLite database
- **Drizzle ORM** configured for PostgreSQL (future migration path)
- Storage abstraction pattern (`IStorage` interface) for potential database swapping
- Foreign key constraints enforced at database level

**Database Schema**
Five main tables with relational integrity:
1. **users** - Authentication and role management
2. **positions** - Fixed leadership positions (President, Vice-President, Secretaries, Treasurer)
3. **elections** - Election instances with active/closed states
4. **candidates** - Links candidates to positions and elections
5. **votes** - Records votes with voter, candidate, position, and election tracking

**Business Logic Constraints**
- One active election at a time
- One vote per user per position per election
- Users cannot vote multiple times for the same position

### External Dependencies

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