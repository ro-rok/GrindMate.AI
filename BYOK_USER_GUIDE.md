# BYOK (Bring Your Own Key) - User Guide

## What is BYOK?

BYOK (Bring Your Own Key) allows you to use your own Groq API key for unlimited access to the AI tutor, bypassing all rate limits.

## Why Use BYOK?

### Without BYOK (Free Tier)
- ❌ Limited to 25,000 tokens per day
- ❌ Limited to 30 requests per day
- ❌ Must wait for daily reset when limits are reached

### With BYOK
- ✅ **Unlimited** AI tutor access
- ✅ **No rate limits**
- ✅ **No waiting** for daily resets
- ✅ Full control over your API usage and costs
- ✅ Use your own Groq credits

## How to Get a Groq API Key

1. Visit [Groq Console](https://console.groq.com)
2. Sign up or log in to your account
3. Navigate to API Keys section
4. Click "Create API Key"
5. Copy your new API key (starts with `gsk_`)

**Note**: Groq offers a generous free tier with high rate limits. Check their pricing page for current limits.

## How to Enable BYOK

### Step 1: Navigate to Profile
1. Log in to your account
2. Click on your profile icon or navigate to `/profile`

### Step 2: Find BYOK Section
1. Scroll down to the "Bring Your Own Key (BYOK)" section
2. You'll see your current rate limit status

### Step 3: Add Your API Key
1. Enter your Groq API key in the password field
2. Click "Save API Key"
3. You'll see a green success message: "BYOK enabled - Using your API key"

### Step 4: Enjoy Unlimited Access
- Use the AI tutor without any limits
- No more rate limit warnings
- No waiting for daily resets

## How to Remove BYOK

If you want to return to the free tier:

1. Navigate to your Profile page
2. Scroll to the BYOK section
3. Click "Remove API Key"
4. You'll return to standard rate limits

## Security & Privacy

### Your API Key is Safe
- ✅ Encrypted before storage using industry-standard AES-128 encryption
- ✅ Never stored in plaintext
- ✅ Never exposed in API responses
- ✅ Only you can access or modify your key
- ✅ Can be removed at any time

### Best Practices
- 🔒 Never share your API key with others
- 🔒 Don't commit API keys to version control
- 🔒 Rotate your keys periodically
- 🔒 Monitor your Groq usage dashboard

## Troubleshooting

### "Failed to save API key"
- ✅ Check that your API key is valid (starts with `gsk_`)
- ✅ Ensure you copied the entire key
- ✅ Try removing any extra spaces
- ✅ Verify your internet connection

### "Failed to decrypt BYOK API key"
- ✅ Contact support - this indicates a server configuration issue
- ✅ Try removing and re-adding your key

### AI Tutor Still Shows Rate Limits
- ✅ Refresh the page after adding your key
- ✅ Check Profile page to verify BYOK is enabled (green banner)
- ✅ Try logging out and back in

## Cost Considerations

### Groq Pricing (as of 2024)
- Groq offers a generous free tier
- Check [Groq Pricing](https://groq.com/pricing) for current rates
- Monitor your usage in the Groq Console

### Typical Usage
- Average chat message: ~500-1000 tokens
- Average hint request: ~300-800 tokens
- Session with 10 messages: ~5,000-10,000 tokens

### Cost Comparison
With Groq's free tier and competitive pricing, BYOK is often more cost-effective than premium subscriptions for heavy users.

## FAQ

### Q: Can I switch between BYOK and free tier?
**A:** Yes! You can add or remove your API key at any time.

### Q: Will my conversation history be lost if I remove BYOK?
**A:** No, your conversation history is preserved regardless of BYOK status.

### Q: Can I use API keys from other providers (OpenAI, Anthropic)?
**A:** Currently, only Groq API keys are supported. Support for other providers may be added in the future.

### Q: What happens if my API key is invalid?
**A:** The system will fall back to the server's API key, and you'll see standard rate limits.

### Q: Is there a limit to how many times I can change my API key?
**A:** No, you can update your API key as often as needed.

### Q: Can I see how much I'm using with BYOK?
**A:** Check your Groq Console dashboard to monitor your API usage and costs.

### Q: What if I hit Groq's rate limits with my own key?
**A:** Groq's rate limits are much higher than our free tier. If you hit them, you'll see errors from Groq. Consider upgrading your Groq plan or waiting for the limit to reset.

## Support

If you encounter any issues with BYOK:
1. Check this guide for troubleshooting steps
2. Verify your API key in the Groq Console
3. Contact support with details about the issue

## Getting Started Checklist

- [ ] Create a Groq account
- [ ] Generate an API key
- [ ] Navigate to Profile page
- [ ] Enter your API key in the BYOK section
- [ ] Click "Save API Key"
- [ ] Verify green success banner appears
- [ ] Test the AI tutor (should work without limits)
- [ ] Monitor your usage in Groq Console

---

**Ready to get started?** Head to your [Profile page](/profile) and enable BYOK today!
