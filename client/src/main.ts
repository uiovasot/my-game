import {canvas, canvasSize, ctx, drawText, resize} from './lib/canvas';
import {Color} from './lib/color';
import {drawShape} from './lib/entity';
import {Input} from './lib/input';
import {Protocol} from './lib/protocol';
import {Socket} from './lib/socket';
import {message} from './lib/state/message';
import {score} from './lib/state/score';
import {Vector} from './lib/vector';
import './style.css';

let socket: WebSocket;

let name = '';

let uuid = localStorage.getItem('uuid');
let zoom = 0;

let lastRenderTime = 0;
let totalFps = 0;
let fps = 0;
let renderCount = 0;
let lastRenderUpdate = performance.now();

const network = new Socket();

const input = new Input();

function start(_name: string) {
    name = _name;
    socket = new WebSocket('/ws?uuid=' + (uuid || '0'));
    socket.binaryType = 'arraybuffer';
    socket.onmessage = async ({data}) => {
        if (typeof data === 'string') throw new Error(data);

        if (!(await network.onMessage(socket, data))) {
            const msg = new Protocol.Reader(data);

            msg.readUint();

            socket.close();

            uuid = msg.readString();

            localStorage.setItem('uuid', uuid);

            start(_name);
        }
    };
    socket.onopen = () => {
        setTimeout(() => socket.send(new Protocol.Writer().writeUint(0).writeString(name).make()), 100);
        resize();
        input.socket = socket;
    };
}

const drawMiniMapAndInfo = () => {
    const minimapScale = 130 / Math.min(network.world.width, network.world.height);
    const minimapWidth = network.world.width * minimapScale;
    const minimapHeight = network.world.height * minimapScale;

    const minimapStartX = canvasSize.width - minimapWidth - 10;
    const minimapStartY = canvasSize.height - minimapHeight - 10;

    ctx.lineWidth = 2;

    ctx.globalAlpha = 0.6;
    ctx.fillStyle = Color.White;
    ctx.fillRect(minimapStartX, minimapStartY, minimapWidth, minimapHeight);
    ctx.globalAlpha = 1;
    ctx.strokeRect(minimapStartX, minimapStartY, minimapWidth, minimapHeight);

    for (const item of network.minimap) {
        ctx.fillStyle = item.color;
        const minimapX = minimapStartX + item.pos.x * minimapScale;
        const minimapY = minimapStartY + item.pos.y * minimapScale;

        ctx.beginPath();
        if (item.size) {
            ctx.translate(minimapX, minimapY);
            drawShape({...item, sides: item.sides!, size: item.size!, angle: 0});
            ctx.translate(-minimapX, -minimapY);
        } else {
            ctx.arc(minimapX, minimapY, 2, 0, 2 * Math.PI);
        }
        ctx.fill();
        ctx.closePath();
    }

    const textSize = 12;

    const infoStartX = canvasSize.width - 10;
    const infoStartY = minimapStartY;

    drawText(location.host, Color.Black, Color.White, textSize + 2, {x: infoStartX, y: infoStartY - 80}, 'right');

    drawText(`Client FPS: ${fps.toFixed(2)} fps`, fps < 60 ? Color.Red : Color.Black, Color.White, textSize, {x: infoStartX, y: infoStartY - 60}, 'right');
    drawText(`Server Tick: ${(1000 / network.world.tick).toFixed(2)}`, Color.Black, Color.White, textSize, {x: infoStartX, y: infoStartY - 45}, 'right');

    drawText(`Average Data Size: ${network.avgDataSize.toFixed(2)} bytes`, Color.Black, Color.White, textSize, {x: infoStartX, y: infoStartY - 30}, 'right');

    drawText(
        `Data Rate: ${network.dataRate > 0 ? (network.dataRate / 1024).toFixed(2) : '0'} kb/s`,
        Color.Black,
        Color.White,
        textSize,
        {x: infoStartX, y: infoStartY - 15},
        'right',
    );
};

const drawLeaderboard = () => {
    const leaderboardWidth = 100;
    const leaderboardStartX = canvasSize.width - leaderboardWidth - 10;
    const leaderboardStartY = 10;

    ctx.fillStyle = Color.Black;
    drawText('Leaderboard', Color.White, Color.Black, 16, {x: leaderboardStartX + 10, y: leaderboardStartY + 20}, 'center');

    let yOffset = 25;
    for (const player of network.leaderboard) {
        yOffset += 20;
        drawText(`${player.title}: ${player.score}`, Color.White, Color.Black, 14, {x: leaderboardStartX + 10, y: leaderboardStartY + yOffset}, 'center');
    }
};

const render = (timestamp: number) => {
    if (!network.entity || !network.world.width) return requestAnimationFrame(render);

    const fov = Math.max(canvasSize.width, canvasSize.height) / ((network.entity.fov || 10) + network.entity.size);
    if (zoom !== fov) {
        const diff = Math.abs(zoom - fov);
        if (diff < 0.01) zoom = fov;
        else if (zoom < fov) zoom += diff / 70;
        else zoom -= diff / 70;
    }

    const deltaTime = timestamp - lastRenderTime;
    lastRenderTime = timestamp;

    totalFps += 1000 / deltaTime;

    renderCount++;

    if (performance.now() - lastRenderUpdate >= 1000) {
        fps = totalFps / renderCount;

        renderCount = 0;
        totalFps = 0;
        lastRenderUpdate = performance.now();
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.globalAlpha = 0.2;
    ctx.fillStyle = Color.Black2;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1;

    ctx.save();

    ctx.scale(zoom, zoom);
    ctx.translate(canvasSize.width / 2 / zoom - network.entity.pos.x, canvasSize.height / 2 / zoom - network.entity.pos.y);

    ctx.fillStyle = Color.White;
    ctx.fillRect(0, 0, network.world.width, network.world.height);

    ctx.strokeStyle = 'rgb(0,0,0,0.03)';

    for (let y = 0; y <= network.world.height; y += 20) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(network.world.width, y);
        ctx.stroke();
    }
    for (let x = 0; x <= network.world.width; x += 20) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, network.world.height);
        ctx.stroke();
    }

    for (const entity of network.entities) {
        const distance = Vector.distance(network.entity.serverPos, entity.serverPos);
        const fov = network.entity.fov + (network.entity.size + entity.size) / 2;

        if (distance > fov && entity.fadeStart) {
            network.removeEntity(entity);
        }

        if (distance > fov) {
            entity.canSee = false;

            continue;
        }

        if (!entity.canSee) continue;

        entity.drawEntity(network);
    }

    ctx.restore();

    ctx.save();

    message.draw();

    if (network.entity.health > 0) {
        score.draw(network.entity);

        drawMiniMapAndInfo();
        drawLeaderboard();

        ctx.restore();
    } else {
        ctx.globalAlpha = 1;

        drawText(
            'You are Die.',
            Color.Black,
            Color.White,
            40,
            {
                x: canvasSize.width / 2,
                y: canvasSize.height * 0.3,
            },
            'center',
        );

        drawText(
            'Score: ' + network.entity.score,
            Color.Black,
            Color.White,
            16,
            {
                x: canvasSize.width / 2,
                y: canvasSize.height * 0.4,
            },
            'center',
        );

        drawText(
            'Level: ' + network.entity.level,
            Color.Black,
            Color.White,
            16,
            {
                x: canvasSize.width / 2,
                y: canvasSize.height * 0.4 + 20,
            },
            'center',
        );
    }

    ctx.restore();

    requestAnimationFrame(render);
};

requestAnimationFrame(render);

(document.querySelector('#userId') as HTMLInputElement).value = localStorage.getItem('userId') || '';

(document.querySelector('#play') as HTMLButtonElement).addEventListener('click', () => {
    document.querySelector('main')!.style.display = 'none';
    localStorage.setItem('userId', (document.querySelector('#userId') as HTMLInputElement).value);
    start((document.querySelector('#userId') as HTMLInputElement).value);
});
