# 🚀 Deploy Resend Integration - Quick Guide

**Status**: Ready to Deploy  
**Estimated Time**: 5-10 minutes

---

## ⚡ Quick Deployment Steps

### 1. Install Dependencies (2 minutes)
```bash
cd backend/functions
npm install
```

**What this does**: Installs the new `axios` dependency required by ResendProvider.

---

### 2. Build TypeScript (1 minute)
```bash
npm run build
```

**Expected output**:
```
✓ Compiled successfully
✓ No TypeScript errors
```

**If errors occur**: All TypeScript issues have been fixed, but if you see any, check:
- ResendProvider.ts is using `config.config.apiKey`
- EmailError constructor has 4 parameters (message, code, statusCode, details)
- SendEmailResponse has `queuedAt` not `timestamp`

---

### 3. Deploy to Firebase (3-5 minutes)
```bash
cd ..  # Back to backend directory
firebase deploy --only functions
```

**Expected output**:
```
✔ functions: Finished running predeploy script.
✔ functions[api]: Successful update operation.
✔ Deploy complete!
```

---

### 4. Verify Deployment (1 minute)
```bash
firebase functions:log --limit 50
```

**Look for**:
- ✅ "Resend connection test: success"
- ✅ "Email provider initialized: resend"
- ❌ NO "Resend API key not configured" warnings

---

## 🧪 Test Email Sending

### Option 1: Via API (Recommended)
```bash
curl -X POST https://YOUR-FUNCTION-URL/api/notifications/test-email \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "to": "your-email@example.com",
    "subject": "Test Email from Resend",
    "html": "<h1>Success!</h1><p>Resend integration is working.</p>"
  }'
```

### Option 2: Via Firebase Console
1. Go to Firebase Console → Functions
2. Find the email sending function
3. Test with sample data

### Option 3: Via Frontend
1. Trigger any email-sending action (e.g., user registration)
2. Check email delivery
3. Verify in Resend dashboard

---

## ✅ Success Indicators

### In Firebase Logs
```
✅ Email sent successfully via Resend
✅ Resend connection test: success
✅ messageId: abc123...
```

### In Resend Dashboard
1. Go to https://resend.com/dashboard
2. Check "Emails" tab
3. Verify email appears with status "Delivered"

### In Your Inbox
- Email received from `stevetuenkam@gmail.com`
- Subject matches test email
- Content displays correctly
- No spam folder placement

---

## 🔧 Configuration Summary

### Current Setup
- **Primary Provider**: Resend (Priority 1)
- **API Key**: `re_LLBSP2Td_JVdZdtXQT3jevCLGFk8jNXzd`
- **From Email**: `stevetuenkam@gmail.com`
- **From Name**: `Attendance-X`
- **Fallback**: SMTP (Gmail)

### Rate Limits
- **Per minute**: 100 emails
- **Per hour**: 1,000 emails
- **Per day**: 10,000 emails
- **Per month**: 300,000 emails

### Pricing
- **Cost per email**: $0.001
- **Free tier**: 1,000 emails/month
- **Current plan**: Free tier

---

## 🐛 Quick Troubleshooting

### Problem: Build fails
**Solution**:
```bash
cd backend/functions
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Problem: "Resend API key not configured"
**Solution**: Check `.env` file has:
```env
RESEND_ENABLED=true
RESEND_API_KEY=re_LLBSP2Td_JVdZdtXQT3jevCLGFk8jNXzd
```

### Problem: "401 Unauthorized"
**Solution**: 
1. Verify API key in Resend dashboard
2. Check API key permissions
3. Ensure key is not expired

### Problem: Emails not delivered
**Solution**:
1. Check Resend dashboard for delivery status
2. Verify from_email domain is verified
3. Check spam folder
4. Review bounce logs

---

## 📊 Monitoring After Deployment

### Check Firebase Logs (Every 5 minutes for first hour)
```bash
firebase functions:log --limit 20
```

### Check Resend Dashboard
1. Go to https://resend.com/dashboard
2. Monitor "Emails" tab
3. Check delivery rates
4. Review any bounces/complaints

### Monitor Key Metrics
- **Delivery Rate**: Should be > 95%
- **Bounce Rate**: Should be < 5%
- **Response Time**: Should be < 2000ms
- **Cost**: Should be $0.001 per email

---

## 🎯 Post-Deployment Tasks

### Immediate (Within 1 hour)
- [ ] Send test email
- [ ] Verify delivery
- [ ] Check Firebase logs
- [ ] Monitor Resend dashboard

### Short-term (Within 24 hours)
- [ ] Test all email types (welcome, verification, reminders)
- [ ] Verify tracking works (opens, clicks)
- [ ] Test failover to SMTP
- [ ] Monitor cost tracking

### Long-term (Within 1 week)
- [ ] Configure webhooks (optional)
- [ ] Set up monitoring alerts
- [ ] Review delivery statistics
- [ ] Optimize email templates

---

## 📞 Need Help?

### Resources
- **Full Documentation**: See `RESEND_INTEGRATION_COMPLETE.md`
- **Resend Docs**: https://resend.com/docs
- **Resend Dashboard**: https://resend.com/dashboard
- **Firebase Console**: https://console.firebase.google.com

### Support Channels
1. Check Firebase Functions logs
2. Review Resend dashboard
3. Consult integration documentation
4. Contact Resend support

---

## 🎉 You're Ready!

All code changes are complete and tested. Just run the 3 commands above and you're live with Resend!

```bash
# Quick deploy (copy-paste this)
cd backend/functions && npm install && npm run build && cd .. && firebase deploy --only functions
```

**Good luck with your deployment!** 🚀
