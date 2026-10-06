const contentArea = document.getElementById("contentArea");
const sections = document.querySelectorAll(".content-area section");
const menuItems = document.querySelectorAll(".section-booklet li");
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

    let current = 0;

    const containerTop =
        contentArea.getBoundingClientRect().top;

    sections.forEach((section, index) => {

        const sectionTop =
            section.getBoundingClientRect().top -
            containerTop;

        if (sectionTop <= 180) {
            current = index;
        }
    });

    updateLeft(current);
    updateEnergy(current);
}


// =========================
// LEFT LIGHT
// =========================
function updateLeft(index) {

    if (!menuItems.length) {
        return;
    }

    menuItems.forEach((item, i) => {

        item.classList.toggle(
            "active",
            i === index
        );
    });
}


// =========================
// ENERGY CORE
// =========================
function updateEnergy(index) {

    if (!energyThumb) {
        return;
    }

    const total =
        sections.length - 1;

    if (total <= 0) {

        energyThumb.style.top = "0%";

        return;
    }

    const movement =
        (index / total) * 80;

    energyThumb.style.top =
        movement + "%";
}


// =========================
// SCROLL CONTENT
// =========================
if (contentArea) {

    contentArea.addEventListener(
        "scroll",
        updateSection
    );
}


// =========================
// CLICK LEFT MENU
// =========================
if (
    menuItems.length &&
    sections.length
) {

    menuItems.forEach((item, index) => {

        item.addEventListener(
            "click",
            () => {

                if (!sections[index]) {
                    return;
                }

                sections[index].scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });
            }
        );
    });
}


// =========================
// CLICK ENERGY TRACK
// =========================
if (
    energyTrack &&
    contentArea
) {

    energyTrack.addEventListener(
        "click",
        (event) => {

            if (
                energyThumb &&
                event.target === energyThumb
            ) {
                return;
            }

            const rect =
                energyTrack.getBoundingClientRect();

            if (rect.height <= 0) {
                return;
            }

            const clickPosition =
                event.clientY - rect.top;

            let percentage =
                clickPosition / rect.height;

            percentage =
                Math.max(
                    0,
                    Math.min(
                        percentage,
                        1
                    )
                );

            const maxScroll =
                contentArea.scrollHeight -
                contentArea.clientHeight;

            if (maxScroll <= 0) {
                return;
            }

            contentArea.scrollTo({
                top:
                    percentage * maxScroll,
                behavior: "smooth"
            });
        }
    );
}


// =========================
// DRAG ENERGY THUMB
// =========================
let isDragging = false;

if (energyThumb) {

    energyThumb.addEventListener(
        "mousedown",
        (event) => {

            isDragging = true;

            event.preventDefault();
        }
    );
}


document.addEventListener(
    "mousemove",
    (event) => {

        if (
            !isDragging ||
            !energyTrack ||
            !energyThumb ||
            !contentArea
        ) {
            return;
        }

        const rect =
            energyTrack.getBoundingClientRect();

        let position =
            event.clientY - rect.top;

        const thumbHeight =
            energyThumb.offsetHeight;

        const minPosition = 0;

        const maxPosition =
            rect.height - thumbHeight;

        if (maxPosition <= 0) {
            return;
        }

        position =
            Math.max(
                minPosition,
                Math.min(
                    position,
                    maxPosition
                )
            );

        const percentage =
            position / maxPosition;

        const maxScroll =
            contentArea.scrollHeight -
            contentArea.clientHeight;

        if (maxScroll <= 0) {
            return;
        }

        contentArea.scrollTop =
            percentage * maxScroll;
    }
);


document.addEventListener(
    "mouseup",
    () => {

        isDragging = false;
    }
);


// =========================
// PREVENT DRAG STICKING
// =========================
document.addEventListener(
    "mouseleave",
    () => {

        isDragging = false;
    }
);


// =========================
// FIRST LOAD
// =========================
window.addEventListener(
    "load",
    () => {

        updateSection();
    }
);


// =========================
// CONSENT CHECKBOX
// =========================
const checkbox =
    document.getElementById(
        "consentCheckbox"
    );

const acceptBtn =
    document.getElementById(
        "acceptBtn"
    );


if (
    checkbox &&
    acceptBtn
) {

    acceptBtn.disabled =
        !checkbox.checked;

    checkbox.addEventListener(
        "change",
        () => {

            acceptBtn.disabled =
                !checkbox.checked;
        }
    );
}


// =========================
// DECLINE MODAL
// =========================
const declineBtn =
    document.getElementById(
        "declineBtn"
    );

const modal =
    document.getElementById(
        "declineModal"
    );

const closeModal =
    document.getElementById(
        "closeModal"
    );


if (
    declineBtn &&
    modal
) {

    declineBtn.addEventListener(
        "click",
        () => {

            modal.style.display =
                "flex";
        }
    );
}


if (
    closeModal &&
    modal
) {

    closeModal.addEventListener(
        "click",
        () => {

            modal.style.display =
                "none";
        }
    );
}


// =========================
// CLOSE MODAL WHEN CLICKING OUTSIDE
// =========================
if (modal) {

    modal.addEventListener(
        "click",
        (event) => {

            if (
                event.target === modal
            ) {

                modal.style.display =
                    "none";
            }
        }
    );
}


// =========================
// ACCEPT
// =========================
if (acceptBtn) {

    acceptBtn.addEventListener(
        "click",
        () => {

            if (acceptBtn.disabled) {
                return;
            }

            localStorage.setItem(
                "consentAccepted",
                "true"
            );

            document.body.classList.add(
                "page-exit"
            );

            setTimeout(
                () => {

                    window.location.replace(
                        "initialTest.html"
                    );

                },
                800
            );
        }
    );
}


// =========================
// DISABLE BF CACHE
// =========================
window.addEventListener(
    "unload",
    () => {}
);