// Tool 1: File Concatenator
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

// Tool 2: Monthly PJP Generator
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
        XLSX.writeFile(wb, `PJP_${month}_${year}.xlsx`);
        
        showMessage('PJP generated successfully!', 'success');
    }).catch(error => {
        showMessage('Error: ' + error.message, 'error');
    });
}

function generatePJPData(routeData, year, month) {
    const daysInMonth = new Date(year, month, 0).getDate();
    const pjpData = [];
    const routes = extractRoutes(routeData);
    const usedRoutes = [];
    
    let currentRouteIndex = -1;
    
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month - 1, day);
        const dayOfWeek = date.getDay();
        const dateStr = formatDate(date);
        
        if (dayOfWeek === 0) { // Sunday
            // Create empty row for Sunday with Week Off
            const sundayRow = {
                'Date': dateStr,
                'Day': 'Sunday',
                'Remarks': 'Week Off'
            };
            
            // Add empty store columns
            for (let i = 1; i <= 6; i++) {
                sundayRow[`Store ${i}`] = 'Week Off';
            }
            
            pjpData.push(sundayRow);
            continue;
        }
        
        // Get next route (different from previous day)
        currentRouteIndex = getNextRouteIndex(currentRouteIndex, routes.length, usedRoutes);
        const currentRoute = routes[currentRouteIndex];
        
        // Create row for working day
        const dayRow = {
            'Date': dateStr,
            'Day': getDayName(dayOfWeek),
            'Route': currentRoute.routeName,
            'Remarks': 'Store Visit'
        };
        
        // Add all stores from this route
        currentRoute.stores.forEach((store, index) => {
            dayRow[`Store ${index + 1}`] = store || '';
        });
        
        // Fill remaining store columns if any
        for (let i = currentRoute.stores.length + 1; i <= 6; i++) {
            dayRow[`Store ${i}`] = '';
        }
        
        pjpData.push(dayRow);
        usedRoutes.push(currentRouteIndex);
        
        // Reset used routes if all routes have been used
        if (usedRoutes.length >= routes.length) {
            usedRoutes.length = 0;
        }
    }
    
    return pjpData;
}

function extractRoutes(routeData) {
    const routes = [];
    
    routeData.forEach(row => {
        const routeName = row.Plan || row.Route || `Route-${routes.length + 1}`;
        const stores = [];
        
        // Extract stores from Store 1 to Store 6
        for (let i = 1; i <= 6; i++) {
            const storeKey = `Store ${i}`;
            if (row[storeKey] && row[storeKey] !== '0' && row[storeKey] !== '') {
                stores.push(row[storeKey]);
            }
        }
        
        if (stores.length > 0) {
            routes.push({
                routeName: routeName,
                stores: stores
            });
        }
    });
    
    return routes;
}

function getNextRouteIndex(currentIndex, totalRoutes, usedRoutes) {
    let nextIndex;
    
    // If first day or need to change route
    if (currentIndex === -1) {
        nextIndex = Math.floor(Math.random() * totalRoutes);
    } else {
        // Get random route that's different from current and not recently used
        const availableRoutes = [];
        for (let i = 0; i < totalRoutes; i++) {
            if (i !== currentIndex && !usedRoutes.includes(i)) {
                availableRoutes.push(i);
            }
        }
        
        if (availableRoutes.length > 0) {
            nextIndex = availableRoutes[Math.floor(Math.random() * availableRoutes.length)];
        } else {
            // If no available routes, pick any except current
            do {
                nextIndex = Math.floor(Math.random() * totalRoutes);
            } while (nextIndex === currentIndex);
        }
    }
    
    return nextIndex;
}

function formatDate(date) {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
}

// Tool 3: Floater Incentive Tracker
function generateFloaterSchedule() {
    const file = document.getElementById('floaterData').files[0];
    const monthInput = document.getElementById('floaterMonth').value;
    
    if (!file || !monthInput) {
        showMessage('Please select data file and month!', 'error');
        return;
    }

    showMessage('Generating floater schedules...', 'processing');
    
    processExcelCSV(file).then(counterData => {
        const [year, month] = monthInput.split('-');
        const schedules = generateFloaterSchedules(counterData, parseInt(year), parseInt(month));
        
        const wb = XLSX.utils.book_new();
        
        // Sheet 1: Floater 1
        const ws1 = XLSX.utils.json_to_sheet(schedules.floater1);
        XLSX.utils.book_append_sheet(wb, ws1, 'Floater 1');
        
        // Sheet 2: Floater 2
        const ws2 = XLSX.utils.json_to_sheet(schedules.floater2);
        XLSX.utils.book_append_sheet(wb, ws2, 'Floater 2');
        
        XLSX.writeFile(wb, `Floater_Schedule_${month}_${year}.xlsx`);
        showMessage('Floater schedules generated successfully!', 'success');
    }).catch(error => {
        showMessage('Error: ' + error.message, 'error');
    });
}

function generateFloaterSchedules(counterData, year, month) {
    const daysInMonth = new Date(year, month, 0).getDate();
    const counterStores = extractCounterStores(counterData);
    
    const floater1 = [];
    const floater2 = [];
    const usedCountersPerDay = {};
    
    // Assign random weekoff days (Monday to Friday)
    const floater1Weekoff = Math.floor(Math.random() * 5); // 0-4 for Mon-Fri
    const floater2Weekoff = Math.floor(Math.random() * 5);
    
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month - 1, day);
        const dayOfWeek = date.getDay();
        const dateStr = date.toLocaleDateString();
        
        usedCountersPerDay[dateStr] = usedCountersPerDay[dateStr] || [];
        
        // Floater 1
        if (dayOfWeek === floater1Weekoff) {
            floater1.push({
                'Date': dateStr,
                'Day': getDayName(dayOfWeek),
                'Counter_Code': 'Week Off',
                'Store_Name': 'Week Off',
                'Remarks': 'Weekly Off'
            });
        } else {
            const counterStore1 = getRandomCounterStore(counterStores, usedCountersPerDay[dateStr]);
            usedCountersPerDay[dateStr].push(counterStore1.counterCode);
            floater1.push({
                'Date': dateStr,
                'Day': getDayName(dayOfWeek),
                'Counter_Code': counterStore1.counterCode,
                'Store_Name': counterStore1.storeName,
                'Remarks': 'Store Visit'
            });
        }
        
        // Floater 2
        if (dayOfWeek === floater2Weekoff) {
            floater2.push({
                'Date': dateStr,
                'Day': getDayName(dayOfWeek),
                'Counter_Code': 'Week Off',
                'Store_Name': 'Week Off',
                'Remarks': 'Weekly Off'
            });
        } else {
            const counterStore2 = getRandomCounterStore(counterStores, usedCountersPerDay[dateStr]);
            usedCountersPerDay[dateStr].push(counterStore2.counterCode);
            floater2.push({
                'Date': dateStr,
                'Day': getDayName(dayOfWeek),
                'Counter_Code': counterStore2.counterCode,
                'Store_Name': counterStore2.storeName,
                'Remarks': 'Store Visit'
            });
        }
    }
    
    return { floater1, floater2 };
}

function extractCounterStores(counterData) {
    // Extract counter codes and store names from data
    if (counterData.length > 0) {
        return counterData.map(row => ({
            counterCode: row.Counter_Code || row['Counter Code'] || row.Code || 'CTR' + Math.random().toString(36).substr(2, 3).toUpperCase(),
            storeName: row.Store_Name || row.Store || row['Store Name'] || 'Store ' + Math.random().toString(36).substr(2, 3).toUpperCase()
        }));
    }
    
    // Default fallback data
    return [
        { counterCode: 'CTR001', storeName: 'HEALTH & GLOW - TOWLICHOWKI, HYD' },
        { counterCode: 'CTR002', storeName: 'HEALTH & GLOW - ALKAPURI, HYD' },
        { counterCode: 'CTR003', storeName: 'CENTRO - KUKATPALLY, HYD' },
        { counterCode: 'CTR004', storeName: 'HEALTH & GLOW - SUJANA FORUM MALL, HYD' },
        { counterCode: 'CTR005', storeName: 'LIFESTYLE - HYDERABAD' }
    ];
}

function getRandomCounterStore(counterStores, usedCounters) {
    const available = counterStores.filter(store => !usedCounters.includes(store.counterCode));
    return available.length > 0 
        ? available[Math.floor(Math.random() * available.length)]
        : { counterCode: 'NO_COUNTER', storeName: 'NO STORE AVAILABLE' };
}

// Tool 4: Catalogue XLookup
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

// Utility Functions
function getDayName(dayIndex) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayIndex];
}

function showMessage(message, type) {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = message;
    messageDiv.className = type;
}
// ... [Previous Tools: concatenateFiles, generatePJP, etc. - unchanged]

// ==== STORES LIST ====
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

// ==== ER GENERATOR ====
function generateER() {
    const monthInput = document.getElementById('erMonth').value;
    const mobileExp = parseInt(document.getElementById('mobileExp').value) || 0;
    const courierExp = parseInt(document.getElementById('courierExp').value) || 0;

    if (!monthInput) {
        showMessage('Please select a month!', 'error');
        return;
    }
    if (mobileExp > 1500) {
        showMessage('Mobile expense cannot exceed ₹1500!', 'error');
        return;
    }

    showMessage('Generating ER PDF...', 'processing');

    const [year, month] = monthInput.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const claimPeriod = `01-${String(month).padStart(2, '0')}-${year} to ${daysInMonth}-${String(month).padStart(2, '0')}-${year}`;
    const workingDays = Array.from({length: daysInMonth}, (_, i) => i + 1)
        .filter(d => new Date(year, month - 1, d).getDay() !== 0).length;

    let totalClaim = workingDays * 300; // Daily Allowance
    let mobileExp = 0, courierExp = 0;

    // Prompt for Mobile & Courier
    const mobileInput = prompt(`Enter Mobile Expense (max ₹1500) for any date in ${monthInput}:`, "0");
    const courierInput = prompt(`Enter Courier Expense for any date in ${monthInput}:`, "0");

    if (mobileInput && !isNaN(mobileInput)) mobileExp = Math.min(parseInt(mobileInput), 1500);
    if (courierInput && !isNaN(courierInput)) courierExp = parseInt(courierInput);

    totalClaim += mobileExp + courierExp;

    // Generate rows
    const rows = [];
    let lastStore = null;

    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month - 1, day);
        const dayOfWeek = date.getDay();
        const dateStr = `${String(day).padStart(2, '0')}-${String(month).padStart(2, '0')}-${year}`;
        const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek];

        if (dayOfWeek === 0) {
            rows.push([dateStr, dayName, 'Week Off', '', 0, 0, 0, 0, 0, 0, 0, 'Week Off']);
            continue;
        }

        // Random store (not same as previous)
        let store;
        do {
            store = STORES[Math.floor(Math.random() * STORES.length)];
        } while (store === lastStore);
        lastStore = store;

        rows.push([dateStr, dayName, store, '', 300, 0, 0, 0, 0, mobileExp && day === 1 ? mobileExp : 0, courierExp && day === 1 ? courierExp : 0, 'Store Visit']);
    }

    // PDF Definition
    const docDefinition = {
        pageOrientation: 'landscape',
        pageMargins: [20, 60, 20, 60],
        header: {
            margin: [40, 20, 40, 0],
            columns: [
                { text: 'Teamlase - Travel Expenses Statement', style: 'header' },
                { text: '315 Work Avenue Campus, Ascent Building 77, Jyoti Nivas College Rd, Koramangala Industrial Layout, Koramangala, Bengaluru, Karnataka 560095', style: 'subheader', alignment: 'center' }
            ]
        },
        content: [
            { text: '\n' },
            {
                table: {
                    widths: [50, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80],
                    body: [
                        [{ text: 'Employee ID:', bold: true }, '874786', { text: 'Designation', bold: true }, 'SUPERVISOR', { text: 'Claim Period', bold: true }, claimPeriod],
                        [{ text: 'Employee Name', bold: true }, 'SHABANA BEGUM', { text: 'HQ Town', bold: true }, 'HYDERABAD', { text: 'Working days', bold: true }, workingDays.toString()],
                        [{ text: 'Total Claim Amount', bold: true, colSpan: 5 }, {}, {}, {}, {}, totalClaim.toString()],
                        ['Date', 'Day', 'Market worked', 'Claim Type', 'Daily Allowance', 'Travel Fare', 'Local Travel Fare', 'Meals (400/day)', 'Hotel (1500+tax/Day)', 'Mobile Exps. (Rs.1500)', 'Courier', 'Activity/Others'],
                        ...rows
                    ]
                },
                layout: {
                    hLineWidth: () => 0.5,
                    vLineWidth: () => 0.5,
                    hLineColor: () => '#aaa',
                    vLineColor: () => '#aaa',
                    fillColor: (i) => (i === 0 || i === 5 ? '#d9e2f3' : (i % 2 === 0 ? '#f5f5f5' : null))
                }
            },
            { text: '\nI Certify that these expenses are correctly stated and were incurred as Necessary business expenses in the service of the company only.', style: 'certify' }
        ],
        styles: {
            header: { fontSize: 16, bold: true, alignment: 'center', color: '#1e3a8a' },
            subheader: { fontSize: 9, italics: true },
            certify: { fontSize: 9, alignment: 'left', margin: [40, 20] }
        }
    };

    pdfMake.createPdf(docDefinition).download(`ER_${monthInput}_SHABANA.pdf`);
    showMessage('ER PDF generated successfully!', 'success');
}

// Utility
function showMessage(msg, type) {
    const el = document.getElementById('message');
    el.textContent = msg;
    el.className = 'message-box show ' + type;
    setTimeout(() => el.className = 'message-box', 3000);
}




