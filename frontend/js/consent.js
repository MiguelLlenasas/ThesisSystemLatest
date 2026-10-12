
const contentArea = document.getElementById("contentArea");
const sections = Array.from(
    document.querySelectorAll(".content-area section")
);
const menuItems = Array.from(
    document.querySelectorAll(".section-booklet li")
);

const energyScroll = document.querySelector(".energy-scroll");
const energyTrack = document.querySelector(".energy-track");
const energyThumb = document.getElementById("energyThumb");


// =========================
// SECTION FOLLOW SYSTEM
// =========================
function updateSection() {
    if (!contentArea || sections.length === 0) {
        return;
    }

    const containerTop = contentArea.getBoundingClientRect().top;
    let current = 0;

    sections.forEach((section, index) => {
        const sectionTop =
            section.getBoundingClientRect().top - containerTop;

        if (sectionTop <= 180) {
            current = index;
        }
    });

    updateLeft(current);
    updateEnergy(current);
}


// =========================
// LEFT MENU ACTIVE STATE
// =========================
function updateLeft(index) {
    menuItems.forEach((item, i) => {
        item.classList.toggle("active", i === index);
    });
}


// =========================
// ENERGY SCROLL INDICATOR
// =========================
function updateEnergy(index) {
    if (!energyThumb) {
        return;
    }

    const total = sections.length - 1;

    if (total <= 0) {
        energyThumb.style.top = "0%";
        return;
    }

    const movement = (index / total) * 80;

    energyThumb.style.top = movement + "%";
}


// =========================
// SCROLL CONTENT
// =========================
if (contentArea) {
    contentArea.addEventListener("scroll", updateSection, {
        passive: true
    });
}


// =========================
// CLICK LEFT MENU
// =========================
menuItems.forEach((item, index) => {
    item.addEventListener("click", () => {
        const targetSection = sections[index];

        if (!targetSection || !contentArea) {
            return;
        }

        const sectionTop =
            targetSection.getBoundingClientRect().top -
            contentArea.getBoundingClientRect().top +
            contentArea.scrollTop;

        contentArea.scrollTo({
            top: Math.max(0, sectionTop),
            behavior: "smooth"
        });
    });
});


// =========================
// CLICK ENERGY TRACK
// =========================
if (energyTrack && contentArea) {
    energyTrack.addEventListener("click", (event) => {
        if (event.target === energyThumb) {
            return;
        }

        const rect = energyTrack.getBoundingClientRect();

        if (rect.height <= 0) {
            return;
        }

        const clickPosition = event.clientY - rect.top;
        const percentage = Math.max(
            0,
            Math.min(clickPosition / rect.height, 1)
        );

        const maxScroll =
            contentArea.scrollHeight - contentArea.clientHeight;

        if (maxScroll <= 0) {
            return;
        }

        contentArea.scrollTo({
            top: percentage * maxScroll,
            behavior: "smooth"
        });
    });
}


// =========================
// DRAG ENERGY THUMB
// =========================
let isDragging = false;

if (energyThumb) {
    energyThumb.addEventListener("mousedown", (event) => {
        isDragging = true;
        event.preventDefault();
    });

    energyThumb.addEventListener("touchstart", () => {
        isDragging = true;
    }, {
        passive: true
    });
}


function moveEnergyThumb(clientY) {
    if (
        !isDragging ||
        !energyTrack ||
        !energyThumb ||
        !contentArea
    ) {
        return;
    }

    const rect = energyTrack.getBoundingClientRect();
    const thumbHeight = energyThumb.offsetHeight;
    const maxPosition = rect.height - thumbHeight;

    if (maxPosition <= 0) {
        return;
    }

    let position = clientY - rect.top - thumbHeight / 2;

    position = Math.max(
        0,
        Math.min(position, maxPosition)
    );

    const percentage = position / maxPosition;
    const maxScroll =
        contentArea.scrollHeight - contentArea.clientHeight;

    if (maxScroll <= 0) {
        return;
    }

    contentArea.scrollTop = percentage * maxScroll;
}


document.addEventListener("mousemove", (event) => {
    moveEnergyThumb(event.clientY);
});

document.addEventListener("touchmove", (event) => {
    if (isDragging && event.touches.length > 0) {
        moveEnergyThumb(event.touches[0].clientY);
    }
}, {
    passive: true
});


function stopDragging() {
    isDragging = false;
}

document.addEventListener("mouseup", stopDragging);
document.addEventListener("touchend", stopDragging);
document.addEventListener("touchcancel", stopDragging);
window.addEventListener("blur", stopDragging);


// =========================
// FIRST LOAD
// =========================
function initializeConsentPage() {
    updateSection();

    if (contentArea) {
        contentArea.scrollTop = 0;

        requestAnimationFrame(() => {
            updateSection();
        });
    }
}

if (document.readyState === "complete") {
    initializeConsentPage();
} else {
    window.addEventListener("load", initializeConsentPage, {
        once: true
    });
}


// =========================
// CONSENT CHECKBOX
// =========================
const checkbox = document.getElementById("consentCheckbox");
const acceptBtn = document.getElementById("acceptBtn");

if (checkbox && acceptBtn) {
    acceptBtn.disabled = !checkbox.checked;

    checkbox.addEventListener("change", () => {
        acceptBtn.disabled = !checkbox.checked;
    });
}


// =========================
// DECLINE MODAL
// =========================
const declineBtn = document.getElementById("declineBtn");
const modal = document.getElementById("declineModal");
const closeModal = document.getElementById("closeModal");

if (declineBtn && modal) {
    declineBtn.addEventListener("click", () => {
        modal.style.display = "flex";
    });
}

if (closeModal && modal) {
    closeModal.addEventListener("click", () => {
        modal.style.display = "none";
    });
}


// =========================
// CLOSE MODAL WHEN CLICKING OUTSIDE
// =========================
if (modal) {
    modal.addEventListener("click", (event) => {
        if (event.target === modal) {
            modal.style.display = "none";
        }
    });
}


// =========================
// CLOSE MODAL WITH ESCAPE
// =========================
document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modal) {
        modal.style.display = "none";
    }
});


// =========================
// ACCEPT CONSENT
// =========================
if (acceptBtn) {
    acceptBtn.addEventListener("click", () => {
        if (acceptBtn.disabled) {
            return;
        }

        localStorage.setItem("consentAccepted", "true");

        document.body.classList.add("page-exit");

        window.setTimeout(() => {
            window.location.replace("initialTest.html");
        }, 800);
    });
}


/* =========================================================
   LANGUAGE SWITCHER - CONSENT PAGE PLACEMENT (RESPONSIVE)

   Wider than 1100px:
       stays where i18n.js puts it (floating, top-right).

   1100px or narrower, OR 560px tall or shorter
   (phones, tablets, short landscape screens):
       moves into its own row above the system title, so it
       never covers the title or the consent card.

   Full language names are always shown:
       "English" / "Filipino (Tagalog)"
   ========================================================= */

const CONSENT_SWITCHER_QUERY =
    "(max-width: 1100px), (max-height: 560px)";

let consentSwitcher = null;
let consentSwitcherOriginalParent = null;
let consentSwitcherOriginalNextSibling = null;
let consentSwitcherOriginalClasses = null;

let consentLangRow = null;
let consentSwitcherMediaBound = false;


function injectConsentSwitcherStyles() {

    if (document.getElementById("consentSwitcherStyles")) {
        return;
    }

    const style = document.createElement("style");

    style.id = "consentSwitcherStyles";

    style.textContent = `

        /* ---------- Row that holds the switcher ---------- */

        .consent-lang-row {
            position: relative;
            z-index: 3;
            flex: 0 0 auto;
            display: flex;
            justify-content: center;
            width: 100%;
            max-width: 680px;
            min-width: 0;
            padding: 10px 12px 0;
            box-sizing: border-box;
        }

        .consent-lang-row .i18n-switcher.i18n-in-consent {
            position: static;
            top: auto;
            right: auto;
            z-index: auto;
            display: flex;
            align-items: center;
            justify-content: flex-start;
            width: 100%;
            max-width: none;
            min-width: 0;
            min-height: 42px;
            margin: 0;
            padding: 0 14px;
            gap: 10px;
            box-sizing: border-box;
        }

        .consent-lang-row .i18n-in-consent select {
            flex: 1 1 auto;
            width: 100%;
            min-width: 0;
            max-width: none;
            /* 16px stops iPhones from zooming in when tapped */
            font-size: 16px;
            padding: 8px 22px 8px 0;
            text-overflow: ellipsis;
        }

        /* ---------- Small phones ---------- */

        @media (max-width: 400px) {

            .consent-lang-row {
                padding: 8px 8px 0;
            }

            .consent-lang-row .i18n-switcher.i18n-in-consent {
                min-height: 40px;
                padding: 0 12px;
                gap: 8px;
            }
        }

        /* ---------- Short screens (phones held sideways) ---------- */

        @media (max-height: 560px) {

            .consent-lang-row {
                justify-content: flex-end;
                max-width: 100%;
                padding: 6px 12px 0;
            }

            .consent-lang-row .i18n-switcher.i18n-in-consent {
                width: auto;
                min-height: 32px;
                padding: 0 10px;
                gap: 6px;
            }

            .consent-lang-row .i18n-in-consent select {
                width: auto;
                font-size: 13px;
                padding: 3px 20px 3px 0;
            }
        }
    `;

    document.head.appendChild(style);
}


/*
 * Puts the switcher in the right place for the current screen
 * size. Safe to call again every time the size changes.
 */
function layoutConsentLanguageSwitcher() {

    const switcher = consentSwitcher;

    if (!switcher) {
        return;
    }

    const compact =
        window.matchMedia(CONSENT_SWITCHER_QUERY).matches;

    if (compact) {

        /* Phones / tablets / short screens: own row above the title. */
        if (!consentLangRow) {

            consentLangRow = document.createElement("div");
            consentLangRow.className = "consent-lang-row";

            const systemName = document.querySelector(".system-name");

            if (systemName && systemName.parentNode) {

                systemName.parentNode.insertBefore(
                    consentLangRow,
                    systemName
                );

            } else {

                document.body.insertBefore(
                    consentLangRow,
                    document.body.firstChild
                );

            }

        }

        switcher.classList.remove("i18n-floating");
        switcher.classList.add("i18n-in-consent");

        if (switcher.parentNode !== consentLangRow) {
            consentLangRow.appendChild(switcher);
        }

    } else {

        /* Desktop: put it back exactly where i18n.js placed it. */
        switcher.classList.remove("i18n-in-consent");

        const originalParent =
            consentSwitcherOriginalParent || document.body;

        if (switcher.parentNode !== originalParent) {

            if (
                consentSwitcherOriginalNextSibling &&
                consentSwitcherOriginalNextSibling.parentNode ===
                    originalParent
            ) {

                originalParent.insertBefore(
                    switcher,
                    consentSwitcherOriginalNextSibling
                );

            } else {

                originalParent.appendChild(switcher);

            }

        }

        switcher.className =
            consentSwitcherOriginalClasses || "i18n-switcher i18n-floating";

        if (consentLangRow) {

            consentLangRow.remove();

            consentLangRow = null;

        }

    }

}


function bindConsentSwitcherMedia() {

    if (consentSwitcherMediaBound) {
        return;
    }

    consentSwitcherMediaBound = true;

    const mq = window.matchMedia(CONSENT_SWITCHER_QUERY);

    const onChange = () => {
        layoutConsentLanguageSwitcher();
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
function waitForConsentSwitcher(callback) {

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


function initializeConsentLanguageSwitcher() {

    injectConsentSwitcherStyles();

    bindConsentSwitcherMedia();

    waitForConsentSwitcher(switcher => {

        consentSwitcher = switcher;

        /* Remember where i18n.js placed it. */
        consentSwitcherOriginalParent = switcher.parentNode;
        consentSwitcherOriginalNextSibling = switcher.nextSibling;
        consentSwitcherOriginalClasses = switcher.className;

        layoutConsentLanguageSwitcher();

    });
}


initializeConsentLanguageSwitcher();