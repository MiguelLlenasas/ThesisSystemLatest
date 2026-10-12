let tutorialOverlay = null;
let tutorialCard = null;
let tutorialClose = null;

let tutorialConfirmOverlay = null;
let tutorialStay = null;
let tutorialSkip = null;

let tutorialSteps = [];
let tutorialPrev = null;
let tutorialNext = null;
let tutorialProgress = [];

let confirmBeforeClose = false;
let currentStep = 0;
let tutorialLoaded = false;


/* =========================================================
   AUTO RELOAD SETTINGS
   ========================================================= */

const TUTORIAL_MEDIA_RETRY = {
    maxAttempts: 4,
    baseDelay: 1500,
    videoTimeout: 20000
};

/*
 * Videos that used all retry attempts are stored here.
 * They will try again when the browser comes back online.
 */
const exhaustedTutorialMedia = new Set();

window.addEventListener("online", () => {

    const pending = Array.from(exhaustedTutorialMedia);

    exhaustedTutorialMedia.clear();

    pending.forEach(retryFunction => {
        retryFunction();
    });

});


/* =========================================================
   ADD RETRY PARAMETER
   ========================================================= */

function addTutorialRetryParam(url, attempt) {

    const separator = url.includes("?") ? "&" : "?";

    return url + separator + "reload=" + attempt + "_" + Date.now();

}


/* =========================================================
   MEDIA STATUS UI
   ========================================================= */

function createTutorialMediaStatus(mediaWrapper) {

    if (!mediaWrapper) {
        return null;
    }

    let status = mediaWrapper.querySelector(".tutorial-media-status");

    if (status) {
        return status;
    }

    status = document.createElement("div");
    status.className = "tutorial-media-status";

    const loader = document.createElement("div");
    loader.className = "tutorial-media-loader";

    const loadingText = document.createElement("p");
    loadingText.className = "tutorial-media-loading-text";
    loadingText.textContent = "Loading media...";

    const errorIcon = document.createElement("div");
    errorIcon.className = "tutorial-media-error-icon";
    errorIcon.textContent = "!";

    const errorTitle = document.createElement("p");
    errorTitle.className = "tutorial-media-error-title";
    errorTitle.textContent = "Media unavailable";

    const errorText = document.createElement("p");
    errorText.className = "tutorial-media-error-text";
    errorText.textContent = "The tutorial media could not be loaded.";

    const reloadButton = document.createElement("button");
    reloadButton.className = "tutorial-media-reload";
    reloadButton.type = "button";
    reloadButton.textContent = "Reload";

    status.appendChild(loader);
    status.appendChild(loadingText);
    status.appendChild(errorIcon);
    status.appendChild(errorTitle);
    status.appendChild(errorText);
    status.appendChild(reloadButton);

    mediaWrapper.appendChild(status);

    updateTutorialMediaStatus(status, "loading");

    return status;

}


/* =========================================================
   UPDATE MEDIA STATUS
   ========================================================= */

function updateTutorialMediaStatus(status, state, retryFunction = null) {

    if (!status) {
        return;
    }

    const loader = status.querySelector(".tutorial-media-loader");
    const loadingText = status.querySelector(".tutorial-media-loading-text");
    const errorIcon = status.querySelector(".tutorial-media-error-icon");
    const errorTitle = status.querySelector(".tutorial-media-error-title");
    const errorText = status.querySelector(".tutorial-media-error-text");
    const reloadButton = status.querySelector(".tutorial-media-reload");

    status.dataset.state = state;

    /* LOADING */
    if (state === "loading") {

        status.hidden = false;

        if (loader) loader.hidden = false;
        if (loadingText) loadingText.hidden = false;
        if (errorIcon) errorIcon.hidden = true;
        if (errorTitle) errorTitle.hidden = true;
        if (errorText) errorText.hidden = true;
        if (reloadButton) reloadButton.hidden = true;

        return;

    }

    /* SUCCESS */
    if (state === "success") {

        status.hidden = true;

        return;

    }

    /* ERROR */
    if (state === "error") {

        status.hidden = false;

        if (loader) loader.hidden = true;
        if (loadingText) loadingText.hidden = true;
        if (errorIcon) errorIcon.hidden = false;
        if (errorTitle) errorTitle.hidden = false;
        if (errorText) errorText.hidden = false;

        if (reloadButton) {

            reloadButton.hidden = false;

            reloadButton.onclick = () => {

                updateTutorialMediaStatus(status, "loading");

                if (retryFunction) {
                    retryFunction();
                }

            };

        }

    }

}


/* =========================================================
   LOAD TUTORIAL COMPONENT
   ========================================================= */

async function loadTutorial() {

    if (tutorialLoaded) {
        return true;
    }

    const tutorialUrl = "../pages/components/tutorial.html";

    const maxAttempts = 4;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {

        try {

            const response = await fetch(
                attempt === 0
                    ? tutorialUrl
                    : addTutorialRetryParam(tutorialUrl, attempt),
                { cache: "no-cache" }
            );

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const html = await response.text();

            const wrapper = document.createElement("div");

            wrapper.innerHTML = html.trim();

            document.body.insertAdjacentHTML("beforeend", wrapper.innerHTML);

            tutorialLoaded = true;

            initializeTutorial();

            return true;

        } catch (error) {

            console.warn(
                `Failed to load tutorial.html (attempt ${attempt + 1}/${maxAttempts}):`,
                error
            );

            if (attempt < maxAttempts - 1) {

                await new Promise(resolve => {
                    setTimeout(
                        resolve,
                        TUTORIAL_MEDIA_RETRY.baseDelay * (attempt + 1)
                    );
                });

            }

        }

    }

    console.error("Failed to load tutorial.html after multiple attempts.");

    return false;

}


/* =========================================================
   INITIALIZE TUTORIAL
   ========================================================= */

function initializeTutorial() {

    tutorialOverlay = document.getElementById("tutorialOverlay");
    tutorialCard = document.getElementById("tutorialCard");
    tutorialClose = document.getElementById("tutorialClose");
    tutorialConfirmOverlay = document.getElementById("tutorialConfirmOverlay");
    tutorialStay = document.getElementById("tutorialStay");
    tutorialSkip = document.getElementById("tutorialSkip");
    tutorialSteps = document.querySelectorAll(".tutorial-step");
    tutorialPrev = document.getElementById("tutorialPrev");
    tutorialNext = document.getElementById("tutorialNext");
    tutorialProgress = document.querySelectorAll("#tutorialProgress span");

    if (!tutorialOverlay || !tutorialCard) {

        console.warn("Tutorial elements were not found.");

        return;

    }

    /* CLOSE BUTTON */
    tutorialClose?.addEventListener("click", event => {

        event.stopPropagation();

        attemptClose();

    });

    /* OVERLAY CLICK */
    tutorialOverlay.addEventListener("click", event => {

        if (event.target !== tutorialOverlay) {
            return;
        }

        if (confirmBeforeClose) {
            return;
        }

        hideTutorial();

    });

    /* CARD CLICK */
    tutorialCard.addEventListener("click", event => {
        event.stopPropagation();
    });

    /* PREVIOUS */
    tutorialPrev?.addEventListener("click", () => {

        if (currentStep > 0) {

            currentStep--;

            updateTutorial();

        }

    });

    /* NEXT */
    tutorialNext?.addEventListener("click", () => {

        if (currentStep < tutorialSteps.length - 1) {

            currentStep++;

            updateTutorial();

        } else {

            hideTutorial();

        }

    });

    /* PROGRESS DOTS */
    tutorialProgress.forEach((dot, index) => {

        dot.addEventListener("click", () => {

            currentStep = index;

            updateTutorial();

        });

    });

    /* SKIP */
    tutorialSkip?.addEventListener("click", () => {
        hideTutorial();
    });

    /* STAY */
    tutorialStay?.addEventListener("click", () => {

        if (tutorialConfirmOverlay) {
            tutorialConfirmOverlay.hidden = true;
        }

    });

    updateTutorial();

}


/* =========================================================
   PLAY TUTORIAL VIDEO
   ========================================================= */

function playTutorialVideo(video) {

    if (!video) {
        return;
    }

    video.muted = true;
    video.playsInline = true;
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");

    const playVideo = () => {

        if (!video.isConnected || video.hidden) {
            return;
        }

        const playPromise = video.play();

        if (playPromise && typeof playPromise.catch === "function") {

            playPromise.catch(error => {
                console.warn("Tutorial video could not autoplay:", error);
            });

        }

    };

    if (video.readyState >= 2) {

        playVideo();

        return;

    }

    video.addEventListener("loadeddata", playVideo, { once: true });
    video.addEventListener("canplay", playVideo, { once: true });

}


/* =========================================================
   LOAD VIDEO WITH AUTO RETRY
   ========================================================= */

function loadTutorialVideoWithRetry(video, source, mediaStatus = null) {

    if (!video || !source) {
        return;
    }

    let attempt = 0;
    let timeoutId = null;
    let retryId = null;
    let finished = false;

    function start() {

        if (finished) {
            return;
        }

        retryId = null;

        clearTimeout(timeoutId);

        if (mediaStatus) {
            updateTutorialMediaStatus(mediaStatus, "loading");
        }

        const currentSource =
            attempt === 0
                ? source
                : addTutorialRetryParam(source, attempt);

        /* Changing src starts a new media request. */
        video.src = currentSource;

        video.muted = true;
        video.playsInline = true;
        video.setAttribute("playsinline", "");
        video.setAttribute("webkit-playsinline", "");

        timeoutId = setTimeout(
            handleFailure,
            TUTORIAL_MEDIA_RETRY.videoTimeout
        );

    }

    function handleFailure() {

        if (finished) {
            return;
        }

        if (retryId !== null) {
            return;
        }

        clearTimeout(timeoutId);

        if (attempt >= TUTORIAL_MEDIA_RETRY.maxAttempts) {

            exhaustedTutorialMedia.add(manualRetry);

            if (mediaStatus) {
                updateTutorialMediaStatus(mediaStatus, "error", manualRetry);
            }

            console.warn(
                "Tutorial video failed after maximum retry attempts:",
                source
            );

            return;

        }

        attempt++;

        console.warn(
            `Retrying tutorial video (${attempt}/${TUTORIAL_MEDIA_RETRY.maxAttempts}):`,
            source
        );

        retryId = setTimeout(
            start,
            TUTORIAL_MEDIA_RETRY.baseDelay * attempt
        );

    }

    function handleSuccess() {

        if (finished) {
            return;
        }

        finished = true;

        clearTimeout(timeoutId);
        clearTimeout(retryId);

        exhaustedTutorialMedia.delete(manualRetry);

        if (mediaStatus) {
            updateTutorialMediaStatus(mediaStatus, "success");
        }

    }

    function manualRetry() {

        clearTimeout(timeoutId);
        clearTimeout(retryId);

        finished = false;
        attempt = 0;

        if (mediaStatus) {
            updateTutorialMediaStatus(mediaStatus, "loading");
        }

        start();

    }

    video.addEventListener("loadeddata", handleSuccess);
    video.addEventListener("canplay", handleSuccess);
    video.addEventListener("error", handleFailure);

    start();

}


/* =========================================================
   UPDATE TUTORIAL
   ========================================================= */

function updateTutorial() {

    tutorialSteps.forEach((step, index) => {

        const active = index === currentStep;

        step.hidden = !active;

        step.classList.toggle("active", active);

    });

    /* PROGRESS */
    tutorialProgress.forEach((dot, index) => {
        dot.classList.toggle("active", index === currentStep);
    });

    /* PREVIOUS BUTTON */
    if (tutorialPrev) {
        tutorialPrev.disabled = currentStep === 0;
    }

    /* NEXT BUTTON */
    if (tutorialNext) {
        tutorialNext.textContent =
            currentStep === tutorialSteps.length - 1
                ? "Finish"
                : "Next";
    }

    /* VIDEO */
    tutorialSteps.forEach((step, index) => {

        const videos = step.querySelectorAll("video");

        videos.forEach(video => {

            /* Stop videos belonging to inactive steps. */
            if (index !== currentStep) {

                video.pause();

                return;

            }

            /* Reset playback position without forcing a reload. */
            try {
                video.currentTime = 0;
            } catch (error) {
                console.warn("Unable to reset tutorial video:", error);
            }

            /* If this video has no source yet, use the retry loader. */
            if (
                !video.src ||
                video.dataset.retryInitialized !== "true"
            ) {

                const source =
                    video.getAttribute("data-original-src") ||
                    video.getAttribute("src");

                if (source) {

                    video.dataset.retryInitialized = "true";

                    video.setAttribute("data-original-src", source);

                    const mediaWrapper = video.closest(".tutorial-media");

                    const mediaStatus =
                        createTutorialMediaStatus(mediaWrapper);

                    loadTutorialVideoWithRetry(video, source, mediaStatus);

                } else {

                    playTutorialVideo(video);

                }

            } else {

                playTutorialVideo(video);

            }

        });

    });

}


/* =========================================================
   SHOW TUTORIAL
   ========================================================= */

async function showTutorial(confirmClose = false) {

    const loaded = await loadTutorial();

    if (!loaded) {
        return;
    }

    if (!tutorialOverlay || !tutorialCard) {
        return;
    }

    confirmBeforeClose = confirmClose;

    currentStep = 0;

    tutorialOverlay.hidden = false;
    tutorialCard.hidden = false;

    document.body.style.overflow = "hidden";

    moveLanguageSwitcherIntoTutorial();

    updateTutorial();

    if (tutorialConfirmOverlay) {
        tutorialConfirmOverlay.hidden = true;
    }

}


/* =========================================================
   HIDE TUTORIAL
   ========================================================= */

function hideTutorial() {

    if (tutorialOverlay) {
        tutorialOverlay.hidden = true;
    }

    if (tutorialCard) {
        tutorialCard.hidden = true;
    }

    if (tutorialConfirmOverlay) {
        tutorialConfirmOverlay.hidden = true;
    }

    /* Restore the language switcher to its original position. */
    restoreLanguageSwitcherPosition();

    /* Stop all tutorial videos (intentionally NOT calling video.load()). */
    tutorialSteps.forEach(step => {

        const videos = step.querySelectorAll("video");

        videos.forEach(video => {
            video.pause();
        });

    });

    document.body.style.overflow = "";

}


/* =========================================================
   ATTEMPT CLOSE
   ========================================================= */

function attemptClose() {

    if (!confirmBeforeClose) {

        hideTutorial();

        return;

    }

    if (tutorialConfirmOverlay) {
        tutorialConfirmOverlay.hidden = false;
    }

}


/* =========================================================
   DOM READY
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    const tutorialButton = document.getElementById("tutorialButton");

    if (tutorialButton) {

        tutorialButton.addEventListener("click", () => {
            showTutorial(false);
        });

    }

    if (sessionStorage.getItem("showResultTutorial") === "true") {

        sessionStorage.removeItem("showResultTutorial");

        showTutorial(true);

    }

});


/* =========================================================
   PUBLIC TUTORIAL API
   ========================================================= */

window.Tutorial = {

    openFromInitial() {
        showTutorial(true);
    },

    openFromResult() {
        showTutorial(false);
    },

    close() {
        hideTutorial();
    }

};


/* =========================================================
   LANGUAGE SWITCHER — TUTORIAL HEADER (RESPONSIVE)

   Desktop / tablet (wider than 600px):
       top of the header, on the same row as the badge.

   Mobile (600px or less):
       its own full-width bar at the bottom of the header,
       so it is easy to tap and never crowds the badge or
       the close button.

   Full language names are always shown:
       "English" / "Filipino (Tagalog)"
   ========================================================= */

let tutorialLanguageSwitcher = null;
let tutorialLanguageOriginalParent = null;
let tutorialLanguageOriginalNextSibling = null;
let tutorialLanguageOriginalClasses = null;

let tutorialSwitcherActive = false;
let tutorialSwitcherMediaBound = false;

let tutorialHeaderRow = null;      /* desktop: badge + switcher row */
let tutorialHeaderLangRow = null;  /* mobile: full-width bar        */

const TUTORIAL_SWITCHER_MOBILE_QUERY = "(max-width:600px)";


function injectTutorialSwitcherStyles() {

    if (document.getElementById("tutorialSwitcherStyles")) {
        return;
    }

    const style = document.createElement("style");

    style.id = "tutorialSwitcherStyles";

    style.textContent = `

        /* ---------- Desktop / tablet: top row ---------- */

        .tutorial-header-top {
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 8px 12px;
            min-width: 0;
            margin: 0 52px 10px 0;
        }

        .tutorial-header-top .tutorial-badge {
            flex: 0 0 auto;
        }

        .tutorial-header-top .i18n-switcher.i18n-in-tutorial {
            position: static;
            top: auto;
            right: auto;
            z-index: auto;
            flex: 0 1 auto;
            min-width: 0;
            min-height: 36px;
            max-width: 100%;
            margin: 0 0 0 auto;
            padding: 0 12px;
            gap: 8px;
        }

        .tutorial-header-top .i18n-in-tutorial select {
            min-width: 0;
            width: auto;
            max-width: 100%;
            padding-right: 18px;
            text-overflow: ellipsis;
        }


        /* ---------- Mobile: full-width bar ---------- */

        .tutorial-header-lang {
            display: block;
            min-width: 0;
            /* header has a wide right padding for the close button,
               cancel it out so the bar spans the whole card */
            margin: 12px -38px 0 0;
        }

        .tutorial-header-lang .i18n-switcher.i18n-in-tutorial {
            position: static;
            top: auto;
            right: auto;
            z-index: auto;
            display: flex;
            align-items: center;
            width: 100%;
            max-width: none;
            min-width: 0;
            min-height: 44px;
            margin: 0;
            padding: 0 14px;
            gap: 10px;
            box-sizing: border-box;
        }

        .tutorial-header-lang .i18n-in-tutorial select {
            flex: 1 1 auto;
            width: 100%;
            min-width: 0;
            max-width: none;
            /* 16px stops iPhones from zooming in when tapped */
            font-size: 16px;
            padding: 8px 22px 8px 0;
            text-overflow: ellipsis;
        }

        @media (max-width: 400px) {
            .tutorial-header-lang {
                margin: 10px -32px 0 0;
            }

            .tutorial-header-lang .i18n-switcher.i18n-in-tutorial {
                min-height: 42px;
                padding: 0 12px;
                gap: 8px;
            }
        }

        /* phones held sideways: keep the bar slim */
        @media (max-width: 600px) and (max-height: 520px) and (orientation: landscape) {
            .tutorial-header-lang {
                margin: 6px -36px 0 0;
            }

            .tutorial-header-lang .i18n-switcher.i18n-in-tutorial {
                min-height: 34px;
            }

            .tutorial-header-lang .i18n-in-tutorial select {
                font-size: 14px;
                padding: 4px 22px 4px 0;
            }
        }

        /* wider phones/tablets held sideways (top row layout) */
        @media (min-width: 601px) and (max-height: 520px) and (orientation: landscape) {
            .tutorial-header-top {
                margin: 0 44px 0 0;
                justify-content: flex-end;
            }

            .tutorial-header-top .i18n-switcher.i18n-in-tutorial {
                min-height: 30px;
            }
        }
    `;

    document.head.appendChild(style);

}


/*
 * Removes the temporary wrapper rows. The badge goes back to
 * exactly where it was. The switcher element itself is kept
 * (it is simply detached together with its old row).
 */
function clearTutorialSwitcherContainers() {

    if (tutorialHeaderRow) {

        const badge = tutorialHeaderRow.querySelector(".tutorial-badge");

        if (badge && tutorialHeaderRow.parentNode) {
            tutorialHeaderRow.parentNode.insertBefore(badge, tutorialHeaderRow);
        }

        tutorialHeaderRow.remove();

        tutorialHeaderRow = null;

    }

    if (tutorialHeaderLangRow) {

        tutorialHeaderLangRow.remove();

        tutorialHeaderLangRow = null;

    }

}


/*
 * Puts the switcher in the right place for the current
 * screen size. Safe to call again whenever the size changes.
 */
function layoutTutorialLanguageSwitcher() {

    const switcher = tutorialLanguageSwitcher;
    const header = document.querySelector(".tutorial-header");

    if (!switcher || !header) {
        return;
    }

    const mobile =
        window.matchMedia(TUTORIAL_SWITCHER_MOBILE_QUERY).matches;

    clearTutorialSwitcherContainers();

    switcher.classList.remove("i18n-floating");
    switcher.classList.add("i18n-in-tutorial");

    if (mobile) {

        /* Mobile: full-width bar at the end of the header. */
        tutorialHeaderLangRow = document.createElement("div");
        tutorialHeaderLangRow.className = "tutorial-header-lang";

        tutorialHeaderLangRow.appendChild(switcher);

        header.appendChild(tutorialHeaderLangRow);

    } else {

        /* Desktop / tablet: [ badge ........ switcher ] */
        tutorialHeaderRow = document.createElement("div");
        tutorialHeaderRow.className = "tutorial-header-top";

        const badge = header.querySelector(".tutorial-badge");

        if (badge) {

            header.insertBefore(tutorialHeaderRow, badge);

            tutorialHeaderRow.appendChild(badge);

        } else {

            header.insertBefore(tutorialHeaderRow, header.firstChild);

        }

        tutorialHeaderRow.appendChild(switcher);

    }

}


function bindTutorialSwitcherMedia() {

    if (tutorialSwitcherMediaBound) {
        return;
    }

    tutorialSwitcherMediaBound = true;

    const mq = window.matchMedia(TUTORIAL_SWITCHER_MOBILE_QUERY);

    const onChange = () => {

        if (tutorialSwitcherActive) {
            layoutTutorialLanguageSwitcher();
        }

    };

    if (mq.addEventListener) {
        mq.addEventListener("change", onChange);
    } else if (mq.addListener) {
        mq.addListener(onChange);
    }

}


function moveLanguageSwitcherIntoTutorial() {

    const switcher = document.querySelector(".i18n-switcher");
    const header = document.querySelector(".tutorial-header");

    if (!switcher || !header) {
        return;
    }

    injectTutorialSwitcherStyles();
    bindTutorialSwitcherMedia();

    /* Remember where the switcher lives (only when not already moved). */
    if (!tutorialSwitcherActive) {

        tutorialLanguageSwitcher = switcher;
        tutorialLanguageOriginalParent = switcher.parentNode;
        tutorialLanguageOriginalNextSibling = switcher.nextSibling;
        tutorialLanguageOriginalClasses = switcher.className;

    }

    tutorialSwitcherActive = true;

    layoutTutorialLanguageSwitcher();

}


function restoreLanguageSwitcherPosition() {

    const switcher = tutorialLanguageSwitcher;
    const originalParent = tutorialLanguageOriginalParent;

    if (!switcher || !originalParent || !tutorialSwitcherActive) {
        return;
    }

    tutorialSwitcherActive = false;

    /* Remove the temporary rows and put the badge back. */
    clearTutorialSwitcherContainers();

    /* Put the switcher back where it came from. */
    if (
        tutorialLanguageOriginalNextSibling &&
        tutorialLanguageOriginalNextSibling.parentNode === originalParent
    ) {

        originalParent.insertBefore(
            switcher,
            tutorialLanguageOriginalNextSibling
        );

    } else {

        originalParent.appendChild(switcher);

    }

    switcher.className =
        tutorialLanguageOriginalClasses || "i18n-switcher";

}