let lastServerUpdateTime = 0;

export function interpolate(entity, deltaTime) {
    const timeSinceLastServerUpdate = performance.now() - lastServerUpdateTime;

    const serverPos = entity.serverPos;
    const predictedPos = {
        x: serverPos.x + (entity.vel.x * timeSinceLastServerUpdate) / 1000,
        y: serverPos.y + (entity.vel.y * timeSinceLastServerUpdate) / 1000,
    };

    entity.pos.x += (predictedPos.x - entity.pos.x) * deltaTime * 0.1;
    entity.pos.y += (predictedPos.y - entity.pos.y) * deltaTime * 0.1;
}

export function reconcile(entity) {
    const errorMargin = 0.01;

    const positionDifference = {
        x: entity.serverPos.x - entity.pos.x,
        y: entity.serverPos.y - entity.pos.y,
    };

    if (Math.abs(positionDifference.x) > errorMargin || Math.abs(positionDifference.y) > errorMargin) {
        entity.pos.x += positionDifference.x;
        entity.pos.y += positionDifference.y;
    }
}
