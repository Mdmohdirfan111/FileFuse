function generatePJP() {
    const file = document.getElementById('storeData').files[0];
    const monthInput = document.getElementById('pjpMonth').value;
    
    if (!file || !monthInput) {
        showMessage('Please select store data file and month!', 'error');
        return;
    }

    showMessage('Generating PJP...', 'processing');
    
    processExcelCSV(file).then(routeData => {
        const [year, month] = monthInput.split('-');
        const pjpData = generatePJPData(routeData, parseInt(year), parseInt(month));
        
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(pjpData);
        XLSX.utils.book_append_sheet(wb, ws, 'Monthly PJP');
        XLSX.writeFile(wb, 'monthly_pjp.xlsx');
        
        showMessage('PJP generated successfully!', 'success');
    }).catch(error => {
        showMessage('Error: ' + error.message, 'error');
    });
}

function generatePJPData(routeData, year, month) {
    const daysInMonth = new Date(year, month, 0).getDate();
    const pjp = [];
    
    pjp.push(['Date', 'Day', 'Route Plan']);
    
    let routeIndex = 0;
    const routes = routeData.map(row => ({
        plan: row.Plan,
        stores: [row['Store 1'], row['Store 2'], row['Store 3'], row['Store 4']].filter(Boolean)
    }));
    
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month - 1, day);
        const dayName = date.toLocaleString('default', { weekday: 'long' });
        const dateStr = `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
        
        if (date.getDay() === 0) {
            pjp.push([dateStr, dayName, 'Week Off']);
            continue;
        }
        
        const route = routes[routeIndex % routes.length];
        pjp.push([dateStr, dayName, route.plan + ' - ' + route.stores.join(', ')]);
        routeIndex++;
    }
    
    return pjp;
}

// Reuse processExcelCSV from file-concatenator.js
// We'll define it again to avoid dependency
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

window.generatePJP = generatePJP;