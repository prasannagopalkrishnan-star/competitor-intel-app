# Deployment Checklist

## Pre-Deployment

### 1. Supabase Setup
- [ ] Create Supabase project
- [ ] Run `supabase-schema.sql` in SQL Editor
- [ ] Copy Project URL and anon key
- [ ] Copy service_role key (Settings > API)
- [ ] Enable Email Auth (Authentication > Providers)
- [ ] (Optional) Enable Google OAuth and configure
- [ ] Configure email templates (Authentication > Email Templates)

### 2. External Services

#### Anthropic Claude API
- [ ] Sign up at console.anthropic.com
- [ ] Create API key
- [ ] Add credits to account

#### NewsAPI
- [ ] Sign up at newsapi.org
- [ ] Copy API key
- [ ] Note: Free tier = 100 requests/day

#### Resend
- [ ] Sign up at resend.com
- [ ] Add and verify your domain (or use test domain)
- [ ] Create API key
- [ ] Update `from` email in `lib/email.ts` to match verified domain

### 3. Environment Variables
Create these in Vercel:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
RESEND_API_KEY=
NEWS_API_KEY=
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
CRON_SECRET=generate-random-string-here
```

## Deployment Steps

### 1. Deploy to Vercel
- [ ] Push code to GitHub
- [ ] Connect repo to Vercel
- [ ] Add all environment variables
- [ ] Deploy
- [ ] Test the deployed app

### 2. Configure Cron Jobs

#### Option A: Supabase Edge Functions

Create in Supabase Dashboard > Edge Functions:

**collect-signals** (every 4 hours)
```bash
supabase functions new collect-signals
```

Add this code:
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  const response = await fetch('https://your-app.vercel.app/api/cron/collect-signals', {
    headers: {
      'Authorization': `Bearer ${Deno.env.get('CRON_SECRET')}`
    }
  })
  
  const data = await response.json()
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

Set secrets:
```bash
supabase secrets set CRON_SECRET=your_secret_here
```

Deploy:
```bash
supabase functions deploy collect-signals
```

Add cron schedule in Supabase Dashboard:
- Function: collect-signals
- Schedule: `0 */4 * * *` (every 4 hours)

**send-digest** (twice daily)
Repeat above for send-digest with schedule: `0 8,20 * * *`

#### Option B: External Cron Service (cron-job.org)
- [ ] Create account at cron-job.org
- [ ] Create job for signal collection:
  - URL: https://your-app.vercel.app/api/cron/collect-signals
  - Schedule: Every 4 hours
  - Add header: Authorization: Bearer YOUR_CRON_SECRET
- [ ] Create job for email digest:
  - URL: https://your-app.vercel.app/api/cron/send-digest
  - Schedule: 8 AM and 8 PM daily
  - Add header: Authorization: Bearer YOUR_CRON_SECRET

### 3. Test the App

- [ ] Sign up with magic link
- [ ] Sign up with Google OAuth
- [ ] Complete setup with test competitors
- [ ] Wait for first cron run or trigger manually
- [ ] Check dashboard for signals
- [ ] Verify email digest arrives

### 4. Manual Cron Trigger (Testing)

Use curl to test cron endpoints:

```bash
# Test signal collection
curl -X GET https://your-app.vercel.app/api/cron/collect-signals \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Test email digest
curl -X GET https://your-app.vercel.app/api/cron/send-digest \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## Post-Deployment

### Monitor
- [ ] Check Vercel logs for errors
- [ ] Check Supabase logs
- [ ] Monitor Anthropic API usage
- [ ] Monitor NewsAPI rate limits
- [ ] Monitor Resend email delivery

### Optimize
- [ ] Add error monitoring (Sentry)
- [ ] Set up analytics
- [ ] Configure custom domain
- [ ] Add rate limiting if needed

## Production Checklist

- [ ] Update email templates with branding
- [ ] Add privacy policy and terms of service
- [ ] Set up customer support email
- [ ] Create documentation/help center
- [ ] Test with real competitors
- [ ] Gather user feedback
- [ ] Monitor costs and usage

## Troubleshooting

### Cron jobs not running
1. Check cron service logs
2. Verify CRON_SECRET matches in all places
3. Test endpoints manually with curl
4. Check Vercel function logs

### No signals appearing
1. Test NewsAPI manually
2. Check API rate limits
3. Verify competitor names are searchable
4. Check Supabase logs for errors
5. Verify cron jobs are executing

### Emails not sending
1. Verify domain in Resend
2. Check Resend API key
3. Update `from` address in lib/email.ts
4. Check Resend logs
5. Verify user has delivery_email enabled

### Authentication issues
1. Check Supabase auth settings
2. Verify redirect URLs
3. Check email provider is enabled
4. For Google: verify OAuth credentials

## Scaling Considerations

### When you hit limits:
- **NewsAPI**: Upgrade to paid plan or add more news sources
- **Resend**: Upgrade to paid plan for more emails
- **Supabase**: Upgrade for more storage/bandwidth
- **Anthropic**: Monitor token usage, implement caching

### Performance optimization:
- Add Redis for caching news articles
- Implement request deduplication
- Add database indexes for common queries
- Use CDN for static assets
