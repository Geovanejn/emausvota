# Emaús Vota - Election Management System

## Overview
Emaús Vota is a full-stack web application designed to manage elections for a church youth group (UMP Emaús). The system provides email-based authentication with verification codes, role-based access control (admin/member), election management, and voting functionality with real-time results. Built with a focus on trust, transparency, and accessibility, it follows civic tech design principles to ensure clarity during the voting process, aiming to provide a transparent and accessible voting experience.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The frontend is built with **React 18** and **TypeScript**, using **Vite** for development and building. **Wouter** handles lightweight client-side routing with auth-gated route trees. **TanStack Query** manages server state, caching, and data fetching. The UI is built using **shadcn/ui** components on **Radix UI** primitives and styled with **Tailwind CSS**, adhering to a mobile-first responsive design based on Material Design principles with custom UMP Emaús branding. State management uses React Context API for authentication, TanStack Query for server state, and local storage for token persistence. Form handling is managed by **React Hook Form** with **Zod** for validation.

### Backend Architecture
The backend uses **Express.js** on **Node.js** with **TypeScript** for RESTful API endpoints. Authentication is email-based with 6-digit verification codes and **JWT** for stateless sessions. **bcrypt.js** is used for admin password hashing. Role-based access control is implemented via `isAdmin` and `isMember` flags. The API is organized into domains like `/api/auth`, `/api/admin`, `/api/elections`, and `/api/vote`. The database layer uses **Better-SQLite3** for development, with **Drizzle ORM** configured for PostgreSQL. The schema includes tables for `users`, `positions`, `elections`, `candidates`, `votes`, `verification_codes`, and `election_winners`, enforcing business logic constraints like one active election at a time, one vote per user per position, and a three-round scrutiny system.

### UI/UX Decisions
The system features a responsive UI following civic tech design principles, ensuring clarity during the voting process. It includes a Portuguese language interface and custom UMP Emaús branding with a primary orange color (`#FFA500`). The results display is real-time, with automatic polling, smart sorting, and visual hierarchies to highlight leading and elected candidates. An "Export Results" feature allows admins to generate professional, institutional images of election results in various aspect ratios (9:16 for Stories, 4:5 for Feed) using custom user-provided assets, typography, and precise spacing.

### Feature Specifications
Key features include:
- Email-based authentication with 6-digit verification codes and JWT tokens.
- Role-based access control (admin/member).
- Election management (create, close, archive elections).
- Candidate registration and management.
- Secure voting with duplicate prevention.
- Real-time results display with vote counts and percentages.
- Admin panel for member registration and attendance confirmation.
- Per-position election control, allowing individual positions to open/close.
- Automatic majority-based closing for positions.
- Three-round scrutiny voting system with tie-resolution.
- Generation of shareable election results images.
- Full mobile optimization.

## External Dependencies

### Email Service
- **Resend**: Used for sending transactional emails, specifically 6-digit verification codes.

### UI Component Libraries
- **@radix-ui/**: Accessible component primitives for building the UI.
- **lucide-react**: Icon library for consistent iconography across the application.

### Database
- **better-sqlite3**: Used for local SQLite database development.
- **@neondatabase/serverless**: Configured for potential future PostgreSQL deployment.

### Development Tools
- **Drizzle Kit**: For database migration and schema management.
- **esbuild**: For server-side bundling in production.
- **tsx**: For TypeScript execution during development.

### Validation
- **Zod**: Runtime schema validation for data integrity.
- **drizzle-zod**: Generates Zod schemas from Drizzle tables.