const cloudContainer = document.getElementById('cloudContainer');

// Create a single cloud
function createCloud(yPos, layer) {
    let cloud = document.createElement('div');
    cloud.classList.add('cloud');
    cloud.style.width = Math.random() * 150 + 100 + 'px';
    cloud.style.height = cloud.style.width;
    cloud.style.top = yPos + 'px';
    cloud.style.left = Math.random() * window.innerWidth + 'px';
    cloud.dataset.layer = layer;
    cloudContainer.appendChild(cloud);
    return cloud;
}

// Move cloud smoothly
function moveCloud(cloud, speed) {
    let newLeft = cloud.offsetLeft + speed;

    // If cloud goes too far right, respawn off-screen left
    if (newLeft > window.innerWidth) {
        cloud.style.left = -400 + "px";
        cloud.style.top = Math.random() * window.innerHeight + "px";
    }
    // If cloud goes too far left, respawn off-screen right
    else if (newLeft < -400) {
        cloud.style.left = window.innerWidth + "px";
        cloud.style.top = Math.random() * window.innerHeight + "px";
    } 
    else {
        cloud.style.left = newLeft + "px";
    }
}

// Spawn fewer clouds
let topClouds = [];
for (let i = 0; i < 2; i++) { // fewer clouds
    topClouds.push(createCloud(Math.random() * (window.innerHeight / 2 - 50), 'top'));
}

let bottomClouds = [];
for (let i = 0; i < 2; i++) { // fewer clouds
    bottomClouds.push(createCloud(Math.random() * (window.innerHeight / 2) + window.innerHeight / 2, 'bottom'));
}

// Animate all clouds forever
function animateClouds() {
    topClouds.forEach(cloud => moveCloud(cloud, 0.3));   // slow right
    bottomClouds.forEach(cloud => moveCloud(cloud, -0.2)); // slow left
    requestAnimationFrame(animateClouds);
}

animateClouds();

