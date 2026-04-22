# QNB Fuel Card Extractor Pro - Setup Guide

## Quick Start (5 minutes)

### Step 1: Install the Extension
1. Download the `qnb_fuel_extension.zip` file
2. Extract it to a folder on your computer
3. Open Chrome browser
4. Go to `chrome://extensions/`
5. Enable "Developer mode" (toggle in top-right)
6. Click "Load unpacked"
7. Select the extracted `qnb_fuel_extension` folder
8. The extension icon (⛽) will appear in your toolbar

### Step 2: Start Your Free Trial
1. Click the extension icon in your toolbar
2. You'll see a "3-Day Trial" banner at the top
3. Go to the "📊 Extract" tab
4. Set your date range (e.g., 01/07/2025 to 30/06/2026)
5. Select which data to extract (Balance, Pending, Posted)
6. Click "🚀 Start Extraction"
7. Wait for the Excel file to download

### Step 3: Subscribe (After Trial or Now)
If you want to continue after the trial:

1. Go to the "💳 Subscription" tab
2. Choose a plan:
   - **Monthly**: $1/month (flexible, cancel anytime)
   - **Annual**: $10/year (save 17%)
3. Click "🔒 Subscribe Now"
4. Complete payment via Stripe or PayPal
5. Save your license key (important!)

## Detailed Configuration

### For Individual Users

No configuration needed! Just install and use.

### For Business/Enterprise

If you want to accept real payments, you need to set up the backend:

#### Setting Up Payment Backend (Optional)

**Prerequisites:**
- Node.js installed
- Stripe and/or PayPal account
- Vercel account (free)

**Steps:**

1. **Get API Keys:**
   - Stripe: Go to dashboard.stripe.com → Developers → API keys
   - PayPal: Go to developer.paypal.com → My Apps & Credentials

2. **Deploy Backend:**
   ```bash
   cd qnb_fuel_extension_backend
   npm install
   vercel --prod
   ```

3. **Set Environment Variables:**
   In Vercel dashboard, add:
   ```
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_PUBLISHABLE_KEY=pk_live_...
   PAYPAL_CLIENT_ID=...
   PAYPAL_CLIENT_SECRET=...
   ```

4. **Update Extension:**
   Edit `payment-gateway.js`:
   ```javascript
   backendUrl: 'https://your-backend.vercel.app/api'
   ```

5. **Repack Extension:**
   - Zip the extension folder
   - Reload in Chrome

## Troubleshooting

### Common Issues

**"Extension not working"**
→ Make sure you're on the QNB Fuel Card portal page

**"No data extracted"**
→ Check your date range includes actual transaction dates
→ Verify cards have transactions in that period

**"Payment failed"**
→ Check internet connection
→ Try different payment method
→ Ensure popups are allowed

**"License key invalid"**
→ Copy the full key without spaces
→ Format should be: QNB-XXXX-XXXX-XXXX-XXXX

### Getting Help

1. Check the status log in the extension
2. Press F12 → Console to see errors
3. Email support with:
   - Your license key
   - Screenshot of the error
   - What you were trying to do

## Frequently Asked Questions

**Q: Is my data safe?**
A: Yes! All processing happens in your browser. We never see your transaction data.

**Q: Can I use this on multiple computers?**
A: Yes, with the same license key. Use "Restore Purchase" on new devices.

**Q: What happens after my subscription expires?**
A: You get a 3-day grace period to renew. After that, extraction is locked until you subscribe.

**Q: Can I cancel anytime?**
A: Yes! Monthly plans can be cancelled anytime. Annual plans are valid for the full year.

**Q: Is there a refund policy?**
A: Yes, 30-day money-back guarantee if you're not satisfied.

**Q: Does this work with other banks?**
A: No, this is specifically designed for QNB Fuel Card portal.

## Tips & Tricks

**Best Practices:**
- Use shorter date ranges (1-3 months) for faster extraction
- Extract during off-peak hours (less server load)
- Save your license key in a password manager
- Check the "Account" tab to see your usage stats

**Advanced Usage:**
- Use "Posted Transactions" for reconciliation
- Use "Pending" to see recent authorized transactions
- Use "Online Balance" for quick balance checks

## Updates

To update the extension:
1. Download the new version
2. Go to `chrome://extensions/`
3. Click "Remove" on the old version
4. Click "Load unpacked" and select the new folder
5. Your license remains valid

---

**Need more help?** Contact support@your-domain.com
