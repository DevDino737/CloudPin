const cloudContainer = document.getElementById("cloudContainer");

/**
 * Create a cloud made up of multiple blurred blobs
 */
function createCloud(yPos, layer) {
    const cloud = document.createElement("div");
    cloud.style.position = "absolute";
    cloud.style.top = yPos + "px";
    cloud.style.left = Math.random() * window.innerWidth + "px";
    cloud.dataset.layer = layer;

    const blobCount = 3 + Math.floor(Math.random() * 4); // 3–6 blobs

    for (let i = 0; i < blobCount; i++) {
        const blob = document.createElement("div");
        blob.classList.add("cloud-blob");

        // random size (more organic)
        const size = 40 + Math.random() * 80;
        blob.style.width = size + "px";
        blob.style.height = size + "px";

        // random position within the cloud
        blob.style.left = (Math.random() * 80) + "px";
        blob.style.top = (Math.random() * 40) + "px";

        cloud.appendChild(blob);
    }

    cloudContainer.appendChild(cloud);
    return cloud;
}

/**
 * Move the cloud and respawn when moving offscreen
 */
function moveCloud(cloud, speed) {
    let newLeft = cloud.offsetLeft + speed;

    if (newLeft > window.innerWidth + 200) {
        // Off the right, respawn left
        newLeft = -300;
        cloud.style.top = Math.random() * window.innerHeight + "px";
    } 
    else if (newLeft < -300) {
        // Off the left, respawn right
        newLeft = window.innerWidth + 200;
        cloud.style.top = Math.random() * window.innerHeight + "px";
    }

    cloud.style.left = newLeft + "px";
}

/**
 * CREATE CLOUDS
 */

// Top layer clouds (moving right)
let topClouds = [];
for (let i = 0; i < 3; i++) {
    topClouds.push(
        createCloud(
            Math.random() * (window.innerHeight * 0.4),
            "top"
        )
    );
}

// Bottom layer clouds (moving left)
let bottomClouds = [];
for (let i = 0; i < 3; i++) {
    bottomClouds.push(
        createCloud(
            Math.random() * (window.innerHeight * 0.4) + window.innerHeight * 0.4,
            "bottom"
        )
    );
}

/**
 * Animate clouds every frame
 */
function animateClouds() {
    // movement slowed for better realism
    topClouds.forEach(cloud => moveCloud(cloud, 0.08));   // very slow drift right
    bottomClouds.forEach(cloud => moveCloud(cloud, -0.06)); // very slow drift left

    requestAnimationFrame(animateClouds);
}

animateClouds();
