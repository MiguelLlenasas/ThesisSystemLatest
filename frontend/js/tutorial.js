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

const exhaustedTutorialMedia =
    new Set();


window.addEventListener(
    "online",
    () => {

        const pending =
            Array.from(
                exhaustedTutorialMedia
            );

        exhaustedTutorialMedia.clear();

        pending.forEach(
            retryFunction => {

                retryFunction();

            }
        );

    }
);


/* =========================================================
   ADD RETRY PARAMETER
   ========================================================= */

function addTutorialRetryParam(
    url,
    attempt
) {

    const separator =
        url.includes("?")
            ? "&"
            : "?";

    return (
        url +
        separator +
        "reload=" +
        attempt +
        "_" +
        Date.now()
    );

}


/* =========================================================
   LOAD TUTORIAL COMPONENT
   ========================================================= */

async function loadTutorial() {

    if (tutorialLoaded) {
        return true;
    }


    const tutorialUrl =
        "../pages/components/tutorial.html";


    const maxAttempts = 4;


    for (
        let attempt = 0;
        attempt < maxAttempts;
        attempt++
    ) {

        try {

            const response =
                await fetch(
                    attempt === 0
                        ? tutorialUrl
                        : addTutorialRetryParam(
                            tutorialUrl,
                            attempt
                        ),
                    {
                        cache: "no-cache"
                    }
                );


            if (!response.ok) {

                throw new Error(
                    `HTTP ${response.status}`
                );

            }


            const html =
                await response.text();


            const wrapper =
                document.createElement(
                    "div"
                );


            wrapper.innerHTML =
                html.trim();


            document.body.insertAdjacentHTML(
                "beforeend",
                wrapper.innerHTML
            );


            tutorialLoaded = true;


            initializeTutorial();


            return true;


        } catch (error) {

            console.warn(
                `Failed to load tutorial.html (attempt ${attempt + 1}/${maxAttempts}):`,
                error
            );


            if (
                attempt <
                maxAttempts - 1
            ) {

                await new Promise(
                    resolve => {

                        setTimeout(
                            resolve,
                            TUTORIAL_MEDIA_RETRY.baseDelay *
                                (attempt + 1)
                        );

                    }
                );

            }

        }

    }


    console.error(
        "Failed to load tutorial.html after multiple attempts."
    );


    return false;

}


/* =========================================================
   INITIALIZE TUTORIAL
   ========================================================= */

function initializeTutorial() {

    tutorialOverlay =
        document.getElementById(
            "tutorialOverlay"
        );


    tutorialCard =
        document.getElementById(
            "tutorialCard"
        );


    tutorialClose =
        document.getElementById(
            "tutorialClose"
        );


    tutorialConfirmOverlay =
        document.getElementById(
            "tutorialConfirmOverlay"
        );


    tutorialStay =
        document.getElementById(
            "tutorialStay"
        );


    tutorialSkip =
        document.getElementById(
            "tutorialSkip"
        );


    tutorialSteps =
        document.querySelectorAll(
            ".tutorial-step"
        );


    tutorialPrev =
        document.getElementById(
            "tutorialPrev"
        );


    tutorialNext =
        document.getElementById(
            "tutorialNext"
        );


    tutorialProgress =
        document.querySelectorAll(
            "#tutorialProgress span"
        );


    if (
        !tutorialOverlay ||
        !tutorialCard
    ) {

        console.warn(
            "Tutorial elements were not found."
        );

        return;

    }


    /* =====================================================
       CLOSE BUTTON
       ===================================================== */

    tutorialClose?.addEventListener(
        "click",
        event => {

            event.stopPropagation();

            attemptClose();

        }
    );


    /* =====================================================
       OVERLAY CLICK
       ===================================================== */

    tutorialOverlay.addEventListener(
        "click",
        event => {

            if (
                event.target !==
                tutorialOverlay
            ) {

                return;

            }


            if (confirmBeforeClose) {

                return;

            }


            hideTutorial();

        }
    );


    /* =====================================================
       CARD CLICK
       ===================================================== */

    tutorialCard.addEventListener(
        "click",
        event => {

            event.stopPropagation();

        }
    );


    /* =====================================================
       PREVIOUS
       ===================================================== */

    tutorialPrev?.addEventListener(
        "click",
        () => {

            if (currentStep > 0) {

                currentStep--;

                updateTutorial();

            }

        }
    );


    /* =====================================================
       NEXT
       ===================================================== */

    tutorialNext?.addEventListener(
        "click",
        () => {

            if (
                currentStep <
                tutorialSteps.length - 1
            ) {

                currentStep++;

                updateTutorial();

            } else {

                hideTutorial();

            }

        }
    );


    /* =====================================================
       PROGRESS DOTS
       ===================================================== */

    tutorialProgress.forEach(
        (dot, index) => {

            dot.addEventListener(
                "click",
                () => {

                    currentStep = index;

                    updateTutorial();

                }
            );

        }
    );


    /* =====================================================
       SKIP
       ===================================================== */

    tutorialSkip?.addEventListener(
        "click",
        () => {

            hideTutorial();

        }
    );


    /* =====================================================
       STAY
       ===================================================== */

    tutorialStay?.addEventListener(
        "click",
        () => {

            if (tutorialConfirmOverlay) {

                tutorialConfirmOverlay.hidden =
                    true;

            }

        }
    );


    updateTutorial();

}


/* =========================================================
   PLAY TUTORIAL VIDEO
   ========================================================= */

function playTutorialVideo(video) {

    if (!video) {
        return;
    }


    /*
     * Do NOT call video.load().
     *
     * The retry system changes the video's
     * source when another attempt is needed.
     */


    video.muted = true;

    video.playsInline = true;


    video.setAttribute(
        "playsinline",
        ""
    );


    video.setAttribute(
        "webkit-playsinline",
        ""
    );


    const playVideo = () => {

        if (
            !video.isConnected ||
            video.hidden
        ) {

            return;

        }


        const playPromise =
            video.play();


        if (
            playPromise &&
            typeof playPromise.catch ===
            "function"
        ) {

            playPromise.catch(
                error => {

                    console.warn(
                        "Tutorial video could not autoplay:",
                        error
                    );

                }
            );

        }

    };


    if (
        video.readyState >= 2
    ) {

        playVideo();

        return;

    }


    video.addEventListener(
        "loadeddata",
        playVideo,
        {
            once: true
        }
    );


    video.addEventListener(
        "canplay",
        playVideo,
        {
            once: true
        }
    );

}


/* =========================================================
   LOAD VIDEO WITH AUTO RETRY
   ========================================================= */

function loadTutorialVideoWithRetry(
    video,
    source
) {

    if (
        !video ||
        !source
    ) {

        return;

    }


    let attempt = 0;

    let timeoutId = null;

    let retryId = null;

    let finished = false;


    let currentSource =
        source;


    function start() {

        if (finished) {
            return;
        }


        retryId = null;


        clearTimeout(
            timeoutId
        );


        currentSource =
            attempt === 0
                ? source
                : addTutorialRetryParam(
                    source,
                    attempt
                );


        /*
         * Changing src starts a new media
         * request without explicitly calling
         * video.load().
         */

        video.src =
            currentSource;


        video.muted = true;

        video.playsInline = true;


        video.setAttribute(
            "playsinline",
            ""
        );


        video.setAttribute(
            "webkit-playsinline",
            ""
        );


        timeoutId =
            setTimeout(
                handleFailure,
                TUTORIAL_MEDIA_RETRY.videoTimeout
            );

    }


    function handleFailure() {

        if (finished) {
            return;
        }


        if (
            retryId !== null
        ) {

            return;

        }


        clearTimeout(
            timeoutId
        );


        if (
            attempt >=
            TUTORIAL_MEDIA_RETRY.maxAttempts
        ) {

            exhaustedTutorialMedia.add(
                manualRetry
            );


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


        retryId =
            setTimeout(
                start,
                TUTORIAL_MEDIA_RETRY.baseDelay *
                    attempt
            );

    }


    function handleSuccess() {

        finished = true;


        clearTimeout(
            timeoutId
        );


        clearTimeout(
            retryId
        );


        exhaustedTutorialMedia.delete(
            manualRetry
        );

    }


    function manualRetry() {

        finished = false;

        attempt = 0;

        start();

    }


    video.addEventListener(
        "loadeddata",
        handleSuccess
    );


    video.addEventListener(
        "canplay",
        handleSuccess
    );


    video.addEventListener(
        "error",
        handleFailure
    );


    start();

}


/* =========================================================
   UPDATE TUTORIAL
   ========================================================= */

function updateTutorial() {

    tutorialSteps.forEach(
        (step, index) => {

            const active =
                index === currentStep;


            step.hidden =
                !active;


            step.classList.toggle(
                "active",
                active
            );

        }
    );


    /* =====================================================
       UPDATE PROGRESS
       ===================================================== */

    tutorialProgress.forEach(
        (dot, index) => {

            dot.classList.toggle(
                "active",
                index === currentStep
            );

        }
    );


    /* =====================================================
       PREVIOUS BUTTON
       ===================================================== */

    if (tutorialPrev) {

        tutorialPrev.disabled =
            currentStep === 0;

    }


    /* =====================================================
       NEXT BUTTON
       ===================================================== */

    if (tutorialNext) {

        tutorialNext.textContent =
            currentStep ===
            tutorialSteps.length - 1
                ? "Finish"
                : "Next";

    }


    /* =====================================================
       VIDEO
       ===================================================== */

    tutorialSteps.forEach(
        (step, index) => {

            const videos =
                step.querySelectorAll(
                    "video"
                );


            videos.forEach(
                video => {

                    /*
                     * Stop videos belonging to
                     * inactive tutorial steps.
                     */

                    if (
                        index !== currentStep
                    ) {

                        video.pause();

                        return;

                    }


                    /*
                     * Reset playback position
                     * without forcing a reload.
                     */

                    try {

                        video.currentTime = 0;

                    } catch (error) {

                        console.warn(
                            "Unable to reset tutorial video:",
                            error
                        );

                    }


                    /*
                     * If this video has no source
                     * yet, use the retry loader.
                     */

                    if (
                        !video.src ||
                        video.dataset.retryInitialized !==
                        "true"
                    ) {

                        const source =
                            video.getAttribute(
                                "data-original-src"
                            ) ||
                            video.getAttribute(
                                "src"
                            );


                        if (source) {

                            video.dataset.retryInitialized =
                                "true";


                            video.setAttribute(
                                "data-original-src",
                                source
                            );


                            loadTutorialVideoWithRetry(
                                video,
                                source
                            );

                        } else {

                            playTutorialVideo(
                                video
                            );

                        }

                    } else {

                        playTutorialVideo(
                            video
                        );

                    }

                }
            );

        }
    );

}


/* =========================================================
   SHOW TUTORIAL
   ========================================================= */

async function showTutorial(
    confirmClose = false
) {

    const loaded =
        await loadTutorial();


    if (!loaded) {
        return;
    }


    if (
        !tutorialOverlay ||
        !tutorialCard
    ) {

        return;

    }


    confirmBeforeClose =
        confirmClose;


    currentStep = 0;


    /*
     * Show tutorial before starting
     * the active video.
     */

    tutorialOverlay.hidden =
        false;


    tutorialCard.hidden =
        false;


    document.body.style.overflow =
        "hidden";


    updateTutorial();


    if (tutorialConfirmOverlay) {

        tutorialConfirmOverlay.hidden =
            true;

    }

}


/* =========================================================
   HIDE TUTORIAL
   ========================================================= */

function hideTutorial() {

    if (tutorialOverlay) {

        tutorialOverlay.hidden =
            true;

    }


    if (tutorialCard) {

        tutorialCard.hidden =
            true;

    }


    if (tutorialConfirmOverlay) {

        tutorialConfirmOverlay.hidden =
            true;

    }


    /*
     * Stop all tutorial videos.
     *
     * We intentionally do NOT call
     * video.load().
     */

    tutorialSteps.forEach(
        step => {

            const videos =
                step.querySelectorAll(
                    "video"
                );


            videos.forEach(
                video => {

                    video.pause();

                }
            );

        }
    );


    document.body.style.overflow =
        "";

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

        tutorialConfirmOverlay.hidden =
            false;

    }

}


/* =========================================================
   DOM READY
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        const tutorialButton =
            document.getElementById(
                "tutorialButton"
            );


        if (tutorialButton) {

            tutorialButton.addEventListener(
                "click",
                () => {

                    showTutorial(false);

                }
            );

        }


        if (
            sessionStorage.getItem(
                "showResultTutorial"
            ) === "true"
        ) {

            sessionStorage.removeItem(
                "showResultTutorial"
            );


            showTutorial(true);

        }

    }
);


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