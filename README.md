# 🏦 QNB Fuel Card Extractor Pro

A professional Chrome extension for extracting fuel card transactions from the QNB (Qatar National Bank) Fuel Card portal with advanced features, subscription management, and secure payment processing.

## ✨ Features

### Core Functionality
- ✅ **Custom Date Range Selection** - Extract transactions for any date period
- ✅ **Three Data Types**:
   - 💰 Online Balance (real-time balance per card)
   - ⏳ Pending Transactions (authorized but not posted)
   - 📋 Posted Transactions (completed, sorted by Card → Type → Date)
- ✅ **Modern .xlsx Export** - Office Open XML format (Excel compatible)
- ✅ **DateTime Format** - dd/mm/yyyy hh:mm AM/PM
- ✅ **Progress Tracking** - Real-time progress bar and statistics
- ✅ **Background Extraction** - Runs even when popup is closed
- ✅ **Automatic Sorting** - Smart sorting by card number, transaction type, and date

### Subscription & Payment
- 🎁 **3-Day Free Trial** - Test all features before purchasing
- 💳 **Secure Payment Processing** - Stripe and PayPal integration
- 🔑 **License Key System** - Restore purchases across devices
- 📅 **Flexible Plans**:
  - Monthly: $1/month
  - Annual: $10/year (17% savings)
- 🔔 **Grace Period** - 3-day grace period after subscription expires
- 📊 **Payment History** - Track all your payments

## 🚀 Installation

### For Users

1. Download the extension files
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable **Developer mode** (toggle in top-right corner)
4. Click **Load unpacked**
5. Select the `qnb_fuel_extension` folder
6. The extension icon will appear in your toolbar

### For Developers (Publishing to Chrome Web Store)

1. Create a zip file of the extension folder
2. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
3. Click **New Item** and upload the zip file
4. Fill in the store listing details
5. Submit for review

## 📖 How to Use

### First Time Setup
1. Click the extension icon in your Chrome toolbar
2. You'll start with a **3-day free trial**
3. Navigate to the QNB Fuel Card portal and log in
4. Go to the **Extract** tab

### Extracting Data
1. **Set Date Range**:
   - From Date: DD/MM/YYYY format (e.g., 01/07/2025)
   - To Date: DD/MM/YYYY format (e.g., 30/06/2026)

2. **Select Data Types**:
   - Check/uncheck Balance, Pending, Posted as needed

3. **Click** "🚀 Start Extraction"

4. **Wait** for completion - the Excel file will auto-download

### Subscription Management

#### Purchasing a Plan
1. Go to the **💳 Subscription** tab
2. Choose between **Monthly ($1)** or **Annual ($10)** plan
3. Click "🔒 Subscribe Now"
4. Complete payment via Stripe or PayPal
5. Save your license key (displayed after payment)

#### Restoring a Purchase
1. Go to the **👤 Account** tab
2. Click "🔄 Restore Purchase"
3. Enter your license key
4. Click validate

#### Viewing Payment History
- All payments are listed in the **👤 Account** tab
- Includes date, amount, plan type, and transaction ID

## 💳 Payment Integration Setup

### For Extension Owners (Setting Up Payments)

To accept real payments, you need to set up a backend server:

#### Option 1: Stripe Only (Easiest)

1. Create a [Stripe account](https://stripe.com)
2. Get your API keys from the Stripe Dashboard
3. Deploy the backend template (in `qnb_fuel_extension_backend` folder)
4. Update `payment-gateway.js` with your keys:
   ```javascript
   stripe: {
       publishableKey: 'pk_live_YOUR_KEY',
       monthlyPriceId: 'price_xxx',
       annualPriceId: 'price_xxx'
   }
   ```

#### Option 2: PayPal Only

1. Create a [PayPal Developer account](https://developer.paypal.com)
2. Create an app to get Client ID and Secret
3. Deploy the backend
4. Update `payment-gateway.js`:
   ```javascript
   paypal: {
       clientId: 'YOUR_PAYPAL_CLIENT_ID'
   }
   ```

#### Option 3: Both Stripe and PayPal

Follow both setups above for maximum payment flexibility.

### Backend Deployment (Vercel - Free)

```bash
cd qnb_fuel_extension_backend
npm install
vercel --prod
```

Then set environment variables in Vercel dashboard:
- `STRIPE_SECRET_KEY`
- `STRIPE_PUBLISHABLE_KEY`
- `PAYPAL_CLIENT_ID`
- `PAYPAL_CLIENT_SECRET`

## 🔒 Security & Privacy

- ✅ All data processing happens locally in your browser
- ✅ No transaction data is sent to external servers
- ✅ Payment processing uses secure Stripe/PayPal APIs
- ✅ License keys are stored locally using Chrome's secure storage
- ✅ No tracking or analytics
- ✅ Open source code - fully auditable

## 🛠️ Technical Details

### Architecture
- **Manifest Version**: 3 (latest Chrome standard)
- **Background Script**: Service worker for subscription monitoring
- **Content Script**: Injected into QNB portal for data extraction
- **Popup Interface**: React-like vanilla JS with tab navigation
- **Storage**: Chrome Storage API for subscription data

### File Structure
```
qnb_fuel_extension/
├── manifest.json              # Extension configuration
├── popup.html                 # Main UI
├── popup.js                   # UI logic and extraction
├── background.js              # Subscription monitoring
├── payment-gateway.js         # Payment processing
├── payment-success.html     # Post-payment success page
├── payment-cancel.html      # Payment cancellation page
├── icons/                     # Extension icons
└── README.md                  # This file
```

### Subscription States
1. **trial** - 3-day free trial period
2. **active** - Paid subscription in good standing
3. **grace_period** - 3 days after expiration to renew
4. **expired** - Subscription ended, access blocked

## 🐛 Troubleshooting

### Extension Not Working
- Ensure you're on the QNB Fuel Card portal (`fuelportal.qnbalahli.com`)
- Check that you're logged in
- Refresh the page and try again
- Check the browser console (F12) for error messages

### Dates Resetting to September 2025
- The extension automatically overrides the 6-month datepicker restriction
- If it still resets, the extraction will use the closest valid date
- Check the status log for the actual dates being used

### Payment Failed
- Check your internet connection
- Try a different payment method
- Ensure your browser allows popups for the payment window
- Contact support with your transaction ID if charged but not activated

### License Key Not Working
- Ensure you copied the full key (format: `QNB-XXXX-XXXX-XXXX-XXXX`)
- Check for extra spaces before or after the key
- Try restoring the purchase again
- Contact support with your license key

### Excel File Not Downloading
- Check browser download settings
- Look in your Downloads folder
- Disable popup blockers for the extension
- Try using a different browser

## 📞 Support

### Getting Help
1. Check the status log in the extension popup
2. Open Chrome DevTools (F12) → Console for detailed errors
3. Verify you're using the correct date format (DD/MM/YYYY)
4. Ensure your subscription is active

### Contact
- Email: support@your-domain.com
- Include your license key and a description of the issue

## 📜 License & Legal

### Terms of Service
- One license per user
- Do not share your license key
- Use only for legitimate business purposes
- We are not affiliated with QNB bank

### Disclaimer
This extension is an independent tool and is not officially affiliated with Qatar National Bank (QNB). Use at your own risk. Always verify extracted data against official sources.

## 🔄 Version History

### v2.0.1 (Current)
- ✅ Fixed extraction runs in background service worker
- ✅ Export now uses modern .xlsx format (Office Open XML)
- ✅ DateTime format: dd/mm/yyyy hh:mm AM/PM

### v2.0.0
- ✅ Added subscription system with trial period
- ✅ Integrated Stripe and PayPal payments
- ✅ Added license key management
- ✅ Three-tab interface (Extract, Subscription, Account)
- ✅ Payment history tracking
- ✅ Grace period for expired subscriptions

### v1.0.0
- ✅ Initial release
- ✅ Basic extraction functionality
- ✅ Three-sheet Excel export
- ✅ Date range selection

## 🎯 Roadmap

### Planned Features
- [ ] Automatic scheduled extractions
- [ ] Email notifications when new transactions appear
- [ ] Multi-account support
- [ ] Advanced filtering options
- [ ] CSV export option
- [ ] Data visualization charts

## 🤝 Contributing

This is a commercial extension. For bug reports or feature requests, please contact support.

---

**Made with ❤️ for QNB Fuel Card users**

*Note: This extension requires a valid subscription after the 3-day trial period.*
