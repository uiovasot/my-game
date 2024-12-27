export class BufferPool {
    private static pools: Map<number, Uint8Array[]> = new Map();
    private static readonly MAX_POOL_SIZE = 1000;
    private static readonly POOL_SIZES = [128, 256, 512, 1024, 2048, 4096, 8192];

    static acquire(minSize: number): Uint8Array {
        const size = this.POOL_SIZES.find((s) => s >= minSize) || minSize;
        let pool = this.pools.get(size);

        if (!pool || pool.length === 0) {
            return new Uint8Array(size);
        }

        return pool.pop();
    }

    static release(buffer: Uint8Array): void {
        const size = buffer.length;
        if (!this.POOL_SIZES.includes(size)) return;

        let pool = this.pools.get(size);
        if (!pool) {
            pool = [];
            this.pools.set(size, pool);
        }

        if (pool.length < this.MAX_POOL_SIZE) {
            pool.push(buffer);
        }
    }
}

export namespace Protocol {
    export class Reader {
        public dataView: DataView;
        public offset: number = 0;

        private textDecoder: TextDecoder = new TextDecoder();

        constructor(buffer: ArrayBuffer | Uint8Array) {
            if (buffer instanceof Uint8Array) {
                this.dataView = new DataView(buffer.buffer);
            } else {
                this.dataView = new DataView(buffer);
            }
        }

        readString(): string {
            const length = this.readUint();
            if (length < 0 || this.offset + length > this.dataView.byteLength) {
                throw new Error('Invalid string length or out of bounds');
            }

            const stringBytes = new Uint8Array(this.dataView.buffer, this.offset, length);
            this.offset += length;

            return this.textDecoder.decode(stringBytes);
        }

        readInt(): number {
            if (this.offset + 4 > this.dataView.byteLength) {
                throw new Error('Out of bounds while reading number');
            }

            const value = this.dataView.getInt32(this.offset, true);
            this.offset += 4;

            return value;
        }

        readUint(): number {
            if (this.offset + 2 > this.dataView.byteLength) {
                throw new Error('Out of bounds while reading number');
            }

            const value = this.dataView.getUint16(this.offset, true);
            this.offset += 2;

            return value;
        }

        readBigUint(): number {
            if (this.offset + 4 > this.dataView.byteLength) {
                throw new Error('Out of bounds while reading number');
            }

            const value = this.dataView.getUint32(this.offset, true);
            this.offset += 4;

            return value;
        }

        readFloat(): number {
            if (this.offset + 4 > this.dataView.byteLength) {
                throw new Error('Out of bounds while reading float');
            }

            const value = this.dataView.getFloat32(this.offset, true);
            this.offset += 4;

            return value;
        }

        readBoolean(): boolean {
            if (this.offset + 1 > this.dataView.byteLength) {
                throw new Error('Out of bounds while reading boolean');
            }

            const value = this.dataView.getUint8(this.offset);
            this.offset += 1;

            return value !== 0;
        }
    }

    export class Writer {
        private static readonly INITIAL_SIZE = 1024;
        private buffer: Uint8Array;
        private dataView: DataView;
        public offset: number = 0;
        private readonly textEncoder: TextEncoder = new TextEncoder();

        constructor(initialSize: number = Writer.INITIAL_SIZE) {
            this.buffer = BufferPool.acquire(initialSize);
            this.dataView = new DataView(this.buffer.buffer);
        }

        private ensureCapacity(additional: number): void {
            const required = this.offset + additional;
            if (required <= this.buffer.length) return;

            const newSize = Math.max(this.buffer.length * 2, required);
            const newBuffer = BufferPool.acquire(newSize);
            newBuffer.set(new Uint8Array(this.buffer.buffer, 0, this.offset));

            BufferPool.release(this.buffer);
            this.buffer = newBuffer;
            this.dataView = new DataView(this.buffer.buffer);
        }

        writeString(value: string): this {
            const encoded = this.textEncoder.encode(value);
            this.ensureCapacity(2 + encoded.length);

            this.dataView.setUint16(this.offset, encoded.length, true);
            this.offset += 2;

            this.buffer.set(encoded, this.offset);
            this.offset += encoded.length;

            return this;
        }

        writeInt(value: number): this {
            this.ensureCapacity(4);
            this.dataView.setInt32(this.offset, value, true);
            this.offset += 4;
            return this;
        }

        writeUint(value: number): this {
            this.ensureCapacity(2);
            this.dataView.setUint16(this.offset, value, true);
            this.offset += 2;
            return this;
        }

        writeBigUint(value: number): this {
            this.ensureCapacity(4);
            this.dataView.setUint32(this.offset, value, true);
            this.offset += 4;
            return this;
        }

        writeFloat(value: number): this {
            this.ensureCapacity(4);
            this.dataView.setFloat32(this.offset, value, true);
            this.offset += 4;
            return this;
        }

        writeBoolean(value: boolean): this {
            this.ensureCapacity(1);
            this.dataView.setUint8(this.offset, value ? 1 : 0);
            this.offset += 1;
            return this;
        }

        make(): Uint8Array {
            const result = new Uint8Array(this.buffer.buffer, 0, this.offset);
            BufferPool.release(this.buffer);
            return result;
        }

        reset(): this {
            this.offset = 0;
            return this;
        }

        getSize(): number {
            return this.offset;
        }
    }
}
