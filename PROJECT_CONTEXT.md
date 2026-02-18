# AI Review Response SaaS - Technical Context & Architecture

## Project Overview

This document provides comprehensive technical context for building an AI-powered review response automation SaaS platform.

---

## Technology Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 14.x | React framework with App Router |
| React | 18.x | UI library |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 3.x | Styling |
| Vercel | - | Hosting & deployment |

### Backend

| Technology | Purpose |
|------------|---------|
| Supabase | PostgreSQL, Auth, Edge Functions, Storage |
| OpenAI API | GPT-4 for response generation |
| Claude API | Fallback AI provider |
| Google My Business API | Review fetching & posting |
| Stripe | Payment processing |
| SendGrid/Resend | Email notifications |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                │
│                     (Next.js 14 / Vercel)                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │Dashboard │  │ Reviews  │  │ Settings │  │ Billing  │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                        BACKEND                                  │
│                     (Supabase Platform)                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Supabase Services                      │  │
│  │  ┌─────────┐  ┌─────────┐  ┌──────────┐  ┌─────────┐  │  │
│  │  │  Auth   │  │Database │  │ Edge     │  │Storage │  │  │
│  │  │         │  │(Postgres)│  │Functions │  │         │  │  │
│  │  └─────────┘  └─────────┘  └──────────┘  └─────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Google     │    │   OpenAI/    │    │   Stripe     │
│   My Business│    │   Claude     │    │   Payments   │
│   API        │    │   API        │    │   API        │
└──────────────┘    └──────────────┘    └──────────────┘
```

---

## Supabase Architecture

### Row Level Security (RLS)

Based on Context7 documentation, implement RLS for multi-tenant data isolation:

```sql
-- Enable RLS on tables
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;

-- Create policies for user isolation
CREATE POLICY "Users can view their own businesses"
  ON businesses
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can view their own reviews"
  ON reviews
  FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );
```

### Multi-Tenant Data Isolation

```sql
-- RLS policy for multi-tenant SaaS
CREATE POLICY "Tenant isolation"
  ON public.businesses
  FOR ALL
  TO authenticated
  USING (
    tenant_id = (SELECT auth.jwt() -> 'app_metadata' ->> 'tenant_id')
  )
  WITH CHECK (
    tenant_id = (SELECT auth.jwt() -> 'app_metadata' ->> 'tenant_id')
  );
```

---

## Next.js 14 Architecture

### App Router Structure

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   ├── signup/
│   │   └── layout.tsx
│   ├── (dashboard)/
│   │   ├── dashboard/
│   │   ├── reviews/
│   │   ├── settings/
│   │   ├── billing/
│   │   └── layout.tsx
│   ├── api/
│   │   ├── auth/
│   │   ├── webhooks/
│   │   └── reviews/
│   ├── layout.tsx
│   └── page.tsx
├── components/
├── lib/
│   ├── supabase/
│   ├── openai/
│   ├── stripe/
│   └── utils/
└── types/
```

### Authentication Flow

Based on Context7 Next.js documentation:

```typescript
// Middleware for route protection
import { NextRequest, NextResponse } from 'next/server'
import { decrypt } from '@/app/lib/session'
import { cookies } from 'next/headers'

const protectedRoutes = ['/dashboard', '/reviews', '/settings']
const publicRoutes = ['/login', '/signup', '/']

export default async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname
  const isProtectedRoute = protectedRoutes.includes(path)
  const isPublicRoute = publicRoutes.includes(path)

  const cookie = (await cookies()).get('session')?.value
  const session = await decrypt(cookie)

  if (isProtectedRoute && !session?.userId) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  if (isPublicRoute && session?.userId) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
}
```

### Server Actions with Authorization

```typescript
'use server'
import { verifySession } from '@/app/lib/dal'
import { createResponse, publishToGMB } from '@/lib/reviews'

export async function generateResponse(reviewId: string, formData: FormData) {
  const session = await verifySession()
  
  if (!session?.userId) {
    return { error: 'Unauthorized' }
  }

  // Generate AI response
  const response = await createResponse(reviewId, formData)
  
  return { success: true, response }
}

export async function publishResponse(responseId: string) {
  const session = await verifySession()
  const userRole = session?.user?.role

  // Admin-only action
  if (userRole !== 'admin' && userRole !== 'user') {
    return { error: 'Forbidden' }
  }

  await publishToGMB(responseId)
  return { success: true }
}
```

---

## API Integrations

### Google My Business API

**Endpoints Used:**
- `accounts/{accountId}/locations/{locationId}/reviews` - Fetch reviews
- `accounts/{accountId}/locations/{locationId}/reviews/{reviewId}/ replies` - Post responses

**Authentication:** OAuth 2.0 with refresh tokens

**Rate Limits:** 60 requests per minute (Google recommends)

### OpenAI API

**Model:** GPT-4

**Pricing:**
- Input: $0.03/1K tokens
- Output: $0.06/1K tokens

**Response Generation Prompt:**
```
You are a professional business owner responding to a customer review.

Business Name: {business_name}
Business Type: {business_type}
Brand Voice: {brand_voice}

Review: {review_text}
Rating: {rating}/5

Generate a professional, brand-appropriate response that:
1. Thanks the customer
2. Addresses specific points mentioned
3. Maintains {brand_voice} tone
4. Includes appropriate call-to-action if applicable
5. Stays under 150 words
```

### Stripe Integration

**Features:**
- Subscription management
- Customer portal
- Webhook handling
- Invoice generation

**Webhook Events to Handle:**
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

---

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Google
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=your_redirect_uri

# OpenAI
OPENAI_API_KEY=your_openai_key

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_publishable_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret

# Email
RESEND_API_KEY=your_resend_key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Database Schema (High-Level)

### Core Tables

1. **users** - Extended user profiles
2. **businesses** - Business locations
3. **reviews** - Fetched reviews
4. **responses** - AI-generated/approved responses
5. **subscriptions** - Stripe subscription data
6. **brand_settings** - Brand voice configurations

### Relationships

```
users 1───< businesses 1───< reviews 1───< responses
  │
  └──< subscriptions
  │
  └──< brand_settings
```

---

## Deployment

### Vercel Configuration

```json
{
  "buildCommand": "npm run build",
  "installCommand": "npm install",
  "framework": "nextjs",
  "env": {
    "NEXT_PUBLIC_SUPABASE_URL": "@supabase-url",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@supabase-anon-key"
  }
}
```

### Supabase Edge Functions

Deploy using Supabase CLI:
```bash
supabase functions deploy review-sync --no-verify-jwt
supabase functions deploy ai-response --no-verify-jwt
```

---

## Security Considerations

1. **Authentication**: Supabase Auth with JWT
2. **Authorization**: RLS policies for all tables
3. **API Security**: Rate limiting, input validation
4. **Data Encryption**: TLS in transit, encrypted at rest
5. **Secrets Management**: Environment variables, secure storage

---

## Performance Optimization

1. **Database**: Indexes on frequently queried columns
2. **Caching**: Redis for API responses (optional)
3. **CDN**: Vercel edge network for static assets
4. **Code Splitting**: Next.js automatic optimization
5. **Image Optimization**: next/image component

---

## Monitoring & Observability

| Tool | Purpose |
|------|---------|
| Sentry | Error tracking |
| Vercel Analytics | Performance monitoring |
| Supabase Dashboard | Database metrics |
| Stripe Dashboard | Payment metrics |

---

## Development Workflow

1. **Local Development**: `npm run dev`
2. **Type Checking**: `npm run typecheck`
3. **Linting**: `npm run lint`
4. **Testing**: `npm run test`
5. **Build**: `npm run build`
6. **Deploy**: Git push to main (auto-deploy)

---

## References

- [Supabase Docs](https://supabase.com/docs)
- [Next.js 14 Docs](https://nextjs.org/docs)
- [Google My Business API](https://developers.google.com/my-business)
- [OpenAI API](https://platform.openai.com/docs)
- [Stripe Docs](https://stripe.com/docs)
