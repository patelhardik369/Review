# AI Review Response SaaS - API Integration Guide

## Overview

This document provides detailed integration guides for the external APIs required by the AI Review Response SaaS platform.

---

## Table of Contents

1. [Google My Business API](#google-my-business-api)
2. [OpenAI API](#openai-api)
3. [Claude API](#claude-api)
4. [Stripe API](#stripe-api)
5. [Resend/SendGrid API](#resendsendgrid-api)

---

## Google My Business API

### Setup

1. **Create Google Cloud Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project

2. **Enable APIs**
   - Enable "My Business Account Management API"
   - Enable "My Business Business Information API"
   - Enable "My Business Notifications API"

3. **Create OAuth Credentials**
   - Go to APIs & Services > Credentials
   - Create OAuth 2.0 Client ID
   - Set redirect URI: `https://your-app.com/api/auth/google/callback`
   - Copy Client ID and Client Secret

### Authentication Flow

```typescript
// lib/google/oauth.ts
import { google } from 'googleapis'

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
)

export const getAuthUrl = () => {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/business.manage',
      'https://www.googleapis.com/auth/businessnotifications'
    ],
    prompt: 'consent'
  })
}

export const getTokens = async (code: string) => {
  const { tokens } = await oauth2Client.getToken(code)
  return tokens
}

export const refreshToken = async (refreshToken: string) => {
  oauth2Client.setCredentials({ refresh_token: refreshToken })
  const { credentials } = await oauth2Client.refreshAccessToken()
  return credentials
}
```

### Fetch Reviews

```typescript
// lib/google/reviews.ts
import { google } from 'googleapis'

const mybusiness = google.mybusiness('v4')

export async function fetchReviews(
  accessToken: string,
  locationName: string
) {
  oauth2Client.setCredentials({ access_token: accessToken })
  
  const response = await mybusiness.accounts.locations.reviews.list({
    parent: locationName,
    pageSize: 50
  })
  
  return response.data.reviews || []
}

export async function postResponse(
  accessToken: string,
  locationName: string,
  reviewId: string,
  comment: string
) {
  oauth2Client.setCredentials({ access_token: accessToken })
  
  const response = await mybusiness.accounts.locations.reviews.replies.create({
    parent: `${locationName}/reviews/${reviewId}`,
    requestBody: { comment }
  })
  
  return response.data
}
```

### Get Business Locations

```typescript
// lib/google/locations.ts
export async function getLocations(accessToken: string, accountId: string) {
  oauth2Client.setCredentials({ access_token: accessToken })
  
  const response = await mybusiness.accounts.locations.list({
    parent: accountId,
    pageSize: 100
  })
  
  return response.data.locations || []
}
```

---

## OpenAI API

### Setup

1. **Get API Key**
   - Go to [OpenAI Platform](https://platform.openai.com/)
   - Navigate to API Keys
   - Create new secret key
   - Set usage limits in billing

### Integration

```typescript
// lib/openai/index.ts
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

interface GenerateResponseParams {
  reviewText: string
  rating: number
  businessName: string
  businessType: string
  tone: string
  greeting?: string
  closing?: string
  vocabulary?: string[]
}

export async function generateReviewResponse({
  reviewText,
  rating,
  businessName,
  businessType,
  tone,
  greeting,
  closing,
  vocabulary
}: GenerateResponseParams) {
  const systemPrompt = `You are a professional business owner responding to a customer review.

Business Name: ${businessName}
Business Type: ${businessType}
Brand Voice: ${tone}

Guidelines:
- ${greeting ? `Start with: "${greeting}"` : 'Always start with a warm greeting'}
- ${closing ? `End with: "${closing}"` : 'Include a call-to-action'}
- ${vocabulary?.length ? `Use these preferred terms: ${vocabulary.join(', ')}` : 'Use professional language'}
- Keep response under 150 words
- Be specific to the review content
- For negative reviews: acknowledge concerns, offer resolution
- For positive reviews: express gratitude, encourage return`

  const userPrompt = `Review: "${reviewText}"
Rating: ${rating}/5 stars

Generate a response that addresses this review:`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.7,
    max_tokens: 500
  })

  return {
    content: completion.choices[0]?.message?.content || '',
    tokens: completion.usage?.total_tokens || 0,
    model: 'gpt-4'
  }
}

export async function analyzeSentiment(text: string) {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: 'Analyze the sentiment of this review. Return either "positive", "neutral", or "negative".'
      },
      { role: 'user', content: text }
    ],
    temperature: 0.3,
    max_tokens: 10
  })

  return completion.choices[0]?.message?.content?.toLowerCase() || 'neutral'
}
```

### Error Handling

```typescript
// lib/openai/errors.ts
export class OpenAIError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number
  ) {
    super(message)
    this.name = 'OpenAIError'
  }
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  let lastError: Error
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error: any) {
      lastError = error
      
      if (error.statusCode === 429) {
        const delay = Math.pow(2, i) * 1000
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }
      
      if (error.statusCode >= 500) {
        await new Promise(resolve => setTimeout(resolve, 1000))
        continue
      }
      
      throw error
    }
  }
  
  throw lastError!
}
```

---

## Claude API

### Setup

1. **Get API Key**
   - Go to [Anthropic Console](https://console.anthropic.com/)
   - Create API key
   - Add payment method

### Integration

```typescript
// lib/claude/index.ts
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

export async function generateReviewResponseClaude(
  reviewText: string,
  rating: number,
  businessName: string,
  tone: string
) {
  const message = await anthropic.messages.create({
    model: 'claude-3-opus-20240229',
    max_tokens: 500,
    system: `You are a professional business owner responding to customer reviews for ${businessName}.
    
Tone: ${tone}
- For positive reviews: Express gratitude, mention specific details
- For negative reviews: Apologize, acknowledge issues, offer to make it right
- Keep responses under 150 words
- Always be genuine and professional`,
    messages: [
      {
        role: 'user',
        content: `Review (${rating}/5 stars): ${reviewText}\n\nWrite a professional response:`
      }
    ]
  })

  return {
    content: message.content[0].type === 'text' ? message.content[0].text : '',
    tokens: message.usage.input_tokens + message.usage.output_tokens,
    model: 'claude-3-opus'
  }
}
```

---

## Stripe API

### Setup

1. **Create Stripe Account**
   - Go to [Stripe](https://stripe.com/)
   - Complete account setup

2. **Get API Keys**
   - Go to Developers > API Keys
   - Copy Publishable Key (starts with `pk_`)
   - Copy Secret Key (starts with `sk_`)

3. **Create Products**
   - Create 4 products matching pricing tiers
   - Set up pricing in cents

### Subscription Integration

```typescript
// lib/stripe/index.ts
import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16'
})

export const PLANS = {
  starter: {
    name: 'Starter',
    priceId: 'price_starter_monthly',
    price: 4900,
    responseLimit: 50,
    locations: 1
  },
  professional: {
    name: 'Professional',
    priceId: 'price_professional_monthly',
    price: 9900,
    responseLimit: 200,
    locations: 3
  },
  business: {
    name: 'Business',
    priceId: 'price_business_monthly',
    price: 19900,
    responseLimit: -1,
    locations: 10
  },
  agency: {
    name: 'Agency',
    priceId: 'price_agency_monthly',
    price: 49900,
    responseLimit: -1,
    locations: -1
  }
}

export async function createCustomer(email: string, name: string) {
  return stripe.customers.create({
    email,
    name,
    metadata: {
      source: 'ai-review-saas'
    }
  })
}

export async function createSubscription(
  customerId: string,
  priceId: string
) {
  return stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    payment_behavior: 'default_incomplete',
    payment_settings: { save_default_payment_method: 'on_subscription' },
    expand: ['latest_invoice.payment_intent']
  })
}

export async function cancelSubscription(subscriptionId: string) {
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true
  })
}

export async function createCheckoutSession(
  customerId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string
) {
  return stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1
      }
    ],
    success_url: successUrl,
    cancel_url: cancelUrl
  })
}
```

### Webhook Handler

```typescript
// app/api/webhooks/stripe/route.ts
import { headers } from 'next/headers'
import { stripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  const body = await req.text()
  const signature = headers().get('Stripe-Signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err: any) {
    return new Response(`Webhook Error: ${err.message}`, { status: 400 })
  }

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription
      await handleSubscriptionChange(subscription)
      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      await handleSubscriptionCanceled(subscription)
      break
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice
      await handlePaymentSuccess(invoice)
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      await handlePaymentFailed(invoice)
      break
    }
  }

  return new Response(null, { status: 200 })
}

async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string
  
  const { data: customer } = await stripe.customers.retrieve(customerId) as Stripe.Customer
  const userEmail = customer?.email

  if (!userEmail) return

  const { data: user } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', userEmail)
    .single()

  if (!user) return

  const planType = getPlanType(subscription.items.data[0]?.price.id)
  
  await supabase.from('subscriptions').upsert({
    user_id: user.id,
    stripe_subscription_id: subscription.id,
    stripe_customer_id: customerId,
    stripe_price_id: subscription.items.data[0]?.price.id,
    status: subscription.status,
    plan_type: planType,
    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    cancel_at_period_end: subscription.cancel_at_period_end
  })
}

function getPlanType(priceId: string): string {
  const plans: Record<string, string> = {
    'price_starter_monthly': 'starter',
    'price_professional_monthly': 'professional',
    'price_business_monthly': 'business',
    'price_agency_monthly': 'agency'
  }
  return plans[priceId] || 'starter'
}
```

---

## Resend/SendGrid API

### Setup (Resend)

1. **Get API Key**
   - Go to [Resend](https://resend.com/)
   - Create API key

2. **Verify Domain**
   - Add and verify your sending domain

### Email Integration

```typescript
// lib/email/resend.ts
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

interface SendEmailParams {
  to: string
  subject: string
  html: string
  text?: string
}

export async function sendEmail({ to, subject, html, text }: SendEmailParams) {
  return resend.emails.send({
    from: 'AI Review Response <noreply@yourdomain.com>',
    to,
    subject,
    html,
    text: text || html.replace(/<[^>]*>/g, '')
  })
}

// Email Templates
export async function sendNewReviewNotification(
  email: string,
  businessName: string,
  reviewText: string,
  rating: number
) {
  return sendEmail({
    to: email,
    subject: `New ${rating}-star review for ${businessName}`,
    html: `
      <h1>New Review Received</h1>
      <p>You have a new ${rating}-star review:</p>
      <blockquote>${reviewText}</blockquote>
      <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/reviews">View and respond</a></p>
    `
  })
}

export async function sendWelcomeEmail(email: string, name: string) {
  return sendEmail({
    to: email,
    subject: 'Welcome to AI Review Response',
    html: `
      <h1>Welcome, ${name}!</h1>
      <p>Thank you for signing up for AI Review Response.</p>
      <p>Get started by connecting your Google Business profile.</p>
      <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/onboarding">Get Started</a></p>
    `
  })
}

export async function sendResponseApprovedEmail(
  email: string,
  businessName: string,
  reviewSnippet: string
) {
  return sendEmail({
    to: email,
    subject: `Response published for ${businessName}`,
    html: `
      <h1>Response Published</h1>
      <p>Your response to the review:</p>
      <blockquote>"${reviewSnippet}"</blockquote>
      <p>has been successfully published.</p>
    `
  })
}
```

---

## Rate Limits & Best Practices

### Google My Business API
- **Rate Limit**: 60 requests per minute
- **Best Practice**: Implement caching, batch requests

### OpenAI API
- **Rate Limit**: Varies by tier (3,500 RPM for Tier 1)
- **Best Practice**: Use retry logic, fallback to Claude

### Stripe API
- **Rate Limit**: 25 requests per second (standard)
- **Best Practice**: Webhooks for async events, idempotency keys

### Resend
- **Rate Limit**: 100 emails/second
- **Best Practice**: Batch sends, use templates

---

## Environment Variables

```env
# Google
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=https://yourapp.com/api/auth/google/callback

# OpenAI
OPENAI_API_KEY=sk-your_openai_key

# Anthropic (Claude)
ANTHROPIC_API_KEY=sk-ant-your_claude_key

# Stripe
STRIPE_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Resend
RESEND_API_KEY=re_xxx
```

---

## Testing

### Test Card Numbers (Stripe)

| Card Number | Use Case |
|-------------|----------|
| 4242424242424242 | Successful payment |
| 4000000000000002 | Card declined |
| 4000002500003155 | Requires authentication |

### Google Test Reviews
- Use test account with limited access
- Create test location in Google Business Profile

### OpenAI Test Mode
- Use sandbox environment for testing
- Set spending limits
