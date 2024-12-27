import {Color, numColor} from './color';
import {Entity, Mockup, Obj} from './entity';
import {Protocol} from './protocol';
import {RGBColor} from './rgb';
import {message} from './state/message';
import {Team, TeamColor} from './team';
import {Vector} from './vector';

export interface Minimap {
    pos: Vector;
    team: number;
    color: string;
    size?: number;
    sides?: number;
}

function lerp(start: number, end: number) {
    return start + (end - start) * 0.8;
}

export class Socket {
    private totalDataSize = 0;
    private dataCount = 0;
    private lastUpdate = performance.now();

    private mockups: Mockup[] = [];

    public avgDataSize = 0;
    public dataRate = 0;

    public entity?: Entity;
    public entities = new Set<Entity>();
    public idToEntity = new Map<number, Entity>();
    public world: {
        width: number;
        height: number;
        tick: number;
    } = {
        width: 1000,
        height: 1000,
        tick: 60,
    };

    public minimap: Minimap[] = [];
    public leaderboard: {title: string; score: number}[] = [];

    public name = '';

    private decodeColor(msg: Protocol.Reader, team: number) {
        let color;

        if (msg.readUint() === 0) {
            color = msg.readString();
        } else {
            color = numColor[msg.readUint()];
        }

        if (color === 'TeamColor') color = TeamColor[Team[team]];

        if (color === 'FFA') color = team === this.entity!.team ? Color.Blue : Color.Green;

        return color;
    }

    private decodeBorder(msg: Protocol.Reader, team: number, color: string) {
        let border;

        if (msg.readUint() === 0) {
            border = msg.readString();
        } else {
            border = numColor[msg.readUint()];
        }

        if (border === 'TeamColor') border = TeamColor[Team[team]];
        else if (border === 'AutoBorder') border = RGBColor.fromHex(color).mix(RGBColor.fromHex(Color.Black), 0.7).hex;

        if (color === 'FFA') color = team === this.entity!.team ? Color.Blue : Color.Green;

        return border;
    }

    private decodeSides(msg: Protocol.Reader) {
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
    }

    public async onMessage(socket: WebSocket, buffer: ArrayBuffer) {
        const msg = new Protocol.Reader(buffer);

        this.totalDataSize += buffer.byteLength;
        this.dataCount++;

        const currentTime = performance.now();

        if (currentTime - this.lastUpdate >= 1000) {
            this.avgDataSize = this.totalDataSize / this.dataCount;
            this.dataRate = this.totalDataSize / ((currentTime - this.lastUpdate) / 1000);

            this.totalDataSize = 0;
            this.dataCount = 0;
            this.lastUpdate = currentTime;
        }

        const msgType = msg.readUint();

        switch (msgType) {
            case 0:
                return false;

            case 1:
                let isNew = true;

                if (!this.entity) this.entity = new Entity();
                else isNew = false;

                this.entity.id = msg.readBigUint();
                this.entity.health = msg.readFloat();
                this.entity.shield = msg.readFloat();
                this.entity.angle = msg.readFloat();

                if (this.entity.maxHealth && this.entity.health > this.entity.maxHealth) {
                    this.entity.maxHealth = this.entity.health;
                }

                if (isNew) {
                    this.entity.pos.x = msg.readFloat();
                    this.entity.pos.y = msg.readFloat();
                } else {
                    this.entity.serverPos.x = msg.readFloat();
                    this.entity.serverPos.y = msg.readFloat();
                    this.entity.pos.x = lerp(this.entity.pos.x, this.entity.serverPos.x);
                    this.entity.pos.y = lerp(this.entity.pos.y, this.entity.serverPos.y);
                }

                this.entity.score = msg.readBigUint();
                this.entity.size = msg.readFloat();
                this.entity.attackTime = msg.readBigUint();

                this.idToEntity.set(this.entity.id, this.entity);

                this.entities.add(this.entity);

                this.entity.canSee = true;
                this.entity.iamMAIN = true;

                if (isNew) {
                    socket.send(new Protocol.Writer().writeUint(2).writeBigUint(this.entity.id).make());
                }
                break;

            case 2: {
                let entity: Entity;
                let isNew = false;

                const id = msg.readBigUint();
                if (this.idToEntity.has(id)) entity = this.idToEntity.get(id)!;
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

                if (isNew || !entity.canSee) {
                    entity.pos.x = msg.readFloat();
                    entity.pos.y = msg.readFloat();
                } else {
                    entity.serverPos.x = msg.readFloat();
                    entity.serverPos.y = msg.readFloat();
                    entity.pos.x = lerp(entity.pos.x, entity.serverPos.x);
                    entity.pos.y = lerp(entity.pos.y, entity.serverPos.y);
                }

                entity.score = msg.readBigUint();
                entity.size = msg.readFloat();
                entity.attackTime = msg.readBigUint();

                entity.canSee = true;

                this.idToEntity.set(id, entity);
                this.entities.add(entity);

                if (isNew) {
                    socket.send(new Protocol.Writer().writeUint(2).writeBigUint(id).make());
                }
                break;
            }

            case 3: {
                const id = msg.readBigUint();
                const entity = this.idToEntity.get(id);

                if (entity) {
                    entity.fadeStart = performance.now();
                }
                break;
            }

            case 4: {
                this.world.width = msg.readFloat();
                this.world.height = msg.readFloat();
                this.world.tick = msg.readFloat();
                break;
            }

            case 5: {
                const id = msg.readBigUint();
                const obj = this.idToEntity.has(id) ? this.idToEntity.get(id) : this.entity;

                if (!obj) break;

                obj.team = msg.readUint();

                obj.maxHealth = msg.readFloat();
                obj.maxShield = msg.readFloat();

                obj.showHealth = msg.readBoolean();
                obj.showName = msg.readBoolean();
                obj.showScore = msg.readBoolean();

                obj.fov = msg.readFloat();

                obj.name = msg.readString();

                obj.color = this.decodeColor(msg, obj.team);
                obj.border = this.decodeBorder(msg, obj.team, obj.color);

                obj.mockupId = msg.readUint();

                let mockup;
                if ((mockup = this.mockups[obj.mockupId] ? JSON.parse(JSON.stringify(this.mockups[obj.mockupId])) : false)) {
                    obj.sides = mockup.sides;
                    obj.props = mockup.props;
                    obj.alpha = mockup.alpha;
                    obj.strokeWidth = mockup.strokeWidth;
                    obj.isLoaded = true;
                } else {
                    socket.send(new Protocol.Writer().writeUint(6).writeBigUint(obj.id).make());
                }

                break;
            }

            case 6: {
                this.entity!.score = msg.readBigUint();
                this.entity!.level = msg.readUint();
                this.entity!.levelScore = msg.readBigUint();

                break;
            }

            case 7: {
                message.add(msg.readString());

                break;
            }

            case 8: {
                const id = msg.readBigUint();
                const obj = this.idToEntity.has(id) ? this.idToEntity.get(id) : this.entity;

                if (!obj) break;

                obj.label = msg.readString();

                obj.alpha = msg.readFloat();
                obj.strokeWidth = msg.readFloat();

                obj.sides = this.decodeSides(msg);

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
                        color: (color = this.decodeColor(msg, obj.team)),
                        border: this.decodeBorder(msg, obj.team, color),
                        size: msg.readFloat(),
                        sides: this.decodeSides(msg),
                        strokeWidth: msg.readFloat(),
                        alpha: msg.readFloat(),
                        layer: msg.readInt(),
                    };
                }

                obj.props.sort((a, b) => a.layer - b.layer);

                if (obj.mockupId !== 0)
                    this.mockups[obj.mockupId] = JSON.parse(
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
                this.entity!.upgrades = new Array(length);
                for (let i = 0; i < length; i++) {
                    const upgrade: Obj = {
                        label: msg.readString(),
                        color: this.decodeColor(msg, this.entity!.team),
                        border: this.decodeBorder(msg, this.entity!.team, this.entity!.color),
                        alpha: msg.readFloat(),
                        strokeWidth: msg.readFloat(),
                        sides: 0,
                        angle: 0,
                        size: 10,
                        props: [],
                    };

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
                            color: (color = this.decodeColor(msg, this.entity!.team)),
                            border: this.decodeBorder(msg, this.entity!.team, color),
                            size: Math.min(30, msg.readFloat()),
                            sides: this.decodeSides(msg),
                            strokeWidth: msg.readFloat(),
                            alpha: msg.readFloat(),
                            layer: msg.readInt(),
                        };
                    }

                    this.entity!.upgrades[i] = upgrade;
                }

                break;
            }

            case 10: {
                this.minimap = [];

                const length = msg.readUint();

                for (let i = 0; i < length; i++) {
                    let team;
                    let map: Minimap = {
                        pos: new Vector(msg.readFloat(), msg.readFloat()),
                        team: (team = msg.readUint()),
                        color: this.decodeColor(msg, team),
                    };

                    if (msg.readBoolean()) {
                        map.size = msg.readFloat();
                        map.sides = msg.readInt();
                    }

                    this.minimap.push(map);
                }

                break;
            }

            case 11: {
                this.leaderboard = [];

                const length = msg.readUint();

                for (let i = 0; i < length; i++) {
                    this.leaderboard.push({
                        title: msg.readString(),
                        score: msg.readBigUint(),
                    });
                }

                break;
            }

            default:
                throw new Error('Unknown message: ' + msgType);
        }

        return true;
    }

    public removeEntity(entity: Entity) {
        this.entities.delete(entity);
        this.idToEntity.delete(entity.id);
    }

    public sendUpgrade(socket: WebSocket, upgrade: number) {
        socket.send(new Protocol.Writer().writeUint(7).writeUint(upgrade).make());
    }

    public sendAngle(socket: WebSocket, angle: number) {
        socket.send(new Protocol.Writer().writeUint(3).writeFloat(angle).make());
    }

    public sendFire(socket: WebSocket, isMain: boolean, isOn: boolean) {
        socket.send(new Protocol.Writer().writeUint(4).writeBoolean(isMain).writeBoolean(isOn).make());
    }
}
