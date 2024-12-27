import {Entity} from '../entity/entity';
import {HSHG} from '../physics/hshg';
import {Vector} from '../physics/vector';
import {RoomConfig} from './room-config';
import {EventEmitter} from 'events';

const RESTITUTION = 0.9;
const DAMAGE_MULTIPLIER = 1;
const WALL_BOUNDARY_MULTIPLIER = 0.7;
const WALL_BOUNDARY_PADDING = 10;

export class World extends EventEmitter {
    protected readonly hshg = new HSHG();

    public entities = new Set<Entity>();
    public idToEntity = new Map<number, Entity>();
    public walls: Entity[] = [];
    public miniMap = new Set<Entity>();

    protected index = 0;
    public tick = 0;

    public socket = {
        send: (msg: Uint8Array) => {},
        sendMsg: (msg: string) => {},
    };

    public insert(entity: Entity): void {
        entity.id = this.index++;
        entity.room = this;

        this.entities.add(entity);
        this.hshg.addObject(entity);
        this.idToEntity.set(entity.id, entity);

        this.emit('insert', entity);
    }

    public remove(entity: Entity): void {
        this.entities.delete(entity);
        this.hshg.removeObject(entity);
        this.idToEntity.delete(entity.id);
        this.miniMap.delete(entity);

        entity.die = true;
        entity.emit('remove');

        this.emit('remove', entity);

        entity.destroy();
    }

    protected handleCollision(entity: Entity, other: Entity): void {
        if (entity.setting.on.collision) {
            entity.setting.on.collision(entity, other);
        }

        if (other.setting.on.collision) {
            other.setting.on.collision(other, entity);
        }

        if (entity.setting.hitType !== 'auto' || other.setting.hitType !== 'auto') {
            this.handleCustomHitTypes(entity, other);
            return;
        }

        if (entity.setting.isFixed || other.setting.isFixed) {
            this.handleFixedCollision(entity, other);
            return;
        }

        this.handleDynamicCollision(entity, other);
    }

    protected handleCustomHitTypes(entity: Entity, other: Entity): void {
        if (other.setting.hitType !== 'auto') {
            [entity, other] = [other, entity];
        }

        if (entity.setting.hitType === 'none' || other.setting.hitType === 'none') {
            return;
        }

        if (typeof entity.setting.hitType === 'function') {
            entity.setting.hitType(entity, other);
        }

        if (typeof other.setting.hitType === 'function') {
            other.setting.hitType(other, entity);
        }
    }

    protected handleFixedCollision(entity: Entity, other: Entity): void {
        if (other.setting.isFixed) {
            [entity, other] = [other, entity];
        }
        if (other.setting.isFixed || other.setting.airplane) return;

        const min = new Vector(entity.pos).sub(entity.size * WALL_BOUNDARY_MULTIPLIER + WALL_BOUNDARY_PADDING);
        const max = new Vector(entity.pos).add(entity.size * WALL_BOUNDARY_MULTIPLIER + WALL_BOUNDARY_PADDING);

        if (other.setting.bullet) {
            other.emit('dead');
            this.remove(other);
            return;
        }

        this.doDamage(entity, other, true);
        this.resolveWallCollision(other, entity.pos, min, max);
    }

    private resolveWallCollision(entity: Entity, wallPos: Vector, min: Vector, max: Vector): void {
        if (Math.abs(entity.pos.x - wallPos.x) < Math.abs(entity.pos.y - wallPos.y)) {
            entity.pos.y = entity.pos.y < wallPos.y ? min.y : max.y;
        } else {
            entity.pos.x = entity.pos.x < wallPos.x ? min.x : max.x;
        }
    }

    protected handleDynamicCollision(entity: Entity, other: Entity): void {
        if (entity.size + other.size < Vector.distance(entity.pos, other.pos)) {
            return;
        }

        this.doDamage(entity, other, false);

        if (entity.setting.airplane || other.setting.airplane) return;

        this.resolveElasticCollision(entity, other);
    }

    protected resolveElasticCollision(entity: Entity, other: Entity): void {
        const normal = Vector.sub(other.pos, entity.pos).normalize();
        const overlap = entity.size + other.size - Vector.distance(entity.pos, other.pos);

        const correction = normal.clone().mult(overlap / 2);
        other.pos.add(correction);
        entity.pos.sub(correction);

        const relativeVelocity = Vector.sub(other.vel, entity.vel);
        const velocityAlongNormal = relativeVelocity.dot(normal);

        if (velocityAlongNormal < 0) {
            const pushability = Math.min(entity.setting.skill.pushability, other.setting.skill.pushability);

            const j = (-(1 + pushability * RESTITUTION) * velocityAlongNormal) / (1 / entity.mass + 1 / other.mass);

            const impulse = normal.clone().mult(j);
            entity.vel.sub(impulse.clone().mult(1 / entity.mass));
            other.vel.add(impulse.clone().mult(1 / other.mass));
        }
    }

    protected giveScore(entity: Entity, other: Entity): void {
        if (!other.setting.giveScore) return;

        const score = other.setting.food ? other.score : Math.min(other.score, RoomConfig.maxGiveScore);

        entity.topMaster.score += score;

        if (other.setting.killMessage !== false) {
            const message = other.setting.killMessage === true ? `You killed ${other.title}.` : other.setting.killMessage;
            entity.topMaster.socket.sendMsg(message);
        }
    }

    protected doDamage(entity: Entity, other: Entity, god: boolean): void {
        if (Entity.isSameTeam(entity, other)) return;

        const damage = entity.setting.skill.damage * DAMAGE_MULTIPLIER;

        this.applyDamage(other, entity, damage);
        if (!god) {
            this.applyDamage(entity, other, damage);
        }
    }

    protected applyDamage(entity: Entity, other: Entity, damage: number): void {
        const remainingDamage = Math.max(0, damage - entity.shield);
        entity.shield = Math.max(0, entity.shield - damage);

        if (remainingDamage > 0) {
            entity.health -= remainingDamage;
        }

        entity.emit('damage', damage);
        entity.lastTickAttacked = entity.tick;

        if (entity.health <= 0) {
            entity.emit('dead', other);
            if (!entity.die) {
                this.giveScore(other, entity);
            }
            this.remove(entity);
        }
    }

    public update(): void {
        this.tick++;
        this.emit('tick');
        this.hshg.update();

        const pairs = this.hshg.queryForCollisionPairs();
        const length = pairs.length;

        for (let i = 0; i < length; i++) {
            const [objA, objB] = pairs[i];

            this.handleCollision(objA as Entity, objB as Entity);
        }

        for (const entity of this.entities) {
            entity.update();
            RoomConfig.physics(entity);

            if (entity.setting.miniMapType === 'none') {
                this.miniMap.delete(entity);
            } else {
                this.miniMap.add(entity);
            }
        }
    }
}
