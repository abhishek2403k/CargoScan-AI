/**
 * APP.JS - Main application orchestration and workflow management
 * Coordinates between modules and manages user workflow (upload -> review -> analyze -> results)
 * 
 * MODULE DEPENDENCIES:
 * - constants.js - Knowledge base and configuration
 * - pdf-handler.js - PDF extraction and file upload
 * - parser.js - Field extraction and parsing
 * - renderer.js - UI rendering and display
 * - heuristics.js - Rules engine and scoring
 */

// Runtime state
let currentContainer = document.getElementById('container-type-select').value || "FCL_20";

// DOM element caching for workflow
const workflowElements = {
    inputSection: document.getElementById('upload-panel'),
    reviewPanel: document.getElementById('review-panel'),
    resultsSection: document.getElementById('results-panel'),
    scannerOverlay: document.getElementById('scanner-overlay'),
    scanText: document.getElementById('scan-text'),
    btnRun: document.getElementById('btn-run'),
    containerTypeSelect: document.getElementById('container-type-select'),
    btnPrint: document.getElementById('btn-print'),
    btnReset: document.getElementById('btn-reset'),
    reviewError: document.getElementById('review-error')
};

/**
 * Initialize the entire application
 * Sets up event listeners and prepares the workflow
 */
function initializeApp() {
    // Container type selection
    workflowElements.containerTypeSelect.addEventListener('change', (e) => {
        currentContainer = e.target.value;
    });

    // Validation and analysis trigger
    if (workflowElements.btnRun) {
        workflowElements.btnRun.addEventListener('click', onInitiateAnalysis);
    }

    // Print export button
    if (workflowElements.btnPrint) {
        workflowElements.btnPrint.addEventListener('click', onPrintReport);
    }

    // Reset button
    if (workflowElements.btnReset) {
        workflowElements.btnReset.addEventListener('click', () => { 
            window.location.reload(); 
        });
    }

    // Validation checks
    if (!workflowElements.btnRun) console.warn('btn-run element not found');
    if (!workflowElements.scannerOverlay) console.warn('scanner-overlay element not found');
    if (!workflowElements.scanText) console.warn('scan-text element not found');
}

/**
 * Handle the initiate analysis button click
 * Validates fields and transitions to scanning state
 */
function onInitiateAnalysis() {
    const finalData = {};
    workflowElements.reviewError.style.display = 'none';
    
    // Gather current field values from review panel
    reviewFieldsConfig.forEach(cfg => {
        const el = document.getElementById(`edit-${cfg.key}`);
        finalData[cfg.key] = cfg.type === 'number' ? parseFloat(el.value) || 0 : el.value.trim();
    });

    // Include hidden multi-line fields for validation
    finalData.subtotal = parseFloat(globalExtractedFields.subtotal?.value) || 0;
    finalData.totalNetWeight = parseFloat(globalExtractedFields.totalNetWeight?.value) || 0;
    finalData.noOfUnits1 = parseFloat(globalExtractedFields.noOfUnits1?.value) || 0;
    finalData.totalUnits = parseFloat(globalExtractedFields.totalUnits?.value) || 0;

    // Keep the reviewed declaration snapshot for downstream workflows (e.g., officer clearance logs)
    window.latestDeclarationInput = { ...finalData };
    
    // Validation
    if (!finalData.hsCode && !finalData.description) {
        let err = workflowElements.reviewError;
        err.textContent = "HS Code or Description is required for resolution.";
        err.style.display = 'block';
        return;
    }

    // Hide input and show scanner overlay
    workflowElements.inputSection.style.display = 'none';
    workflowElements.scannerOverlay.style.display = 'flex';
    
    // Simulate analysis steps
    const steps = [
        "Resolving HS code...",
        "Running Physical Checks...",
        "Running Financial Checks...",
        "Running Integrity & Anomaly Checks...",
        "Compiling Combined Risk Profile..."
    ];
    
    let currentStep = 0;
    const scanInt = setInterval(() => {
        workflowElements.scanText.textContent = steps[currentStep++];
        if (currentStep >= steps.length) { 
            clearInterval(scanInt); 
            setTimeout(() => { 
                workflowElements.scannerOverlay.style.display = 'none'; 
                runRulesEngine(finalData, currentContainer); 
            }, 500); 
        }
    }, 400);
}

/**
 * Handle the print/export PDF button click
 * Prepares document and triggers browser print dialog
 */
function onPrintReport() {
    const printButton = workflowElements.btnPrint;
    const originalText = printButton.textContent;
    printButton.textContent = "Preparing PDF...";
    printButton.disabled = true;
    
    // Ensure all tables are visible and properly formatted
    const tables = document.querySelectorAll('.breakdown-table, .hs-card, .range-module');
    tables.forEach(table => {
        table.style.pageBreakInside = 'avoid';
    });
    
    // Force font rendering for better character alignment
    const allText = document.querySelectorAll('*');
    allText.forEach(el => {
        if (getComputedStyle(el).fontFamily.includes('JetBrains Mono')) {
            el.style.fontFamily = '"Courier New", Courier, monospace';
        }
    });
    
    // Trigger print after a brief delay to ensure rendering
    setTimeout(() => {
        window.print();
        
        // Restore button after print dialog closes
        setTimeout(() => {
            printButton.textContent = originalText;
            printButton.disabled = false;
            location.reload();
        }, 500);
    }, 100);
}

/**
 * Application entry point
 */
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

// Fallback if scripts load asynchronously
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}
