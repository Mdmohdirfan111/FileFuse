function performLookup() {
    const catFile = document.getElementById('catalogueFile').files[0];
    const sohFile = document.getElementById('sohFile').files[0];
    
    if (!catFile || !sohFile) {
        showMessage('Please select both files!', 'error');
        return;
    }

    showMessage('Performing lookup...', 'processing');

    Promise.all([processExcelCSV(catFile), processExcelCSV(sohFile)])
        .then(([catalogueData, sohData]) => {
            const results = [];
            for (let sohRow of sohData) {
                const description = (sohRow.Description || sohRow.description || '').trim();
                const matches = catalogueData.filter(catRow => {
                    const catDesc = (catRow.Description || catRow.description || '').toLowerCase();
                    return description.toLowerCase().includes(catDesc);
                });
                
                if (matches.length > 0) {
                    matches.forEach(match => {
                        results.push({
                            ...match,
                            ...sohRow,
                            'Match_Status': 'MATCHED',
                            'SOH_Store_Name': sohRow['SOH store name'] || sohRow.Store_Name
                        });
                    });
                } else {
                    results.push({
                        ...sohRow,
                        'Match_Status': 'NO_MATCH',
                        'SOH_Store_Name': sohRow['SOH store name'] || sohRow.Store_Name
                    });
                }
            }
            
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(results);
            XLSX.utils.book_append_sheet(wb, ws, 'XLookup Result');
            XLSX.writeFile(wb, 'xlookup_result.xlsx');
            showMessage('Lookup completed!', 'success');
        })
        .catch(err => showMessage('Error: ' + err.message, 'error'));
}

async function processExcelCSV(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => {
            try {
                const workbook = file.name.endsWith('.csv') 
                    ? XLSX.read(e.target.result, { type: 'string' })
                    : XLSX.read(e.target.result, { type: 'array' });
                const data = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
                resolve(data);
            } catch (err) { reject(err); }
        };
        reader.onerror = () => reject(new Error('File read error'));
        file.name.endsWith('.csv') ? reader.readAsText(file) : reader.readAsArrayBuffer(file);
    });
}

window.performLookup = performLookup;