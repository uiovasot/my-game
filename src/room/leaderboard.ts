import {Entity} from '@/entity/entity';
import {RoomLoop} from './room-loop';

export class Leaderboard {
    public scores: Map<number, {title: string; score: number}> = new Map();
    public room: RoomLoop;

    constructor(room: RoomLoop) {
        this.room = room;
    }

    public update(): void {
        for (const entity of this.room.entities) {
            if (!entity.isMaster) continue;
            if (entity.score <= entity.setting.score) continue;

            if (!this.scores.has(entity.id)) {
                this.scores.set(entity.id, {title: entity.name + ' - ' + entity.setting.label, score: entity.topMaster.score});

                entity.on('remove', () => this.scores.delete(entity.id));
            } else {
                const record = this.scores.get(entity.id);

                if (record) {
                    record.title = entity.name + ' - ' + entity.setting.label;
                    record.score = entity.score;
                }
            }
        }

        this.sort();
    }

    public sort(): void {
        const sortedEntries = Array.from(this.scores.entries())
            .sort(([, a], [, b]) => b.score - a.score)
            .slice(0, 10);

        this.scores = new Map(sortedEntries);
    }
}
