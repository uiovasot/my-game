import {drawText, canvasSize, ctx} from '../canvas';
import {Color} from '../color';
import {Entity} from '../entity';

class Score {
    private levelScore = 0;

    private lastLevelScore = 0;
    private oldLevelScore = 0;

    private score = 0;

    private scoreProgress = 0;

    public update() {
        if (this.levelScore !== this.lastLevelScore) {
            this.oldLevelScore = this.lastLevelScore;
            this.lastLevelScore = this.levelScore;
        }

        let scoreProgress = (this.score - this.oldLevelScore) / (this.lastLevelScore - this.oldLevelScore);

        if (scoreProgress === Infinity) scoreProgress = 1;
        if (scoreProgress === -Infinity) scoreProgress = 0;
        if (isNaN(scoreProgress)) scoreProgress = 0;

        if (scoreProgress !== this.scoreProgress) {
            const diff = Math.abs(scoreProgress - this.scoreProgress);

            if (diff < 0.001) {
                this.scoreProgress = scoreProgress;
            } else {
                this.scoreProgress += (scoreProgress - this.scoreProgress) / 30;
            }
        }

        if (isNaN(this.scoreProgress)) this.scoreProgress = 0;
    }

    public draw(entity: Entity) {
        score.score = entity.score;
        score.levelScore = entity.levelScore;

        score.update();

        drawText(`${entity.name}`, Color.White, Color.Black, 24, {x: canvasSize.width / 2, y: canvasSize.height - 65}, 'center', false);

        drawText(`Score: ${score.score.toFixed(0)}`, Color.White, Color.Black, 14, {x: canvasSize.width / 2, y: canvasSize.height - 45}, 'center', false);

        const radius = 10;

        const width = canvasSize.width * 0.3;
        const height = 20;
        const padding = 2;

        const x = canvasSize.width / 2 - width / 2;
        const y = canvasSize.height - 18 - height;

        ctx.beginPath();
        ctx.fillStyle = Color.Black;
        ctx.roundRect(x, y, width, height, radius);
        ctx.fill();

        const fillWidth = padding * 2 + Math.min(Math.max(0, score.scoreProgress) * (width - padding * 2), width - padding * 2);
        ctx.beginPath();
        ctx.fillStyle = Color.Gold;
        ctx.roundRect(x + padding, y + padding, fillWidth - padding * 2, height - padding * 2, radius);
        ctx.fill();

        drawText(`Level ${entity.level} ${entity.label}`, Color.White, Color.Black, 14, {x: canvasSize.width / 2, y: canvasSize.height - 23}, 'center', false);
    }
}

export const score = new Score();
