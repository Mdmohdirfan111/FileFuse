function generateFloaterSchedule() {
    const file = document.getElementById('floaterData').files[0];
    const monthInput = document.getElementById('floaterMonth').value;
    
    if (!file || !monthInput) {
        showMessage('Please select floater data file and month!', 'error');
        return;
    }

    showMessage('Generating Schedule...', 'processing');
    
    processExcelCSV(file).then(counterData => {
        const [year, month] = monthInput.split('-');
        const floaterSchedule = generateFloaterData(counterData, parseInt(year), parseInt(month));
        
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(floaterSchedule);
        XLSX.utils.book_append_sheet(wb, ws, 'Floater Schedule');
        XLSX.writeFile(wb, 'floater_schedule.xlsx');
        
        showMessage('Schedule generated successfully!', 'success');
    }).catch(error => {
        showMessage('Error: ' + error.message, 'error');
    });
}

function generateFloaterData(counterData, year, month) {
    const daysInMonth = new Date(year, month, 0).getDate();
    const schedule = [];
    schedule.push(['Date', 'Day', 'Counter Code', 'Store Name']);
    
    const counterStores = counterData.map(row => ({
        counterCode: row.Counter_Code,
        storeName: row.Store_Name
    }));
    
    let usedCounters = [];
    
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month - 1, day);
        const dayName = date.toLocaleString('default', { weekday: 'long' });
        const dateStr = `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
        
        if (date.getDay() === 0) {
            schedule.push([dateStr, dayName, 'Week Off', 'Week Off']);
            usedCounters = [];
            continue;
        }
        
        let assigned = false;
        for (let counter of counterStores) {
            if (!usedCounters.includes(counter.counterCode)) {
                schedule.push([dateStr, dayName, counter.counterCode, counter.storeName]);
                usedCounters.push(counter.counterCode);
                assigned = true;
                break;
            }
        }
        if (!assigned && counterStores.length > 0) {
            const first = counterStores[0];
            schedule.push([dateStr, dayName, first.counterCode, first.storeName]);
        }
    }
    
    return schedule;
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

window.generateFloaterSchedule = generateFloaterSchedule;