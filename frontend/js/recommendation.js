console.log("Recommendation JS Connected");

const recommendationImages = {

    "Avoid Predictable Patterns": "../assets/images/Avoid Predictable Patterns.jpg",

    "Dictionary Words": "../assets/images/Dictionary Words.jpg",

    "Increase Password Length": "../assets/images/Increase Password Length.jpg",

    "MFA + Password Manager": "../assets/images/mfa-password-manager.jpg",

    "Similar Password Guesses": "../assets/images/Similar Password Guesses.jpg",

    "Change Password Every 6 Months": "../assets/images/ChangePassword.jpg",

    "Current Password Is Stronger Than Previous": "../assets/images/Current Password Is Stronger Than Previous.jpg"

};


const recommendationVideos = {

    "Add Character Variety": "../assets/Video/Add Char.mp4"

};


/*
 * ============================================================
 * AUTO RELOAD SETTINGS
 * ============================================================
 * Media retries forever until it loads.
 */

const MEDIA_RETRY = {

    baseDelay: 1500,

    maxDelay: 10000,

    imageTimeout: 10000,

    videoTimeout: 20000

};


/*
 * ============================================================
 * RETRY PARAMETER
 * ============================================================
 */

function addRetryParam(url, attempt) {

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


/*
 * ============================================================
 * SHOW / HIDE HELPER
 * ============================================================
 * Uses inline display so CSS rules can never override it
 * (the "hidden" attribute loses to any CSS display rule).
 */

function setShown(element, shown) {

    if (!element) {
        return;
    }


    if (shown) {

        element.hidden = false;

        element.style.removeProperty(
            "display"
        );

    } else {

        element.hidden = true;

        element.style.setProperty(
            "display",
            "none",
            "important"
        );

    }

}


/*
 * ============================================================
 * MEDIA STATUS UI
 * ============================================================
 */

function createMediaStatus(wrapper) {

    if (!wrapper) {
        return null;
    }


    let status =
        wrapper.querySelector(
            ".recommendation-media-status"
        );


    if (status) {
        return status;
    }


    status =
        document.createElement("div");

    status.className =
        "recommendation-media-status";


    const loader =
        document.createElement("div");

    loader.className =
        "recommendation-media-loader";


    const loadingText =
        document.createElement("p");

    loadingText.className =
        "recommendation-media-loading-text";

    loadingText.textContent =
        "Loading media...";


    const errorIcon =
        document.createElement("div");

    errorIcon.className =
        "recommendation-media-error-icon";

    errorIcon.textContent =
        "!";


    const errorTitle =
        document.createElement("p");

    errorTitle.className =
        "recommendation-media-error-title";

    errorTitle.textContent =
        "Media unavailable";


    const errorText =
        document.createElement("p");

    errorText.className =
        "recommendation-media-error-text";

    errorText.textContent =
        "The media could not be loaded.";


    const reloadButton =
        document.createElement("button");

    reloadButton.className =
        "recommendation-media-reload";

    reloadButton.type =
        "button";

    reloadButton.textContent =
        "Reload";


    status.appendChild(loader);

    status.appendChild(
        loadingText
    );

    status.appendChild(
        errorIcon
    );

    status.appendChild(
        errorTitle
    );

    status.appendChild(
        errorText
    );

    status.appendChild(
        reloadButton
    );


    wrapper.appendChild(status);


    status.dataset.state =
        "loading";


    updateMediaStatus(
        status,
        "loading"
    );


    return status;

}


/*
 * ============================================================
 * UPDATE MEDIA STATUS
 * ============================================================
 */

function updateMediaStatus(
    status,
    state,
    retryFunction = null
) {

    if (!status) {
        return;
    }


    const loader =
        status.querySelector(
            ".recommendation-media-loader"
        );

    const loadingText =
        status.querySelector(
            ".recommendation-media-loading-text"
        );

    const errorIcon =
        status.querySelector(
            ".recommendation-media-error-icon"
        );

    const errorTitle =
        status.querySelector(
            ".recommendation-media-error-title"
        );

    const errorText =
        status.querySelector(
            ".recommendation-media-error-text"
        );

    const reloadButton =
        status.querySelector(
            ".recommendation-media-reload"
        );


    status.dataset.state =
        state;


    if (state === "loading") {

        setShown(status, true);

        setShown(loader, true);

        setShown(loadingText, true);

        setShown(errorIcon, false);

        setShown(errorTitle, false);

        setShown(errorText, false);

        setShown(reloadButton, false);

        return;

    }


    if (state === "success") {

        setShown(status, false);

        return;

    }


    if (state === "error") {

        setShown(status, true);

        setShown(loader, false);

        setShown(loadingText, false);

        setShown(errorIcon, true);

        setShown(errorTitle, true);

        setShown(errorText, true);

        setShown(reloadButton, true);

        if (reloadButton) {

            reloadButton.onclick =
                () => {

                    updateMediaStatus(
                        status,
                        "loading"
                    );

                    if (retryFunction) {
                        retryFunction();
                    }

                };

        }

    }

}


/*
 * ============================================================
 * LOAD MEDIA WITH AUTO RETRY (RETRIES UNTIL IT LOADS)
 * ============================================================
 */

function loadMediaWithRetry(
    element,
    src,
    successEvent,
    timeoutMs,
    status = null
) {

    if (
        !element ||
        !src
    ) {

        return;

    }


    let attempt = 0;

    let timeoutId = null;

    let retryId = null;

    let finished = false;

    let wasConnected = false;

    let waitingForOnline = false;


    /*
     * Stop retrying if the element was removed from the page
     * (for example when recommendations are re-rendered).
     */

    function isDetached() {

        if (element.isConnected) {

            wasConnected = true;

            return false;

        }


        return wasConnected;

    }


    function stop() {

        finished = true;

        clearTimeout(timeoutId);

        clearTimeout(retryId);

        window.removeEventListener(
            "online",
            onOnline
        );

    }


    function setLoadingMessage() {

        if (!status) {
            return;
        }


        updateMediaStatus(
            status,
            "loading"
        );


        const loadingText =
            status.querySelector(
                ".recommendation-media-loading-text"
            );


        if (loadingText) {

            loadingText.textContent =
                attempt > 0
                    ? "Loading media... retrying (" +
                      attempt +
                      ")"
                    : "Loading media...";

        }

    }


    function start() {

        if (finished) {
            return;
        }


        if (isDetached()) {

            stop();

            return;

        }


        retryId = null;


        clearTimeout(
            timeoutId
        );


        setLoadingMessage();


        element.src =
            attempt === 0
                ? src
                : addRetryParam(
                    src,
                    attempt
                );


        if (
            element.tagName ===
            "VIDEO"
        ) {

            element.load();

        }


        /*
         * Timeout grows with each attempt so slow
         * connections still get a chance to finish.
         */

        const currentTimeout =
            Math.min(
                timeoutMs + attempt * 5000,
                timeoutMs * 3
            );


        timeoutId =
            setTimeout(
                handleFailure,
                currentTimeout
            );

    }


    function onOnline() {

        waitingForOnline = false;

        if (finished) {
            return;
        }


        clearTimeout(retryId);

        retryId = null;

        start();

    }


    function handleFailure() {

        if (finished) {
            return;
        }


        if (isDetached()) {

            stop();

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


        /*
         * Offline: wait for connection instead of
         * burning attempts.
         */

        if (!navigator.onLine) {

            if (!waitingForOnline) {

                waitingForOnline = true;

                window.addEventListener(
                    "online",
                    onOnline,
                    { once: true }
                );

            }

            setLoadingMessage();

            return;

        }


        attempt++;


        console.warn(
            "Retrying media (attempt " +
            attempt +
            "):",
            src
        );


        const delay =
            Math.min(
                MEDIA_RETRY.baseDelay *
                    attempt,
                MEDIA_RETRY.maxDelay
            );


        retryId =
            setTimeout(
                start,
                delay
            );

    }


    function handleSuccess() {

        if (finished) {
            return;
        }


        stop();


        if (status) {

            updateMediaStatus(
                status,
                "success"
            );

        }

    }


    function manualRetry() {

        stop();


        finished = false;

        attempt = 0;


        setLoadingMessage();


        start();

    }


    element.addEventListener(
        successEvent,
        handleSuccess
    );


    element.addEventListener(
        "error",
        handleFailure
    );


    start();

}


/*
 * ============================================================
 * UPDATE RECOMMENDATION
 * ============================================================
 */

function updateRecommendation(
    data,
    censoredPassword
) {

    if (!data) {
        return;
    }


    const imageContainer =
        document.getElementById(
            "recommendationImage"
        );


    const contentContainer =
        document.getElementById(
            "recommendationContent"
        );


    if (!imageContainer) {
        return;
    }


    if (!contentContainer) {
        return;
    }


    imageContainer.innerHTML =
        "";


    contentContainer.innerHTML =
        "";


    const strategies =
        Array.isArray(
            data.strategies
        )
            ? [...data.strategies]
            : [];


    const mfaStrategies = [];

    const otherStrategies = [];


    strategies.forEach((tip) => {

        const normalizedTip =
            String(tip || "")
                .toLowerCase();


        if (
            normalizedTip.includes("mfa") ||
            normalizedTip.includes("multi-factor") ||
            normalizedTip.includes("multi factor") ||
            normalizedTip.includes("password manager")
        ) {

            mfaStrategies.push(
                tip
            );

        } else {

            otherStrategies.push(
                tip
            );

        }

    });


    otherStrategies.forEach((tip) => {

        renderRecommendationItem(
            tip,
            censoredPassword,
            contentContainer
        );

    });


    renderComparison(
        data.password_comparison,
        contentContainer
    );


    mfaStrategies.forEach((tip) => {

        renderRecommendationItem(
            tip,
            censoredPassword,
            contentContainer
        );

    });


    if (
        otherStrategies.length === 0 &&
        mfaStrategies.length === 0 &&
        !(
            data.password_comparison &&
            data.password_comparison.status ===
                "CURRENT_PREFERRED"
        )
    ) {

        contentContainer.innerHTML =
            "<p>No recommendations available.</p>";

    }


    activatePasswordReveal();

}


/*
 * ============================================================
 * RENDER RECOMMENDATION ITEM
 * ============================================================
 */

function renderRecommendationItem(
    tip,
    censoredPassword,
    contentContainer
) {

    const mediaName =
        findRecommendationImage(
            tip
        );


    const item =
        document.createElement(
            "div"
        );


    item.className =
        "recommendation-item";


    const imageWrapper =
        document.createElement(
            "div"
        );


    imageWrapper.className =
        "recommendation-image-wrapper";


    /*
     * =====================================================
     * MEDIA STATUS
     * =====================================================
     */

    let mediaStatus = null;


    if (
        mediaName &&
        (
            recommendationVideos[mediaName] ||
            recommendationImages[mediaName]
        )
    ) {

        mediaStatus =
            createMediaStatus(
                imageWrapper
            );

    }


    /*
     * =====================================================
     * ADD CHARACTER VARIETY = VIDEO
     * =====================================================
     */

    if (
        mediaName &&
        recommendationVideos[mediaName]
    ) {

        const video =
            document.createElement(
                "video"
            );


        video.className =
            "recommendation-image recommendation-video";


        video.setAttribute(
            "aria-label",
            mediaName
        );


        video.autoplay = true;

        video.loop = true;

        video.muted = true;

        video.playsInline = true;

        video.preload = "auto";


        video.setAttribute(
            "webkit-playsinline",
            ""
        );


        video.addEventListener(
            "loadeddata",
            () => {

                const playPromise =
                    video.play();


                if (
                    playPromise !==
                    undefined
                ) {

                    playPromise.catch(
                        () => {}
                    );

                }

            }
        );


        /*
         * Auto reload
         */

        loadMediaWithRetry(
            video,
            recommendationVideos[
                mediaName
            ],
            "loadeddata",
            MEDIA_RETRY.videoTimeout,
            mediaStatus
        );


        imageWrapper.appendChild(
            video
        );

    }


    /*
     * =====================================================
     * ALL OTHER RECOMMENDATIONS = IMAGE
     * =====================================================
     */

    else if (
        mediaName &&
        recommendationImages[mediaName]
    ) {

        const image =
            document.createElement(
                "img"
            );


        image.className =
            "recommendation-image";


        image.alt =
            mediaName;


        image.loading =
            "eager";


        image.decoding =
            "async";


        /*
         * Auto reload
         */

        loadMediaWithRetry(
            image,
            recommendationImages[
                mediaName
            ],
            "load",
            MEDIA_RETRY.imageTimeout,
            mediaStatus
        );


        imageWrapper.appendChild(
            image
        );

    }


    const text =
        document.createElement(
            "div"
        );


    text.className =
        "recommendation-text";


    text.innerHTML =
        censorPassword(
            tip,
            censoredPassword
        );


    item.appendChild(
        imageWrapper
    );


    item.appendChild(
        text
    );


    contentContainer.appendChild(
        item
    );

}


/*
 * ============================================================
 * FIND RECOMMENDATION MEDIA
 * ============================================================
 */

function findRecommendationImage(
    text
) {

    if (!text) {
        return null;
    }


    const normalizedText =
        String(text).toLowerCase();


    /*
     * PASSWORD LENGTH
     */

    if (
        normalizedText.includes("length") ||
        normalizedText.includes("longer")
    ) {

        return "Increase Password Length";

    }


    /*
     * CHARACTER VARIETY
     */

    if (
        normalizedText.includes("uppercase") ||
        normalizedText.includes("lowercase") ||
        normalizedText.includes("character variety") ||
        normalizedText.includes("character types") ||
        normalizedText.includes("variety of characters") ||
        normalizedText.includes("more variety") ||
        normalizedText.includes("types for more variety") ||
        normalizedText.includes("unpredictability") ||
        normalizedText.includes("unpredictable") ||
        normalizedText.includes("symbol") ||
        normalizedText.includes("digit")
    ) {

        return "Add Character Variety";

    }


    /*
     * DICTIONARY
     */

    if (
        normalizedText.includes("dictionary") ||
        normalizedText.includes("common word") ||
        normalizedText.includes("common words")
    ) {

        return "Dictionary Words";

    }


    /*
     * PREDICTABLE PATTERNS
     */

    if (
        normalizedText.includes("predictable") ||
        normalizedText.includes("pattern") ||
        normalizedText.includes("patterns") ||
        normalizedText.includes("sequence") ||
        normalizedText.includes("simple or obvious") ||
        normalizedText.includes("obvious additions") ||
        normalizedText.includes("random word") ||
        normalizedText.includes("random phrase") ||
        normalizedText.includes("unrelated words") ||
        normalizedText.includes("stronger structure")
    ) {

        return "Avoid Predictable Patterns";

    }


    /*
     * SIMILAR PASSWORD
     */

    if (
        normalizedText.includes("similar password") ||
        normalizedText.includes("similar passwords") ||
        normalizedText.includes("similar") ||
        normalizedText.includes("guess") ||
        normalizedText.includes("guesses")
    ) {

        return "Similar Password Guesses";

    }


    /*
     * PASSWORD CHANGE
     */

    if (
        normalizedText.includes("6 months") ||
        normalizedText.includes("six months") ||
        normalizedText.includes("change your password every")
    ) {

        return "Change Password Every 6 Months";

    }


    /*
     * MFA
     */

    if (
        normalizedText.includes("mfa") ||
        normalizedText.includes("multi-factor") ||
        normalizedText.includes("multi factor") ||
        normalizedText.includes("password manager")
    ) {

        return "MFA + Password Manager";

    }


    return null;

}


/*
 * ============================================================
 * PASSWORD COMPARISON
 * ============================================================
 */

function renderComparison(
    comparison,
    container
) {

    if (!comparison) {
        return;
    }


    if (
        comparison.status !==
        "CURRENT_PREFERRED"
    ) {

        return;

    }


    if (!comparison.message) {
        return;
    }


    const item =
        document.createElement(
            "div"
        );


    item.className =
        "recommendation-item recommendation-comparison-item";


    item.dataset.status =
        comparison.status;


    const imageWrapper =
        document.createElement(
            "div"
        );


    imageWrapper.className =
        "recommendation-image-wrapper";


    const mediaStatus =
        createMediaStatus(
            imageWrapper
        );


    const image =
        document.createElement(
            "img"
        );


    image.className =
        "recommendation-image";


    image.alt =
        "Current Password Is Stronger Than Previous";


    image.loading =
        "eager";


    image.decoding =
        "async";


    /*
     * Auto reload
     */

    loadMediaWithRetry(
        image,
        recommendationImages[
            "Current Password Is Stronger Than Previous"
        ],
        "load",
        MEDIA_RETRY.imageTimeout,
        mediaStatus
    );


    imageWrapper.appendChild(
        image
    );


    const text =
        document.createElement(
            "div"
        );


    text.className =
        "recommendation-text comparison-text";


    text.textContent =
        comparison.message;


    item.appendChild(
        imageWrapper
    );

    item.appendChild(
        text
    );


    container.appendChild(
        item
    );

}


/*
 * ============================================================
 * CENSOR PASSWORD
 * ============================================================
 */

function censorPassword(
    text,
    password
) {

    if (!text) {
        return "-";
    }


    if (!password) {
        return String(text);
    }


    const passwordString =
        String(password);


    const escapedPassword =
        escapeRegex(
            passwordString
        );


    const maskedPassword =
        "*".repeat(
            passwordString.length
        );


    const quotedRegex =
        new RegExp(
            "([\"'])" +
            escapedPassword +
            "\\1",
            "g"
        );


    const result =
        String(text).replace(
            quotedRegex,
            function (
                match,
                quote
            ) {

                return (
                    "<span class=\"hidden-password\" " +
                    "data-password=\"" +
                    escapeHtmlAttr(
                        passwordString
                    ) +
                    "\">" +
                    maskedPassword +
                    "</span>"
                );

            }
        );


    return result;

}


/*
 * ============================================================
 * ESCAPE REGEX
 * ============================================================
 */

function escapeRegex(
    string
) {

    return String(string).replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
    );

}


/*
 * ============================================================
 * ESCAPE HTML ATTRIBUTE
 * ============================================================
 */

function escapeHtmlAttr(
    string
) {

    return String(string)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        );

}


/*
 * ============================================================
 * PASSWORD REVEAL
 * ============================================================
 */

function activatePasswordReveal() {

    const hiddenPasswords =
        document.querySelectorAll(
            ".hidden-password"
        );


    hiddenPasswords.forEach(
        (item) => {

            if (
                item.dataset.listenerAttached
            ) {

                return;

            }


            item.dataset.listenerAttached =
                "true";


            const password =
                item.dataset.password ||
                "";


            if (!password) {
                return;
            }


            const masked =
                "*".repeat(
                    password.length
                );


            item.textContent =
                masked;


            function show() {

                item.textContent =
                    password;

            }


            function hide() {

                item.textContent =
                    masked;

            }


            item.addEventListener(
                "pointerdown",
                show
            );


            item.addEventListener(
                "pointerup",
                hide
            );


            item.addEventListener(
                "pointerleave",
                hide
            );


            item.addEventListener(
                "pointercancel",
                hide
            );


            item.addEventListener(
                "touchstart",
                show,
                {
                    passive: true
                }
            );


            item.addEventListener(
                "touchend",
                hide
            );


            item.addEventListener(
                "touchcancel",
                hide
            );

        }
    );

}