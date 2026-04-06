function exportToExcel(data) {
    const ws = XLSX.utils.json_to_sheet(data);

    // ✅ Format Date column
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let R = 1; R <= range.e.r; R++) {
        const cell = XLSX.utils.encode_cell({ r: R, c: 2 });
        if (ws[cell]) {
            ws[cell].z = "dd/mm/yyyy hh:mm:ss AM/PM";
        }
    }

    // ✅ Filters
    ws['!autofilter'] = { ref: ws['!ref'] };

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Transactions");

    XLSX.writeFile(wb, "transactions.xlsx");

    // 🔥 Live sync
    chrome.storage.local.set({ transactions_live: data });
}

// 🔥 Replace with real extractor later
document.getElementById("exportBtn").onclick = () => {
    const data = [
        {
            Card: "123",
            Amount: 100,
            "Transaction Date": new Date(),
            Station: "Cairo Station"
        }
    ];

    exportToExcel(data);
};

// 🚀 Open dashboard
document.getElementById("openDashboard").onclick = () => {
    chrome.tabs.create({
        url: chrome.runtime.getURL("dashboard/index.html")
    });
};