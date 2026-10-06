fetch("https://thesissystemlatest.onrender.com/analyze", { method: "HEAD" }).catch(() => {});

const API_URL = "https://thesissystemlatest.onrender.com/analyze";

const passwordInput = document.getElementById("passwordInput");
const togglePassword = document.getElementById("togglePassword");
const eyeOpen = document.getElementById("eyeOpen");
const eyeClosed = document.getElementById("eyeClosed");
const scanButton = document.getElementById("scanButton");

if (passwordInput && togglePassword) {
    togglePassword.addEventListener("click", () => {
        const isHidden = passwordInput.type === "password";

        passwordInput.type = isHidden ? "text" : "password";
        eyeOpen.classList.toggle("hidden", isHidden);
        eyeClosed.classList.toggle("hidden", !isHidden);
    });
}


const scene = document.querySelector(".scene");
const infoButton = document.getElementById("infoButton");
const closeInfo = document.getElementById("closeInfo");
const infoPanel = document.querySelector(".info-panel");
const infoMenu = document.querySelector(".info-menu");
const infoButtons = document.querySelectorAll(".info-option");
const infoTitle = document.getElementById("infoTitle");
const infoContent = document.getElementById("infoContent");


function isMobile() {
    return window.innerWidth <= 1024;
}

function scrollToInfo() {
    if (!isMobile() || !infoPanel) {
        return;
    }

    setTimeout(() => {
        infoPanel.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }, 100);
}

function updateInfoMenuArrow() {
    if (!infoMenu) {
        return;
    }

    const hasMore =
        infoMenu.scrollWidth > infoMenu.clientWidth + 5 &&
        infoMenu.scrollLeft + infoMenu.clientWidth <
        infoMenu.scrollWidth - 5;

    infoMenu.classList.toggle("has-more-right", hasMore);
}

if (infoMenu) {
    infoMenu.addEventListener(
        "scroll",
        updateInfoMenuArrow,
        { passive: true }
    );
}

window.addEventListener("resize", updateInfoMenuArrow);


if (infoButton) {
    infoButton.addEventListener("click", () => {
        scene.classList.toggle("show-info");

        if (scene.classList.contains("show-info")) {
            if (infoMenu) {
                infoMenu.scrollLeft = 0;
            }

            scrollToInfo();

            setTimeout(updateInfoMenuArrow, 150);
            setTimeout(updateInfoMenuArrow, 400);
        }
    });
}

if (closeInfo) {
    closeInfo.addEventListener("click", () => {
        scene.classList.remove("show-info");

        if (isMobile()) {
            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });
        }
    });
}


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

    const previous = overlay.querySelector(".image-zoom-prev");
    const next = overlay.querySelector(".image-zoom-next");

    previous.classList.toggle("visible", navigation && images.length > 1);
    next.classList.toggle("visible", navigation && images.length > 1);

    updateZoom();

    overlay.classList.add("active");
    document.body.classList.add("image-zoom-open");
}

function updateZoom() {
    const overlay = document.getElementById("imageZoomOverlay");

    if (!overlay || !zoomImages.length) {
        return;
    }

    const preview = overlay.querySelector(".image-zoom-preview");

    preview.src = zoomImages[zoomIndex].src;
    preview.alt = zoomImages[zoomIndex].alt || "";

    if (
        zoomImages.length > 1 &&
        zoomImages[zoomIndex].classList.contains("tutorial-slide")
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
    const overlay = document.getElementById("imageZoomOverlay");

    if (overlay) {
        overlay.classList.remove("active");
    }

    document.body.classList.remove("image-zoom-open");
}

document.addEventListener("keydown", event => {
    const overlay = document.getElementById("imageZoomOverlay");

    if (!overlay || !overlay.classList.contains("active")) {
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


function initializeTutorial() {
    const slides = document.querySelectorAll(".tutorial-slide");
    const dots = document.querySelectorAll(".dot");
    const allTutorialImages = document.querySelectorAll(".tutorial-container img");

    if (!allTutorialImages.length) {
        return;
    }

    allTutorialImages.forEach(image => {
        if (!image.classList.contains("tutorial-slide")) {
            image.onclick = event => {
                event.stopPropagation();
                openZoom([image], 0, false);
            };
        }
    });

    slides.forEach((slide, index) => {
        slide.onclick = event => {
            event.stopPropagation();
            openZoom(Array.from(slides), index, true);
        };
    });

    dots.forEach((dot, index) => {
        dot.onclick = event => {
            event.stopPropagation();
            showSlide(index);
        };
    });

    showSlide(0);
}

function showSlide(index) {
    const slides = document.querySelectorAll(".tutorial-slide");
    const dots = document.querySelectorAll(".dot");

    if (!slides.length) {
        return;
    }

    if (index < 0) {
        index = slides.length - 1;
    }

    if (index >= slides.length) {
        index = 0;
    }

    slides.forEach(slide => slide.classList.remove("active"));
    dots.forEach(dot => dot.classList.remove("active"));

    slides[index].classList.add("active");

    if (dots[index]) {
        dots[index].classList.add("active");
    }
}

function updateSlide(index) {
    showSlide(index);
}


const informationData = {

    about: {
        title: "About the System",
        content: `
        <h3>Password Vulnerability Classification</h3>

        <p>
        This system analyzes user-generated passwords
        to identify possible vulnerabilities against
        common password cracking strategies.
        </p>

        <p>
        Unlike traditional password meters that only
        provide strength scores, this system determines
        what type of attack strategy may become effective
        against the password.
        </p>

        <p>
        The system uses extracted password characteristics
        and applies a Decision Tree classification model
        to identify possible vulnerability patterns.
        </p>
        `
    },

    process: {
        title: "How The System Works",
        content: `
        <h3>Password Processing Flow</h3>

        <ol>
            <li>User enters a password for analysis.</li>
            <li>The system extracts password characteristics.</li>
            <li>The original password is removed after extraction.</li>
            <li>Only the generated password representation is retained for analysis.</li>
            <li>Extracted features are evaluated by the classification model.</li>
            <li>The Decision Tree identifies the possible cracking method.</li>
            <li>The system displays the vulnerability result and recommended improvements.</li>
        </ol>
        `
    },

    analysis: {
        title: "Password Characteristics Analyzed",
        content: `
        <h3>Features Examined</h3>

        <p>
        The system checks password structures and patterns
        without storing the original password.
        </p>

        <ul>
            <li>Password Length</li>
            <li>Presence of Lowercase Letters</li>
            <li>Presence of Uppercase Letters</li>
            <li>Presence of Numbers</li>
            <li>Presence of Symbols</li>
            <li>Dictionary Word Detection</li>
            <li>Leetspeak Usage</li>
            <li>Numeric Suffix Patterns</li>
            <li>Sequential Patterns</li>
            <li>Repeated Characters or Patterns</li>
            <li>Rule-Based Pattern Detection</li>
        </ul>

        <p>
        Character class count is also generated internally
        for system classification purposes.
        </p>
        `
    },

    methods: {
        title: "Password Cracking Methods",
        content: `
        <h3>Possible Attack Strategies</h3>

        <p>
        The system classifies password vulnerability
        according to three common cracking approaches.
        </p>

        <ul>
            <li>
                <strong>Dictionary Attack</strong>
                <br>
                Attempts commonly used words, phrases, and known password patterns.
            </li>

            <li>
                <strong>Brute Force Attack</strong>
                <br>
                Attempts possible character combinations until the password is discovered.
            </li>

            <li>
                <strong>Rule-Based Attack</strong>
                <br>
                Applies transformation rules such as adding numbers, replacing characters,
                or modifying common password formats.
            </li>
        </ul>
        `
    },

    decision: {
        title: "Decision Tree Classification",
        content: `
        <h3>Machine Learning Classification</h3>

        <p>
        The system uses a supervised Decision Tree model
        to classify password vulnerability.
        </p>

        <p>
        The extracted password characteristics serve
        as input values that allow the model to determine
        the most likely cracking method.
        </p>

        <p>
        The classification result helps users understand
        what security weakness should be improved.
        </p>
        `
    },

    tutorial: {
        title: "System Tutorial",
        content: `
        <h3>How To Use The System</h3>

        <p>
        Follow these steps to analyze your password.
        </p>

        <div class="tutorial-container">

            <p>
            Step 1: Enter your password in the input field.
            </p>

            <img
                src="../assets/images/step1.png"
                alt="Step 1: Enter password"
            >

        </div>


        <div class="tutorial-container">

            <p>
            Step 2: Click Analyze Password to begin feature extraction.
            </p>

            <img
                src="../assets/images/step2.png"
                alt="Step 2: Analyze password"
            >

        </div>


        <div class="tutorial-container">

            <p>
            Step 3: Review the vulnerability result and recommendations.
            </p>

            <p>
            Click an image to enlarge it.
            </p>

            <div class="tutorial-slider">

                <img class="tutorial-slide active" src="../assets/images/step3%20(1).png" alt="Step 3: Result 1">
                <img class="tutorial-slide" src="../assets/images/step3%20(2).png" alt="Step 3: Result 2">
                <img class="tutorial-slide" src="../assets/images/step3%20(3).png" alt="Step 3: Result 3">
                <img class="tutorial-slide" src="../assets/images/step3%20(4).png" alt="Step 3: Result 4">
                <img class="tutorial-slide" src="../assets/images/step3%20(5).png" alt="Step 3: Result 5">
                <img class="tutorial-slide" src="../assets/images/step3%20(6).png" alt="Step 3: Result 6">
                <img class="tutorial-slide" src="../assets/images/step3%20(7).png" alt="Step 3: Result 7">

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


infoButtons.forEach(button => {

    button.addEventListener("click", () => {

        const section = button.dataset.section;
        const selected = informationData[section];

        if (selected) {
            infoTitle.textContent = selected.title;
            infoContent.innerHTML = selected.content;

            if (section === "tutorial") {
                initializeTutorial();
            }
        }

        infoButtons.forEach(btn => btn.classList.remove("active"));
        button.classList.add("active");

        scrollToInfo();
    });

});


function clearAnalysisData() {
    sessionStorage.removeItem("analysisResult");
    localStorage.removeItem("analyzedPassword");
    localStorage.removeItem("comparisonResult");
    localStorage.removeItem("originalAnalysisResult");
}

function resetAnalyzeForm() {
    if (passwordInput) {
        passwordInput.value = "";
    }

    if (scanButton) {
        scanButton.disabled = false;
        scanButton.textContent = "ANALYZE PASSWORD";
    }
}


if (passwordInput && scanButton) {

    passwordInput.addEventListener("keydown", event => {
        if (event.key === "Enter") {
            event.preventDefault();
            scanButton.click();
        }
    });

    scanButton.addEventListener("click", async () => {

        const password = passwordInput.value.trim();

        if (password === "") {

            passwordInput.focus();

            passwordInput.style.boxShadow =
                "0 0 25px rgba(239,68,68,.8)";

            setTimeout(() => {
                passwordInput.style.boxShadow = "";
            }, 1000);

            return;
        }

        scanButton.disabled = true;
        scanButton.textContent = "ANALYZING...";

        try {

            const response = await fetch(API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    password: password
                })
            });

            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }

            const result = await response.json();

            sessionStorage.setItem(
                "analysisResult",
                JSON.stringify(result)
            );

            localStorage.setItem(
                "analyzedPassword",
                password
            );

            sessionStorage.setItem(
                "showResultTutorial",
                "true"
            );

            window.location.href = "result.html";

        } catch (error) {

            console.error("Analysis error:", error);

            alert("Unable to connect to the analysis server. Please try again.");

            scanButton.disabled = false;
            scanButton.textContent = "ANALYZE PASSWORD";
        }
    });
}


clearAnalysisData();
resetAnalyzeForm();

history.replaceState(null, "", window.location.href);
history.pushState(null, "", window.location.href);

window.addEventListener("popstate", () => {
    clearAnalysisData();
    resetAnalyzeForm();
    history.pushState(null, "", window.location.href);
});

window.addEventListener("pageshow", event => {
    if (event.persisted) {
        clearAnalysisData();
        resetAnalyzeForm();
    }
});




let secretSequence = [];

const secretCode = ["blue", "Enter", "red", "Enter", "red", "Enter"];

document.addEventListener("keydown", event => {

    secretSequence.push(event.key);

    if (secretSequence.length > secretCode.length) {
        secretSequence.shift();
    }

    const matches =
        secretSequence.length === secretCode.length &&
        secretSequence.every((key, index) => key === secretCode[index]);

    if (matches) {
        window.location.href = "../secrett/secretInitial.html";
        secretSequence = [];
    }
});
