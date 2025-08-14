const canvas = document.getElementById("cloudCanvas");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let clouds = [];
const cloudCount = 8; // fewer clouds

class Cloud {
    constructor(x, y, speed, direction) {
        this.x = x;
        this.y = y;
        this.speed = speed;
        this.direction = direction;
        this.size = Math.random() * 60 + 40;
    }

    draw() {
        ctx.beginPath();
        ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
        ctx.ellipse(this.x, this.y, this.size, this.size / 2, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    update() {
        this.x += this.direction * this.speed;
        if (this.direction > 0 && this.x > canvas.width + this.size) {
            this.x = -this.size;
        } else if (this.direction < 0 && this.x < -this.size) {
            this.x = canvas.width + this.size;
        }
        this.draw();
    }
}

function initClouds() {
    for (let i = 0; i < cloudCount; i++) {
        let direction = i < cloudCount / 2 ? 1 : -1; // half right, half left
        let speed = Math.random() * 0.5 + 0.2;
        let yPos = direction === 1 
            ? Math.random() * canvas.height * 0.4 // top half
            : Math.random() * canvas.height * 0.4 + canvas.height * 0.6; // bottom half
        clouds.push(new Cloud(Math.random() * canvas.width, yPos, speed, direction));
    }
}

function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    clouds.forEach(cloud => cloud.update());
    requestAnimationFrame(animate);
}

initClouds();
animate();

window.addEventListener("resize", () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});



