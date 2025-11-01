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

    let sumDaily = 0, sumMobile = 0, sumCourier = 0;

    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month - 1, day);
        const dayOfWeek = date.getDay();
        const dateStr = `${String(day).padStart(2, '0')}-${String(month).padStart(2, '0')}-${year}`;
        const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek];

        let allowance = 0;
        let store = '';
        let mobileOnDay = 0;
        let courierOnDay = 0;

        if (dayOfWeek === 0 || leaves[day]) {
            // Skip
        } else {
            allowance = 300;
            workingDays++;
            do {
                store = STORES[Math.floor(Math.random() * STORES.length)];
            } while (store === lastStore);
            lastStore = store;
        }

        if (mobileDate && new Date(mobileDate).getDate() === day) mobileOnDay = mobileAmount;
        if (courierDate && new Date(courierDate).getDate() === day) courierOnDay = courierAmount;

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
            { text: '', fontSize: 8 }
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

// Reuse showMessage from global
window.generateER = generateER;