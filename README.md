# Competitor Intelligence App

An automated competitor monitoring platform that tracks competitor news, analyzes signals with AI, and delivers insights via email digests and dashboard.

## Features

- 🎯 **Monitor up to 6 competitors** simultaneously
- 🤖 **AI-powered signal analysis** using Claude Sonnet 4
- 📊 **Beautiful glassmorphism dashboard** with 30-day history
- 📧 **Email digests** sent twice daily
- 🔍 **Multi-source data collection** (NewsAPI, RSS feeds, web scraping)
- 🎨 **Sentiment analysis** for each signal
- ⭐ **Priority detection** for critical updates (earnings, major funding, etc.)
- 🔐 **Passwordless authentication** via magic link or Google OAuth

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **AI**: Anthropic Claude API
- **Email**: Resend
- **News**: NewsAPI, RSS Parser
- **Deployment**: Vercel
- **Cron Jobs**: Supabase Edge Functions or external cron service

## Setup Instructions

### 1. Clone and Install

```bash
git clone <your-repo>
cd competitor-intel-app
npm install
```

### 2. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Settings > API to get your keys
3. Go to SQL Editor and run the schema from `supabase-schema.sql`
4. Enable Email Auth in Authentication > Providers
5. (Optional) Enable Google OAuth in Authentication > Providers

### 3. Get API Keys

**Anthropic Claude API**
- Sign up at [console.anthropic.com](https://console.anthropic.com)
- Create an API key

**NewsAPI**
- Sign up at [newsapi.org](https://newsapi.org)
- Free tier: 100 requests/day

**Resend Email**
- Sign up at [resend.com](https://resend.com)
- Verify your domain (or use their test domain for development)
- Create an API key
- Free tier: 100 emails/day

### 4. Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in your values:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Anthropic Claude API
ANTHROPIC_API_KEY=sk-ant-...

# Resend Email
RESEND_API_KEY=re_...

# NewsAPI
NEWS_API_KEY=your_news_api_key

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Cron Secret (generate a random string)
CRON_SECRET=your_random_secret_string
```

### 5. Run Locally

```bash
npm run dev
```

Visit `http://localhost:3000`

## Deployment

### Deploy to Vercel

1. Push code to GitHub
2. Import project in Vercel
3. Add all environment variables
4. Deploy

### Set up Cron Jobs

Since Vercel's free tier only allows 1 cron job, use Supabase Edge Functions or an external cron service:

#### Option A: Supabase Edge Functions (Recommended)

Create two edge functions in Supabase:

**Function 1: collect-signals** (runs 6x daily)
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  const response = await fetch('https://your-app.vercel.app/api/cron/collect-signals', {
    headers: {
      'Authorization': `Bearer ${Deno.env.get('CRON_SECRET')}`
    }
  })
  
  return new Response(JSON.stringify(await response.json()), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

Set cron schedule: `0 */4 * * *` (every 4 hours)

**Function 2: send-digest** (runs 2x daily)
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  const response = await fetch('https://your-app.vercel.app/api/cron/send-digest', {
    headers: {
      'Authorization': `Bearer ${Deno.env.get('CRON_SECRET')}`
    }
  })
  
  return new Response(JSON.stringify(await response.json()), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

Set cron schedule: `0 8,20 * * *` (8 AM and 8 PM daily)

#### Option B: External Cron Service

Use services like [cron-job.org](https://cron-job.org) or [EasyCron](https://www.easycron.com):

1. **Signal Collection** - Run every 4 hours:
   - URL: `https://your-app.vercel.app/api/cron/collect-signals`
   - Header: `Authorization: Bearer YOUR_CRON_SECRET`
   - Schedule: `0 */4 * * *`

2. **Email Digest** - Run twice daily:
   - URL: `https://your-app.vercel.app/api/cron/send-digest`
   - Header: `Authorization: Bearer YOUR_CRON_SECRET`
   - Schedule: `0 8,20 * * *`

## Usage

### First Time Setup

1. Visit your app and click "Send Magic Link" or "Sign in with Google"
2. Complete the setup form:
   - Add up to 6 competitors
   - Select signal types to track
   - Configure delivery preferences
3. Go to dashboard to view signals

### Dashboard

- View all signals from the last 30 days
- Filter by competitor
- See sentiment analysis and priority flags
- Click links to read full articles

### Email Digests

- Receive emails twice daily (customizable)
- Beautifully formatted HTML emails
- Grouped by competitor
- Links to full articles

## Signal Types

- **Product Launches**: New products, features, releases
- **Funding**: Investment rounds, acquisitions
- **Leadership Changes**: C-suite appointments, departures
- **Earnings Reports**: Quarterly results, financial updates
- **Social Media**: Important tweets, LinkedIn posts
- **Blog Posts**: Company blog updates

## Development

### Project Structure

```
competitor-intel-app/
├── app/
│   ├── api/
│   │   └── cron/
│   │       ├── collect-signals/
│   │       └── send-digest/
│   ├── dashboard/
│   ├── login/
│   ├── setup/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── lib/
│   ├── claude.ts       # AI analysis
│   ├── email.ts        # Email sending
│   ├── news.ts         # News gathering
│   ├── supabase.ts     # DB client
│   └── types.ts        # TypeScript types
├── supabase-schema.sql
└── package.json
```

### Adding New Signal Sources

Edit `lib/news.ts` and add new gathering functions:

```typescript
export async function fetchCustomSource(competitorName: string): Promise<NewsArticle[]> {
  // Your custom logic here
  return articles;
}
```

### Customizing AI Analysis

Edit `lib/claude.ts` to modify the prompt or analysis logic.

## Cost Estimate (Monthly)

**Free Tier:**
- Vercel: Free
- Supabase: Free (up to 500MB database, 2GB bandwidth)
- NewsAPI: Free (100 requests/day = ~3,000/month)
- Resend: Free (100 emails/day = ~3,000/month)
- Anthropic: ~$3-5/month (assuming ~100 signals/day)

**Total**: ~$3-5/month for small usage

## Troubleshooting

### Email not working
- Verify your domain in Resend
- Check `from` address in `lib/email.ts`
- Check Resend API key

### Signals not appearing
- Check cron jobs are running
- Verify NewsAPI key and rate limits
- Check Supabase logs

### Authentication issues
- Verify Supabase auth settings
- Check redirect URLs match your domain
- Enable email provider in Supabase

## Future Enhancements

- [ ] Slack integration
- [ ] Custom web scraping per competitor
- [ ] Trend analysis and insights
- [ ] Export signals to CSV
- [ ] Team collaboration features
- [ ] Mobile app
- [ ] Custom alert rules

## License

MIT

## Support

For issues or questions, open a GitHub issue or contact support.
