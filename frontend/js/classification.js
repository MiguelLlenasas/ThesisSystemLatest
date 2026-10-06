console.log("Classification JS Connected");

/* =========================================================
   LANGUAGE HELPER
   ========================================================= */

function getCurrentLang() {
    return localStorage.getItem("app_lang") || "en";
}


/* =========================================================
   CLASSIFICATION UPDATE
   ========================================================= */

function updateClassification(data) {
    if (!data) return;

    renderClassification(data);
}


/* =========================================================
   RENDER CLASSIFICATION
   ========================================================= */

function renderClassification(data) {
    const lang = getCurrentLang();

    const vulnerability =
        document.getElementById("VulnerabilityFound");

    const risk =
        document.getElementById("riskLevel");

    const score =
        document.getElementById("securityScore");

    const summary =
        document.getElementById("summaryText");

    const message =
        document.getElementById("classificationMessage");

    if (vulnerability) {
        vulnerability.textContent =
            data.vulnerability || "-";
    }

    if (risk) {
        const riskClass =
            getRiskClass(data);

        risk.className = "risk-value";

        if (riskClass) {
            risk.classList.add(riskClass);
        }

        risk.textContent =
            getRiskLevel(data, lang);
    }

    if (score) {
        score.textContent =
            getSecurityScore(data);
    }

    if (summary) {
        summary.innerHTML = `
            <p>${getClassificationSummary(data, lang)}</p>
            ${getRiskExplanationHTML(data, lang)}
        `;
    }

    if (message) {
        if (localStorage.getItem("comparisonPassword")) {
            message.textContent = lang === "tl"
                ? "Ipinapakita ng resulta ng paghahambing ng password ang mga pangunahing pagkakatulad, pagkakaiba, at mga panganib sa seguridad."
                : "Password comparison results show key similarities, differences, and security risks.";

            message.style.display = "block";
        } else {
            message.style.display = "none";
        }
    }

    resetPasswordDisplay();
    updateInfoCards(data);
}


/* =========================================================
   RISK CLASS
   ========================================================= */

function getRiskClass(data) {
    if (!data) {
        return "";
    }

    const risk =
        data.risk_level ||
        data.risk_assessment?.risk_level ||
        "";

    const normalized =
        String(risk)
            .trim()
            .toLowerCase();

    if (normalized.includes("critical")) {
        return "risk-critical";
    }

    if (normalized.includes("high")) {
        return "risk-high";
    }

    if (
        normalized.includes("moderate") ||
        normalized.includes("medium")
    ) {
        return "risk-moderate";
    }

    return "";
}


/* =========================================================
   CLASSIFICATION SUMMARY
   ========================================================= */

function getClassificationSummary(data, lang = "en") {
    if (!data) {
        return lang === "tl" 
            ? "Walang available na paliwanag." 
            : "No explanation available.";
    }

    const classificationExplanation =
        data.classification_explanation || {};

    return (
        classificationExplanation.classification_rationale ||
        data.security_assessment?.vulnerability_explanation ||
        (lang === "tl" ? "Walang available na paliwanag." : "No explanation available.")
    );
}


/* =========================================================
   SECURITY SCORE
   ========================================================= */

function getSecurityScore(data) {
    if (!data) {
        return "--";
    }

    return (
        data.risk_assessment?.security_score ??
        "--"
    );
}


/* =========================================================
   RISK LEVEL
   ========================================================= */

function getRiskLevel(data, lang = "en") {
    if (!data) {
        return lang === "tl" ? "HINDI KILALA" : "UNKNOWN";
    }

    const risk =
        data.risk_level ||
        data.risk_assessment?.risk_level ||
        "UNKNOWN";

    const normalizedRisk = String(risk).trim().toUpperCase();

    if (normalizedRisk === "UNKNOWN") {
        return lang === "tl" ? "HINDI KILALA" : "UNKNOWN";
    }

    if (lang === "tl") {
        const riskTranslations = {
            "CRITICAL": "KRITIKAL NA PANGANIB",
            "HIGH": "MATAAS NA PANGANIB",
            "MODERATE": "KATAMTAMANG PANGANIB",
            "MEDIUM": "KATAMTAMANG PANGANIB"
        };
        return riskTranslations[normalizedRisk] || `${normalizedRisk} NA PANGANIB`;
    }

    return `${normalizedRisk} RISK`;
}


/* =========================================================
   RISK EXPLANATION
   ========================================================= */

function getRiskExplanationHTML(data, lang = "en") {
    const riskAssessment =
        data?.risk_assessment;

    if (
        !riskAssessment ||
        !riskAssessment.summary
    ) {
        return "";
    }

    const labelText = lang === "tl" 
        ? "Bakit ganito ang antas ng panganib?" 
        : "Why this risk level?";

    return `
        <div class="risk-explanation">
            <p class="risk-explanation-label">
                <strong>${labelText}</strong>
            </p>

            <p>
                ${riskAssessment.summary}
            </p>
        </div>
    `;
}


/* =========================================================
   VULNERABILITY INFO
   ========================================================= */

function getVulnerabilityInfo(vulnerability, lang = "en") {

    const normalized =
        String(vulnerability || "")
            .trim()
            .toLowerCase()
            .replace(/[\s-]+/g, "_");

    const explanations = {
        en: {
            brute_force:
                "An attack that systematically tries many possible character combinations until the correct password is found.",
            dictionary:
                "An attack that tries passwords from a predefined list of common words, passwords, and phrases.",
            rule_based:
                "An attack that applies common password patterns and modifications to dictionary words or known passwords.",
            default:
                "The detected vulnerability describes the type of password-cracking technique most associated with this password."
        },
        tl: {
            brute_force:
                "Isang pag-atake na sistematikong sinusubukan ang lahat ng posibleng kombinasyon ng karakter hanggang sa mahanap ang tamang password.",
            dictionary:
                "Isang pag-atake na sinusubukan ang mga password mula sa isang nakahandang listahan ng mga karaniwang salita at parirala.",
            rule_based:
                "Isang pag-atake na naglalapat ng mga karaniwang pattern at pagbabago (tulad ng leetspeak o numero) sa mga salitang diksyonaryo.",
            default:
                "Inilalarawan ng natukoy na kahinaan ang uri ng pamamaraan sa pag-crack ng password na karaniwang nauugnay dito."
        }
    };

    const langDict = explanations[lang] || explanations["en"];
    return langDict[normalized] || langDict["default"];
}


/* =========================================================
   RISK INFO
   ========================================================= */

function getRiskInfo(risk, lang = "en") {

    const normalized =
        String(risk || "")
            .trim()
            .toLowerCase();

    const explanations = {
        en: {
            moderate:
                "The password has some weaknesses that could make it vulnerable to common cracking techniques.",
            medium:
                "The password has some weaknesses that could make it vulnerable to common cracking techniques.",
            high:
                "The password has significant weaknesses that make it more susceptible to password-cracking attacks.",
            critical:
                "The password has severe weaknesses and may be quickly compromised using common cracking techniques.",
            default:
                "The risk level indicates how vulnerable the password may be to password-cracking techniques."
        },
        tl: {
            moderate:
                "Ang password ay may ilang kahinaan na maaaring maglagay dito sa panganib mula sa mga karaniwang pamamaraan ng pag-crack.",
            medium:
                "Ang password ay may ilang kahinaan na maaaring maglagay dito sa panganib mula sa mga karaniwang pamamaraan ng pag-crack.",
            high:
                "Ang password ay may malaking kahinaan na nagpapataas sa posibilidad na ito ay mahulaan o ma-crack.",
            critical:
                "Ang password ay may malalang kahinaan at madaling makuha gamit ang mga karaniwang tool sa pag-crack.",
            default:
                "Ipinapakita ng antas ng panganib kung gaano kabukas ang password sa mga banta ng pag-crack."
        }
    };

    const langDict = explanations[lang] || explanations["en"];
    return langDict[normalized] || langDict["default"];
}


/* =========================================================
   UPDATE INFO CARD CONTENT
   ========================================================= */

function updateInfoCards(data) {
    const lang = getCurrentLang();

    const vulnerability =
        data?.vulnerability || "";

    const risk =
        data?.risk_level ||
        data?.risk_assessment?.risk_level ||
        "";

    const vulnerabilityText =
        document.getElementById(
            "vulnerabilityInfoText"
        );

    const riskText =
        document.getElementById(
            "riskInfoText"
        );

    if (vulnerabilityText) {
        vulnerabilityText.textContent =
            getVulnerabilityInfo(vulnerability, lang);
    }

    if (riskText) {
        riskText.textContent =
            getRiskInfo(risk, lang);
    }
}


/* =========================================================
   INFO CARD STATE
   ========================================================= */

function closeInfoCards() {

    const vulnerabilityCard =
        document.getElementById(
            "vulnerabilityInfoCard"
        );

    const riskCard =
        document.getElementById(
            "riskInfoCard"
        );

    const vulnerabilityToggle =
        document.getElementById(
            "vulnerabilityInfoToggle"
        );

    const riskToggle =
        document.getElementById(
            "riskInfoToggle"
        );

    if (vulnerabilityCard) {
        vulnerabilityCard.hidden = true;
    }

    if (riskCard) {
        riskCard.hidden = true;
    }

    if (vulnerabilityToggle) {
        vulnerabilityToggle.setAttribute(
            "aria-expanded",
            "false"
        );
    }

    if (riskToggle) {
        riskToggle.setAttribute(
            "aria-expanded",
            "false"
        );
    }
}


/* =========================================================
   TOGGLE INFO CARD
   ========================================================= */

function toggleInfoCard(type) {

    const vulnerabilityCard =
        document.getElementById(
            "vulnerabilityInfoCard"
        );

    const riskCard =
        document.getElementById(
            "riskInfoCard"
        );

    const vulnerabilityToggle =
        document.getElementById(
            "vulnerabilityInfoToggle"
        );

    const riskToggle =
        document.getElementById(
            "riskInfoToggle"
        );

    if (
        !vulnerabilityCard ||
        !riskCard ||
        !vulnerabilityToggle ||
        !riskToggle
    ) {
        return;
    }

    if (type === "vulnerability") {

        const isOpen =
            !vulnerabilityCard.hidden;

        closeInfoCards();

        if (!isOpen) {

            vulnerabilityCard.hidden = false;

            vulnerabilityToggle.setAttribute(
                "aria-expanded",
                "true"
            );
        }

        return;
    }


    if (type === "risk") {

        const isOpen =
            !riskCard.hidden;

        closeInfoCards();

        if (!isOpen) {

            riskCard.hidden = false;

            riskToggle.setAttribute(
                "aria-expanded",
                "true"
            );
        }
    }
}


/* =========================================================
   TESTED PASSWORD
   ========================================================= */

function getTestedPassword() {
    return (
        localStorage.getItem("analyzedPassword") ||
        localStorage.getItem("currentPassword") ||
        ""
    );
}


/* =========================================================
   PASSWORD DISPLAY
   ========================================================= */

function resetPasswordDisplay() {
    const lang = getCurrentLang();

    const passwordBox =
        document.getElementById("testedPassword");

    const passwordToggle =
        document.getElementById("passwordToggle");

    if (!passwordBox || !passwordToggle) {
        return;
    }

    const password =
        getTestedPassword();

    const labelShow = lang === "tl" ? "Ipakita ang password" : "Show password";

    passwordBox.classList.remove("revealed");
    passwordToggle.classList.remove("active");

    passwordToggle.setAttribute(
        "aria-label",
        labelShow
    );

    passwordToggle.setAttribute(
        "title",
        labelShow
    );

    if (!password) {
        passwordBox.textContent = "******";
        return;
    }

    passwordBox.textContent =
        "*".repeat(password.length);
}


/* =========================================================
   SHOW PASSWORD
   ========================================================= */

function showTestedPassword() {
    const lang = getCurrentLang();

    const passwordBox =
        document.getElementById("testedPassword");

    const passwordToggle =
        document.getElementById("passwordToggle");

    if (!passwordBox || !passwordToggle) {
        return;
    }

    const password =
        getTestedPassword();

    if (!password) {
        return;
    }

    const labelHide = lang === "tl" ? "Itago ang password" : "Hide password";

    passwordBox.textContent =
        password;

    passwordBox.classList.add("revealed");

    passwordToggle.classList.add("active");

    passwordToggle.setAttribute(
        "aria-label",
        labelHide
    );

    passwordToggle.setAttribute(
        "title",
        labelHide
    );
}


/* =========================================================
   HIDE PASSWORD
   ========================================================= */

function hideTestedPassword() {
    const lang = getCurrentLang();

    const passwordBox =
        document.getElementById("testedPassword");

    const passwordToggle =
        document.getElementById("passwordToggle");

    if (!passwordBox || !passwordToggle) {
        return;
    }

    const password =
        getTestedPassword();

    if (!password) {
        return;
    }

    const labelShow = lang === "tl" ? "Ipakita ang password" : "Show password";

    passwordBox.textContent =
        "*".repeat(password.length);

    passwordBox.classList.remove("revealed");

    passwordToggle.classList.remove("active");

    passwordToggle.setAttribute(
        "aria-label",
        labelShow
    );

    passwordToggle.setAttribute(
        "title",
        labelShow
    );
}


/* =========================================================
   CLICK HANDLER
   ========================================================= */

document.addEventListener(
    "click",
    function (event) {

        /* =====================================================
           INFO CARD CLOSE BUTTON
           ===================================================== */

        const infoClose =
            event.target.closest(
                ".info-card-close"
            );

        if (infoClose) {

            closeInfoCards();

            return;
        }


        /* =====================================================
           VULNERABILITY INFO BUTTON
           ===================================================== */

        const vulnerabilityToggle =
            event.target.closest(
                "#vulnerabilityInfoToggle"
            );

        if (vulnerabilityToggle) {

            toggleInfoCard(
                "vulnerability"
            );

            return;
        }


        /* =====================================================
           RISK INFO BUTTON
           ===================================================== */

        const riskToggle =
            event.target.closest(
                "#riskInfoToggle"
            );

        if (riskToggle) {

            toggleInfoCard(
                "risk"
            );

            return;
        }


        /* =====================================================
           CLICK OUTSIDE INFO CARDS
           ===================================================== */

        const clickedInfoCard =
            event.target.closest(
                ".info-card"
            );

        if (!clickedInfoCard) {

            const vulnerabilityCard =
                document.getElementById(
                    "vulnerabilityInfoCard"
                );

            const riskCard =
                document.getElementById(
                    "riskInfoCard"
                );

            if (
                vulnerabilityCard &&
                !vulnerabilityCard.hidden
            ) {
                closeInfoCards();
            }

            if (
                riskCard &&
                !riskCard.hidden
            ) {
                closeInfoCards();
            }
        }


        /* =====================================================
           PASSWORD BOX / EYE BUTTON
           ===================================================== */

        const passwordBox =
            event.target.closest(
                "#testedPassword"
            );

        const passwordToggle =
            event.target.closest(
                "#passwordToggle"
            );

        if (
            !passwordBox &&
            !passwordToggle
        ) {
            return;
        }

        const toggle =
            document.getElementById(
                "passwordToggle"
            );

        if (!toggle) {
            return;
        }

        const isRevealed =
            toggle.classList.contains("active");

        if (isRevealed) {
            hideTestedPassword();
        } else {
            showTestedPassword();
        }
    }
);


/* =========================================================
   INITIAL LOAD
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        resetPasswordDisplay();

        closeInfoCards();
    }
);