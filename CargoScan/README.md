# Customs Declaration Verification - Modular Architecture

## Overview

The application has been refactored from a monolithic 900+ line script into a clean, modular component structure for better maintainability and code organization.

## File Structure

```
e:\Customs Declaration Verification\
├── index.html (Main HTML - contains all UI markup and styles)
├── constants.js (Configuration & Knowledge Base)
├── pdf-handler.js (PDF extraction & file upload handling)
├── parser.js (Field extraction & text parsing)
├── renderer.js (UI rendering & display logic)
├── heuristics.js (Rules engine & scoring logic)
└── app.js (Main orchestration & workflow management)
```

## Module Breakdown

### 1. **constants.js** (~100 lines)

**Purpose:** Central knowledge base and configuration

**Contains:**

- `HS_DB` - Product database with HS codes and specifications
- `KEYWORD_MAP` - Keyword to HS code mapping
- `CONTAINER_LIMITS` - Container capacity limits by type
- `DUTY_RATES` - Tariff rates by HS code
- `ORIGIN_PLAUSIBILITY` - Country-to-product mapping
- `ASSEMBLY_STATE_WEIGHTS` - Component vs. assembled unit weights
- `reviewFieldsConfig` - Form field configuration
- `COHERENCE_MAP` - Material keywords for validation

**Usage:** Imported by all other modules for data lookups

---

### 2. **pdf-handler.js** (~140 lines)

**Purpose:** PDF file handling and text extraction

**Key Functions:**

- `extractTextFromPDF(file)` - Extract text from PDF using PDF.js
- `handleFile(file)` - Process uploaded file and trigger parsing
- `initPdfUploadHandlers()` - Set up drag-and-drop listeners

**Features:**

- Supports both AcroForm fields (filled PDFs) and text layers
- Automatic unit conversion (LBS to KGS)
- Drag-and-drop file upload
- Raw text display for verification

---

### 3. **parser.js** (~220 lines)

**Purpose:** Extract and parse declaration fields from raw text

**Key Function:**

- `runParsers(text)` - Parse 10 key fields from document text

**Extracts:**

1. HS Code (with fallback strategies)
2. Description of Goods
3. Quantity
4. Net & Gross Weight
5. Total Value & Unit Value
6. Currency
7. Origin Country
8. Related Party Status
9. Invoice Number
10. Purpose of Shipment
11. Incoterms

**Each field includes:**

- Extracted value
- Confidence level (high/medium/low)
- Raw text source for audit trail

---

### 4. **renderer.js** (~190 lines)

**Purpose:** UI rendering and visualization

**Key Functions:**

- `renderReviewFields(fields)` - Display extracted fields for review
- `renderResults(res)` - Display complete analysis results

**Renders:**

- Field review cards with confidence badges
- Risk assessment banners
- Metric cards (material, weight, value, etc.)
- Weight and value range visualizations
- Findings by category (physical, financial, documentary, anomaly)
- Scoring table
- Recommendation block

---

### 5. **heuristics.js** (~320 lines)

**Purpose:** Risk assessment rules engine

**Key Function:**

- `runRulesEngine(data, containerType)` - Execute 13 validation rules

**13 Validation Rules:**

1. **HS Code Resolution** - Determine product classification
2. **Description Coherence** - Verify description matches HS code
   3-4. **Weight Plausibility** - Check if weight is within expected range
3. **Container Limits** - Verify weight doesn't exceed container capacity
4. **Market Value per KG** - Compare value/kg against market rates
5. **Assembly Fingerprint** - Detect misclassified assembled vs. parts
6. **Arithmetic Consistency** - Verify invoice math (Unit Price × Qty = Total)
7. **Packaging Ratio** - Check if packaging weight is reasonable
8. **Origin Plausibility** - Verify country is known exporter of material
9. **Round Number Anomaly** - Flag suspiciously round numbers
10. **Document Integrity** - Check invoice numbers and purpose statements
11. **Duty Recovery** - Calculate tariff obligations

**Output:**

- Risk score (0-9+)
- Findings by category
- Four risk levels: LOW, MEDIUM, HIGH, CRITICAL

---

### 6. **app.js** (~165 lines)

**Purpose:** Main application orchestration

**Key Functions:**

- `initializeApp()` - Set up event listeners
- `onInitiateAnalysis()` - Validate fields and trigger analysis
- `onPrintReport()` - Handle PDF export
- `startLiveClock()` - Update live UTC clock

**Responsibilities:**

- Coordinate workflow (upload → review → analyze → results)
- Manage container type selection
- Validate user input before analysis
- Handle print/export functionality
- Manage UI state transitions

---

## Workflow Flow

```
1. User uploads PDF
   ↓ (pdf-handler.js)
2. Extract text from PDF
   ↓ (parser.js)
3. Parse fields (HS code, weight, value, etc.)
   ↓ (renderer.js)
4. Display fields for review
   ↓ (app.js)
5. User reviews/corrects fields
   ↓ (app.js)
6. User selects container type and initiates analysis
   ↓ (heuristics.js)
7. Execute 13 validation rules
   ↓ (renderer.js)
8. Display results and findings
   ↓ (app.js)
9. User can export as PDF
```

## Module Dependencies

```
app.js (Orchestrator)
├── constants.js (Data)
├── pdf-handler.js (Input)
├── parser.js (Processing)
│   └── constants.js
├── renderer.js (Display)
│   └── constants.js
└── heuristics.js (Analysis)
    └── constants.js
```

## Load Order in HTML

```html
<script src="constants.js?v=1"></script>
<!-- Load first (dependencies) -->
<script src="pdf-handler.js?v=1"></script>
<script src="parser.js?v=1"></script>
<script src="renderer.js?v=1"></script>
<script src="heuristics.js?v=1"></script>
<script src="app.js?v=1"></script>
<!-- Load last (orchestrator) -->
```

## Benefits of Modular Architecture

✅ **Maintainability** - Each module has a single responsibility
✅ **Readability** - Focused code is easier to understand
✅ **Testability** - Individual modules can be tested independently
✅ **Scalability** - Easy to add new rules or fields
✅ **Debuggability** - Console logs can identify which module has issues
✅ **Reusability** - Modules can be used in other projects

## Adding New Features

### To add a new validation rule:

1. Add logic to `runRulesEngine()` in **heuristics.js**
2. Add finding to appropriate array (physFindings, finFindings, etc.)
3. Update score calculation

### To add a new field to extract:

1. Add parsing logic to `runParsers()` in **parser.js**
2. Add field to `reviewFieldsConfig` in **constants.js**
3. Update renderer to display the field in **renderer.js**

### To add new constants:

1. Add to appropriate section in **constants.js**
2. Import and use in dependent modules

## Testing Recommendations

- Test PDF extraction with both filled forms and scanned documents
- Test parsing with various invoice formats
- Verify each rule triggers correctly with test data
- Test PDF export with different browser print settings

## Version Control

- Each script includes version number in the HTML src attribute (e.g., `?v=1`)
- Update version numbers when changes are made to force browser cache refresh
