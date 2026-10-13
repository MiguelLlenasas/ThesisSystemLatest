// result.js
fetch("https://thesissystemlatest.onrender.com/health", { method: "HEAD" }).catch(() => {});


async function analyzePassword(password, previousPassword) {

    const response = await fetch(
        "https://thesissystemlatest.onrender.com/analyze",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                password,
                ...(previousPassword
                    ? { previousPassword }
                    : {})
            })
        }
    );

    if (!response.ok) {
        throw new Error("Backend request failed");
    }

    return response.json();
}


function getResultSource() {

    const storedSource = sessionStorage.getItem("resultSource");

    if (storedSource) {
        return storedSource;
    }

    const source = localStorage.getItem("comparisonPassword")
        ? "comTest"
        : "ini";

    sessionStorage.setItem("resultSource", source);

    return source;
}


function readStoredAnalysisResult() {

    const stored = sessionStorage.getItem("analysisResult");

    if (!stored) {
        return null;
    }

    try {
        return JSON.parse(stored);
    } catch {
        return null;
    }
}


function cacheOriginalResult(password, data) {

    localStorage.setItem(
        "originalAnalysisResult",
        JSON.stringify({
            password,
            data
        })
    );
}


function readCachedOriginalResult(password) {

    const stored = localStorage.getItem("originalAnalysisResult");

    if (!stored) {
        return null;
    }

    try {

        const result = JSON.parse(stored);

        return result.password === password
            ? result.data
            : null;

    } catch {
        return null;
    }
}


/* =============================================================
   HISTORY / PAGE ACCESS PROTECTION
   - consumePageAccess(): reads and ALWAYS removes the single-use
     token that the previous page set right before navigating here.
   - redirectToInitialTest(): the one and only redirect used by the
     load guard and the pageshow handler, so they never double-fire.
   ============================================================= */

let redirectingToInitial = false;


function consumePageAccess(expectedTarget) {

    const token = sessionStorage.getItem("pageAccess");

    sessionStorage.removeItem("pageAccess");

    return token === expectedTarget;
}


function redirectToInitialTest() {

    if (redirectingToInitial) {
        return;
    }

    redirectingToInitial = true;

    document.documentElement.style.display = "none";

    window.location.replace("initialTest.html");
}


function guardResultPageAccess() {

    const navigation = performance.getEntriesByType("navigation")[0];

    const analyzedPassword = localStorage.getItem("analyzedPassword");

    // Always consume the token, even when the visit is rejected.
    const hasAccessToken = consumePageAccess("result");

    if (
        navigation?.type === "reload" ||
        navigation?.type === "back_forward" ||
        !analyzedPassword ||
        !hasAccessToken
    ) {
        redirectToInitialTest();

        return false;
    }

    return true;
}


function loadComponents() {

    const componentMap = {
        summarySection: "classification.html",
        decisionTreeSection: "decisionTree.html",
        recommendationSection: "recommendation.html",
        featureVectorSection: "featureVector.html",
        comparisonSection: "comparison.html"
    };

    const loadTasks = Object.entries(componentMap).map(
        async ([sectionId, fileName]) => {

            const section = document.getElementById(sectionId);

            if (!section) {
                return;
            }

            try {

                const response = await fetch(
                    `./components/${fileName}`
                );

                if (!response.ok) {
                    throw new Error(`Failed to load ${fileName}`);
                }

                section.innerHTML = await response.text();

            } catch (error) {

                console.error(
                    `Component error (${fileName}):`,
                    error
                );
            }
        }
    );

    return Promise.all(loadTasks).then(() => {

        if (typeof initializeFeatureVector === "function") {
            initializeFeatureVector();
        }

        if (
            typeof SummaryCard !== "undefined" &&
            typeof SummaryCard.initialize === "function"
        ) {
            SummaryCard.initialize();
        }
    });
}


function initializeDecisionTreeEvents() {

    document.addEventListener(
        "decisionTree:hologramClicked",
        () => {

            console.log(
                "[Result] Decision Tree hologram clicked"
            );

            openDecisionTraversalCard();
        }
    );
}


function openDecisionTraversalCard() {

    console.log(
        "[Result] Opening Decision Traversal Card"
    );

    const card = window.DecisionTraversalCard;

    if (
        !card ||
        typeof card.open !== "function"
    ) {

        console.error(
            "[Result] DecisionTraversalCard unavailable"
        );

        return;
    }

    card.open();
}


function initializeSidebar() {

    const sidebar = document.querySelector(".sidebar");

    if (!sidebar) {
        return;
    }

    const tutorialButton = document.getElementById("tutorialButton");

    const tabs = Array.from(
        sidebar.querySelectorAll(".sidebar-item[data-section]")
    );

    const sections = Array.from(
        document.querySelectorAll(".result-section")
    );

    if (!tabs.length || !sections.length) {
        return;
    }

    function showSection(index) {

        tabs.forEach(tab => {

            tab.classList.remove("active");

            tab.setAttribute("aria-selected", "false");
        });

        sections.forEach(section => {

            section.hidden = true;

            section.classList.remove("active-section");
        });

        const selectedTab = tabs.find(
            tab => Number(tab.dataset.section) === index
        );

        const selectedSection = sections[index];

        if (!selectedTab || !selectedSection) {
            return;
        }

        selectedTab.classList.add("active");

        selectedTab.setAttribute("aria-selected", "true");

        selectedSection.hidden = false;

        selectedSection.classList.add("active-section");
    }

    tabs.forEach(tab => {

        const index = Number(tab.dataset.section);

        tab.addEventListener("click", () => {
            showSection(index);
        });
    });

    tutorialButton?.addEventListener("click", () => {

        if (
            typeof TutorialCard !== "undefined" &&
            typeof TutorialCard.open === "function"
        ) {
            TutorialCard.open();
        }
    });

    let initialTab = 0;

    const targetTab = sessionStorage.getItem("openTab");

    if (targetTab !== null) {

        initialTab = Number(targetTab);

        sessionStorage.removeItem("openTab");
    }

    showSection(initialTab);
}


function renderBackendData(data) {

    if (!data) {
        return;
    }

    window.latestAnalysisData = data;

    window.comparisonAnalysisData = null;

    if (typeof updateClassification === "function") {
        updateClassification(data);
    }

    if (typeof updateDecisionTree === "function") {
        updateDecisionTree(data);
    }

    if (typeof updateFeatureVector === "function") {
        updateFeatureVector(data);
    }

    if (typeof updateRecommendation === "function") {

        const analyzedPassword =
            localStorage.getItem("analyzedPassword") || "";

        updateRecommendation(data, analyzedPassword);
    }

    if (typeof updateComparisonEmptyState === "function") {
        updateComparisonEmptyState();
    }
}


async function fetchAnalysisResult() {

    const analyzedPassword =
        localStorage.getItem("analyzedPassword");

    const comparisonPassword =
        localStorage.getItem("comparisonPassword");

    try {

        if (analyzedPassword && comparisonPassword) {

            sessionStorage.setItem("resultSource", "comTest");

            localStorage.setItem("previousPassword", analyzedPassword);

            localStorage.setItem("currentPassword", comparisonPassword);

            const comparisonResult =
                readStoredAnalysisResult() ||
                await analyzePassword(
                    comparisonPassword,
                    analyzedPassword
                );

            const originalResult =
                readCachedOriginalResult(analyzedPassword) ||
                await analyzePassword(analyzedPassword);

            window.latestAnalysisData = comparisonResult;

            window.comparisonAnalysisData = {
                previous: originalResult,
                current: comparisonResult
            };

            if (typeof updateClassification === "function") {
                updateClassification(comparisonResult);
            }

            if (typeof updateDecisionTree === "function") {
                updateDecisionTree(comparisonResult);
            }

            if (typeof updateFeatureVector === "function") {
                updateFeatureVector(comparisonResult);
            }

            if (typeof updateRecommendation === "function") {
                updateRecommendation(
                    comparisonResult,
                    comparisonPassword
                );
            }

            if (typeof initializeComparison === "function") {
                await initializeComparison();
            }

            localStorage.setItem(
                "analyzedPassword",
                comparisonPassword
            );

            localStorage.removeItem("comparisonPassword");

            sessionStorage.removeItem("analysisResult");

            cacheOriginalResult(
                comparisonPassword,
                comparisonResult
            );

            return comparisonResult;
        }

        if (!analyzedPassword) {
            return null;
        }

        sessionStorage.setItem("resultSource", "ini");

        const storedResult = readStoredAnalysisResult();

        const data = storedResult || await analyzePassword(analyzedPassword);

        window.latestAnalysisData = data;

        window.comparisonAnalysisData = null;

        cacheOriginalResult(analyzedPassword, data);

        sessionStorage.removeItem("analysisResult");

        renderBackendData(data);

        return data;

    } catch (error) {

        console.error("Analysis error:", error);

        return null;
    }
}


function initializePasswordPreview() {

    const previousPassword =
        localStorage.getItem("previousPassword") || "";

    const testedPassword =
        localStorage.getItem("analyzedPassword") || "";

    const previousContainer =
        document.getElementById("previousPasswordContainer");

    if (previousPassword && previousContainer) {

        previousContainer.style.display = "block";

        createPasswordReveal(
            "previousPassword",
            previousPassword
        );
    }

    createPasswordReveal(
        "testedPassword",
        testedPassword
    );
}


function createPasswordReveal(id, password) {

    const element = document.getElementById(id);

    if (!element || !password) {
        return;
    }

    const masked = "*".repeat(
        Math.min(password.length, 13)
    );

    let revealed = false;

    element.textContent = masked;

    element.onclick = () => {

        revealed = !revealed;

        element.textContent = revealed
            ? password
            : masked;

        element.classList.toggle(
            "revealed",
            revealed
        );

        element.scrollLeft = 0;
    };
}


function clearResultStorage() {

    [
        "analyzedPassword",
        "previousPassword",
        "currentPassword",
        "originalAnalysisResult",
        "comparisonPassword"
    ].forEach(key => {
        localStorage.removeItem(key);
    });

    sessionStorage.removeItem("analysisResult");

    sessionStorage.removeItem("resultSource");
}


function initializeActionButtons() {

    const resetButton = document.getElementById("resetButton");

    const compareButton = document.getElementById("compareButton");

    resetButton?.addEventListener("click", () => {

        clearResultStorage();

        window.location.href = "initialTest.html";
    });

    compareButton?.addEventListener("click", () => {

        // HISTORY FIX: single-use token so comparisonTest.html knows this
        // visit comes from the Compare button and not from browser history.
        sessionStorage.setItem("pageAccess", "comparison");

        window.location.href = "comparisonTest.html";
    });
}


/* =============================================================
   TRANSLATED TEXT LAYOUT SUPPORT
   This only adds a class to the page root when Tagalog is active.
   CSS can use this class to adjust wrapping and spacing.
   It does not alter translation or analysis logic.
   ============================================================= */

function updateTranslatedLayout() {

    const language =
        document.documentElement.lang ||
        (window.I18N && typeof window.I18N.getLanguage === "function"
            ? window.I18N.getLanguage()
            : "en");

    document.documentElement.classList.toggle(
        "translated-layout",
        language.toLowerCase().startsWith("tl")
    );
}


function initializeTranslatedLayoutSupport() {

    updateTranslatedLayout();

    document.addEventListener(
        "languagechange",
        updateTranslatedLayout
    );
}


async function initializeResultPage() {

    // HISTORY FIX: stop immediately when the guard rejects the visit, so no
    // components load, no backend calls run and no storage is rewritten
    // while the redirect to initialTest.html is in flight.
    if (!guardResultPageAccess()) {
        return;
    }

    await loadComponents();

    initializeDecisionTreeEvents();

    initializeSidebar();

    if (typeof initializeDecisionTree === "function") {
        initializeDecisionTree();
    }

    await fetchAnalysisResult();

    initializePasswordPreview();

    initializeActionButtons();

    updateTranslatedLayout();

    history.replaceState(
        null,
        "",
        window.location.href
    );
}


initializeTranslatedLayoutSupport();


document.addEventListener(
    "DOMContentLoaded",
    initializeResultPage,
    {
        once: true
    }
);


window.addEventListener("pageshow", (event) => {

    const entries = performance.getEntriesByType("navigation");

    const isBackForward =
        entries.length > 0 &&
        entries[0].type === "back_forward";

    if (event.persisted || isBackForward) {

        redirectToInitialTest();
    }
});


/* =========================================================
   LANGUAGE SWITCHER - RESULT PAGE PLACEMENT (RESPONSIVE)

   Wider than 1200px:
       stays where i18n.js puts it (floating, top-right).

   1200px or narrower (tablets and phones, same breakpoint as
   the result page CSS):
       moves into its own row above the page header. It scrolls
       with the page, so it never covers the logo, the title or
       the result content.

   700px or narrower (phones):
       the row becomes a full-width bar for easy tapping.

   Full language names are always shown:
       "English" / "Filipino (Tagalog)"
   ========================================================= */

const RESULT_SWITCHER_QUERY = "(max-width: 1200px)";

let resultSwitcher = null;
let resultSwitcherOriginalParent = null;
let resultSwitcherOriginalNextSibling = null;
let resultSwitcherOriginalClasses = null;

let resultLangRow = null;
let resultSwitcherMediaBound = false;


function injectResultSwitcherStyles() {

    if (document.getElementById("resultSwitcherStyles")) {
        return;
    }

    const style = document.createElement("style");

    style.id = "resultSwitcherStyles";

    style.textContent = `

        /* ---------- Row that holds the switcher ---------- */

        .result-lang-row {
            display: flex;
            justify-content: flex-end;
            width: 100%;
            min-width: 0;
            margin: 0 0 14px;
            box-sizing: border-box;
        }

        .result-lang-row .i18n-switcher.i18n-in-result {
            position: static;
            top: auto;
            right: auto;
            z-index: auto;
            display: inline-flex;
            align-items: center;
            width: auto;
            max-width: 100%;
            min-width: 0;
            min-height: 40px;
            margin: 0;
            padding: 0 14px;
            gap: 9px;
            box-sizing: border-box;
        }

        .result-lang-row .i18n-in-result select {
            width: auto;
            min-width: 0;
            max-width: 100%;
            font-size: 13px;
            padding: 6px 22px 6px 0;
            text-overflow: ellipsis;
        }

        /* ---------- Phones: full-width bar ---------- */

        @media (max-width: 700px) {

            .result-lang-row {
                margin: 0 0 12px;
            }

            .result-lang-row .i18n-switcher.i18n-in-result {
                display: flex;
                width: 100%;
                min-height: 44px;
                gap: 10px;
            }

            .result-lang-row .i18n-in-result select {
                flex: 1 1 auto;
                width: 100%;
                /* 16px stops iPhones from zooming in when tapped */
                font-size: 16px;
                padding: 8px 22px 8px 0;
            }
        }

        /* ---------- Very small phones ---------- */

        @media (max-width: 400px) {

            .result-lang-row {
                margin: 0 0 10px;
            }

            .result-lang-row .i18n-switcher.i18n-in-result {
                min-height: 42px;
                padding: 0 12px;
                gap: 8px;
            }
        }
    `;

    document.head.appendChild(style);
}


/*
 * Puts the switcher in the right place for the current screen
 * size. Safe to call again every time the size changes.
 */
function layoutResultLanguageSwitcher() {

    const switcher = resultSwitcher;

    if (!switcher) {
        return;
    }

    const compact =
        window.matchMedia(RESULT_SWITCHER_QUERY).matches;

    const container = document.querySelector(".result-container");

    const header = document.querySelector(".page-header");

    if (compact && container && header) {

        /* Tablets / phones: own row above the page header. */
        if (!resultLangRow) {

            resultLangRow = document.createElement("div");
            resultLangRow.className = "result-lang-row";

            container.insertBefore(resultLangRow, header);

        }

        switcher.classList.remove("i18n-floating");
        switcher.classList.add("i18n-in-result");

        if (switcher.parentNode !== resultLangRow) {
            resultLangRow.appendChild(switcher);
        }

    } else {

        /* Desktop: put it back exactly where i18n.js placed it. */
        switcher.classList.remove("i18n-in-result");

        const originalParent =
            resultSwitcherOriginalParent || document.body;

        if (switcher.parentNode !== originalParent) {

            if (
                resultSwitcherOriginalNextSibling &&
                resultSwitcherOriginalNextSibling.parentNode ===
                    originalParent
            ) {

                originalParent.insertBefore(
                    switcher,
                    resultSwitcherOriginalNextSibling
                );

            } else {

                originalParent.appendChild(switcher);

            }

        }

        switcher.className =
            resultSwitcherOriginalClasses || "i18n-switcher i18n-floating";

        if (resultLangRow) {

            resultLangRow.remove();

            resultLangRow = null;

        }

    }

}


function bindResultSwitcherMedia() {

    if (resultSwitcherMediaBound) {
        return;
    }

    resultSwitcherMediaBound = true;

    const mq = window.matchMedia(RESULT_SWITCHER_QUERY);

    const onChange = () => {
        layoutResultLanguageSwitcher();
    };

    if (mq.addEventListener) {
        mq.addEventListener("change", onChange);
    } else if (mq.addListener) {
        mq.addListener(onChange);
    }
}


/*
 * i18n.js builds the switcher on its own schedule, so this may
 * run before the switcher exists. Wait for it if needed.
 */
function waitForResultSwitcher(callback) {

    const existing = document.querySelector(".i18n-switcher");

    if (existing) {
        callback(existing);
        return;
    }

    const observer = new MutationObserver(() => {

        const found = document.querySelector(".i18n-switcher");

        if (found) {

            observer.disconnect();

            callback(found);

        }

    });

    observer.observe(document.documentElement, {
        childList: true,
        subtree: true
    });

    /* Stop watching after 10 seconds so it never runs forever. */
    window.setTimeout(() => {
        observer.disconnect();
    }, 10000);
}


function initializeResultLanguageSwitcher() {

    injectResultSwitcherStyles();

    bindResultSwitcherMedia();

    waitForResultSwitcher(switcher => {

        resultSwitcher = switcher;

        /* Remember where i18n.js placed it. */
        resultSwitcherOriginalParent = switcher.parentNode;
        resultSwitcherOriginalNextSibling = switcher.nextSibling;
        resultSwitcherOriginalClasses = switcher.className;

        layoutResultLanguageSwitcher();

    });
}


initializeResultLanguageSwitcher();