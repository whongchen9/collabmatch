// ===== npc.js — NPC 类（依赖 sprites.js） =====

/**
 * NPC 类
 * @param {object} config - { id, x, y, type, direction, sprite, action, label, dialog, matchedUser?, spawnTimer? }
 */
function NPC(config) {
  this.id = config.id;
  this.x = config.x;
  this.y = config.y;
  this.type = config.type || 'waiter';
  this.direction = config.direction || 'down';
  this.sprite = config.sprite;
  this.action = config.action;
  this.label = config.label;
  this.dialog = config.dialog;
  this.animFrame = 0;
  this.animTimer = 0;
  this.breathOffset = 0;
  // hero 侠客 NPC 专用字段
  this.matchedUser = config.matchedUser || null;
  this.spawnTimer = config.spawnTimer || 0;
  this.fadeIn = 0; // 淡入动画进度 0→1
  this.fadeOut = false; // 是否正在淡出
}

/**
 * 更新 NPC — 待机呼吸动画 + 侠客淡入/淡出
 * @param {number} dt - 帧间隔（秒）
 */
NPC.prototype.update = function(dt) {
  // 呼吸动画：Y 坐标微幅摆动
  this.animTimer += dt;
  this.breathOffset = Math.sin(this.animTimer * 3) * 0.5;

  // 每隔一小会微调方向（模拟转向）
  if (this.animTimer > 3) {
    this.animTimer -= 3;
    var dirs = ['down', 'left', 'right'];
    this.direction = dirs[Math.floor(Math.random() * dirs.length)];
  }

  // 侠客淡入动画
  if (this.type === 'hero' && this.fadeIn < 1) {
    this.fadeIn = Math.min(1, this.fadeIn + dt * 2);
  }

  // 侠客淡出倒计时
  if (this.type === 'hero' && this.fadeOut) {
    this.fadeIn = Math.max(0, this.fadeIn - dt * 2);
  }
};

/**
 * 渲染 NPC
 * @param {CanvasRenderingContext2D} ctx - 主 Canvas 2D 上下文
 */
NPC.prototype.render = function(ctx) {
  var spriteGroup = this.sprite[this.direction];
  if (!spriteGroup) return;

  // NPC 使用 idle 第 0 帧
  var frame = spriteGroup.idle[0];
  if (!frame) return;

  var px = Math.round(this.x * TILE_SIZE);
  var py = Math.round(this.y * TILE_SIZE + this.breathOffset);

  // 侠客淡入/淡出
  if (this.type === 'hero') {
    ctx.save();
    ctx.globalAlpha = this.fadeIn;
  }

  ctx.drawImage(frame, px, py, TILE_SIZE, TILE_SIZE);

  // 侠客头顶名字气泡
  if (this.type === 'hero' && this.matchedUser && this.fadeIn > 0.3) {
    var name = this.matchedUser.name || '侠客';
    ctx.font = '9px "Inter", "PingFang SC", sans-serif';
    var nameWidth = ctx.measureText(name).width;
    var bubbleW = nameWidth + 8;
    var bubbleH = 14;
    var bubbleX = px + TILE_SIZE / 2 - bubbleW / 2;
    var bubbleY = py - 16;

    ctx.fillStyle = 'rgba(74, 111, 165, 0.85)';
    ctx.beginPath();
    var r = 3;
    ctx.moveTo(bubbleX + r, bubbleY);
    ctx.lineTo(bubbleX + bubbleW - r, bubbleY);
    ctx.quadraticCurveTo(bubbleX + bubbleW, bubbleY, bubbleX + bubbleW, bubbleY + r);
    ctx.lineTo(bubbleX + bubbleW, bubbleY + bubbleH - r);
    ctx.quadraticCurveTo(bubbleX + bubbleW, bubbleY + bubbleH, bubbleX + bubbleW - r, bubbleY + bubbleH);
    ctx.lineTo(bubbleX + r, bubbleY + bubbleH);
    ctx.quadraticCurveTo(bubbleX, bubbleY + bubbleH, bubbleX, bubbleY + bubbleH - r);
    ctx.lineTo(bubbleX, bubbleY + r);
    ctx.quadraticCurveTo(bubbleX, bubbleY, bubbleX + r, bubbleY);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name, bubbleX + bubbleW / 2, bubbleY + bubbleH / 2);
  }

  if (this.type === 'hero') {
    ctx.restore();
  }
};

/**
 * 判断玩家是否在交互范围内（曼哈顿距离 ≤ 2 tile）
 * @param {number} px - 玩家 tile x
 * @param {number} py - 玩家 tile y
 * @returns {boolean}
 */
NPC.prototype.canInteract = function(px, py) {
  var distX = Math.abs(px - this.x);
  var distY = Math.abs(py - this.y);
  return distX <= 2 && distY <= 2;
};

/**
 * 侠客是否已完全淡出（可从列表移除）
 */
NPC.prototype.isGone = function() {
  return this.type === 'hero' && this.fadeOut && this.fadeIn <= 0;
};
