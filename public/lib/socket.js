import {Color, numColor} from './color.js';
import {Reader, Writer} from './protocol.js';
import {Entity} from './entity.js';
import {RGBColor} from './rgb.js';
import {Team, TeamColor} from './team.js';
import {message} from './message.js';
import {Vector} from './vector.js';
import {interpolate, reconcile} from './interpolate.js';

// DEBUG
let totalDataSize = 0;
let dataCount = 0;
let lastUpdate = performance.now();
export let avgDataSize = 0;
export let dataRate = 0;
// END

export let entity;
export const entities = new Set();
export const idToEntity = new Map();
export let world = {};
let mockups = [];

export let minimap = [];
export let leaderboard = [];

export let name = '';

export let socket;

let uuid = localStorage.getItem('uuid');

const decodeColor = (msg, team) => {
    let color;

    if (msg.readUint() === 0) {
        color = msg.readString();
    } else {
        color = numColor[msg.readUint()];
    }

    if (color === 'TeamColor') color = TeamColor[Team[team]];

    if (color === 'FFA') color = team === entity.team ? Color.Blue : Color.Green;

    return color;
};

const decodeBorder = (msg, team, color) => {
    let border;

    if (msg.readUint() === 0) {
        border = msg.readString();
    } else {
        border = numColor[msg.readUint()];
    }

    if (border === 'TeamColor') border = TeamColor[Team[team]];
    else if (border === 'AutoBorder') border = RGBColor.fromHex(color).mix(RGBColor.fromHex(Color.Black), 0.7).hex;

    if (color === 'FFA') color = team === entity.team ? Color.Blue : Color.Green;

    return border;
};

const decodeSides = (msg) => {
    let sides;

    const type = msg.readUint();
    if (type === 0) {
        sides = msg.readString();
    } else if (type === 1) {
        sides = msg.readInt();
    } else {
        const length = type - 2;

        sides = new Array(length);

        for (let i = 0; i < length; i++) {
            sides[i] = [msg.readFloat(), msg.readFloat()];
        }
    }

    return sides;
};

const socketOnMessage = async ({data}) => {
    if (typeof data === 'string') throw new Error(data);

    const buffer = data;

    const msg = new Reader(buffer);
    totalDataSize += buffer.byteLength;
    dataCount++;

    const currentTime = performance.now();

    if (currentTime - lastUpdate >= 1000) {
        avgDataSize = totalDataSize / dataCount;
        dataRate = totalDataSize / ((currentTime - lastUpdate) / 1000);

        totalDataSize = 0;
        dataCount = 0;
        lastUpdate = currentTime;
    }

    const msgType = msg.readUint();

    switch (msgType) {
        case 0:
            socket.close();

            uuid = msg.readString();

            localStorage.setItem('uuid', uuid);

            socket = new WebSocket('/?uuid=' + uuid);
            socket.binaryType = 'arraybuffer';

            socket.onmessage = socketOnMessage;

            socket.onopen = () => {
                socket.send(new Writer().writeUint(0).writeString(name).make());
            };

            break;

        case 1:
            let isNew = true;

            if (!entity) entity = new Entity();
            else isNew = false;

            entity.id = msg.readBigUint();
            entity.health = msg.readFloat();
            entity.shield = msg.readFloat();
            entity.angle = msg.readFloat();

            if (entity.maxHealth && entity.health > entity.maxHealth) {
                entity.maxHealth = entity.health;
            }

            if (isNew) {
                entity.pos.x = msg.readFloat();
                entity.pos.y = msg.readFloat();
            } else {
                entity.serverPos.x = msg.readFloat();
                entity.serverPos.y = msg.readFloat();
            }

            entity.score = msg.readBigUint();
            entity.size = msg.readFloat();
            entity.attackTime = msg.readBigUint();

            idToEntity.set(entity.id, entity);

            entities.add(entity);

            entity.canSee = true;

            if (isNew) {
                socket.send(new Writer().writeUint(2).writeBigUint(entity.id).make());
            }
            break;

        case 2: {
            let entity;
            let isNew = false;

            const id = msg.readBigUint();
            if (idToEntity.has(id)) entity = idToEntity.get(id);
            else {
                entity = new Entity();
                isNew = true;
            }

            entity.id = id;
            entity.health = msg.readFloat();
            entity.shield = msg.readFloat();
            entity.angle = msg.readFloat();

            if (entity.maxHealth && entity.health > entity.maxHealth) {
                entity.maxHealth = entity.health;
            }

            entity.pos.x = msg.readFloat();
            entity.pos.y = msg.readFloat();

            entity.score = msg.readBigUint();
            entity.size = msg.readFloat();
            entity.attackTime = msg.readBigUint();

            entity.canSee = true;

            idToEntity.set(id, entity);
            entities.add(entity);

            if (isNew) {
                socket.send(new Writer().writeUint(2).writeBigUint(id).make());
            }
            break;
        }

        case 3: {
            const id = msg.readBigUint();
            const entity = idToEntity.get(id);

            if (entity) {
                entity.fadeStart = performance.now();
            }
            break;
        }

        case 4: {
            world.width = msg.readFloat();
            world.height = msg.readFloat();
            world.tick = msg.readFloat();
            break;
        }

        case 5: {
            const id = msg.readBigUint();
            const obj = idToEntity.has(id) ? idToEntity.get(id) : entity;

            if (!obj) break;

            obj.team = msg.readUint();

            obj.maxHealth = msg.readFloat();
            obj.maxShield = msg.readFloat();

            obj.showHealth = msg.readBoolean();
            obj.showName = msg.readBoolean();
            obj.showScore = msg.readBoolean();

            obj.fov = msg.readFloat();

            obj.name = msg.readString();

            obj.color = decodeColor(msg, obj.team);
            obj.border = decodeBorder(msg, obj.team, obj.color);

            obj.mockupId = msg.readUint();

            let mockup;
            if ((mockup = mockups[obj.mockupId])) {
                obj.sides = mockup.sides;
                obj.props = mockup.props;
                obj.alpha = mockup.alpha;
                obj.strokeWidth = mockup.strokeWidth;
                obj.isLoaded = true;
            } else {
                socket.send(new Writer().writeUint(6).writeBigUint(obj.id).make());
            }

            break;
        }

        case 6: {
            entity.score = msg.readBigUint();
            entity.level = msg.readUint();
            entity.levelScore = msg.readBigUint();

            break;
        }

        case 7: {
            message.add(msg.readString());

            break;
        }

        case 8: {
            const id = msg.readBigUint();
            const obj = idToEntity.has(id) ? idToEntity.get(id) : entity;

            if (!obj) break;

            obj.label = msg.readString();

            obj.alpha = msg.readFloat();
            obj.strokeWidth = msg.readFloat();

            obj.sides = decodeSides(msg);

            const propLength = msg.readUint();

            obj.props = new Array(propLength);

            for (let i = 0; i < propLength; i++) {
                let color;
                obj.props[i] = {
                    _offset: new Vector(msg.readFloat(), msg.readFloat()),
                    angle: msg.readFloat(),
                    fixedAngle: msg.readBoolean(),
                    spin: msg.readFloat(),
                    spin2: msg.readFloat(),
                    color: (color = decodeColor(msg, obj.team)),
                    border: decodeBorder(msg, obj.team, color),
                    size: msg.readFloat(),
                    sides: decodeSides(msg),
                    strokeWidth: msg.readFloat(),
                    alpha: msg.readFloat(),
                    layer: msg.readInt(),
                };
            }

            obj.props.sort((a, b) => a - b);

            if (obj.mockupId !== 0)
                mockups[obj.mockupId] = JSON.parse(
                    JSON.stringify({
                        sides: obj.sides,
                        alpha: obj.alpha,
                        strokeWidth: obj.strokeWidth,
                        props: obj.props,
                    }),
                );

            obj.isLoaded = true;

            break;
        }

        case 9: {
            const length = msg.readUint();
            entity.upgrades = new Array(length);
            for (let i = 0; i < length; i++) {
                const upgrade = {};

                upgrade.label = msg.readString();

                upgrade.color = decodeColor(msg, entity.team);
                upgrade.border = decodeBorder(msg, entity.team, entity.color);

                upgrade.alpha = msg.readFloat();
                upgrade.strokeWidth = msg.readFloat();

                const type = msg.readUint();
                if (type === 0) {
                    upgrade.sides = msg.readString();
                } else if (type === 1) {
                    upgrade.sides = msg.readInt();
                } else {
                    const length = type - 2;

                    upgrade.sides = new Array(length);

                    for (let i = 0; i < length; i++) {
                        upgrade.sides[i] = [msg.readFloat(), msg.readFloat()];
                    }
                }

                const propLength = msg.readUint();

                upgrade.props = new Array(propLength);

                for (let i = 0; i < propLength; i++) {
                    let color;
                    upgrade.props[i] = {
                        _offset: new Vector(msg.readFloat(), msg.readFloat()),
                        angle: msg.readFloat(),
                        fixedAngle: msg.readBoolean(),
                        spin: msg.readFloat(),
                        spin2: msg.readFloat(),
                        color: (color = decodeColor(msg, entity.team)),
                        border: decodeBorder(msg, entity.team, color),
                        size: Math.min(30, msg.readFloat()),
                        sides: decodeSides(msg),
                        strokeWidth: msg.readFloat(),
                        alpha: msg.readFloat(),
                        layer: msg.readInt(),
                    };
                }

                entity.upgrades[i] = upgrade;
            }

            break;
        }

        case 10: {
            minimap = [];

            const length = msg.readUint();

            for (let i = 0; i < length; i++) {
                let team;
                let map = {
                    pos: new Vector(msg.readFloat(), msg.readFloat()),
                    team: (team = msg.readUint()),
                    color: decodeColor(msg, team),
                };

                if (msg.readBoolean()) {
                    map.size = msg.readFloat();
                    map.sides = msg.readInt();
                }

                minimap.push(map);
            }

            break;
        }

        case 11: {
            leaderboard = [];

            const length = msg.readUint();

            for (let i = 0; i < length; i++) {
                leaderboard.push({
                    title: msg.readString(),
                    score: msg.readBigUint(),
                });
            }

            break;
        }

        case 12: {
            entity.skillPoints = msg.readUint();
            const skillCount = msg.readUint();
            entity.skills = new Array(skillCount);

            for (let i = 0; i < skillCount; i++) {
                entity.skills[i] = {
                    type: msg.readUint(),
                    level: msg.readUint(),
                    maxLevel: msg.readUint(),
                    name: msg.readString(),
                };
            }
            break;
        }

        default:
            console.error('Unknown message: ' + msgType);
    }
};

export function start(_name) {
    name = _name;
    socket = new WebSocket('/?uuid=' + (uuid || '0'));
    socket.binaryType = 'arraybuffer';
    socket.onmessage = socketOnMessage;
    socket.onopen = () => {
        setTimeout(() => socket.send(new Writer().writeUint(0).writeString(name).make()), 100);
    };
}
