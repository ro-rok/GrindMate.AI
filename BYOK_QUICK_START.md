# BYOK Quick Start Guide

## 🚀 5-Minute Setup

### For Developers

#### 1. Verify Implementation ✅
Your BYOK feature is already fully implemented! Check these files:
- Backend: `fastapi_backend/app/routers/users.py`
- Frontend: `leetcode-tracker-frontend/src/pages/Profile.jsx`
- Encryption: `fastapi_backend/app/services/encryption_service.py`

#### 2. Add Encryption Key ✅
Already done! Check your `.env` file:
```bash
ENCRYPTION_KEY=yDvgnJ0vay43UpO7EO10IqS3f6QXqXM-YCmwsTjghCk=
```

#### 3. Test Locally
```bash
# Start backend
cd fastapi_backend
python -m uvicorn app.main:app --reload

# Start frontend (in another terminal)
cd leetcode-tracker-frontend
npm run dev

# Run test script
cd fastapi_backend
python test_byok_manual.py
```

#### 4. Test in Browser
1. Open http://localhost:5173
2. Login to your account
3. Navigate to Profile page
4. Scroll to "Bring Your Own Key (BYOK)" section
5. Enter a test API key: `gsk_test_key_123`
6. Click "Save API Key"
7. Verify green success banner appears
8. Click "Remove API Key"
9. Verify blue info banner appears

### For Users

#### 1. Get a Groq API Key
1. Visit https://console.groq.com
2. Sign up or login
3. Go to API Keys section
4. Click "Create API Key"
5. Copy your key (starts with `gsk_`)

#### 2. Enable BYOK
1. Login to your account
2. Click Profile (top right)
3. Scroll to "Bring Your Own Key (BYOK)"
4. Paste your Groq API key
5. Click "Save API Key"
6. See green banner: "BYOK enabled"

#### 3. Enjoy Unlimited Access
- Use AI tutor without limits
- No more rate limit warnings
- No waiting for daily reset

#### 4. Remove BYOK (Optional)
1. Go to Profile page
2. Scroll to BYOK section
3. Click "Remove API Key"
4. Return to free tier

## 📋 Quick Reference

### API Endpoints
```bash
# Set BYOK key
POST /users/me/byok
Body: {"groq_api_key": "gsk_..."}

# Remove BYOK key
DELETE /users/me/byok

# Check BYOK status
GET /users/me/byok/status
```

### Environment Variables
```bash
# Required for production
ENCRYPTION_KEY=<your-fernet-key>

# Server's API key (fallback)
GROQ_API_KEY=<your-groq-key>
```

### Frontend Routes
```
/profile - Profile page with BYOK section
```

## 🔧 Troubleshooting

### "Failed to save API key"
- Check API key format (starts with `gsk_`)
- Remove any extra spaces
- Try a different key

### "Failed to decrypt BYOK API key"
- Contact support
- Try removing and re-adding key

### Still seeing rate limits
- Refresh the page
- Check Profile page for green banner
- Try logging out and back in

## 📚 Documentation

- **Technical Details**: `BYOK_IMPLEMENTATION_SUMMARY.md`
- **User Guide**: `BYOK_USER_GUIDE.md`
- **Deployment**: `BYOK_DEPLOYMENT_CHECKLIST.md`
- **Architecture**: `BYOK_ARCHITECTURE.md`

## ✅ Checklist

### Development
- [x] Code implemented
- [x] Encryption key added
- [x] Documentation created
- [ ] Local testing complete
- [ ] Frontend UI tested
- [ ] API endpoints tested

### Production
- [ ] Generate production encryption key
- [ ] Add to production environment
- [ ] Deploy backend
- [ ] Deploy frontend
- [ ] Test with real API keys
- [ ] Monitor for issues
- [ ] Announce to users

## 🎯 Next Steps

1. **Test locally** with the steps above
2. **Generate production key** for deployment
3. **Deploy to production** following checklist
4. **Announce feature** to users

## 💡 Tips

- Use different encryption keys for dev/prod
- Never commit encryption keys to git
- Monitor Groq dashboard for usage
- Rotate keys periodically
- Test with real Groq keys before production

## 🆘 Need Help?

- Check `BYOK_USER_GUIDE.md` for user questions
- Check `BYOK_DEPLOYMENT_CHECKLIST.md` for deployment issues
- Check `BYOK_ARCHITECTURE.md` for technical details
- Run `python test_byok_manual.py` for automated tests

---

**Status**: ✅ Ready to use  
**Time to deploy**: ~15 minutes  
**Difficulty**: Easy
