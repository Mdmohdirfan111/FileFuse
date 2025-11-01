// ==== GLOBAL UTILITIES ====
function showMessage(msg, type) {
    const el = document.getElementById('message');
    el.textContent = msg;
    el.className = 'message-box show ' + type;
    setTimeout(() => el.className = 'message-box', 4000);
}

// ==== STORES LIST FOR ER GENERATOR ====
const STORES = [
    "HEALTH & GLOW - BANJARA HILLS, HYD",
    "KATHIAVAR - JUBILEE HILLS, HYD",
    "HEALTH & GLOW - TOWLICHOWKI, HYD",
    "HEALTH & GLOW - NIZAMPET, HYD",
    "SREEJA COSMETICS - AMEERPET, HYD",
    "SHOPPERS STOP - GVK ROAD, HYD",
    "KATHIAWAR - GACHIBOWLI, HYD",
    "SHOPPERS STOP - INORBIT MALL, HYD",
    "HEALTH & GLOW - GSM MALL, HYD",
    "HEALTH & GLOW - GVK MALL, HYD",
    "LIFESTYLE - CYBERABAD, HYD",
    "BEAUTY & BEYOND - GSM MALL, HYD",
    "NYKAA ON TREND - BANJARA HILLS, HYD",
    "GOWTHAM ENTERPRISES - YOUSUFGUDA, HYD",
    "HEALTH & GLOW - INORBIT MALL, HYD",
    "HEALTH & GLOW - SUJANA FORUM MALL, HYD"
];

// ==== 1. FILE CONCATENATOR ====
async function concatenateFiles() {
    const files = document.getElementById('concatFiles').files;
    if (files.length === 0) {
        showMessage('Please select at least one file!', 'error');
        return;
    }

    showMessage('Processing files...', 'processing');
    
    try {
        const allData = [];
        
        for (let file of files) {
            if (file.name.endsWith('.pdf')) {
                // PDF processing - extract text and file name
                const pdfData = await processPDF(file);
                allData.push(pdfData);
            } else {
                // Excel/CSV processing
                const excelData = await processExcelCSV(file);
                allData.push(...excelData);
            }
        }
        
        // Create output workbook
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(allData);
        XLSX.utils.book_append_sheet(wb, ws, 'Concatenated Data');
        XLSX.writeFile(wb, 'concatenated_output.xlsx');
        
        showMessage('Files concatenated successfully!', 'success');
    } catch (error) {
        showMessage('Error: ' + error.message, 'error');
    }
}

async function processPDF(file) {
    // For PDF files, we'll just extract file name and create a row
    return {
        'Store': file.name.replace(/\.[^/.]+$/, ""), // Remove extension
        'Content_Type': 'PDF',
        'File_Name': file.name,
        'Processed_At': new Date().toLocaleString()
    };
}

async function processExcelCSV(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                let workbook, data;
                
                if (file.name.endsWith('.csv')) {
                    const csvText = e.target.result;
                    workbook = XLSX.read(csvText, { type: 'string' });
                } else {
                    const arrayBuffer = e.target.result;
                    workbook = XLSX.read(arrayBuffer, { type: 'array' });
                }
                
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                data = XLSX.utils.sheet_to_json(worksheet);
                
                // Add Store column with file name
                const processedData = data.map(row => ({
                    ...row,
                    'Store': file.name.replace(/\.[^/.]+$/, "")
                }));
                
                resolve(processedData);
            } catch (error) {
                reject(error);
            }
        };
        
        reader.onerror = () => reject(new Error('Error reading file'));
        
        if (file.name.endsWith('.csv')) {
            reader.readAsText(file);
        } else {
            reader.readAsArrayBuffer(file);
        }
    });
}

// ==== 2. MONTHLY PJP GENERATOR ====
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
    
    // Header
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
        
        if (date.getDay() === 0) { // Sunday off
            pjp.push([dateStr, dayName, 'Week Off']);
            continue;
        }
        
        const route = routes[routeIndex % routes.length];
        pjp.push([dateStr, dayName, route.plan + ' - ' + route.stores.join(', ')]);
        routeIndex++;
    }
    
    return pjp;
}

// ==== 3. FLOATER INCENTIVE TRACKER ====
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
    
    // Header
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
        
        if (date.getDay() === 0) { // Sunday off
            schedule.push([dateStr, dayName, 'Week Off', 'Week Off']);
            usedCounters = []; // Reset for next week
            continue;
        }
        
        const counterStore = getRandomCounterStore(counterStores, usedCounters);
        schedule.push([dateStr, dayName, counterStore.counterCode, counterStore.storeName]);
        usedCounters.push(counterStore.counterCode);
    }
    
    return schedule;
}

function getRandomCounterStore(counterStores, usedCounters) {
    const available = counterStores.filter(store => !usedCounters.includes(store.counterCode));
    if (available.length > 0) {
        return available[Math.floor(Math.random() * available.length)];
    }
    return { counterCode: 'NO_COUNTER', storeName: 'NO STORE AVAILABLE' };
}

// ==== 4. CATALOGUE XLOOKUP ====
function performLookup() {
    const catalogueFile = document.getElementById('catalogueFile').files[0];
    const sohFile = document.getElementById('sohFile').files[0];
    
    if (!catalogueFile || !sohFile) {
        showMessage('Please select both catalogue and SOH files!', 'error');
        return;
    }

    showMessage('Performing lookup...', 'processing');
    
    Promise.all([
        processExcelCSV(catalogueFile),
        processExcelCSV(sohFile)
    ]).then(([catalogueData, sohData]) => {
        const matchedData = performCatalogueLookup(catalogueData, sohData);
        
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(matchedData);
        XLSX.utils.book_append_sheet(wb, ws, 'Lookup Results');
        XLSX.writeFile(wb, 'catalogue_lookup_results.xlsx');
        
        showMessage('Lookup completed successfully!', 'success');
    }).catch(error => {
        showMessage('Error: ' + error.message, 'error');
    });
}

function performCatalogueLookup(catalogueData, sohData) {
    const results = [];
    
    for (let sohRow of sohData) {
        const description = sohRow.Description || sohRow.description;
        if (!description) continue;
        
        // Find matching catalogue entries
        const matches = catalogueData.filter(catRow => 
            (catRow.Description || catRow.description || '').toLowerCase().includes(description.toLowerCase()) ||
            description.toLowerCase().includes((catRow.Description || catRow.description || '').toLowerCase())
        );
        
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
    
    return results;
}

// ==== 5. ER GENERATOR ====
function generateER() {
    const monthInput = document.getElementById('erMonth').value;
    const mobileDate = document.getElementById('mobileDate').value;
    const mobileAmount = parseFloat(document.getElementById('mobileAmount').value) || 0;
    const courierDate = document.getElementById('courierDate').value;
    const courierAmount = parseFloat(document.getElementById('courierAmount').value) || 0;

    if (!monthInput) {
        showMessage('Please select ER Month!', 'error');
        return;
    }
    if (mobileAmount > 1500) {
        showMessage('Mobile expense cannot exceed ₹1500!', 'error');
        return;
    }

    // Collect leaves/holidays
    const leaveRows = document.getElementsByClassName('leave-row');
    const leaves = {};
    for (let row of leaveRows) {
        const dateInput = row.querySelector('.leave-date').value;
        const type = row.querySelector('.leave-type').value;
        if (dateInput) {
            const day = new Date(dateInput).getDate();
            leaves[day] = type;
        }
    }

    showMessage('Generating ER PDF...', 'processing');

    const [year, month] = monthInput.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const claimPeriod = `01-${String(month).padStart(2, '0')}-${year} to ${daysInMonth}-${String(month).padStart(2, '0')}-${year}`;
    let workingDays = 0;

    const rows = [];
    let lastStore = null;

    let sumDaily = 0, sumTravel = 0, sumLocal = 0, sumMeals = 0, sumHotel = 0, sumMobile = 0, sumCourier = 0, sumOther = 0;

    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month - 1, day);
        const dayOfWeek = date.getDay();
        const dateStr = `${String(day).padStart(2, '0')}-${String(month).padStart(2, '0')}-${year}`;
        const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek];

        let allowance = 0;
        let store = '';
        let remark = '';
        let mobileOnDay = 0;
        let courierOnDay = 0;

        if (dayOfWeek === 0) {
            remark = '';
        } else if (leaves[day]) {
            remark = '';
        } else {
            allowance = 300;
            workingDays++;
            do {
                store = STORES[Math.floor(Math.random() * STORES.length)];
            } while (store === lastStore);
            lastStore = store;
            remark = '';
        }

        if (mobileDate) {
            const mDay = new Date(mobileDate).getDate();
            if (mDay === day) mobileOnDay = mobileAmount;
        }

        if (courierDate) {
            const cDay = new Date(courierDate).getDate();
            if (cDay === day) courierOnDay = courierAmount;
        }

        rows.push([
            { text: dateStr, fontSize: 8 }, 
            { text: dayName, fontSize: 8 }, 
            { text: store, fontSize: 8 }, 
            { text: '', fontSize: 8 }, 
            { text: allowance.toString(), fontSize: 8 }, 
            { text: '0', fontSize: 8 }, 
            { text: '0', fontSize: 8 }, 
            { text: '0', fontSize: 8 }, 
            { text: '0', fontSize: 8 }, 
            { text: mobileOnDay.toString(), fontSize: 8 }, 
            { text: courierOnDay.toString(), fontSize: 8 }, 
            { text: remark, fontSize: 8 }
        ]);

        sumDaily += allowance;
        sumMobile += mobileOnDay;
        sumCourier += courierOnDay;
    }

    const totalClaim = sumDaily + sumMobile + sumCourier;

    rows.push([
        { text: 'Total', bold: true, fontSize: 8 }, 
        { text: '', fontSize: 8 }, 
        { text: '', fontSize: 8 }, 
        { text: '', fontSize: 8 }, 
        { text: sumDaily.toString(), bold: true, fontSize: 8 }, 
        { text: '0', bold: true, fontSize: 8 }, 
        { text: '0', bold: true, fontSize: 8 }, 
        { text: '0', bold: true, fontSize: 8 }, 
        { text: '0', bold: true, fontSize: 8 }, 
        { text: sumMobile.toString(), bold: true, fontSize: 8 }, 
        { text: sumCourier.toString(), bold: true, fontSize: 8 }, 
        { text: '0', bold: true, fontSize: 8 }
    ]);

    // PDF Definition
    const docDefinition = {
        pageSize: 'A4',
        pageOrientation: 'landscape',
        pageMargins: [10, 50, 10, 40],
        header: {
            margin: [10, 10, 10, 0],
            columns: [
                { text: 'Teamlase - Travel Expenses Statement', style: 'header' },
                { text: '315 Work Avenue Campus, Ascent Building 77, Jyoti Nivas College Rd, Koramangala Industrial Layout, Koramangala, Bengaluru, Karnataka 560095', style: 'subheader', alignment: 'center' }
            ]
        },
        content: [
            { text: '\n' },
            {
                table: {
                    widths: [40, 60, 60, 40, 40, 40, 40, 40, 50, 50, 40, 50],
                    body: [
                        [{ text: 'Employee ID:', bold: true, fontSize: 8 }, { text: '874786', fontSize: 8 }, { text: 'Designation', bold: true, fontSize: 8 }, { text: 'SUPERVISOR', fontSize: 8 }, { text: 'Claim Period', bold: true, fontSize: 8 }, { text: claimPeriod, fontSize: 8 } ],
                        [{ text: 'Employee Name', bold: true, fontSize: 8 }, { text: 'SHABANA BEGUM', fontSize: 8 }, { text: 'HQ Town', bold: true, fontSize: 8 }, { text: 'HYDERABAD', fontSize: 8 }, { text: 'Working days', bold: true, fontSize: 8 }, { text: workingDays.toString(), fontSize: 8 }],
                        [{ text: 'Total Claim Amount', bold: true, fontSize: 8, colSpan: 6 }, {}, {}, {}, {}, { text: totalClaim.toString(), bold: true, fontSize: 8, colSpan: 6 }, {}, {}, {}, {}, {}, {}],
                        [{ text: 'Date', bold: true, fontSize: 8 }, { text: 'Day', bold: true, fontSize: 8 }, { text: 'Market worked', bold: true, fontSize: 8 }, { text: 'Claim Type', bold: true, fontSize: 8 }, { text: 'Daily Allowance', bold: true, fontSize: 8 }, { text: 'Travel Fare', bold: true, fontSize: 8 }, { text: 'Local Travel Fare', bold: true, fontSize: 8 }, { text: 'Meals (400/day)', bold: true, fontSize: 8 }, { text: 'Hotel (1500+tax/Day)', bold: true, fontSize: 8 }, { text: 'Mobile Exps. (Rs.1500)', bold: true, fontSize: 8 }, { text: 'Courier', bold: true, fontSize: 8 }, { text: 'Activity/Others', bold: true, fontSize: 8 }],
                        ...rows
                    ]
                },
                layout: 'lightHorizontalLines'
            },
            { text: '\nI Certify that these expenses are correctly stated and were incurred as Necessary business expenses in the service of the company only.', style: 'certify', fontSize: 8 }
        ],
        styles: {
            header: { fontSize: 12, bold: true, alignment: 'center', color: '#1e3a8a' },
            subheader: { fontSize: 7, italics: true },
            certify: { fontSize: 8, alignment: 'left', margin: [10, 10] }
        }
    };

    pdfMake.createPdf(docDefinition).download(`ER_${monthInput}_SHABANA.pdf`);
    showMessage('ER PDF generated successfully!', 'success');
}


