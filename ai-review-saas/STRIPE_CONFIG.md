# Stripe Webhook Configuration

## Endpoint URL (as configured in Stripe Dashboard)
```
https://review.vercel.app/api/webhooks/stripe
```

## App Route (code location)
```
src/app/api/webhooks/stripe/route.ts
```

## Events Subscribed
- `customer.subscription.created`
- `customer.subscription.deleted`
- `customer.subscription.updated`
- `invoice.payment_failed`
- `invoice.payment_succeeded`

## Test Mode Keys
> **Important:** Add these in Vercel Dashboard → Settings → Environment Variables. Never commit secrets to GitHub.

- **Secret Key:** Add `STRIPE_SECRET_KEY` in Vercel
- **Publishable Key:** Add `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` in Vercel
- **Webhook Secret:** Add `STRIPE_WEBHOOK_SECRET` in Vercel

## Production Notes
When going live:
1. Replace keys with live Stripe keys (remove `_test_` suffix)
2. Update webhook endpoint URL to your production domain
3. Regenerate JWT secret if service_role key was leaked

---

Generated: 2026-02-19
