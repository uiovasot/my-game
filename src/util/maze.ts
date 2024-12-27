const directions = [
    {dx: 0, dy: 2},
    {dx: 0, dy: -2},
    {dx: 2, dy: 0},
    {dx: -2, dy: 0},
];

export class Maze {
    public width: number;
    public height: number;

    public maze: boolean[][];

    constructor(width: number, height: number) {
        this.width = width;
        this.height = height;

        this.maze = Array.from({length: height}, () => Array(width).fill(true));
    }

    public removeBorders() {
        for (let x = 0; x < this.width; x++) {
            this.maze[0][x] = false;
            this.maze[this.height - 1][x] = false;
        }
        for (let y = 0; y < this.height; y++) {
            this.maze[y][0] = false;
            this.maze[y][this.width - 1] = false;
        }
    }

    public generateMaze(x: number, y: number) {
        const queue = [{x, y}];
        const intermediateQueue = [{x, y}];
        const offsets = [0, 1, 0, -1, 0];

        const carvePassage = (cx: number, cy: number) => {
            this.maze[cy][cx] = false;
        };

        while (queue.length) {
            const current = queue.pop();
            const intermediate = intermediateQueue.pop();

            if (!current || !this.maze[current.y][current.x]) continue;

            carvePassage(current.x, current.y);
            if (intermediate) carvePassage(intermediate.x, intermediate.y);

            const neighbors: {x: number; y: number}[] = [];

            for (let i = 0; i < 4; i++) {
                const newX = current.x + offsets[i] * 2;
                const newY = current.y + offsets[i + 1] * 2;

                if (newX < 0 || newX >= this.width || newY < 0 || newY >= this.height) {
                    if (Math.random() < 0.25) {
                        if (this.maze[current.y + offsets[i + 1]]) {
                            this.maze[current.y + offsets[i + 1]][current.x + offsets[i]] = false;
                        }
                    }
                    continue;
                }

                if (!this.maze[newY][newX]) continue;
                neighbors.push({x: newX, y: newY});
            }

            if (!neighbors.length) continue;

            neighbors.sort(() => Math.random() - 0.5);

            queue.push(...neighbors);
            intermediateQueue.push(...neighbors.map(({x, y}) => ({x: (x + current.x) / 2, y: (y + current.y) / 2})));
        }
    }

    public punchAdditionalWalls() {
        for (let x = 1; x < this.width; x += 2) {
            for (let y = 1; y < this.height; y += 2) {
                for (let i = 0; i < 4; i++) {
                    if (Math.random() < 0.9) continue;
                    if (this.maze[y + directions[i]?.dy]) {
                        this.maze[y + directions[i]?.dy][x + directions[i]?.dx] = false;
                    }
                }
            }
        }
    }

    public createHoles(centers: [number, number][], holeSize: number) {
        const halfSize = Math.floor(holeSize / 2);
        for (const [cx, cy] of centers) {
            for (let dy = -halfSize; dy <= halfSize; dy++) {
                for (let dx = -halfSize; dx <= halfSize; dx++) {
                    const nx = cx + dx;
                    const ny = cy + dy;

                    if (ny > 0 && ny < this.height - 1 && nx > 0 && nx < this.width - 1) {
                        this.maze[ny][nx] = false;
                    }
                }
            }
        }
    }

    public createCorridors(corridors: number[]) {
        for (let y of corridors) {
            for (let x = corridors[0]; x <= corridors[1]; x++) {
                this.maze[y][x] = false;
                this.maze[x][y] = false;
            }
        }
    }
}
