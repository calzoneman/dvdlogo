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
            x = this.xPeriod - x;
        }

        let y = yDist % this.height;
        if (yWallHits % 2 === this.yMod) {
            /**
             * Invert the y axis every other wall hit
             */
            y = this.yPeriod - y;
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
