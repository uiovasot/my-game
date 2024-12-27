export class RGBColor {
    public r: number;
    public g: number;
    public b: number;

    constructor(r = 0, g = 0, b = 0) {
        this.r = r;
        this.g = g;
        this.b = b;
    }

    get clone() {
        return new RGBColor(this.r, this.g, this.b);
    }

    static channelMixer(a: number, b: number, ratio: number) {
        return Math.floor(a * ratio + b * (1 - ratio));
    }

    public invert() {
        return new RGBColor(255 - this.r, 255 - this.g, 255 - this.b);
    }

    public mix(color: RGBColor, ratio: number) {
        this.r = RGBColor.channelMixer(this.r, color.r, ratio);
        this.g = RGBColor.channelMixer(this.g, color.g, ratio);
        this.b = RGBColor.channelMixer(this.b, color.b, ratio);

        return this;
    }

    get hex() {
        const r = this.r.toString(16).padStart(2, '0');
        const g = this.g.toString(16).padStart(2, '0');
        const b = this.b.toString(16).padStart(2, '0');

        if (r[0] === r[1] && g[0] === g[1] && b[0] === b[1]) return `#${r}${g}${b}`;

        return `#${r}${g}${b}`;
    }

    static fromHex(hex: string) {
        if (hex.indexOf('#') === 0) hex = hex.slice(1);
        if (hex.length === 3) hex = `${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`;

        let r = 0,
            g = 0,
            b = 0;

        if (hex.length === 6) {
            r = parseInt(hex.slice(0, 2), 16);
            g = parseInt(hex.slice(2, 4), 16);
            b = parseInt(hex.slice(4, 6), 16);
        }

        return new RGBColor(r, g, b);
    }
}
