const cloudContainer = document.getElementById('cloudContainer');

// Create clouds
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

// Top clouds move right
let topClouds = [];
for (let i = 0; i < 1; i++) {
    topClouds.push(createCloud(Math.random() * (window.innerHeight / 2 - 50), 'top'));
}

// Bottom clouds move left
let bottomClouds = [];
for (let i = 0; i < 1; i++) {
    bottomClouds.push(createCloud(Math.random() * (window.innerHeight / 2) + window.innerHeight / 2, 'bottom'));
}

// Animate clouds
function animate() {
    topClouds.forEach(cloud => {
        let left = parseFloat(cloud.style.left);
        left += 0.4;
        if (left > window.innerWidth + 200) left = -200;
        cloud.style.left = left + 'px';
    });

    bottomClouds.forEach(cloud => {
        let left = parseFloat(cloud.style.left);
        left -= 0.3;
        if (left < -200) left = window.innerWidth + 200;
        cloud.style.left = left + 'px';
    });

    requestAnimationFrame(animate);
}

animate();

// Camera button
document.getElementById("cameraBtn").addEventListener("click", async () => {
    const video = document.getElementById('cameraFeed');
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
        video.style.display = 'block';
    } catch (err) {
        alert("Camera access denied or not supported.");
        console.error(err);
    }
});
