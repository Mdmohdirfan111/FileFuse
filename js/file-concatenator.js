// ==== GLOBAL UTILITIES ====
function showMessage(msg, type) {
    const el = document.getElementById('message');
    el.textContent = msg;
    el.className = 'message-box show ' + type;
    setTimeout(() => el.className = 'message-box', 4000);
}

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
                const pdfData = await processPDF(file);
                allData.push(pdfData);
            } else {
                const excelData = await processExcelCSV(file);
                allData.push(...excelData);
            }
        }
        
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
    return {
        'Store': file.name.replace(/\.[^/.]+$/, ""),
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

// Expose to global
window.concatenateFiles = concatenateFiles;