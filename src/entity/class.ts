import {Color} from '../definitions/color';
import {Vector} from '../physics/vector';
import {Logger} from '../util/logger';
import type {Controller, ControllerMaker} from './controller';
import type {Entity, EntitySetting} from './entity';
import type {PropSetting} from './props';

export interface PropClassType {
    offset?: Vector;
    angle?: number;
    fixedAngle?: boolean;
    spin?: number;
    spin2?: number;
    color?: Color | string;
    border?: Color | string;
    size?: number;
    sides?: number | string | Vector[];
    strokeWidth?: number;
    alpha?: number;
    layer?: number;
}

export interface ClassType {
    parent?: string;
    showHealth?: boolean;
    showName?: boolean;
    showScore?: boolean;
    giveScore?: boolean;
    killMessage?: boolean | string;
    label?: string;
    hitType?: 'none' | 'auto' | ((body: Entity, other: Entity) => void);
    miniMapType?: 'none' | 'always' | 'team' | ((body: Entity, other: Entity) => boolean);
    score?: number;
    name?: null | string;
    size?: number;
    mass?: number;
    sides?: string | number | Vector[];
    isFixed?: boolean;
    airplane?: boolean;
    food?: boolean;
    bullet?: boolean;
    independent?: boolean;
    controllers?: ControllerMaker<new () => Controller>[];
    skill?: {
        speed?: number;
        health?: number;
        regen?: number;
        damage?: number;
        pen?: number;
        range?: number | null;
        pushability?: number;
        fov?: number;
        shield?: number;
        shieldRegen?: number;
    };
    color?: Color | string;
    border?: Color | string;
    strokeWidth?: number;
    alpha?: number;
    props?: PropClassType[];
    upgrades?: string[];
    tier?: number;
    on?: {[key: string]: (body: Entity, ...args: unknown[]) => unknown};
}

export interface ProcessedClass extends EntitySetting {
    tier: number;
    mockupId: number;
    color: Color | string;
    border: Color | string;
    strokeWidth: number;
    alpha: number;
    props: PropSetting[];
    upgrades: string[];
}

const defaultProp: PropSetting = {
    offset: new Vector(),
    angle: 0,
    fixedAngle: false,
    spin: 0,
    spin2: 0,
    color: Color.TeamColor,
    border: Color.AutoBorder,
    size: 5,
    sides: 0,
    strokeWidth: 4,
    alpha: 1,
    layer: 1,
};

const defaultEntity: ProcessedClass = {
    tier: 0,
    mockupId: 0,
    showHealth: true,
    showName: true,
    showScore: true,
    giveScore: true,
    killMessage: false,
    label: 'Entity',
    hitType: 'auto',
    miniMapType: 'none',
    score: 25000,
    name: null,
    size: 12,
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
        regen: 0.1,
        damage: 3,
        pen: 10,
        range: null,
        pushability: 1,
        fov: 800,
        shield: 20,
        shieldRegen: 0.05,
    },
    color: Color.TeamColor,
    border: Color.AutoBorder,
    strokeWidth: 4,
    alpha: 1,
    props: [],
    upgrades: [],
    on: {},
};

export const Class: {[key: string]: ClassType} = {};
export const EntityClass: {[key: string]: ProcessedClass} = {};

let Cache: {[key: string]: ProcessedClass} = {};

let mockups = 1;

function deepCopy<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(deepCopy) as any;
    }

    const result: any = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            result[key] = deepCopy(obj[key]);
        }
    }
    return result;
}

function ProcessClass(name: string, entityClass: ClassType, basic: ProcessedClass): ProcessedClass {
    if (Cache[name]) return Cache[name];

    let base: ProcessedClass;

    if (entityClass.parent) {
        const parent = Class[entityClass.parent];
        if (!parent) {
            throw new Error(`Parent class "${entityClass.parent}" not found for "${name}"`);
        }

        const parentProcessed = ProcessClass(entityClass.parent, parent, defaultEntity);
        base = deepCopy(parentProcessed);
    } else {
        base = deepCopy(basic);
    }

    let processed: ProcessedClass = Object.assign({}, base, entityClass);

    if (entityClass.skill) {
        processed.skill = Object.assign({}, base.skill, entityClass.skill);
    }

    if (entityClass.props) {
        processed.props = entityClass.props.map((prop) => Object.assign({}, defaultProp, prop));
    }

    processed.mockupId = mockups++;

    Cache[name] = processed;

    return processed;
}

export function ClassLoader() {
    Logger.info('Loading class...');

    Cache = {};

    const keys = Object.keys(Class);

    for (let i = 0; i < keys.length; i++) {
        EntityClass[keys[i]] = ProcessClass(keys[i], Class[keys[i]], defaultEntity);
        if (i % 10 === 0) Logger.info(`Class loaded ${i + 1}/${keys.length}`);
    }

    Logger.success('All classes loaded!');
}
