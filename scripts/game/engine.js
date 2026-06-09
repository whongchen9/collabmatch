// ===== engine.js — 游戏主循环（依赖 sprites.js, scene.js, player.js, npc.js, audio.js） =====

/** 游戏顶层状态 */
var GameState = {
  EXPLORE:   'explore',
  DIALOG:    'dialog',
  MENU:      'menu',
  ANIMATION: 'animation'
};

/** 全局游戏状态变量 */
var gameState = GameState.EXPLORE;
var paused = false;
var animationFrameId = null;
var lastTimestamp = 0;

/** Canvas 相关 */
var gameCanvas = null;
var gameCtx = null;

/** 游戏对象 */
var player = null;
var npcs = [];
var scene = null;

/** 输入状态 */
var inputState = {
  up: false,
  down: false,
  left: false,
  right: false,
  interactJustPressed: false
};

/** FPS 统计 */
var fpsFrames = 0;
var fpsTime = 0;
var currentFPS = 60;
var __DEBUG_GAME__ = false;

/** 键位映射 */
var keyMap = {
  'KeyW':     'up',
  'ArrowUp':  'up',
  'KeyA':     'left',
  'ArrowLeft':'left',
  'KeyS':     'down',
  'ArrowDown':'down',
  'KeyD':     'right',
  'ArrowRight':'right',
  'Space':    'interact',
  'KeyE':     'interact',
  'Tab':      'cycleTarget'
};

/** Tab 目标切换状态 */
var nearbyTargets = [];
var currentTargetIndex = -1;

/** 侠客 NPC 管理 */
var heroCheckTimer = 0;
var HERO_CHECK_INTERVAL = 30; // 每 30 秒检查一次匹配 API
var HERO_LIFETIME = 60; // 侠客存在 60 秒后自动淡出
var heroNpcMap = {}; // heroId → NPC 实例

/** 匹配成功动画状态 */
var matchAnimState = null; // { phase, timer, heroNpc, playerStartX, playerStartY, heroStartX, heroStartY }

/** 脚步音效节流 */
var lastInteractHintTime = 0;

// ===== i18n 辅助 =====
function gt(key, fallback) {
  if (typeof window.t === 'function') return window.t(key);
  return fallback || key;
}

// ===== GameBus 事件总线 =====
var _gameBusWrappers = new Map();
var GameBus = {
  emit: function(eventName, detail) {
    window.dispatchEvent(new CustomEvent(eventName, { detail: detail }));
  },
  on: function(eventName, callback) {
    var wrapper = function(e) { callback(e.detail); };
    _gameBusWrappers.set(eventName + ':' + callback, wrapper);
    window.addEventListener(eventName, wrapper);
  },
  off: function(eventName, callback) {
    var key = eventName + ':' + callback;
    var wrapper = _gameBusWrappers.get(key);
    if (wrapper) {
      window.removeEventListener(eventName, wrapper);
      _gameBusWrappers.delete(key);
    }
  }
};

// ===== 输入系统 =====
function setupInput() {
  window.addEventListener('keydown', function(e) {
    var action = keyMap[e.code];
    if (!action) return;

    if (gameState !== GameState.EXPLORE && action !== 'interact' && action !== 'cycleTarget') return;

    e.preventDefault();

    if (action === 'interact') {
      inputState.interactJustPressed = true;
    } else if (action === 'cycleTarget') {
      cycleTarget();
    } else {
      inputState[action] = true;
    }
  });

  window.addEventListener('keyup', function(e) {
    var action = keyMap[e.code];
    if (!action || action === 'interact' || action === 'cycleTarget') return;
    inputState[action] = false;
  });

  // 窗口失焦时重置所有按键
  window.addEventListener('blur', function() {
    inputState.up = false;
    inputState.down = false;
    inputState.left = false;
    inputState.right = false;
    inputState.interactJustPressed = false;
  });
}

// ===== Tab 目标切换 =====
function cycleTarget() {
  if (nearbyTargets.length <= 1) return;
  currentTargetIndex = (currentTargetIndex + 1) % nearbyTargets.length;
}

// ===== 输入处理 =====
function processInput() {
  if (gameState !== GameState.EXPLORE) return;

  // E 键单帧触发
  if (inputState.interactJustPressed) {
    inputState.interactJustPressed = false;
    tryInteract();
  }
}

// ===== 交互触发 =====
function tryInteract() {
  if (!player) return;

  // 刷新附近目标列表
  nearbyTargets = getAllNearbyTargets(player.x, player.y, npcs);
  if (nearbyTargets.length === 0) return;

  // 使用当前高亮目标
  if (currentTargetIndex < 0 || currentTargetIndex >= nearbyTargets.length) {
    currentTargetIndex = 0;
  }
  var target = nearbyTargets[currentTargetIndex];

  if (target.type === 'npc') {
    triggerNPCInteraction(target.npc);
  } else if (target.type === 'interactable') {
    triggerObjectInteraction(target.obj);
  }
}

function triggerNPCInteraction(npc) {
  gameState = GameState.DIALOG;
  pause();
  sfxOpenPanel();

  switch (npc.action) {
    case 'openDialog':
      GameBus.emit('game:openDialog', { npc: npc.id, type: npc.type });
      break;
    case 'openMatchCard':
      GameBus.emit('game:openMatchCard', { npc: npc.id, matchedUser: npc.matchedUser, heroId: npc.id });
      break;
    default:
      GameBus.emit('game:openDialog', { npc: npc.id, type: npc.type });
      break;
  }
}

function triggerObjectInteraction(obj) {
  gameState = GameState.DIALOG;
  pause();
  sfxOpenPanel();

  switch (obj.action) {
    case 'openSquare':
      GameBus.emit('game:openSquare');
      break;
    case 'openProfile':
      GameBus.emit('game:openProfile');
      break;
    default:
      break;
  }
}

// ===== 暂停/恢复 =====
function pause() {
  paused = true;
  // 释放所有按键状态
  inputState.up = false;
  inputState.down = false;
  inputState.left = false;
  inputState.right = false;
  inputState.interactJustPressed = false;
}

function resume() {
  paused = false;
  gameState = GameState.EXPLORE;
  lastTimestamp = performance.now();
}

// ===== 渲染 =====
function render() {
  if (!gameCtx || !scene) return;

  gameCtx.clearRect(0, 0, 640, 480);

  // 第 0 层: 背景层
  renderLayer(gameCtx, 'background', scene);

  // 第 1 层: 物件层
  renderLayer(gameCtx, 'objects', scene);

  // 第 2-3 层: NPC + 玩家 (按 Y 坐标排序)
  var entities = npcs.concat([player]).filter(Boolean);
  entities.sort(function(a, b) { return a.y - b.y; });
  for (var i = 0; i < entities.length; i++) {
    entities[i].render(gameCtx);
  }

  // 第 5 层: HUD
  renderHUD();

  // 第 6 层: 匹配动画特效
  if (gameState === GameState.ANIMATION && matchAnimState) {
    renderMatchAnimationHUD();
  }
}

/**
 * HUD 渲染：检测附近 2 tile 内的 NPC/交互点，绘制交互提示气泡
 */
function renderHUD() {
  if (!player || !gameCtx) return;

  // 刷新附近目标列表
  nearbyTargets = getAllNearbyTargets(player.x, player.y, npcs);
  if (nearbyTargets.length === 0) {
    currentTargetIndex = -1;
    return;
  }

  // 自动选中第一个目标（如果之前没有选中）
  if (currentTargetIndex < 0 || currentTargetIndex >= nearbyTargets.length) {
    currentTargetIndex = 0;
  }

  var target = nearbyTargets[currentTargetIndex];

  // 交互提示出现时播放提示音（节流）
  var now = performance.now() / 1000;
  if (now - lastInteractHintTime > 0.8) {
    // sfxInteract(); // 可能太频繁，先关闭
    lastInteractHintTime = now;
  }

  // 提示文本位置：玩家头顶上方
  var px = Math.round(player.x * TILE_SIZE) + TILE_SIZE / 2;
  var py = Math.round(player.y * TILE_SIZE) - 12;

  var label = (target.type === 'npc' ? target.npc.label : target.label) || gt('game.interact', '交互');
  var text = gt('game.pressInteract', '按 空格 ') + (target.type === 'npc' ? gt('game.talk', '对话') : gt('game.check', '查看')) + ' ' + label;
  if (nearbyTargets.length > 1) {
    text += ' (' + (currentTargetIndex + 1) + '/' + nearbyTargets.length + ' ' + gt('game.tabSwitch', 'Tab切换') + ')';
  }

  gameCtx.save();

  // 气泡背景
  gameCtx.font = '10px "Inter", "PingFang SC", sans-serif';
  var textWidth = gameCtx.measureText(text).width;
  var bubbleWidth = textWidth + 12;
  var bubbleHeight = 18;

  // 确保不超出屏幕
  var bubbleX = Math.max(4, Math.min(px - bubbleWidth / 2, 640 - bubbleWidth - 4));

  gameCtx.fillStyle = 'rgba(0, 0, 0, 0.75)';
  gameCtx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  gameCtx.lineWidth = 1;

  // 圆角矩形
  var rx = 4;
  var ry = 4;
  var bw = bubbleWidth;
  var bh = bubbleHeight;
  var bx = bubbleX;
  var by = py - bh;
  gameCtx.beginPath();
  gameCtx.moveTo(bx + rx, by);
  gameCtx.lineTo(bx + bw - rx, by);
  gameCtx.quadraticCurveTo(bx + bw, by, bx + bw, by + rx);
  gameCtx.lineTo(bx + bw, by + bh - ry);
  gameCtx.quadraticCurveTo(bx + bw, by + bh, bx + bw - rx, by + bh);
  gameCtx.lineTo(bx + rx, by + bh);
  gameCtx.quadraticCurveTo(bx, by + bh, bx, by + bh - ry);
  gameCtx.lineTo(bx, by + rx);
  gameCtx.quadraticCurveTo(bx, by, bx + rx, by);
  gameCtx.closePath();
  gameCtx.fill();
  gameCtx.stroke();

  // 文本
  gameCtx.fillStyle = '#ffffff';
  gameCtx.textAlign = 'center';
  gameCtx.textBaseline = 'middle';
  gameCtx.fillText(text, bx + bw / 2, by + bh / 2);

  gameCtx.restore();
}

/**
 * 匹配成功动画 HUD
 */
function renderMatchAnimationHUD() {
  if (!gameCtx || !matchAnimState) return;

  var phase = matchAnimState.phase;
  var text = '';

  if (phase === 'teleport') {
    text = gt('game.animTeleport', '✨ 传送中...');
  } else if (phase === 'seat') {
    text = gt('game.animSeat', '🪑 入座...');
  } else if (phase === 'toast') {
    text = gt('game.animToast', '🍻 举杯共饮！');
  }

  if (!text) return;

  gameCtx.save();
  gameCtx.font = 'bold 16px "Inter", "PingFang SC", sans-serif';
  gameCtx.textAlign = 'center';
  gameCtx.textBaseline = 'middle';

  // 半透明背景
  var tw = gameCtx.measureText(text).width + 24;
  var bx = 320 - tw / 2;
  var by = 200;
  var bw = tw;
  var bh = 36;
  var br = 8;
  gameCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  gameCtx.beginPath();
  gameCtx.moveTo(bx + br, by);
  gameCtx.lineTo(bx + bw - br, by);
  gameCtx.quadraticCurveTo(bx + bw, by, bx + bw, by + br);
  gameCtx.lineTo(bx + bw, by + bh - br);
  gameCtx.quadraticCurveTo(bx + bw, by + bh, bx + bw - br, by + bh);
  gameCtx.lineTo(bx + br, by + bh);
  gameCtx.quadraticCurveTo(bx, by + bh, bx, by + bh - br);
  gameCtx.lineTo(bx, by + br);
  gameCtx.quadraticCurveTo(bx, by, bx + br, by);
  gameCtx.closePath();
  gameCtx.fill();

  // 文字
  gameCtx.fillStyle = '#FFD700';
  gameCtx.fillText(text, 320, 218);
  gameCtx.restore();
}

// ===== FPS 监控 =====
function updateFPS(timestamp) {
  fpsFrames++;
  if (timestamp - fpsTime >= 1000) {
    currentFPS = Math.round(fpsFrames / ((timestamp - fpsTime) / 1000));
    fpsFrames = 0;
    fpsTime = timestamp;

    if (__DEBUG_GAME__) {
      console.log('FPS: ' + currentFPS + ', Frame time: ' + (1000 / currentFPS).toFixed(1) + 'ms');
    }
  }
}

// ===== 游戏主循环 =====
function gameLoop(timestamp) {
  animationFrameId = requestAnimationFrame(gameLoop);

  if (paused) return;

  // dt 上限 50ms 防跳帧
  var dt = Math.min((timestamp - lastTimestamp) / 1000, 0.05);
  lastTimestamp = timestamp;

  // 1. 处理输入
  processInput();

  // 2. 更新游戏逻辑
  if (gameState === GameState.EXPLORE) {
    if (player) player.update(dt, inputState);
    for (var i = 0; i < npcs.length; i++) {
      npcs[i].update(dt);
    }
    // 清理已淡出的侠客
    for (var ni = npcs.length - 1; ni >= 0; ni--) {
      if (npcs[ni].isGone && npcs[ni].isGone()) {
        delete heroNpcMap[npcs[ni].id];
        npcs.splice(ni, 1);
      }
    }
    // 侠客生命周期倒计时
    for (var hi = 0; hi < npcs.length; hi++) {
      if (npcs[hi].type === 'hero' && !npcs[hi].fadeOut) {
        npcs[hi].spawnTimer -= dt;
        if (npcs[hi].spawnTimer <= 0) {
          npcs[hi].fadeOut = true;
        }
      }
    }
    // 定期检查匹配 API 生成侠客
    heroCheckTimer += dt;
    if (heroCheckTimer >= HERO_CHECK_INTERVAL) {
      heroCheckTimer = 0;
      checkAndSpawnHeroes();
    }
  } else if (gameState === GameState.ANIMATION) {
    updateMatchAnimation(dt);
  }

  // 3. 渲染
  render();

  // 4. FPS 统计
  updateFPS(timestamp);
}

// ===== 初始化 =====
/**
 * 初始化游戏
 * @param {string} canvasId - Canvas 元素 ID
 */
function initGame(canvasId) {
  gameCanvas = document.getElementById(canvasId);
  if (!gameCanvas) {
    console.error('[Game] Canvas element not found: ' + canvasId);
    return;
  }

  gameCanvas.width = 640;
  gameCanvas.height = 480;
  gameCanvas.style.imageRendering = 'pixelated';
  gameCtx = gameCanvas.getContext('2d');

  setupInput();

  // 异步加载场景和精灵
  loadScene(SCENE_DATA).then(function(loadedScene) {
    scene = loadedScene;

    // 创建玩家精灵
    return createPlayerSprite(PLAYER_COLORS).then(function(playerSprite) {
      // 创建 NPC 精灵 (并行)
      var npcPromises = [];
      for (var i = 0; i < scene.npcs.length; i++) {
        var npcData = scene.npcs[i];
        (function(npcData) {
        npcPromises.push(
          createNPCSprite(npcData.type).then(function(sprite) {
            return new NPC({
              id: npcData.id,
              x: npcData.x,
              y: npcData.y,
              type: npcData.type,
              direction: npcData.direction,
              sprite: sprite,
              action: npcData.action,
              label: npcData.label,
              dialog: npcData.dialog
            });
          })
        );
      })(npcData);
      }

      // 创建玩家
      player = new Player(scene.spawnPoint.x, scene.spawnPoint.y, playerSprite);

      return Promise.all(npcPromises).then(function(npcInstances) {
        npcs = npcInstances;

        // 启动游戏循环
        lastTimestamp = performance.now();
        fpsTime = performance.now();
        gameLoop(performance.now());
      });
    });
  });
}

// ===== 游戏循环控制（供外部调用） =====
// 这些函数作为全局函数暴露，供 index.html 中的 exitGameMode/enterGameMode 调用

/**
 * 恢复游戏循环（对外接口）
 */
function resumeGameLoop() {
  if (paused) {
    resume();
  }
  if (!animationFrameId) {
    lastTimestamp = performance.now();
    gameLoop(performance.now());
  }
}

/**
 * 停止游戏循环（对外接口，退出时清理 RAF）
 */
function stopGameLoop() {
  pause();
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  // 清理侠客
  heroNpcMap = {};
  heroCheckTimer = 0;
}

// ===== 侠客 NPC 动态生成 =====
/**
 * 检查匹配 API 并生成侠客 NPC
 */
function checkAndSpawnHeroes() {
  if (typeof CollabApi === 'undefined' || !CollabApi.fetchMatchUsers) return;

  CollabApi.fetchMatchUsers().then(function(matchResult) {
    if (!matchResult || !matchResult.users) return;
    var matchedUsers = matchResult.users;
    // 最多同时 3 个侠客
    var currentHeroCount = 0;
    for (var k = 0; k < npcs.length; k++) {
      if (npcs[k].type === 'hero') currentHeroCount++;
    }
    var slotsLeft = 3 - currentHeroCount;
    if (slotsLeft <= 0) return;

    for (var i = 0; i < matchedUsers.length && slotsLeft > 0; i++) {
      var user = matchedUsers[i];
      var heroId = 'hero_' + user.id;
      // 避免重复生成
      if (heroNpcMap[heroId]) continue;
      spawnHeroNpc(heroId, user);
      slotsLeft--;
    }
  }).catch(function() {
    // 静默忽略 API 错误
  });
}

/**
 * 生成一个侠客 NPC
 * @param {string} heroId - 唯一 ID
 * @param {object} matchedUser - 匹配用户信息 { id, name, position, matchPct }
 */
function spawnHeroNpc(heroId, matchedUser) {
  // 同步设置占位标记，防止异步竞态重复生成
  heroNpcMap[heroId] = true;

  // 在场景中找一个可行走的随机位置
  var spawnPos = findRandomWalkablePos();
  if (!spawnPos) {
    delete heroNpcMap[heroId];
    return;
  }

  createNPCSprite('hero').then(function(sprite) {
    var heroNpc = new NPC({
      id: heroId,
      x: spawnPos.x,
      y: spawnPos.y,
      type: 'hero',
      direction: 'down',
      sprite: sprite,
      action: 'openMatchCard',
      label: matchedUser.name || '侠客',
      matchedUser: matchedUser,
      spawnTimer: HERO_LIFETIME
    });
    npcs.push(heroNpc);
    heroNpcMap[heroId] = heroNpc;
  }).catch(function() {
    delete heroNpcMap[heroId];
  });
}

/**
 * 在场景中找一个随机可行走位置（避开墙、物件、已有 NPC）
 * @returns {{ x: number, y: number }|null}
 */
function findRandomWalkablePos() {
  if (!currentScene) return null;
  // 预定义几个合适的侠客出现位置（避开交互点和 NPC）
  var candidatePos = [
    { x: 3, y: 5 }, { x: 5, y: 9 }, { x: 12, y: 5 },
    { x: 16, y: 9 }, { x: 3, y: 12 }, { x: 16, y: 12 },
    { x: 12, y: 9 }, { x: 5, y: 12 }
  ];
  // 过滤：可行走 + 不与玩家/NPC 重叠
  var valid = [];
  for (var i = 0; i < candidatePos.length; i++) {
    var p = candidatePos[i];
    if (!isWalkable(p.x, p.y)) continue;
    // 不与玩家太近（≥3 tile）
    if (player && Math.abs(player.x - p.x) + Math.abs(player.y - p.y) < 3) continue;
    // 不与已有 NPC 重叠
    var overlap = false;
    for (var j = 0; j < npcs.length; j++) {
      if (Math.abs(npcs[j].x - p.x) < 1 && Math.abs(npcs[j].y - p.y) < 1) {
        overlap = true;
        break;
      }
    }
    if (!overlap) valid.push(p);
  }
  if (valid.length === 0) return null;
  return valid[Math.floor(Math.random() * valid.length)];
}

// ===== 匹配成功动画（F8） =====
// 酒桌位置（左侧酒桌: x=6-7, y=3-4）
var TABLE_SEAT_PLAYER = { x: 6, y: 5 };
var TABLE_SEAT_HERO = { x: 7, y: 5 };

/**
 * 启动匹配成功动画
 * @param {string} heroId - 侠客 NPC 的 ID
 */
function startMatchAnimation(heroId) {
  var heroNpc = heroNpcMap[heroId];
  if (!heroNpc || !player) return;

  matchAnimState = {
    phase: 'teleport', // teleport → seat → toast → done
    timer: 0,
    heroNpc: heroNpc,
    playerTargetX: TABLE_SEAT_PLAYER.x,
    playerTargetY: TABLE_SEAT_PLAYER.y,
    heroTargetX: TABLE_SEAT_HERO.x,
    heroTargetY: TABLE_SEAT_HERO.y
  };

  gameState = GameState.ANIMATION;
  // 传送玩家和侠客到酒桌
  player.teleport(TABLE_SEAT_PLAYER.x, TABLE_SEAT_PLAYER.y);
  player.direction = 'up';
  player.state = 'idle';
  heroNpc.x = TABLE_SEAT_HERO.x;
  heroNpc.y = TABLE_SEAT_HERO.y;
  heroNpc.direction = 'up';
}

/**
 * 更新匹配动画
 * @param {number} dt - 帧间隔（秒）
 */
function updateMatchAnimation(dt) {
  if (!matchAnimState) return;
  matchAnimState.timer += dt;

  var phase = matchAnimState.phase;
  var t = matchAnimState.timer;

  if (phase === 'teleport' && t > 0.5) {
    // 传送完成，进入入座阶段
    matchAnimState.phase = 'seat';
    matchAnimState.timer = 0;
  } else if (phase === 'seat' && t > 0.8) {
    // 入座完成，举杯
    matchAnimState.phase = 'toast';
    matchAnimState.timer = 0;
    if (typeof sfxMatchSuccess === 'function') sfxMatchSuccess();
  } else if (phase === 'toast' && t > 2.0) {
    // 动画结束
    matchAnimState.phase = 'done';
    matchAnimState.timer = 0;
    // 通知外部跳转群组
    GameBus.emit('game:matchAnimationDone', {
      heroId: matchAnimState.heroNpc.id,
      matchedUser: matchAnimState.heroNpc.matchedUser
    });
    // 清理侠客
    matchAnimState.heroNpc.fadeOut = true;
    matchAnimState = null;
    gameState = GameState.EXPLORE;
  }
}

