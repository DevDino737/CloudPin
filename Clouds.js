// Clouds.js - create DOM cloud elements that drift forever (top -> right, bottom -> left)
// Clouds are non-image, soft shapes. They are placed behind UI and recycled smoothly.

const cloudContainer = document.getElementById('cloudContainer');

// settings
const TOP_COUNT = 4;      // number of clouds in top band
const BOTTOM_COUNT = 4;   // number of clouds in bottom band
const MIN_W = 90;
const MAX_W = 220;
const MIN_SPEED = 0.08;   // px per frame multiplier (slow)
const MAX_SPEED = 0.5;

// store clouds as objects
const topClouds = [];
const bottomClouds = [];

// helper random
const rnd = (min, max) => Math.random() * (max - min) + min;

// create one cloud DOM and object
function spawnCloud(isTop) {
  const el = document.createElement('div');
  el.className = 'cloud';

  const w = Math.round(rnd(MIN_W, MAX_W));
  const h = Math.round(w * (rnd(0.45, 0.7)));

  el.style.width = w + 'px';
  el.style.height = h + 'px';

  // random vertical position depending on top/bottom band
  const bandHeight = window.innerHeight * 0.35; // 35% each band
  let top;
  if (isTop) {
    top = rnd(16, 36); // percent
  } else {
    top = rnd(60, 86); // percent
  }
  el.style.top = top + '%';

  // initial horizontal position: spread across a wide range so they don't sync
  const startX = rnd(-window.innerWidth * 0.8, window.innerWidth * 1.6);
  el.style.left = startX + 'px';

  // speed and direction
  const baseSpeed = rnd(MIN_SPEED, MAX_SPEED);
  const dir = isTop ? 1 : -1; // top -> move right (positive), bottom -> move left (negative)
  el.dataset.speed = (baseSpeed * dir).toString();

  cloudContainer.appendChild(el);

  return { el, speed: baseSpeed * dir, w, h, topPercent: top };
}

// initialize clouds
function initClouds() {
  // clear containers in case of re-init
  topClouds.length = 0;
  bottomClouds.length = 0;
  cloudContainer.innerHTML = '';

  for (let i = 0; i < TOP_COUNT; i++) {
    topClouds.push(spawnCloud(true));
  }
  for (let i = 0; i < BOTTOM_COUNT; i++) {
    bottomClouds.push(spawnCloud(false));
  }
}

// animation loop
function animateClouds() {
  // helper to update each cloud
  function stepList(list) {
    list.forEach(obj => {
      const el = obj.el;
      let curLeft = parseFloat(el.style.left) || 0;
      curLeft += obj.speed * (1 + Math.random() * 0.5); // small variance per frame

      // recycle when offscreen with smooth reset
      if (obj.speed > 0 && curLeft > window.innerWidth + 300) {
        // moved off right, move to left offscreen
        curLeft = - (obj.w + rnd(80, 300));
        // slightly change vertical percent for variety
        el.style.top = (rnd(12, 40)) + '%';
      } else if (obj.speed < 0 && curLeft < - (obj.w + 300)) {
        // moved off left, move to right offscreen
        curLeft = window.innerWidth + rnd(80, 300);
        el.style.top = (rnd(60, 92)) + '%';
      }
      el.style.left = curLeft + 'px';
    });
  }

  stepList(topClouds);
  stepList(bottomClouds);
  requestAnimationFrame(animateClouds);
}

// responsive: rebuild clouds on resize so positions & sizes recalculated
window.addEventListener('resize', () => {
  // recreate so sizes/positions are sensible
  initClouds();
});

// start
initClouds();
requestAnimationFrame(animateClouds);
