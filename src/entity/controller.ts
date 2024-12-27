import {throws} from 'assert';
import {Vector} from '../physics/vector';
import {room} from '../room/room';
import {RoomConfig} from '../room/room-config';
import {Entity} from './entity';

export interface ControllerThink {
    target: Vector | null;
    goal: Vector | null;
    main: boolean | null;
    fire: boolean | null;
    alt: boolean | null;
    angle?: number;
    power?: number;
}

export class Controller {
    public entity!: Entity;
    public acceptsFromTop: boolean = true;
    public timer: number = Math.random() * 10;

    constructor() {}

    public isThinkTime() {
        if (this.timer-- < 0) {
            this.timer = 10;

            return true;
        }

        return false;
    }

    public think(): ControllerThink {
        return {
            target: null,
            goal: null,
            main: false,
            fire: false,
            alt: false,
        };
    }
}

export class ControllerMaker<T extends new (...args: ConstructorParameters<T>) => Controller> {
    public controller: T;
    public args: ConstructorParameters<T>;

    constructor(controller: T, ...args: ConstructorParameters<T>) {
        this.controller = controller;
        this.args = args;
    }

    public make() {
        return new this.controller(...this.args);
    }
}

export class Nearest extends Controller {
    protected target: Vector | null = null;
    protected onlyPlayer: boolean;

    constructor(onlyPlayer: boolean = false) {
        super();

        this.onlyPlayer = onlyPlayer;
    }

    public think(): ControllerThink {
        if (this.isThinkTime()) {
            if (this.target !== null) {
                this.acceptsFromTop = false;

                return {
                    target: this.target.clone().sub(this.entity.pos),
                    goal: null,
                    main: true,
                    fire: true,
                    alt: false,
                };
            }

            this.acceptsFromTop = true;

            return {
                target: null,
                goal: null,
                main: null,
                fire: null,
                alt: null,
            };
        }

        let diff = Infinity;
        let master: Entity;
        for (const entity of room.entities) {
            if (entity === this.entity) continue;

            if (Entity.isSameTeam(entity, this.entity)) continue;

            if (entity.master && !entity.setting.independent) continue;

            if (this.onlyPlayer && entity.setting.food) continue;

            if (entity.setting.isFixed) continue;

            if (!Entity.isEntityVisible(this.entity, entity)) continue;

            const distance = Vector.distance(this.entity.pos, entity.pos);

            if (distance < diff) {
                diff = distance;

                master = entity;
            }
        }

        if (!master) {
            this.acceptsFromTop = true;
            this.target = null;

            return {
                target: null,
                goal: null,
                main: null,
                fire: null,
                alt: null,
            };
        }

        this.target = master.pos;

        this.acceptsFromTop = false;
        return {
            target: this.target.clone().sub(this.entity.pos),
            goal: null,
            main: true,
            fire: true,
            alt: false,
            power: 1,
        };
    }
}

export class CircleMove extends Controller {
    public acceptsFromTop: boolean = false;

    protected angle: number = Math.random() * Math.PI * 2;
    protected target: Vector = new Vector(0, 0);

    public think(): ControllerThink {
        if (this.isThinkTime()) {
            this.target = new Vector(5, 5).addAngle(this.angle);

            this.angle -= 0.002;
        }

        return {
            target: this.target,
            goal: null,
            main: true,
            fire: false,
            alt: false,
            power: 0.1,
        };
    }
}

export class SlowCircleMove extends Controller {
    public acceptsFromTop: boolean = false;

    protected angle: number = Math.random() * Math.PI * 2;
    protected target: Vector = new Vector(0, 0);

    public think(): ControllerThink {
        if (this.isThinkTime()) {
            this.target = new Vector(5, 5).addAngle(this.angle);

            this.angle -= 0.01;
        }

        return {
            target: this.target,
            goal: null,
            main: true,
            fire: false,
            alt: false,
            power: 0.1,
        };
    }
}

export class MasterCircleMove extends Controller {
    public acceptsFromTop: boolean = false;

    protected angle: number = Math.random() * Math.PI * 2;
    protected target: Vector = new Vector(0, 0);
    protected radius: number = 50;
    protected rotationSpeed: number = Math.PI / 10;

    public think(): ControllerThink {
        if (this.isThinkTime()) {
            if (this.entity.master) {
                const masterPos = this.entity.master.pos;
                this.target = new Vector(masterPos.x + Math.cos(this.angle) * this.radius, masterPos.y + Math.sin(this.angle) * this.radius);
                this.angle -= this.rotationSpeed;
            } else {
                this.target = new Vector(this.entity.pos.x + Math.cos(this.angle) * this.radius, this.entity.pos.y + Math.sin(this.angle) * this.radius);
                this.angle -= this.rotationSpeed;
            }
        }

        return {
            target: this.target.clone().sub(this.entity.pos),
            goal: null,
            main: true,
            fire: false,
            alt: false,
            power: 0.6,
        };
    }
}

export class GoToMasterTarget extends Controller {
    protected target: Vector = new Vector(0, 0);

    public think(): ControllerThink {
        if (this.isThinkTime()) {
            if (!this.entity.source) {
                this.acceptsFromTop = true;
            } else {
                this.acceptsFromTop = false;
                this.target = this.entity.source.clone();
            }
        }

        return {
            target: this.target.clone().add(this.entity.masterPos).sub(this.entity.pos),
            goal: null,
            main: true,
            fire: false,
            alt: false,
            power: 0.7 + Math.random() * 1,
        };
    }
}

export class Minion extends Controller {
    public acceptsFromTop: boolean = false;

    protected angle: number = Math.random() * Math.PI * 2;
    protected target: Vector = new Vector(0, 0);
    protected radius: number = 50;
    protected rotationSpeed: number = Math.PI / 15;

    protected mode: boolean = false;

    public think(): ControllerThink {
        if (this.isThinkTime()) {
            if (this.entity.master && this.entity.master.source) {
                this.acceptsFromTop = false;

                const masterTargetPos = this.entity.master.source.clone();
                const distance = Vector.distance(this.entity.pos, masterTargetPos.clone().add(this.entity.master.pos));

                if (distance > this.radius + 20) {
                    this.target = masterTargetPos;
                    this.mode = true;
                } else {
                    const offsetX = Math.cos(this.angle) * this.radius;
                    const offsetY = Math.sin(this.angle) * this.radius;
                    this.target = new Vector(masterTargetPos.x + offsetX, masterTargetPos.y + offsetY);
                    this.angle -= this.rotationSpeed;
                    this.mode = false;
                }
            } else {
                this.acceptsFromTop = true;
            }
        }

        return {
            target: this.target.clone().add(this.entity.masterPos).sub(this.entity.pos),
            angle: this.mode ? undefined : this.angle + Math.PI,
            goal: null,
            main: true,
            fire: true,
            alt: false,
            power: 0.8,
        };
    }
}

export class MinionNearest extends Controller {
    public acceptsFromTop: boolean = false;

    protected angle: number = Math.random() * Math.PI * 2;
    protected targetAngle: number = 0;
    protected target: Vector | null = null;
    protected radius: number = 20;
    protected rotationSpeed: number = Math.PI / 15;

    public think(): ControllerThink {
        if (this.isThinkTime()) {
            let nearest = this.findNearest();

            if (nearest) {
                const offsetX = Math.cos(this.angle) * this.radius;
                const offsetY = Math.sin(this.angle) * this.radius;
                this.target = new Vector(nearest.pos.x + offsetX, nearest.pos.y + offsetY);
                this.angle -= this.rotationSpeed;
                this.targetAngle = nearest.pos.clone().sub(this.entity.pos).angle();
            } else {
                this.target = null;
            }
        }

        if (this.target === null) {
            return {
                target: null,
                angle: this.angle,
                goal: null,
                main: true,
                fire: true,
                alt: false,
                power: 0.8,
            };
        }

        return {
            target: this.target.clone().sub(this.entity.pos),
            angle: this.targetAngle,
            goal: null,
            main: true,
            fire: true,
            alt: false,
            power: 0.8,
        };
    }

    private findNearest(): Entity | null {
        let nearestDistance = Infinity;
        let nearest: Entity | null = null;

        for (const entity of room.entities) {
            if (entity === this.entity) continue;
            if (Entity.isSameTeam(entity, this.entity)) continue;
            if (entity.master && !entity.setting.independent) continue;
            if (entity.setting.isFixed) continue;
            if (!Entity.isEntityVisible(this.entity, entity)) continue;

            const distance = Vector.distance(this.entity.pos, entity.pos);
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearest = entity;
            }
        }

        return nearest;
    }
}
