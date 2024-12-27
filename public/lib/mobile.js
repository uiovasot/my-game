import {Color} from './color.js';

const canvas = document.getElementById('canvas');
const dpr = window.devicePixelRatio || 2;
const ctx = canvas.getContext('2d');

export const joysticks = [
    {
        get x() {
            return (canvas.width / dpr) * 0.2;
        },
        get y() {
            return (canvas.height / dpr) * 0.7;
        },
        radius: 50,
        innerRadius: 25,
        touchId: null,
        currentX: 0,
        currentY: 0,
        active: false,
        on(event) {},
    },
    {
        get x() {
            return (canvas.width / dpr) * 0.8;
        },
        get y() {
            return (canvas.height / dpr) * 0.7;
        },
        radius: 50,
        innerRadius: 25,
        touchId: null,
        currentX: 0,
        currentY: 0,
        active: false,
        on(event) {},
    },
];

export function drawJoystick() {
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = Color.Black;

    for (const joystick of joysticks) {
        ctx.globalAlpha = 0.2;

        ctx.beginPath();
        ctx.arc(joystick.x, joystick.y, joystick.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.closePath();

        ctx.globalAlpha = 0.3;

        ctx.beginPath();
        ctx.arc(joystick.x + joystick.currentX, joystick.y + joystick.currentY, joystick.innerRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.closePath();
    }
    ctx.globalAlpha = 1;
}

function handleTouchStart(event) {
    for (const touch of event.changedTouches) {
        for (const joystick of joysticks) {
            const dx = touch.pageX - (joystick.x + joystick.currentX);
            const dy = touch.pageY - (joystick.y + joystick.currentY);
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist <= joystick.radius) {
                joystick.touchId = touch.identifier;
                joystick.active = true;
                joystick.on('move');
            }
        }
    }
}

function handleTouchMove(event) {
    for (const touch of event.changedTouches) {
        for (const joystick of joysticks) {
            if (joystick.touchId === touch.identifier && joystick.active) {
                const dx = touch.pageX - joystick.x;
                const dy = touch.pageY - joystick.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist <= joystick.radius) {
                    joystick.currentX = dx;
                    joystick.currentY = dy;
                } else {
                    const angle = Math.atan2(dy, dx);
                    joystick.currentX = Math.cos(angle) * joystick.radius;
                    joystick.currentY = Math.sin(angle) * joystick.radius;
                }

                joystick.on('move');
            }
        }
    }
}

function handleTouchEnd(event) {
    for (const touch of event.changedTouches) {
        for (const joystick of joysticks) {
            if (joystick.touchId === touch.identifier) {
                joystick.touchId = null;
                joystick.currentX = 0;
                joystick.currentY = 0;
                joystick.active = false;

                joystick.on('end');
            }
        }
    }
}

canvas.addEventListener('touchstart', handleTouchStart);
canvas.addEventListener('touchmove', handleTouchMove);
canvas.addEventListener('touchend', handleTouchEnd);
