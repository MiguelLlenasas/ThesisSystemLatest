/* FEATURE VECTOR featureVector.js
   Prevent global variable conflicts */
const FeatureVector = (() => {

    // =========================================================
    // UPDATE FEATURE VECTOR UI FROM DATA
    // =========================================================

    function updateFeatureVector(data) {

        console.log(
            "Updating Feature Vector UI with data:",
            data
        );

        if (!data) {
            console.error(
                "No data provided to Feature Vector"
            );
            return;
        }

        // Handle both raw backend data
        // OR nested { features: ... } format
        const features = data.features || data;

        if (!features) {
            console.error(
                "No feature vector properties found in data"
            );
            return;
        }

        // =====================================================
        // BASIC FEATURES
        // =====================================================

        setValue(
            "fvLength",
            features.length
        );

        setValue(
            "fvLowercase",
            convert(features.has_lowercase)
        );

        setValue(
            "fvUppercase",
            convert(features.has_uppercase)
        );

        setValue(
            "fvDigits",
            convert(features.has_digit)
        );

        setValue(
            "fvSymbols",
            convert(features.has_symbol)
        );

        setValue(
            "fvClasses",
            features.character_class_count
        );

        setValue(
            "fvPrefix",
            convert(features.numeric_prefix)
        );

        // =====================================================
        // PATTERN FEATURES
        // =====================================================

        setValue(
            "fvDictionary",
            convert(features.dictionary_present)
        );

        setValue(
            "fvLeetspeak",
            convert(features.has_leetspeak)
        );

        setValue(
            "fvSuffix",
            convert(features.numeric_suffix)
        );

        setValue(
            "fvSequence",
            convert(features.has_sequence)
        );

        setValue(
            "fvRepetition",
            convert(features.has_repetition)
        );

        setValue(
            "fvRulePattern",
            convert(features.rule_pattern_present)
        );

        setValue(
            "fvInfix",
            convert(features.numeric_infix)
        );
    }


    // =========================================================
    // SAFE ELEMENT UPDATE
    // =========================================================

    function setValue(id, value) {

        const element =
            document.getElementById(id);

        if (element) {
            element.textContent =
                value ?? "-";
        }
    }


    // =========================================================
    // BOOLEAN FORMAT
    // =========================================================

    function convert(value) {

        return (
            value === 1 ||
            value === true
        )
            ? "Present"
            : "Not Present";
    }


    // =========================================================
    // CLOSE ALL INFO CARDS
    // =========================================================

    function closeInfoCards() {

        const characteristicsCard =
            document.getElementById(
                "characteristicsInfoCard"
            );

        const vulnerabilityCard =
            document.getElementById(
                "vulnerabilityPatternsInfoCard"
            );

        const characteristicsToggle =
            document.getElementById(
                "characteristicsInfoToggle"
            );

        const vulnerabilityToggle =
            document.getElementById(
                "vulnerabilityPatternsInfoToggle"
            );


        if (characteristicsCard) {
            characteristicsCard.hidden = true;
        }

        if (vulnerabilityCard) {
            vulnerabilityCard.hidden = true;
        }


        if (characteristicsToggle) {
            characteristicsToggle.setAttribute(
                "aria-expanded",
                "false"
            );
        }

        if (vulnerabilityToggle) {
            vulnerabilityToggle.setAttribute(
                "aria-expanded",
                "false"
            );
        }
    }


    // =========================================================
    // TOGGLE INFO CARD
    // =========================================================

    function toggleInfoCard(type) {

        const characteristicsCard =
            document.getElementById(
                "characteristicsInfoCard"
            );

        const vulnerabilityCard =
            document.getElementById(
                "vulnerabilityPatternsInfoCard"
            );

        const characteristicsToggle =
            document.getElementById(
                "characteristicsInfoToggle"
            );

        const vulnerabilityToggle =
            document.getElementById(
                "vulnerabilityPatternsInfoToggle"
            );


        if (
            !characteristicsCard ||
            !vulnerabilityCard ||
            !characteristicsToggle ||
            !vulnerabilityToggle
        ) {
            return;
        }


        // =====================================================
        // PASSWORD CHARACTERISTICS
        // =====================================================

        if (type === "characteristics") {

            const isOpen =
                !characteristicsCard.hidden;

            closeInfoCards();

            if (!isOpen) {

                characteristicsCard.hidden =
                    false;

                characteristicsToggle.setAttribute(
                    "aria-expanded",
                    "true"
                );
            }

            return;
        }


        // =====================================================
        // VULNERABILITY PATTERNS
        // =====================================================

        if (type === "vulnerability") {

            const isOpen =
                !vulnerabilityCard.hidden;

            closeInfoCards();

            if (!isOpen) {

                vulnerabilityCard.hidden =
                    false;

                vulnerabilityToggle.setAttribute(
                    "aria-expanded",
                    "true"
                );
            }
        }
    }


    // =========================================================
    // CLICK HANDLER
    // =========================================================

    document.addEventListener(
        "click",
        function (event) {

            // -------------------------------------------------
            // X CLOSE BUTTON
            // -------------------------------------------------

            const infoClose =
                event.target.closest(
                    ".feature-info-card-close"
                );

            if (infoClose) {

                closeInfoCards();

                return;
            }


            // -------------------------------------------------
            // PASSWORD CHARACTERISTICS ?
            // -------------------------------------------------

            const characteristicsToggle =
                event.target.closest(
                    "#characteristicsInfoToggle"
                );

            if (characteristicsToggle) {

                toggleInfoCard(
                    "characteristics"
                );

                return;
            }


            // -------------------------------------------------
            // VULNERABILITY PATTERNS ?
            // -------------------------------------------------

            const vulnerabilityToggle =
                event.target.closest(
                    "#vulnerabilityPatternsInfoToggle"
                );

            if (vulnerabilityToggle) {

                toggleInfoCard(
                    "vulnerability"
                );

                return;
            }


            // -------------------------------------------------
            // CLICK OUTSIDE INFO CARD
            // -------------------------------------------------

            const clickedInfoCard =
                event.target.closest(
                    ".feature-info-card"
                );

            if (!clickedInfoCard) {

                const characteristicsCard =
                    document.getElementById(
                        "characteristicsInfoCard"
                    );

                const vulnerabilityCard =
                    document.getElementById(
                        "vulnerabilityPatternsInfoCard"
                    );


                if (
                    characteristicsCard &&
                    !characteristicsCard.hidden
                ) {
                    closeInfoCards();
                    return;
                }


                if (
                    vulnerabilityCard &&
                    !vulnerabilityCard.hidden
                ) {
                    closeInfoCards();
                    return;
                }
            }
        }
    );


    // =========================================================
    // INITIALIZE
    // =========================================================

    document.addEventListener(
        "DOMContentLoaded",
        function () {

            closeInfoCards();
        }
    );


    // =========================================================
    // EXPOSE FUNCTIONS
    // =========================================================

    return {
        updateFeatureVector
    };

})();


// =============================================================
// GLOBAL ACCESS FOR RESULT.JS
// =============================================================

window.updateFeatureVector =
    FeatureVector.updateFeatureVector;