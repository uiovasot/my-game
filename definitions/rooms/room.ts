import {Color} from '@/definitions/color';
import {Team} from '@/definitions/team';
import {EntityClass} from '@/entity/class';
import {RoomLoop} from '@/room/room-loop';
import {TileMaker, Tiles} from '@/room/tile';

const nope = new TileMaker({
    spawn: [],
    spawnTimes: 0,
    spawnInterval: 1000,
});

const ____ = new TileMaker({
    spawn: [
        {type: 'Food', weight: 1},
        {type: 'NOOO', weight: 0.05},
    ],
    spawnTimes: 20,
    spawnInterval: 1000,
});

export default {
    name: 'room',
    room: class extends RoomLoop {
        public teams: Team[] = [Team.Blue, Team.Green];
        public tileMap: Tiles[][] = [
            [nope, nope, nope, nope, nope, nope, nope, nope],
            [nope, ____, ____, ____, ____, ____, ____, nope],
            [nope, ____, ____, ____, ____, ____, ____, nope],
            [nope, ____, ____, ____, ____, ____, ____, nope],
            [nope, ____, ____, ____, ____, ____, ____, nope],
            [nope, ____, ____, ____, ____, ____, ____, nope],
            [nope, ____, ____, ____, ____, ____, ____, nope],
            [nope, nope, nope, nope, nope, nope, nope, nope],
        ];
    },
};
