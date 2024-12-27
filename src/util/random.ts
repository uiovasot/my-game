import {VectorLike} from '../physics/vector';

export class RandomPosGenerator {
    public exclusionZone: [VectorLike, VectorLike][] = [];

    public getRandomPos(min: VectorLike, max: VectorLike): VectorLike {
        let pos: VectorLike;
        do {
            pos = {x: Math.random() * (max.x - min.x) + min.x, y: Math.random() * (max.y - min.y) + min.y};
        } while (this.exclusionZone.some(([min, max]) => pos.x >= min.x && pos.x <= max.x && pos.y >= min.y && pos.y <= max.y));

        return pos;
    }
}

export function randomFood(
    foods: {
        type: string;
        weight: number;
    }[],
) {
    const totalWeight = foods.reduce((sum: number, food) => sum + food.weight, 0);

    let random = Math.random() * totalWeight;

    for (let food of foods) {
        if (random < food.weight) {
            return food.type;
        }
        random -= food.weight;
    }
}
