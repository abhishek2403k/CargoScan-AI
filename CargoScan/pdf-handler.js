/**
 * PDF-HANDLER.JS - PDF extraction and file upload management
 * Handles PDF parsing, file drops, uploads, and text extraction
 */

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// DOM element caching
const domElements = {
    dropzone: document.getElementById('ocr-dropzone'),
    fileInput: document.getElementById('ocr-file-input'),
    ocrStatus: document.getElementById('ocr-status'),
    rawPanel: document.querySelector('.raw-panel'),
    rawHeader: document.querySelector('.raw-header'),
    rawContent: document.getElementById('raw-text'),
    rawStats: document.querySelector('.raw-badges'),
    reviewPanel: document.getElementById('review-panel'),
    scannerOverlay: document.getElementById('scanner-overlay'),
    inputSection: document.getElementById('upload-panel')
};

/**
 * Extract text from PDF file using PDF.js library
 * @param {File} file - PDF file to extract from
 * @returns {Object} - {text: extracted text, pages: page count}
 */
async function extractTextFromPDF(file) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
    let acroText = '';

    // Prefer AcroForm field values (filled PDFs store data here)
    try {
        const fieldObjects = await pdf.getFieldObjects();
        if (fieldObjects && typeof fieldObjects === 'object') {
            const lines = [];
            Object.entries(fieldObjects).forEach(([fieldName, entries]) => {
                if (!Array.isArray(entries)) return;
                entries.forEach(entry => {
                    const rawValue = entry && entry.value != null ? String(entry.value).trim() : '';
                    if (!rawValue) return;
                    lines.push(`${fieldName}: ${rawValue}`);
                });
            });
            acroText = lines.join('\n');
        }
    } catch (err) {
        console.warn('AcroForm read failed, continuing with text layer.', err);
    }

    // Extract text from all pages
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items.map(item => item.str).join(' ');
        fullText += pageText + '\n';
    }

    const combinedText = [acroText, fullText].filter(Boolean).join('\n');
    return { text: combinedText.toLowerCase(), pages: pdf.numPages };
}

/**
 * Handle file upload and trigger text extraction
 * @param {File} file - File to process
 */
async function handleFile(file) {
    if (!file) {
        alert("Upload error: No file was dropped. Please ensure you are dropping a valid file.");
        return;
    }

    domElements.ocrStatus.style.display = 'block';
    domElements.ocrStatus.textContent = "Extracting text using PDF.js...";
    
    try {
        let extracted = "", pages = 0;
        
        if (file.type === 'application/pdf') {
            const res = await extractTextFromPDF(file);
            if (!res || !res.text) throw new Error("PDF extraction returned empty result.");
            extracted = res.text; 
            pages = res.pages;
        } else {
            // Fallback for other file types
            domElements.ocrStatus.textContent = "Only PDFs supported for this engine version. Reading as simple text file fallback...";
            const txt = await file.text(); 
            extracted = txt ? txt.toLowerCase() : ""; 
            pages = 1;
        }
        
        if (typeof extracted !== "string") {
            extracted = String(extracted);
        }
        
        domElements.ocrStatus.style.color = "var(--safe)";
        domElements.ocrStatus.textContent = "Extraction Complete. Parse started.";
        
        // Display raw extracted text
        if (domElements.rawPanel && domElements.rawContent && domElements.rawStats) {
            domElements.rawPanel.style.display = 'block';
            domElements.rawContent.textContent = extracted;
            domElements.rawStats.textContent = `${pages} Pages | ${extracted.length} Chars`;
        } else {
            console.warn("Raw panel DOM elements are missing.");
        }
        
        // Update review summary with extraction quality
        const reviewSum = document.getElementById('review-summary');
        if (reviewSum) {
            if (extracted.length < 100) {
                reviewSum.textContent = "⚠️ Low text extraction – this may be a scanned image PDF. OCR is not supported. Please enter fields manually.";
                reviewSum.style.color = "var(--danger)";
            } else {
                reviewSum.textContent = "Review extracted fields, correct errors, and select container type before running checks.";
                reviewSum.style.color = "var(--text-muted)";
            }
        }
        
        // Start parsing extracted text
        runParsers(extracted);
    } catch (e) {
        console.error("HANDLE FILE ERROR:", e);
        domElements.ocrStatus.style.color = "var(--danger)";
        domElements.ocrStatus.textContent = "Extraction Failed: " + (e.message || "Unknown error");
        alert("Failed to process file: " + (e.message || "Please check developer console"));
    }
}

/**
 * Initialize file upload handlers
 */
function initPdfUploadHandlers() {
    // Click to upload
    domElements.dropzone.onclick = () => domElements.fileInput.click();
    domElements.fileInput.onclick = e => e.stopPropagation();

    // Prevent browsers from opening dropped files globally
    const blockBrowserFileOpen = e => { e.preventDefault(); };
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        window.addEventListener(eventName, blockBrowserFileOpen, false);
    });

    // Drag and drop styling
    domElements.dropzone.addEventListener('dragover', e => {
        e.preventDefault(); e.stopPropagation();
        e.dataTransfer.dropEffect = 'copy';
        domElements.dropzone.style.background = 'rgba(0, 212, 255, 0.15)';
        domElements.dropzone.style.borderColor = 'var(--safe)';
    });

    domElements.dropzone.addEventListener('dragleave', e => {
        e.preventDefault(); e.stopPropagation();
        domElements.dropzone.style.background = 'rgba(0, 212, 255, 0.05)';
        domElements.dropzone.style.borderColor = 'var(--primary)';
    });

    domElements.dropzone.addEventListener('drop', e => {
        e.preventDefault(); e.stopPropagation();
        domElements.dropzone.style.background = 'rgba(0, 212, 255, 0.05)';
        domElements.dropzone.style.borderColor = 'var(--primary)';
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFile(e.dataTransfer.files[0]);
        }
    });

    // File input change
    domElements.fileInput.onchange = e => {
        if (e.target.files && e.target.files.length) {
            handleFile(e.target.files[0]);
        }
        e.target.value = '';
    };

    // Raw panel toggle
    domElements.rawHeader?.addEventListener('click', () => {
        domElements.rawContent.style.display = domElements.rawContent.style.display === 'block' ? 'none' : 'block';
    });
}

// Initialize on module load
initPdfUploadHandlers();
