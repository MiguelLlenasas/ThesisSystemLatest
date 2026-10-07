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
   LOAD TUTORIAL
   ========================================================= */

async function loadTutorial() {

    if (tutorialLoaded) {
        return true;
    }

    try {

        const response = await fetch(
            "../pages/components/tutorial.html",
            {
                cache: "no-cache"
            }
        );

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const html = await response.text();

        const wrapper = document.createElement("div");

        wrapper.innerHTML = html.trim();

        document.body.insertAdjacentHTML(
            "beforeend",
            wrapper.innerHTML
        );

        tutorialLoaded = true;

        initializeTutorial();

        return true;

    } catch (error) {

        console.error(
            "Failed to load tutorial.html:",
            error
        );

        return false;

    }

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
     * Calling load() repeatedly can trigger:
     *
     * ERR_CACHE_OPERATION_NOT_SUPPORTED
     *
     * especially when running the project locally.
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

                    /*
                     * Autoplay restrictions are
                     * normal and should not break
                     * the tutorial.
                     */

                    console.warn(
                        "Tutorial video could not autoplay:",
                        error
                    );

                }
            );

        }

    };


    /*
     * If the browser already has enough
     * data, play immediately.
     */

    if (
        video.readyState >= 2
    ) {

        playVideo();

        return;

    }


    /*
     * Otherwise wait for the browser's
     * existing media loading process.
     */

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
   UPDATE TUTORIAL
   ========================================================= */

function updateTutorial() {

    tutorialSteps.forEach(
        (step, index) => {

            const active =
                index === currentStep;

            step.hidden = !active;

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
                     * Stop videos that are not
                     * part of the active step.
                     */

                    if (
                        index !== currentStep
                    ) {

                        video.pause();

                        return;

                    }


                    /*
                     * Reset only the playback
                     * position.
                     *
                     * This does NOT force the
                     * browser to reload the file.
                     */

                    try {

                        video.currentTime = 0;

                    } catch (error) {

                        console.warn(
                            "Unable to reset tutorial video:",
                            error
                        );

                    }


                    playTutorialVideo(
                        video
                    );

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

    tutorialOverlay.hidden = false;

    tutorialCard.hidden = false;


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