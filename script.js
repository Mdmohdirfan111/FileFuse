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
    const filesInput = document.getElementById('concatFiles');
    const files = filesInput.files;
    if (files.length === 0) {
        showMessage('Please select at least one file!', 'error');
        return;
    }

    showMessage('Processing files...', 'processing');

    const workbook = XLSX.utils.book_new();
    const allData = [];
    let headers = null;

    for (let file of files) {
        const arrayBuffer = await file.arrayBuffer();
        let data;

        if (file.name.endsWith('.pdf')) {
            const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
            const pdf = await loadingTask.promise;
            let text = '';
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                text += content.items.map(item => item.str).join(' ') + '\n';
            }
            data = text.trim().split('\n').map(row => [row]);
        } else {
            const wb = XLSX.read(arrayBuffer, { type: 'array' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            data = XLSX.utils.sheet_to_json(ws, { header: 1 });
        }

        if (!headers) {
            headers = data[0];
            allData.push(headers);
        } else if (JSON.stringify(headers) !== JSON.stringify(data[0])) {
            showMessage('Headers do not match across files!', 'error');
            return;
        }

        // Add store name from filename (before extension)
        const storeName = file.name.replace(/\.[^/.]+$/, '').trim();
        data.slice(1).forEach(row => {
            const newRow = [...row];
            newRow.push(storeName); // Add as last column
            allData.push(newRow);
        });
    }

    // Add "Store" header if not exists
    if (headers && !headers.includes('Store')) {
        headers.push('Store');
    }

    const ws = XLSX.utils.aoa_to_sheet(allData);
    XLSX.utils.book_append_sheet(workbook, ws, 'Combined');
    XLSX.writeFile(workbook, 'Concatenated_Output.xlsx');
    showMessage('Files merged successfully!', 'success');
}

// ==== 2. MONTHLY PJP GENERATOR ====
function generatePJP() {
    const fileInput = document.getElementById('storeData');
    const monthInput = document.getElementById('pjpMonth').value;
    if (!fileInput.files[0] || !monthInput) {
        showMessage('Please select file and month!', 'error');
        return;
    }

    showMessage('Generating PJP...', 'processing');
    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        const [year, month] = monthInput.split('-');
        const daysInMonth = new Date(year, month, 0).getDate();
        const output = [];

        // Header
        const header = ['Date', 'Day'];
        json[0].slice(1).forEach(col => header.push(col));
        output.push(header);

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month - 1, day);
            const dayName = date.toLocaleString('en-us', { weekday: 'long' });
            const row = [`${day}/${month}/${year}`, dayName];
            json[0].slice(1).forEach(() => row.push(''));
            output.push(row);
        }

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(output);
        XLSX.utils.book_append_sheet(wb, ws, 'PJP');
        XLSX.writeFile(wb, `PJP_${monthInput}.xlsx`);
        showMessage('PJP generated!', 'success');
    };

    reader.readAsArrayBuffer(file);
}

// ==== 3. FLOATER INCENTIVE TRACKER ====
function generateFloaterSchedule() {
    const fileInput = document.getElementById('floaterData');
    const monthInput = document.getElementById('floaterMonth').value;
    if (!fileInput.files[0] || !monthInput) {
        showMessage('Please select file and month!', 'error');
        return;
    }

    showMessage('Generating schedule...', 'processing');
    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet);

        const [year, month] = monthInput.split('-');
        const daysInMonth = new Date(year, month, 0).getDate();
        const schedule = {};

        json.forEach((row, i) => {
            schedule[row.Counter_Code] = {
                name: row.Store_Name,
                offDays: []
            };
        });

        const counters = Object.keys(schedule);
        let dayIndex = 0;

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month - 1, day);
            if (date.getDay() === 0) continue; // Skip Sunday

            const counter = counters[dayIndex % counters.length];
            schedule[counter].offDays.push(day);
            dayIndex++;
        }

        const output = [['Counter_Code', 'Store_Name', 'Weekly Off Dates']];
        counters.forEach(code => {
            const off = schedule[code].offDays.join(', ');
            output.push([code, schedule[code].name, off]);
        });

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(output);
        XLSX.utils.book_append_sheet(wb, ws, 'Schedule');
        XLSX.writeFile(wb, `Floater_Schedule_${monthInput}.xlsx`);
        showMessage('Schedule generated!', 'success');
    };

    reader.readAsArrayBuffer(file);
}

// ==== 4. CATALOGUE XLOOKUP ====
function performLookup() {
    const catFile = document.getElementById('catalogueFile').files[0];
    const sohFile = document.getElementById('sohFile').files[0];
    if (!catFile || !sohFile) {
        showMessage('Please select both files!', 'error');
        return;
    }

    showMessage('Performing lookup...', 'processing');
    Promise.all([catFile, sohFile].map(f => f.arrayBuffer())).then(([catBuf, sohBuf]) => {
        const catWb = XLSX.read(catBuf, { type: 'array' });
        const sohWb = XLSX.read(sohBuf, { type: 'array' });

        const catSheet = catWb.Sheets[catWb.SheetNames[0]];
        const sohSheet = sohWb.Sheets[sohWb.SheetNames[0]];

        const catData = XLSX.utils.sheet_to_json(catSheet);
        const sohData = XLSX.utils.sheet_to_json(sohSheet);

        const catMap = {};
        catData.forEach(row => {
            if (row.Description) catMap[row.Description.trim()] = row;
        });

        const output = [['Description', 'SOH', 'Catalogue Match', 'Status']];
        sohData.forEach(row => {
            const desc = row.Description ? row.Description.trim() : '';
            const match = catMap[desc];
            output.push([
                desc,
                row.SOH || '',
                match ? (match.SOH || '') : '',
                match ? 'Matched' : 'Unmatched'
            ]);
        });

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(output);
        XLSX.utils.book_append_sheet(wb, ws, 'Lookup');
        XLSX.writeFile(wb, 'XLookup_Result.xlsx');
        showMessage('Lookup completed!', 'success');
    });
}

// ==== 5. ER GENERATOR (SIMPLE LAYOUT - 100% WORKING) ====
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

    showMessage('Generating ER PDF...', 'processing');

    const [year, month] = monthInput.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const claimPeriod = `01-${String(month).padStart(2, '0')}-${year} to ${daysInMonth}-${String(month).padStart(2, '0')}-${year}`;
    const workingDays = Array.from({length: daysInMonth}, (_, i) => i + 1)
        .filter(d => new Date(year, month - 1, d).getDay() !== 0).length;

    const dailyAllowance = workingDays * 300;
    const totalClaim = dailyAllowance + mobileAmount + courierAmount;

    const mobileDay = mobileDate ? new Date(mobileDate).getDate() : null;
    const courierDay = courierDate ? new Date(courierDate).getDate() : null;

    // Generate rows (simple strings first, then convert)
    const rows = [];
    let lastStore = null;

    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month - 1, day);
        const dayOfWeek = date.getDay();
        const dateStr = `${String(day).padStart(2, '0')}-${String(month).padStart(2, '0')}-${year}`;
        const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek];

        if (dayOfWeek === 0) {
            rows.push([
                dateStr, dayName, 'Week Off', '', 0, 0, 0, 0, 0, 0, 0, 'Week Off'
            ]);
            continue;
        }

        let store;
        do {
            store = STORES[Math.floor(Math.random() * STORES.length)];
        } while (store === lastStore);
        lastStore = store;

        const mobileOnDay = (mobileDay === day) ? mobileAmount : 0;
        const courierOnDay = (courierDay === day) ? courierAmount : 0;

        rows.push([
            dateStr, dayName, store, '', 300, 0, 0, 0, 0, mobileOnDay, courierOnDay, 'Store Visit'
        ]);
    }

    // Convert to text objects (safe for pdfMake)
    const convertToText = (arr) => arr.map(val => ({ text: val.toString() }));

    // PDF Definition - SIMPLE LAYOUT (no function, no colSpan issues)
    const docDefinition = {
        pageOrientation: 'landscape',
        pageMargins: [20, 60, 20, 60],
        header: function(currentPage, pageCount) {
            return [
                { text: 'Teamlase - Travel Expenses Statement', style: 'header', alignment: 'center' },
                { text: '315 Work Avenue Campus, Ascent Building 77, Jyoti Nivas College Rd, Koramangala Industrial Layout, Koramangala, Bengaluru, Karnataka 560095', style: 'subheader', alignment: 'center', margin: [0, 5, 0, 0] }
            ];
        },
        content: [
            { text: '\n' },
            // Employee Info Table (simple 2-row table)
            {
                table: {
                    widths: ['*', '*', '*', '*', '*', '*'],
                    body: [
                        convertToText(['Employee ID:', '874786', 'Designation:', 'SUPERVISOR', 'Claim Period:', claimPeriod]),
                        convertToText(['Employee Name:', 'SHABANA BEGUM', 'HQ Town:', 'HYDERABAD', 'Working days:', workingDays.toString()])
                    ]
                },
                layout: 'lightHorizontalLines'
            },
            // Total Claim
            {
                text: `Total Claim Amount: ₹${totalClaim}`, bold: true, fontSize: 12, margin: [0, 10, 0, 10]
            },
            // Main Data Table
            {
                table: {
                    headerRows: 1,
                    widths: [40, 60, '*', 60, 60, 60, 60, 60, 70, 70, 50, 80],
                    body: [
                        // Header
                        [{ text: 'Date', bold: true, fillColor: '#d9e2f3' },
                         { text: 'Day', bold: true, fillColor: '#d9e2f3' },
                         { text: 'Market worked', bold: true, fillColor: '#d9e2f3' },
                         { text: 'Claim Type', bold: true, fillColor: '#d9e2f3' },
                         { text: 'Daily Allowance', bold: true, fillColor: '#d9e2f3' },
                         { text: 'Travel Fare', bold: true, fillColor: '#d9e2f3' },
                         { text: 'Local Travel Fare', bold: true, fillColor: '#d9e2f3' },
                         { text: 'Meals (400/day)', bold: true, fillColor: '#d9e2f3' },
                         { text: 'Hotel (1500+tax/Day)', bold: true, fillColor: '#d9e2f3' },
                         { text: 'Mobile Exps. (Rs.1500)', bold: true, fillColor: '#d9e2f3' },
                         { text: 'Courier', bold: true, fillColor: '#d9e2f3' },
                         { text: 'Activity/Others', bold: true, fillColor: '#d9e2f3' }],
                        // Data rows
                        ...rows.map((row, index) => {
                            const rowObj = convertToText(row);
                            rowObj.forEach(cell => {
                                cell.fillColor = index % 2 === 0 ? '#f5f5f5' : null;
                            });
                            return rowObj;
                        })
                    ]
                },
                layout: {
                    fillColor: function (rowIndex) {
                        return (rowIndex === 0) ? '#d9e2f3' : null;
                    }
                }
            },
            { text: '\nI Certify that these expenses are correctly stated and were incurred as Necessary business expenses in the service of the company only.', style: 'certify', margin: [0, 20, 0, 0] }
        ],
        styles: {
            header: { fontSize: 16, bold: true, color: '#1e3a8a', margin: [0, 0, 0, 10] },
            subheader: { fontSize: 9, italics: true },
            certify: { fontSize: 9, alignment: 'left', italics: true }
        },
        footer: function(currentPage, pageCount) {
            return { text: `Page ${currentPage} of ${pageCount}`, alignment: 'center', fontSize: 8, margin: [0, 10, 0, 0] };
        }
    };

    // Download with error handling
    try {
        pdfMake.createPdf(docDefinition).getDataUrl((dataUrl) => {
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = `ER_${monthInput}_SHABANA.pdf`;
            link.click();
        });
        showMessage('ER PDF downloaded successfully!', 'success');
    } catch (err) {
        console.error('PDF Error:', err);
        showMessage('PDF generation failed. Check console.', 'error');
    }
}
