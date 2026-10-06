const express = require('express');
const cors = require('cors');
const fs = require('fs');
const csv = require('csv-parser');
const { DecisionTreeClassifier } = require("ml-cart");
const path = require('path');
const app = express();
app.use(cors());
app.use(express.json());

// ===== LOAD ML MODEL =====
const model = JSON.parse(fs.readFileSync(path.join(__dirname, "classification_model.json")));
const classifier = DecisionTreeClassifier.load(model);
console.log("✅ ML model loaded");

// ===== LOAD RISK MODEL =====
let riskModel = null;
let riskClassifier = null;
try {
    riskModel = JSON.parse(fs.readFileSync(path.join(__dirname, "risk_model.json")));
    riskClassifier = DecisionTreeClassifier.load(riskModel);
    console.log("✅ Risk model loaded");
} catch (err) {
    console.log("⚠️ risk_model.json not found - run create_risk_dataset.js then train_risk_model.js to generate it. Risk level will be unavailable until then.");
}

// ===== LOAD RECOMMENDATION MODEL =====
let recommendationModel = null;
let recommendationClassifier = null;
try {
    recommendationModel = JSON.parse(
        fs.readFileSync(path.join(__dirname, "recommendation_model.json"))
    );
    recommendationClassifier = DecisionTreeClassifier.load(recommendationModel);
    console.log("✅ Recommendation model loaded");
} catch (err) {
    console.log("⚠️ recommendation_model.json not found - run create_recommendation_dataset.js then train_recommendation_model.js to generate it. Recommendations will fall back to a simple message until then.");
}

// ===== LOAD DATASET =====
let trainingDataset = [];
const datasetPath = path.join(__dirname, 'classification_dataset.csv');

// ===== LOAD DICTIONARIES =====
let englishSet = new Set();
let tagalogSet = new Set();

try {
    const engData = JSON.parse(
        fs.readFileSync(
            path.join(__dirname, 'words_dictionary.json'),
            'utf-8'
        )
    );

    englishSet = new Set(
        Object.keys(engData).map(word => word.toLowerCase())
    );

    console.log(
        `✅ English dictionary loaded: ${englishSet.size} words`
    );

} catch (err) {
    console.log("❌ Failed to load English dictionary");
}

try {
    const tagData = JSON.parse(
        fs.readFileSync(
            path.join(__dirname, 'tagalog_dictionary.json'),
            'utf-8'
        )
    );

    tagalogSet = new Set(
        tagData.map(entry => entry.word.toLowerCase())
    );

    console.log(
        `✅ Tagalog dictionary loaded: ${tagalogSet.size} words`
    );

} catch (err) {
    console.log("❌ Failed to load Tagalog dictionary");
}

// ===== PASSPHRASE WORD POOL =====
const passphraseWordPool = Array.from(englishSet).filter(
    word => word.length >= 4 && word.length <= 7 && /^[a-z]+$/.test(word)
);
if (passphraseWordPool.length === 0) {
    console.log("⚠️ Passphrase word pool is empty - suggestPassphrase() will fall back to generic words.");
}

// ===== LOAD CSV DATASET =====
fs.createReadStream(datasetPath)
    .pipe(csv())
    .on('data', (row) => trainingDataset.push(row))
    .on('end', () => {
        console.log(
            `✅ Dataset loaded: ${trainingDataset.length} samples ready for reference.`
        );
    })
    .on('error', () => {
        console.error("❌ Warning: dataset.csv not found.");
    });

// Expanded Leet Normalization
function normalizeLeet(str) {
    return str.toLowerCase()
        .replace(/[@4]/g, 'a')
        .replace(/0/g, 'o')
        .replace(/[\$5]/g, 's')
        .replace(/3/g, 'e')
        .replace(/[1!|]/g, 'i')
        .replace(/[\(\[\<]/g, 'c')
        .replace(/[7\+]/g, 't')
        .replace(/8/g, 'b');
}

// Dynamic Sequence Detector
function checkSequence(str) {
    const s = str.toLowerCase();
    if (s.length < 3) return 0;

    for (let i = 0; i < s.length - 2; i++) {
        const c1 = s.charCodeAt(i);
        const c2 = s.charCodeAt(i + 1);
        const c3 = s.charCodeAt(i + 2);

        const isDigit = (c) => c >= 48 && c <= 57;
        const isAlpha = (c) => c >= 97 && c <= 122;

        if ((isDigit(c1) && isDigit(c2) && isDigit(c3)) || (isAlpha(c1) && isAlpha(c2) && isAlpha(c3))) {
            if ((c2 === c1 + 1 && c3 === c2 + 1) || (c2 === c1 - 1 && c3 === c2 - 1)) {
                return 1;
            }
        }
    }
    return 0;
}

// ===== 1. FEATURE EXTRACTION =====
function extractFeatures(password) {
    const originalPassword = password;

    const numericPrefix = /^\d+/.test(originalPassword) ? 1 : 0;
    const numericSuffix = /\d+$/.test(originalPassword) ? 1 : 0;
    const middlePart = originalPassword.replace(/^\d+/, '').replace(/\d+$/, '');
    const numericInfix = /\d+/.test(middlePart) ? 1 : 0;

    const camelSplit = originalPassword.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
    const leetNormalized = normalizeLeet(camelSplit);
    const alphaTokens = leetNormalized.split(/[^a-z]+/).filter(Boolean);

    let dictionaryDetected = 0;
    let matchedWords = [];
    let totalMatchedLength = 0;
    let longestMatch = "";

    for (const token of alphaTokens) {
        if (token.length < 3) continue;

        if (englishSet.has(token) || tagalogSet.has(token)) {
            matchedWords.push(token);
            totalMatchedLength += token.length;
            if (token.length > longestMatch.length) longestMatch = token;
            continue;
        }

        let longestSub = "";
        for (let i = 0; i < token.length; i++) {
            for (let j = i + 3; j <= token.length; j++) {
                const sub = token.slice(i, j);
                if ((englishSet.has(sub) || tagalogSet.has(sub)) && sub.length > longestSub.length) {
                    longestSub = sub;
                }
            }
        }

        if (longestSub.length >= 3) {
            matchedWords.push(longestSub);
            totalMatchedLength += longestSub.length;
            if (longestSub.length > longestMatch.length) longestMatch = longestSub;
        }
    }

    const coverageRatio = originalPassword.length > 0 ? (totalMatchedLength / originalPassword.length) : 0;
    if (matchedWords.length > 0 && (coverageRatio >= 0.30 || totalMatchedLength >= 4)) {
        dictionaryDetected = 1;
    }

    const strippedMiddle = originalPassword.replace(/^\d+/, '').replace(/\d+$/, '');
    const hasEmbeddedLeet = /([a-zA-Z][@$40531!\(\[\<+]|[a-zA-Z0-9][@$!\(\[\<+][a-zA-Z0-9]|[@$40531!\(\[\<+][a-zA-Z])/.test(strippedMiddle);

    const rawTokens = camelSplit.toLowerCase().split(/[^a-z]+/).filter(Boolean);
    const rawMatched = rawTokens.some(t => englishSet.has(t) || tagalogSet.has(t));

    const hasLeetspeak = dictionaryDetected && (hasEmbeddedLeet || (!rawMatched && /[@$40531!\(\[\<+]/.test(strippedMiddle))) ? 1 : 0;

    const allRawTokensExact = rawTokens.length > 0 && rawTokens.every(t => englishSet.has(t) || tagalogSet.has(t));
    const isExactDictionary = allRawTokensExact && !/\d/.test(originalPassword) && !/[^A-Za-z0-9]/.test(originalPassword) && !hasLeetspeak;

    const extractedFeatures = {
        length: originalPassword.length,
        has_lowercase: /[a-z]/.test(originalPassword) ? 1 : 0,
        has_uppercase: /[A-Z]/.test(originalPassword) ? 1 : 0,
        has_digit: /\d/.test(originalPassword) ? 1 : 0,
        has_symbol: /[^A-Za-z0-9]/.test(originalPassword) ? 1 : 0,
        dictionary_present: dictionaryDetected,
        has_leetspeak: hasLeetspeak,
        numeric_prefix: numericPrefix,
        numeric_suffix: numericSuffix,
        numeric_infix: numericInfix,
        has_sequence: checkSequence(originalPassword),
        has_repetition: /(.)\1|(.{2,})\2+/i.test(originalPassword) ? 1 : 0,
        _matched_dictionary_word: dictionaryDetected ? matchedWords.join(", ") : "",
        _is_exact_dictionary: isExactDictionary ? 1 : 0
    };

    extractedFeatures.character_class_count =
        extractedFeatures.has_lowercase +
        extractedFeatures.has_uppercase +
        extractedFeatures.has_digit +
        extractedFeatures.has_symbol;

    extractedFeatures.rule_pattern_present = (
        extractedFeatures.has_sequence ||
        extractedFeatures.has_repetition ||
        extractedFeatures.numeric_prefix ||
        extractedFeatures.numeric_suffix ||
        extractedFeatures.numeric_infix ||
        (extractedFeatures.has_leetspeak && extractedFeatures.dictionary_present)
    ) ? 1 : 0;

    return extractedFeatures;
}

// ===== SECURITY SCORE & COMPARISON =====
function calculateSecurityScore(features) {
    let score = 0;
    score += features.length * 2;
    score += features.character_class_count * 8;
    if (features.dictionary_present) score -= 20;
    if (features.has_leetspeak) score -= 5;
    if (features.rule_pattern_present) score -= 15;
    if (features.has_sequence) score -= 10;
    if (features.has_repetition) score -= 10;
    return score;
}

function comparePasswords(currentFeatures, previousFeatures, currentRiskLevel, previousRiskLevel, lang = 'en') {
    const riskRank = { "CRITICAL": 0, "HIGH": 1, "MODERATE": 2 };

    const scoreCurrent = calculateSecurityScore(currentFeatures);
    const scorePrevious = calculateSecurityScore(previousFeatures);

    const msgs = {
        en: {
            CURRENT_PREF_RISK: "Your current password has a safer ML risk classification compared to your previous password.",
            PREVIOUS_PREF_RISK: "Your previous password has a safer ML risk classification compared to your current password.",
            CURRENT_PREF_SCORE: "Your current password has favorable security characteristics compared to your previous password.",
            PREVIOUS_PREF_SCORE: "Your previous password has favorable security characteristics compared to your current password.",
            SIMILAR: "Your current and previous passwords have similar security characteristics."
        },
        tl: {
            CURRENT_PREF_RISK: "Ang iyong kasalukuyang password ay may mas ligtas na uri ng panganib (ML risk) kumpara sa nakaraang password.",
            PREVIOUS_PREF_RISK: "Ang iyong nakaraang password ay may mas ligtas na uri ng panganib (ML risk) kumpara sa kasalukuyang password.",
            CURRENT_PREF_SCORE: "Ang iyong kasalukuyang password ay may mas magandang katangiang pangkapanatagan kumpara sa nakaraang password.",
            PREVIOUS_PREF_SCORE: "Ang iyong nakaraang password ay may mas magandang katangiang pangkapanatagan kumpara sa kasalukuyang password.",
            SIMILAR: "Ang kasalukuyan at nakaraang password ay may magkaparehong katangiang pangkapanatagan."
        }
    };

    const m = msgs[lang] || msgs['en'];

    if (riskRank[currentRiskLevel] > riskRank[previousRiskLevel]) {
        return {
            status: "CURRENT_PREFERRED",
            current_score: scoreCurrent,
            previous_score: scorePrevious,
            message: m.CURRENT_PREF_RISK
        };
    }

    if (riskRank[currentRiskLevel] < riskRank[previousRiskLevel]) {
        return {
            status: "PREVIOUS_PREFERRED",
            current_score: scoreCurrent,
            previous_score: scorePrevious,
            message: m.PREVIOUS_PREF_RISK
        };
    }

    if (scoreCurrent > scorePrevious) {
        return {
            status: "CURRENT_PREFERRED",
            current_score: scoreCurrent,
            previous_score: scorePrevious,
            message: m.CURRENT_PREF_SCORE
        };
    }

    if (scorePrevious > scoreCurrent) {
        return {
            status: "PREVIOUS_PREFERRED",
            current_score: scoreCurrent,
            previous_score: scorePrevious,
            message: m.PREVIOUS_PREF_SCORE
        };
    }

    return {
        status: "SIMILAR",
        current_score: scoreCurrent,
        previous_score: scorePrevious,
        message: m.SIMILAR
    };
}

// ===== 2. PASSWORD CLASSIFICATION =====
function classifyPassword(extractedFeatures, lang = 'en') {
    const modelFeatures = [[
        extractedFeatures.length,
        extractedFeatures.character_class_count,
        extractedFeatures.has_lowercase,
        extractedFeatures.has_uppercase,
        extractedFeatures.has_digit,
        extractedFeatures.has_symbol,
        extractedFeatures.dictionary_present,
        extractedFeatures.has_leetspeak,
        extractedFeatures.numeric_prefix,
        extractedFeatures.numeric_suffix,
        extractedFeatures.numeric_infix,
        extractedFeatures.has_sequence,
        extractedFeatures.has_repetition,
        extractedFeatures.rule_pattern_present
    ]];

    const prediction = classifier.predict(modelFeatures);

    const labelMap = {
        0: "DICTIONARY",
        1: "RULE-BASED",
        2: "BRUTE-FORCE"
    };

    let finalLabel = labelMap[prediction[0]];

    if (extractedFeatures._is_exact_dictionary === 1) {
        finalLabel = "DICTIONARY";
    } else if (extractedFeatures.dictionary_present === 1 && extractedFeatures.rule_pattern_present === 0) {
        finalLabel = "DICTIONARY";
    }

    const pathText = lang === 'tl'
        ? ["Sinisiyasat ang iyong password batay sa istraktura at mga pattern nito", `Hula/Prediksyon: ${finalLabel}`]
        : ["Your password has been analyzed based on its structure and patterns", `Prediction: ${finalLabel}`];

    return {
        label: finalLabel,
        path: pathText
    };
}

// ===== 2b. RISK LEVEL CLASSIFICATION =====
function classifyRisk(extractedFeatures) {
    if (!riskClassifier) {
        console.error("❌ Risk classifier model is not loaded.");
        return "MODERATE";
    }

    const modelFeatures = [[
        extractedFeatures.length,
        extractedFeatures.character_class_count,
        extractedFeatures.has_lowercase,
        extractedFeatures.has_uppercase,
        extractedFeatures.has_digit,
        extractedFeatures.has_symbol,
        extractedFeatures.dictionary_present,
        extractedFeatures.has_leetspeak,
        extractedFeatures.numeric_prefix,
        extractedFeatures.numeric_suffix,
        extractedFeatures.numeric_infix,
        extractedFeatures.has_sequence,
        extractedFeatures.has_repetition,
        extractedFeatures.rule_pattern_present
    ]];

    const rawPrediction = riskClassifier.predict(modelFeatures);
    const predictedIndex = Number(rawPrediction[0]);

    const riskMap = {
        0: "CRITICAL",
        1: "HIGH",
        2: "MODERATE"
    };

    return riskMap[predictedIndex] || "MODERATE";
}

// ===== 2c. RECOMMENDATION CLASSIFICATION =====
function classifyRecommendation(extractedFeatures, lang = 'en') {
    if (!recommendationClassifier) {
        return { label: null, steps: [] };
    }

    const modelFeatures = [[
        extractedFeatures.length,
        extractedFeatures.character_class_count,
        extractedFeatures.has_lowercase,
        extractedFeatures.has_uppercase,
        extractedFeatures.has_digit,
        extractedFeatures.has_symbol,
        extractedFeatures.dictionary_present,
        extractedFeatures.has_leetspeak,
        extractedFeatures.numeric_prefix,
        extractedFeatures.numeric_suffix,
        extractedFeatures.numeric_infix,
        extractedFeatures.has_sequence,
        extractedFeatures.has_repetition,
        extractedFeatures.rule_pattern_present
    ]];

    const prediction = recommendationClassifier.predict(modelFeatures);

    const recommendationLabelMap = {
        0: "AVOID_DICTIONARY_WORDS",
        1: "AVOID_PREDICTABLE_PATTERNS",
        2: "ADD_CHARACTER_VARIETY",
        3: "INCREASE_LENGTH",
        4: "INCREASE_LENGTH"
    };

    const label = recommendationLabelMap[prediction[0]] || null;
    const steps = buildManualFeatureSteps(extractedFeatures, lang);

    return { label, steps };
}

function buildManualFeatureSteps(extractedFeatures, lang = 'en') {
    const steps = [];

    for (const key of DECISION_TREE_ORDER) {
        const meta = FEATURE_COLUMNS.find((f) => f.key === key);
        if (!meta) continue;

        const threshold = MANUAL_TREE_THRESHOLDS[meta.key] ?? 1;
        const actualValue = extractedFeatures[meta.key];
        const tookRight = actualValue >= threshold;
        const expObj = meta.explain[lang] || meta.explain['en'];

        steps.push({
            feature: meta.key,
            label: FEATURE_LABELS[lang][meta.key],
            threshold: threshold,
            actualValue: actualValue,
            direction: tookRight ? "higher" : "lower",
            explanation: tookRight ? expObj.YES : expObj.NO
        });
    }

    return steps;
}

function buildRiskModelRationale(features, level, vulnerabilityType, lang = 'en') {
    if (lang === 'tl') {
        const detected = [];
        const notDetected = [];

        if (features.dictionary_present) detected.push("salitang mula sa diksyonaryo"); else notDetected.push("salitang diksyonaryo");
        if (features.numeric_suffix) detected.push("numero sa dulo"); else notDetected.push("numero sa dulo");
        if (features.has_sequence) detected.push("sunod-sunod na pattern"); else notDetected.push("sequence");
        if (features.has_leetspeak) detected.push("leetspeak"); else notDetected.push("leetspeak");
        if (features.numeric_prefix) detected.push("numero sa simula"); else notDetected.push("numero sa simula");
        if (features.numeric_infix) detected.push("numero sa gitna"); else notDetected.push("numero sa gitna");
        if (features.has_repetition) detected.push("inulit na karakter"); else notDetected.push("inulit na karakter");

        let detectionSentence = "";
        if (features.dictionary_present) {
            detectionSentence = `May natukoy na ${detected.join(", ")}, habang walang nahanap na ${notDetected.filter(d => d !== 'salitang diksyonaryo').join(", ")}.`;
        } else if (features.numeric_infix && !features.dictionary_present) {
            detectionSentence = `Walang natukoy na salitang diksyonaryo, leetspeak, numero sa simula o dulo, sequence, o inulit na karakter. May nahanap na mga numero sa gitna ng password,`;
        } else if (detected.length === 0) {
            detectionSentence = "Walang natukoy na salitang diksyonaryo, leetspeak, numero sa simula o dulo, sequence, o inulit na karakter.";
        } else {
            detectionSentence = `May natukoy na ${detected.join(", ")}, habang walang nahanap na ${notDetected.join(", ")}.`;
        }

        const presentClasses = [];
        if (features.has_lowercase) presentClasses.push("maliit na titik");
        if (features.has_uppercase) presentClasses.push("malaking titik");
        if (features.has_digit) presentClasses.push("numero");
        if (features.has_symbol) presentClasses.push("simbolo");

        const charCount = features.character_class_count;
        const charGuideline = charCount >= 3 ? "naumakay sa pamantayan." : "mababa sa pamantayang 3 uri.";
        const charSentence = `at may ${presentClasses.join(", ")}, kaya mayroon itong ${charCount} uri ng karakter, ${charGuideline}`;

        const len = features.length;
        const lenGuideline = len >= 12 ? `sumusunod sa 12-karakter na gabay.` : `mababa sa 12-karakter na gabay.`;
        const lengthSentence = `Ang haba nitong ${len} na karakter ay ${lenGuideline}`;

        let conclusion = "";
        if (level === "CRITICAL") {
            conclusion = "Ang salitang diksyonaryo at mababang baryasyon ay nagbunga ng CRITICAL na antas ng panganib.";
        } else if (level === "HIGH") {
            conclusion = "Ang madaling makilalang salita at hulaang pattern ay nagbunga ng HIGH na antas ng panganib.";
        } else if (level === "MODERATE" && vulnerabilityType === "BRUTE-FORCE") {
            conclusion = "May natukoy na rule-based pattern, ngunit ang desisyon ay patungo sa BRUTE-FORCE at MODERATE na antas ng panganib.";
        } else {
            conclusion = `Ang mga katangiang ito ay sumusuporta sa ${level} na antas ng panganib.`;
        }

        return `Sinuri ng system ang lahat ng 14 na katangian. ${detectionSentence} ${charSentence} ${lengthSentence} ${conclusion}`;
    }

    // Default English rationale
    const detected = [];
    const notDetected = [];

    if (features.dictionary_present) detected.push("A dictionary word"); else notDetected.push("dictionary word");
    if (features.numeric_suffix) detected.push("a number at the end"); else notDetected.push("numeric suffix");
    if (features.has_sequence) detected.push("a sequential pattern"); else notDetected.push("sequence");
    if (features.has_leetspeak) detected.push("leetspeak"); else notDetected.push("leetspeak");
    if (features.numeric_prefix) detected.push("numeric prefix"); else notDetected.push("numeric prefix");
    if (features.numeric_infix) detected.push("numeric infix"); else notDetected.push("numeric infix");
    if (features.has_repetition) detected.push("repeated characters"); else notDetected.push("repetition");

    let detectionSentence = "";
    if (features.dictionary_present) {
        if (detected.length === 1) {
            detectionSentence = `A dictionary word was detected, while no ${notDetected.join(", ")} was found.`;
        } else {
            const detectedStr = detected.join(", ");
            detectionSentence = `${detectedStr} were detected, while no ${notDetected.filter(d => d !== 'dictionary word').join(", ")} were found.`;
        }
    } else if (features.numeric_infix && !features.dictionary_present) {
        detectionSentence = `No dictionary word, leetspeak, numeric prefix or suffix, sequence, or repeated characters were detected. Numbers were found in the middle of the password,`;
    } else if (detected.length === 0) {
        detectionSentence = "No dictionary word, leetspeak, numeric prefix or suffix, sequence, or repeated characters were detected.";
    } else {
        detectionSentence = `${detected.join(", ")} was detected, while no ${notDetected.join(", ")} were found.`;
    }

    const presentClasses = [];
    const missingClasses = [];

    if (features.has_lowercase) presentClasses.push("lowercase"); else missingClasses.push("uppercase, numbers, or symbols");
    if (features.has_uppercase) presentClasses.push("uppercase");
    if (features.has_digit) presentClasses.push("digits");
    if (features.has_symbol) presentClasses.push("symbols");

    let charSentence = "";
    const charCount = features.character_class_count;
    const charGuideline = charCount >= 3 
        ? "meets the guideline." 
        : "below the 3-type guideline";

    if (charCount === 1) {
        charSentence = `and has ${presentClasses.join(", ")} but lacks ${missingClasses.join(", ")}, resulting in 1 type, ${charGuideline}`;
    } else {
        charSentence = `and has ${presentClasses.join(", ")}, giving it ${charCount} types, ${charGuideline}`;
    }

    const len = features.length;
    const lenGuideline = len >= 12 
        ? `meets the 12-character guideline.` 
        : `is below the 12-character guideline`;
    const lengthSentence = `Its ${len}-character length ${lenGuideline}`;

    let conclusion = "";
    if (level === "CRITICAL") {
        conclusion = "Dictionary word and low variety led to CRITICAL risk.";
    } else if (level === "HIGH") {
        conclusion = "Recognizable word and predictable patterns led to HIGH risk.";
    } else if (level === "MODERATE" && vulnerabilityType === "BRUTE-FORCE") {
        conclusion = `A rule-based pattern was detected, but the decision path led to BRUTE-FORCE and MODERATE risk.`;
    } else {
        conclusion = `These features support the ${level} risk rating.`;
    }

    return `The system examined all 14 features. ${detectionSentence} ${charSentence} ${lengthSentence} ${conclusion}`;
}

function explainRisk(features, level, treeRoot, vulnerabilityType, lang = 'en') {
    const contributions = [];

    if (lang === 'tl') {
        contributions.push(`+${features.length} puntos mula sa haba ng password (${features.length} na karakter).`);
        contributions.push(`+${features.character_class_count * 10} puntos mula sa paggamit ng ${features.character_class_count} uri ng karakter (maliit/malaking titik, numero, simbolo).`);
        if (features.dictionary_present) contributions.push("-20 puntos: may natukoy na salita mula sa diksyonaryo.");
        if (features.rule_pattern_present) contributions.push("-15 puntos: may natukoy na hulaang pattern (leetspeak, numero sa dulo, sequence, o inulit na karakter).");
        if (features.has_sequence) contributions.push("-10 puntos: may natukoy na sunod-sunod na pattern (hal. abc, 123).");
        if (features.has_repetition) contributions.push("-10 puntos: may natukoy na mga inulit na karakter.");
    } else {
        contributions.push(`+${features.length} points from password length (${features.length} characters).`);
        contributions.push(`+${features.character_class_count * 10} points from using ${features.character_class_count} character class${features.character_class_count === 1 ? "" : "es"} (lowercase/uppercase/digits/symbols).`);
        if (features.dictionary_present) contributions.push("-20 points: a dictionary word was detected.");
        if (features.rule_pattern_present) contributions.push("-15 points: a predictable rule-based pattern was detected (leetspeak, numeric suffix, sequence, or repetition).");
        if (features.has_sequence) contributions.push("-10 points: a sequential pattern (e.g. abc, 123) was detected.");
        if (features.has_repetition) contributions.push("-10 points: repeated characters were detected.");
    }

    const score = calculateSecurityScore(features);
    const modelSteps = buildManualFeatureSteps(features, lang);
    const summary = buildRiskModelRationale(features, level, vulnerabilityType, lang);

    return {
        risk_level: level,
        security_score: score,
        summary,
        model_decision_steps: modelSteps,
        contributing_factors: contributions
    };
}

const MANUAL_TREE_THRESHOLDS = {
    length: 12,
    character_class_count: 3
};

function computeRuntimeDeficits(f) {
    return {
        AVOID_DICTIONARY_WORDS: f.dictionary_present ? 20 : 0,
        AVOID_PREDICTABLE_PATTERNS: f.rule_pattern_present ? 15 : 0,
        ADD_CHARACTER_VARIETY: Math.max(0, MANUAL_TREE_THRESHOLDS.character_class_count - f.character_class_count) * 10,
        INCREASE_LENGTH: Math.max(0, MANUAL_TREE_THRESHOLDS.length - f.length) * 1
    };
}

function pickSecondRecommendationLabel(extractedFeatures, topLabel) {
    const deficits = computeRuntimeDeficits(extractedFeatures);
    const ranked = Object.entries(deficits)
        .filter(([label]) => label !== topLabel)
        .sort((a, b) => b[1] - a[1]);

    if (ranked.length === 0 || ranked[0][1] === 0) {
        return null;
    }
    return ranked[0][0];
}

function generateSimilarGuessablePasswords(password, extractedFeatures) {
    if (!extractedFeatures.dictionary_present || !extractedFeatures._matched_dictionary_word) {
        const symbols = ['!', '@', '#', '$', '%', '&', '*'];
        const digits = '0123456789';
        const lower = 'abcdefghijklmnopqrstuvwxyz';
        const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        function randChar(str) { return str[Math.floor(Math.random() * str.length)]; }

        const len = Math.min(Math.max(extractedFeatures.length, 4), 20);
        const pools = [];
        if (extractedFeatures.has_lowercase) pools.push(lower);
        if (extractedFeatures.has_uppercase) pools.push(upper);
        if (extractedFeatures.has_digit) pools.push(digits);
        if (extractedFeatures.has_symbol) pools.push(symbols);
        if (pools.length === 0) pools.push(lower);
        const combinedPool = pools.join('');

        const examples = [];
        for (let i = 0; i < 3; i++) {
            let s = '';
            for (let j = 0; j < len; j++) s += randChar(combinedPool);
            examples.push(s);
        }
        return { core: null, examples };
    }

    const core = extractedFeatures._matched_dictionary_word.split(", ")[0];
    const titleCase = core.charAt(0).toUpperCase() + core.slice(1);

    const leet = s => s.replace(/a/g, '@').replace(/o/g, '0').replace(/e/g, '3').replace(/i/g, '1').replace(/s/g, '$');
    const symbols = ['!', '@', '#', '$', '%', '&', '*'];
    const years = ['2024', '2025', '1995', '2000', '2010'];
    const randOf = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const randDigits = (n) => Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join('');

    const recipes = [
        () => `${core}${randDigits(3)}`,
        () => `${core}${randDigits(1)}`,
        () => `${leet(core)}${randDigits(3)}`,
        () => `${titleCase}${randOf(symbols)}`,
        () => `${titleCase}${randDigits(2)}`,
        () => `${randOf(symbols)}${core}${randDigits(2)}`,
        () => `${core}${core}`,
        () => `${core.split('').reverse().join('')}`,
        () => `${core}${randOf(years)}`,
        () => `${core}${randOf(symbols)}${randDigits(2)}`,
        () => `${leet(titleCase)}`,
        () => `${titleCase}${core.slice(0, 2)}${randDigits(1)}`
    ];

    const shuffled = [...recipes].sort(() => Math.random() - 0.5);
    const examples = shuffled.slice(0, 3).map(recipe => recipe());

    return { core, examples };
}

function pickVariant(variants) {
    return variants[Math.floor(Math.random() * variants.length)];
}

const RECOMMENDATION_LABEL_TEMPLATES = {
    en: {
        AVOID_DICTIONARY_WORDS: (f, password) => {
            const passphrase = suggestPassphrase();
            return pickVariant([
                `Try "${passphrase}" for better unpredictability`,
                `Try "${passphrase}" for a stronger structure.`,
                `Try "${passphrase}" for a harder-to-guess password.`
            ]);
        },
        AVOID_PREDICTABLE_PATTERNS: (f, password) => {
            return pickVariant([
                `Mix numbers, symbols, and letters throughout the password`,
                `Mix numbers and symbols instead of only adding them at the ends.`,
                `Use a random combination instead of modifying a basic word.`
            ]);
        },
        ADD_CHARACTER_VARIETY: (f, password) => {
            const target = MANUAL_TREE_THRESHOLDS.character_class_count;
            return pickVariant([
                `Use at least ${target} character types for more variety`,
                `Adding missing types makes guessing harder.`,
                `Combine at least ${target} types for more variety.`
            ]);
        },
        INCREASE_LENGTH: (f, password) => {
            return pickVariant([
                `Adding characters increases the effort needed to guess it.`,
                `Make it longer to increase possible combinations.`,
                `Add a random word or phrase, avoiding obvious choices.`
            ]);
        }
    },
    tl: {
        AVOID_DICTIONARY_WORDS: (f, password) => {
            const passphrase = suggestPassphrase();
            return pickVariant([
                `Subukan ang "${passphrase}" para sa mas hindi mahulaang password.`,
                `Gumamit ng tulad ng "${passphrase}" para sa mas matibay na istraktura.`,
                `Subukan ang "${passphrase}" upang mas maging ligtas sa paghula.`
            ]);
        },
        AVOID_PREDICTABLE_PATTERNS: (f, password) => {
            return pickVariant([
                `Paghaluin ang mga numero, simbolo, at titik sa buong password.`,
                `Maglagay ng simbolo at numero sa gitna, hindi lamang sa dulo.`,
                `Gumamit ng random na kombinasyon sa halip na palitan lang ang ilang titik ng salita.`
            ]);
        },
        ADD_CHARACTER_VARIETY: (f, password) => {
            const target = MANUAL_TREE_THRESHOLDS.character_class_count;
            return pickVariant([
                `Gumamit ng hindi bababa sa ${target} uri ng karakter para sa mas maraming baryasyon.`,
                `Ang pagdaragdag ng kulang na uri ng karakter ay nagpapahirap sa paghula.`,
                `Pagsamahin ang hindi bababa sa ${target} na uri ng karakter.`
            ]);
        },
        INCREASE_LENGTH: (f, password) => {
            return pickVariant([
                `Ang pagpaphaba ng password ay nagpapadami sa kinakailangang oras upang hulaan ito.`,
                `Pahabain pa ito para mas dumami ang posibleng kombinasyon.`,
                `Magdagdag ng iba pang salita o parirala upang maging mas mahaba.`
            ]);
        }
    }
};

function suggestPassphrase() {
    const FALLBACK_WORDS = ["purple", "harbor", "lantern"];
    const symbols = ['!', '@', '#', '$', '%', '&', '*'];

    let words;
    if (passphraseWordPool.length >= 3) {
        const picked = new Set();
        while (picked.size < 3) {
            const candidate = passphraseWordPool[Math.floor(Math.random() * passphraseWordPool.length)];
            picked.add(candidate);
        }
        words = Array.from(picked);
    } else {
        words = FALLBACK_WORDS;
    }

    const capitalized = words.map(w => w.charAt(0).toUpperCase() + w.slice(1));
    const randomNumber = Math.floor(Math.random() * 90) + 10;
    const randomSymbol = symbols[Math.floor(Math.random() * symbols.length)];

    return `${capitalized.join('-')}-${randomNumber}${randomSymbol}`;
}

function getStrategies(vulnerabilityType, extractedFeatures, password, treeRoot, classificationRationale, recommendationResult, lang = 'en') {
    let tips = [];
    let attackVectorText = "";
    const templates = RECOMMENDATION_LABEL_TEMPLATES[lang] || RECOMMENDATION_LABEL_TEMPLATES['en'];

    if (lang === 'tl') {
        if (vulnerabilityType === "DICTIONARY") {
            const word = extractedFeatures._matched_dictionary_word ? ` ("${extractedFeatures._matched_dictionary_word}")` : "";
            attackVectorText = `Ang iyong password ay gumagamit ng karaniwang salita sa diksyonaryo${word}. Madaling masusubukan ng mga nakautomatikong tool ang mga ganitong kombinasyon.`;
        } else if (vulnerabilityType === "RULE-BASED") {
            const mods = [];
            if (extractedFeatures.has_leetspeak) mods.push("pagpapalit ng titik at simbolo");
            if (extractedFeatures.numeric_suffix) mods.push("numero sa dulo");
            if (extractedFeatures.numeric_prefix) mods.push("numero sa simula");
            if (extractedFeatures.numeric_infix) mods.push("numero sa gitna");
            
            const modStr = mods.length > 0 ? ` Gumamit ka ng ${mods.join(", at ")}.` : "";
            attackVectorText = `Ang iyong password ay gumagamit ng mga pagbabagong madaling hulaan.${modStr}`;
        } else if (vulnerabilityType === "BRUTE-FORCE") {
            attackVectorText = `Walang salitang diksyonaryo, ngunit ito ay maikli.`;
        } else {
            attackVectorText = `Lalapat ang karaniwang antas ng panganib.`;
        }
    } else {
        if (vulnerabilityType === "DICTIONARY") {
            const word = extractedFeatures._matched_dictionary_word ? ` ("${extractedFeatures._matched_dictionary_word}")` : "";
            attackVectorText = `Your password uses a common dictionary word${word}. Automated tools can easily test dictionary combinations.`;
        } else if (vulnerabilityType === "RULE-BASED") {
            const mods = [];
            if (extractedFeatures.has_leetspeak) mods.push("letter/symbol swaps");
            if (extractedFeatures.numeric_suffix) mods.push("ending number");
            if (extractedFeatures.numeric_prefix) mods.push("starting number");
            if (extractedFeatures.numeric_infix) mods.push("middle numbers");
            
            const modStr = mods.length > 0 ? ` You ${mods.join(", and ")}.` : "";
            attackVectorText = `Your password uses easy-to-guess changes.${modStr}`;
        } else if (vulnerabilityType === "BRUTE-FORCE") {
            attackVectorText = `No dictionary words, but it is short.`;
        } else {
            attackVectorText = `Standard risk applies.`;
        }
    }

    let technicalBreakdown = {
        vulnerability_explanation: classificationRationale || "",
        attack_vector: attackVectorText,
        remediation: ""
    };

    if (lang === 'tl') {
        if (vulnerabilityType === "DICTIONARY") {
            technicalBreakdown.remediation = `Subukang gumamit ng mga salitang walang kaugnayan sa isa't isa.`;
        } else if (vulnerabilityType === "RULE-BASED") {
            technicalBreakdown.remediation = `Paghaluin ang mga simbolo at numero sa buong password.`;
        } else if (vulnerabilityType === "BRUTE-FORCE") {
            technicalBreakdown.remediation = `Pahabain pa ito at dagdagan ang iba't ibang uri ng karakter.`;
        }
        tips.push("I-enable ang Multi-Factor Authentication (MFA) para sa karagdagang proteksyon.");
    } else {
        if (vulnerabilityType === "DICTIONARY") {
            technicalBreakdown.remediation = `Try unrelated words.`;
        } else if (vulnerabilityType === "RULE-BASED") {
            technicalBreakdown.remediation = `Mix symbols and numbers throughout.`;
        } else if (vulnerabilityType === "BRUTE-FORCE") {
            technicalBreakdown.remediation = `Make it longer with more character types.`;
        }
        tips.push("Enable MFA for extra protection.");
    }

    const currentPassword = password;

    if (recommendationResult && recommendationResult.label && templates[recommendationResult.label]) {
        tips.push(templates[recommendationResult.label](extractedFeatures, currentPassword));
    } else {
        tips.push(lang === 'tl' ? "Hindi available ang recommendation model sa ngayon." : "Recommendation model is unavailable right now.");
    }

    if (recommendationResult && recommendationResult.label) {
        const secondLabel = pickSecondRecommendationLabel(extractedFeatures, recommendationResult.label);
        if (secondLabel && templates[secondLabel]) {
            const addStr = lang === 'tl' ? "Bukod dito: " : "Additionally: ";
            tips.push(addStr + templates[secondLabel](extractedFeatures, currentPassword));
        } else {
            tips.push(lang === 'tl' ? "Gumamit ng password manager para sa mga natatanging password." : "Use a password manager for unique passwords.");
        }
    } else {
        tips.push(lang === 'tl' ? "Gumamit ng password manager para sa mga natatanging password." : "Use a password manager for unique passwords.");
    }

    if (recommendationResult && recommendationResult.label) {
        const similarGuesses = generateSimilarGuessablePasswords(currentPassword, extractedFeatures);
        if (similarGuesses.core) {
            tips.push(lang === 'tl' ? `Ang iyong password ay sumusunod sa mga pattern ng '${similarGuesses.core}'.` : `Your password follows '${similarGuesses.core}' patterns.`);
        } else {
            tips.push(lang === 'tl' ? `${extractedFeatures.length}-karakter na password na may karaniwang pattern.` : `${extractedFeatures.length}-character password with common patterns.`);
        }
    } else {
        tips.push(lang === 'tl' ? "Gumagamit ang mga tool sa paghula ng haba at mga uri ng karakter." : "Guessing tools use length and character types.");
    }

    return { tips, technicalBreakdown };
}

const FEATURE_LABELS = {
    en: {
        length: "Length",
        has_lowercase: "Has Lowercase",
        has_uppercase: "Has Uppercase",
        has_digit: "Has Digit",
        has_symbol: "Has Symbol",
        dictionary_present: "Dictionary Present",
        has_leetspeak: "Has Leetspeak",
        numeric_prefix: "Numeric Prefix",
        numeric_suffix: "Numeric Suffix",
        numeric_infix: "Numeric Substring / Infix",
        has_sequence: "Has Sequence",
        has_repetition: "Has Repetition",
        character_class_count: "Character Class Count",
        rule_pattern_present: "Rule Pattern Present"
    },
    tl: {
        length: "Haba ng Password",
        has_lowercase: "May Maliit na Titik (Lowercase)",
        has_uppercase: "May Malaking Titik (Uppercase)",
        has_digit: "May Numero (Digit)",
        has_symbol: "May Simbolo (Symbol)",
        dictionary_present: "May Salitang Diksyonaryo",
        has_leetspeak: "May Leetspeak (Palit-simbolo)",
        numeric_prefix: "Numero sa Simula (Prefix)",
        numeric_suffix: "Numero sa Dulo (Suffix)",
        numeric_infix: "Numero sa Gitna (Infix)",
        has_sequence: "May Sunod-sunod na Pattern (Sequence)",
        has_repetition: "May Inulit na Karakter",
        character_class_count: "Dami ng Uri ng Karakter",
        rule_pattern_present: "May Pattern Batay sa Alituntunin"
    }
};

const FEATURE_COLUMNS = [
    {
        key: "length",
        question: (t, lang = 'en') => lang === 'tl' ? `Haba >= ${Math.round(t)}?` : `Length >= ${Math.round(t)}?`,
        explain: {
            en: { YES: "Password length meets the standard requirement.", NO: "Password is too short." },
            tl: { YES: "Sapat ang haba ng password ayon sa pamantayan.", NO: "Masyadong maikli ang password." }
        }
    },
    {
        key: "character_class_count",
        question: (t, lang = 'en') => lang === 'tl' ? `Dami ng Uri ng Karakter >= ${Math.round(t)}?` : `Character Class Count >= ${Math.round(t)}?`,
        explain: {
            en: { YES: "Sufficient variety of character types.", NO: "Insufficient variety of character types." },
            tl: { YES: "Sapat ang iba't ibang uri ng karakter.", NO: "Kulang sa baryasyon ng uri ng karakter." }
        }
    },
    { key: "has_lowercase", question: (t, lang = 'en') => lang === 'tl' ? "Maliit na Titik" : "Lowercase Letters", explain: { en: { YES: "Contains lowercase letters.", NO: "No lowercase letters." }, tl: { YES: "Naglalaman ng maliliit na titik.", NO: "Walang maliliit na titik." } } },
    { key: "has_uppercase", question: (t, lang = 'en') => lang === 'tl' ? "Malaking Titik" : "Uppercase Letters", explain: { en: { YES: "Contains uppercase letters.", NO: "No uppercase letters." }, tl: { YES: "Naglalaman ng malalaking titik.", NO: "Walang malalaking titik." } } },
    { key: "has_digit", question: (t, lang = 'en') => lang === 'tl' ? "Mga Numero" : "Digits", explain: { en: { YES: "Contains digits.", NO: "No digits." }, tl: { YES: "Naglalaman ng mga numero.", NO: "Walang mga numero." } } },
    { key: "has_symbol", question: (t, lang = 'en') => lang === 'tl' ? "Mga Simbolo" : "Symbols", explain: { en: { YES: "Contains symbols.", NO: "No symbols." }, tl: { YES: "Naglalaman ng mga simbolo.", NO: "Walang mga simbolo." } } },
    { key: "dictionary_present", question: (t, lang = 'en') => lang === 'tl' ? "Salitang Diksyonaryo" : "Dictionary Word", branchLabels: { en: ["Present", "Not Present"], tl: ["Mayroon", "Wala"] }, explain: { en: { YES: "Dictionary word detected.", NO: "No dictionary word detected." }, tl: { YES: "May natukoy na salita mula sa diksyonaryo.", NO: "Walang natukoy na salita mula sa diksyonaryo." } } },
    { key: "has_leetspeak", question: (t, lang = 'en') => lang === 'tl' ? "Leetspeak Pattern" : "Leetspeak", explain: { en: { YES: "Leetspeak pattern detected.", NO: "No leetspeak pattern detected." }, tl: { YES: "May natukoy na leetspeak pattern.", NO: "Walang natukoy na leetspeak pattern." } } },
    { key: "numeric_prefix", question: (t, lang = 'en') => lang === 'tl' ? "Numero sa Simula" : "Numeric Prefix", explain: { en: { YES: "Contains numbers at the beginning (prefix).", NO: "No numbers at the beginning." }, tl: { YES: "May numero sa simula.", NO: "Walang numero sa simula." } } },
    { key: "numeric_suffix", question: (t, lang = 'en') => lang === 'tl' ? "Numero sa Dulo" : "Numeric Suffix", explain: { en: { YES: "Contains numbers at the end (suffix).", NO: "No numbers at the end." }, tl: { YES: "May numero sa dulo.", NO: "Walang numero sa dulo." } } },
    { key: "numeric_infix", question: (t, lang = 'en') => lang === 'tl' ? "Numero sa Gitna" : "Numeric Substring / Infix", explain: { en: { YES: "Contains numbers in the middle (infix).", NO: "No numbers in the middle." }, tl: { YES: "May numero sa gitna.", NO: "Walang numero sa gitna." } } },
    { key: "has_sequence", question: (t, lang = 'en') => lang === 'tl' ? "Sunod-sunod na Pattern" : "Sequential Pattern", explain: { en: { YES: "Contains sequential patterns (e.g., 123, abc).", NO: "No sequential patterns." }, tl: { YES: "May sunod-sunod na pattern (hal. 123, abc).", NO: "Walang sunod-sunod na pattern." } } },
    { key: "has_repetition", question: (t, lang = 'en') => lang === 'tl' ? "Inulit na Karakter" : "Repetition Pattern", explain: { en: { YES: "Contains repeated characters.", NO: "No repeated characters." }, tl: { YES: "May mga inulit na karakter.", NO: "Walang inulit na karakter." } } },
    { key: "rule_pattern_present", question: (t, lang = 'en') => lang === 'tl' ? "Rule-Based Pattern" : "Rule-Based Pattern", explain: { en: { YES: "Rule-based pattern detected.", NO: "No rule-based pattern detected." }, tl: { YES: "May natukoy na rule-based pattern.", NO: "Walang natukoy na rule-based pattern." } } }
];

const DECISION_TREE_ORDER = [
    "dictionary_present",
    "has_leetspeak",
    "numeric_prefix",
    "numeric_suffix",
    "numeric_infix",
    "has_sequence",
    "has_repetition",
    "has_lowercase",
    "has_uppercase",
    "has_digit",
    "has_symbol",
    "character_class_count",
    "length",
    "rule_pattern_present"
];

const AGGREGATE_FEATURE_BREAKDOWN = {
    character_class_count: ["has_lowercase", "has_uppercase", "has_digit", "has_symbol"],
    rule_pattern_present: ["has_leetspeak", "numeric_suffix", "has_sequence", "has_repetition"]
};

function buildAggregateBreakdown(featureKey, extractedFeatures, lang = 'en') {
    const subKeys = AGGREGATE_FEATURE_BREAKDOWN[featureKey];
    if (!subKeys) return null;

    const labels = FEATURE_LABELS[lang] || FEATURE_LABELS['en'];

    return subKeys.map((subKey) => {
        const meta = FEATURE_COLUMNS.find((f) => f.key === subKey);
        const present = extractedFeatures[subKey] === 1;
        const expObj = meta ? (meta.explain[lang] || meta.explain['en']) : null;

        return {
            feature: subKey,
            label: labels[subKey],
            present: present,
            explanation: expObj ? (present ? expObj.YES : expObj.NO) : ""
        };
    });
}

function explainClassification(extractedFeatures, vulnerabilityType, lang = 'en') {
    const LABELS = FEATURE_LABELS[lang] || FEATURE_LABELS['en'];
    const NUMERIC_KEYS = new Set(["length", "character_class_count"]);

    const feature_checklist = FEATURE_COLUMNS.map((meta) => {
        const value = extractedFeatures[meta.key];
        const expObj = meta.explain[lang] || meta.explain['en'];

        if (NUMERIC_KEYS.has(meta.key)) {
            let exp = "";
            if (lang === 'tl') {
                exp = meta.key === "length"
                    ? `Ang haba ng password ay ${value} na karakter.`
                    : `Gumagamit ang password ng ${value} uri ng karakter (mula sa 4 na posibleng uri: maliit na titik, malaking titik, numero, simbolo).`;
            } else {
                exp = meta.key === "length"
                    ? `Password length is ${value} character${value === 1 ? "" : "s"}.`
                    : `Password uses ${value} character class${value === 1 ? "" : "es"} (out of 4 possible: lowercase, uppercase, digit, symbol).`;
            }

            return {
                feature: meta.key,
                label: LABELS[meta.key],
                value: value,
                explanation: exp
            };
        }

        const present = value === 1;
        return {
            feature: meta.key,
            label: LABELS[meta.key],
            value: present,
            explanation: present ? expObj.YES : expObj.NO
        };
    });

    let classification_rationale;

    if (lang === 'tl') {
        if (vulnerabilityType === "DICTIONARY") {
            classification_rationale = `Na-classify bilang DICTIONARY dahil sa mga natukoy na kilalang salita.`;
        } else if (vulnerabilityType === "RULE-BASED") {
            classification_rationale = `Ang mga pagbabagong leetspeak/pattern ang nag-trigger sa Rule-Based node.`;
        } else if (vulnerabilityType === "BRUTE-FORCE") {
            classification_rationale = `Na-classify bilang BRUTE-FORCE dahil walang nahanap na salitang diksyonaryo.`;
        } else {
            classification_rationale = `Resulta ng classification: ${vulnerabilityType}.`;
        }
    } else {
        if (vulnerabilityType === "DICTIONARY") {
            classification_rationale = `Classified as DICTIONARY due to recognizable words`;
        } else if (vulnerabilityType === "RULE-BASED") {
            classification_rationale = `Leetspeak changes triggered the Rule-Based node.`;
        } else if (vulnerabilityType === "BRUTE-FORCE") {
            classification_rationale = `Classified as BRUTE-FORCE due to no dictionary words.`;
        } else {
            classification_rationale = `Classification result: ${vulnerabilityType}.`;
        }
    }

    return { feature_checklist, classification_rationale };
}

function buildManualDecisionPath(extractedFeatures, finalLabel, lang = 'en') {
    function leaf(label) {
        return {
            name: label,
            type: "result",
            final: true,
            result: label,
            on_path: true
        };
    }

    function previewNode(nextMeta) {
        if (!nextMeta) {
            return { name: lang === 'tl' ? "Resulta" : "Result", type: "preview", on_path: false, children: [] };
        }
        return {
            name: nextMeta.question(MANUAL_TREE_THRESHOLDS[nextMeta.key] ?? 1, lang),
            type: "preview",
            feature: nextMeta.key,
            on_path: false,
            children: []
        };
    }

    function decisionNode(meta, answer, breakdown, nextChild, nextMeta) {
        const threshold = MANUAL_TREE_THRESHOLDS[meta.key] ?? 1;
        const bObj = meta.branchLabels ? (meta.branchLabels[lang] || meta.branchLabels['en']) : null;
        const [yesLabel, noLabel] = bObj || (lang === 'tl' ? ["Oo", "Hindi"] : ["Yes", "No"]);
        const preview = previewNode(nextMeta);
        const expObj = meta.explain[lang] || meta.explain['en'];

        return {
            name: meta.question(threshold, lang),
            type: "decision",
            feature: meta.key,
            value: answer === "YES" ? 1 : 0,
            decision: answer,
            explanation: { YES: expObj.YES, NO: expObj.NO },
            breakdown: breakdown || null,
            on_path: true,
            children: [
                {
                    name: yesLabel,
                    branch: "YES",
                    taken: answer === "YES",
                    explanation: expObj.YES,
                    children: [answer === "YES" ? nextChild : preview]
                },
                {
                    name: noLabel,
                    branch: "NO",
                    taken: answer === "NO",
                    explanation: expObj.NO,
                    children: [answer === "NO" ? nextChild : preview]
                }
            ]
        };
    }

    let node = leaf(finalLabel);
    let nextMeta = null;
    for (let i = DECISION_TREE_ORDER.length - 1; i >= 0; i--) {
        const key = DECISION_TREE_ORDER[i];
        const meta = FEATURE_COLUMNS.find((f) => f.key === key);
        if (!meta) continue;

        const threshold = MANUAL_TREE_THRESHOLDS[meta.key] ?? 1;
        const actualValue = extractedFeatures[meta.key];
        const answer = actualValue >= threshold ? "YES" : "NO";
        const breakdown = buildAggregateBreakdown(meta.key, extractedFeatures, lang);
        node = decisionNode(meta, answer, breakdown, node, nextMeta);
        nextMeta = meta;
    }

    return node;
}

// ===== API ROUTE =====
app.post('/analyze', (req, res) => {
    const { password, previousPassword, lang } = req.body;

    const selectedLang = lang === 'tl' ? 'tl' : 'en';

    if (!password) {
        return res.status(400).json({ 
            error: selectedLang === 'tl' ? "Kailangan ang password" : "Password is required" 
        });
    }

    const extractedFeatures = extractFeatures(password);
    console.log("FEATURES:", extractedFeatures);

    const modelFeatures = [[
        extractedFeatures.length,
        extractedFeatures.character_class_count,
        extractedFeatures.has_lowercase,
        extractedFeatures.has_uppercase,
        extractedFeatures.has_digit,
        extractedFeatures.has_symbol,
        extractedFeatures.dictionary_present,
        extractedFeatures.has_leetspeak,
        extractedFeatures.numeric_prefix,
        extractedFeatures.numeric_suffix,
        extractedFeatures.numeric_infix,
        extractedFeatures.has_sequence,
        extractedFeatures.has_repetition,
        extractedFeatures.rule_pattern_present
    ]];

    const currentRiskLevel = classifyRisk(extractedFeatures);

    let comparisonResult = null;
    if (previousPassword) {
        const previousFeatures = extractFeatures(previousPassword);
        const previousRiskLevel = classifyRisk(previousFeatures);

        if (password === previousPassword) {
            const identicalScore = calculateSecurityScore(extractedFeatures);
            comparisonResult = {
                status: "IDENTICAL",
                current_score: identicalScore,
                previous_score: identicalScore,
                message: selectedLang === 'tl' 
                    ? "Ang kasalukuyan mong password ay katulad mismo ng nakaraang password, kaya magkatulad ang kanilang mga katangiang pangkapanatagan."
                    : "Your current password is identical to your previous password, so they share the exact same security characteristics."
            };
        } else {
            comparisonResult = comparePasswords(
                extractedFeatures,
                previousFeatures,
                currentRiskLevel,
                previousRiskLevel,
                selectedLang
            );
        }

        console.log("PREVIOUS FEATURES:", previousFeatures);
        console.log("COMPARISON:", comparisonResult);
    }

    const classificationResult = classifyPassword(extractedFeatures, selectedLang);
    const riskExplanation = explainRisk(extractedFeatures, currentRiskLevel, riskModel ? riskModel.root : null, classificationResult.label, selectedLang);

    console.log("RAW PREDICTION (RISK):", riskClassifier ? riskClassifier.predict(modelFeatures) : "N/A");
    console.log("RISK:", currentRiskLevel);

    const recommendationResult = classifyRecommendation(extractedFeatures, selectedLang);
    console.log("RECOMMENDATION:", recommendationResult.label);

    const fullClassificationExplanation = explainClassification(extractedFeatures, classificationResult.label, selectedLang);

    const { tips, technicalBreakdown } = getStrategies(
        classificationResult.label,
        extractedFeatures,
        password,
        model.root,
        fullClassificationExplanation.classification_rationale,
        recommendationResult,
        selectedLang
    );

    const actualModelDecisionPath = buildManualDecisionPath(extractedFeatures, classificationResult.label, selectedLang);
    const entropyBits = Math.round(password.length * Math.log2(extractedFeatures.character_class_count * 22 || 26));

    console.log("PASSWORD:", password);
    console.log("RESULT:", classificationResult);

    const yesStr = selectedLang === 'tl' ? "Oo" : "Yes";
    const noStr = selectedLang === 'tl' ? "Hindi" : "No";

    res.json({
        password: password,
        vulnerability: classificationResult.label,
        decision_path: classificationResult.path,
        features: extractedFeatures,
        password_comparison: comparisonResult,
        actual_model_decision_path: actualModelDecisionPath,
        analytics_breakdown: {
            password_length: extractedFeatures.length,
            character_classes_used: extractedFeatures.character_class_count,
            estimated_entropy_bits: entropyBits,
            dictionary_found: extractedFeatures.dictionary_present === 1 ? yesStr : noStr,
            rule_pattern_active: extractedFeatures.rule_pattern_present === 1 ? yesStr : noStr
        },
        risk_level: currentRiskLevel,
        risk_assessment: riskExplanation,
        recommendation_label: recommendationResult.label,
        classification_explanation: fullClassificationExplanation,
        security_assessment: technicalBreakdown,
        strategies: tips,
        dataset_count: trainingDataset.length
    });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});