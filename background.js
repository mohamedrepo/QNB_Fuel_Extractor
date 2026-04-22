// Background script for subscription monitoring and license validation

const CONFIG = {
    MONTHLY_PRICE: 1.00,
    ANNUAL_PRICE: 10.00,
    CURRENCY: 'USD',
    TRIAL_DAYS: 3,
    GRACE_PERIOD_DAYS: 3
};

let extractionState = {
    isRunning: false,
    shouldStop: false,
    tabId: null,
    fromDate: null,
    toDate: null,
    extractBalance: false,
    extractPending: false,
    extractPosted: false
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

    if (request.type === 'startExtraction') {
        startExtraction(request.data, sendResponse);
        return true;
    }

    if (request.type === 'stopExtraction') {
        stopExtraction();
        sendResponse({ success: true });
        return true;
    }

    if (request.type === 'getExtractionStatus') {
        sendResponse({ isRunning: extractionState.isRunning });
        return true;
    }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.source === 'extraction') {
        chrome.runtime.sendMessage(request).catch(() => {});
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

async function startExtraction(data, sendResponse) {
    const { tabId, fromDate, toDate, extractBalance, extractPending, extractPosted } = data;

    extractionState = {
        isRunning: true,
        shouldStop: false,
        tabId: tabId,
        fromDate: fromDate,
        toDate: toDate,
        extractBalance: extractBalance,
        extractPending: extractPending,
        extractPosted: extractPosted
    };

    try {
        await chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: function() {
                return new Promise(function(resolve, reject) {
                    if (window.XLSX) return resolve();
                    var script = document.createElement('script');
                    script.src = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.mini.min.js';
                    script.onload = function() { resolve(); };
                    script.onerror = function(e) { reject(e); };
                    document.head.appendChild(script);
                });
            }
        });

        await chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: runExtractionInContent,
            args: [fromDate, toDate, extractBalance, extractPending, extractPosted]
        });

        sendResponse({ success: true });
    } catch (error) {
        sendResponse({ success: false, error: error.message });
        extractionState.isRunning = false;
    }
}

function stopExtraction() {
    extractionState.shouldStop = true;
}

function runExtractionInContent(fromDate, toDate, extractBalance, extractPending, extractPosted) {
    window.shouldStop = false;
    window.extractionComplete = false;

    const DELAY = 3000;
    const allPostedData = [];
    const allPendingData = [];
    const allBalanceData = [];
    const sleep = ms => new Promise(r => setTimeout(r, ms));

    function sendMessage(type, data) {
        chrome.runtime.sendMessage({ type, ...data, source: 'extraction' });
    }

    const closeModal = async () => {
        const closeBtn = document.querySelector('#myModal .close, .modal-header .close, [data-dismiss="modal"]');
        if (closeBtn) {
            closeBtn.click();
            await sleep(1000);
        } else {
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
            await sleep(800);
        }
    };

    const closeNotificationModal = async () => {
        const closeBtn = document.querySelector('#notificationModal .close, #notificationModal .notification-btn-close');
        if (closeBtn) {
            closeBtn.click();
            await sleep(500);
        }
    };

    const resetDatepicker = (fieldId) => {
        const input = document.getElementById(fieldId);
        if (!input) return false;

        if (window.jQuery && $(input).datepicker) {
            try {
                $(input).datepicker('destroy');
                $(input).datepicker({
                    dateFormat: 'dd/mm/yy',
                    minDate: new Date(2020, 0, 1),
                    maxDate: new Date(2030, 11, 31),
                    changeMonth: true,
                    changeYear: true
                });
                return true;
            } catch (e) {}
        }
        return false;
    };

    const setDateFixed = async (fieldId, value) => {
        const input = document.getElementById(fieldId);
        if (!input) return false;

        if (window.jQuery && $(input).datepicker) {
            try {
                resetDatepicker(fieldId);
                $(input).datepicker('setDate', value);
                if ($(input).val() === value) return true;
            } catch (e) {}
        }

        input.removeAttribute('readonly');
        input.removeAttribute('disabled');
        input.value = value;

        ['focus', 'click', 'input', 'change', 'blur'].forEach(evt => {
            input.dispatchEvent(new Event(evt, { bubbles: true }));
        });

        if (window.jQuery) {
            $(input).val(value).trigger('change').trigger('input');
        }

        return true;
    };

    const clickSearch = () => {
        const selectors = [
            '#myModal input[type="submit"]',
            '#myModal button[type="submit"]',
            '#myModal .btn-search',
            '.modal-content input[type="submit"]'
        ];

        for (let selector of selectors) {
            const btn = document.querySelector(selector);
            if (btn) {
                btn.click();
                return true;
            }
        }
        return false;
    };

    const getOnlineBalance = async (cardRef) => {
        try {
            const onlineBalanceBtn = document.querySelector(`button[onclick*="RefreshCard(${cardRef}"]`);
            if (!onlineBalanceBtn) return null;

            onlineBalanceBtn.click();
            await sleep(2500);

            const modalMessage = document.querySelector('#notificationModal .message')?.innerText;
            const balanceMatch = modalMessage?.match(/[\d,]+\.?\d*/);

            let onlineBalance = '';
            if (balanceMatch) {
                onlineBalance = balanceMatch[0];
            }

            await closeNotificationModal();
            await sleep(500);

            return onlineBalance;
        } catch (e) {
            return null;
        }
    };

    const parseDateForSort = (dateStr) => {
        if (!dateStr) return '00000000';
        const parts = dateStr.match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})/);
        if (parts) {
            let [_, day, month, year] = parts;
            if (year.length === 2) year = '20' + year;
            return `${year}${month.padStart(2, '0')}${day.padStart(2, '0')}`;
        }
        return dateStr;
    };

    const formatDateDMY = (dateStr) => {
        if (!dateStr) return '';
        const parts = dateStr.match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})(\s+(\d{1,2}):(\d{2}))?/);
        if (parts) {
            let [_, day, month, year, , hours, minutes] = parts;
            if (year.length === 2) year = '20' + year;
            const h = hours ? parseInt(hours) : 0;
            const m = minutes ? parseInt(minutes) : 0;
            const ampm = h >= 12 ? 'PM' : 'AM';
            const h12 = h % 12 || 12;
            return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year} ${h12.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${ampm}`;
        }
        return dateStr;
    };

    const sortPostedData = (data) => {
        return data.sort((a, b) => {
            const cardCompare = a.card_number.localeCompare(b.card_number);
            if (cardCompare !== 0) return cardCompare;

            const typeCompare = a.transaction_type.localeCompare(b.transaction_type);
            if (typeCompare !== 0) return typeCompare;

            const dateA = parseDateForSort(a.transaction_date);
            const dateB = parseDateForSort(b.transaction_date);
            return dateA.localeCompare(dateB);
        });
    };

    const sortPendingData = (data) => {
        return data.sort((a, b) => {
            const cardCompare = a.card_number.localeCompare(b.card_number);
            if (cardCompare !== 0) return cardCompare;

            const dateA = parseDateForSort(a.transaction_date);
            const dateB = parseDateForSort(b.transaction_date);
            return dateA.localeCompare(dateB);
        });
    };

    const sortBalanceData = (data) => {
        return data.sort((a, b) => a.card_number.localeCompare(b.card_number));
    };

    (async function() {
        sendMessage('log', { message: `Starting extraction for ${fromDate} to ${toDate}`, logType: 'info' });

        const cards = document.querySelectorAll('a.card-details');
        sendMessage('log', { message: `Found ${cards.length} cards`, logType: 'info' });
        sendMessage('stats', { cards: cards.length, pending: 0, posted: 0 });

        for (let i = 0; i < cards.length; i++) {
            if (window.shouldStop) {
                sendMessage('log', { message: 'Extraction stopped by user', logType: 'warning' });
                sendMessage('stopped', {});
                return;
            }

            try {
                const freshCards = document.querySelectorAll('a.card-details');
                if (i >= freshCards.length) break;

                const card = freshCards[i];
                const row = card.closest('tr');
                const cells = row.querySelectorAll('td');

                const cardNum = cells[0]?.innerText?.trim() || `Card_${i + 1}`;
                const cardName = cells[1]?.innerText?.trim() || '';
                const tableBalance = cells[2]?.innerText?.trim() || '';

                const cardHref = card.getAttribute('href');
                const cardRefMatch = cardHref.match(/cardRef=(\d+)/);
                const cardRef = cardRefMatch ? cardRefMatch[1] : '';

                sendMessage('log', { message: `[${i + 1}/${cards.length}] Processing ${cardNum}`, logType: 'info' });
                sendMessage('progress', { current: i + 1, total: cards.length });

                let onlineBalance = tableBalance;
                if (extractBalance) {
                    const fetchedBalance = await getOnlineBalance(cardRef);
                    if (fetchedBalance) {
                        onlineBalance = fetchedBalance;
                    }
                }

                allBalanceData.push({
                    card_number: cardNum,
                    card_name: cardName,
                    online_balance: onlineBalance,
                    table_balance: tableBalance,
                    card_ref: cardRef
                });

                if (extractPending || extractPosted) {
                    card.click();
                    await sleep(3000);

                    resetDatepicker('From');
                    resetDatepicker('To');
                    await sleep(500);

                    await setDateFixed('From', fromDate);
                    await sleep(800);
                    await setDateFixed('To', toDate);
                    await sleep(800);

                    clickSearch();
                    await sleep(6000);

                    const postedDropdown = document.querySelector('select[name="dtPostedCardMovements_length"]');
                    if (postedDropdown) {
                        postedDropdown.value = '-1';
                        postedDropdown.dispatchEvent(new Event('change', { bubbles: true }));
                        await sleep(3000);
                    }

                    if (extractPending) {
                        const pendingTable = document.getElementById('dtPindingCardMovements');
                        if (pendingTable) {
                            const pendingRows = pendingTable.querySelectorAll('tbody tr');
                            let pendingCount = 0;
                            pendingRows.forEach(tr => {
                                const cols = tr.querySelectorAll('td');
                                if (cols.length >= 4) {
                                    allPendingData.push({
                                        card_number: cardNum,
                                        card_name: cardName,
                                        transaction_description: cols[0]?.innerText?.trim(),
                                        transaction_date: cols[1]?.innerText?.trim(),
                                        transaction_amount: cols[2]?.innerText?.trim()?.replace(/,/g, ''),
                                        debit_credit: cols[3]?.innerText?.trim()
                                    });
                                    pendingCount++;
                                }
                            });
                            sendMessage('log', { message: `  ✓ Pending: ${pendingCount}`, logType: 'success' });
                        }
                    }

                    if (extractPosted) {
                        const postedTable = document.getElementById('dtPostedCardMovements');
                        if (postedTable) {
                            const postedRows = postedTable.querySelectorAll('tbody tr');
                            let postedCount = 0;
                            postedRows.forEach(tr => {
                                const cols = tr.querySelectorAll('td');
                                if (cols.length >= 4) {
                                    allPostedData.push({
                                        card_number: cardNum,
                                        card_name: cardName,
                                        online_balance: onlineBalance,
                                        transaction_description: cols[0]?.innerText?.trim(),
                                        transaction_date: cols[1]?.innerText?.trim(),
                                        transaction_amount: cols[2]?.innerText?.trim()?.replace(/,/g, ''),
                                        transaction_type: cols[3]?.innerText?.trim()
                                    });
                                    postedCount++;
                                }
                            });
                            sendMessage('log', { message: `  ✓ Posted: ${postedCount}`, logType: 'success' });
                        }
                    }

                    await closeModal();
                }

                sendMessage('stats', {
                    cards: i + 1,
                    pending: allPendingData.length,
                    posted: allPostedData.length
                });

                if (i < cards.length - 1) await sleep(DELAY);

            } catch (error) {
                sendMessage('log', { message: `Error on card ${i + 1}: ${error.message}`, logType: 'error' });
                await closeModal();
                await closeNotificationModal();
            }
        }

        sendMessage('log', { message: 'Sorting data...', logType: 'info' });

        const sortedPosted = extractPosted ? sortPostedData(allPostedData) : [];
        const sortedPending = extractPending ? sortPendingData(allPendingData) : [];
        const sortedBalance = extractBalance ? sortBalanceData(allBalanceData) : [];

        if (sortedPosted.length > 0 || sortedPending.length > 0 || sortedBalance.length > 0) {
            sendMessage('log', { message: 'Generating Excel file...', logType: 'info' });

            const wb = XLSX.utils.book_new();

            if (extractPosted && sortedPosted.length > 0) {
                const postedData = sortedPosted.map(d => ({
                    'Card Number': d.card_number,
                    'Card Name': d.card_name,
                    'Online Balance': d.online_balance,
                    'Transaction Date': formatDateDMY(d.transaction_date),
                    'Transaction Description': d.transaction_description,
                    'Amount': d.transaction_amount,
                    'Type (D/C)': d.transaction_type
                }));
                const wsPosted = XLSX.utils.json_to_sheet(postedData);
                wsPosted['!cols'] = postedData[0] ? Object.keys(postedData[0]).map(() => ({ wch: 20 })) : [];
                XLSX.utils.book_append_sheet(wb, wsPosted, 'Posted Transactions');
            }

            if (extractPending && sortedPending.length > 0) {
                const pendingData = sortedPending.map(d => ({
                    'Card Number': d.card_number,
                    'Card Name': d.card_name,
                    'Transaction Date': formatDateDMY(d.transaction_date),
                    'Transaction Description': d.transaction_description,
                    'Amount': d.transaction_amount,
                    'Debit/Credit': d.debit_credit
                }));
                const wsPending = XLSX.utils.json_to_sheet(pendingData);
                wsPending['!cols'] = pendingData[0] ? Object.keys(pendingData[0]).map(() => ({ wch: 20 })) : [];
                XLSX.utils.book_append_sheet(wb, wsPending, 'Pending Transactions');
            }

            if (extractBalance && sortedBalance.length > 0) {
                const balanceData = sortedBalance.map(d => ({
                    'Card Number': d.card_number,
                    'Card Name': d.card_name,
                    'Online Balance': d.online_balance,
                    'Table Balance': d.table_balance,
                    'Card Ref': d.card_ref
                }));
                const wsBalance = XLSX.utils.json_to_sheet(balanceData);
                wsBalance['!cols'] = balanceData[0] ? Object.keys(balanceData[0]).map(() => ({ wch: 20 })) : [];
                XLSX.utils.book_append_sheet(wb, wsBalance, 'Online Balance');
            }

            const xlsxData = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([xlsxData], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `QNB_Fuel_${fromDate.replace(/\//g, '')}_to_${toDate.replace(/\//g, '')}.xlsx`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            sendMessage('log', { message: `✅ Exported: ${sortedPosted.length} posted, ${sortedPending.length} pending, ${sortedBalance.length} balances`, logType: 'success' });
        } else {
            sendMessage('log', { message: 'No data to export', logType: 'warning' });
        }

        sendMessage('complete', {});
        window.extractionComplete = true;
    })();
}

console.log('Background script loaded - Subscription monitoring active');
