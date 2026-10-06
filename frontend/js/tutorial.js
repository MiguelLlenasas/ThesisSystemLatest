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
   LANGUAGE HELPER & TRANSLATIONS
   ========================================================= */
function getCurrentLang() {
    return localStorage.getItem("app_lang") || "en";
}

function getTranslations(lang = "en") {
    if (lang === "tl") {
        return {
            nextBtn: "Susunod",
            finishBtn: "Tapusin",
            prevBtn: "Bumalik",
            stayBtn: "Manatili",
            skipBtn: "Laktawan"
        };
    }

    return {
        nextBtn: "Next",
        finishBtn: "Finish",
        prevBtn: "Previous",
        stayBtn: "Stay",
        skipBtn: "Skip"
    };
}

function updateTutorialLanguage() {
    const lang = getCurrentLang();
    const t = getTranslations(lang);

    // Update Confirm Dialog buttons
    if (tutorialStay) tutorialStay.textContent = t.stayBtn;
    if (tutorialSkip) tutorialSkip.textContent = t.skipBtn;

    // Update steps text if attributes exist
    tutorialSteps.forEach(step => {
        const translatableElements = step.querySelectorAll("[data-lang-en]");
        translatableElements.forEach(elem => {
            const translatedText = elem.getAttribute(`data-lang-${lang}`);
            if (translatedText) {
                elem.textContent = translatedText;
            }
        });
    });

    // Re-trigger button text updates
    if (tutorialNext) {
        tutorialNext.textContent =
            currentStep === tutorialSteps.length - 1
                ? t.finishBtn
                : t.nextBtn;
    }
}


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


function initializeTutorial() {

    tutorialOverlay =
        document.getElementById("tutorialOverlay");

    tutorialCard =
        document.getElementById("tutorialCard");

    tutorialClose =
        document.getElementById("tutorialClose");

    tutorialConfirmOverlay =
        document.getElementById("tutorialConfirmOverlay");

    tutorialStay =
        document.getElementById("tutorialStay");

    tutorialSkip =
        document.getElementById("tutorialSkip");

    tutorialSteps =
        document.querySelectorAll(".tutorial-step");

    tutorialPrev =
        document.getElementById("tutorialPrev");

    tutorialNext =
        document.getElementById("tutorialNext");

    tutorialProgress =
        document.querySelectorAll(
            "#tutorialProgress span"
        );


    if (!tutorialOverlay || !tutorialCard) {
        return;
    }


    tutorialClose?.addEventListener(
        "click",
        event => {

            event.stopPropagation();

            attemptClose();

        }
    );


    tutorialOverlay.addEventListener(
        "click",
        event => {

            if (
                event.target !== tutorialOverlay
            ) {
                return;
            }

            if (confirmBeforeClose) {
                return;
            }

            hideTutorial();

        }
    );


    tutorialCard.addEventListener(
        "click",
        event => {

            event.stopPropagation();

        }
    );


    tutorialPrev?.addEventListener(
        "click",
        () => {

            if (currentStep > 0) {

                currentStep--;

                updateTutorial();

            }

        }
    );


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


    tutorialSkip?.addEventListener(
        "click",
        () => {

            hideTutorial();

        }
    );


    tutorialStay?.addEventListener(
        "click",
        () => {

            if (tutorialConfirmOverlay) {
                tutorialConfirmOverlay.hidden = true;
            }

        }
    );


    updateTutorial();

}


function updateTutorial() {

    const lang = getCurrentLang();
    const t = getTranslations(lang);

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


    tutorialProgress.forEach(
        (dot, index) => {

            dot.classList.toggle(
                "active",
                index === currentStep
            );

        }
    );


    if (tutorialPrev) {

        tutorialPrev.disabled =
            currentStep === 0;

    }


    if (tutorialNext) {

        tutorialNext.textContent =
            currentStep ===
            tutorialSteps.length - 1
                ? t.finishBtn
                : t.nextBtn;

    }


    /*
     * =====================================================
     * VIDEO FIX
     * =====================================================
     */

    const activeStep =
        tutorialSteps[currentStep];

    if (activeStep) {

        const videos =
            activeStep.querySelectorAll(
                "video"
            );

        videos.forEach(
            video => {

                video.pause();

                video.load();

                const playVideo =
                    () => {

                        const playPromise =
                            video.play();

                        if (
                            playPromise &&
                            typeof playPromise.catch === "function"
                        ) {

                            playPromise.catch(
                                error => {

                                    console.warn(
                                        "Tutorial video autoplay was blocked:",
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

                } else {

                    video.addEventListener(
                        "loadeddata",
                        playVideo,
                        {
                            once: true
                        }
                    );

                }

            }
        );

    }

    // Siguraduhing na-a-apply ang tamang wika
    updateTutorialLanguage();

}


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
     * Show tutorial first so the browser
     * can properly initialize the video.
     */

    tutorialOverlay.hidden = false;

    tutorialCard.hidden = false;

    document.body.style.overflow =
        "hidden";


    updateTutorial();


    if (tutorialConfirmOverlay) {
        tutorialConfirmOverlay.hidden = true;
    }

}


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


    /*
     * Stop tutorial videos when closing.
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

// Pakinggan ang pagbabago ng wika mula sa language selector/toggle
window.addEventListener("languageChanged", () => {
    updateTutorialLanguage();
});

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