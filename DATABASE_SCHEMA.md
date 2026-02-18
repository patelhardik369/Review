# AI Review Response SaaS - Database Schema

## Overview

This document details the Supabase PostgreSQL database schema for the AI Review Response SaaS platform.

---

## Entity Relationship Diagram

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│    users     │       │  businesses  │       │ subscriptions│
├──────────────┤       ├──────────────┤       ├──────────────┤
│ id (PK)      │       │ id (PK)      │       │ id (PK)      │
│ email        │◄──────│ user_id (FK) │       │ user_id (FK) │
│ created_at   │       │ name         │       │ stripe_sub_id│
│ updated_at   │       │ address      │       │ plan         │
│              │       │ phone        │       │ status       │
└──────────────┘       │ gmb_location │       │ current_period│
         │              │ created_at   │       │ cancel_at    │
         │              └──────┬───────┘       └──────────────┘
         │                     │
         │                     │ 1:N
         ▼                     ▼
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│brand_settings│       │   reviews    │       │  responses   │
├──────────────┤       ├──────────────┤       ├──────────────┤
│ id (PK)      │       │ id (PK)      │       │ id (PK)      │
│ user_id (FK) │       │ business_id  │       │ review_id(FK)│
│ business_id  │       │ gmb_review_id│       │ content      │
│ tone         │       │ author_name  │       │ status       │
│ vocabulary   │       │ star_rating  │       │ created_at   │
│ greeting     │       │ review_text  │       │ approved_at  │
│ closing      │       │ review_time  │       │ published_at │
│ created_at   │       │ sentiment    │       │ gmb_reply_id │
└──────────────┘       │ created_at   │       └──────────────┘
                       └──────────────┘

┌──────────────┐       ┌──────────────┐
│  api_keys    │       │  webhooks    │
├──────────────┤       ├──────────────┤
│ id (PK)      │       │ id (PK)      │
│ user_id (FK) │       │ user_id (FK) │
│ provider     │       │ event_type   │
│ access_token │       │ payload      │
│ refresh_token│       │ processed    │
│ expires_at   │       │ created_at   │
└──────────────┘       └──────────────┘
```

---

## Tables

### 1. profiles

Extended user profile data.

```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  company_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Trigger to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 2. businesses

Business locations managed by users.

```sql
CREATE TABLE public.businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  country TEXT DEFAULT 'US',
  phone TEXT,
  website TEXT,
  gmb_account_id TEXT,
  gmb_location_id TEXT,
  gmb_location_name TEXT,
  stripe_customer_id TEXT,
  response_limit INTEGER DEFAULT 50,
  responses_used INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_businesses_user_id ON public.businesses(user_id);
CREATE INDEX idx_businesses_gmb_location_id ON public.businesses(gmb_location_id);

-- RLS
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own businesses"
  ON public.businesses FOR ALL
  USING (auth.uid() = user_id);
```

### 3. reviews

Fetched reviews from Google My Business.

```sql
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  gmb_review_id TEXT UNIQUE NOT NULL,
  author_name TEXT,
  author_photo_url TEXT,
  star_rating INTEGER CHECK (star_rating >= 1 AND star_rating <= 5),
  review_text TEXT,
  review_time TIMESTAMPTZ,
  create_time TIMESTAMPTZ,
  update_time TIMESTAMPTZ,
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  is_responded BOOLEAN DEFAULT false,
  priority INTEGER DEFAULT 0,
  review_metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_reviews_business_id ON public.reviews(business_id);
CREATE INDEX idx_reviews_gmb_review_id ON public.reviews(gmb_review_id);
CREATE INDEX idx_reviews_sentiment ON public.reviews(sentiment);
CREATE INDEX idx_reviews_created_at ON public.reviews(created_at DESC);

-- RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view reviews for own businesses"
  ON public.reviews FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );
```

### 4. responses

AI-generated and approved responses to reviews.

```sql
CREATE TABLE public.responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  tone TEXT,
  status TEXT CHECK (status IN ('draft', 'generated', 'approved', 'published', 'rejected')) DEFAULT 'draft',
  ai_model TEXT,
  ai_tokens_used INTEGER,
  edit_history JSONB,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  gmb_reply_id TEXT,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_responses_review_id ON public.responses(review_id);
CREATE INDEX idx_responses_business_id ON public.responses(business_id);
CREATE INDEX idx_responses_status ON public.responses(status);

-- RLS
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage responses for own businesses"
  ON public.responses FOR ALL
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );
```

### 5. subscriptions

Stripe subscription data.

```sql
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  stripe_price_id TEXT,
  status TEXT CHECK (status IN ('active', 'trialing', 'canceled', 'incomplete', 'past_due', 'unpaid', 'paused')),
  plan_type TEXT CHECK (plan_type IN ('starter', 'professional', 'business', 'agency')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  canceled_at TIMESTAMPTZ,
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_subscription_id ON public.subscriptions(stripe_subscription_id);

-- RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);
```

### 6. brand_settings

Brand voice customization per business.

```sql
CREATE TABLE public.brand_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID UNIQUE REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tone TEXT CHECK (tone IN ('professional', 'friendly', 'casual', 'formal', 'custom')) DEFAULT 'professional',
  greeting TEXT,
  closing TEXT,
  custom_vocabulary TEXT[],
  response_length TEXT CHECK (response_length IN ('short', 'medium', 'long')) DEFAULT 'medium',
  include_coupon BOOLEAN DEFAULT false,
  coupon_code TEXT,
  custom_phrases JSONB,
  auto_publish BOOLEAN DEFAULT false,
  notify_on_negative BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE public.brand_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own brand settings"
  ON public.brand_settings FOR ALL
  USING (auth.uid() = user_id);
```

### 7. api_keys

Stored API credentials for external services.

```sql
CREATE TABLE public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'openai', 'claude', 'sendgrid', 'resend')),
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  metadata JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own API keys"
  ON public.api_keys FOR ALL
  USING (auth.uid() = user_id);
```

### 8. webhooks

Webhook event log for Stripe and other services.

```sql
CREATE TABLE public.webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('stripe', 'google', 'resend')),
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  processing_error TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_webhooks_event_type ON public.webhooks(event_type);
CREATE INDEX idx_webhooks_processed ON public.webhooks(processed);
```

### 9. usage_logs

Track API usage for billing.

```sql
CREATE TABLE public.usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('review_fetch', 'ai_response', 'email_sent', 'api_call')),
  tokens_used INTEGER DEFAULT 0,
  cost_cents INTEGER DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_usage_logs_user_id ON public.usage_logs(user_id);
CREATE INDEX idx_usage_logs_created_at ON public.usage_logs(created_at);
```

---

## Database Functions

### Helper Functions

```sql
-- Get user's current subscription
CREATE OR REPLACE FUNCTION public.get_user_subscription(user_uuid UUID)
RETURNS TABLE (
  id UUID,
  plan_type TEXT,
  status TEXT,
  current_period_end TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.plan_type, s.status, s.current_period_end
  FROM public.subscriptions s
  WHERE s.user_id = user_uuid
    AND s.status IN ('active', 'trialing')
  ORDER BY s.created_at DESC
  LIMIT 1;
END;
$$;

-- Check response limit
CREATE OR REPLACE FUNCTION public.check_response_limit(business_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  limit_val INTEGER;
  used_val INTEGER;
BEGIN
  SELECT b.response_limit, b.responses_used INTO limit_val, used_val
  FROM public.businesses b
  WHERE b.id = business_uuid;
  
  RETURN used_val < limit_val;
END;
$$;

-- Update response count
CREATE OR REPLACE FUNCTION public.increment_response_count(business_uuid UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.businesses
  SET responses_used = responses_used + 1,
      updated_at = NOW()
  WHERE id = business_uuid;
END;
$$;
```

---

## Migrations

### Initial Setup Migration

```sql
-- Run this in Supabase SQL Editor to create initial schema

-- 1. Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  company_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create other tables (see above sections)
-- 3. Create indexes
-- 4. Enable RLS and create policies
-- 5. Create helper functions
```

---

## Seed Data

### Sample Plans

```sql
INSERT INTO internal.plans (name, price_monthly, response_limit, locations_limit, features)
VALUES 
  ('Starter', 4900, 50, 1, ARRAY['Basic AI responses', 'Email support', 'Google Reviews']),
  ('Professional', 9900, 200, 3, ARRAY['Advanced AI', 'Priority support', 'Multi-location', 'Analytics']),
  ('Business', 19900, -1, 10, ARRAY['Unlimited AI', '24/7 support', 'White-label', 'API access']),
  ('Agency', 49900, -1, -1, ARRAY['Unlimited locations', 'Dedicated support', 'Custom integrations'])
ON CONFLICT (name) DO NOTHING;
```

---

## Backup & Recovery

### Point-in-Time Recovery

Supabase provides automatic backups. For custom backups:

```sql
-- Create backup table
CREATE TABLE public.backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Schedule daily backups via Supabase Edge Functions
-- Or use pg_dump for full database backup
```
