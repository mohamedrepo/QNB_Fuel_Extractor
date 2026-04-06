// Background script for subscription monitoring and license validation

const CONFIG = {
    MONTHLY_PRICE: 1.00,
    ANNUAL_PRICE: 10.00,
    CURRENCY: 'USD',
    TRIAL_DAYS: 3,
    GRACE_PERIOD_DAYS: 3
};

// Initialize extension on install
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        // Set up initial state with trial
        const installDate = new Date().toISOString();
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + CONFIG.TRIAL_DAYS);

        chrome.storage.local.set({
            installDate: installDate,
            trialEndDate: trialEnd.toISOString(),
            subscriptionStatus: 'trial', // trial, active, expired, grace_period
            subscriptionType: null, // monthly, annual
            subscriptionStartDate: null,
            subscriptionEndDate: null,
            licenseKey: null,
            paymentHistory: [],
            lastCheckDate: new Date().toISOString()
        });

        // Set up daily alarm for subscription check
        chrome.alarms.create('subscriptionCheck', {
            periodInMinutes: 1440 // Daily check
        });

        console.log('Extension installed - Trial period started');
    }
});

// Handle alarm for subscription monitoring
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'subscriptionCheck') {
        checkSubscriptionStatus();
    }
});

// Check and update subscription status
async function checkSubscriptionStatus() {
    const data = await chrome.storage.local.get([
        'subscriptionStatus', 'subscriptionEndDate', 'trialEndDate', 'gracePeriodEnd'
    ]);

    const now = new Date();
    let newStatus = data.subscriptionStatus;
    let graceEnd = data.gracePeriodEnd ? new Date(data.gracePeriodEnd) : null;

    // Check if in trial period
    if (data.subscriptionStatus === 'trial') {
        const trialEnd = new Date(data.trialEndDate);
        if (now > trialEnd) {
            // Trial expired - start grace period
            newStatus = 'grace_period';
            graceEnd = new Date();
            graceEnd.setDate(graceEnd.getDate() + CONFIG.GRACE_PERIOD_DAYS);

            await chrome.storage.local.set({
                subscriptionStatus: 'grace_period',
                gracePeriodEnd: graceEnd.toISOString()
            });

            // Notify user
            showNotification(
                'Trial Expired',
                `Your trial has ended. Subscribe now to continue using the extension. Grace period: ${CONFIG.GRACE_PERIOD_DAYS} days.`
            );
        }
    }

    // Check if subscription expired
    if (data.subscriptionStatus === 'active' && data.subscriptionEndDate) {
        const subEnd = new Date(data.subscriptionEndDate);
        if (now > subEnd) {
            // Subscription expired - start grace period
            newStatus = 'grace_period';
            graceEnd = new Date();
            graceEnd.setDate(graceEnd.getDate() + CONFIG.GRACE_PERIOD_DAYS);

            await chrome.storage.local.set({
                subscriptionStatus: 'grace_period',
                gracePeriodEnd: graceEnd.toISOString()
            });

            showNotification(
                'Subscription Expired',
                'Your subscription has expired. Renew now to continue. Grace period: 3 days.'
            );
        }
    }

    // Check if grace period ended
    if (data.subscriptionStatus === 'grace_period' && graceEnd && now > graceEnd) {
        newStatus = 'expired';
        await chrome.storage.local.set({
            subscriptionStatus: 'expired'
        });

        showNotification(
            'Access Denied',
            'Your grace period has ended. Please subscribe to continue using the extension.'
        );
    }

    // Update last check date
    await chrome.storage.local.set({
        lastCheckDate: now.toISOString()
    });

    return newStatus;
}

// Show browser notification
function showNotification(title, message) {
    chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: title,
        message: message,
        priority: 2
    });
}

// Message handler from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'getSubscriptionStatus') {
        checkSubscriptionStatus().then(status => {
            chrome.storage.local.get([
                'subscriptionStatus', 'subscriptionType', 'subscriptionEndDate',
                'trialEndDate', 'gracePeriodEnd', 'installDate', 'paymentHistory'
            ], (data) => {
                sendResponse({
                    ...data,
                    config: CONFIG,
                    isActive: ['trial', 'active', 'grace_period'].includes(data.subscriptionStatus)
                });
            });
        });
        return true;
    }

    if (request.type === 'processPayment') {
        processPayment(request.planType).then(result => {
            sendResponse(result);
        });
        return true;
    }

    if (request.type === 'validateLicense') {
        validateLicense(request.licenseKey).then(result => {
            sendResponse(result);
        });
        return true;
    }

    if (request.type === 'cancelSubscription') {
        cancelSubscription().then(result => {
            sendResponse(result);
        });
        return true;
    }
});

// Process payment (Simulated - integrate with Stripe/PayPal in production)
async function processPayment(planType) {
    // In production, this would open a payment gateway
    // For demo, we'll simulate successful payment

    const now = new Date();
    let endDate = new Date();
    let price = 0;

    if (planType === 'monthly') {
        endDate.setMonth(endDate.getMonth() + 1);
        price = CONFIG.MONTHLY_PRICE;
    } else if (planType === 'annual') {
        endDate.setFullYear(endDate.getFullYear() + 1);
        price = CONFIG.ANNUAL_PRICE;
    }

    // Generate license key
    const licenseKey = generateLicenseKey();

    // Record payment
    const payment = {
        date: now.toISOString(),
        plan: planType,
        amount: price,
        currency: CONFIG.CURRENCY,
        licenseKey: licenseKey,
        transactionId: 'TXN_' + Date.now() // In production, from payment gateway
    };

    // Get existing payment history
    const data = await chrome.storage.local.get('paymentHistory');
    const paymentHistory = data.paymentHistory || [];
    paymentHistory.push(payment);

    // Update subscription
    await chrome.storage.local.set({
        subscriptionStatus: 'active',
        subscriptionType: planType,
        subscriptionStartDate: now.toISOString(),
        subscriptionEndDate: endDate.toISOString(),
        licenseKey: licenseKey,
        paymentHistory: paymentHistory,
        gracePeriodEnd: null // Clear any grace period
    });

    return {
        success: true,
        licenseKey: licenseKey,
        endDate: endDate.toISOString(),
        message: `Successfully subscribed to ${planType} plan!`
    };
}

// Validate license key
async function validateLicense(licenseKey) {
    const data = await chrome.storage.local.get('licenseKey');

    if (data.licenseKey === licenseKey) {
        return { valid: true, message: 'License valid' };
    }

    return { valid: false, message: 'Invalid license key' };
}

// Cancel subscription
async function cancelSubscription() {
    // In production, this would also cancel with payment provider

    await chrome.storage.local.set({
        subscriptionStatus: 'cancelled',
        subscriptionEndDate: new Date().toISOString() // End immediately or at period end
    });

    return {
        success: true,
        message: 'Subscription cancelled. You can use the extension until the end of your billing period.'
    };
}

// Generate license key
function generateLicenseKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let key = 'QNB-';
    for (let i = 0; i < 16; i++) {
        if (i > 0 && i % 4 === 0) key += '-';
        key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
}

console.log('Background script loaded - Subscription monitoring active');
