# Pending Infrastructure Tasks

## Step 7: Cloudflare Proxy (BLOCKED — needs own domain)

**Status:** Waiting for `reportafrica.com` domain purchase
**When:** Once domain is purchased and DNS is controlled by us

**Setup steps:**
1. Sign up at cloudflare.com (free tier)
2. Add domain → point nameservers to Cloudflare
3. Enable proxy (orange cloud) on API subdomain
4. Enable "Under Attack Mode" API toggle from admin dashboard
5. Configure WAF rules for API endpoints

**Code needed:**
- Admin endpoint: `PATCH /api/v1/admin/cloudflare/attack-mode` → calls Cloudflare API
- Env vars: `CLOUDFLARE_ZONE_ID`, `CLOUDFLARE_API_TOKEN`
- Install `node-fetch` or use built-in fetch to call Cloudflare API

**Current protection (without Cloudflare):**
- Nginx rate limiting
- NestJS ThrottlerModule (per-IP rate limits)
- AWS Security Groups (port-level)

---

## Other notes:
- Current API URL: https://34-242-14-140.nip.io/api/v1
- nip.io domains can't use Cloudflare (don't own DNS)
- Once we have our own domain, also set up: SSL via Cloudflare, CDN caching for static assets
