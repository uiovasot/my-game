import {ClassLoader, EntityClass} from './entity/class';
import {folderImport} from './util/folder-importer';

await folderImport('../definitions/tanks');

ClassLoader();

const {room} = await import('./room/room');

import {Listen} from './network/web-server';
import {Logger} from './util/logger';
import {RoomConfig} from './room/room-config';
import {CloseArena} from './event/close-arena';

const port = +(process.env.PORT as string) || 80;

Listen(port, () => {
    Logger.success('Web server is listen on ' + port + '!');
});

setInterval(() => {
    room.update();
}, RoomConfig.tick);

setInterval(() => {
    room.leaderboard.update();
}, 1000);

room.initTile();

setTimeout(CloseArena, 1000 * 60 * 60);
