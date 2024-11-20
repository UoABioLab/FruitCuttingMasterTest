export class Fruit {
    constructor(noseX, spawnPositionRange, screenHeight, fruitImages, initialSpeed, gravity) {
        this.image = fruitImages[Math.floor(Math.random() * fruitImages.length)];
        const screenRatio = Math.min(window.innerWidth, window.innerHeight) / 1000;
        this.width = Math.floor(120 * screenRatio);
        this.height = Math.floor(120 * screenRatio);
        this.x = Math.random() * (spawnPositionRange * 2) + (noseX - spawnPositionRange);
        this.y = screenHeight;
        this.speedY = -initialSpeed;
        this.gravity = gravity;
    }
    update() {
        this.speedY += this.gravity;
        this.y += this.speedY;
        return this.y <= window.innerHeight;
    }
    draw(ctx) {
        ctx.drawImage(this.image, this.x - this.width/2, this.y - this.height/2, this.width, this.height);
    }
    checkCollision(x, y) {
        return (x >= this.x - this.width/2 && 
                x <= this.x + this.width/2 && 
                y >= this.y - this.height/2 && 
                y <= this.y + this.height/2);
    }
} 
