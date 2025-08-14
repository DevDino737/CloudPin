const body = document.body;

// Track how many clouds exist at each vertical "row"
const verticalRows = [];

function createCloud() {
  const cloud = document.createElement('div');
  cloud.className = 'cloud';

  const scale = 0.5 + Math.random() * 1.2;
  cloud.style.transform = `scale(${scale})`;

  // Try to find a vertical position with max 2 clouds
  let topPos;
  let attempts = 0;
  do {
    topPos = Math.floor(Math.random() * window.innerHeight);
    attempts++;
    // Check how many clouds are already near this position
    const overlapping = verticalRows.filter(pos => Math.abs(pos - topPos) < 60).length;
    if (overlapping < 2) break;
  } while (attempts < 20); // avoid infinite loop
  verticalRows.push(topPos);

  cloud.style.top = topPos + 'px';

  // Top clouds move right slower
  let speed, direction;
  if (topPos < window.innerHeight / 2) {
    direction = 'right';
    cloud.style.left = '-120px';
    speed = 0.2 + Math.random() * 0.2;
  } else {
    direction = 'left';
    cloud.style.left = window.innerWidth + 120 + 'px';
    speed = 0.2 + Math.random() * 0.3;
  }

  cloud.dataset.direction = direction;
  cloud.dataset.speed = speed;
  cloud.dataset.topPos = topPos;

  body.appendChild(cloud);

  function move() {
    let left = parseFloat(cloud.style.left);
    const s = parseFloat(cloud.dataset.speed);
    if (cloud.dataset.direction === 'right') {
      if (left > window.innerWidth + 120) {
        cloud.remove();
        removeFromRows(cloud.dataset.topPos);
        return;
      }
      cloud.style.left = left + s + 'px';
    } else {
      if (left < -120) {
        cloud.remove();
        removeFromRows(cloud.dataset.topPos);
        return;
      }
      cloud.style.left = left - s + 'px';
    }
    requestAnimationFrame(move);
  }

  move();
}

function removeFromRows(pos) {
  const index = verticalRows.indexOf(parseFloat(pos));
  if (index !== -1) verticalRows.splice(index, 1);
}

// Spawn clouds every 5–9 seconds
setInterval(createCloud, 5000 + Math.random() * 4000);

// Initial clouds
for (let i = 0; i < 3; i++) createCloud();
