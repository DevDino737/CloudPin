const body = document.body;

function createCloud() {
  const cloud = document.createElement('div');
  cloud.className = 'cloud';

  const scale = 0.5 + Math.random() * 1.2;
  cloud.style.transform = `scale(${scale})`;

  const topPos = Math.random() * window.innerHeight;
  cloud.style.top = topPos + 'px';

  let speed, direction;
  if (topPos < window.innerHeight / 2) {
    direction = 'right';
    cloud.style.left = '-120px';
    speed = 0.4 + Math.random() * 0.3;
  } else {
    direction = 'left';
    cloud.style.left = window.innerWidth + 120 + 'px';
    speed = 0.2 + Math.random() * 0.3;
  }

  cloud.dataset.direction = direction;
  cloud.dataset.speed = speed;

  body.appendChild(cloud);

  function move() {
    let left = parseFloat(cloud.style.left);
    const s = parseFloat(cloud.dataset.speed);
    if (cloud.dataset.direction === 'right') {
      if (left > window.innerWidth + 120) {
        cloud.remove();
        return;
      }
      cloud.style.left = left + s + 'px';
    } else {
      if (left < -120) {
        cloud.remove();
        return;
      }
      cloud.style.left = left - s + 'px';
    }
    requestAnimationFrame(move);
  }

  move();
}

setInterval(createCloud, 6000 + Math.random() * 5000);
for (let i = 0; i < 2; i++) createCloud();

document.getElementById('cameraBtn').addEventListener('click', () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.capture = 'environment';
  input.click();
});
