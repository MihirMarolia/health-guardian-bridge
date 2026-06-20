# Health Guardian Bridge - Deployment Guide

## Strategic Pivot: Clinician-Only, Supabase-First, Audit-Trail-First

This application has been architected as a **liability shield** for healthcare organizations:
- ✅ **Zero patient portal** (eliminates PHI exposure risk)
- ✅ **Clinician-only access** (RLS policies enforce physician-only data access)
- ✅ **Mandatory human-in-the-loop AI verification** (HITL checkbox blocks submission)
- ✅ **Automatic PHI de-identification** (clinical text redacted before AI processing)
- ✅ **Complete audit trail** (every action logged per PIPEDA/PHIPA)
- ✅ **Supabase-native** (no tRPC backend, direct Supabase client)

---

## Phase 1: Supabase Setup

### 1.1 Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Copy your **Project URL** and **Anon Key**

### 1.2 Execute RLS Policies SQL
1. In Supabase dashboard, go to **SQL Editor**
2. Create a new query and paste the contents of `supabase-rls-policies.sql`
3. Execute the query
4. Verify all tables have RLS enabled and policies are created

### 1.3 Verify Database Schema
Run the SQL from `drizzle/0000_first_justice.sql` in Supabase SQL Editor to create all tables:
- `users` (with role: admin | physician | specialist)
- `patients` (with encrypted fields)
- `serviceRequests` (referrals with AI confidence scoring)
- `observations` (lab results)
- `auditLogs` (compliance trail)
- `timelineEvents` (care journey)

---

## Phase 2: Environment Variables

### 2.1 For Development (.env.local)
```bash
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Optional: For local tRPC (not used in this build)
DATABASE_URL=mysql://user:password@localhost:3306/health_guardian
JWT_SECRET=your-jwt-secret
```

### 2.2 For Vercel Deployment
Set these environment variables in Vercel project settings:

```
VITE_SUPABASE_URL = https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY = your-anon-key-here
```

**Note:** These are prefixed with `VITE_` so they're exposed to the browser (safe for Supabase anon key).

---

## Phase 3: Build & Deploy

### 3.1 Local Build Test
```bash
cd /home/ubuntu/health-guardian-bridge

# Install dependencies
pnpm install

# Type check (should pass with 0 errors)
pnpm check

# Build for production
pnpm build

# Output: dist/ folder ready for deployment
```

### 3.2 Deploy to Vercel

#### Option A: Git-based deployment (recommended)
```bash
# Push to GitHub
git add .
git commit -m "Clinician-only, Supabase-first, audit-trail-first release"
git push origin main

# In Vercel:
# 1. Connect GitHub repo
# 2. Set environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
# 3. Deploy (Vercel auto-runs: pnpm install && pnpm build)
```

#### Option B: Direct Vercel CLI
```bash
pnpm install -g vercel
vercel --prod
# Follow prompts and set environment variables
```

### 3.3 Build Output
```
✓ TypeScript: 0 errors
✓ Vite build: 1822 modules transformed
✓ Client bundle: 972.52 kB (gzip: 274.41 kB)
✓ Server bundle: 22.2 kB
✓ Total: ~1 MB (production-ready)
```

---

## Phase 4: Post-Deployment Verification

### 4.1 Test Clinician Access
1. Navigate to `/clinician`
2. Verify referral table loads
3. Click "New Referral" button
4. Confirm HITL checkbox appears and blocks submit until checked

### 4.2 Test De-identification
1. In "New Referral" modal, click "🧠 AI Parse Fax"
2. Paste clinical text with PHI (names, phone, health card)
3. Click "Parse Text"
4. Verify "Data Minimization" badge shows redaction count
5. Confirm PHI was stripped before AI processing

### 4.3 Test Patient Journey
1. In referral table, click on a patient name
2. Verify slide-out panel opens from the right
3. Confirm timeline shows referrals (blue dots) and labs (green dots)
4. Check audit trail footer displays compliance message

### 4.4 Test Audit Logging
1. Open browser DevTools → Console
2. Perform any action (view patient, create referral, parse fax)
3. Verify `[AUDIT]` logs appear in console
4. Check Supabase `auditLogs` table for records

### 4.5 Test RLS Security
1. In Supabase, create a test specialist user (role: specialist)
2. Try to access `/clinician` as that user
3. Verify RLS policies prevent data access (only physicians can read/write)

---

## Phase 5: Monitoring & Compliance

### 5.1 Audit Trail Queries
```sql
-- View all actions by a clinician
SELECT * FROM auditLogs 
WHERE actorId = 1 
ORDER BY timestamp DESC 
LIMIT 50;

-- View all patient access
SELECT * FROM auditLogs 
WHERE action = 'VIEW_PATIENT' 
ORDER BY timestamp DESC;

-- View all AI parsing actions
SELECT * FROM auditLogs 
WHERE action = 'PARSE_CLINICAL_TEXT' 
ORDER BY timestamp DESC;

-- Compliance report: Actions per user per day
SELECT 
  actorId, 
  DATE(timestamp) as date,
  COUNT(*) as action_count
FROM auditLogs
GROUP BY actorId, DATE(timestamp)
ORDER BY date DESC;
```

### 5.2 Supabase Monitoring
- **Logs**: Supabase Dashboard → Logs → Database
- **Performance**: Supabase Dashboard → Database → Performance
- **RLS**: Supabase Dashboard → Authentication → Policies

### 5.3 Vercel Monitoring
- **Logs**: Vercel Dashboard → Deployments → Logs
- **Analytics**: Vercel Dashboard → Analytics
- **Performance**: Vercel Dashboard → Performance

---

## Phase 6: Security Checklist

- [ ] Supabase RLS policies enabled on all tables
- [ ] Only `physicians` and `admin` roles can access patient data
- [ ] Patient portal routes redirect to `/clinician`
- [ ] HITL checkbox required before referral submission
- [ ] De-identification runs before AI processing
- [ ] Audit logs created for all critical actions
- [ ] Environment variables set in Vercel (never commit .env)
- [ ] HTTPS enforced (Vercel default)
- [ ] CORS configured for Supabase domain
- [ ] Database backups enabled in Supabase

---

## Phase 7: Troubleshooting

### Build Fails: "Cannot find module"
```bash
# Clear cache and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install
pnpm build
```

### Supabase Connection Error
```
Error: Missing Supabase environment variables
```
**Fix:** Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set in Vercel

### RLS Policy Blocking Access
```
Error: new row violates row-level security policy
```
**Fix:** Ensure user role is `physician` or `admin` in `users` table

### De-identification Not Working
- Check browser console for `[AUDIT]` logs
- Verify `deidentify.ts` regex patterns match your PHI format
- Test with sample data containing obvious PHI (phone, email, health card)

---

## Production Checklist

Before going live:

- [ ] Database backups configured
- [ ] Monitoring alerts set up
- [ ] Compliance audit trail verified
- [ ] RLS policies tested with multiple user roles
- [ ] De-identification regex patterns validated
- [ ] HITL checkbox working in production
- [ ] Audit logs flowing to Supabase
- [ ] Vercel deployment successful
- [ ] Custom domain configured (if needed)
- [ ] SSL certificate active

---

## Support & Compliance

**PIPEDA/PHIPA Compliance:**
- All PHI encrypted at rest (Supabase)
- All PHI encrypted in transit (HTTPS)
- All access logged in audit trail
- De-identification before AI processing
- Human-in-the-loop verification required

**Award Eligibility:**
- ✅ Responsible AI: HITL verification + de-identification
- ✅ Clinical Workflow: Referral orchestration + CDS alerts
- ✅ Security: RLS policies + audit trail + zero patient portal

---

## Next Steps

1. **Set up Supabase** (5 min)
2. **Configure environment variables** (2 min)
3. **Deploy to Vercel** (5 min)
4. **Run verification tests** (10 min)
5. **Monitor audit logs** (ongoing)

**Total deployment time: ~30 minutes**

Good luck! 🚀
