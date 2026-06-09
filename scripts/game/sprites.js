// ===== sprites.js — 精灵与 Tile 绘制（零依赖，最先加载） =====

const TILE_SIZE = 32;

// ===== 配色方案 =====
const PLAYER_COLORS = {
  skin: '#ffd8b1',
  hair: '#2a1a0a',
  top: '#8b7bf7',
  bottom: '#6b5bc7',
  shoes: '#3a3a5a'
};

const NPC_COLORS = {
  waiter: {
    skin: '#f5d0a9',
    hair: '#4a3728',
    top: '#7a8b8b',
    bottom: '#5a6b6b',
    shoes: '#3a3a3a',
    hat: '#e8e0d0'
  },
  hero: {
    skin: '#f5d0a9',
    hair: '#1a1a2e',
    top: '#4a6fa5',
    bottom: '#3a5f95',
    shoes: '#2a2a3a'
  }
};

// ===== 行走动画摆动数据 =====
const WALK_WOBBLE = {
  down:  [0, -1, 0,  1],
  up:    [0,  1, 0, -1],
  left:  [0, -1, 0,  1],
  right: [0, -1, 0,  1]
};

const ARM_SWING = {
  down:  [0, 1, 0, -1],
  up:    [0, 1, 0, -1],
  left:  [0, 1, 0, -1],
  right: [0, 1, 0, -1]
};

// 每帧 [左腿长度, 右腿长度]
const LEG_FRAMES = {
  down:  [[6,8], [8,6], [6,8], [7,7]],
  up:    [[6,8], [8,6], [6,8], [7,7]],
  left:  [[6,8], [8,6], [6,8], [7,7]],
  right: [[6,8], [8,6], [6,8], [7,7]]
};

// ===== 角色绘制 =====
/**
 * 在 32×32 canvas 上用 fillRect 逐像素绘制角色帧
 * @param {CanvasRenderingContext2D} ctx - 离屏 canvas 的 2d 上下文
 * @param {string} direction - 'down'|'up'|'left'|'right'
 * @param {number} frame - 0-3
 * @param {string} state - 'idle'|'walk'
 * @param {object} colors - { skin, hair, top, bottom, shoes, hat? }
 */
function drawCharacterFrame(ctx, direction, frame, state, colors) {
  ctx.clearRect(0, 0, 32, 32);

  var wobble = 0;
  var armSwing = 0;
  var legL = 7;
  var legR = 7;

  if (state === 'walk') {
    wobble = WALK_WOBBLE[direction][frame];
    armSwing = ARM_SWING[direction][frame];
    legL = LEG_FRAMES[direction][frame][0];
    legR = LEG_FRAMES[direction][frame][1];
  }

  // === 鞋 (先画，在最底层) ===
  ctx.fillStyle = colors.shoes;
  var shoeY = 27 + wobble;
  ctx.fillRect(11, shoeY, 4, 2);
  ctx.fillRect(17, shoeY, 4, 2);

  // === 腿 ===
  ctx.fillStyle = colors.bottom;
  var legBaseY = 20 + wobble;
  var legLHeight = state === 'idle' ? 7 : legL;
  var legRHeight = state === 'idle' ? 7 : legR;
  ctx.fillRect(11, legBaseY, 4, legLHeight);
  ctx.fillRect(17, legBaseY, 4, legRHeight);

  // === 身体 (10x10) ===
  ctx.fillStyle = colors.top;
  ctx.fillRect(11, 10 + wobble, 10, 10);

  // === 手臂 ===
  ctx.fillStyle = colors.skin;
  var armBaseY = 11 + wobble;
  // 走路时手臂前后摆动
  ctx.fillRect(9 + armSwing, armBaseY, 2, 6);
  ctx.fillRect(21 - armSwing, armBaseY, 2, 6);

  // === 头部 (8x8) ===
  ctx.fillStyle = colors.skin;
  ctx.fillRect(12, 2 + wobble, 8, 8);

  // === 头发 ===
  ctx.fillStyle = colors.hair;
  ctx.fillRect(11, wobble, 10, 3);
  ctx.fillRect(11, 3 + wobble, 2, 2);
  ctx.fillRect(19, 3 + wobble, 2, 2);

  // === 帽子 (可选，NPC waiter 戴帽子) ===
  if (colors.hat) {
    ctx.fillStyle = colors.hat;
    if (direction === 'up') {
      ctx.fillRect(10, wobble - 2, 12, 3);
    } else {
      ctx.fillRect(10, wobble - 1, 12, 3);
      ctx.fillRect(14, wobble - 3, 4, 2);
    }
  }

  // === 眼睛 ===
  ctx.fillStyle = '#000';
  if (state === 'walk') {
    if (direction === 'left') {
      ctx.fillRect(12, 4 + wobble, 1, 2);
      ctx.fillRect(16, 4 + wobble, 1, 2);
    } else if (direction === 'right') {
      ctx.fillRect(14, 4 + wobble, 1, 2);
      ctx.fillRect(18, 4 + wobble, 1, 2);
    } else {
      ctx.fillRect(13, 4 + wobble, 1, 2);
      ctx.fillRect(17, 4 + wobble, 1, 2);
    }
  } else {
    ctx.fillRect(13, 4 + wobble, 1, 2);
    ctx.fillRect(17, 4 + wobble, 1, 2);
  }
}

// ===== Tile 精灵绘制 =====
/**
 * 创建 tile 精灵 ImageBitmap
 * @param {string} type - tile 类型
 * @returns {ImageBitmap}
 */
function createTileSprite(type) {
  var canvas = new OffscreenCanvas(32, 32);
  var ctx = canvas.getContext('2d');

  switch (type) {
    case 'floor_wood':
      ctx.fillStyle = '#8B6914';
      ctx.fillRect(0, 0, 32, 32);
      ctx.fillStyle = '#7A5A10';
      for (var y = 0; y < 32; y += 8) {
        ctx.fillRect(0, y, 32, 1);
      }
      ctx.fillStyle = '#9B7930';
      ctx.fillRect(0, 15, 32, 2);
      break;

    case 'wall_wood':
      ctx.fillStyle = '#5C4033';
      ctx.fillRect(0, 0, 32, 32);
      for (var x = 0; x < 32; x += 8) {
        ctx.fillStyle = '#4A3328';
        ctx.fillRect(x, 0, 2, 32);
      }
      ctx.fillStyle = '#6B5040';
      ctx.fillRect(0, 0, 32, 1);
      ctx.fillRect(0, 31, 32, 1);
      break;

    case 'floor_stone':
      ctx.fillStyle = '#7A7A7A';
      ctx.fillRect(0, 0, 32, 32);
      ctx.fillStyle = '#6E6E6E';
      ctx.fillRect(0, 15, 32, 1);
      ctx.fillRect(15, 0, 1, 32);
      ctx.fillStyle = '#8A8A8A';
      for (var sy = 0; sy < 32; sy += 16) {
        ctx.fillRect(0, sy, 32, 1);
      }
      break;

    case 'table':
      ctx.fillStyle = '#8B6914';
      ctx.fillRect(0, 0, 32, 32);
      ctx.fillStyle = '#6B4E0A';
      ctx.fillRect(2, 2, 28, 28);
      ctx.fillStyle = '#A07830';
      ctx.fillRect(2, 2, 28, 4);
      ctx.fillStyle = '#5C3A0A';
      ctx.fillRect(2, 26, 28, 4);
      ctx.fillRect(2, 2, 3, 28);
      ctx.fillRect(27, 2, 3, 28);
      // 桌腿
      ctx.fillStyle = '#5C3A0A';
      ctx.fillRect(4, 28, 3, 4);
      ctx.fillRect(25, 28, 3, 4);
      break;

    case 'chair':
      ctx.fillStyle = '#6B4E0A';
      ctx.fillRect(6, 8, 20, 16);
      ctx.fillStyle = '#8B6914';
      ctx.fillRect(6, 8, 20, 4);
      ctx.fillStyle = '#5C3A0A';
      ctx.fillRect(6, 20, 3, 12);
      ctx.fillRect(23, 20, 3, 12);
      ctx.fillRect(6, 8, 2, 12);
      ctx.fillRect(24, 8, 2, 12);
      break;

    case 'window':
      ctx.fillStyle = '#3A4A6A';
      ctx.fillRect(0, 0, 32, 32);
      ctx.fillStyle = '#5C4033';
      ctx.fillRect(0, 0, 32, 3);
      ctx.fillRect(0, 29, 32, 3);
      ctx.fillRect(0, 0, 3, 32);
      ctx.fillRect(29, 0, 3, 32);
      ctx.fillStyle = '#87CEEB';
      ctx.fillRect(3, 3, 26, 26);
      ctx.fillStyle = '#5C4033';
      ctx.fillRect(14, 3, 4, 26);
      ctx.fillRect(3, 14, 26, 4);
      break;

    case 'door':
      ctx.fillStyle = '#5C4033';
      ctx.fillRect(0, 0, 32, 32);
      ctx.fillStyle = '#4A3328';
      ctx.fillRect(0, 0, 32, 4);
      ctx.fillRect(0, 28, 32, 4);
      ctx.fillRect(0, 0, 4, 32);
      ctx.fillRect(28, 0, 4, 32);
      ctx.fillStyle = '#8B6914';
      ctx.fillRect(4, 4, 24, 24);
      ctx.fillStyle = '#6B4E0A';
      ctx.fillRect(4, 4, 24, 2);
      ctx.fillRect(4, 14, 24, 2);
      break;

    case 'board':
      ctx.fillStyle = '#8B7355';
      ctx.fillRect(0, 0, 32, 32);
      ctx.fillStyle = '#6B5535';
      ctx.fillRect(2, 2, 28, 28);
      ctx.fillStyle = '#A08060';
      ctx.fillRect(2, 2, 28, 3);
      ctx.fillRect(2, 27, 28, 3);
      ctx.fillRect(2, 2, 3, 28);
      ctx.fillRect(27, 2, 3, 28);
      // 告示内容
      ctx.fillStyle = '#E8D5B0';
      ctx.fillRect(6, 7, 20, 2);
      ctx.fillRect(6, 11, 16, 2);
      ctx.fillRect(6, 15, 18, 2);
      ctx.fillRect(6, 19, 12, 2);
      ctx.fillRect(6, 23, 14, 2);
      break;

    case 'mirror':
      ctx.fillStyle = '#5C4033';
      ctx.fillRect(0, 0, 32, 32);
      ctx.fillStyle = '#8B6914';
      ctx.fillRect(2, 2, 28, 28);
      ctx.fillStyle = '#A0D0F0';
      ctx.fillRect(4, 4, 24, 20);
      ctx.fillStyle = '#88BBE0';
      ctx.fillRect(6, 6, 2, 16);
      ctx.fillRect(22, 8, 2, 12);
      ctx.fillStyle = '#6B4E0A';
      ctx.fillRect(2, 24, 28, 6);
      break;

    case 'lantern':
      ctx.fillStyle = '#3A3A3A';
      ctx.fillRect(14, 0, 4, 6);
      ctx.fillStyle = '#E8A030';
      ctx.fillRect(8, 4, 16, 8);
      ctx.fillStyle = '#FFC040';
      ctx.fillRect(10, 6, 12, 4);
      ctx.fillStyle = '#D09020';
      ctx.fillRect(8, 4, 16, 2);
      ctx.fillRect(10, 12, 12, 3);
      ctx.fillStyle = '#FFE080';
      ctx.fillRect(12, 7, 8, 2);
      break;

    case 'bookshelf':
      ctx.fillStyle = '#5C4033';
      ctx.fillRect(0, 0, 32, 32);
      ctx.fillStyle = '#4A3328';
      ctx.fillRect(0, 0, 32, 2);
      ctx.fillRect(0, 30, 32, 2);
      ctx.fillRect(0, 0, 2, 32);
      ctx.fillRect(30, 0, 2, 32);
      // 书架隔板
      ctx.fillStyle = '#6B5040';
      ctx.fillRect(2, 8, 28, 2);
      ctx.fillRect(2, 16, 28, 2);
      ctx.fillRect(2, 24, 28, 2);
      // 书本
      var bookColors = ['#E07060', '#60A0E0', '#80C070', '#E0C060', '#C080E0', '#E080A0'];
      for (var row = 0; row < 3; row++) {
        var by = 3 + row * 8;
        for (var bx = 4; bx < 28; bx += 5) {
          ctx.fillStyle = bookColors[(row * 6 + bx) % bookColors.length];
          ctx.fillRect(bx, by, 4, 5);
        }
      }
      break;

    case 'counter':
      ctx.fillStyle = '#5C4033';
      ctx.fillRect(0, 0, 32, 32);
      ctx.fillStyle = '#8B6914';
      ctx.fillRect(2, 4, 28, 24);
      ctx.fillStyle = '#6B4E0A';
      ctx.fillRect(2, 4, 28, 3);
      ctx.fillRect(2, 25, 28, 3);
      ctx.fillStyle = '#A07830';
      ctx.fillRect(2, 6, 28, 18);
      // 柜台木纹
      ctx.fillStyle = '#8B6914';
      ctx.fillRect(4, 14, 24, 2);
      ctx.fillRect(4, 20, 24, 1);
      break;

    default:
      ctx.fillStyle = '#FF00FF';
      ctx.fillRect(0, 0, 32, 32);
      ctx.fillStyle = '#000';
      ctx.fillRect(4, 4, 24, 24);
      break;
  }

  return canvas.transferToImageBitmap();
}

// ===== 玩家精灵 =====
/**
 * 创建 4 方向角色精灵
 * @param {object} colors - 配色方案
 * @returns {Promise<object>} { down/up/left/right: { idle: [], walk: [] } }
 */
function createPlayerSprite(colors) {
  var canvas = new OffscreenCanvas(32, 32);
  var ctx = canvas.getContext('2d');
  var directions = ['down', 'up', 'left', 'right'];
  var sprite = {};
  var promises = [];

  directions.forEach(function(dir) {
    sprite[dir] = { idle: [], walk: [] };

    // idle: 第 0 帧
    drawCharacterFrame(ctx, dir, 0, 'idle', colors);
    var idlePromise = createImageBitmap(canvas).then(function(bitmap) {
      sprite[dir].idle[0] = bitmap;
    });
    promises.push(idlePromise);

    // walk: 第 0-2 帧
    for (var f = 0; f < 3; f++) {
      drawCharacterFrame(ctx, dir, f, 'walk', colors);
      (function(d, frame) {
        var walkPromise = createImageBitmap(canvas).then(function(bitmap) {
          sprite[d].walk[frame] = bitmap;
        });
        promises.push(walkPromise);
      })(dir, f);
    }
  });

  return Promise.all(promises).then(function() { return sprite; });
}

// ===== NPC 精灵 =====
/**
 * 创建 NPC 精灵
 * @param {string} type - 'waiter' | 'hero'
 * @returns {Promise<object>} { down/up/left/right: { idle: [], walk: [] } }
 */
function createNPCSprite(type) {
  var colors = NPC_COLORS[type] || NPC_COLORS.waiter;
  return createPlayerSprite(colors);
}
