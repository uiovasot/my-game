import {RoomLoop} from './room-loop';
import {folderImport} from '../util/folder-importer';
import {RoomConfig} from './room-config';

const rooms = await folderImport<{
    default: {
        name: string;
        room: typeof RoomLoop;
    };
}>('../definitions/rooms');

export let Room = class Room extends RoomLoop {};

const find = rooms.find(({default: exports}) => {
    const room = RoomConfig.room;

    return room === exports?.name;
})?.default;

Room = find?.room || class Room extends RoomLoop {};

export const room = new Room();
