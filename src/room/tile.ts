import {Vector, VectorLike} from '@/physics/vector';
import {RoomLoop} from './room-loop';
import {Entity} from '@/entity/entity';
import {randomFood, RandomPosGenerator} from '@/util/random';
import {Team} from '@/definitions/team';

export interface TileSetting {
    init?: (tile: Tile) => void;
    tick?: (tile: Tile) => void;
    spawn?: {
        type: string;
        weight: number;
    }[];
    afterSpawn?: (tile: Tile, entity: Entity) => void;

    spawnTimes?: number;
    spawnInterval?: number;
}

export class Tile {
    protected randomPosGenerator = new RandomPosGenerator();

    public room!: RoomLoop;

    public pos: Vector = new Vector();
    public size: number = 0;
    public min: VectorLike = {x: 0, y: 0};
    public max: VectorLike = {x: 0, y: 0};

    public setting: TileSetting;

    public entities: Set<Entity> = new Set();
    public entitySize: number = 0;

    constructor(setting: TileSetting) {
        this.setting = setting;
    }

    public init(room: RoomLoop, min: VectorLike, max: VectorLike) {
        this.room = room;

        this.min = min;
        this.max = max;
        this.pos = Vector.sub(max, min).mult(0.5).add(min);
        this.size = this.max.x - this.min.x;

        if (this.setting.init) this.setting.init(this);

        if (this.setting.spawn?.length > 0) {
            setInterval(() => {
                if (!this.setting.spawnTimes || this.entitySize < this.setting.spawnTimes) {
                    const entity = new Entity();

                    entity.init(randomFood(this.setting.spawn));

                    const {x, y} = this.randomPosGenerator.getRandomPos(this.min, this.max);

                    entity.pos.x = x;
                    entity.pos.y = y;

                    entity.team = Team.Room;

                    if (this.setting.afterSpawn) this.setting.afterSpawn(this, entity);

                    this.room.insert(entity);
                    this.entities.add(entity);

                    this.entitySize++;

                    entity.on('remove', () => {
                        this.entitySize--;
                        this.entities.delete(entity);
                    });
                }
            }, this.setting.spawnInterval || 500);
        }

        return this;
    }

    public update() {
        if (this.setting.tick) this.setting.tick(this);
    }
}

export class TileMaker {
    public setting: TileSetting;

    public tiles: Tile[] = [];

    constructor(setting: TileSetting) {
        this.setting = setting;
    }

    public init(room: RoomLoop, min: VectorLike, max: VectorLike) {
        const tile = new Tile(this.setting).init(room, min, max);

        this.tiles.push(tile);

        return tile;
    }

    public update() {
        for (const tile of this.tiles) {
            tile.update();
        }
    }
}

export type Tiles = Tile | TileMaker;
