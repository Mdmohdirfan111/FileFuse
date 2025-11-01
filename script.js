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
    
    processExcelCSV(file).then(storeData => {
        const [year, month] = monthInput.split('-');
        const pjpData = generatePJPData(storeData, parseInt(year), parseInt(month));
        
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(pjpData);
        XLSX.utils.book_append_sheet(wb, ws, 'Monthly PJP');
        XLSX.writeFile(wb, `PJP_${month}_${year}.xlsx`);
        
        showMessage('PJP generated successfully!', 'success');
    }).catch(error => {
        showMessage('Error: ' + error.message, 'error');
    });
}

function generatePJPData(storeData, year, month) {
    const daysInMonth = new Date(year, month, 0).getDate();
    const pjpData = [];
    const stores = extractStores(storeData);
    
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month - 1, day);
        const dayOfWeek = date.getDay();
        
        if (dayOfWeek === 0) { // Sunday
            pjpData.push({
                'Date': date.toLocaleDateString(),
                'Day': 'Sunday',
                'Store': 'Week Off',
                'Remarks': 'Weekly Off'
            });
        } else {
            const randomStore = stores[Math.floor(Math.random() * stores.length)];
            pjpData.push({
                'Date': date.toLocaleDateString(),
                'Day': getDayName(dayOfWeek),
                'Store': randomStore,
                'Remarks': 'Store Visit'
            });
        }
    }
    
    return pjpData;
}

function extractStores(storeData) {
    // Extract store names from the first row
    if (storeData.length > 0) {
        const firstRow = storeData[0];
        return Object.values(firstRow).filter(value => 
            typeof value === 'string' && value.trim() !== ''
        );
    }
    return ['Store 1', 'Store 2', 'Store 3', 'Store 4']; // Default fallback
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
    const counterCodes = extractCounterCodes(counterData);
    
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
                'Remarks': 'Weekly Off'
            });
        } else {
            const counter1 = getRandomCounter(counterCodes, usedCountersPerDay[dateStr]);
            usedCountersPerDay[dateStr].push(counter1);
            floater1.push({
                'Date': dateStr,
                'Day': getDayName(dayOfWeek),
                'Counter_Code': counter1,
                'Remarks': 'Store Visit'
            });
        }
        
        // Floater 2
        if (dayOfWeek === floater2Weekoff) {
            floater2.push({
                'Date': dateStr,
                'Day': getDayName(dayOfWeek),
                'Counter_Code': 'Week Off',
                'Remarks': 'Weekly Off'
            });
        } else {
            const counter2 = getRandomCounter(counterCodes, usedCountersPerDay[dateStr]);
            usedCountersPerDay[dateStr].push(counter2);
            floater2.push({
                'Date': dateStr,
                'Day': getDayName(dayOfWeek),
                'Counter_Code': counter2,
                'Remarks': 'Store Visit'
            });
        }
    }
    
    return { floater1, floater2 };
}

function extractCounterCodes(counterData) {
    // Extract counter codes from data
    if (counterData.length > 0) {
        return counterData.map(row => row.Counter_Code || row.Code || 'COUNTER_' + Math.random().toString(36).substr(2, 5));
    }
    return ['CTR001', 'CTR002', 'CTR003', 'CTR004', 'CTR005']; // Default fallback
}

function getRandomCounter(counters, usedCounters) {
    const available = counters.filter(c => !usedCounters.includes(c));
    return available.length > 0 
        ? available[Math.floor(Math.random() * available.length)]
        : 'NO_COUNTER_AVAILABLE';
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
