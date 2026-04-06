// ===== DATE UTILITIES (AUTO PATCH) =====
function formatDateTime(input){
 if(!input) return '';
 const m=input.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\s*(\d{1,2}):?(\d{1,2})?:?(\d{1,2})?\s*(AM|PM)?/i);
 if(!m) return input;
 let [_,d,mo,y,h='0',mi='0',s='0',ap]=m;
 d=d.padStart(2,'0'); mo=mo.padStart(2,'0'); y=y.length===2?'20'+y:y;
 h=parseInt(h);
 if(ap){
  if(ap.toUpperCase()==='PM' && h!==12) h+=12;
  if(ap.toUpperCase()==='AM' && h===12) h=0;
 }
 const dh=(h%12)||12;
 const ap2=h>=12?'PM':'AM';
 return `${d}/${mo}/${y} ${String(dh).padStart(2,'0')}:${String(mi).padStart(2,'0')}:${String(s).padStart(2,'0')} ${ap2}`;
}

function toExcelDateTime(input){
 if(!input) return '';
 const m=input.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\s*(\d{1,2}):(\d{1,2}):?(\d{1,2})?\s*(AM|PM)?/i);
 if(!m) return '';
 let [_,d,mo,y,h,mi,s='00',ap]=m;
 d=d.padStart(2,'0'); mo=mo.padStart(2,'0'); y=y.length===2?'20'+y:y;
 h=parseInt(h);
 if(ap){
  if(ap.toUpperCase()==='PM' && h!==12) h+=12;
  if(ap.toUpperCase()==='AM' && h===12) h=0;
 }
 return `${y}-${mo}-${d}T${String(h).padStart(2,'0')}:${String(mi).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}
// ===== END PATCH =====

// Global state
let isRunning = false;
let shouldStop = false;
let subscriptionData = null;
let selectedPlan = 'annual';

// DOM elements
const fromDateInput = document.getElementById('fromDate');
const toDateInput = document.getElementById('toDate');
const extractBalanceCheckbox = document.getElementById('extractBalance');
const extractPendingCheckbox = document.getElementById('extractPending');
const extractPostedCheckbox = document.getElementById('extractPosted');
const extractBtn = document.getElementById('extractBtn');
const stopBtn = document.getElementById('stopBtn');
const statusDiv = document.getElementById('status');
const progressBar = document.getElementById('progressBar');
const progressFill = document.getElementById('progressFill');
const statsDiv = document.getElementById('stats');
const statCards = document.getElementById('statCards');
const statPending = document.getElementById('statPending');
const statPosted = document.getElementById('statPosted');

// Tab elements
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');

// Subscription elements
const statusBanner = document.getElementById('statusBanner');
const statusText = document.getElementById('statusText');
const extractLocked = document.getElementById('extractLocked');
const subscriptionActive = document.getElementById('subscriptionActive');
const subscriptionPurchase = document.getElementById('subscriptionPurchase');
const currentPlan = document.getElementById('currentPlan');
const subscriptionStatus = document.getElementById('subscriptionStatus');
const expiryDate = document.getElementById('expiryDate');
const licenseKeyDisplay = document.getElementById('licenseKeyDisplay');
const daysRemaining = document.getElementById('daysRemaining');
const trialDaysRemaining = document.getElementById('trialDaysRemaining');
const trialInfo = document.getElementById('trialInfo');
const subscribeBtn = document.getElementById('subscribeBtn');
const cancelBtn = document.getElementById('cancelBtn');
const pricingCards = document.querySelectorAll('.pricing-card');

// Account elements
const installDate = document.getElementById('installDate');
const totalCards = document.getElementById('totalCards');
const totalTransactions = document.getElementById('totalTransactions');
const lastExtraction = document.getElementById('lastExtraction');
const paymentHistory = document.getElementById('paymentHistory');
const licenseKeyBox = document.getElementById('licenseKeyBox');
const restoreBtn = document.getElementById('restoreBtn');

// Utility functions
function log(message, type = 'info') {
    const line = document.createElement('div');
    line.className = `status-line status-${type}`;
    line.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    statusDiv.appendChild(line);
    statusDiv.scrollTop = statusDiv.scrollHeight;
}

function clearLog() {
    statusDiv.innerHTML = '';
}

function updateProgress(current, total) {
    const percentage = (current / total) * 100;
    progressFill.style.width = percentage + '%';
}

function updateStats(cards, pending, posted) {
    statCards.textContent = cards;
    statPending.textContent = pending;
    statPosted.textContent = posted;
}

function validateDate(dateStr) {
    const regex = /^\d{2}\/\d{2}\/\d{4}$/;
    if (!regex.test(dateStr)) return false;

    const [day, month, year] = dateStr.split('/').map(Number);
    const date = new Date(year, month - 1, day);

    return date.getDate() === day && 
           date.getMonth() === month - 1 && 
           date.getFullYear() === year;
}

// Tab switching
function switchTab(tabName) {
    tabs.forEach(tab => {
        if (tab.dataset.tab === tabName) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });

    tabContents.forEach(content => {
        if (content.id === tabName) {
            content.classList.add('active');
        } else {
            content.classList.remove('active');
        }
    });
}

tabs.forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
});

// Subscription Management
async function loadSubscriptionData() {
    try {
        const response = await chrome.runtime.sendMessage({ type: 'getSubscriptionStatus' });
        subscriptionData = response;

        updateSubscriptionUI();
    } catch (error) {
        console.error('Failed to load subscription data:', error);
    }
}

function updateSubscriptionUI() {
    if (!subscriptionData) return;

    const { subscriptionStatus: status, subscriptionType, subscriptionEndDate, 
            trialEndDate, gracePeriodEnd, config, isActive, installDate: install,
            paymentHistory: history, licenseKey } = subscriptionData;

    // Update status banner
    statusBanner.className = 'status-banner';

    if (status === 'trial') {
        const daysLeft = Math.ceil((new Date(trialEndDate) - new Date()) / (1000 * 60 * 60 * 24));
        statusBanner.classList.add('status-trial');
        statusText.textContent = `⏳ Trial Period - ${daysLeft} days remaining`;
        trialDaysRemaining.textContent = daysLeft;
        trialInfo.classList.remove('hidden');
    } else if (status === 'active') {
        const daysLeft = Math.ceil((new Date(subscriptionEndDate) - new Date()) / (1000 * 60 * 60 * 24));
        statusBanner.classList.add('status-active');
        statusText.textContent = `✅ Active Subscription - ${daysLeft} days remaining`;
        trialInfo.classList.add('hidden');
    } else if (status === 'grace_period') {
        const daysLeft = Math.ceil((new Date(gracePeriodEnd) - new Date()) / (1000 * 60 * 60 * 24));
        statusBanner.classList.add('status-grace');
        statusText.textContent = `⚠️ Grace Period - ${daysLeft} days left to renew`;
        trialInfo.classList.add('hidden');
    } else {
        statusBanner.classList.add('status-expired');
        statusText.textContent = '❌ Subscription Expired - Purchase required';
        trialInfo.classList.add('hidden');
    }

    // Show/hide locked overlay
    if (isActive) {
        extractLocked.classList.add('hidden');
        subscriptionActive.classList.remove('hidden');
        subscriptionPurchase.classList.add('hidden');

        // Update active subscription info
        currentPlan.textContent = subscriptionType === 'annual' ? 'Annual ($10/year)' : 'Monthly ($1/month)';
        subscriptionStatus.textContent = status === 'active' ? 'Active' : 'Grace Period';
        expiryDate.textContent = new Date(subscriptionEndDate).toLocaleDateString();
        licenseKeyDisplay.textContent = licenseKey || 'N/A';
        daysRemaining.textContent = Math.ceil((new Date(subscriptionEndDate) - new Date()) / (1000 * 60 * 60 * 24));
    } else {
        extractLocked.classList.remove('hidden');
        subscriptionActive.classList.add('hidden');
        subscriptionPurchase.classList.remove('hidden');
    }

    // Update account tab
    if (install) {
        installDate.textContent = new Date(install).toLocaleDateString();
    }

    // Update payment history
    if (history && history.length > 0) {
        paymentHistory.innerHTML = history.map(payment => `
            <div class="payment-item">
                <div class="payment-date">${new Date(payment.date).toLocaleDateString()}</div>
                <div class="payment-details">
                    <span>${payment.plan === 'annual' ? 'Annual Plan' : 'Monthly Plan'}</span>
                    <span>$${payment.amount} ${payment.currency}</span>
                </div>
                <div style="font-size: 10px; opacity: 0.7; margin-top: 3px;">
                    TXN: ${payment.transactionId}
                </div>
            </div>
        `).join('');

        // Update license key box
        if (licenseKey) {
            licenseKeyBox.textContent = licenseKey;
            licenseKeyBox.onclick = () => {
                navigator.clipboard.writeText(licenseKey);
                licenseKeyBox.textContent = '✅ Copied!';
                setTimeout(() => {
                    licenseKeyBox.textContent = licenseKey;
                }, 2000);
            };
        }
    }
}

// Plan selection
pricingCards.forEach(card => {
    card.addEventListener('click', () => {
        pricingCards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        selectedPlan = card.dataset.plan;
    });
});

// Subscribe button
subscribeBtn.addEventListener('click', async () => {
    subscribeBtn.disabled = true;
    subscribeBtn.textContent = '⏳ Processing...';

    try {
        // In production, this would open Stripe/PayPal checkout
        // For demo, we simulate the payment
        const result = await chrome.runtime.sendMessage({
            type: 'processPayment',
            planType: selectedPlan
        });

        if (result.success) {
            alert(`✅ Payment successful!\n\nLicense Key: ${result.licenseKey}\n\nPlease save this key for your records.`);
            await loadSubscriptionData();
            switchTab('extract');
        } else {
            alert('❌ Payment failed. Please try again.');
        }
    } catch (error) {
        alert('❌ Error processing payment: ' + error.message);
    }

    subscribeBtn.disabled = false;
    subscribeBtn.textContent = '🔒 Subscribe Now';
});

// Cancel subscription
cancelBtn.addEventListener('click', async () => {
    if (!confirm('Are you sure you want to cancel your subscription? You will still have access until the end of your billing period.')) {
        return;
    }

    try {
        const result = await chrome.runtime.sendMessage({ type: 'cancelSubscription' });
        alert(result.message);
        await loadSubscriptionData();
    } catch (error) {
        alert('❌ Error cancelling subscription: ' + error.message);
    }
});

// Restore purchase
restoreBtn.addEventListener('click', async () => {
    const licenseKey = prompt('Please enter your license key:');
    if (!licenseKey) return;

    try {
        const result = await chrome.runtime.sendMessage({
            type: 'validateLicense',
            licenseKey: licenseKey
        });

        if (result.valid) {
            alert('✅ License validated successfully!');
            await loadSubscriptionData();
        } else {
            alert('❌ ' + result.message);
        }
    } catch (error) {
        alert('❌ Error validating license: ' + error.message);
    }
});

// Main extraction function
async function startExtraction() {
    // Check subscription
    if (!subscriptionData || !subscriptionData.isActive) {
        alert('🔒 Subscription required. Please purchase a plan to continue.');
        switchTab('subscription');
        return;
    }

    const fromDate = fromDateInput.value;
    const toDate = toDateInput.value;

    // Validation
    if (!validateDate(fromDate)) {
        log('Invalid From Date format. Use DD/MM/YYYY', 'error');
        return;
    }
    if (!validateDate(toDate)) {
        log('Invalid To Date format. Use DD/MM/YYYY', 'error');
        return;
    }

    const extractBalance = extractBalanceCheckbox.checked;
    const extractPending = extractPendingCheckbox.checked;
    const extractPosted = extractPostedCheckbox.checked;

    if (!extractBalance && !extractPending && !extractPosted) {
        log('Please select at least one data type to extract', 'error');
        return;
    }

    // Update UI
    isRunning = true;
    shouldStop = false;
    extractBtn.disabled = true;
    extractBtn.textContent = '⏳ Extracting...';
    stopBtn.style.display = 'block';
    progressBar.style.display = 'block';
    statsDiv.style.display = 'grid';
    clearLog();

    log(`Starting extraction: ${fromDate} to ${toDate}`, 'info');
    log(`Selected: ${extractBalance ? 'Balance ' : ''}${extractPending ? 'Pending ' : ''}${extractPosted ? 'Posted' : ''}`, 'info');

    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        if (!tab.url.includes('fuelportal.qnbalahli.com')) {
            log('Please navigate to QNB Fuel Card portal first', 'error');
            resetUI();
            return;
        }

        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: extractData,
            args: [fromDate, toDate, extractBalance, extractPending, extractPosted]
        });

        // Update last extraction date
        await chrome.storage.local.set({ lastExtractionDate: new Date().toISOString() });

    } catch (error) {
        log(`Error: ${error.message}`, 'error');
        resetUI();
    }
}

function stopExtraction() {
    shouldStop = true;
    log('Stopping extraction...', 'warning');
    stopBtn.disabled = true;
}

function resetUI() {
    isRunning = false;
    extractBtn.disabled = false;
    extractBtn.textContent = '🚀 Start Extraction';
    stopBtn.style.display = 'none';
    stopBtn.disabled = false;
    progressBar.style.display = 'none';
    progressFill.style.width = '0%';
}

// Event listeners
extractBtn.addEventListener('click', startExtraction);
stopBtn.addEventListener('click', stopExtraction);

// Auto-format date inputs
[fromDateInput, toDateInput].forEach(input => {
    input.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length >= 2) value = value.slice(0, 2) + '/' + value.slice(2);
        if (value.length >= 5) value = value.slice(0, 5) + '/' + value.slice(5, 9);
        e.target.value = value;
    });
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'log') {
        log(request.message, request.logType);
    } else if (request.type === 'progress') {
        updateProgress(request.current, request.total);
    } else if (request.type === 'stats') {
        updateStats(request.cards, request.pending, request.posted);
    } else if (request.type === 'complete') {
        log('Extraction completed successfully!', 'success');
        resetUI();
        loadSubscriptionData(); // Refresh stats
    } else if (request.type === 'error') {
        log(request.message, 'error');
        resetUI();
    } else if (request.type === 'stopped') {
        log('Extraction stopped by user', 'warning');
        resetUI();
    }
    sendResponse({ received: true });
    return true;
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadSubscriptionData();
});

// The main extraction function that runs in the page context
function extractData(fromDate, toDate, extractBalance, extractPending, extractPosted) {
    return new Promise((resolve, reject) => {
        (async function() {
            function formatDateTime(input){
                if(!input) return '';
                const m = input.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\s*(\d{1,2}):?(\d{1,2})?:?(\d{1,2})?\s*(AM|PM)?/i);
                if(!m) return input;
                let [_, d, mo, y, h='0', mi='0', s='0', ap] = m;
                d = d.padStart(2,'0');
                mo = mo.padStart(2,'0');
                y = y.length === 2 ? '20' + y : y;
                h = parseInt(h, 10);
                if (ap) {
                    if (ap.toUpperCase() === 'PM' && h !== 12) h += 12;
                    if (ap.toUpperCase() === 'AM' && h === 12) h = 0;
                }
                const dh = (h % 12) || 12;
                const ap2 = h >= 12 ? 'PM' : 'AM';
                return `${d}/${mo}/${y} ${String(dh).padStart(2,'0')}:${String(mi).padStart(2,'0')}:${String(s).padStart(2,'0')} ${ap2}`;
            }

            const DELAY = 3000;
            const allPostedData = [];
            const allPendingData = [];
            const allBalanceData = [];
            const sleep = ms => new Promise(r => setTimeout(r, ms));

            function sendMessage(type, data) {
                chrome.runtime.sendMessage({ type, ...data });
            }

            const closeModal = async () => {
                const closeBtn = document.querySelector('#myModal .close, .modal-header .close, [data-dismiss="modal"]');
                if (closeBtn) {
                    closeBtn.click();
                    await sleep(1000);
                } else {
                    document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape'}));
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
                    } catch (e) {
                        console.log('Reset failed:', e.message);
                    }
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
                    const onlineBalanceBtn = document.querySelector(`button[onclick*=\"RefreshCard(${cardRef}\"]`);
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
                    return `${year}${month.padStart(2,'0')}${day.padStart(2,'0')}`;
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

            sendMessage('log', { message: `Starting extraction for ${fromDate} to ${toDate}`, logType: 'info' });

            const cards = document.querySelectorAll('a.card-details');
            sendMessage('log', { message: `Found ${cards.length} cards`, logType: 'info' });
            sendMessage('stats', { cards: cards.length, pending: 0, posted: 0 });

            for (let i = 0; i < cards.length; i++) {
                if (window.shouldStop) {
                    sendMessage('log', { message: 'Extraction stopped by user', logType: 'warning' });
                    sendMessage('stopped', {});
                    resolve();
                    return;
                }

                try {
                    const freshCards = document.querySelectorAll('a.card-details');
                    if (i >= freshCards.length) break;

                    const card = freshCards[i];
                    const row = card.closest('tr');
                    const cells = row.querySelectorAll('td');

                    const cardNum = cells[0]?.innerText?.trim() || `Card_${i+1}`;
                    const cardName = cells[1]?.innerText?.trim() || '';
                    const tableBalance = cells[2]?.innerText?.trim() || '';

                    const cardHref = card.getAttribute('href');
                    const cardRefMatch = cardHref.match(/cardRef=(\d+)/);
                    const cardRef = cardRefMatch ? cardRefMatch[1] : '';

                    sendMessage('log', { message: `[${i+1}/${cards.length}] Processing ${cardNum}`, logType: 'info' });
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
                                            transaction_date: formatDateTime(cols[1]?.innerText?.trim()),
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
                                            transaction_date: formatDateTime(cols[1]?.innerText?.trim()),
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
                    sendMessage('log', { message: `Error on card ${i+1}: ${error.message}`, logType: 'error' });
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

                function escapeXml(value) {
                    return (value || '').toString()
                        .replace(/&/g, '&amp;')
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;')
                        .replace(/"/g, '&quot;')
                        .replace(/'/g, '&apos;');
                }

                function columnLetter(index) {
                    let letter = '';
                    while (index >= 0) {
                        letter = String.fromCharCode(65 + (index % 26)) + letter;
                        index = Math.floor(index / 26) - 1;
                    }
                    return letter;
                }

                function buildSheetXml(headers, rows) {
                    const allRows = [headers, ...rows];
                    const rowXml = allRows.map((row, rowIndex) => {
                        const rowNumber = rowIndex + 1;
                        const cellXml = row.map((cell, colIndex) => {
                            const ref = `${columnLetter(colIndex)}${rowNumber}`;
                            return `<c r="${ref}" t="str"><v>${escapeXml(cell)}</v></c>`;
                        }).join('');
                        return `<row r="${rowNumber}">${cellXml}</row>`;
                    }).join('');

                    return '<?xml version="1.0" encoding="UTF-8"?>' +
                        '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
                        '<sheetData>' + rowXml + '</sheetData>' +
                        '</worksheet>';
                }

                function buildWorkbookXml(sheetNames) {
                    const sheetsXml = sheetNames.map((name, index) =>
                        `<sheet name="${escapeXml(name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`
                    ).join('');
                    return '<?xml version="1.0" encoding="UTF-8"?>' +
                        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
                        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
                        '<sheets>' + sheetsXml + '</sheets>' +
                        '</workbook>';
                }

                function buildContentTypesXml(sheetCount) {
                    let contentXml = '<?xml version="1.0" encoding="UTF-8"?>' +
                        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
                        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
                        '<Default Extension="xml" ContentType="application/xml"/>' +
                        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
                        '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>';

                    for (let i = 1; i <= sheetCount; i++) {
                        contentXml += `<Override PartName="/xl/worksheets/sheet${i}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`;
                    }

                    contentXml += '</Types>';
                    return contentXml;
                }

                function buildRootRelsXml() {
                    return '<?xml version="1.0" encoding="UTF-8"?>' +
                        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
                        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
                        '</Relationships>';
                }

                function buildWorkbookRelsXml(sheetCount) {
                    const rels = Array.from({ length: sheetCount }, (_, index) =>
                        `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`
                    ).join('');

                    return '<?xml version="1.0" encoding="UTF-8"?>' +
                        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
                        rels +
                        '</Relationships>';
                }

                function buildStylesXml() {
                    return '<?xml version="1.0" encoding="UTF-8"?>' +
                        '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
                        '<fonts count="1"><font><sz val="11"/><color theme="1"/><name val="Calibri"/><family val="2"/><scheme val="minor"/></font></fonts>' +
                        '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>' +
                        '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
                        '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellStyleXfs>' +
                        '<cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>' +
                        '</styleSheet>';
                }

                function crc32(buffer) {
                    const table = new Uint32Array(256);
                    for (let i = 0; i < 256; i++) {
                        let c = i;
                        for (let j = 0; j < 8; j++) {
                            c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
                        }
                        table[i] = c;
                    }

                    let crc = 0xffffffff;
                    for (let i = 0; i < buffer.length; i++) {
                        crc = (crc >>> 8) ^ table[(crc ^ buffer[i]) & 0xff];
                    }
                    return (crc ^ 0xffffffff) >>> 0;
                }

                function createZip(entries) {
                    const encoder = new TextEncoder();
                    let offset = 0;
                    const files = [];
                    const centralDirectory = [];

                    entries.forEach(entry => {
                        const nameBytes = encoder.encode(entry.name);
                        const dataBytes = entry.data instanceof Uint8Array ? entry.data : encoder.encode(entry.data);
                        const crc = crc32(dataBytes);
                        const localHeader = new Uint8Array(30 + nameBytes.length);
                        const localView = new DataView(localHeader.buffer);
                        localView.setUint32(0, 0x04034b50, true);
                        localView.setUint16(4, 20, true);
                        localView.setUint16(6, 0, true);
                        localView.setUint16(8, 0, true);
                        localView.setUint16(10, 0, true);
                        localView.setUint16(12, 0, true);
                        localView.setUint32(14, crc, true);
                        localView.setUint32(18, dataBytes.length, true);
                        localView.setUint32(22, dataBytes.length, true);
                        localView.setUint16(26, nameBytes.length, true);
                        localView.setUint16(28, 0, true);
                        localHeader.set(nameBytes, 30);

                        const centralHeader = new Uint8Array(46 + nameBytes.length);
                        const centralView = new DataView(centralHeader.buffer);
                        centralView.setUint32(0, 0x02014b50, true);
                        centralView.setUint16(4, 20, true);
                        centralView.setUint16(6, 20, true);
                        centralView.setUint16(8, 0, true);
                        centralView.setUint16(10, 0, true);
                        centralView.setUint16(12, 0, true);
                        centralView.setUint16(14, 0, true);
                        centralView.setUint32(16, crc, true);
                        centralView.setUint32(20, dataBytes.length, true);
                        centralView.setUint32(24, dataBytes.length, true);
                        centralView.setUint16(28, nameBytes.length, true);
                        centralView.setUint16(30, 0, true);
                        centralView.setUint16(32, 0, true);
                        centralView.setUint16(34, 0, true);
                        centralView.setUint16(36, 0, true);
                        centralView.setUint32(38, 0, true);
                        centralView.setUint32(42, offset, true);
                        centralHeader.set(nameBytes, 46);

                        files.push(localHeader, dataBytes);
                        centralDirectory.push(centralHeader);
                        offset += localHeader.length + dataBytes.length;
                    });

                    const centralStart = offset;
                    centralDirectory.forEach(record => {
                        files.push(record);
                        offset += record.length;
                    });

                    const endRecord = new Uint8Array(22);
                    const endView = new DataView(endRecord.buffer);
                    endView.setUint32(0, 0x06054b50, true);
                    endView.setUint16(4, 0, true);
                    endView.setUint16(6, 0, true);
                    endView.setUint16(8, entries.length, true);
                    endView.setUint16(10, entries.length, true);
                    endView.setUint32(12, offset - centralStart, true);
                    endView.setUint32(16, centralStart, true);
                    endView.setUint16(20, 0, true);
                    files.push(endRecord);

                    return new Blob(files, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                }

                const sheets = [];
                const sheetNames = [];

                if (extractPosted && sortedPosted.length > 0) {
                    sheets.push({
                        name: 'Posted Transactions',
                        headers: ['Card Number', 'Card Name', 'Online Balance', 'Transaction Date', 'Transaction Description', 'Amount', 'Type (D/C)'],
                        rows: sortedPosted.map(d => [d.card_number, d.card_name, d.online_balance, d.transaction_date, d.transaction_description, d.transaction_amount, d.transaction_type])
                    });
                    sheetNames.push('Posted Transactions');
                }

                if (extractPending && sortedPending.length > 0) {
                    sheets.push({
                        name: 'Pending Transactions',
                        headers: ['Card Number', 'Card Name', 'Transaction Date', 'Transaction Description', 'Amount', 'Debit/Credit'],
                        rows: sortedPending.map(d => [d.card_number, d.card_name, d.transaction_date, d.transaction_description, d.transaction_amount, d.debit_credit])
                    });
                    sheetNames.push('Pending Transactions');
                }

                if (extractBalance && sortedBalance.length > 0) {
                    sheets.push({
                        name: 'Online Balance',
                        headers: ['Card Number', 'Card Name', 'Online Balance', 'Table Balance', 'Card Ref'],
                        rows: sortedBalance.map(d => [d.card_number, d.card_name, d.online_balance, d.table_balance, d.card_ref])
                    });
                    sheetNames.push('Online Balance');
                }

                const entries = [
                    { name: '[Content_Types].xml', data: buildContentTypesXml(sheets.length) },
                    { name: '_rels/.rels', data: buildRootRelsXml() },
                    { name: 'xl/workbook.xml', data: buildWorkbookXml(sheetNames) },
                    { name: 'xl/_rels/workbook.xml.rels', data: buildWorkbookRelsXml(sheets.length) },
                    { name: 'xl/styles.xml', data: buildStylesXml() }
                ];

                sheets.forEach((sheet, index) => {
                    entries.push({ name: `xl/worksheets/sheet${index + 1}.xml`, data: buildSheetXml(sheet.headers, sheet.rows) });
                });

                const blob = createZip(entries);
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `QNB_Fuel_${fromDate.replace(/\//g,'')}_to_${toDate.replace(/\//g,'')}.xlsx`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                sendMessage('log', { message: `✅ Exported: ${sortedPosted.length} posted, ${sortedPending.length} pending, ${sortedBalance.length} balances`, logType: 'success' });
            } else {
                sendMessage('log', { message: 'No data to export', logType: 'warning' });
            }

            sendMessage('complete', {});
            resolve();
        })();
    });
}
