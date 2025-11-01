let folderFiles = [];

// Handle drag and drop for folder
const dropZone = document.getElementById('dropZone');

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    
    const items = e.dataTransfer.items;
    if (items.length > 0) {
        folderFiles = [];
        processItems(items);
    }
});

function processItems(items) {
    for (let i = 0; i < items.length; i++) {
        const item = items[i].webkitGetAsEntry();
        if (item) {
            traverseFileTree(item);
        }
    }
}

function traverseFileTree(item) {
    if (item.isFile) {
        item.file(file => {
            if (file.name.match(/\.(xlsx|xls|csv)$/i)) {
                folderFiles.push(file);
            }
        });
    } else if (item.isDirectory) {
        const dirReader = item.createReader();
        dirReader.readEntries(entries => {
            for (let i = 0; i < entries.length; i++) {
                traverseFileTree(entries[i]);
            }
        });
    }
}

// Upload files individually
function uploadFiles() {
    const fileInput = document.getElementById('fileInput');
    const files = fileInput.files;
    
    if (files.length === 0) {
        showMessage('Please select at least one file!', 'error');
        return;
    }
    
    processFiles(Array.from(files));
}

// Upload folder files
function uploadFolder() {
    if (folderFiles.length === 0) {
        showMessage('Please drag and drop a folder containing Excel/CSV files!', 'error');
        return;
    }
    
    processFiles(folderFiles);
}

// Process files in browser
function processFiles(files) {
    showMessage('Processing files... Please wait.', 'success');
    
    const promises = files.map(file => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                try {
                    let data;
                    if (file.name.endsWith('.csv')) {
                        // Parse CSV
                        const csvData = e.target.result;
                        const workbook = XLSX.read(csvData, { type: 'string', cellDates: true });
                        const sheetName = workbook.SheetNames[0];
                        data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
                        
                        // Extract headers and rows
                        const headers = data[0];
                        const rows = data.slice(1).map(row => {
                            const obj = {};
                            headers.forEach((header, index) => {
                                obj[header] = row[index] || '';
                            });
                            return obj;
                        });
                        
                        resolve({ data: rows, headers: headers, fileName: file.name });
                    } else {
                        // Parse Excel
                        const arrayBuffer = e.target.result;
                        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
                        const sheetName = workbook.SheetNames[0];
                        const worksheet = workbook.Sheets[sheetName];
                        data = XLSX.utils.sheet_to_json(worksheet);
                        
                        if (data.length > 0) {
                            const headers = Object.keys(data[0]);
                            resolve({ data: data, headers: headers, fileName: file.name });
                        } else {
                            resolve({ data: [], headers: [], fileName: file.name });
                        }
                    }
                } catch (error) {
                    reject(`Error processing ${file.name}: ${error.message}`);
                }
            };
            
            reader.onerror = () => reject(`Error reading ${file.name}`);
            
            if (file.name.endsWith('.csv')) {
                reader.readAsText(file);
            } else {
                reader.readAsArrayBuffer(file);
            }
        });
    });
    
    Promise.all(promises)
        .then(results => {
            // Check if all files have same headers
            const firstHeaders = JSON.stringify(results[0].headers);
            for (let i = 1; i < results.length; i++) {
                if (JSON.stringify(results[i].headers) !== firstHeaders) {
                    throw new Error(`File "${results[i].fileName}" has different columns than "${results[0].fileName}". All files must have same headings.`);
                }
            }
            
            // Concatenate all data
            const allData = results.flatMap(result => result.data);
            
            if (allData.length === 0) {
                throw new Error('No data found in files');
            }
            
            // Create new workbook
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(allData);
            XLSX.utils.book_append_sheet(wb, ws, 'Combined Data');
            
            // Download file
            XLSX.writeFile(wb, 'output.xlsx');
            showMessage('Files concatenated successfully! Download started.', 'success');
        })
        .catch(error => {
            console.error('Error:', error);
            showMessage(error.message, 'error');
        });
}

function showMessage(message, type) {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = message;
    messageDiv.className = type;
}
