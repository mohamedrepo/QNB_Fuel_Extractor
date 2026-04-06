// Payment Gateway Integration Module
// Supports Stripe and PayPal with fallback options

const PaymentGateway = {
    // Configuration
    config: {
        stripe: {
            publishableKey: 'pk_test_YOUR_STRIPE_KEY', // Replace with your key
            monthlyPriceId: 'price_monthly_123',
            annualPriceId: 'price_annual_123',
            currency: 'usd'
        },
        paypal: {
            clientId: 'YOUR_PAYPAL_CLIENT_ID', // Replace with your key
            monthlyAmount: '1.00',
            annualAmount: '10.00',
            currency: 'USD'
        },
        // Your backend API endpoint (can be serverless like Vercel/Netlify)
        backendUrl: 'https://your-payment-backend.vercel.app/api'
    },

    // Initialize payment gateway
    async init() {
        console.log('Payment Gateway initialized');
        return true;
    },

    // Create checkout session
    async createCheckout(planType, userEmail, gateway = 'stripe') {
        try {
            if (gateway === 'stripe') {
                return await this.createStripeCheckout(planType, userEmail);
            } else if (gateway === 'paypal') {
                return await this.createPayPalCheckout(planType, userEmail);
            }
        } catch (error) {
            console.error('Payment creation failed:', error);
            throw error;
        }
    },

    // Stripe Checkout
    async createStripeCheckout(planType, userEmail) {
        // Call your backend to create Stripe Checkout session
        const response = await fetch(`${this.config.backendUrl}/stripe/checkout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                planType,
                userEmail,
                priceId: planType === 'annual' 
                    ? this.config.stripe.annualPriceId 
                    : this.config.stripe.monthlyPriceId,
                successUrl: chrome.runtime.getURL('payment-success.html'),
                cancelUrl: chrome.runtime.getURL('payment-cancel.html')
            })
        });

        if (!response.ok) {
            throw new Error('Failed to create checkout session');
        }

        const { checkoutUrl } = await response.json();

        // Open checkout in new tab
        chrome.tabs.create({ url: checkoutUrl });

        return { success: true, gateway: 'stripe' };
    },

    // PayPal Checkout
    async createPayPalCheckout(planType, userEmail) {
        const amount = planType === 'annual' 
            ? this.config.paypal.annualAmount 
            : this.config.paypal.monthlyAmount;

        // Call your backend to create PayPal order
        const response = await fetch(`${this.config.backendUrl}/paypal/checkout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                planType,
                userEmail,
                amount,
                currency: this.config.paypal.currency,
                description: `QNB Fuel Extractor ${planType} subscription`
            })
        });

        if (!response.ok) {
            throw new Error('Failed to create PayPal order');
        }

        const { orderId, approvalUrl } = await response.json();

        // Store order ID for verification
        await chrome.storage.local.set({ 
            pendingPayPalOrder: orderId,
            pendingPlanType: planType 
        });

        // Open PayPal approval page
        chrome.tabs.create({ url: approvalUrl });

        return { success: true, gateway: 'paypal', orderId };
    },

    // Verify payment status (called after user returns from payment)
    async verifyPayment(sessionId, gateway = 'stripe') {
        try {
            const response = await fetch(`${this.config.backendUrl}/${gateway}/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId,
                    gateway
                })
            });

            if (!response.ok) {
                return { valid: false };
            }

            const result = await response.json();

            if (result.valid) {
                // Store subscription data
                await chrome.storage.local.set({
                    subscriptionStatus: 'active',
                    subscriptionType: result.planType,
                    subscriptionEndDate: result.expiresAt,
                    licenseKey: result.licenseKey,
                    paymentGateway: gateway,
                    lastPaymentDate: new Date().toISOString()
                });
            }

            return result;
        } catch (error) {
            console.error('Payment verification failed:', error);
            return { valid: false };
        }
    },

    // For demo/testing: Simulate successful payment
    async simulatePayment(planType) {
        console.log('Simulating payment for demo...');

        const now = new Date();
        const endDate = new Date();

        if (planType === 'monthly') {
            endDate.setMonth(endDate.getMonth() + 1);
        } else {
            endDate.setFullYear(endDate.getFullYear() + 1);
        }

        const licenseKey = this.generateLicenseKey();

        // Store simulated subscription
        await chrome.storage.local.set({
            subscriptionStatus: 'active',
            subscriptionType: planType,
            subscriptionStartDate: now.toISOString(),
            subscriptionEndDate: endDate.toISOString(),
            licenseKey: licenseKey,
            paymentGateway: 'demo',
            lastPaymentDate: now.toISOString(),
            paymentHistory: [{
                date: now.toISOString(),
                plan: planType,
                amount: planType === 'monthly' ? 1.00 : 10.00,
                currency: 'USD',
                gateway: 'demo',
                transactionId: 'DEMO_' + Date.now()
            }]
        });

        return {
            success: true,
            licenseKey: licenseKey,
            planType: planType,
            expiresAt: endDate.toISOString()
        };
    },

    // Generate license key
    generateLicenseKey() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let key = 'QNB-';
        for (let i = 0; i < 16; i++) {
            if (i > 0 && i % 4 === 0) key += '-';
            key += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return key;
    },

    // Check subscription status
    async checkSubscription() {
        const data = await chrome.storage.local.get([
            'subscriptionStatus',
            'subscriptionEndDate',
            'subscriptionType',
            'licenseKey'
        ]);

        if (!data.subscriptionStatus || data.subscriptionStatus !== 'active') {
            return { active: false, status: data.subscriptionStatus || 'none' };
        }

        const now = new Date();
        const endDate = new Date(data.subscriptionEndDate);

        if (now > endDate) {
            // Subscription expired
            await chrome.storage.local.set({
                subscriptionStatus: 'expired'
            });
            return { active: false, status: 'expired' };
        }

        const daysRemaining = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));

        return {
            active: true,
            status: 'active',
            planType: data.subscriptionType,
            expiresAt: data.subscriptionEndDate,
            daysRemaining: daysRemaining,
            licenseKey: data.licenseKey
        };
    }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PaymentGateway;
}
