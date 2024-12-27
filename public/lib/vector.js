export class Vector {
    constructor(x = 0, y = 0) {
        if (typeof x === 'number') {
            this.x = x;
            this.y = y;
        } else {
            this.x = x.x;
            this.y = x.y;
        }
    }

    add(vector) {
        if (typeof vector === 'number') {
            this.x += vector;
            this.y += vector;
        } else {
            this.x += vector.x;
            this.y += vector.y;
        }

        return this;
    }

    sub(vector) {
        if (typeof vector === 'number') {
            this.x -= vector;
            this.y -= vector;
        } else {
            this.x -= vector.x;
            this.y -= vector.y;
        }

        return this;
    }

    get mag() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    mult(num) {
        if (typeof num === 'number') {
            this.x *= num;
            this.y *= num;
        } else {
            this.x *= num.x;
            this.y *= num.y;
        }

        return this;
    }

    div(num) {
        if (typeof num === 'number') {
            this.x /= num;
            this.y /= num;
        } else {
            this.x /= num.x;
            this.y /= num.y;
        }

        return this;
    }

    normalize() {
        const mag = this.mag;

        if (mag !== 0) {
            this.div(mag);
        }

        return this;
    }

    dot(vector) {
        return this.x * vector.x + this.y * vector.y;
    }

    addAngle(angle) {
        this.mult({x: Math.cos(angle), y: Math.sin(angle)});

        return this;
    }

    rotate(angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        const x = this.x * cos - this.y * sin;
        const y = this.x * sin + this.y * cos;

        this.x = x;
        this.y = y;

        return this;
    }

    angleBetween(vector) {
        const dot = this.dot(vector);
        const mags = this.mag * new Vector(vector).mag;

        if (mags === 0) return 0;

        return Math.acos(dot / mags);
    }

    angle(vector = new Vector()) {
        return Math.atan2(this.y - vector.y, this.x - vector.x);
    }

    limit(max) {
        if (this.mag > max) {
            this.normalize();
            this.mult(max);
        }

        return this;
    }

    setMag(newMag) {
        this.normalize();
        this.mult(newMag);

        return this;
    }

    clone() {
        return new Vector(this);
    }

    static toCartesian(r, theta) {
        return new Vector(r * Math.cos(theta), r * Math.sin(theta));
    }

    static addAngle(v, angle) {
        return new Vector(v.x * Math.cos(angle), v.y * Math.sin(angle));
    }

    static distance(a, b) {
        return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
    }

    static add(a, b) {
        return new Vector(a.x + b.x, a.y + b.y);
    }

    static sub(a, b) {
        return new Vector(a.x - b.x, a.y - b.y);
    }

    static mult(v, num) {
        return new Vector(v.x * num, v.y * num);
    }

    static div(v, num) {
        return new Vector(v.x / num, v.y / num);
    }

    static dot(a, b) {
        return a.x * b.x + a.y * b.y;
    }

    static mag(v) {
        return Math.sqrt(v.x * v.x + v.y * v.y);
    }
}
