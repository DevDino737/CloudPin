// Clouds.js - improved clouds: slower, multi-blob clouds, not simple ovals
const cloudContainer = document.getElementById('cloudContainer');

// config
const TOP_COUNT = 3;
const BOTTOM_COUNT = 3;
const MIN_BLOB = 30;
const MAX_BLOB = 120;
const MIN_SPEED = 0.03;
const MAX_SPEED = 0.18;

const topClouds = [];
const bottomClouds = [];

const rnd = (min, max) => Math.random() * (max - min) + min;

// create a cloud element composed of multiple blurred blobs
function createCloud(yPos, layer) {
  const cloud = document.createElement('div');
  cloud.className = 'cloud';
  cloud.style.top = yPos + 'px';
  // initial left spread so clouds are not aligned
  cloud.style.left = (Math.random() * window.innerWidth * 1.6 - window.innerWidth * 0.3) + 'px';
  cloud.dataset.layer = layer;

  // number of blobs (3-6)
  const blobCount = 3 + Math.floor(Math.random() * 4);

  // build blobs
  for (let i = 0; i < blobCount; i++) {
    const blob = document.createElement('div');
    blob.className = 'cloud-blob';

    const w = Math.round(rnd(MIN_BLOB, MAX_BLOB));
    const h = Math.round(w * (0.55 + Math.random() * 0.45));
    blob.style.width = w + 'px';
    blob.style.height = h + 'px';

    // random offset inside the cloud
    blob.style.left = Math.round(rnd(0, Math.max(80, w))) + 'px';
    blob.style.top = Math.round(rnd(0, Math.max(40, h))) + 'px';

    // slight opacity variance
    blob.style.opacity = (0.85 + Math.random() * 0.12).toString();

    cloud.appendChild(blob);
  }

  // optional extra blob element for more texture
  const extra = document.createElement('div');
  extra.className = 'cloud-extra';
  // random small transform to avoid identical shapes
  extra.style.transform = `scale(${0.8 + Math.random() * 0.6}) rotate(${Math.random()*10-5}deg)`;
  cloud.appendChild(extra);

  // set speed as a property (direction applied in move function)
  cloud.dataset.speed = rnd(MIN_SPEED, MAX_SPEED).toString();

  cloudContainer.appendChild(cloud);
  return cloud;
}

// move cloud and respawn (direction sign will determine left/right)
function moveCloud(cloud, direction) {
  const speed = parseFloat(cloud.dataset.speed) || 0.06;
  let curLeft = parseFloat(cloud.style.left) || 0;
  curLeft += speed * direction * (1 + Math.random() * 0.35); // slight per-frame variance

  // recycle smoothly
  if (direction > 0 && curLeft > window.innerWidth + 400) {
    curLeft = - (200 + Math.random() * 400);
    cloud.style.top = Math.random() * (window.innerHeight * 0.9) + 'px';
  } else if (direction < 0 && curLeft < -600) {
    curLeft = window.innerWidth + (200 + Math.random() * 400);
    cloud.style.top = Math.random() * (window.innerHeight * 0.9) + 'px';
  }
  cloud.style.left = curLeft + 'px';
}

// init clouds
function initClouds() {
  // clear container
  cloudContainer.innerHTML = '';
  topClouds.length = 0;
  bottomClouds.length = 0;

  for (let i = 0; i < TOP_COUNT; i++) {
    topClouds.push(createCloud(rnd(10, window.innerHeight * 0.4), 'top'));
  }
  for (let i = 0; i < BOTTOM_COUNT; i++) {
    bottomClouds.push(createCloud(rnd(window.innerHeight * 0.45, window.innerHeight * 0.85), 'bottom'));
  }
}

// animation loop
function animateClouds() {
  topClouds.forEach(c => moveCloud(c, +1));   // move right
  bottomClouds.forEach(c => moveCloud(c, -1)); // move left
  requestAnimationFrame(animateClouds);
}

// responsive: rebuild clouds when resized so sizes/positions recalculated
window.addEventListener('resize', () => {
  initClouds();
});

// start
initClouds();
requestAnimationFrame(animateClouds);
