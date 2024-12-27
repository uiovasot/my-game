class Message {
    stack = [];

    add(message) {
        for (const msg of message.split('\n')) {
            this.stack.unshift({
                msg,
                alpha: 1,
            });
        }
    }

    update() {
        for (let i = 0; i < this.stack.length; i++) {
            this.stack[i].alpha -= this.stack.length > 5 ? 0.01 : 0.006;

            if (this.stack[i].alpha <= 0) this.stack.splice(i, 1);
        }
    }
}

export const message = new Message();
