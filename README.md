# PureFlow: Water Filter Subscription & Maintenance Platform

![PureFlow Logo](generated-icon.png)

## Overview

PureFlow is a comprehensive water filter subscription and maintenance management platform that leverages intelligent technology to optimize service delivery and technician management. The platform connects customers with technicians for water filter installation, maintenance, and repair services through a subscription-based model.

## Deployment Options

### Netlify Deployment

This application is configured for easy deployment on Netlify:

1. Push your code to a Git repository
2. Connect the repository to Netlify
3. Configure the build settings:
   - Build command: `npm run build`
   - Publish directory: `dist/public`
   - Functions directory: `dist/functions`
4. Add the required environment variables in the Netlify dashboard
5. Deploy the site

For detailed Netlify deployment instructions, see [NETLIFY_DEPLOY.md](NETLIFY_DEPLOY.md)

## Key Features

### Multi-Portal Ecosystem

- **Customer Portal**: Manage subscriptions, schedule services, and track maintenance history
- **Technician Portal**: View assigned jobs, update job status, and manage schedules
- **Admin Portal**: Comprehensive dashboard for managing the entire system

### Advanced Technician Management

- Dynamic skill-matching for optimal service allocation
- Real-time job scheduling and assignment
- Technician status tracking and performance metrics

### Subscription Management

- Flexible subscription plans with recurring billing
- Automated payment processing via Stripe
- Subscription status tracking and management

### Service Management

- Installation, filter change, and repair service types
- Customer location mapping and routing
- Comprehensive job history and tracking

### Integrated Payment System

- Secure payment processing through Stripe
- Invoice generation and management
- Payment history and reporting

### Notification System

- Automatic notifications for service reminders, payments, and status updates
- Customizable notification preferences
- Multi-channel delivery (email, SMS)

## Technology Stack

### Frontend
- React.js with TypeScript
- TanStack Query for data fetching and state management
- Shadcn UI components with Tailwind CSS for styling
- Responsive design for mobile, tablet, and desktop

### Backend
- Node.js with Express.js
- PostgreSQL database with Drizzle ORM
- RESTful API architecture
- Authentication via Passport.js

### Payment Processing
- Stripe API integration for payment processing
- Support for one-time payments and subscriptions

## Installation & Setup

### Prerequisites

- Node.js (v18+)
- PostgreSQL database
- Stripe account with API keys

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/pureflow
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
VITE_STRIPE_PUBLIC_KEY=pk_test_your_stripe_public_key
SESSION_SECRET=your_secure_session_secret
```

### Installation Steps

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/pureflow.git
   cd pureflow
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up the database schema:
   ```bash
   npm run db:push
   ```

4. Create an admin user:
   ```bash
   node create-admin.js
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Open your browser and navigate to `http://localhost:5000`

## User Roles & Access

### Customer
- **Access**: Customer portal at `/customer/dashboard`
- **Features**: View subscription details, schedule maintenance, manage billing and payments, update profile settings
- **Onboarding Process**: Account creation → Welcome & Confirmation → Subscription Plan Selection → Address Collection → Payment Options → Checkout (for card payments) → Installation Scheduling → Dashboard access

### Technician
- **Access**: Technician portal at `/technician/dashboard`
- **Features**: View assigned jobs, update job status (scheduled, en_route, arrived, completed), manage schedule

### Administrator
- **Access**: Admin portal at `/admin/dashboard`
- **Features**: Manage users, subscriptions, jobs, payments, technicians, and system settings

## Test Accounts

The following test accounts are available for demonstration purposes:

### Admin
- **Username**: admin@pureflow.com
- **Password**: admin123

### Technician
- **Username**: tech@pureflow.com
- **Password**: tech123

### Customer
- **Username**: motasem@motasem.com
- **Password**: customer123

## Stripe Test Cards

Use these test cards for payment processing in the development environment:

- **Success**: 4242 4242 4242 4242
- **Authentication Required**: 4000 0025 0000 3155
- **Payment Fails**: 4000 0000 0000 0002

## API Endpoints

### Authentication
- `POST /api/register` - Register a new user
- `POST /api/login` - Login user
- `