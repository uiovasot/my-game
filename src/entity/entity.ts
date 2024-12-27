import {Color} from '../definitions/color';
import {Team} from '../definitions/team';
import {HSHGMeta} from '../physics/hshg';
import {ConnectedVector, Vector} from '../physics/vector';
import {EventEmitter} from 'events';
import {EntityClass, ProcessedClass} from './class';
import {RoomConfig} from '../room/room-config';
import {Controller, ControllerMaker} from './controller';
import {Prop} from './props';
import type {World} from '../room/world';

const SIZE_MULTIPLIER = 1.4;

export interface EntitySetting {
    showHealth: boolean;
    showName: boolean;
    showScore: boolean;
    giveScore: boolean;
    killMessage: boolean | string;
    label: string;
    hitType: 'none' | 'auto' | ((body: Entity, other: Entity) => void);
    miniMapType: 'none' | 'always' | 'team' | ((body: Entity, other: Entity) => boolean);
    score: number;
    name: null | string;
    size: number;
    mass: number;
    sides: number | string | Vector[];
    isFixed: boolean;
    airplane: boolean;
    bullet: boolean;
    food: boolean;
    independent: boolean;
    controllers: ControllerMaker<new () => Controller>[];
    skill: {
        speed: number;
        health: number;
        regen: number;
        damage: number;
        pen: number;
        range: number | null;
        pushability: number;
        fov: number;
        shield: number;
        shieldRegen: number;
    };
    upgrades: string[];
    on: {[key: string]: (body: Entity, ...args: unknown[]) => unknown};
}

export class Entity extends EventEmitter {
    public id!: number;
    public room!: World;

    public pos: Vector = new Vector();
    public vel: Vector = new Vector();
    public acc: Vector = new Vector();

    public score: number = 0;

    public level: number = 0;
    public levelScore: number = 0;

    public health: number = 100;
    public shield: number = 0;

    public lastTickAttacked: number = 60;

    public changed: boolean = false;

    public mockupId: number = 0;

    public socket: {
        send: (msg: Uint8Array) => void;
        sendMsg: (msg: string) => void;
    } = {
        send: () => void 0,
        sendMsg: () => void 0,
    };

    public getAABB: () => {
        active: boolean;
        min: [number, number];
        max: [number, number];
    } = () => {
        const size = this.size * 0.5 * SIZE_MULTIPLIER;

        return {
            active: true,
            min: [this.pos.x - size, this.pos.y - size],
            max: [this.pos.x + size, this.pos.y + size],
        };
    };

    public data: {[key: string]: any} = {};

    public name: string = 'Entity';

    public active: boolean = true;

    public HSHG?: HSHGMeta;

    public angle: number = 0;

    public move = new Set<0 | 1 | 2 | 3>();
    public moveAngle: null | number = null;
    public control: {
        target: Vector | null;
        goal: Vector | null;
        main: boolean;
        fire: boolean;
        alt: boolean;
        angle?: number;
        power: number;
    } = {
        target: null,
        goal: null,
        main: false,
        fire: false,
        alt: false,
        power: 1,
    };

    private _source: Vector | null;

    public set source(value: Vector | null) {
        if (this.setting.independent || !this.master) this._source = value;
        else this.master.source = value;
    }

    public get source(): Vector | null {
        if (this.setting.independent || !this.master) return this._source;

        return this.master.source;
    }

    public setting: EntitySetting = {
        showHealth: true,
        showName: true,
        showScore: true,
        giveScore: true,
        killMessage: true,
        label: 'Entity',
        hitType: 'auto',
        miniMapType: 'team',
        score: 25000,
        name: null,
        size: 10,
        mass: 1,
        sides: 0,
        isFixed: false,
        airplane: false,
        bullet: false,
        food: false,
        independent: false,
        controllers: [],
        skill: {
            speed: 0.5,
            health: 100,
            regen: 1,
            damage: 1,
            pen: 10,
            range: null,
            pushability: 1,
            fov: 90,
            shield: 10,
            shieldRegen: 10,
        },
        upgrades: [],
        on: {},
    };

    public props: Prop[] = [];

    public controllers: Controller[] = [];

    public allUpgrades: ProcessedClass[] = [];
    public upgrades: ProcessedClass[] = [];

    public upgradeAdded: boolean = false;

    public color: Color | string = Color.TeamColor;
    public border: Color | string = Color.AutoBorder;
    public strokeWidth: number = 4;
    public alpha: number = 1;

    public team: Team = Team.Room;
    public team2: number = 0;

    public tick: number = 0;

    public master?: Entity;

    public children: Set<Entity> = new Set();
    public childrenLength: number = 0;

    public lastSend = {
        angle: 0,
        size: 0,
    };

    public die: boolean = false;

    public get size() {
        return this.setting.size;
    }

    public get mass() {
        return this.size * this.setting.mass;
    }

    public get maxHealth() {
        return this.setting.skill.health + this.score * 0.0004;
    }

    public get maxShield() {
        return this.setting.skill.shield + this.score * 0.0004;
    }

    public get isMaster() {
        if (this.setting.independent || !this.master) return true;

        return false;
    }

    public get topMaster(): Entity {
        if (this.setting.independent || !this.master) return this;

        return this.master.topMaster;
    }

    public get masterPos(): Vector {
        return this.topMaster.pos;
    }

    public get title(): string {
        let title = this.setting.food ? this.setting.label : this.setting.bullet ? `${this.topMaster.name}'s ${this.setting.label}` : `${this.name}'s ${this.setting.label}`;

        return title;
    }

    public init(Class: ProcessedClass | string) {
        if (typeof Class === 'string') Class = EntityClass[Class];

        this.mockupId = Class.mockupId;

        this.setting.showHealth = Class.showHealth;
        this.setting.showName = Class.showName;
        this.setting.showScore = Class.showScore;
        this.setting.giveScore = Class.giveScore;
        this.setting.killMessage = Class.killMessage;
        this.setting.label = Class.label;
        this.setting.name = Class.name;
        this.setting.size = Class.size;
        this.setting.mass = Class.mass;
        this.setting.sides = Class.sides;
        this.setting.isFixed = Class.isFixed;
        this.setting.airplane = Class.airplane;
        this.setting.bullet = Class.bullet;
        this.setting.food = Class.food;
        this.setting.skill = structuredClone(Class.skill);
        this.setting.independent = Class.independent;
        this.setting.controllers = Class.controllers;
        this.setting.hitType = Class.hitType;
        this.setting.miniMapType = Class.miniMapType;
        this.setting.upgrades = Class.upgrades;
        this.setting.on = Class.on;
        this.color = Class.color;
        this.border = Class.border;
        this.strokeWidth = Class.strokeWidth;
        this.alpha = Class.alpha;
        this.score = Class.score;
        this.health = Class.skill.health;
        this.shield = Class.skill.shield;

        for (const maker of this.setting.controllers) {
            this.controllers.push(maker.make());
        }

        if (this.setting.name !== null) this.name = this.setting.name;

        this.props = [];

        for (const propSetting of Class.props) {
            const prop = new Prop();

            prop.setting = propSetting;

            this.props.push(prop);
        }

        this.allUpgrades = [];
        for (let i = 0; i < Class.upgrades.length; i++) {
            this.allUpgrades.push(EntityClass[Class.upgrades[i]]);
        }

        this.upgrades = this.allUpgrades.filter((upgrade) => upgrade.tier <= this.level);

        if (this.upgrades.length > 0) this.upgradeAdded = true;

        this.changed = true;
    }

    public update() {
        this.tick++;
        this.emit('tick', this.tick);

        if (!this.setting.independent && this.master?.die) return this.room.remove(this);

        if (this.score > this.levelScore) {
            this.level++;
            this.levelScore = RoomConfig.levelScore(this.level);
            this.upgrades = this.allUpgrades.filter((upgrade) => upgrade.tier <= this.level);
            if (this.upgrades.length > 0) this.upgradeAdded = true;
        }

        if (this.health < this.maxHealth) {
            this.health += this.setting.skill.regen;

            if (this.tick - this.lastTickAttacked > 60 * 70) {
                this.health += 5;
            }
        }

        if (this.shield < this.maxShield) {
            this.shield += this.setting.skill.shieldRegen;

            if (this.tick - this.lastTickAttacked > 60 * 70) {
                this.shield += 5;
            }
        }

        const speed = this.setting.skill.speed;

        for (const controller of this.controllers) {
            if (controller.entity !== this) controller.entity = this;

            const think = controller.think();

            if (controller.acceptsFromTop) continue;

            if (think.target !== null) this.control.target = think.target;
            if (think.goal !== null) this.control.goal = think.goal;
            if (think.main !== null) this.control.main = think.main;
            if (think.alt !== null) this.control.alt = think.alt;
            if (think.fire !== null) this.control.fire = think.fire;
            this.control.angle = think.angle;
            if (think.power !== null) this.control.power = think.power;
        }

        if (this.control.main && this.control.target) {
            const target = this.control.target;

            this.angle = this.control.angle === undefined ? target.angle() : this.control.angle;

            this.vel.add(
                target
                    .clone()
                    .normalize()
                    .mult(speed * (this.control.power || 1)),
            );
        } else {
            if (this.move.size > 0) {
                for (const move of this.move) {
                    switch (move) {
                        case 0:
                            this.vel.add({x: 0, y: -speed});
                            break;

                        case 1:
                            this.vel.add({x: 0, y: speed});
                            break;

                        case 2:
                            this.vel.add({x: -speed, y: 0});
                            break;

                        case 3:
                            this.vel.add({x: speed, y: 0});
                            break;
                    }
                }
            } else if (this.moveAngle !== null) {
                this.vel.add(new Vector(1, 1).addAngle(this.moveAngle).normalize().mult(speed));
            }
        }

        if (this.vel.mag < 0.1) this.active = false;
        else this.active = true;

        this.pos.add(this.vel);
        this.vel.mult(this.setting.bullet ? 0.95 : 0.9);
        this.vel.add(this.acc);
        this.acc.mult(0);
    }

    public destroy(): void {
        this.emit('destroyed');

        this.master = undefined;

        this.controllers = [];
        this.props = [];
    }

    public static isSameTeam(entity: Entity, other: Entity) {
        return entity.team === other.team && ((entity.team2 === 0 && other.team2 === 0) || entity.team2 === other.team2);
    }

    public static isEntityVisible(entity: Entity, other: Entity): boolean {
        const distance = Vector.distance(entity.pos, other.pos);
        const fov = entity.setting.skill.fov;

        return distance <= fov;
    }
}
