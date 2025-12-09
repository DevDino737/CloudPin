/* DEBUG PANEL (for iPad testing) */
const debugPanel = document.createElement("div");
debugPanel.id = "debugPanel";
debugPanel.style.position = "absolute";
debugPanel.style.bottom = "10px";
debugPanel.style.left = "10px";
debugPanel.style.color = "lime";
debugPanel.style.fontSize = "14px";
debugPanel.style.background = "rgba(0,0,0,0.6)";
debugPanel.style.padding = "8px 12px";
debugPanel.style.borderRadius = "6px";
debugPanel.style.zIndex = "9999";
debugPanel.style.pointerEvents = "none";
document.body.appendChild(debugPanel);

function debug(msg) {
    debugPanel.innerHTML = msg;
}

/* FIXED COMPASS + SCREEN ORIENTATION CORRECTION */
window.addEventListener("deviceorientation", (e) => {

    let compass;

    if (e.webkitCompassHeading != null) {
        // iPhone/iPad true heading
        compass = e.webkitCompassHeading;
    } else if (e.alpha != null) {
        // Android fallback
        compass = 360 - e.alpha;
    }

    // screen angle (0, 90, 180, -90)
    const orientation =
        (screen.orientation && screen.orientation.angle) ??
        window.orientation ??
        0;

    compass = (compass + orientation + 360) % 360;

    userHeading = compass;
    tiltBeta = e.beta;

    debug(
        `alpha: ${e.alpha}<br>
         webkit: ${e.webkitCompassHeading}<br>
         screen angle: ${orientation}<br>
         corrected heading: ${userHeading?.toFixed(1)}°<br>
         tilt beta: ${tiltBeta?.toFixed(1)}`
    );
});
