import {Team} from '@/definitions/team';
import {TileMaker} from './tile';
import {Entity} from '@/entity/entity';
import {FixedVector} from '@/physics/vector';

export const Normal = new TileMaker({});

export function BaseTile(team: Team) {
    return new TileMaker({
        init: (tile) => {
            const size = tile.size * 0.5 * Math.SQRT2;

            const entity = new Entity();
            entity.init('Base');
            entity.team = team;
            entity.setting.size = size;
            entity.pos = new FixedVector(tile.pos.x, tile.pos.y);
            tile.room.insert(entity);

            const drone = new Entity();

            drone.init('BaseDroneMaker');
            drone.team = team;
            drone.pos = new FixedVector(entity.pos);

            tile.room.insert(drone);

            if (!tile.room.teamTile[team]) tile.room.teamTile[team] = [];
            tile.room.teamTile[team].push(tile);
        },
    });
}
