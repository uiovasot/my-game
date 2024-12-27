import {canvasSize, ctx, drawText} from '../canvas';
import {Color} from '../color';

class Message {
    private stack: {msg: string; alpha: number}[] = [];

    public add(message: string) {
        for (const msg of message.split('\n')) {
            this.stack.unshift({
                msg,
                alpha: 1,
            });
        }
    }

    public update() {
        for (let i = 0; i < this.stack.length; i++) {
            this.stack[i].alpha -= this.stack.length > 5 ? 0.01 : 0.006;

            if (this.stack[i].alpha <= 0) this.stack.splice(i, 1);
        }
    }

    public draw() {
        message.update();

        for (let i = 0; i < message.stack.length; i++) {
            ctx.globalAlpha = Math.min(1, 0.5 + message.stack[i].alpha);
            drawText(message.stack[i].msg, Color.Black, null, 14, {x: canvasSize.width / 2, y: 20 + i * 25}, 'center', true);
        }

        ctx.globalAlpha = 1;
    }
}

export const message = new Message();
