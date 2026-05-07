# AWS Deployment Guide for ChAlid Baby Health App

## Pre-Deployment Checklist

### 1. Fix All TypeScript Errors
```bash
npm run build
```
Ensure the build completes without errors. TypeScript strict mode is now enabled.

### 2. Environment Variables Setup

**CRITICAL**: Never commit `.env` files to Git. Use AWS Systems Manager Parameter Store or AWS Secrets Manager.

Copy `.env.production.template` and fill in all values:
- Database credentials (use AWS RDS PostgreSQL)
- Firebase Admin credentials (download from Firebase Console)
- API keys (Gemini, Groq, Google Maps)
- Redis credentials (use AWS ElastiCache or Upstash)

### 3. Database Migration
```bash
npx prisma migrate deploy
npx prisma generate
```

## AWS Deployment Options

### Option A: AWS Amplify (Recommended for Next.js)

1. **Connect Repository**
   - Go to AWS Amplify Console
   - Connect your GitHub/GitLab repository
   - Select the main branch

2. **Configure Build Settings**
   ```yaml
   version: 1
   frontend:
     phases:
       preBuild:
         commands:
           - npm ci
           - npx prisma generate
       build:
         commands:
           - npm run build
     artifacts:
       baseDirectory: .next
       files:
         - '**/*'
     cache:
       paths:
         - node_modules/**/*
   ```

3. **Add Environment Variables**
   - In Amplify Console → App Settings → Environment Variables
   - Add all variables from `.env.production.template`
   - Mark sensitive variables as "Secret"

4. **Deploy**
   - Amplify will auto-deploy on every push to main branch

### Option B: AWS EC2 + PM2

1. **Launch EC2 Instance**
   - Ubuntu 22.04 LTS
   - t3.medium or larger
   - Security Group: Allow ports 80, 443, 22

2. **Install Dependencies**
   ```bash
   sudo apt update
   sudo apt install -y nodejs npm nginx
   sudo npm install -g pm2
   ```

3. **Clone and Setup**
   ```bash
   git clone <your-repo>
   cd ChAlid
   npm install
   npx prisma generate
   npm run build
   ```

4. **Configure Environment**
   ```bash
   # Use AWS Systems Manager Parameter Store
   aws ssm get-parameter --name /chalid/DATABASE_URL --with-decryption --query Parameter.Value --output text > .env.production.local
   
   # Or manually create .env.production.local with all secrets
   nano .env.production.local
   ```

5. **Start with PM2**
   ```bash
   pm2 start npm --name "chalid" -- start
   pm2 startup
   pm2 save
   ```

6. **Configure Nginx**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

7. **SSL with Let's Encrypt**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

### Option C: AWS ECS Fargate (Docker)

1. **Create Dockerfile** (if not exists)
   ```dockerfile
   FROM node:20-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci --only=production
   COPY . .
   RUN npx prisma generate
   RUN npm run build
   EXPOSE 3000
   CMD ["npm", "start"]
   ```

2. **Build and Push to ECR**
   ```bash
   aws ecr create-repository --repository-name chalid
   docker build -t chalid .
   docker tag chalid:latest <account-id>.dkr.ecr.<region>.amazonaws.com/chalid:latest
   aws ecr get-login-password | docker login --username AWS --password-stdin <account-id>.dkr.ecr.<region>.amazonaws.com
   docker push <account-id>.dkr.ecr.<region>.amazonaws.com/chalid:latest
   ```

3. **Create ECS Task Definition**
   - Use Fargate launch type
   - Add environment variables from Secrets Manager
   - Configure health checks

4. **Create ECS Service**
   - Use Application Load Balancer
   - Enable auto-scaling
   - Configure target group health checks

## Security Best Practices

### 1. Environment Variables
- **NEVER** commit `.env` files
- Use AWS Secrets Manager or Parameter Store
- Rotate credentials regularly
- Use IAM roles instead of access keys when possible

### 2. Database Security
- Use AWS RDS with encryption at rest
- Enable SSL/TLS connections
- Use VPC security groups
- Regular automated backups
- Enable Multi-AZ for production

### 3. Firebase Admin
- Store private key in AWS Secrets Manager
- Use environment-specific service accounts
- Restrict service account permissions

### 4. API Rate Limiting
- Already implemented in code (Redis-based)
- Configure AWS WAF for additional protection
- Use CloudFront for DDoS protection

### 5. HTTPS Only
- Force HTTPS in production
- Use AWS Certificate Manager for SSL
- Enable HSTS headers

### 6. Monitoring
- Enable CloudWatch Logs
- Set up alarms for errors and high latency
- Use AWS X-Ray for distributed tracing
- Monitor database performance with RDS Performance Insights

## Post-Deployment Steps

### 1. Verify Deployment
```bash
curl https://your-domain.com/api/health
```

### 2. Run Database Seed (if needed)
```bash
npm run prisma:seed
```

### 3. Test Critical Flows
- User authentication (Google Sign-in)
- Baby profile creation
- Weight logging
- Vaccine tracking
- AI chat functionality
- Symptom analysis

### 4. Monitor Logs
```bash
# For PM2
pm2 logs chalid

# For AWS Amplify
Check Amplify Console → Monitoring

# For ECS
Check CloudWatch Logs
```

### 5. Set Up Backups
- Database: RDS automated backups (7-35 days retention)
- Files: S3 versioning for uploaded images
- Configuration: Version control for infrastructure as code

## Cost Optimization

1. **Use AWS Free Tier** (first 12 months)
   - EC2 t2.micro (750 hours/month)
   - RDS db.t2.micro (750 hours/month)
   - 5GB S3 storage

2. **Right-size Resources**
   - Start small, scale based on metrics
   - Use auto-scaling groups
   - Enable CloudWatch alarms for cost anomalies

3. **Use Reserved Instances** (for production)
   - 1-year or 3-year commitments
   - Up to 75% savings vs on-demand

4. **Optimize Database**
   - Use connection pooling (Prisma already configured)
   - Enable query caching
   - Regular VACUUM and ANALYZE

## Troubleshooting

### Build Fails
- Check TypeScript errors: `npm run build`
- Verify all dependencies: `npm ci`
- Check Prisma schema: `npx prisma validate`

### Database Connection Issues
- Verify DATABASE_URL format
- Check security group rules
- Ensure RDS is publicly accessible (if needed)
- Test connection: `npx prisma db pull`

### Firebase Auth Fails
- Verify all Firebase env vars are set
- Check Firebase Admin private key format (must include \n)
- Ensure Firebase project is active

### Redis Connection Issues
- Redis is optional (app works without it)
- Check UPSTASH_REDIS_REST_URL and TOKEN
- Verify network connectivity

## Rollback Plan

### For Amplify
- Go to Amplify Console → Deployments
- Select previous successful deployment
- Click "Redeploy this version"

### For EC2/PM2
```bash
git checkout <previous-commit>
npm install
npm run build
pm2 restart chalid
```

### For ECS
- Update service to use previous task definition revision
- ECS will automatically roll back

## Support

For issues or questions:
1. Check CloudWatch Logs
2. Review error.tsx for user-facing errors
3. Check Prisma logs for database issues
4. Verify all environment variables are set correctly

## Next Steps After Deployment

1. Set up CI/CD pipeline (GitHub Actions + AWS)
2. Configure monitoring and alerting
3. Set up automated testing
4. Enable AWS WAF for security
5. Configure CloudFront CDN for better performance
6. Set up automated database backups
7. Implement log aggregation and analysis
8. Create disaster recovery plan
