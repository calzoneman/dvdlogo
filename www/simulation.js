/**
 * Computes the extended Euclidean algorithm for n1 and n2.
 */
function extendedEuclidean(n1, n2) {
    let a = Math.max(n1, n2);
    let b = Math.min(n1, n2);

    let rPrev = a;
    let r = b;
    let sPrev = 1;
    let s = 0;
    let tPrev = 0;
    let t = 1;

    while (r !== 0) {
        let q = Math.trunc(rPrev / r);
        let [rCur, rNew] = [r, rPrev - q * r];
        let [sCur, sNew] = [s, sPrev - q * s];
        let [tCur, tNew] = [t, tPrev - q * t];

        rPrev = rCur; r = rNew;
        sPrev = sCur; s = sNew;
        tPrev = tCur; t = tNew;
    }

    return {
        bezout: [sPrev, tPrev],
        gcd: rPrev
    };
}

/**
 * Computes the least common multiple of n1 and n2.
 */
function lcm(n1, n2) {
    let { gcd } = extendedEuclidean(n1, n2);
    return (n1 * n2) / gcd;
}

class DVDSimulation {
    constructor({
        xInit,
        yInit,
        xDirInit,
        yDirInit,
        cvWidth,
        cvHeight,
        logoWidth,
        logoHeight
    }) {
        this.width = (cvWidth - logoWidth);
        this.height = (cvHeight - logoHeight);

        /**
         * Trick to easily support varying start directions while keeping the
         * math the same: starting facing left or up is equivalent to relabeling
         * (inverting) an axis.  We can account for this in our returned screen
         * positions while keeping the calculations the same as if we're always
         * beginning facing right and down.
         */
        if (xDirInit < 0) {
            this.xInit = this.width - xInit;
            this.xFlip = 0;
        } else {
            this.xInit = xInit;
            this.xFlip = 1;
        }

        if (yDirInit < 0) {
            this.yInit = this.height - yInit;
            this.yFlip = 0;
        } else {
            this.yInit = yInit;
            this.yFlip= 1;
        }

        let { bezout: [xCoef, _], gcd } = extendedEuclidean(this.width, this.height);

        this.canHitCorner = Math.abs(this.xInit - this.yInit) % gcd === 0;
        if (this.canHitCorner) {
            /**
             * Bézout's identity let us solve for the coefficients in
             * ax - by = gcd(width, height).
             * But in our case we want to solve for
             * wx - hy = xInit - yInit, where xInit - yInit is some multiple
             * of gcd(w, h).  So we can fix it by multiplying the returned
             * coefficient by the factor of (xInit - yInit) / gcd(w, h).
             */
            xCoef *= (this.xInit - this.yInit) / gcd;

            /**
             * The period between hitting corners is always lcm(width, height).
             */
            this.betweenCorners = lcm(this.width, this.height);

            /**
             * The time to hit the first corner can be computed based on the
             * Bézout coefficient calculated above.  We can easily multiply
             * out the coefficient to find *some* value where a corner is hit,
             * then figure out how far that is from a multiple of the period
             * to determine the offset to the first corner hit.
             */
            this.firstCorner = (xCoef * this.width - this.xInit) % this.betweenCorners;
            /**
             * In JavaScript, negative modulus gives a negative result, so we
             * need to bring it positive again.
             */
            if (this.firstCorner < 0) this.firstCorner += this.betweenCorners;
        }
    }

    /**
     * Returns the state of the simulation at the given frame number.
     */
    simulate(frame) {
        let xDist = this.xInit + frame;
        let xWallHits = Math.floor(xDist / this.width);
        let yDist = this.yInit + frame;
        let yWallHits = Math.floor(yDist / this.height);

        let x = xDist % this.width;
        if (xWallHits % 2 === this.xFlip) {
            /**
             * Invert the x axis every other wall hit
             */
            x = this.width - x;
        }

        let y = yDist % this.height;
        if (yWallHits % 2 === this.yFlip) {
            /**
             * Invert the y axis every other wall hit
             */
            y = this.height - y;
        }

        let cornersHit = 0;
        if (this.canHitCorner) {
            cornersHit = Math.floor(
                (frame + this.betweenCorners - this.firstCorner)
                / this.betweenCorners
            );
        }

        return {
            x,
            y,
            wallsHit: xWallHits + yWallHits,
            cornersHit
        };
    }
}

class DVDLogoApp {
    constructor({
        canvas,
        timerUrl,
        logoCount,
        seed,
        speed
    }) {
        this.canvas = canvas;
        this.timerUrl = timerUrl;
        this.logoCount = logoCount;
        this.seed = seed;
        this.speed = speed;
        this.ctx = canvas.getContext('2d');

        this.logos = [];
        this.width = 640;
        this.height = 360;
        this.epoch = 0;
        this.timeOffset = 0;
        this.syncTimeout = null;

        this.scaleCanvas();

        window.addEventListener('resize', () => {
            this.scaleCanvas();
        });
    }

    scaleCanvas() {
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;

        const { xScale, yScale } = this.calcScale();
        this.xScale = xScale;
        this.yScale = yScale;
    }

    async init() {
        await this.loadLogos(this.logoCount);
        this.sim = this.initSim(this.seed);
        await this.updateTime();
    }

    async updateTime() {
        let opts = {
            cache: 'no-cache'
        };

        let res = await fetch(new Request(this.timerUrl, opts));
        if (!res.ok) {
            console.error(`[DVDLogoApp] Error fetching timer: ${res.status}`);
            return;
        }

        let { epoch, time } = await res.json();
        this.epoch = epoch;
        this.timeOffset = time - Date.now();
    }

    async loadLogos(logoCount) {
        this.logos = [];

        for (let i = 0; i < logoCount; i++) {
            const img = await loadLogo(`logos/${i}.svg`);
            this.logos.push(img);
        }
    }

    draw({ x, y, logoIndex }) {
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.scale(this.xScale, this.yScale);
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.width, this.height);
        this.ctx.drawImage(this.logos[logoIndex], x, y);
    }

    calcScale() {
        return {
            xScale: this.canvas.clientWidth / this.width,
            yScale: this.canvas.clientHeight / this.height
        };
    }

    nextFrame() {
        let millis = Date.now() + this.timeOffset - this.epoch;
        let ticks = Math.floor((millis / 1_000) * this.speed);

        let {
            x,
            y,
            wallsHit,
            /* cornersHit */
        } = this.sim.simulate(ticks);

        this.draw({
            x,
            y,
            logoIndex: wallsHit % this.logos.length
        });

        window.requestAnimationFrame((_t) => this.nextFrame());
    }

    start() {
        window.requestAnimationFrame((_t) => this.nextFrame());
        this.startSyncTimer();
    }

    initSim(seed) {
        let hashCode = hash(seed);

        let xReversed = hashCode >> 31;
        let yReversed = hashCode >> 30 & 1;

        let xInit = hashCode >> 15 & 0x7FFF;
        xInit = xInit % (this.width - this.logos[0].width);
        let xDirInit = xReversed ? -1 : 1;

        let yInit = hashCode & 0x7FFF;
        yInit = yInit % (this.height - this.logos[0].height);
        let yDirInit = yReversed ? -1 : 1;

        return new DVDSimulation({
            xInit,
            yInit,
            xDirInit,
            yDirInit,
            cvWidth: this.width,
            cvHeight: this.height,
            logoWidth: this.logos[0].width,
            logoHeight: this.logos[0].height,
        });
    }

    startSyncTimer() {
        setTimeout(() => {
            this.updateTime()
                .catch(error => {
                    console.error(`[DVDLogoApp] Time sync failed: ${error}`);
                }).then(() => {
                    this.startSyncTimer();
                });
        }, 20_000 + (5_000 * Math.random()));
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

function hash(seed) {
    seed = String(seed);

    let h = new Uint32Array([0]);
    for (let i = 0; i < seed.length; i++) {
        h[0] = (31 * h[0]) + seed.charCodeAt(i);
    }

    h[0] += 0x3243f6a8; h[0] ^= h[0] >> 15;
    h[0] *= 0xd168aaad; h[0] ^= h[0] >> 15;
    h[0] *= 0xaf723597; h[0] ^= h[0] >> 15;

    return h;
}
