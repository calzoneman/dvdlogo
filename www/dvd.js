class DVDSimulation {
    constructor({
        initX,
        initY,
        initXDir,
        initYDir,
        cvWidth,
        cvHeight,
        logoWidth,
        logoHeight
    }) {
        this.xPeriod = (cvWidth - logoWidth) - 1;
        this.yPeriod = (cvHeight - logoHeight) - 1;

        if (initXDir > 0) {
            this.initX = initX;
            this.xMod = 1;
        } else {
            // Starting left is equivalent to mirroring the simulation
            // horizontally
            this.initX = this.xPeriod - initX;
            this.xMod = 0;
        }

        if (initYDir > 0) {
            this.initY = initY;
            this.yMod = 1;
        } else {
            // Starting up is equivalent to mirroring the simulation
            // vertically
            this.initY = this.yPeriod - initY;
            this.yMod = 0;
        }
    }

    calcPosition(frame) {
        let xFrame = this.initX + frame;
        let yFrame = this.initY + frame;

        let x = xFrame % this.xPeriod;
        if (Math.floor(xFrame / this.xPeriod) % 2 === this.xMod) {
            x = this.xPeriod - x;
        }

        let y = yFrame % this.yPeriod;
        if (Math.floor(yFrame / this.yPeriod) % 2 === this.yMod) {
            y = this.yPeriod - y;
        }

        let hitX = (x === 0 || x === this.xPeriod);
        let hitY = (y === 0 || y === this.yPeriod);

        return {
            x,
            y,
            hitWall: hitX || hitY,
            hitCorner: hitX && hitY
        };
    }
}

class DVDLogoApp {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        this.logos = [];
        this.logoIdx = 0;
        // TODO: 720x480?
        this.width = 640;
        this.height = 400;
        this.frames = 0;
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

        let { x, y } = this.sim.calcPosition(this.frames);
        this.ctx.drawImage(this.logos[this.logoIdx], x, y);
    }

    calcScale() {
        return {
            xscale: this.canvas.clientWidth / this.width,
            yscale: this.canvas.clientHeight / this.height
        };
    }

    nextFrame() {
        let shouldSwitchLogo = false;
        let shouldCorner = false;
        for (let i = 0; i < this.speed; i++) {
            this.frames++; // TODO: check wall/corner hits here
            let { hitWall, hitCorner } = this.sim.calcPosition(this.frames);
            shouldSwitchLogo = shouldSwitchLogo || hitWall;
            shouldCorner = shouldCorner || hitCorner;
        }

        if (shouldSwitchLogo) this.nextLogo();
        if (shouldCorner) this.hitCorner();
        this.draw();
    }

    nextLogo() {
        this.logoIdx = (this.logoIdx + 1) % this.logos.length;
    }

    hitCorner() {
        this.cornerHitFrames = 90;
    }

    syncFrameCount(n) {
        this.frames = n;
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
        this.sim = new DVDSimulation({
            initX,
            initY,
            initXDir,
            initYDir,
            cvWidth: this.width,
            cvHeight: this.height,
            logoWidth: this.logos[0].width,
            logoHeight: this.logos[0].height,
        });

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
