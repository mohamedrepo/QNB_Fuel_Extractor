function render(data) {
    const totals = {};

    data.forEach(r => {
        totals[r.Card] = (totals[r.Card] || 0) + (r.Amount || 0);
    });

    const ctx = document.getElementById("chart");

    if (window.chart) window.chart.destroy();

    window.chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(totals),
            datasets: [{
                label: 'Fuel Consumption',
                data: Object.values(totals)
            }]
        }
    });
}

// Live updates
chrome.storage.onChanged.addListener((changes) => {
    if (changes.transactions_live) {
        render(changes.transactions_live.newValue);
    }
});

// Initial load
chrome.storage.local.get("transactions_live", res => {
    if (res.transactions_live) {
        render(res.transactions_live);
    }
});