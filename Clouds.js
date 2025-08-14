const body = document.body;

// Track cloud positions for spacing within each group
let topClouds = [];
let bottomClouds = [];

function createCloud() {
  const cloud = document.createElement('div');
  cloud.className = 'cloud';

  const scale = 0.5 + Math.random() * 1.2;
  cloud.style.transform = `scale(${scale})`;

  const gap = 100; // Space between top and bottom clouds
  let topPos;
  let isTop = Math.random() < 0.5;

  // Top clouds spawn only in top area, bottom clouds in bottom area
  const topArea = window.innerHeight / 2 - gap / 2;
  const bottomAreaStart = window.innerHeight / 2 + gap / 2;

  const maxAttempts = 20;
  let attempts = 0;

  do {
    if (isTop) {
      topPos = Math.random() * topArea;
    } else {
      topPos = bottomAreaStart + Math.random() * (window.innerHeight - bottomAreaStart - 60);
    }
    attempts++;
    const cloudArray = isTop ? topClouds : bottomClouds;
    const overlapping = cloudArray.filter(pos => Math.abs(pos - topPos) < 80).length;
    if (overlapping < 2) break;
  } while (attempts < maxAttempts);

  cloud.style.top = topPos + 'px';
  if (isTop) topClouds.push(topPos); else bottomClouds.push(topPos);

  // Set direction and speed
  let speed, direction;
  if (isTop) {
    direction = 'right';
    cloud.style.left = '-120px';
    speed = 0.15 + Math.random() * 0.2; // slower right-moving clouds
  } else {
    direction = 'left';
    cloud.style.left = window.innerWidth + 120 + 'px';
    speed = 0.2 + Math.random() * 0.3; // bottom clouds slower
  }

  cloud.dataset.direction = direction;
  cloud.dataset.speed = speed;
  cloud.dataset.topPos = topPos;
  cloud.dataset.isTop = isTop;

  body.appendChild(cloud);

  function move() {
    let left = parseFloat(cloud.style.left);
    const s = parseFloat(cloud.dataset.speed);

    if (cloud.dataset.direction === 'right') {
      if (left > window.innerWidth + 120) {
        removeCloud(cloud);
        return;
      }
      cloud.style.left = left + s + 'px';
    } else {
      if (left < -120) {
        removeCloud(cloud);
        return;
      }
      cloud.style.left = left - s + 'px';
    }
    requestAnimationFrame(move);
  }

  move();
}

function removeCloud(cloud) {
  const topPos = parseFloat(cloud.dataset.topPos);
  const isTop = cloud.dataset.isTop === 'true';
  if (isTop) {
    topClouds = topClouds.filter(pos => pos !== topPos);
  } else {
    bottomClouds = bottomClouds.filter(pos => pos !== topPos);
  }
  cloud.remove();
}

// Spawn clouds every 6–10 seconds
setInterval(createCloud, 6000 + Math.random() * 4000);

// Initial clouds
for (let i = 0; i < 3; i++) createCloud();


