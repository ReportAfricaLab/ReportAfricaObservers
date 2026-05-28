# ReportAfrica — Production Deployment Guide

## Infrastructure Overview

```
                    ┌─────────────┐
                    │  CloudFront │ (CDN - media delivery)
                    └──────┬──────┘
                           │
┌──────────┐       ┌──────┴──────┐       ┌─────────────┐
│  Route53 │──────▶│    ALB      │──────▶│  ECS Fargate│
│  (DNS)   │       │ (SSL/HTTPS) │       │  (API)      │
└──────────┘       └──────┬──────┘       └──────┬──────┘
                          │                      │
                   ┌──────┴──────┐       ┌──────┴──────┐
                   │   Vercel    │       │    RDS      │
                   │   (Web)     │       │ (PostgreSQL)│
                   └─────────────┘       └──────┬──────┘
                                                │
                                         ┌──────┴──────┐
                                         │ ElastiCache │
                                         │   (Redis)   │
                                         └─────────────┘
```

## 1. AWS S3 — Media Storage

### Create Production Bucket
```bash
aws s3 mb s3://reportafrica-media-prod --region af-south-1
```

### Bucket Policy (private, CloudFront access only)
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "CloudFrontAccess",
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudfront.amazonaws.com"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::reportafrica-media-prod/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::ACCOUNT_ID:distribution/DISTRIBUTION_ID"
        }
      }
    }
  ]
}
```

### CORS Configuration
```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT"],
    "AllowedOrigins": ["https://reportafrica.com", "https://*.reportafrica.com"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

### Lifecycle Rules
- Transition to S3 Infrequent Access after 90 days
- Delete incomplete multipart uploads after 7 days

## 2. CloudFront — CDN for Media

### Distribution Settings
- **Origin**: `reportafrica-media-prod.s3.af-south-1.amazonaws.com`
- **Origin Access**: Origin Access Control (OAC)
- **Cache Policy**: CachingOptimized
- **Price Class**: PriceClass_200 (Africa, Europe, Asia)
- **Alternate Domain**: `media.reportafrica.com`
- **SSL Certificate**: ACM certificate for `*.reportafrica.com`

### Cache Behaviors
| Path Pattern | TTL | Notes |
|---|---|---|
| `/images/*` | 30 days | Report images |
| `/videos/*` | 30 days | Report videos |
| `/audio/*` | 30 days | Voice notes |
| `/documents/*` | 7 days | Verification docs |

## 3. RDS — PostgreSQL + PostGIS

### Instance Configuration
- **Engine**: PostgreSQL 16 with PostGIS
- **Instance**: db.t3.medium (start), scale to db.r6g.large
- **Storage**: 100GB gp3, auto-scaling enabled
- **Multi-AZ**: Yes (production)
- **Region**: af-south-1 (Cape Town)
- **Backup**: 7-day automated backups

### Security Group
- Allow inbound 5432 from ECS security group only

## 4. ElastiCache — Redis

### Configuration
- **Engine**: Redis 7.x
- **Node Type**: cache.t3.micro (start)
- **Cluster Mode**: Disabled (single node for now)
- **Region**: af-south-1

## 5. ECS Fargate — API Deployment

### Cluster Setup
```bash
aws ecs create-cluster --cluster-name reportafrica-cluster --region af-south-1
```

### Deploy
```bash
# Register task definition
aws ecs register-task-definition --cli-input-json file://infra/ecs/api-task-definition.json

# Create service
aws ecs create-service \
  --cluster reportafrica-cluster \
  --service-name reportafrica-api-service \
  --task-definition reportafrica-api \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}"
```

### Auto-scaling
- Min: 2 tasks
- Max: 10 tasks
- Scale on CPU > 70% or memory > 80%

## 6. Web Deployment — Vercel (Recommended)

### Setup
1. Connect GitHub repo (ReportafricaWebApp)
2. Set root directory: `apps/web`
3. Add environment variables from `.env.production.example`
4. Custom domain: `reportafrica.com`

### Alternative: AWS Amplify
```bash
aws amplify create-app --name reportafrica-web --repository https://github.com/ReportAfricaLab/ReportafricaWebApp
```

## 7. Domain & SSL

### Route53 DNS Records
| Record | Type | Value |
|---|---|---|
| `reportafrica.com` | A | Vercel IP / ALB |
| `api.reportafrica.com` | A | ALB DNS |
| `media.reportafrica.com` | CNAME | CloudFront distribution |
| `ng.reportafrica.com` | CNAME | `reportafrica.com` |
| `gh.reportafrica.com` | CNAME | `reportafrica.com` |
| `ke.reportafrica.com` | CNAME | `reportafrica.com` |

### SSL Certificates (ACM)
- `*.reportafrica.com` (wildcard)
- `reportafrica.com` (apex)
- Region: us-east-1 (for CloudFront) + af-south-1 (for ALB)

## 8. Secrets Management (SSM Parameter Store)

Store all secrets in AWS Systems Manager Parameter Store:
```bash
aws ssm put-parameter --name "/reportafrica/prod/JWT_SECRET" --value "xxx" --type SecureString
aws ssm put-parameter --name "/reportafrica/prod/DATABASE_PASSWORD" --value "xxx" --type SecureString
# ... repeat for all secrets
```

## 9. Monitoring & Alerts

### CloudWatch Alarms
- API 5xx error rate > 1%
- API response time p95 > 2s
- ECS CPU > 80%
- RDS connections > 80%
- Redis memory > 80%

### CloudWatch Log Groups
- `/ecs/reportafrica-api` — API structured logs
- `/ecs/reportafrica-web` — Web server logs

## 10. Deployment Checklist

- [ ] S3 bucket created with CORS + lifecycle rules
- [ ] CloudFront distribution with OAC
- [ ] RDS PostgreSQL instance with PostGIS
- [ ] ElastiCache Redis instance
- [ ] ECS cluster + task definition + service
- [ ] ALB with SSL certificate
- [ ] Route53 DNS records configured
- [ ] SSM parameters for all secrets
- [ ] CloudWatch alarms configured
- [ ] Web deployed to Vercel/Amplify
- [ ] Domain SSL verified
- [ ] Health check passing: `https://api.reportafrica.com/api/v1/health`
