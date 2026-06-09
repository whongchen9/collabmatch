// ===== player.js — 玩家类（依赖 sprites.js） =====

/**
 * 玩家类
 * @param {number} spawnX - 出生点 tile x
 * @param {number} spawnY - 出生点 tile y
 * @param {object} sprite - 精灵帧表 { down/up/left/right: { idle: [], walk: [] } }
 */
function Player(spawnX, spawnY, sprite) {
  this.x = spawnX;
  this.y = spawnY;
  this.direction = 'down';
  this.state = 'idle';
  this.sprite = sprite;
  this.animFrame = 0;
  this.animTimer = 0;
  this.speed = 3; // tiles/s
  this.lastFootstepTime = 0;
}

/**
 * 更新玩家状态
 * @param {number} dt - 帧间隔时间（秒）
 * @param {object} inputState - 当前输入状态 { up, down, left, right }
 */
Player.prototype.update = function(dt, inputState) {
  var dx = 0, dy = 0;
  if (inputState.up)    dy -= 1;
  if (inputState.down)  dy += 1;
  if (inputState.left)  dx -= 1;
  if (inputState.right) dx += 1;

  // 对角移动归一化
  if (dx !== 0 && dy !== 0) {
    dx *= 0.707;
    dy *= 0.707;
  }

  if (dx !== 0 || dy !== 0) {
    this.state = 'walking';
    // 方向判定
    if (Math.abs(dx) > Math.abs(dy)) {
      this.direction = dx > 0 ? 'right' : 'left';
    } else {
      this.direction = dy > 0 ? 'down' : 'up';
    }

    // 分轴碰撞检测（滑墙）
    var newX = this.x + dx * this.speed * dt;
    var newY = this.y + dy * this.speed * dt;

    if (!this._isCollidingAt(newX, this.y)) {
      this.x = newX;
    }
    if (!this._isCollidingAt(this.x, newY)) {
      this.y = newY;
    }

    // 动画帧更新（150ms/帧，0-1-2-1 循环）
    this.animTimer += dt;
    if (this.animTimer >= 0.15) {
      this.animTimer -= 0.15;
      this.animFrame = (this.animFrame + 1) % 4;
    }

    // 脚步音效
    var now = performance.now() / 1000;
    if (now - this.lastFootstepTime > 0.2) {
      sfxFootstep();
      this.lastFootstepTime = now;
    }
  } else {
    this.state = 'idle';
    this.animFrame = 0;
    this.animTimer = 0;
  }
};

/**
 * 检查指定 tile 坐标是否碰撞
 * 使用脚底中心点 + 碰撞半径做 AABB 检测
 */
Player.prototype._isCollidingAt = function(tileX, tileY) {
  // 碰撞体: 以脚底中心为中心，检测覆盖的 tile
  var bounds = {
    x: tileX * TILE_SIZE + 6,
    y: tileY * TILE_SIZE + 20,
    w: 20,
    h: 12
  };

  var left   = Math.floor(bounds.x / TILE_SIZE);
  var right  = Math.floor((bounds.x + bounds.w - 1) / TILE_SIZE);
  var top    = Math.floor(bounds.y / TILE_SIZE);
  var bottom = Math.floor((bounds.y + bounds.h - 1) / TILE_SIZE);

  for (var ty = top; ty <= bottom; ty++) {
    for (var tx = left; tx <= right; tx++) {
      if (!isWalkable(tx, ty)) return true;
    }
  }
  return false;
};

/**
 * 渲染玩家
 * @param {CanvasRenderingContext2D} ctx - 主 Canvas 2D 上下文
 */
Player.prototype.render = function(ctx) {
  var direction = this.direction;
  var state = this.state;
  var spriteGroup = this.sprite[direction];

  if (!spriteGroup) return;

  var frame;
  if (state === 'idle') {
    frame = spriteGroup.idle[0];
  } else {
    // walk: 0-1-2-1 循环
    var walkIndex = [0, 1, 2, 1][this.animFrame % 4];
    frame = spriteGroup.walk[walkIndex];
  }

  if (!frame) return;

  var px = Math.round(this.x * TILE_SIZE);
  var py = Math.round(this.y * TILE_SIZE);
  ctx.drawImage(frame, px, py, TILE_SIZE, TILE_SIZE);
};

/**
 * 传送玩家到指定坐标
 * @param {number} x - tile x
 * @param {number} y - tile y
 */
Player.prototype.teleport = function(x, y) {
  this.x = x;
  this.y = y;
};
