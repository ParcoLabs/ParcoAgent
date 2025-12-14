# Parco Property Management Dashboard

## Overview

This is a property management dashboard system built with React, TypeScript, and Express.js. The application helps property managers handle maintenance requests, vendor communications, and SLA tracking through an intelligent AI-powered interface. The system features automated request categorization, vendor recommendations, and draft message generation to streamline property management workflows.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for development/build tooling
- **UI Components**: Shadcn/ui component library with Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables and Inter font
- **State Management**: TanStack React Query for server state and caching
- **Routing**: react-router-dom for client-side routing
- **Form Handling**: React Hook Form with Zod validation
- **Mobile Navigation**: Bottom navigation bar (Coinbase-style) with Home, Requests, Agent, Analytics, and More tabs. The "More" button opens a sheet with all navigation items plus user profile. Desktop uses a sidebar navigation.

### Backend Architecture
- **Runtime**: Node.js with Express.js for the main API server
- **Microservices**: 
  - API Gateway service (Fastify) for request routing and HMAC authentication
  - PM Agent service (Fastify) for AI-powered property management logic
- **Data Layer**: Drizzle ORM configured for PostgreSQL with schema management
- **Authentication**: HMAC-SHA256 signature verification for service-to-service communication
- **Session Management**: Express sessions with PostgreSQL session store

### Data Storage
- **Database**: PostgreSQL as the primary database
- **ORM**: Drizzle with TypeScript-first schema definitions
- **Migrations**: Drizzle Kit for database schema management
- **Session Store**: connect-pg-simple for PostgreSQL session storage
- **Development Storage**: In-memory storage implementation for development/testing

### API Design
- **REST API**: Express.js routes with JSON responses
- **Request Validation**: Zod schemas for type-safe request/response handling
- **Error Handling**: Centralized error middleware with proper status codes
- **Logging**: Custom logging utilities with request/response tracking
- **CORS**: Configured for development with Replit integration

### Security Architecture
- **HMAC Authentication**: SHA-256 HMAC signatures for service authentication
- **Input Validation**: Zod schemas for all API inputs
- **Environment Variables**: Secure configuration management
- **Session Security**: Secure session configuration with PostgreSQL persistence

### Development Tools
- **Hot Reload**: Vite HMR for frontend, tsx for backend development
- **Code Quality**: TypeScript strict mode with comprehensive type checking
- **Build System**: Vite for frontend bundling, esbuild for backend compilation
- **Path Aliases**: Configured TypeScript path mapping for cleaner imports

### Deployment Architecture
- **Build Process**: Separate frontend (Vite) and backend (esbuild) compilation
- **Static Assets**: Frontend builds to dist/public for static serving
- **Process Management**: NODE_ENV-based environment configuration
- **Database Management**: Drizzle push commands for schema deployment

## External Dependencies

### Core Frameworks
- **React Ecosystem**: React 18, React DOM, React Hook Form, TanStack React Query
- **Backend Framework**: Express.js with TypeScript support via tsx
- **Build Tools**: Vite, esbuild, TypeScript compiler

### UI/UX Libraries
- **Component Library**: Comprehensive Radix UI component collection (40+ components)
- **Styling**: Tailwind CSS with PostCSS and Autoprefixer
- **Icons**: Lucide React icon library
- **Utilities**: clsx and tailwind-merge for conditional styling

### Database & Storage
- **Database Driver**: @neondatabase/serverless for PostgreSQL connectivity
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Session Store**: connect-pg-simple for PostgreSQL session management
- **Schema Management**: Drizzle Kit for migrations and schema management

### Validation & Security
- **Schema Validation**: Zod for runtime type checking and validation
- **HMAC Security**: Built-in crypto module for signature generation/verification
- **Form Validation**: @hookform/resolvers with Zod integration

### Development & Utilities
- **Date Handling**: date-fns for date manipulation and formatting
- **HTTP Client**: Fetch API for service-to-service communication
- **Development**: @replit/vite-plugin-runtime-error-modal and cartographer for Replit integration
- **Carousel**: embla-carousel-react for interactive components

### Microservices Framework
- **API Gateway**: Fastify for high-performance request routing
- **Service Communication**: RESTful APIs with JSON payloads
- **Load Balancing**: Environment-based service discovery