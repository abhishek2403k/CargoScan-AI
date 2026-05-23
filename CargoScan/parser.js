/**
 * PARSER.JS - Field extraction and parsing logic
 * Parses PDF text and extracts declaration fields (HS code, weight, value, etc.)
 */

let globalExtractedFields = {};

/**
 * Parse extracted text and identify declaration fields
 * @param {string} text - Raw extracted text from PDF
 */
function runParsers(text) {
    const fields = {};
    
    // Helper function to extract text by field name (AcroForm style)
    const acro = name => {
        const safeName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const re = new RegExp(safeName + ':\\s*([^\n]+)', 'i');
        const m = re.exec(text);
        return m ? m[1].trim() : null;
    };
    
    // Helper to extract numeric values
    const acroNumber = (...names) => {
        for (const name of names) {
            const value = acro(name);
            if (!value) continue;
            const m = value.replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
            if (m) return { value: parseFloat(m[0]), raw: `${name}: ${value}` };
        }
        return null;
    };
    
    // Helper to extract text values
    const acroTextValue = (...names) => {
        for (const name of names) {
            const value = acro(name);
            if (value) return { value, raw: `${name}: ${value}` };
        }
        return null;
    };
    
    // === PARSE 1: HS CODE ===
    let hsMatch = null;
    const hsAcroFields = ['hs code', 'hs code 2', 'hs code 3'];
    for (const fieldName of hsAcroFields) {
        const hsVal = acro(fieldName);
        if (!hsVal) continue;
        const hsToken = /(\d{4}\.\d{2}(?:\.\d{2,4})?|\d{6,10})/.exec(hsVal);
        if (hsToken) {
            const token = hsToken[1];
            const normalized = token.includes('.') ? token.substring(0, 7) : `${token.substring(0, 4)}.${token.substring(4, 6)}`;
            hsMatch = { value: normalized, confidence: 'high', raw: `${fieldName}: ${hsVal}` };
        } else {
            hsMatch = { value: hsVal, confidence: 'high', raw: `${fieldName}: ${hsVal}` };
        }
        break;
    }
    if (!hsMatch) {
        const hsA = [...text.matchAll(/\b(\d{4}\.\d{2})\b/g)];
        if (hsA.length) hsMatch = { value: hsA[0][1], confidence: "high", raw: hsA[0][0] };
        else {
            const hsB = [...text.matchAll(/\b(\d{4}\.\d{2}\.\d{2,4})\b/g)];
            if (hsB.length) hsMatch = { value: hsB[0][1].substring(0,7), confidence: "high", raw: hsB[0][0] };
            else {
                const hsC = /(?:harmonized|tariff|hs code|hts)[^0-9]{0,80}\b(\d{6,10})\b/i.exec(text);
                if (hsC) hsMatch = { value: hsC[1].substring(0,4)+"."+hsC[1].substring(4,6), confidence: "medium", raw: hsC[0] };
            }
        }
    }
    fields.hsCode = hsMatch || { value: "", confidence: "low", raw: "Not found" };

    // === PARSE 2: DESCRIPTION ===
    let descMatch = null;
    const desc01 = acro('description of goods 01');
    const desc02 = acro('description of goods 02');
    const descAcro = [desc01, desc02].filter(Boolean).join(' ').trim();
    if (descAcro) {
        descMatch = { value: descAcro, confidence: 'high', raw: `description of goods: ${descAcro}` };
    } else {
        const descA = /(?:description of goods|description|commodity|goods|product)[\s:]+(.{10,150})/i.exec(text);
        if (descA) descMatch = { value: descA[1].trim().replace(/\n/g, ' '), confidence: "high", raw: descA[0] };
        else descMatch = { value: "", confidence: "low", raw: "Not found" };
    }
    fields.description = descMatch;

    // === PARSE 3: QUANTITY ===
    let qtyMatch = null;
    const qtyAcro = acroNumber('no of units 1', 'total no of units');
    const noOfUnits1Acro = acroNumber('no of units 1');
    const totalUnitsAcro = acroNumber('total no of units', 'total units');
    if (qtyAcro) {
        qtyMatch = { value: parseInt(String(qtyAcro.value), 10), confidence: 'high', raw: qtyAcro.raw };
    } else {
        const qtyA = /(?:no\.? of units|number of units|qty|quantity|units)[\s:=]*(\d+)/i.exec(text);
        if (qtyA) qtyMatch = { value: parseInt(qtyA[1]), confidence: "high", raw: qtyA[0] };
    }
    fields.quantity = qtyMatch || { value: "", confidence: "low", raw: "Not found" };
    fields.noOfUnits1 = noOfUnits1Acro
        ? { value: parseInt(String(noOfUnits1Acro.value), 10), confidence: 'high', raw: noOfUnits1Acro.raw }
        : { value: "", confidence: "low", raw: "Not found" };
    fields.totalUnits = totalUnitsAcro
        ? { value: parseInt(String(totalUnitsAcro.value), 10), confidence: 'high', raw: totalUnitsAcro.raw }
        : { value: "", confidence: "low", raw: "Not found" };

    // === PARSE 4: WEIGHTS ===
    let nWtMatch = null, gWtMatch = null, totalNetWtMatch = null, wUnit = "KGS", wConv = false;
    const netAcro = acroTextValue('net weight 1');
    if (netAcro) {
        const m = netAcro.value.replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
        if (m) {
            const val = parseFloat(m[0]);
            wUnit = /\b(lb|lbs)\b/i.test(netAcro.value) ? 'LB' : 'KGS';
            nWtMatch = { value: wUnit.includes('LB') ? val * 0.453592 : val, confidence: 'high', raw: netAcro.raw };
            if (wUnit.includes('LB')) wConv = true;
        }
    }

    if (!nWtMatch) {
        const netA = /(?:net weight|net wt|net)[\s:=]*([\d,.]+)\s*(kg|kgs|lb|lbs)/i.exec(text);
        if (netA) {
            const val = parseFloat(netA[1].replace(/,/g, ''));
            wUnit = netA[2].toUpperCase();
            nWtMatch = { value: wUnit.includes('LB') ? val * 0.453592 : val, confidence: "high", raw: netA[0] };
            if (wUnit.includes('LB')) wConv = true;
        }
    }

    const totalNetAcro = acroTextValue('total weight');
    if (totalNetAcro) {
        const m = totalNetAcro.value.replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
        if (m) {
            const val = parseFloat(m[0]);
            const tu = /\b(lb|lbs)\b/i.test(totalNetAcro.value) ? 'LB' : 'KGS';
            totalNetWtMatch = { value: tu.includes('LB') ? val * 0.453592 : val, confidence: 'high', raw: totalNetAcro.raw };
        }
    }

    const grossAcro = acroTextValue('total gross weight');
    if (grossAcro) {
        const m = grossAcro.value.replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
        if (m) {
            const val = parseFloat(m[0]);
            const gu = /\b(lb|lbs)\b/i.test(grossAcro.value) ? 'LB' : 'KGS';
            gWtMatch = { value: gu.includes('LB') ? val * 0.453592 : val, confidence: 'high', raw: grossAcro.raw };
        }
    }

    if (!gWtMatch) {
        const grsA = /(?:gross weight|gross wt|gross)[\s:=]*([\d,.]+)\s*(kg|kgs|lb|lbs)/i.exec(text);
        if (grsA) {
            const val = parseFloat(grsA[1].replace(/,/g, ''));
            const gu = grsA[2].toUpperCase();
            gWtMatch = { value: gu.includes('LB') ? val * 0.453592 : val, confidence: "high", raw: grsA[0] };
        }
    }
    fields.netWeight = nWtMatch || { value: "", confidence: "low", raw: "Not found" };
    fields.totalNetWeight = totalNetWtMatch || { value: "", confidence: "low", raw: "Not found" };
    fields.grossWeight = gWtMatch || { value: "", confidence: "low", raw: "Not found" };
    fields.weightUnitOriginal = wUnit; 
    fields.weightConverted = wConv;

    // === PARSE 5: VALUES & CURRENCY ===
    let valMatch = null, unitValMatch = null, currency = "USD";
    const totalAcro = acroNumber('invoice total', 'total value 01');
    if (totalAcro) valMatch = { value: totalAcro.value, confidence: 'high', raw: totalAcro.raw };

    const unitAcro = acroNumber('unit value 1');
    if (unitAcro) unitValMatch = { value: unitAcro.value, confidence: 'high', raw: unitAcro.raw };

    const currAcro = acro('currency code name');
    if (currAcro) currency = currAcro.toUpperCase();

    if (!valMatch) {
        const valA = /(?:invoice total|total value|total amount|grand total)[\s:=]*([\d,.]+)/i.exec(text);
        if (valA) valMatch = { value: parseFloat(valA[1].replace(/,/g, '')), confidence: "high", raw: valA[0] };
    }
    if (!unitValMatch) {
        const uvA = /(?:unit value|unit price|price per unit|unit cost)[\s:=]*([\d,.]+)/i.exec(text);
        if (uvA) unitValMatch = { value: parseFloat(uvA[1].replace(/,/g, '')), confidence: "high", raw: uvA[0] };
    }
    if (!currAcro) {
        const currM = /\b(USD|EUR|GBP|INR|CNY|JPY|AED)\b/i.exec(text);
        if (currM) currency = currM[1].toUpperCase();
    }

    fields.totalValue = valMatch || { value: "", confidence: "low", raw: "Not found" };
    fields.unitValue = unitValMatch || { value: "", confidence: "low", raw: "Not found" };
    const subtotalAcro = acroNumber('subtotal');
    fields.subtotal = subtotalAcro || { value: "", raw: "Not found" };
    fields.currency = currency;

    // === PARSE 6: ORIGIN COUNTRY ===
    let ctryMatch = null;
    const ctryAcro = acro('ctry of origin 1');
    if (ctryAcro) {
        ctryMatch = { value: ctryAcro, confidence: 'high', raw: `ctry of origin 1: ${ctryAcro}` };
    } else {
        const ctryA = /(?:country of manufacture|country of origin|made in|manufactured in)[\s:=]*([A-Za-z\s]{2,20})/i.exec(text);
        if (ctryA) ctryMatch = { value: ctryA[1].trim(), confidence: "high", raw: ctryA[0] };
        else {
            const ctryB = /(?:origin)[\s:=]*([A-Za-z]{2,20})/i.exec(text);
            if (ctryB) ctryMatch = { value: ctryB[1].trim(), confidence: "medium", raw: ctryB[0] };
        }
    }
    fields.originCountry = ctryMatch || { value: "", confidence: "low", raw: "Not found" };

    // === PARSE 7: RELATED PARTY ===
    let relMatch = null;
    if (text.includes("related party") || text.includes("related transaction") || text.includes("related")) {
        const yesNo = /(?:related.*?)(yes|no|x)/i.exec(text);
        if (yesNo) relMatch = { value: yesNo[1].toLowerCase() === 'no' ? "No" : "Yes", confidence: "medium", raw: yesNo[0] };
        else relMatch = { value: "Unknown", confidence: "low", raw: "Found related string but no status" };
    }
    fields.relatedParty = relMatch || { value: "Unknown", confidence: "low", raw: "Not found" };

    // === PARSE 8: INVOICE NUMBER ===
    let invMatch = null;
    const invA = /(?:invoice no|invoice number|inv no|inv #)[\s:=]*([A-Za-z0-9\-]+)/i.exec(text);
    if (invA) invMatch = { value: invA[1], confidence: "high", raw: invA[0] };
    fields.invoiceNo = invMatch || { value: "", confidence: "low", raw: "Not found" };

    // === PARSE 9: PURPOSE OF SHIPMENT ===
    let purMatch = null;
    const purAcro = acro('purpose of shipment dropdown');
    if (purAcro) purMatch = { value: purAcro.substring(0,30), confidence: 'high', raw: `purpose of shipment dropdown: ${purAcro}` };
    else {
        const purA = /(?:purpose|purpose of shipment)[\s:=]*([A-Za-z\s]+)/i.exec(text);
        if (purA) purMatch = { value: purA[1].trim().substring(0,30), confidence: "high", raw: purA[0] };
    }
    fields.purpose = purMatch || { value: "Commercial", confidence: "low", raw: "Assumed" };

    // === PARSE 10: INCOTERMS ===
    let incoMatch = null;
    const incoA = /\b(EXW|FCA|CPT|CIP|DAP|DPU|DDP|FAS|FOB|CFR|CIF)\b/i.exec(text);
    if (incoA) incoMatch = { value: incoA[1].toUpperCase(), confidence: "high", raw: incoA[0] };
    fields.incoterms = incoMatch || { value: "", confidence: "low", raw: "Not found" };

    // Store globally and trigger rendering
    globalExtractedFields = fields;
    renderReviewFields(fields);
}
