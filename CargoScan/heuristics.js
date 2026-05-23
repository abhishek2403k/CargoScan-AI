/**
 * HEURISTICS.JS - Rules engine and scoring logic
 * Implements 13 customs declaration validation rules
 */

/**
 * Execute all validation rules and calculate risk score
 * @param {Object} data - Final declaration data to validate
 * @param {string} containerType - Container type (FCL_20, FCL_40, LCL, AIR)
 */
function runRulesEngine(data, containerType) {
    let finalCode = null, resolvedMethod = null;
    let physFindings = [], finFindings = [], docFindings = [], anoFindings = [];
    let score = 0;

    // === RULE 1: HS CODE RESOLUTION ===
    if (data.hsCode && HS_DB[data.hsCode]) { 
        finalCode = data.hsCode; 
        resolvedMethod = "DIRECT"; 
    } else if (data.hsCode) {
        const pMatch = Object.keys(HS_DB).find(c => c.startsWith(data.hsCode));
        if (pMatch) { 
            finalCode = pMatch; 
            resolvedMethod = "PREFIX"; 
        }
    }
    if (!finalCode) {
        const sl = Object.keys(KEYWORD_MAP).sort((a,b)=>b.length-a.length);
        const ld = data.description.toLowerCase();
        for (let kw of sl) { 
            if (ld.includes(kw)) { 
                finalCode = KEYWORD_MAP[kw]; 
                resolvedMethod = "KEYWORD"; 
                break; 
            } 
        }
    }

    if (!finalCode) {
        alert("HS Resolution Error: Could not determine an HS code based on input field or description. Reloading.");
        window.location.reload();
        return;
    }
    
    const props = HS_DB[finalCode];

    // === RULE 2: DESCRIPTION COHERENCE ===
    const cMat = props.material.toLowerCase();
    const cKws = COHERENCE_MAP[cMat] || [];
    const lowerDesc = data.description.toLowerCase();
    const materialDirectMatch = lowerDesc.includes(cMat);
    const keywordMatches = cKws.filter(kw => lowerDesc.includes(kw)).length;
    const totalSignal = materialDirectMatch ? keywordMatches + 1 : keywordMatches;
    
    if (totalSignal === 0) {
        score += 2; 
        physFindings.push({ 
            icon: '⚠️', 
            text: `Description contains no terms for HS ${finalCode} (${props.material}). Possible misclassification.`, 
            pts: 2, 
            rule: 'HS Coherence' 
        });
    } else if (totalSignal === 1) {
        score += 1; 
        physFindings.push({ 
            icon: '⚠️', 
            text: `Description weakly matches HS code. Manual verification needed.`, 
            pts: 1, 
            rule: 'HS Coherence' 
        });
    }

    // === RULE 3 & 4: WEIGHT PLAUSIBILITY ===
    const expected = data.quantity * props.avgUnitWt;
    const lower = expected * 0.70, upper = expected * 1.30;
    
    if (data.netWeight > 0) {
        if (data.netWeight >= lower && data.netWeight <= upper) {
            physFindings.push({ 
                icon: '✅', 
                text: `Weight (${data.netWeight}kg) within expected range (${lower.toFixed(1)}–${upper.toFixed(1)}kg).`, 
                pts: 0, 
                rule: 'Weight Plausibility' 
            });
        } else if (data.netWeight < lower) {
            const pct = ((expected - data.netWeight)/expected)*100;
            const p = pct > 50 ? 2 : 1; 
            score += p;
            physFindings.push({ 
                icon: '⚠️', 
                text: `Weight ${pct.toFixed(1)}% BELOW expected minimum. Possible under-declaration.`, 
                pts: p, 
                rule: 'Weight Plausibility' 
            });
        } else {
            const pct = ((data.netWeight - expected)/expected)*100;
            const p = pct > 50 ? 2 : 1; 
            score += p;
            physFindings.push({ 
                icon: '⚠️', 
                text: `Weight ${pct.toFixed(1)}% ABOVE expected maximum. Verify UOM.`, 
                pts: p, 
                rule: 'Weight Plausibility' 
            });
        }
    }

    // === RULE 5: CONTAINER LIMITS ===
    const cLimit = CONTAINER_LIMITS[containerType];
    if (data.netWeight > cLimit) {
        score += 3; 
        physFindings.push({ 
            icon: '⚠️', 
            text: `Declared weight (${data.netWeight}kg) EXCEEDS ${containerType} limit (${cLimit}kg). Impossible.`, 
            pts: 3, 
            rule: 'Container Limit' 
        });
    }
    if (expected > cLimit) {
        score += 3; 
        physFindings.push({ 
            icon: '⚠️', 
            text: `Expected weight (${expected}kg) for ${data.quantity} units EXCEEDS container limit.`, 
            pts: 3, 
            rule: 'Container Limit' 
        });
    }

    // === RULE 6: VALUE PER KILOGRAM ===
    let vkr = 0;
    const valueBaseForVkr = (data.subtotal > 0 ? data.subtotal : data.totalValue);
    const weightBaseForVkr = (data.totalNetWeight > 0 ? data.totalNetWeight : data.netWeight);
    const usingFallbackVkr = !(data.subtotal > 0) && !(data.totalNetWeight > 0);
    
    if (weightBaseForVkr > 0 && valueBaseForVkr >= 0 && (usingFallbackVkr || data.subtotal > 0 || data.totalNetWeight > 0)) {
        vkr = valueBaseForVkr / weightBaseForVkr;
        const minVal = props.minVal * 0.50, maxVal = props.maxVal * 1.50;
        
        if (valueBaseForVkr === 0) {
            score += 3; 
            finFindings.push({ 
                icon: '⚠️', 
                text: `Zero declared value – commercially impossible.`, 
                pts: 3, 
                rule: 'Market Value' 
            });
        } else if (vkr < minVal) {
            const dev = ((minVal - vkr)/minVal)*100; 
            const p = dev > 50 ? 2 : 1; 
            score += p;
            finFindings.push({ 
                icon: '⚠️', 
                text: `Value/kg ($${vkr.toFixed(2)}) is ${dev.toFixed(1)}% below market floor ($${props.minVal}/kg).`, 
                pts: p, 
                rule: 'Market Value' 
            });
        } else if (vkr > maxVal) {
            const dev = ((vkr - maxVal)/maxVal)*100; 
            const p = dev > 50 ? 2 : 1; 
            score += p;
            finFindings.push({ 
                icon: '⚠️', 
                text: `Value/kg ($${vkr.toFixed(2)}) is ${dev.toFixed(1)}% above market ceiling ($${props.maxVal}/kg).`, 
                pts: p, 
                rule: 'Market Value' 
            });
        } else {
            finFindings.push({ 
                icon: '✅', 
                text: `Value/kg ($${vkr.toFixed(2)}) within market range ($${props.minVal}–${props.maxVal}/kg).`, 
                pts: 0, 
                rule: 'Market Value' 
            });
        }
    }

    // === RULE 7: ASSEMBLY STATE FINGERPRINT ===
    if (ASSEMBLY_STATE_WEIGHTS[finalCode] && data.netWeight > 0 && data.quantity > 0) {
        const asData = ASSEMBLY_STATE_WEIGHTS[finalCode];
        const uw = data.netWeight / data.quantity;
        const ptsKw = ['spare part','component','part','assembly','sub-assembly','module','piece'];
        const isPart = ptsKw.some(k => lowerDesc.includes(k));
        
        if (isPart && uw > asData.assembled * 0.7) {
            score += 3; 
            physFindings.push({ 
                icon: '⚠️', 
                text: `Declared as parts but unit weight matches assembled ${asData.label} (${uw.toFixed(2)}kg).`, 
                pts: 3, 
                rule: 'Assembly Fingerprint' 
            });
        } else if (!isPart && uw < asData.component * 3) {
            score += 1; 
            physFindings.push({ 
                icon: '⚠️', 
                text: `Unit weight (${uw.toFixed(2)}kg) is unusually low for a complete ${asData.label}.`, 
                pts: 1, 
                rule: 'Assembly Fingerprint' 
            });
        }
    }

    // === RULE 8: ARITHMETIC CONSISTENCY ===
    const subtotalForArithmetic = data.subtotal > 0 ? data.subtotal : 0;
    const hasScopeUnitFields = data.totalUnits > 0 && data.noOfUnits1 > 0;
    const isSingleLineInvoice = hasScopeUnitFields && data.totalUnits === data.noOfUnits1;
    
    if (data.unitValue > 0 && data.quantity > 0 && subtotalForArithmetic > 0) {
        if (!isSingleLineInvoice) {
            finFindings.push({ 
                icon: 'ℹ️', 
                text: `Arithmetic consistency not applicable - multi-line invoice.`, 
                pts: 0, 
                rule: 'Arithmetic Consistency' 
            });
        } else {
            const calc = data.unitValue * data.quantity;
            const diff = Math.abs(calc - subtotalForArithmetic);
            const diffPct = (diff / subtotalForArithmetic) * 100;
            
            if (diffPct > 5) {
                score += 2; 
                finFindings.push({ 
                    icon: '⚠️', 
                    text: `Arithmetic mismatch: ${data.unitValue} × ${data.quantity} = ${calc.toFixed(2)}, declared ${subtotalForArithmetic}. Diff: ${diffPct.toFixed(1)}%.`, 
                    pts: 2, 
                    rule: 'Arithmetic Consistency' 
                });
            } else if (diffPct > 1) {
                score += 1; 
                finFindings.push({ 
                    icon: '⚠️', 
                    text: `Minor discrepancy (${diffPct.toFixed(1)}%).`, 
                    pts: 1, 
                    rule: 'Arithmetic Consistency' 
                });
            } else {
                finFindings.push({ 
                    icon: '✅', 
                    text: `Invoice arithmetic is consistent.`, 
                    pts: 0, 
                    rule: 'Arithmetic Consistency' 
                });
            }
        }
    }

    // === RULE 9: PACKAGING RATIO ===
    if (data.grossWeight > 0 && data.netWeight > 0) {
        if ((data.grossWeight / data.netWeight) > 3) {
            physFindings.push({ 
                icon: 'ℹ️', 
                text: `Packaging ratio check skipped — net is line-level, gross is shipment-level.`, 
                pts: 0, 
                rule: 'Packaging Ratio' 
            });
        } else {
            const packWt = data.grossWeight - data.netWeight;
            const ratio = (packWt / data.netWeight) * 100;
            
            if (ratio < 1) {
                score += 1; 
                physFindings.push({ 
                    icon: '⚠️', 
                    text: `Packaging < 1% of net weight. Possible inflation in net weight figure.`, 
                    pts: 1, 
                    rule: 'Packaging Ratio' 
                });
            } else if (ratio > 40) {
                score += 1; 
                physFindings.push({ 
                    icon: '⚠️', 
                    text: `Packaging (${ratio.toFixed(1)}%) is unusually high (>40%). Verify figures.`, 
                    pts: 1, 
                    rule: 'Packaging Ratio' 
                });
            }
        }
    }

    // === RULE 10: ORIGIN PLAUSIBILITY ===
    if (data.originCountry) {
        const ocMap = { "CN":"China", "IN":"India", "VN":"Vietnam", "BD":"Bangladesh", "US":"USA", "DE":"Germany", "JP":"Japan", "KR":"South Korea", "TW":"Taiwan", "TH":"Thailand", "MY":"Malaysia", "ID":"Indonesia", "GB":"UK" };
        let norm = ocMap[data.originCountry.toUpperCase()] || data.originCountry;
        norm = norm.charAt(0).toUpperCase() + norm.slice(1).toLowerCase();
        
        let exactOriginKey = Object.keys(ORIGIN_PLAUSIBILITY).find(k=>k.toLowerCase() === norm.toLowerCase());
        
        if (!exactOriginKey) {
            docFindings.push({ 
                icon: 'ℹ️', 
                text: `Origin country ${norm} not in reference database.`, 
                pts: 0, 
                rule: 'Origin Country' 
            });
        } else if (!ORIGIN_PLAUSIBILITY[exactOriginKey].includes(cMat)) {
            score += 1; 
            docFindings.push({ 
                icon: '⚠️', 
                text: `Origin country (${exactOriginKey}) is not a known exporter of ${cMat} products.`, 
                pts: 1, 
                rule: 'Origin Country' 
            });
        } else {
            docFindings.push({ 
                icon: '✅', 
                text: `Origin country (${exactOriginKey}) is a recognised exporter of ${cMat}.`, 
                pts: 0, 
                rule: 'Origin Country' 
            });
        }
    }

    // === RULE 11: ROUND NUMBER ANOMALY ===
    const isRnd = n => n > 0 && (n%100===0 || n%500===0 || n%1000===0);
    if (isRnd(data.quantity) && isRnd(data.netWeight) && isRnd(data.totalValue)) {
        score += 1; 
        anoFindings.push({ 
            icon: '⚠️', 
            text: `All three figures (qty, weight, value) are suspiciously round.`, 
            pts: 1, 
            rule: 'Round Number Anomaly' 
        });
    }

    // === RULE 12: DOCUMENT INTEGRITY ===
    if (data.invoiceNo && /^\d{1,2}$/.test(data.invoiceNo)) {
        score += 1; 
        anoFindings.push({ 
            icon: '⚠️', 
            text: `Invoice number (${data.invoiceNo}) is suspiciously simple/short.`, 
            pts: 1, 
            rule: 'Document Integrity' 
        });
    }
    
    const purpStr = data.purpose.toLowerCase();
    if (purpStr.match(/(gift|sample|personal use|personal gift|not for resale)/i) && data.quantity > 10) {
        score += 2; 
        docFindings.push({ 
            icon: '⚠️', 
            text: `Non-commercial purpose '${data.purpose}' declared on bulk shipment (${data.quantity} units).`, 
            pts: 2, 
            rule: 'Purpose of Shipment' 
        });
    }
    
    if (data.relatedParty === "Yes") {
        score += 1; 
        finFindings.push({ 
            icon: '⚠️', 
            text: `Related party transaction declared. Transfer pricing rules apply.`, 
            pts: 1, 
            rule: 'Related Party' 
        });
    }
    
    const incs = ["EXW","FCA","FOB","FAS","CFR"];
    if (incs.includes(data.incoterms)) {
        docFindings.push({ 
            icon: 'ℹ️', 
            text: `Incoterms ${data.incoterms}. CIF basis requires freight addition prior to duty check.`, 
            pts: 0, 
            rule: 'Incoterms Note' 
        });
    }

    // === RULE 13: DUTY RECOVERY ===
    const dr = DUTY_RATES[finalCode] / 100;
    const dutyOwed = data.totalValue * dr;
    const dutyMinEst = data.quantity * props.avgUnitWt * props.minVal * dr;
    const dutyGap = Math.max(0, dutyMinEst - dutyOwed);

    // Combine all findings
    const allFindings = [...physFindings, ...finFindings, ...docFindings, ...anoFindings];

    // Build results object
    const results = {
        code: finalCode, 
        method: resolvedMethod, 
        desc: props.desc, 
        dutyRate: DUTY_RATES[finalCode], 
        material: props.material,
        weight: data.netWeight, 
        expected, 
        expectedMin: lower, 
        expectedMax: upper,
        totalValue: data.totalValue, 
        vkr, 
        minVal: props.minVal, 
        maxVal: props.maxVal,
        quantity: data.quantity, 
        unitWt: props.avgUnitWt,
        origin: data.originCountry || "N/A", 
        score,
        physFindings, 
        finFindings, 
        docFindings, 
        anoFindings, 
        allFindings,
        dutyOwed, 
        dutyMinEst, 
        dutyGap, 
        containerLimit: cLimit
    };

    renderResults(results);
    
    // Submit to global intelligence network
    if (typeof submitToGlobalNetwork === 'function') {
        submitToGlobalNetwork(results).catch(err => console.error('Network submission failed:', err));
    }
}
