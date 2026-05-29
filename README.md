# ReportAfrica

Africa's Citizen-Powered Live Reporting Platform.

## Architecture

```
reportafrica/
├── apps/
│   ├── api/          # NestJS backend (TypeScript)
│   ├── web/          # Next.js web app (TypeScript + Tailwind)
│   └── mobile/       # React Native mobile app (Expo)
├── packages/
│   └── shared/       # Shared types, constants, utilities
├── docker-compose.yml
└── turbo.json
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile | React Native (Expo) |
| Web | Next.js + Tailwind CSS |
| Backend | NestJS + TypeScript |
| Database | PostgreSQL + PostGIS |
| Cache | Redis |
| File Storage | AWS S3 |
| Livestreaming | AWS IVS |
| Maps | Mapbox |
| Payments | Paystack |
| Notifications | Firebase Cloud Messaging |

## Getting Started

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- npm 9+

### Setup

1. Clone and install dependencies:
```bash
npm install
```

2. Start infrastructure (PostgreSQL + Redis):
```bash
docker-compose up -d
```

3. Configure environment:
```bash
cp apps/api/.env.example apps/api/.env
```

4. Run all apps in development:
```bash
npm run dev
```

Or run individually:
```bash
npm run dev:api    # Backend on :3001
npm run dev:web    # Web on :3000
npm run dev:mobile # Expo mobile
```

## API Endpoints (v1)

### Auth
- `POST /api/v1/auth/register` — Register new user
- `POST /api/v1/auth/login` — Login

### Users
- `GET /api/v1/users/me` — Get profile (auth required)
- `PATCH /api/v1/users/me` — Update profile (auth required)

### Reports
- `POST /api/v1/reports` — Create report (auth required, AI moderated)
- `GET /api/v1/reports/feed?country=NG&page=1` — Country feed
- `GET /api/v1/reports/nearby?lat=6.5&lng=3.3&radius=10` — Nearby reports
- `GET /api/v1/reports/category/:category?country=NG` — By category
- `GET /api/v1/reports/:id` — Single report
- `PATCH /api/v1/reports/:id/upvote` — Upvote (auth required)
- `PATCH /api/v1/reports/:id/downvote` — Downvote (auth required)

### Verification
- `POST /api/v1/reports/:id/verify` — Vote confirm/dispute (auth required)
- `GET /api/v1/reports/:id/verify` — Get verification stats

### Trust
- `GET /api/v1/trust/profile` — User trust profile (auth required)

### Donations (Community Helping Hands)
- `POST /api/v1/donations/campaigns` — Create campaign (auth required)
- `GET /api/v1/donations/campaigns/feed?country=NG` — Campaign feed
- `GET /api/v1/donations/campaigns/emergency?country=NG` — Emergency campaigns
- `GET /api/v1/donations/campaigns/category/:category?country=NG` — By category
- `GET /api/v1/donations/campaigns/:id` — Single campaign
- `GET /api/v1/donations/campaigns/:id/donations` — Campaign donors
- `POST /api/v1/donations/campaigns/:id/donate` — Donate (auth required)
- `GET /api/v1/donations/verify/:reference` — Verify payment
- `POST /api/v1/donations/webhook/paystack` — Paystack webhook

### Comments
- `POST /api/v1/comments` — Create comment (auth required)
- `GET /api/v1/comments/report/:reportId?page=1` — Get comments for report
- `DELETE /api/v1/comments/:id` — Delete comment (auth required, owner only)
- `PATCH /api/v1/comments/:id/like` — Like comment (auth required)

### Tips (Reporter Earnings)
- `POST /api/v1/tips` — Tip a reporter on a report
- `GET /api/v1/tips/verify/:reference` — Verify tip payment
- `GET /api/v1/tips/report/:reportId` — Get tips for a report
- `GET /api/v1/tips/received` — Get my received tips (auth required)
- `POST /api/v1/tips/webhook/paystack` — Paystack webhook

### Follows
- `POST /api/v1/follows/:userId` — Follow a reporter (auth required)
- `DELETE /api/v1/follows/:userId` — Unfollow (auth required)
- `GET /api/v1/follows/check/:userId` — Check if following (auth required)
- `GET /api/v1/follows/feed` — Feed from followed reporters (auth required)
- `GET /api/v1/follows/:userId/followers` — Get user's followers
- `GET /api/v1/follows/:userId/following` — Get who user follows
- `GET /api/v1/follows/:userId/counts` — Follower/following counts

### Report Updates (Threads)
- `POST /api/v1/report-updates` — Post update to own report (auth required)
- `GET /api/v1/report-updates/report/:reportId` — Get updates for report
- `DELETE /api/v1/report-updates/:id` — Delete update (auth required, owner only)

### Leaderboard
- `GET /api/v1/leaderboard?country=NG&period=week&limit=20` — Top reporters
- `GET /api/v1/leaderboard/me?country=NG&period=week` — My rank (auth required)

### Referral
- `GET /api/v1/referral/my-code` — Get my referral code (auth required)
- `POST /api/v1/referral/generate` — Generate referral code (auth required)
- `POST /api/v1/referral/apply` — Apply a referral code (auth required)
- `GET /api/v1/referral/my-referrals` — My referral stats (auth required)

### Watchlist (Geo-fenced Alerts)
- `POST /api/v1/watchlist` — Create watchlist zone (auth required)
- `GET /api/v1/watchlist` — Get my watchlists (auth required)
- `PATCH /api/v1/watchlist/:id` — Update watchlist (auth required)
- `DELETE /api/v1/watchlist/:id` — Delete watchlist (auth required)

### Voice (Transcription & Translation)
- `POST /api/v1/voice/transcribe` — Transcribe voice note to text (auth required)

## Development Phases

- [x] Phase 1 — Foundation (monorepo, auth, reporting, feed, maps)
- [x] Phase 2 — AI & Trust (moderation, verification, trust scores)
- [x] Phase 3 — Community Helping Hands (donations, campaigns, Paystack)
- [x] Phase 4 — Enterprise (media licensing, government dashboards)
- [x] Phase 5 — Continental Expansion (multi-region, languages)
- [x] Phase 6 — Engagement & Monetization (comments, tips, follows, report updates)
- [x] Phase 7 — Retention & Growth (leaderboards, verification rewards, referrals, watchlists)
- [x] Phase 8 — Accessibility & Reach (offline mode, voice-to-text, translation)
