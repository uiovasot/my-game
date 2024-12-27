import {Logger} from '@/util/logger';
import {room} from '../room/room';
import {Entity} from '@/entity/entity';
import {RoomConfig} from '@/room/room-config';
import {Team} from '@/definitions/team';

export function CloseArena() {
    room.socket.sendMsg('Arena closed: No players may join!');
    Logger.info('Arena Closing initiated');

    setTimeout(() => {
        for (let i = 0; i < 15; i++) {
            let angle = ((Math.PI * 2) / 15) * i;
            const closer = new Entity();
            closer.pos.x = RoomConfig.width / 2 + (RoomConfig.width / 1.5) * Math.cos(angle);
            closer.pos.y = RoomConfig.width / 2 + (RoomConfig.width / 1.5) * Math.sin(angle);
            closer.init('ArenaCloser');
            closer.team = Team.Room;
            room.insert(closer);
        }

        let tick = 0;
        room.walls.sort((a, b) => Math.random() - 0.5);

        const loop = setInterval(() => {
            tick++;

            if (room.walls[0]) {
                room.remove(room.walls.pop());
            }

            for (const entity of room.entities) {
                entity.health -= 0.1;
            }

            if (tick >= 500) {
                room.socket.sendMsg('Closing!');
                Logger.info('Closing!');
                clearInterval(loop);
                setTimeout(process.exit, 1000);
            }
        }, 50);
    }, 10000);
}
