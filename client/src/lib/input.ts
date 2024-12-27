import {canvas, canvasSize} from './canvas';
import {Protocol} from './protocol';
import {message} from './state/message';

export class Input {
    public socket?: WebSocket;

    private autoFire = false;
    private isFiring = false;

    constructor() {
        this.setupEventListeners();
    }

    private setupEventListeners() {
        document.addEventListener('keydown', ({key}) => {
            if (!this.socket) return;

            const msg = new Protocol.Writer().writeUint(1);
            switch (key) {
                case 'e':
                    if (this.autoFire) {
                        message.add('Auto Fire disabled');
                        this.socket.send(new Protocol.Writer().writeUint(4).writeBoolean(false).make());
                    } else {
                        message.add('Auto Fire enabled');
                    }

                    this.autoFire = !this.autoFire;
                    break;
                case 'ArrowUp':
                case 'w':
                    this.socket.send(msg.writeUint(0).make());
                    break;
                case 'ArrowDown':
                case 's':
                    this.socket.send(msg.writeUint(1).make());
                    break;
                case 'ArrowLeft':
                case 'a':
                    this.socket.send(msg.writeUint(2).make());
                    break;
                case 'ArrowRight':
                case 'd':
                    this.socket.send(msg.writeUint(3).make());
                    break;
            }
        });

        document.addEventListener('keyup', ({key}) => {
            if (!this.socket) return;

            const msg = new Protocol.Writer().writeUint(1);
            switch (key) {
                case 'ArrowUp':
                case 'w':
                    this.socket.send(msg.writeUint(4).make());
                    break;
                case 'ArrowDown':
                case 's':
                    this.socket.send(msg.writeUint(5).make());
                    break;
                case 'ArrowLeft':
                case 'a':
                    this.socket.send(msg.writeUint(6).make());
                    break;
                case 'ArrowRight':
                case 'd':
                    this.socket.send(msg.writeUint(7).make());
                    break;
            }
        });

        canvas.addEventListener('mousemove', ({clientX, clientY}) => {
            if (!this.socket) return;

            const x = clientX - canvasSize.width / 2;
            const y = clientY - canvasSize.height / 2;

            const angle = Math.atan2(y, x);

            if (this.isFiring || this.autoFire) {
                this.socket.send(new Protocol.Writer().writeUint(5).writeBoolean(true).writeFloat(angle).make());
            }

            this.socket.send(new Protocol.Writer().writeUint(3).writeFloat(angle).make());
        });

        document.addEventListener('mousedown', ({clientX, clientY}) => {
            if (!this.socket) return;

            this.isFiring = true;

            const x = clientX - canvasSize.width / 2;
            const y = clientY - canvasSize.height / 2;

            const angle = Math.atan2(y, x);

            this.socket.send(new Protocol.Writer().writeUint(5).writeBoolean(true).writeFloat(angle).make());
        });

        document.addEventListener('mouseup', () => {
            if (!this.socket) return;

            this.isFiring = false;

            this.socket.send(new Protocol.Writer().writeUint(5).writeBoolean(false).make());
        });
    }
}
