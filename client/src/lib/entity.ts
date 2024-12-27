import {ctx, drawText} from './canvas';
import {Color} from './color';
import {Socket} from './socket';
import {Vector, VectorLike} from './vector';

export interface Mockup {
    sides: number | string | [number, number][];
    alpha: number;
    strokeWidth: number;
    props: Props[];
}

export interface Props {
    _offset: Vector;
    angle: number;
    fixedAngle: boolean;
    spin: number;
    spin2: number;
    color: string;
    border: string;
    size: number;
    sides: number | string | [number, number][];
    strokeWidth: number;
    alpha: number;
    layer: number;

    offset?: Vector;
    offsetAngle?: number;
}

export interface Obj {
    label: string;
    angle: number;
    color: string;
    border: string;
    size: number;
    strokeWidth: number;
    alpha: number;

    sides: number | string | [number, number][];
    props: Props[];
}

export function drawShape(obj: {angle: number; size: number; sides: number | string | [number, number][]}) {
    if (Array.isArray(obj.sides)) {
        let dx = Math.cos(obj.angle);
        let dy = Math.sin(obj.angle);
        for (let [x, y] of obj.sides) {
            ctx.lineTo(obj.size * (x * dx - y * dy), obj.size * (y * dx + x * dy));
        }
    } else if (typeof obj.sides === 'string') {
        ctx.rotate(obj.angle);
        ctx.scale(obj.size, obj.size);
        let path = new Path2D(obj.sides);
        ctx.fill(path);
    } else if (!obj.sides) {
        ctx.arc(0, 0, obj.size, 0, 2 * Math.PI);
    } else if (obj.sides < 0) {
        let sides = -obj.sides;
        const angle = obj.angle + Math.PI / obj.sides;
        let dip = 1 - 6 / sides ** 2;
        ctx.moveTo(obj.size * Math.cos(angle), obj.size * Math.sin(angle));
        for (let i = 0; i < sides; i++) {
            const htheta = ((i + 0.5) / sides) * 2 * Math.PI + angle;
            const theta = ((i + 1) / sides) * 2 * Math.PI + angle;
            ctx.quadraticCurveTo(obj.size * dip * Math.cos(htheta), obj.size * dip * Math.sin(htheta), obj.size * Math.cos(theta), obj.size * Math.sin(theta));
        }
    } else if (obj.sides > 0) {
        const angle = obj.angle + Math.PI / obj.sides;
        for (let i = 0; i < obj.sides + 1; i++) {
            const theta = (i * (2 * Math.PI)) / obj.sides;
            const xPos = obj.size * Math.cos(theta + angle);
            const yPos = obj.size * Math.sin(theta + angle);
            if (i === 0) ctx.moveTo(xPos, yPos);
            else ctx.lineTo(xPos, yPos);
        }
    }
}

export function drawProp(entity: Entity, prop: Props) {
    if (prop.offsetAngle === undefined) prop.offsetAngle = 0;

    prop.angle += prop.spin;

    if (!(prop._offset instanceof Vector)) prop._offset = new Vector(prop._offset);

    prop.offset = prop._offset.clone().rotate(prop.offsetAngle + (prop.fixedAngle ? 0 : entity.angle));
    prop.offsetAngle += prop.spin2;

    const factor = entity.size / 20;

    const pos = prop.offset.clone().mult(factor);

    const obj = {
        sides: prop.sides,
        size: factor * prop.size,
        angle: prop.fixedAngle ? prop.angle : prop.angle + entity.angle,
    };

    ctx.save();
    ctx.translate(pos.x, pos.y);

    ctx.fillStyle = prop.color;
    ctx.strokeStyle = prop.border;
    ctx.globalAlpha = prop.alpha;

    ctx.beginPath();

    drawShape(obj);

    ctx.fill();
    ctx.globalAlpha = 1;
    if (prop.strokeWidth > 0) ctx.stroke();
    ctx.closePath();
    ctx.restore();
}

export class Entity {
    public iamMAIN = false;

    public label = 'Entity';

    public id = 0;
    public health = 100;
    public shield = 10;
    public angle = 0;
    public pos = new Vector();
    public serverPos = new Vector();
    public attackTime = 0;
    public level = 0;
    public score = 0;
    public levelScore = 0;
    public size = 0;

    public upgrades: Obj[] = [];

    public team = 0;
    public maxHealth = 100;
    public maxShield = 1100;
    public showHealth = true;
    public showName = true;
    public showScore = true;

    public fov = 100;

    public name = 'Entity';

    public color = Color.Black;
    public border = Color.Black;
    public strokeWidth = 0;
    public alpha = 1;

    public mockupId = 0;

    public sides: number | string | [number, number][] = 0;
    public props: Props[] = [];

    public isLoaded = false;
    public canSee = false;

    public fadeStart: null | number = null;

    private drawEntityShape() {
        if (!this.isLoaded) return;

        ctx.beginPath();

        drawShape(this);

        ctx.fill();
        if (this.strokeWidth > 0) ctx.stroke();
        ctx.closePath();

        if (!this.iamMAIN) {
            if (this.showScore) {
                drawText('' + this.score, Color.Black, null, 7, new Vector(0, -this.size - 5), 'center');
            }
            if (this.showName) {
                drawText(this.name, Color.Black, null, 10, new Vector(0, -this.size - 12), 'center');
            }
        }

        if (this.showHealth && (this.health < (this.maxHealth || 100) || this.shield < this.maxShield)) {
            const radius = 3;

            const width = this.size * 2.3;
            const height = 3;

            const x = -(width / 2);
            const y = this.size + height + 1;

            ctx.beginPath();
            ctx.fillStyle = Color.Black;
            ctx.roundRect(x, y, width, height, radius);
            ctx.fill();

            const fillWidth = 2 + Math.min(1, Math.max(0, this.health / (this.maxHealth || 100))) * (width - 2);
            ctx.beginPath();
            ctx.fillStyle = Color.Green;
            ctx.roundRect(x + 1, y + 0.75, fillWidth - 2, height - 1.5, radius);
            ctx.fill();

            const shieldWidth = 2 + Math.min(1, Math.max(0, this.shield / this.maxShield)) * (width - 2);
            ctx.beginPath();
            ctx.globalAlpha = 0.5;
            ctx.fillStyle = Color.Blue;
            ctx.roundRect(x + 1, y + 0.75, shieldWidth - 2, height - 1.5, radius);
            ctx.fill();
            ctx.globalAlpha = 1;
        }
    }

    public drawEntity(socket: Socket) {
        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);

        if (this.fadeStart) {
            const fadeProgress = (performance.now() - this.fadeStart) / 250;
            if (fadeProgress >= 1) {
                socket.removeEntity(this);
                ctx.restore();
                return;
            }
            ctx.globalAlpha = 1 - fadeProgress;
            const scale = 1 + fadeProgress * 0.5;
            ctx.scale(scale, scale);
        } else {
            if (this.alpha === 1 && this.attackTime < 20 && this.attackTime > 0) {
                let attackColorAlpha = 0;

                const timeSinceAttack = this.attackTime;
                const totalDuration = 20;
                const peakTime = 5;

                if (timeSinceAttack <= peakTime) {
                    attackColorAlpha = Math.max(0, (timeSinceAttack / peakTime) ** 2 - 0.2);
                } else {
                    const remainingTime = totalDuration - timeSinceAttack;
                    const fallDuration = totalDuration - peakTime;
                    attackColorAlpha = Math.max(0, (remainingTime / fallDuration) ** 3 - 0.4);
                }
                ctx.globalAlpha = 1 - attackColorAlpha * 0.5;
            } else ctx.globalAlpha = this.alpha;
        }

        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';

        if (this.props) {
            for (const prop of this.props.filter((prop) => prop.layer < 0)) {
                drawProp(this, prop);
            }
        }

        ctx.fillStyle = this.color;
        ctx.strokeStyle = this.border;

        this.drawEntityShape();

        if (this.props) {
            for (const prop of this.props.filter((prop) => prop.layer > 0)) {
                drawProp(this, prop);
            }
        }

        ctx.restore();
    }
}
