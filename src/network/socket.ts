import {randomUUID} from 'crypto';
import {Protocol} from './protocol';
import {Entity} from '../entity/entity';
import {RoomConfig} from '../room/room-config';
import {room} from '../room/room';
import {Logger} from '../util/logger';
import {EntityClass} from '../entity/class';
import {Vector} from '../physics/vector';
import {setInterval} from 'timers';
import {Color} from '../definitions/color';
import {PropSetting} from '../entity/props';

const users = new Map<
    string,
    {
        body?: Entity;
        timeout?: number;
        send: (msg: Uint8Array | string) => void;
    }
>();

export function message(uuid: string, data: Uint8Array, send: (msg: Uint8Array | string) => void) {
    try {
        if (uuid === '0') {
            uuid = randomUUID();

            send(new Protocol.Writer().writeUint(0).writeString(uuid).make());

            return;
        }

        const msg = new Protocol.Reader(data);

        switch (msg.readUint()) {
            // Spawn request
            case 0: {
                let entity: Entity;
                if (users.has(uuid) && !(entity = users.get(uuid).body).die) {
                    users.get(uuid).timeout = 0;
                } else {
                    entity = room.spawn(msg.readString());

                    if (!entity) {
                        send("You can't spawn.");

                        return;
                    }

                    room.insert(entity);
                }

                entity.socket = {
                    send,
                    sendMsg(str: string) {
                        const msg = new Protocol.Writer();

                        msg.writeUint(7);
                        msg.writeString(str);

                        send(msg.make());
                    },
                };

                users.set(uuid, {
                    body: entity,
                    send,
                });

                setTimeout(() => {
                    const msg = new Protocol.Writer();

                    msg.writeUint(4);
                    msg.writeFloat(RoomConfig.width);
                    msg.writeFloat(RoomConfig.height);
                    msg.writeFloat(RoomConfig.tick);

                    send(msg.make());
                }, 10);

                setTimeout(() => {
                    for (const obj of room.entities) {
                        if (obj === entity) continue;

                        const msg = new Protocol.Writer();

                        msg.writeUint(2);
                        EntityData(obj, msg, true);

                        send(msg.make());
                    }

                    const msg = new Protocol.Writer();

                    msg.writeUint(9);

                    EntityUpgrade(entity, msg);

                    send(msg.make());
                }, 10);

                entity.socket.sendMsg(RoomConfig.welcomeMessage);

                Logger.info('User spawned. name: ' + entity.name);

                break;
            }

            // Move
            case 1: {
                if (!users.has(uuid)) break;

                const user = users.get(uuid);

                if (!user.body) break;

                const move = msg.readUint();

                switch (move) {
                    case 0:
                        user.body.move.add(0);
                        break;

                    case 1:
                        user.body.move.add(1);
                        break;

                    case 2:
                        user.body.move.add(2);
                        break;

                    case 3:
                        user.body.move.add(3);
                        break;

                    case 4:
                        user.body.move.delete(0);
                        break;

                    case 5:
                        user.body.move.delete(1);
                        break;

                    case 6:
                        user.body.move.delete(2);
                        break;

                    case 7:
                        user.body.move.delete(3);
                        break;
                }

                break;
            }

            // Want info!
            case 2: {
                const id = msg.readBigUint();

                const entity = room.idToEntity.get(id);

                if (entity) send(EntityInfo(entity, new Protocol.Writer().writeUint(5)).make());
                break;
            }

            // Angle
            case 3: {
                if (!users.has(uuid)) break;

                const user = users.get(uuid);

                if (!user.body) break;

                user.body.angle = msg.readFloat();
                break;
            }

            // Target
            case 4: {
                if (!users.has(uuid)) break;

                const user = users.get(uuid);

                if (!user.body) break;

                if (msg.readBoolean()) user.body.control.fire = msg.readBoolean();
                else user.body.control.alt = msg.readBoolean();

                break;
            }

            // Angle move
            case 5: {
                if (!users.has(uuid)) break;

                const user = users.get(uuid);

                if (!user.body) break;

                user.body.moveAngle = msg.readBoolean() ? msg.readFloat() : null;
                break;
            }

            // mockup
            case 6: {
                const id = msg.readBigUint();

                const entity = room.idToEntity.get(id);

                if (entity) send(EntityMockup(entity, new Protocol.Writer().writeUint(8)).make());
                break;
            }

            // Upgrade
            case 7: {
                if (!users.has(uuid)) break;

                const user = users.get(uuid);

                if (!user.body) break;

                const index = msg.readUint();

                if (!user.body.upgrades[index]) break;

                user.body.init(user.body.upgrades[index]);

                if (user.body.setting.on.upgrade) user.body.setting.on.upgrade(user.body);

                user.body.socket.sendMsg('You have upgraded to ' + user.body.setting.label + '.');

                break;
            }

            default:
                send("I can't understand :(");
                break;
        }
    } catch (err) {
        Logger.error(err);
    }
}

export function isValidUUID(uuid: string) {
    return true;
}

export function close(uuid: string) {
    if (users.has(uuid)) users.get(uuid).timeout = performance.now();
}

function EntityInfo(entity: Entity, msg: Protocol.Writer) {
    msg.writeBigUint(entity.id);

    msg.writeUint(entity.team);

    msg.writeFloat(entity.setting.skill.health);
    msg.writeFloat(entity.setting.skill.shield);

    msg.writeBoolean(entity.setting.showHealth);
    msg.writeBoolean(entity.setting.showName);
    msg.writeBoolean(entity.setting.showScore);
    msg.writeFloat(entity.setting.skill.fov);
    msg.writeString(entity.name);

    if (typeof entity.color === 'string') {
        msg.writeUint(0);
        msg.writeString(entity.color);
    } else {
        msg.writeUint(1);
        msg.writeUint(entity.color);
    }

    if (typeof entity.border === 'string') {
        msg.writeUint(0);
        msg.writeString(entity.border);
    } else {
        msg.writeUint(1);
        msg.writeUint(entity.border);
    }

    msg.writeUint(entity.mockupId);

    return msg;
}

function Mockup(alpha: number, strokeWidth: number, sides: string | number | Vector[], props: PropSetting[], msg: Protocol.Writer) {
    msg.writeFloat(alpha);
    msg.writeFloat(strokeWidth);
    if (typeof sides === 'string') {
        msg.writeUint(0);
        msg.writeString(sides);
    } else if (typeof sides === 'object') {
        msg.writeUint(2 + sides.length);
        for (let i = 0; i < sides.length; i++) {
            msg.writeFloat(sides[i].x);
            msg.writeFloat(sides[i].y);
        }
    } else {
        msg.writeUint(1);
        msg.writeInt(sides);
    }

    msg.writeUint(props.length);

    for (const prop of props) {
        msg.writeFloat(prop.offset.x);
        msg.writeFloat(prop.offset.y);
        msg.writeFloat(prop.angle);
        msg.writeBoolean(prop.fixedAngle);
        msg.writeFloat(prop.spin);
        msg.writeFloat(prop.spin2);
        if (typeof prop.color === 'string') {
            msg.writeUint(0);
            msg.writeString(prop.color);
        } else {
            msg.writeUint(1);
            msg.writeUint(prop.color);
        }
        if (typeof prop.border === 'string') {
            msg.writeUint(0);
            msg.writeString(prop.border);
        } else {
            msg.writeUint(1);
            msg.writeUint(prop.border);
        }
        msg.writeFloat(prop.size);
        if (typeof prop.sides === 'string') {
            msg.writeUint(0);
            msg.writeString(prop.sides);
        } else if (typeof prop.sides === 'object') {
            msg.writeUint(2 + prop.sides.length);
            for (let i = 0; i < prop.sides.length; i++) {
                msg.writeFloat(prop.sides[i].x);
                msg.writeFloat(prop.sides[i].y);
            }
        } else {
            msg.writeUint(1);
            msg.writeInt(prop.sides);
        }
        msg.writeFloat(prop.strokeWidth);
        msg.writeFloat(prop.alpha);
        msg.writeInt(prop.layer);
    }

    return msg;
}

function EntityMockup(entity: Entity, msg: Protocol.Writer) {
    msg.writeBigUint(entity.id);

    msg.writeString(entity.setting.label);

    const propLength = entity.props.length;
    const props = new Array(propLength);
    for (let i = 0; i < propLength; i++) {
        props[i] = entity.props[i].setting;
    }

    Mockup(entity.alpha, entity.strokeWidth, entity.setting.sides, props, msg);

    return msg;
}

function EntityData(entity: Entity, msg: Protocol.Writer, active: boolean = false) {
    msg.writeBigUint(entity.id);
    msg.writeFloat(entity.health);
    msg.writeFloat(entity.shield);
    msg.writeFloat(entity.angle);
    msg.writeFloat(entity.pos.x);
    msg.writeFloat(entity.pos.y);

    msg.writeBigUint(entity.score);
    msg.writeFloat(entity.size);
    msg.writeBigUint(Math.max(0, entity.tick - entity.lastTickAttacked));

    return msg;
}

function EntityUpgrade(entity: Entity, msg: Protocol.Writer) {
    msg.writeUint(entity.upgrades.length);
    for (const upgrade of entity.upgrades) {
        msg.writeString(upgrade.label);

        if (typeof upgrade.color === 'string') {
            msg.writeUint(0);
            msg.writeString(upgrade.color);
        } else {
            msg.writeUint(1);
            msg.writeUint(upgrade.color);
        }

        if (typeof upgrade.border === 'string') {
            msg.writeUint(0);
            msg.writeString(upgrade.border);
        } else {
            msg.writeUint(1);
            msg.writeUint(upgrade.border);
        }

        Mockup(upgrade.alpha, upgrade.strokeWidth, upgrade.sides, upgrade.props, msg);
    }

    return msg;
}

setInterval(() => {
    const changed = new Set<Entity>();
    for (const user of users) {
        const entity = user[1].body;

        if (user[1].timeout && user[1].timeout > RoomConfig.socketTimeout) {
            room.remove(entity);
            users.delete(user[0]);

            continue;
        }

        const msg = new Protocol.Writer();

        msg.writeUint(1);
        EntityData(entity, msg);

        user[1].send(msg.make());

        if (entity.upgradeAdded) {
            msg.reset();

            msg.writeUint(9);

            EntityUpgrade(entity, msg);

            user[1].send(msg.make());

            entity.upgradeAdded = false;
        }

        if (entity.changed) {
            msg.reset();

            msg.writeUint(5);
            EntityInfo(entity, msg);

            user[1].send(msg.make());
            changed.add(entity);
        }

        if (entity.tick % 20 === 0) {
            msg.reset();

            msg.writeUint(6);
            msg.writeBigUint(entity.score);
            msg.writeUint(entity.level);
            msg.writeBigUint(entity.levelScore);

            user[1].send(msg.make());
        }

        if (entity.tick % 10 === 0) {
            msg.reset();

            msg.writeUint(10);

            const entities: Entity[] = [];

            for (const map of room.miniMap) {
                if (map.setting.miniMapType === 'none') continue;
                if (map.setting.miniMapType === 'team' && !Entity.isSameTeam(map, entity)) continue;
                if (typeof map.setting.miniMapType === 'function' && !map.setting.miniMapType(map, entity)) continue;

                entities.push(map);
            }

            msg.writeUint(entities.length);

            for (let i = 0; i < entities.length; i++) {
                const map = entities[i];

                msg.writeFloat(map.pos.x);
                msg.writeFloat(map.pos.y);
                msg.writeUint(map.team);
                if (map === entity) {
                    msg.writeUint(1);
                    msg.writeUint(Color.Black);
                } else if (typeof map.color === 'string') {
                    msg.writeUint(0);
                    msg.writeString(map.color);
                } else {
                    msg.writeUint(1);
                    msg.writeUint(map.color);
                }

                if (map.setting.isFixed) {
                    msg.writeBoolean(true);
                    msg.writeFloat(map.size);
                    if (typeof map.setting.sides === 'number') {
                        msg.writeInt(map.setting.sides);
                    } else msg.writeInt(0);
                } else msg.writeBoolean(false);
            }

            user[1].send(msg.make());
        }

        for (const obj of room.entities) {
            if (obj === entity) continue;

            if (!Entity.isEntityVisible(entity, obj)) continue;

            msg.reset();

            msg.writeUint(2);
            EntityData(obj, msg);

            user[1].send(msg.make());

            if (obj.changed) {
                msg.reset();

                msg.writeUint(5);
                EntityInfo(obj, msg);

                user[1].send(msg.make());
                changed.add(obj);
            }
        }
    }

    for (const entity of changed) {
        entity.changed = false;
    }
}, 1000 / 60);

setInterval(() => {
    for (const user of users) {
        const msg = new Protocol.Writer();

        msg.writeUint(11);

        msg.writeUint(room.leaderboard.scores.size);

        for (const [, {title, score}] of room.leaderboard.scores) {
            msg.writeString(title);
            msg.writeBigUint(score);
        }

        user[1].send(msg.make());
    }
}, 1000);

room.on('remove', (obj: Entity) => {
    for (const user of users) {
        const msg = new Protocol.Writer();

        msg.writeUint(3);
        msg.writeBigUint(obj.id);

        user[1].send(msg.make());
    }
});

room.socket = {
    send(msg: Uint8Array) {
        for (const user of users) user[1].send(msg);
    },
    sendMsg(msg: string) {
        for (const user of users) user[1].body.socket.sendMsg(msg);
    },
};
