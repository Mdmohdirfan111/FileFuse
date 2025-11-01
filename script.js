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
    
    uploadToServer(files);
}

// Upload folder files
function uploadFolder() {
    if (folderFiles.length === 0) {
        showMessage('Please drag and drop a folder containing Excel/CSV files!', 'error');
        return;
    }
    
    uploadToServer(folderFiles);
}

// Send files to backend
function uploadToServer(files) {
    const formData = new FormData();
    
    for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
    }
    
    showMessage('Processing files... Please wait.', 'success');
    
    fetch('/concatenate', {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Server error');
        }
        return response.blob();
    })
    .then(blob => {
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = 'output.xlsx';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        showMessage('Files concatenated successfully! Download started.', 'success');
    })
    .catch(error => {
        console.error('Error:', error);
        showMessage('Error concatenating files. Please make sure all files have the same headings.', 'error');
    });
}

function showMessage(message, type) {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = message;
    messageDiv.className = type;
}