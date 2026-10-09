
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