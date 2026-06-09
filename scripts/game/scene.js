// ===== scene.js — 场景数据与渲染（依赖 sprites.js） =====

/**
 * 完整场景 JSON 数据 — 20×15 tile map
 * 三层: background / objects / collision
 * + interactables + npcs
 */
var SCENE_DATA = {
  name: '驿站大厅',
  width: 20,
  height: 15,
  tileSize: 32,

  tileset: {
    '0':  { type: 'floor_wood',  walkable: true },
    '1':  { type: 'wall_wood',   walkable: false },
    '2':  { type: 'floor_stone', walkable: true },
    '3':  { type: 'table',       walkable: false },
    '4':  { type: 'chair',       walkable: false },
    '5':  { type: 'window',      walkable: false },
    '6':  { type: 'door',        walkable: true },
    '7':  { type: 'board',       walkable: false },
    '8':  { type: 'mirror',      walkable: false },
    '9':  { type: 'lantern',     walkable: true },
    '10': { type: 'bookshelf',   walkable: false },
    '11': { type: 'counter',     walkable: false }
  },

  layers: {
    background: [
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,1,1,1,1,1,1,1,1,6,1,1,1,1,1,1,1,1,1,1]
    ],

    objects: [
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,9,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,9,0,0,0,0,0],
      [0,0,0,0,0,0,3,3,0,0,3,3,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,4,4,0,0,4,4,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,7,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,8,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
    ],

    collision: [
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,1,1,0,0,1,1,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,1,1,0,0,1,1,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1]
    ]
  },

  interactables: [
    {
      id: 'board_wall',
      type: 'board',
      x: 8, y: 6,
      width: 1, height: 1,
      action: 'openSquare',
      label: '告示墙'
    },
    {
      id: 'bronze_mirror',
      type: 'mirror',
      x: 14, y: 11,
      width: 1, height: 1,
      action: 'openProfile',
      label: '铜镜'
    }
  ],

  npcs: [
    {
      id: 'waiter_xiaoer',
      type: 'waiter',
      x: 8, y: 8,
      direction: 'down',
      action: 'openDialog',
      label: '小二哥',
      dialog: '客官有何吩咐？'
    }
  ],

  spawnPoint: { x: 9, y: 13 }
};

// ===== 场景实例 =====
/**
 * 当前加载的场景
 */
var currentScene = null;

/**
 * 异步加载场景：预渲染所有 tile 精灵和背景层
 * @param {object} sceneData - 场景 JSON 数据
 * @returns {Promise<object>} 包含 tileSprites, bgCanvas, objCanvas 的场景对象
 */
function loadScene(sceneData) {
  // 1. 预渲染所有 tile 精灵
  var tileSprites = {};
  for (var id in sceneData.tileset) {
    if (sceneData.tileset.hasOwnProperty(id)) {
      tileSprites[id] = createTileSprite(sceneData.tileset[id].type);
    }
  }

  // 2. 预渲染背景层到离屏 Canvas
  var sceneW = sceneData.width * TILE_SIZE;
  var sceneH = sceneData.height * TILE_SIZE;
  var bgCanvas = new OffscreenCanvas(sceneW, sceneH);
  var bgCtx = bgCanvas.getContext('2d');

  for (var y = 0; y < sceneData.height; y++) {
    for (var x = 0; x < sceneData.width; x++) {
      var tileId = sceneData.layers.background[y][x];
      if (tileSprites[tileId]) {
        bgCtx.drawImage(tileSprites[tileId], x * TILE_SIZE, y * TILE_SIZE);
      }
    }
  }

  // 3. 预渲染物件层到离屏 Canvas
  var objCanvas = new OffscreenCanvas(sceneW, sceneH);
  var objCtx = objCanvas.getContext('2d');

  for (var oy = 0; oy < sceneData.height; oy++) {
    for (var ox = 0; ox < sceneData.width; ox++) {
      var oId = sceneData.layers.objects[oy][ox];
      if (oId !== 0 && tileSprites[oId]) {
        objCtx.drawImage(tileSprites[oId], ox * TILE_SIZE, oy * TILE_SIZE);
      }
    }
  }

  var scene = {
    width: sceneData.width,
    height: sceneData.height,
    tileSize: TILE_SIZE,
    layers: sceneData.layers,
    interactables: sceneData.interactables,
    npcs: sceneData.npcs,
    spawnPoint: sceneData.spawnPoint,
    tileSprites: tileSprites,
    bgCanvas: bgCanvas,
    objCanvas: objCanvas
  };

  currentScene = scene;
  return Promise.resolve(scene);
}

/**
 * 绘制指定层到主 Canvas
 * @param {CanvasRenderingContext2D} ctx - 主 Canvas 2D 上下文
 * @param {string} layerName - 'background' | 'objects'
 * @param {object} scene - 场景对象
 */
function renderLayer(ctx, layerName, scene) {
  if (layerName === 'background' && scene.bgCanvas) {
    ctx.drawImage(scene.bgCanvas, 0, 0);
  } else if (layerName === 'objects' && scene.objCanvas) {
    ctx.drawImage(scene.objCanvas, 0, 0);
  }
}

/**
 * 碰撞查询：指定 tile 坐标是否可行走
 * @param {number} x - tile x 坐标
 * @param {number} y - tile y 坐标
 * @returns {boolean}
 */
function isWalkable(x, y) {
  if (!currentScene) return false;
  var col = Math.floor(x);
  var row = Math.floor(y);
  if (row < 0 || row >= currentScene.height || col < 0 || col >= currentScene.width) {
    return false;
  }
  return currentScene.layers.collision[row][col] === 0;
}

/**
 * 获取指定坐标的交互物件
 * @param {number} x - tile x 坐标
 * @param {number} y - tile y 坐标
 * @returns {object|null} 交互物件或 null
 */
function getInteractable(x, y) {
  if (!currentScene) return null;
  var ix = Math.floor(x);
  var iy = Math.floor(y);

  for (var i = 0; i < currentScene.interactables.length; i++) {
    var obj = currentScene.interactables[i];
    if (ix >= obj.x && ix < obj.x + obj.width &&
        iy >= obj.y && iy < obj.y + obj.height) {
      return obj;
    }
  }

  // 检查物件层：如果该坐标有 tile 且 tile 是可交互的
  if (iy >= 0 && iy < currentScene.height && ix >= 0 && ix < currentScene.width) {
    var tileId = currentScene.layers.objects[iy][ix];
    if (tileId !== 0) {
      for (var j = 0; j < currentScene.interactables.length; j++) {
        var obj2 = currentScene.interactables[j];
        if (obj2.x === ix && obj2.y === iy) {
          return obj2;
        }
      }
    }
  }

  return null;
}

/**
 * 判断玩家附近是否有可交互对象（用于 HUD 提示）
 * @param {number} px - 玩家 tile x
 * @param {number} py - 玩家 tile y
 * @param {Array} npcs - NPC 数组
 * @returns {object|null} { type, label, action }
 */
function getNearbyInteractTarget(px, py, npcs) {
  var targets = getAllNearbyTargets(px, py, npcs);
  return targets.length > 0 ? targets[0] : null;
}

/**
 * 获取玩家附近所有可交互目标（用于 Tab 切换）
 * @param {number} px - 玩家 tile x
 * @param {number} py - 玩家 tile y
 * @param {Array} npcs - NPC 数组
 * @returns {Array} [{ type, label, action, npc?, obj? }]
 */
function getAllNearbyTargets(px, py, npcs) {
  var targets = [];

  // 检查 NPC（曼哈顿距离 ≤ 2 tile）
  if (npcs) {
    for (var i = 0; i < npcs.length; i++) {
      var npc = npcs[i];
      if (npc.canInteract(px, py)) {
        targets.push({ type: 'npc', label: npc.label, action: npc.action, npc: npc });
      }
    }
  }

  // 检查静态交互点（曼哈顿距离 ≤ 2 tile）
  if (currentScene && currentScene.interactables) {
    for (var j = 0; j < currentScene.interactables.length; j++) {
      var obj = currentScene.interactables[j];
      var distX = Math.abs(px - obj.x);
      var distY = Math.abs(py - obj.y);
      if (distX <= 2 && distY <= 2) {
        targets.push({ type: 'interactable', label: obj.label, action: obj.action, obj: obj });
      }
    }
  }

  return targets;
}
