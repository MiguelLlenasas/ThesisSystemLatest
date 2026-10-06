console.log("Classification JS Connected");


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
            getRiskLevel(data);
    }

    if (score) {
        score.textContent =
            getSecurityScore(data);
    }

    if (summary) {
        summary.innerHTML = `
            <p>${getClassificationSummary(data)}</p>
            ${getRiskExplanationHTML(data)}
        `;
    }

    if (message) {
        if (localStorage.getItem("comparisonPassword")) {
            message.textContent =
                "Password comparison results show key similarities, differences, and security risks.";

            message.style.display = "block";
        } else {
            message.style.display = "none";
        }
    }

    resetPasswordDisplay();
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

function getClassificationSummary(data) {
    if (!data) {
        return "No explanation available.";
    }

    const classificationExplanation =
        data.classification_explanation || {};

    return (
        classificationExplanation.classification_rationale ||
        data.security_assessment?.vulnerability_explanation ||
        "No explanation available."
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

function getRiskLevel(data) {
    if (!data) {
        return "UNKNOWN";
    }

    const risk =
        data.risk_level ||
        data.risk_assessment?.risk_level ||
        "UNKNOWN";

    if (
        String(risk)
            .trim()
            .toUpperCase() === "UNKNOWN"
    ) {
        return "UNKNOWN";
    }

    return `${String(risk).trim().toUpperCase()} RISK`;
}


/* =========================================================
   RISK EXPLANATION
   ========================================================= */

function getRiskExplanationHTML(data) {
    const riskAssessment =
        data?.risk_assessment;

    if (
        !riskAssessment ||
        !riskAssessment.summary
    ) {
        return "";
    }

    return `
        <div class="risk-explanation">
            <p class="risk-explanation-label">
                <strong>Why this risk level?</strong>
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

function getVulnerabilityInfo(vulnerability) {

    const normalized =
        String(vulnerability || "")
            .trim()
            .toLowerCase()
            .replace(/[\s-]+/g, "_");

    const explanations = {

        brute_force:
            "An attack that systematically tries many possible character combinations until the correct password is found.",

        dictionary:
            "An attack that tries passwords from a predefined list of common words, passwords, and phrases.",

        rule_based:
            "An attack that applies common password patterns and modifications to dictionary words or known passwords."
    };

    return (
        explanations[normalized] ||
        "The detected vulnerability describes the type of password-cracking technique most associated with this password."
    );
}


/* =========================================================
   RISK INFO
   ========================================================= */

function getRiskInfo(risk) {

    const normalized =
        String(risk || "")
            .trim()
            .toLowerCase();

    const explanations = {

        moderate:
            "The password has some weaknesses that could make it vulnerable to common cracking techniques.",

        medium:
            "The password has some weaknesses that could make it vulnerable to common cracking techniques.",

        high:
            "The password has significant weaknesses that make it more susceptible to password-cracking attacks.",

        critical:
            "The password has severe weaknesses and may be quickly compromised using common cracking techniques."
    };

    return (
        explanations[normalized] ||
        "The risk level indicates how vulnerable the password may be to password-cracking techniques."
    );
}


/* =========================================================
   UPDATE INFO CARD CONTENT
   ========================================================= */

function updateInfoCards(data) {

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
            getVulnerabilityInfo(vulnerability);
    }

    if (riskText) {
        riskText.textContent =
            getRiskInfo(risk);
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
    const passwordBox =
        document.getElementById("testedPassword");

    const passwordToggle =
        document.getElementById("passwordToggle");

    if (!passwordBox || !passwordToggle) {
        return;
    }

    const password =
        getTestedPassword();

    passwordBox.classList.remove("revealed");
    passwordToggle.classList.remove("active");

    passwordToggle.setAttribute(
        "aria-label",
        "Show password"
    );

    passwordToggle.setAttribute(
        "title",
        "Show password"
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

    passwordBox.textContent =
        password;

    passwordBox.classList.add("revealed");

    passwordToggle.classList.add("active");

    passwordToggle.setAttribute(
        "aria-label",
        "Hide password"
    );

    passwordToggle.setAttribute(
        "title",
        "Hide password"
    );
}


/* =========================================================
   HIDE PASSWORD
   ========================================================= */

function hideTestedPassword() {
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

    passwordBox.textContent =
        "*".repeat(password.length);

    passwordBox.classList.remove("revealed");

    passwordToggle.classList.remove("active");

    passwordToggle.setAttribute(
        "aria-label",
        "Show password"
    );

    passwordToggle.setAttribute(
        "title",
        "Show password"
    );
}


/* =========================================================
   CLICK HANDLER
   =========================================================

   Handles:

   1. Info card X button
   2. Vulnerability ?
   3. Risk ?
   4. Click outside info card
   5. Password box
   6. Eye button
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

        /*
         * Ignore clicks outside both elements.
         */
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

        /*
         * The active class is the single
         * source of truth for the state.
         */
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

