class DVDLogoApp {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        this.logos = [];
        this.logoIdx = 0;
        this.x = 0;
        this.y = 0;
        this.xdir = 1;
        this.ydir = 1;
        this.speed = 1;
        this.width = 640;
        this.height = 400;
        this.frames = 0;
        this.lagFrames = 0;
        this.cornerHitFrames = 0;
        this.interval = null;

        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;

        const { xscale, yscale } = this.calcScale();
        this.xscale = xscale;
        this.yscale = yscale;
    }

    async loadLogos(logoCount) {
        this.logos = [];

        for (let i = 0; i < logoCount; i++) {
            const img = await loadLogo(`logos/${i}.svg`);
            this.logos.push(img);
        }

        this.logoIdx = 0;
    }

    draw() {
        if (this.cornerHitFrames > 0) {
            this.cornerHitFrames--;
            this.nextLogo();
        }

        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.scale(this.xscale, this.yscale);
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.width, this.height);
        this.ctx.drawImage(this.logos[this.logoIdx], this.x, this.y);
    }

    calcScale() {
        return {
            xscale: this.canvas.clientWidth / this.width,
            yscale: this.canvas.clientHeight / this.height
        };
    }

    nextFrame() {
        for (let i = 0; i < this.speed; i++)
            this.stepSimulation();
        this.draw();
    }

    nextLogo() {
        this.logoIdx = (this.logoIdx + 1) % this.logos.length;
    }

    stepSimulation() {
        if (this.lagFrames > 0) {
            this.lagFrames--;
            return;
        }

        this.frames++;
        this.x += this.xdir;
        this.y += this.ydir;

        let hitx = false;
        let hity = false;

        if (this.x === 0) { this.xdir = 1; hitx = true; }
        if (this.x + this.logos[0].width === this.width - 1) { this.xdir = -1; hitx = true; }
        if (this.y === 0) { this.ydir = 1; hity = true; }
        if (this.y + this.logos[0].height === this.height - 1) { this.ydir = -1; hity = true; }

        if (hitx || hity)
            this.nextLogo();
        if (hitx && hity)
            this.hitCorner();
    }

    hitCorner() {
        this.cornerHitFrames = 90;
    }

    syncFrameCount(n) {
        // TODO: smooth this out?
        while (this.frames < n) {
            this.stepSimulation();
        }

        this.lagFrames = this.frames - n;
    }

    run({
        initX = 0,
        initY = 0,
        initXDir = 1,
        initYDir = 1,
        speed = 1,
        fps = 30
    }) {
        this.x = initX;
        this.y = initY;
        this.xdir = initXDir;
        this.ydir = initYDir;
        this.speed = speed;

        // TODO: probably should use requestAnimationFrame for drawing
        this.interval = setInterval(() => {
            this.nextFrame();
        }, 1_000 / fps);
    }

    stop() {
        clearInterval(this.interval);
        this.interval = null;
    }
}

function loadLogo(path) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Failed to load ${path}`));
        img.src = path;
    });
}
