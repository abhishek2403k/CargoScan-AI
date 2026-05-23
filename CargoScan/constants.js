/**
 * CONSTANTS.JS - Knowledge base, configuration, and static data
 * Contains all HS codes, tariff rates, country mapping, and configuration
 */

// Product database with specifications
const HS_DB = {
    "7408.11":{ material:"Copper", desc:"Copper wire – refined, cross-section >6mm", avgUnitWt:10, density:8960, minVal:4, maxVal:12, typVal:7.5 },
    "7407.10":{ material:"Copper", desc:"Copper bars, rods and profiles", avgUnitWt:15, density:8960, minVal:4, maxVal:11, typVal:7.0 },
    "7409.11":{ material:"Copper", desc:"Copper plates and sheets (>0.15mm)", avgUnitWt:20, density:8960, minVal:5, maxVal:13, typVal:8.0 },
    "7213.91":{ material:"Steel", desc:"Steel wire rods – circular cross-section", avgUnitWt:25, density:7850, minVal:0.4, maxVal:1.5, typVal:0.8 },
    "7208.51":{ material:"Steel", desc:"Flat-rolled steel products (width ≥600mm)", avgUnitWt:30, density:7850, minVal:0.4, maxVal:1.4, typVal:0.7 },
    "7306.30":{ material:"Steel", desc:"Steel pipes and tubes – circular section", avgUnitWt:18, density:7850, minVal:0.5, maxVal:2.0, typVal:1.0 },
    "3901.20":{ material:"Plastic", desc:"Polyethylene – density ≥0.94", avgUnitWt:0.5, density:950, minVal:0.8, maxVal:2.5, typVal:1.2 },
    "3902.10":{ material:"Plastic", desc:"Polypropylene – primary forms", avgUnitWt:0.5, density:910, minVal:0.7, maxVal:2.2, typVal:1.1 },
    "3904.10":{ material:"Plastic", desc:"Polyvinyl chloride (PVC) – not mixed", avgUnitWt:0.6, density:1380, minVal:0.6, maxVal:2.0, typVal:1.0 },
    "5208.11":{ material:"Cotton", desc:"Woven cotton fabrics – ≥85% cotton", avgUnitWt:2.0, density:400, minVal:1.5, maxVal:8.0, typVal:3.5 },
    "6109.10":{ material:"Cotton", desc:"T-shirts and singlets – knitted cotton", avgUnitWt:0.3, density:400, minVal:3.0, maxVal:20.0, typVal:8.0 },
    "5201.00":{ material:"Cotton", desc:"Raw cotton – not carded or combed", avgUnitWt:5.0, density:400, minVal:0.8, maxVal:3.0, typVal:1.5 },
    "8471.30":{ material:"Electronics", desc:"Laptops and portable computers", avgUnitWt:1.8, density:600, minVal:200, maxVal:2000, typVal:600 },
    "8517.12":{ material:"Electronics", desc:"Smartphones and mobile phones", avgUnitWt:0.2, density:600, minVal:500, maxVal:5000, typVal:1500 },
    "8528.72":{ material:"Electronics", desc:"LCD/LED television sets", avgUnitWt:8.0, density:600, minVal:30, maxVal:300, typVal:80 },
    "8542.31":{ material:"Electronics", desc:"Electronic integrated circuits", avgUnitWt:0.01, density:600, minVal:5000, maxVal:500000, typVal:50000 }
};

// Keyword to HS code mapping for description-based lookup
const KEYWORD_MAP = {
    "copper wire":"7408.11","copper rod":"7407.10","copper bar":"7407.10","copper sheet":"7409.11",
    "steel wire":"7213.91","steel rod":"7213.91","steel coil":"7208.51","steel pipe":"7306.30",
    "polyethylene":"3901.20","hdpe":"3901.20","polypropylene":"3902.10","pvc":"3904.10",
    "cotton fabric":"5208.11","t-shirt":"6109.10","garment":"6109.10","clothing":"6109.10",
    "raw cotton":"5201.00","laptop":"8471.30","smartphone":"8517.12","mobile phone":"8517.12",
    "television":"8528.72","processor":"8542.31","copper":"7408.11","steel":"7213.91",
    "plastic":"3901.20","cotton":"5208.11","electronics":"8471.30","phone":"8517.12",
    "tablet":"8471.30","computer":"8471.30"
};

// Container capacity limits (kg)
const CONTAINER_LIMITS = { 
    "20ft": 28000, "40ft": 30000, "FCL_20": 28000, "FCL_40": 30000, "LCL": 5000, "AIR": 2000 
};

// Duty rates by HS code (percentage)
const DUTY_RATES = {
    "7408.11":5,"7407.10":5,"7409.11":5,"7213.91":3,"7208.51":3,"7306.30":4,
    "3901.20":6,"3902.10":6,"3904.10":7,"5208.11":12,"6109.10":15,"5201.00":5,
    "8471.30":0,"8517.12":0,"8528.72":5,"8542.31":0
};

// Which countries typically export which materials
const ORIGIN_PLAUSIBILITY = {
    "China":    ["electronics","plastic","cotton","steel"],
    "India":    ["cotton","steel","plastic"],
    "Vietnam":  ["electronics","cotton"],
    "Bangladesh":["cotton"],
    "Germany":  ["steel","electronics"],
    "USA":      ["electronics","steel","plastic"],
    "Japan":    ["electronics","steel"],
    "South Korea":["electronics","steel"],
    "Taiwan":   ["electronics"],
    "Thailand": ["electronics","plastic","cotton"],
    "Malaysia": ["electronics","plastic"],
    "Indonesia":["cotton","plastic"],
    "UK":       ["steel","electronics"]
};

// Expected weight ranges for assembled vs component units
const ASSEMBLY_STATE_WEIGHTS = {
    "8517.12": { component:0.05, assembled:0.18, label:"smartphone" },
    "8471.30": { component:0.3,  assembled:1.8,  label:"laptop" },
    "8528.72": { component:1.0,  assembled:8.0,  label:"television" },
    "8542.31": { component:0.001,assembled:0.01, label:"processor" }
};

// Form field configuration for review panel
const reviewFieldsConfig = [
    { key: 'hsCode', label: '1. HS Code' },
    { key: 'description', label: '2. Description of Goods' },
    { key: 'quantity', label: '3. Quantity / Units', type: 'number' },
    { key: 'netWeight', label: '4. Net Weight (KG)', type: 'number' },
    { key: 'grossWeight', label: '5. Gross Weight (KG)', type: 'number' },
    { key: 'totalValue', label: '6. Total Value (USD)', type: 'number' },
    { key: 'unitValue', label: '7. Unit Value (USD)', type: 'number' },
    { key: 'originCountry', label: '8. Country of Manufacture' },
    { key: 'relatedParty', label: '9. Related Party' },
    { key: 'invoiceNo', label: '10. Invoice Number' },
    { key: 'purpose', label: '11. Purpose of Shipment' },
    { key: 'incoterms', label: '12. Incoterms' }
];

// Material coherence keywords for validation
const COHERENCE_MAP = {
    "copper": ["copper","cu","wire","rod","cable","pipe"],
    "steel": ["steel","iron","metal","rod","beam","coil"],
    "plastic": ["plastic","pvc","polymer","resin","pe","pp"],
    "cotton": ["cotton","fabric","textile","garment","cloth","yarn","apparel"],
    "electronics": ["electronic","phone","laptop","computer","tablet","circuit","device","semiconductor"]
};
