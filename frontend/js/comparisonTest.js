// COMPARISON TEST PAGE - comparisonTest.js
fetch("https://thesissystemlatest.onrender.com/analyze", { method: "HEAD" }).catch(() => {});

/* =========================================================
   LANGUAGE HELPER
   ========================================================= */

function getCurrentLang() {
    return localStorage.getItem("app_lang") || "en";
}


// PASSWORD VISIBILITY TOGGLE
const passwordInput = document.getElementById("comparePasswordInput");
const togglePassword = document.getElementById("togglePassword");
const eyeOpen = document.getElementById("eyeOpen");
const eyeClosed = document.getElementById("eyeClosed");

if (passwordInput && togglePassword) {
    togglePassword.addEventListener("click", () => {
        const isHidden = passwordInput.type === "password";

        passwordInput.type = isHidden ? "text" : "password";
        eyeOpen.classList.toggle("hidden", isHidden);
        eyeClosed.classList.toggle("hidden", !isHidden);
    });
}


// INFORMATION PANEL
const scene = document.querySelector(".scene");
const infoButton = document.getElementById("infoButton");
const closeInfo = document.getElementById("closeInfo");

if (infoButton) {
    infoButton.addEventListener("click", () => {
        scene.classList.toggle("show-info");
    });
}

if (closeInfo) {
    closeInfo.addEventListener("click", () => {
        scene.classList.remove("show-info");
    });
}


// INFORMATION CONTENT
const infoButtons = document.querySelectorAll(".info-option");
const infoTitle = document.getElementById("infoTitle");
const infoContent = document.getElementById("infoContent");


// TUTORIAL ZOOM
let zoomImages = [];
let zoomIndex = 0;

function createZoomOverlay() {
    let overlay = document.getElementById("imageZoomOverlay");

    if (overlay) {
        return overlay;
    }

    overlay = document.createElement("div");
    overlay.id = "imageZoomOverlay";
    overlay.className = "image-zoom-overlay";

    overlay.innerHTML = `
        <button class="image-zoom-close" type="button">×</button>

        <button class="image-zoom-prev" type="button">
            &#10094;
        </button>

        <img class="image-zoom-preview" alt="">

        <button class="image-zoom-next" type="button">
            &#10095;
        </button>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector(".image-zoom-close")
        .addEventListener("click", closeZoom);

    overlay.querySelector(".image-zoom-prev")
        .addEventListener("click", event => {
            event.stopPropagation();
            changeZoom(-1);
        });

    overlay.querySelector(".image-zoom-next")
        .addEventListener("click", event => {
            event.stopPropagation();
            changeZoom(1);
        });

    overlay.addEventListener("click", event => {
        if (event.target === overlay) {
            closeZoom();
        }
    });

    return overlay;
}


function openZoom(images, index, navigation) {
    zoomImages = images;
    zoomIndex = index;

    const overlay = createZoomOverlay();

    const previous =
        overlay.querySelector(".image-zoom-prev");

    const next =
        overlay.querySelector(".image-zoom-next");

    previous.classList.toggle(
        "visible",
        navigation && images.length > 1
    );

    next.classList.toggle(
        "visible",
        navigation && images.length > 1
    );

    updateZoom();

    overlay.classList.add("active");
    document.body.classList.add("image-zoom-open");
}


function updateZoom() {
    const overlay =
        document.getElementById("imageZoomOverlay");

    if (!overlay || !zoomImages.length) {
        return;
    }

    const preview =
        overlay.querySelector(".image-zoom-preview");

    preview.src =
        zoomImages[zoomIndex].src;

    preview.alt =
        zoomImages[zoomIndex].alt || "";

    if (
        zoomImages.length > 1 &&
        zoomImages[zoomIndex].classList.contains(
            "tutorial-slide"
        )
    ) {
        updateSlide(zoomIndex);
    }
}


function changeZoom(direction) {
    if (zoomImages.length <= 1) {
        return;
    }

    zoomIndex += direction;

    if (zoomIndex < 0) {
        zoomIndex = zoomImages.length - 1;
    }

    if (zoomIndex >= zoomImages.length) {
        zoomIndex = 0;
    }

    updateZoom();
}


function closeZoom() {
    const overlay =
        document.getElementById("imageZoomOverlay");

    if (overlay) {
        overlay.classList.remove("active");
    }

    document.body.classList.remove("image-zoom-open");
}


// KEYBOARD ZOOM CONTROLS
document.addEventListener("keydown", event => {
    const overlay =
        document.getElementById("imageZoomOverlay");

    if (
        !overlay ||
        !overlay.classList.contains("active")
    ) {
        return;
    }

    if (event.key === "Escape") {
        closeZoom();
    }

    if (event.key === "ArrowLeft") {
        event.preventDefault();
        changeZoom(-1);
    }

    if (event.key === "ArrowRight") {
        event.preventDefault();
        changeZoom(1);
    }
});


// TUTORIAL SLIDER
function initializeTutorial() {

    const slides =
        document.querySelectorAll(".tutorial-slide");

    const dots =
        document.querySelectorAll(".dot");

    const allTutorialImages =
        document.querySelectorAll(
            ".tutorial-container img"
        );

    if (!allTutorialImages.length) {
        return;
    }


    // STEP 1 AND STEP 2
    allTutorialImages.forEach(image => {

        if (
            !image.classList.contains(
                "tutorial-slide"
            )
        ) {
            image.onclick = event => {

                event.stopPropagation();

                openZoom(
                    [image],
                    0,
                    false
                );
            };
        }
    });


    // STEP 3 IMAGES
    slides.forEach((slide, index) => {

        slide.onclick = event => {

            event.stopPropagation();

            openZoom(
                Array.from(slides),
                index,
                true
            );
        };
    });


    // STEP 3 DOTS
    dots.forEach((dot, index) => {

        dot.onclick = event => {

            event.stopPropagation();

            showSlide(index);
        };
    });


    showSlide(0);
}


function showSlide(index) {

    const slides =
        document.querySelectorAll(".tutorial-slide");

    const dots =
        document.querySelectorAll(".dot");

    if (!slides.length) {
        return;
    }

    if (index < 0) {
        index = slides.length - 1;
    }

    if (index >= slides.length) {
        index = 0;
    }

    slides.forEach(slide => {
        slide.classList.remove("active");
    });

    dots.forEach(dot => {
        dot.classList.remove("active");
    });

    slides[index].classList.add("active");

    if (dots[index]) {
        dots[index].classList.add("active");
    }
}


function updateSlide(index) {

    const slides =
        document.querySelectorAll(".tutorial-slide");

    const dots =
        document.querySelectorAll(".dot");

    if (!slides.length) {
        return;
    }

    slides.forEach(slide => {
        slide.classList.remove("active");
    });

    dots.forEach(dot => {
        dot.classList.remove("active");
    });

    if (slides[index]) {
        slides[index].classList.add("active");
    }

    if (dots[index]) {
        dots[index].classList.add("active");
    }
}


// INFORMATION DATA (TRANSLATED DICTIONARY)
function getInformationData(lang = "en") {
    if (lang === "tl") {
        return {
            about: {
                title: "Tungkol sa Pagsusuri ng Paghahambing",
                content: `
                <h3>Pagsusuri sa Paghahambing ng Password</h3>

                <p>
                Ang tampok na ito ay nagbibigay-daan sa mga user na magsuri ng isa pang
                password at ihambing ang posibleng kahinaan nito
                laban sa naunang nasuring password.
                </p>

                <p>
                Sinusuri ng system ang mga katangian ng password at itinatakda kung ang bagong password ay nagbibigay ng
                mas malakas o mas mahinang proteksyon laban sa mga posibleng
                estratehiya ng pag-crack.
                </p>

                <p>
                Mga kinuhang feature ng password lamang ang pinoproseso.
                Ang orihinal na password ay hindi itinatago ng system.
                </p>
                `
            },

            process: {
                title: "Proseso ng Paghahambing",
                content: `
                <h3>Daloy ng Paghahambing ng Password</h3>

                <ol>
                    <li>Magpapasok ang user ng bagong password para ihambing.</li>
                    <li>Kukunin ng system ang mga katangian ng password.</li>
                    <li>Susuriin ang nabuong representasyon ng password.</li>
                    <li>Tukuyin ng Decision Tree classifier ang posibleng kategorya ng kahinaan.</li>
                    <li>Ihahambing ang resulta ng bagong password sa naunang pagsusuri.</li>
                    <li>Ipapalabas ang mga kaalaman sa seguridad at mga pagpapabuti.</li>
                </ol>
                `
            },

            analysis: {
                title: "Mga Inihambing na Katangian ng Password",
                content: `
                <h3>Mga Kinuhang Katangian ng Password</h3>

                <p>
                Inihahambing ng system ang mga istruktura ng password nang
                hindi itinatago ang orihinal na password.
                </p>

                <ul>
                    <li>Haba ng Password</li>
                    <li>Paggamit ng Maliliit at Malalaking Titik</li>
                    <li>Pagkakaroon ng Numero at Simbolo</li>
                    <li>Pagtukoy sa Salitang Diksyonaryo</li>
                    <li>Mga Pattern ng Leetspeak</li>
                    <li>Magkakasunod na Pattern (Sequential)</li>
                    <li>Inuulit na mga Karakter</li>
                    <li>Mga Pattern na Batay sa Alituntunin (Rule-Based)</li>
                </ul>
                `
            },

            methods: {
                title: "Paghahambing ng Paraan ng Pag-crack",
                content: `
                <h3>Mga Kategorya ng Kahinaan</h3>

                <ul>
                    <li>
                        <strong>Dictionary Attack</strong>
                        <br>
                        Pagtukoy sa mga password na gumagamit ng karaniwang salita
                        o madaling hulaang parirala.
                    </li>

                    <li>
                        <strong>Brute Force Attack</strong>
                        <br>
                        Pagsusuri sa resistensya laban sa mga pagsubok sa kombinasyon ng karakter.
                    </li>

                    <li>
                        <strong>Rule-Based Attack</strong>
                        <br>
                        Pagtukoy sa mga madaling hulaang pagbabago
                        tulad ng idinagdag na numero o pagpapalit ng titik.
                    </li>
                </ul>
                `
            },

            decision: {
                title: "Paghahambing sa Decision Tree",
                content: `
                <h3>Modelong Pang-klasipika</h3>

                <p>
                Sinusuri ng Decision Tree classifier ang
                mga kinuhang katangian ng bagong password.
                </p>

                <p>
                Ang nabuong resulta ay ihahambing sa
                naunang pagsusuri ng password.
                </p>

                <p>
                Makatutulong ito upang malaman kung ang bagong password
                ay nagbibigay ng mas pinabuting seguridad.
                </p>
                `
            },

            tutorial: {
                title: "Tutorial sa Paghahambing",
                content: `
                <h3>Paano Maghambing ng mga Password</h3>

                <p>
                Sundin ang mga hakbang na ito upang maghambing ng bagong password.
                </p>

                <div class="tutorial-container">

                    <p>
                    Hakbang 1: Ipasok ang password na nais mong ihambing.
                    </p>

                    <img
                        src="../assets/images/step1.png"
                        alt="Hakbang 1: Ipasok ang password"
                    >

                </div>


                <div class="tutorial-container">

                    <p>
                    Hakbang 2: I-click ang compare password upang i-proseso
                    ang bagong password.
                    </p>

                    <img
                        src="../assets/images/step2.png"
                        alt="Hakbang 2: Ihambing ang password"
                    >

                </div>


                <div class="tutorial-container">

                    <p>
                    Hakbang 3: Suriin ang resulta ng paghahambing.
                    </p>

                    <p>
                    I-click ang larawan upang palakihin ito.
                    </p>

                    <div class="tutorial-slider">

                        <img
                            class="tutorial-slide active"
                            src="../assets/images/step3%20(1).png"
                            alt="Hakbang 3: Resulta ng paghahambing 1"
                        >

                        <img
                            class="tutorial-slide"
                            src="../assets/images/step3%20(2).png"
                            alt="Hakbang 3: Resulta ng paghahambing 2"
                        >

                        <img
                            class="tutorial-slide"
                            src="../assets/images/step3%20(3).png"
                            alt="Hakbang 3: Resulta ng paghahambing 3"
                        >

                        <img
                            class="tutorial-slide"
                            src="../assets/images/step3%20(4).png"
                            alt="Hakbang 3: Resulta ng paghahambing 4"
                        >

                        <img
                            class="tutorial-slide"
                            src="../assets/images/step3%20(5).png"
                            alt="Hakbang 3: Resulta ng paghahambing 5"
                        >

                        <img
                            class="tutorial-slide"
                            src="../assets/images/step3%20(6).png"
                            alt="Hakbang 3: Resulta ng paghahambing 6"
                        >

                        <img
                            class="tutorial-slide"
                            src="../assets/images/step3%20(7).png"
                            alt="Hakbang 3: Resulta ng paghahambing 7"
                        >

                    </div>

                    <div class="tutorial-dots">

                        <span class="dot active"></span>
                        <span class="dot"></span>
                        <span class="dot"></span>
                        <span class="dot"></span>
                        <span class="dot"></span>
                        <span class="dot"></span>
                        <span class="dot"></span>

                    </div>

                </div>
                `
            }
        };
    }

    return {
        about: {
            title: "About Comparison Test",
            content: `
            <h3>Password Comparison Assessment</h3>

            <p>
            This feature allows users to evaluate another
            password and compare its possible vulnerability
            against the previously analyzed password.
            </p>

            <p>
            The system examines password characteristics
            and determines whether the new password provides
            stronger or weaker protection against possible
            cracking strategies.
            </p>

            <p>
            Only extracted password features are processed.
            The original password is not stored by the system.
            </p>
            `
        },

        process: {
            title: "Comparison Process",
            content: `
            <h3>Password Comparison Flow</h3>

            <ol>
                <li>User enters a new password for comparison.</li>
                <li>The system extracts password characteristics.</li>
                <li>The generated password representation is evaluated.</li>
                <li>The Decision Tree classifier identifies the possible vulnerability category.</li>
                <li>The new password result is compared with the previous analysis.</li>
                <li>Security insights and improvements are displayed.</li>
            </ol>
            `
        },

        analysis: {
            title: "Password Features Compared",
            content: `
            <h3>Extracted Password Characteristics</h3>

            <p>
            The system compares password structures without
            storing the original password.
            </p>

            <ul>
                <li>Password Length</li>
                <li>Lowercase and Uppercase Usage</li>
                <li>Number and Symbol Presence</li>
                <li>Dictionary Word Detection</li>
                <li>Leetspeak Patterns</li>
                <li>Sequential Patterns</li>
                <li>Repeated Characters</li>
                <li>Rule-Based Patterns</li>
            </ul>
            `
        },

        methods: {
            title: "Cracking Methods Comparison",
            content: `
            <h3>Vulnerability Categories</h3>

            <ul>
                <li>
                    <strong>Dictionary Attack</strong>
                    <br>
                    Detects passwords using common words
                    or predictable phrases.
                </li>

                <li>
                    <strong>Brute Force Attack</strong>
                    <br>
                    Evaluates resistance against character
                    combination attempts.
                </li>

                <li>
                    <strong>Rule-Based Attack</strong>
                    <br>
                    Identifies predictable modifications
                    such as added numbers or substitutions.
                </li>
            </ul>
            `
        },

        decision: {
            title: "Decision Tree Comparison",
            content: `
            <h3>Classification Model</h3>

            <p>
            The Decision Tree classifier evaluates
            the extracted characteristics of the new password.
            </p>

            <p>
            The generated result is compared with the
            previous password assessment.
            </p>

            <p>
            This helps determine whether the new password
            provides improved security.
            </p>
            `
        },

        tutorial: {
            title: "Comparison Tutorial",
            content: `
            <h3>How To Compare Passwords</h3>

            <p>
            Follow these steps to compare a new password.
            </p>

            <div class="tutorial-container">

                <p>
                Step 1: Enter the password you want to compare.
                </p>

                <img
                    src="../assets/images/step1.png"
                    alt="Step 1: Enter password"
                >

            </div>


            <div class="tutorial-container">

                <p>
                Step 2: Click compare password to process
                the new password.
                </p>

                <img
                    src="../assets/images/step2.png"
                    alt="Step 2: Compare password"
                >

            </div>


            <div class="tutorial-container">

                <p>
                Step 3: Review the comparison result.
                </p>

                <p>
                Click an image to enlarge it.
                </p>

                <div class="tutorial-slider">

                    <img
                        class="tutorial-slide active"
                        src="../assets/images/step3%20(1).png"
                        alt="Step 3: Comparison result 1"
                    >

                    <img
                        class="tutorial-slide"
                        src="../assets/images/step3%20(2).png"
                        alt="Step 3: Comparison result 2"
                    >

                    <img
                        class="tutorial-slide"
                        src="../assets/images/step3%20(3).png"
                        alt="Step 3: Comparison result 3"
                    >

                    <img
                        class="tutorial-slide"
                        src="../assets/images/step3%20(4).png"
                        alt="Step 3: Comparison result 4"
                    >

                    <img
                        class="tutorial-slide"
                        src="../assets/images/step3%20(5).png"
                        alt="Step 3: Comparison result 5"
                    >

                    <img
                        class="tutorial-slide"
                        src="../assets/images/step3%20(6).png"
                        alt="Step 3: Comparison result 6"
                    >

                    <img
                        class="tutorial-slide"
                        src="../assets/images/step3%20(7).png"
                        alt="Step 3: Comparison result 7"
                    >

                </div>

                <div class="tutorial-dots">

                    <span class="dot active"></span>
                    <span class="dot"></span>
                    <span class="dot"></span>
                    <span class="dot"></span>
                    <span class="dot"></span>
                    <span class="dot"></span>
                    <span class="dot"></span>

                </div>

            </div>
            `
        }
    };
}


// INFORMATION BUTTONS
infoButtons.forEach(button => {

    button.addEventListener("click", () => {
        const lang = getCurrentLang();
        const informationData = getInformationData(lang);

        const section =
            button.dataset.section;

        const selected =
            informationData[section];

        if (selected) {

            infoTitle.textContent =
                selected.title;

            infoContent.innerHTML =
                selected.content;

            if (section === "tutorial") {
                initializeTutorial();
            }
        }

        infoButtons.forEach(btn => {
            btn.classList.remove("active");
        });

        button.classList.add("active");
    });

});


// RESET BUTTON
const resetButton =
    document.getElementById("resetButton");

if (resetButton) {

    resetButton.addEventListener("click", () => {
        window.location.href =
            "initialTest.html";
    });

}


// COMPARE PASSWORD
const compareButton =
    document.getElementById("compareButton");

if (passwordInput && compareButton) {

    passwordInput.addEventListener(
        "keydown",
        event => {

            if (event.key === "Enter") {

                event.preventDefault();

                compareButton.click();
            }
        }
    );


    compareButton.addEventListener(
        "click",
        async () => {
            const lang = getCurrentLang();

            const password =
                passwordInput.value.trim();

            if (password === "") {

                passwordInput.focus();

                passwordInput.style.boxShadow =
                    "0 0 25px rgba(239,68,68,.8)";

                setTimeout(() => {

                    passwordInput.style.boxShadow = "";

                }, 1000);

                return;
            }


            compareButton.disabled = true;

            compareButton.textContent = lang === "tl" ? "Sinusuri..." : "Analyzing...";


            try {

                const previousPassword =
                    localStorage.getItem(
                        "analyzedPassword"
                    );


                const response =
                    await fetch(
                        "https://thesissystemlatest.onrender.com/analyze",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body: JSON.stringify({

                                password: password,

                                ...(previousPassword
                                    ? {
                                        previousPassword
                                    }
                                    : {})

                            })
                        }
                    );


                if (!response.ok) {
                    throw new Error(
                        "Backend Error"
                    );
                }


                const result =
                    await response.json();


                localStorage.setItem(
                    "comparisonPassword",
                    password
                );


                sessionStorage.setItem(
                    "analysisResult",
                    JSON.stringify(result)
                );


                sessionStorage.setItem(
                    "openTab",
                    "4"
                );


                window.location.href =
                    "result.html";

            }

            catch (error) {

                console.error(
                    "Comparison Analysis Error:",
                    error
                );

                alert(
                    lang === "tl"
                        ? "Hindi makakonekta sa analysis server."
                        : "Unable to connect to analysis server."
                );

                compareButton.disabled = false;

                compareButton.textContent = lang === "tl" ? "Ihambing ang Password" : "Compare Password";
            }
        }
    );
}


// BUTTON INFORMATION
const buttonInfo =
    document.getElementById("buttonInfo");

const buttonInfoTitle =
    document.getElementById("buttonInfoTitle");

const buttonInfoText =
    document.getElementById("buttonInfoText");


function getButtonDescriptions(lang = "en") {
    if (lang === "tl") {
        return {
            reset: {
                title: "I-reset ang Subok sa Password",
                text: "Babalik sa paunang pahina ng pagsusuri kung saan maaari kang magsimula ng bagong pagsusuri ng password mula sa simula."
            },
            compare: {
                title: "Ihambing ang Password",
                text: "Sinusuri ang ipinasok na password at inihahambing ang kahinaan nito laban sa naunang pagsusuri ng password."
            }
        };
    }

    return {
        reset: {
            title: "Reset Password Test",
            text: "Returns to the Initial Test page where you can analyze a new password from the beginning."
        },
        compare: {
            title: "Compare Password",
            text: "Analyzes the entered password and compares its vulnerability against the previous password assessment."
        }
    };
}


function showButtonInfo(type, button) {

    if (!buttonInfo) {
        return;
    }

    const lang = getCurrentLang();
    const buttonDescriptions = getButtonDescriptions(lang);

    const data =
        buttonDescriptions[type];

    if (data) {

        buttonInfoTitle.textContent =
            data.title;

        buttonInfoText.textContent =
            data.text;
    }

    const rect =
        button.getBoundingClientRect();

    buttonInfo.style.left =
        rect.left +
        rect.width / 2 +
        "px";

    buttonInfo.style.top =
        rect.top -
        buttonInfo.offsetHeight -
        80 +
        "px";

    buttonInfo.style.transform =
        "translateX(-170%)";

    buttonInfo.classList.add("show");
}


function hideButtonInfo() {

    if (buttonInfo) {

        buttonInfo.classList.remove(
            "show"
        );
    }
}


if (resetButton) {

    resetButton.addEventListener(
        "mouseenter",
        () => {

            showButtonInfo(
                "reset",
                resetButton
            );
        }
    );

    resetButton.addEventListener(
        "mouseleave",
        hideButtonInfo
    );
}


if (compareButton) {

    compareButton.addEventListener(
        "mouseenter",
        () => {

            showButtonInfo(
                "compare",
                compareButton
            );
        }
    );

    compareButton.addEventListener(
        "mouseleave",
        hideButtonInfo
    );
}


// PAGE ACCESS PROTECTION
(function () {

    const navigation =
        performance.getEntriesByType(
            "navigation"
        )[0];

    const isReload =
        navigation &&
        navigation.type === "reload";

    const isBackForward =
        navigation &&
        navigation.type === "back_forward";

    const hasPreviousPassword =
        localStorage.getItem(
            "analyzedPassword"
        );

    if (
        isReload ||
        isBackForward ||
        !hasPreviousPassword
    ) {

        window.location.replace(
            "initialTest.html"
        );
    }

})();


window.addEventListener("pageshow", (event) => {
    // 1. Kuhanin ang navigation entry gamit ang modern PerformanceObserver API
    const entries = performance.getEntriesByType("navigation");
    const isBackForward = entries.length > 0 && entries[0].type === "back_forward";

    // 2. I-check kung galing sa bfcache (event.persisted) o kaya naman ay back/forward button
    if (event.persisted || isBackForward) {
        document.documentElement.style.display = "none";
        window.location.replace("initialTest.html");
    }
});


window.addEventListener(
    "unload",
    function () {}
);

function scrollToInfo(){
    if(window.innerWidth<=1024){
        setTimeout(()=>{
            document.querySelector(".info-panel").scrollIntoView({behavior:"smooth",block:"start"});
        },100);
    }
}