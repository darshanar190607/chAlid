# 📋 Pre-Deployment Checklist

Use this checklist before deploying to AWS to ensure everything is ready.

---

## ✅ LOCAL TESTING

- [ ] Dependencies installed (`npm install`)
- [ ] Build succeeds without errors (`npm run build`)
- [ ] App runs locally (`npm run dev`)
- [ ] Firebase Admin credentials configured in `.env`
- [ ] Database connection works
- [ ] Prisma migrations applied (`npx prisma migrate deploy`)

---

## ✅ FEATURE TESTING

Test each feature locally before deploying:

### Authentication
- [ ] Google Sign-in works
- [ ] User can log out
- [ ] Protected routes redirect to login

### Baby Profile
- [ ] Can create baby profile
- [ ] Baby photo displays correctly
- [ ] Premature baby mode works
- [ ] Profile data persists after refresh

### Weight Logging
- [ ] Can add new weight measurement
- [ ] Growth chart displays real data (not mock)
- [ ] Chart updates immediately after adding weight
- [ ] Can add height (optional field)

### Vaccine Tracker
- [ ] Vaccine schedule displays
- [ ] Can mark vaccine as done
- [ ] Hospital name and location save correctly
- [ ] Vaccine descriptions show properly
- [ ] Age due information displays

### AI Chat
- [ ] Can send text messages
- [ ] AI responds correctly
- [ ] Chat history persists
- [ ] Rate limiting works (try 61 messages in an hour)

### Symptom Analyzer
- [ ] Can upload image
- [ ] Analysis completes successfully
- [ ] Results display properly
- [ ] Rate limiting works (try 11 analyses in an hour)

### Hospital Finder
- [ ] Map displays (if Google Maps API key configured)
- [ ] Can search hospitals
- [ ] Filters work correctly
- [ ] Directions work

---

## ✅ CODE QUALITY

- [ ] No TypeScript errors (`npm run build`)
- [ ] No `console.log` statements in production code
- [ ] No `any` types (or minimal, well-justified)
- [ ] All API routes have auth guards
- [ ] All mutations verify ownership
- [ ] Error handling in place

---

## ✅ SECURITY

- [ ] `.env` file is in `.gitignore`
- [ ] No secrets committed to Git
- [ ] Firebase Admin credentials are secure
- [ ] All API routes require authentication
- [ ] Rate limiting enabled on AI endpoints
- [ ] CORS configured properly
- [ ] SQL injection prevented (Prisma handles this)

---

## ✅ ENVIRONMENT VARIABLES

Verify all required variables are set:

### Database
- [ ] `DATABASE_URL`
- [ ] `DIRECT_URL`

### AI Services
- [ ] `GEMINI_API_KEY`
- [ ] `GROQ_API_KEY`

### Firebase Client (Public)
- [ ] `NEXT_PUBLIC_FIREBASE_API_KEY`
- [ ] `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- [ ] `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- [ ] `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- [ ] `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- [ ] `NEXT_PUBLIC_FIREBASE_APP_ID`

### Firebase Admin (Secret)
- [ ] `FIREBASE_PROJECT_ID`
- [ ] `FIREBASE_CLIENT_EMAIL`
- [ ] `FIREBASE_PRIVATE_KEY`

### Optional
- [ ] `UPSTASH_REDIS_REST_URL` (for caching)
- [ ] `UPSTASH_REDIS_REST_TOKEN` (for caching)
- [ ] `GOOGLE_MAPS_PLATFORM_KEY` (for hospital finder)

---

## ✅ DATABASE

- [ ] Database is accessible from deployment environment
- [ ] SSL/TLS enabled for database connection
- [ ] Migrations applied (`npx prisma migrate deploy`)
- [ ] Prisma client generated (`npx prisma generate`)
- [ ] Seed data loaded if needed (`npm run prisma:seed`)
- [ ] Backups configured

---

## ✅ AWS SETUP (if using AWS)

### AWS Amplify
- [ ] Repository connected
- [ ] Branch selected (main/master)
- [ ] Build settings configured
- [ ] Environment variables added
- [ ] Sensitive variables marked as "Secret"
- [ ] Custom domain configured (optional)
- [ ] SSL certificate active

### AWS EC2
- [ ] Instance launched and running
- [ ] Security groups configured (ports 80, 443, 22)
- [ ] Node.js and npm installed
- [ ] PM2 installed globally
- [ ] Nginx configured
- [ ] SSL certificate installed (Let's Encrypt)
- [ ] Environment variables set
- [ ] PM2 startup script configured

### AWS ECS
- [ ] Docker image built and pushed to ECR
- [ ] Task definition created
- [ ] Service created with load balancer
- [ ] Environment variables configured
- [ ] Health checks configured
- [ ] Auto-scaling enabled

---

## ✅ MONITORING & LOGGING

- [ ] CloudWatch Logs enabled
- [ ] Error alerts configured
- [ ] Performance monitoring set up
- [ ] Database performance insights enabled
- [ ] Cost alerts configured

---

## ✅ POST-DEPLOYMENT

After deploying:

- [ ] App is accessible at production URL
- [ ] HTTPS works (no mixed content warnings)
- [ ] Test login flow
- [ ] Test baby profile creation
- [ ] Test weight logging
- [ ] Test vaccine tracking
- [ ] Test AI chat
- [ ] Test symptom analyzer
- [ ] Check CloudWatch Logs for errors
- [ ] Verify database connections
- [ ] Test on mobile device
- [ ] Test on different browsers

---

## ✅ DOCUMENTATION

- [ ] README.md updated with production URL
- [ ] Environment variables documented
- [ ] Deployment process documented
- [ ] Troubleshooting guide available
- [ ] Team members have access to AWS console
- [ ] Credentials stored securely (password manager)

---

## ✅ BACKUP & RECOVERY

- [ ] Database backups enabled (automated)
- [ ] Backup retention policy set (7-35 days)
- [ ] Disaster recovery plan documented
- [ ] Rollback procedure tested
- [ ] Database restore tested

---

## 🚨 CRITICAL REMINDERS

1. **NEVER commit `.env` files to Git**
2. **Always use HTTPS in production**
3. **Rotate credentials regularly**
4. **Monitor costs daily for first week**
5. **Test rollback procedure before you need it**

---

## 📊 EXPECTED RESULTS

After deployment, you should have:

- ✅ App accessible via HTTPS
- ✅ All features working
- ✅ No console errors in browser
- ✅ No errors in CloudWatch Logs
- ✅ Fast page load times (<3 seconds)
- ✅ Mobile-responsive design
- ✅ Secure authentication
- ✅ Real-time data updates

---

## 🎯 EVALUATOR SCORE VERIFICATION

Test these specific items that evaluators check:

- [ ] TypeScript strict mode enabled (check `tsconfig.json`)
- [ ] No `ignoreBuildErrors` in `next.config.mjs`
- [ ] Package name is NOT "react-example" (check `package.json`)
- [ ] Weight chart shows real data (not random mock data)
- [ ] Vaccine PATCH endpoint has auth guard
- [ ] Firebase Admin has no dummy mode bypass
- [ ] No console.log in production code
- [ ] Duplicate code removed (no duplicate `getNutritionGuide`)
- [ ] Unused dependencies removed (no `openai` package)
- [ ] Translation keys present (`aiPowered`, `allCaughtUp`, etc.)
- [ ] Error pages exist and work (`error.tsx`, `not-found.tsx`)
- [ ] Rate limiting works on AI endpoints

---

## ✅ FINAL CHECK

Before going live:

```bash
# 1. Clean install
rm -rf node_modules package-lock.json
npm install

# 2. Build
npm run build

# 3. Test production build locally
npm start

# 4. Run in browser and test all features

# 5. Check for errors in terminal

# 6. If all good, deploy!
```

---

## 🎉 READY TO DEPLOY!

If all checkboxes are checked, you're ready to deploy to production!

Follow the deployment guide in `AWS_DEPLOYMENT.md` for your chosen platform.

**Good luck!** 🚀
