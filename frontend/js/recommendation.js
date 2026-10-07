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
 * maxAttempts   : how many times to retry before giving up
 * baseDelay     : wait time before a retry (ms). It grows with
 *                 each attempt: 1.5s, 3s, 4.5s, ...
 * imageTimeout  : if an image has not loaded after this long,
 *                 treat it as failed and retry (ms)
 * videoTimeout  : same, but for videos (ms)
 */

const MEDIA_RETRY = {
    maxAttempts: 4,
    baseDelay: 1500,
    imageTimeout: 10000,
    videoTimeout: 20000
};

/*
 * Media that used up all its retries is stored here.
 * When the browser comes back online, they all try again.
 */
const exhaustedMedia = new Set();

window.addEventListener("online", () => {

    const pending = Array.from(exhaustedMedia);

    exhaustedMedia.clear();

    pending.forEach((retryFn) => {
        retryFn();
    });

});


/*
 * ============================================================
 * LOAD MEDIA WITH AUTO RETRY
 * ============================================================
 * element      : <img> or <video>
 * src          : original file path
 * successEvent : "load" for images, "loadeddata" for videos
 * timeoutMs    : how long to wait before calling it a failure
 */

function addRetryParam(url, attempt) {

    const separator =
        url.includes("?") ? "&" : "?";

    return (
        url +
        separator +
        "reload=" +
        attempt +
        "_" +
        Date.now()
    );

}


function loadMediaWithRetry(
    element,
    src,
    successEvent,
    timeoutMs
) {

    let attempt = 0;
    let timeoutId = null;
    let retryId = null;
    let finished = false;

    function start() {

        retryId = null;

        clearTimeout(timeoutId);

        element.src =
            attempt === 0
                ? src
                : addRetryParam(src, attempt);

        if (element.tagName === "VIDEO") {
            element.load();
        }

        timeoutId =
            setTimeout(
                handleFailure,
                timeoutMs
            );

    }


    function handleFailure() {

        if (finished) {
            return;
        }

        /* a retry is already scheduled */
        if (retryId !== null) {
            return;
        }

        clearTimeout(timeoutId);

        if (attempt >= MEDIA_RETRY.maxAttempts) {

            exhaustedMedia.add(manualRetry);
            return;

        }

        attempt++;

        retryId =
            setTimeout(
                start,
                MEDIA_RETRY.baseDelay * attempt
            );

    }


    function handleSuccess() {

        finished = true;

        clearTimeout(timeoutId);
        clearTimeout(retryId);

        exhaustedMedia.delete(manualRetry);

    }


    function manualRetry() {

        finished = false;
        attempt = 0;

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


function updateRecommendation(data, censoredPassword) {

    if (!data) {
        return;
    }

    const imageContainer =
        document.getElementById("recommendationImage");

    const contentContainer =
        document.getElementById("recommendationContent");

    if (!imageContainer) {
        return;
    }

    if (!contentContainer) {
        return;
    }

    imageContainer.innerHTML = "";
    contentContainer.innerHTML = "";

    const strategies = Array.isArray(data.strategies)
        ? [...data.strategies]
        : [];

    const mfaStrategies = [];
    const otherStrategies = [];

    strategies.forEach((tip) => {

        const normalizedTip =
            String(tip || "").toLowerCase();

        if (
            normalizedTip.includes("mfa") ||
            normalizedTip.includes("multi-factor") ||
            normalizedTip.includes("multi factor") ||
            normalizedTip.includes("password manager")
        ) {
            mfaStrategies.push(tip);
        } else {
            otherStrategies.push(tip);
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
            data.password_comparison.status === "CURRENT_PREFERRED"
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
        findRecommendationImage(tip);

    const item =
        document.createElement("div");

    item.className =
        "recommendation-item";


    const imageWrapper =
        document.createElement("div");

    imageWrapper.className =
        "recommendation-image-wrapper";


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
            document.createElement("video");

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

                if (playPromise !== undefined) {

                    playPromise.catch(() => {});

                }

            }
        );


        /* auto reload (sets video.src itself) */
        loadMediaWithRetry(
            video,
            recommendationVideos[mediaName],
            "loadeddata",
            MEDIA_RETRY.videoTimeout
        );


        imageWrapper.appendChild(video);

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
            document.createElement("img");

        image.className =
            "recommendation-image";

        image.alt =
            mediaName;

        image.loading =
            "eager";

        image.decoding =
            "async";


        /* auto reload (sets image.src itself) */
        loadMediaWithRetry(
            image,
            recommendationImages[mediaName],
            "load",
            MEDIA_RETRY.imageTimeout
        );


        imageWrapper.appendChild(image);

    }


    const text =
        document.createElement("div");

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

function findRecommendationImage(text) {

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
        document.createElement("div");

    item.className =
        "recommendation-item recommendation-comparison-item";

    item.dataset.status =
        comparison.status;


    const imageWrapper =
        document.createElement("div");

    imageWrapper.className =
        "recommendation-image-wrapper";


    const image =
        document.createElement("img");

    image.className =
        "recommendation-image";

    image.alt =
        "Current Password Is Stronger Than Previous";

    image.loading =
        "eager";

    image.decoding =
        "async";


    /* auto reload (sets image.src itself) */
    loadMediaWithRetry(
        image,
        recommendationImages[
            "Current Password Is Stronger Than Previous"
        ],
        "load",
        MEDIA_RETRY.imageTimeout
    );


    imageWrapper.appendChild(
        image
    );


    const text =
        document.createElement("div");

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
        escapeRegex(passwordString);

    const maskedPassword =
        "*".repeat(passwordString.length);


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
            function (match, quote) {

                return (
                    "<span class=\"hidden-password\" " +
                    "data-password=\"" +
                    escapeHtmlAttr(passwordString) +
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

function escapeRegex(string) {

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

function escapeHtmlAttr(string) {

    return String(string)
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

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
                item.dataset.password || "";


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