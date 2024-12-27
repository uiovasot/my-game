import {VectorLike} from './vector';

const dpr = window.devicePixelRatio || 2;
export const canvas = document.getElementById('canvas') as HTMLCanvasElement;

export const canvasSize = {
    width: 10,
    height: 10,
};

export const ctx = canvas.getContext('2d')!;

export function resize() {
    canvas.style.width = document.body.clientWidth + 'px';
    canvas.style.height = document.body.clientHeight + 'px';

    canvas.width = document.body.clientWidth * dpr;
    canvas.height = document.body.clientHeight * dpr;

    canvasSize.width = document.body.clientWidth;
    canvasSize.height = document.body.clientHeight;

    ctx.scale(dpr, dpr);
}

window.addEventListener('resize', resize, true);

export function drawText(text: string, color: string, border: string | null, size: number, pos: VectorLike | 'center', align: CanvasTextAlign = 'start', isMessage = false) {
    ctx.fillStyle = color;
    if (border) ctx.strokeStyle = border;

    ctx.textAlign = align;
    ctx.font = `bold ${size.toFixed(0)}px Ubuntu`;
    ctx.lineCap = ctx.lineJoin = 'round';
    ctx.lineWidth = 4;

    if (isMessage && pos !== 'center') {
        const {width} = ctx.measureText(text);
        const padding = 8;
        const textHeight = size;

        let x = pos.x;
        let y = pos.y;

        if (align === 'center') x -= width / 2;
        else if (align === 'end') x -= width;

        ctx.fillStyle = 'rgba(128, 128, 128, 0.5)';
        ctx.fillRect(x - padding, y - textHeight / 2 - padding, width + padding * 2, textHeight + padding);

        ctx.fillStyle = color;
    }

    if (pos === 'center') {
        if (border) ctx.strokeText(text, canvasSize.width / 2, canvasSize.height / 2);
        ctx.fillText(text, canvasSize.width / 2, canvasSize.height / 2);
    } else {
        if (border) ctx.strokeText(text, pos.x, pos.y);
        ctx.fillText(text, pos.x, pos.y);
    }
}
