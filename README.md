# Cogiflow Affiliate Link API

Standalone Next.js API for handling affiliate link redirects with click tracking.

## Features

- ✅ Affiliate link redirects with click tracking
- ✅ Supabase integration for data storage
- ✅ Input validation and sanitization
- ✅ Fallback URL support
- ✅ SEO-friendly 301 redirects
- ✅ CORS headers configured
- ✅ Error handling and logging

## API Endpoint

```
GET /api/redirect/[slug]
```

Example: `https://your-domain.com/api/redirect/make` → redirects to configured URL

## Environment Variables

Create `.env.local` (local) or set in Vercel dashboard (production):

```
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

## Local Development

```bash
npm install
npm run dev
```

API will be available at `http://localhost:3001`

## Deploy to Vercel

1. Push this code to GitHub/GitLab
2. Connect repository to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy!

## Database Setup

Run the SQL script in `/database/affiliate_links_table.sql` in your Supabase dashboard.

## Usage

Add affiliate links to your Supabase database:

```sql
INSERT INTO affiliate_links (slug, redirect_url, fallback_url) 
VALUES ('tool-name', 'https://partner.com/affiliate-link', 'https://cogiflow.ai');
```

Then use: `https://your-api-domain.com/api/redirect/tool-name` 