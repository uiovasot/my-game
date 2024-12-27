import {Maze} from '../util/maze';
import {EntityClass} from '../entity/class';
import {Entity} from '../entity/entity';
import {RoomConfig} from './room-config';
import {World} from './world';
import {RandomPosGenerator} from '../util/random';
import {Vector} from '../physics/vector';
import {Team} from '../definitions/team';
import {Tile, Tiles} from './tile';
import {Normal} from './tiles';
import {Leaderboard} from './leaderboard';

export class RoomLoop extends World {
    public randomPosGenerator = new RandomPosGenerator();

    public teamTile: {[key: string]: Tile[]} = {};
    public teams: Team[] = [Team.Room];
    public tileMap: Tiles[][] = [
        [Normal, Normal, Normal, Normal],
        [Normal, Normal, Normal, Normal],
        [Normal, Normal, Normal, Normal],
        [Normal, Normal, Normal, Normal],
    ];

    public tiles: Tile[] = [];

    public leaderboard = new Leaderboard(this);

    public initTile() {
        const size = new Vector(RoomConfig.width / this.tileMap.length, RoomConfig.height / this.tileMap[0].length);

        for (let i = 0; i < this.tileMap.length; i++) {
            for (let j = 0; j < this.tileMap[0].length; j++) {
                this.tiles.push(this.tileMap[i][j].init(this, size.clone().mult({x: i, y: j}), size.clone().mult({x: i + 1, y: j + 1})));
            }
        }
    }

    public spawn(name: string) {
        const entity = new Entity();

        entity.init(EntityClass.Basic);

        entity.name = name;

        entity.team = this.teams[Math.floor(Math.random() * this.teams.length)];

        const tile = this.teamTile[entity.team] ? this.teamTile[entity.team][Math.floor(Math.random() * this.teamTile[entity.team].length)] : null;

        const {x, y} = this.randomPosGenerator.getRandomPos(
            {x: tile ? tile.min.x : 0, y: tile ? tile.min.x : 0},
            {x: tile ? tile.max.x : RoomConfig.width, y: tile ? tile.max.x : RoomConfig.height},
        );

        entity.pos.x = x;
        entity.pos.y = y;

        return entity;
    }

    public generateLabyrinth(size: number) {
        const padding = 1;
        const maze = new Maze(size, size);
        const wallScale = RoomConfig.height / (size + 2 * padding);

        maze.generateMaze(1, 1);
        maze.punchAdditionalWalls();

        maze.createHoles(
            [
                [5, 5],
                [5, 25],
                [25, 5],
                [25, 25],
            ],
            4,
        );

        maze.createHoles([[15, 15]], 8);

        const corridors = [7, 23];

        maze.createCorridors(corridors);

        for (let x = padding; x < size + padding; x++) {
            for (let y = padding; y < size + padding; y++) {
                if (!maze.maze[y - 1]?.[x - 1]) continue;

                const d = {
                    x: x * wallScale + wallScale / 2,
                    y: y * wallScale + wallScale / 2,
                };

                const wallEntity = new Entity();
                wallEntity.init('Wall');
                wallEntity.pos.x = d.x;
                wallEntity.pos.y = d.y;
                wallEntity.setting.size = wallScale * 0.5 * Math.SQRT2;
                wallEntity.team = Team.Room;
                this.insert(wallEntity);
                this.walls.push(wallEntity);
                this.randomPosGenerator.exclusionZone.push([
                    {x: d.x - wallEntity.setting.size, y: d.y - wallEntity.setting.size},
                    {x: d.x + wallEntity.setting.size, y: d.y + wallEntity.setting.size},
                ]);
            }
        }
    }
}
