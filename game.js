(() => {
  "use strict";

  const SAVE_KEY = "molegame-forest-save-v1";
  const LEADERBOARD_SESSION_KEY = "molegame-supabase-session-v1";
  const ACTION_BASE_MS = 4200;
  const MAX_LOGS = 14;

  const ITEMS = {
    twig: { name: "橡木细枝", icon: "🪵", type: "material", value: 2 },
    stone: { name: "圆润石子", icon: "🪨", type: "material", value: 2 },
    moss: { name: "月光苔", icon: "🌿", type: "material", value: 4 },
    mushroom: { name: "蜜顶菇", icon: "🍄", type: "food", value: 5 },
    berry: { name: "林间莓果", icon: "🫐", type: "food", value: 3 },
    amber: { name: "凝露琥珀", icon: "🔶", type: "treasure", value: 16, rare: true },
    acornIdol: { name: "松果偶像", icon: "🏺", type: "treasure", value: 25, rare: true },
    feather: { name: "翠鸟羽", icon: "🪶", type: "treasure", value: 10 },
    bolt: { name: "黄铜螺栓", icon: "🔩", type: "material", value: 3 },
    copperWire: { name: "旧铜线圈", icon: "🧵", type: "material", value: 5 },
    metroToken: { name: "地铁代币", icon: "🪙", type: "treasure", value: 12 },
    neonChip: { name: "霓虹芯片", icon: "💾", type: "treasure", value: 28, rare: true },
    cannedBerry: { name: "莓果罐头", icon: "🥫", type: "food", value: 7 },
    giantLeaf: { name: "巨叶纤维", icon: "🍃", type: "material", value: 4 },
    orchid: { name: "夜光兰", icon: "🌺", type: "material", value: 8 },
    jungleFruit: { name: "雨林甜果", icon: "🥭", type: "food", value: 7 },
    sunCrystal: { name: "太阳晶石", icon: "💎", type: "treasure", value: 30, rare: true },
    relicMask: { name: "古老兽面", icon: "🎭", type: "treasure", value: 38, rare: true },
  };

  const MAPS = {
    forest: {
      name: "苔影森林",
      chapter: "第一章 · 苔影森林",
      title: "泥土之下，<em>万物皆有回响。</em>",
      copy: "在古树与溪流之间寻找宝藏，小心森林居民守护的领地。",
      weather: ["☀", "林间晴日", "挖掘速度 +8%"],
      eventLabel: "林间动静",
      zones: [["♣", "旧树根"], ["♨", "萤火溪"], ["♜", "古树心"]],
      calm: ["🦋", "林间微风", "蝴蝶在光斑间飞舞，森林暂时没有危险。"],
      palette: ["#8da977", "#789660", "#648354", "rgba(211,196,139,.22)"],
      loot: ["acornIdol", "amber", "feather", "mushroom", "berry", "moss", "stone", "twig"],
    },
    city: {
      name: "齿轮城市",
      chapter: "第二章 · 齿轮城市",
      title: "灯火之间，<em>废墟也会发光。</em>",
      copy: "钻过街巷、工坊与废弃地铁，在城市地底收集被遗忘的机械宝物。",
      weather: ["☁", "薄雾黄昏", "稀有材料 +6%"],
      eventLabel: "街巷信号",
      zones: [["▦", "旧钟街"], ["⚙", "齿轮坊"], ["▣", "末班地铁"]],
      calm: ["🐦", "屋檐回声", "鸽群掠过旧钟楼，街巷暂时安静。"],
      palette: ["#87999f", "#71858c", "#5d737b", "rgba(224,196,133,.2)"],
      loot: ["neonChip", "metroToken", "feather", "cannedBerry", "copperWire", "bolt", "stone", "twig"],
    },
    rainforest: {
      name: "翡翠雨林",
      chapter: "第三章 · 翡翠雨林",
      title: "雨幕深处，<em>遗迹仍在呼吸。</em>",
      copy: "沿着藤蔓深入潮湿雨林，在巨叶和古老遗迹下寻找失落文明的珍宝。",
      weather: ["☂", "温暖阵雨", "宝物经验 +10%"],
      eventLabel: "雨幕异响",
      zones: [["❧", "巨叶谷"], ["≈", "月虹瀑"], ["◈", "太阳遗迹"]],
      calm: ["🦜", "雨声渐远", "彩羽鸟停在藤蔓上，雨林恢复了片刻平静。"],
      palette: ["#5f9b6d", "#438058", "#2f6747", "rgba(191,166,91,.2)"],
      loot: ["relicMask", "sunCrystal", "orchid", "jungleFruit", "giantLeaf", "moss", "stone", "twig"],
    },
  };

  const SKILLS = {
    digger: {
      name: "掘土诀窍",
      icon: "⛏️",
      desc: "每级提升 10% 挖掘速度",
      max: 5,
    },
    fighter: {
      name: "勇敢亮爪",
      icon: "⚔️",
      desc: "每级提升 3 点战斗爪力",
      max: 5,
    },
    forager: {
      name: "寻宝鼻尖",
      icon: "🍀",
      desc: "每级提高稀有发现概率",
      max: 5,
    },
  };

  const ENEMIES = [
    { map: "forest", name: "尖牙野鼠", emoji: "🐀", hp: 28, attack: 5, xp: 15, coins: 8 },
    { map: "forest", name: "护巢黄蜂", emoji: "🐝", hp: 22, attack: 6, xp: 13, coins: 7 },
    { map: "forest", name: "林地獾", emoji: "🦡", hp: 42, attack: 8, xp: 22, coins: 12, minLevel: 3 },
    { map: "forest", name: "迷路野猪", emoji: "🐗", hp: 58, attack: 10, xp: 30, coins: 18, minLevel: 5 },
    { map: "city", name: "下水道鼠王", emoji: "🐀", hp: 32, attack: 6, xp: 17, coins: 10 },
    { map: "city", name: "失控清扫机", emoji: "🤖", hp: 38, attack: 7, xp: 21, coins: 13 },
    { map: "city", name: "护院恶犬", emoji: "🐕", hp: 52, attack: 9, xp: 27, coins: 17, minLevel: 3 },
    { map: "city", name: "地铁蝙蝠", emoji: "🦇", hp: 45, attack: 10, xp: 29, coins: 19, minLevel: 5 },
    { map: "rainforest", name: "箭毒蛙", emoji: "🐸", hp: 34, attack: 7, xp: 19, coins: 11 },
    { map: "rainforest", name: "藤冠巨蟒", emoji: "🐍", hp: 48, attack: 9, xp: 26, coins: 16 },
    { map: "rainforest", name: "遗迹猕猴", emoji: "🐒", hp: 44, attack: 8, xp: 24, coins: 15, minLevel: 3 },
    { map: "rainforest", name: "雨林猎豹", emoji: "🐆", hp: 66, attack: 12, xp: 36, coins: 24, minLevel: 5 },
  ];

  const defaultState = {
    level: 1,
    xp: 0,
    hp: 100,
    coins: 18,
    sprouts: 0,
    basePower: 8,
    defense: 3,
    luck: 5,
    depth: 1,
    inventory: {},
    bagCapacity: 20,
    skillPoints: 0,
    skills: { digger: 0, fighter: 0, forager: 0 },
    dropped: {},
    logs: [],
    paused: false,
    autoBattle: true,
    activeZone: 0,
    actionProgress: 0,
    lastSavedAt: Date.now(),
    totalDigs: 0,
    sound: true,
    playerName: "栗团",
    activeMap: "forest",
  };

  let state = loadState();
  let mode = "digging";
  let enemy = null;
  let lastFrame = performance.now();
  let battleTimer = 0;
  let saveTimer = 0;
  let leaderboardTimer = 0;
  let activeFilter = "all";
  let audioContext = null;
  let leaderboardSession = null;
  let leaderboardRows = [];
  let worldContext = null;
  const WORLD_SIZE = 520;
  const world = {
    time: 0,
    healTimer: 0,
    mole: { x: 82, y: 420, targetX: 82, targetY: 420, phase: "walk", facing: 1 },
    digSpots: [],
    decorations: [],
    allies: [
      { type: "firefly", name: "萤萤", emoji: "✨", x: 65, y: 390, angle: 0 },
      { type: "hedgehog", name: "刺团", emoji: "🦔", x: 110, y: 438, targetX: 150, targetY: 430, angle: 2 },
    ],
    enemies: [],
    engagedEnemy: null,
  };

  const $ = (id) => document.getElementById(id);
  const elements = {
    coins: $("coins"),
    sprouts: $("sprouts"),
    headerHp: $("header-hp"),
    level: $("level"),
    xpLabel: $("xp-label"),
    xpBar: $("xp-bar"),
    power: $("power"),
    defense: $("defense"),
    luck: $("luck"),
    hpLabel: $("hp-label"),
    hpBar: $("hp-bar"),
    upgradeCost: $("upgrade-cost"),
    depth: $("depth"),
    mapChapter: $("map-chapter"),
    mapHeroTitle: $("map-hero-title"),
    mapHeroCopy: $("map-hero-copy"),
    weatherIcon: $("weather-icon"),
    weatherName: $("weather-name"),
    weatherBonus: $("weather-bonus"),
    currentZoneTitle: $("current-zone-title"),
    eventOverline: $("event-overline"),
    activityIcon: $("activity-icon"),
    activityTitle: $("activity-title"),
    activitySubtitle: $("activity-subtitle"),
    timeLeft: $("time-left"),
    digBar: $("dig-bar"),
    routeLine: $("route-line"),
    forestScene: $("forest-scene"),
    worldCanvas: $("world-canvas"),
    aiState: $("ai-state"),
    findPop: $("find-pop"),
    droppedPile: $("dropped-pile"),
    pauseButton: $("pause-button"),
    autoBattle: $("auto-battle"),
    eventCard: $("event-card"),
    eventHeading: $("event-heading"),
    eventBadge: $("event-badge"),
    enemyEmoji: $("enemy-emoji"),
    eventDescription: $("event-description"),
    eventAction: $("event-action"),
    fleeAction: $("flee-action"),
    battleArea: $("battle-area"),
    battlePlayerBar: $("battle-player-bar"),
    battlePlayerHp: $("battle-player-hp"),
    enemyName: $("enemy-name"),
    enemyBar: $("enemy-bar"),
    enemyHp: $("enemy-hp"),
    journalList: $("journal-list"),
    bagCount: $("bag-count"),
    bagCapacity: $("bag-capacity"),
    inventoryGrid: $("inventory-grid"),
    skillPoints: $("skill-points"),
    skillList: $("skill-list"),
    toastStack: $("toast-stack"),
    helpModal: $("help-modal"),
    soundButton: $("sound-button"),
    playerName: $("player-name"),
    myRank: $("my-rank"),
    rankLevel: $("rank-level"),
    rankDepth: $("rank-depth"),
    leaderboardStatus: $("leaderboard-status"),
    leaderboardBody: $("leaderboard-body"),
  };

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (!saved) return structuredClone(defaultState);
      return {
        ...structuredClone(defaultState),
        ...saved,
        inventory: { ...saved.inventory },
        dropped: { ...saved.dropped },
        skills: { ...defaultState.skills, ...saved.skills },
        logs: Array.isArray(saved.logs) ? saved.logs : [],
      };
    } catch {
      return structuredClone(defaultState);
    }
  }

  function saveState() {
    state.lastSavedAt = Date.now();
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  }

  function leaderboardConfig() {
    const config = window.MOLE_GAME_CONFIG || {};
    return {
      url: String(config.supabaseUrl || "").replace(/\/$/, ""),
      key: String(config.supabaseAnonKey || ""),
    };
  }

  function setLeaderboardStatus(message, type = "") {
    elements.leaderboardStatus.textContent = message;
    elements.leaderboardStatus.className = `leaderboard-status ${type}`;
  }

  async function supabaseRequest(path, options = {}, useSession = false) {
    const config = leaderboardConfig();
    if (!config.url || !config.key) throw new Error("排行榜尚未配置");
    const headers = {
      apikey: config.key,
      "Content-Type": "application/json",
      ...options.headers,
    };
    if (useSession) {
      const session = await getLeaderboardSession();
      headers.Authorization = `Bearer ${session.access_token}`;
    } else {
      headers.Authorization = `Bearer ${config.key}`;
    }
    const response = await fetch(`${config.url}${path}`, { ...options, headers });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(detail || `请求失败 (${response.status})`);
    }
    if (response.status === 204 || response.headers.get("content-length") === "0") return null;
    return response.json();
  }

  async function getLeaderboardSession() {
    if (leaderboardSession?.access_token && leaderboardSession.expires_at * 1000 > Date.now() + 60000) {
      return leaderboardSession;
    }
    try {
      leaderboardSession ||= JSON.parse(localStorage.getItem(LEADERBOARD_SESSION_KEY));
    } catch {
      leaderboardSession = null;
    }
    const config = leaderboardConfig();
    if (leaderboardSession?.refresh_token) {
      try {
        const refreshed = await fetch(`${config.url}/auth/v1/token?grant_type=refresh_token`, {
          method: "POST",
          headers: { apikey: config.key, "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: leaderboardSession.refresh_token }),
        });
        if (refreshed.ok) {
          leaderboardSession = await refreshed.json();
          leaderboardSession.expires_at ||= Math.floor(Date.now() / 1000) + leaderboardSession.expires_in;
          localStorage.setItem(LEADERBOARD_SESSION_KEY, JSON.stringify(leaderboardSession));
          return leaderboardSession;
        }
      } catch {
        leaderboardSession = null;
      }
    }
    const response = await fetch(`${config.url}/auth/v1/signup`, {
      method: "POST",
      headers: { apikey: config.key, "Content-Type": "application/json" },
      body: "{}",
    });
    if (!response.ok) throw new Error("匿名登录失败，请在 Supabase 中启用 Anonymous Sign-Ins");
    leaderboardSession = await response.json();
    leaderboardSession.expires_at ||= Math.floor(Date.now() / 1000) + leaderboardSession.expires_in;
    localStorage.setItem(LEADERBOARD_SESSION_KEY, JSON.stringify(leaderboardSession));
    return leaderboardSession;
  }

  async function submitScore(silent = false) {
    try {
      if (!silent) setLeaderboardStatus("正在同步你的森林探索记录……");
      const session = await getLeaderboardSession();
      await supabaseRequest("/rest/v1/leaderboard?on_conflict=user_id", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify({
          user_id: session.user.id,
          player_name: state.playerName,
          level: state.level,
          depth: state.depth,
          total_digs: state.totalDigs,
          updated_at: new Date().toISOString(),
        }),
      }, true);
      await loadLeaderboard();
      if (!silent) toast("排行榜记录已更新", "gold");
    } catch (error) {
      setLeaderboardStatus(`排行榜连接失败：${friendlyLeaderboardError(error)}`, "error");
    }
  }

  async function loadLeaderboard() {
    try {
      leaderboardRows = await supabaseRequest(
        "/rest/v1/leaderboard?select=user_id,player_name,level,depth,total_digs,score&order=score.desc&limit=50",
      );
      renderLeaderboard();
      setLeaderboardStatus("已连接 · 展示全服综合排名前 50 名", "online");
    } catch (error) {
      setLeaderboardStatus(`排行榜连接失败：${friendlyLeaderboardError(error)}`, "error");
    }
  }

  function friendlyLeaderboardError(error) {
    if (error.message === "排行榜尚未配置") return "等待管理员配置云数据库";
    if (/Failed to fetch/i.test(error.message)) return "网络暂时不可用";
    return error.message.length > 90 ? "云数据库配置不完整" : error.message;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
    })[character]);
  }

  function renderLeaderboard() {
    const userId = leaderboardSession?.user?.id;
    const ownIndex = leaderboardRows.findIndex((row) => row.user_id === userId);
    elements.myRank.textContent = ownIndex >= 0 ? `#${ownIndex + 1}` : "50+";
    if (!leaderboardRows.length) {
      elements.leaderboardBody.innerHTML = '<tr><td colspan="5" class="rank-empty">还没有探险记录，成为第一只上榜的鼹鼠吧！</td></tr>';
      return;
    }
    elements.leaderboardBody.innerHTML = leaderboardRows.map((row, index) => `
      <tr class="${row.user_id === userId ? "is-me" : ""}">
        <td><span class="rank-number ${index < 3 ? "top" : ""}">${index < 3 ? ["🥇", "🥈", "🥉"][index] : `#${index + 1}`}</span></td>
        <td><span class="rank-player"><i class="rank-avatar">🐾</i>${escapeHtml(row.player_name)}</span></td>
        <td>Lv.${row.level}</td>
        <td>${formatNumber(row.depth)}m</td>
        <td>${formatNumber(row.total_digs)}</td>
      </tr>
    `).join("");
  }

  async function initLeaderboard() {
    elements.playerName.value = state.playerName;
    const config = leaderboardConfig();
    if (!config.url || !config.key) {
      setLeaderboardStatus("排行榜等待 Supabase 配置，游戏的本地进度不受影响。");
      return;
    }
    await submitScore(true);
  }

  function xpNeeded(level = state.level) {
    return Math.round(50 + level * level * 10);
  }

  function maxHp() {
    return 100 + (state.level - 1) * 12;
  }

  function totalPower() {
    return state.basePower + state.skills.fighter * 3 + Math.floor((state.level - 1) * 1.5);
  }

  function totalDefense() {
    return state.defense + Math.floor((state.level - 1) / 2);
  }

  function totalLuck() {
    return state.luck + state.skills.forager * 4;
  }

  function bagCount() {
    return Object.values(state.inventory).reduce((sum, count) => sum + count, 0);
  }

  function formatNumber(value) {
    return Math.floor(value).toLocaleString("zh-CN");
  }

  function addXp(amount) {
    state.xp += amount;
    let leveled = false;
    while (state.xp >= xpNeeded()) {
      state.xp -= xpNeeded();
      state.level += 1;
      state.skillPoints += 1;
      state.sprouts += 1;
      state.hp = maxHp();
      leveled = true;
      log(`长到了 <b>Lv.${state.level}</b>，获得 1 个技能点和 1 枚嫩芽。`);
      toast(`升级！现在是 Lv.${state.level}`, "gold");
      beep(660, 0.14);
      setTimeout(() => beep(880, 0.16), 110);
    }
    if (leveled) unlockZones();
  }

  function addItem(id, amount = 1, silent = false) {
    const room = Math.max(0, state.bagCapacity - bagCount());
    const added = Math.min(room, amount);
    if (added > 0) {
      state.inventory[id] = (state.inventory[id] || 0) + added;
      if (!silent) {
        showFind(`${ITEMS[id].icon} ${ITEMS[id].name} ×${added}`);
        toast(`发现 ${ITEMS[id].name} ×${added}`, ITEMS[id].rare ? "gold" : "");
      }
    }
    if (added < amount && !silent) toast("背包满了，剩余物品留在土里", "red");
    return added;
  }

  function removeItem(id, amount) {
    state.inventory[id] = Math.max(0, (state.inventory[id] || 0) - amount);
    if (!state.inventory[id]) delete state.inventory[id];
  }

  function rollLoot(offline = false) {
    const zoneBonus = state.activeZone * 0.07;
    const rareChance = 0.035 + totalLuck() * 0.003 + zoneBonus;
    const roll = Math.random();
    const pool = MAPS[state.activeMap].loot;
    let id;
    if (roll < rareChance * 0.35) id = pool[0];
    else if (roll < rareChance) id = pool[1];
    else if (roll < 0.18 + zoneBonus) id = pool[2];
    else if (roll < 0.36) id = pool[3];
    else if (roll < 0.52) id = pool[4];
    else if (roll < 0.72) id = pool[5];
    else if (roll < 0.87) id = pool[6];
    else id = pool[7];
    addItem(id, 1, offline);
    return id;
  }

  function completeDig() {
    state.totalDigs += 1;
    state.depth += 1 + state.activeZone;
    const coins = 2 + Math.floor(Math.random() * (4 + state.activeZone * 2));
    state.coins += coins;
    addXp(5 + state.activeZone * 2);
    const itemId = rollLoot();
    log(`在 ${state.depth}m 处挖到 <b>${ITEMS[itemId].name}</b>，还有 ${coins} 枚松果币。`);
    beep(430, 0.06);
    state.actionProgress = 0;
    finishWorldDig();

    if (Math.random() < 0.09) {
      const heal = Math.min(maxHp() - state.hp, 8 + Math.floor(Math.random() * 8));
      if (heal > 0) {
        const friends = {
          forest: ["🐿️", "友善的花栗鼠", "花栗鼠从树杈上丢来一把新鲜莓果"],
          city: ["🐈", "屋顶流浪猫", "流浪猫领着栗团找到了一罐完好的食物"],
          rainforest: ["🦥", "慢吞吞的树懒", "树懒分享了一枚香甜的雨林果实"],
        };
        const [friendEmoji, friendName, friendStory] = friends[state.activeMap];
        state.hp += heal;
        log(`遇见了 <b>${friendName}</b>，恢复了 ${heal} 点活力。`);
        showCalmEvent(friendEmoji, friendName, `${friendStory}，恢复了 ${heal} 点活力。`);
      }
    } else {
      showCalmEvent(...MAPS[state.activeMap].calm);
    }
    render();
  }

  function availableEnemies() {
    return ENEMIES.filter(
      (candidate) => candidate.map === state.activeMap && (!candidate.minLevel || state.level >= candidate.minLevel),
    );
  }

  function startEncounter(encounterTemplate = null) {
    const templates = availableEnemies();
    const base = encounterTemplate || templates[Math.floor(Math.random() * templates.length)];
    const scale = 1 + state.activeZone * 0.3 + Math.max(0, state.level - 1) * 0.07;
    enemy = {
      ...base,
      maxHp: Math.round(base.hp * scale),
      currentHp: Math.round(base.hp * scale),
      attack: Math.round(base.attack * (1 + state.activeZone * 0.2)),
    };
    mode = "battle";
    battleTimer = 0;
    elements.forestScene.classList.add("battle");
    elements.eventCard.classList.add("danger");
    elements.eventHeading.textContent = enemy.name;
    elements.eventBadge.textContent = "遭遇战";
    elements.enemyEmoji.textContent = enemy.emoji;
    elements.eventDescription.textContent = `${enemy.name}挡住了地下通道。战胜它，或暂时绕开。`;
    elements.battleArea.classList.remove("hidden");
    elements.fleeAction.classList.remove("hidden");
    elements.eventAction.disabled = false;
    elements.eventAction.textContent = state.autoBattle ? "奋力一击" : "迎战";
    log(`遭遇了 <b>${enemy.name}</b>！`);
    toast(`遭遇 ${enemy.name}`, "red");
    beep(180, 0.15);
    updateActivity();
  }

  function battleRound() {
    if (!enemy || mode !== "battle") return;
    const critical = Math.random() < 0.08 + totalLuck() * 0.002;
    const allyDamage = 2 + Math.floor(state.level / 3);
    const damage = Math.max(1, Math.round(totalPower() * (0.78 + Math.random() * 0.42) * (critical ? 1.75 : 1) + allyDamage));
    enemy.currentHp = Math.max(0, enemy.currentHp - damage);
    if (critical) toast(`会心一爪！-${damage}`, "gold");
    else showFind(`⚔ -${damage}`);
    beep(critical ? 520 : 280, 0.045);

    if (enemy.currentHp <= 0) {
      winBattle();
      return;
    }

    const incoming = Math.max(1, Math.round(enemy.attack * (0.8 + Math.random() * 0.4) - totalDefense() * 0.45));
    state.hp = Math.max(0, state.hp - incoming);
    if (state.hp <= 0) {
      loseBattle();
      return;
    }
    render();
  }

  function winBattle() {
    const defeated = enemy;
    state.coins += defeated.coins;
    addXp(defeated.xp);
    if (Math.random() < 0.4) rollLoot();
    log(`赶跑了 <b>${defeated.name}</b>，获得 ${defeated.xp} 经验与 ${defeated.coins} 枚松果币。`);
    toast(`战斗胜利 · +${defeated.xp} 经验`, "gold");
    beep(720, 0.12);
    endBattle();
    showCalmEvent("🦋", "继续前进", "危险已经解除，栗团拍掉泥土，重新开始挖掘。");
  }

  function loseBattle() {
    const lost = {};
    Object.entries(state.inventory).forEach(([id, count]) => {
      const amount = Math.floor(count * 0.35);
      if (amount > 0) {
        lost[id] = amount;
        removeItem(id, amount);
      }
    });
    Object.entries(lost).forEach(([id, count]) => {
      state.dropped[id] = (state.dropped[id] || 0) + count;
    });
    const lostCount = Object.values(lost).reduce((sum, count) => sum + count, 0);
    log(
      lostCount
        ? `战败后回到树洞，<b>${lostCount} 件物品</b>遗落在原处，可以重新拾取。`
        : "战败后回到树洞休养，好在背包里没有遗失物。",
    );
    toast(lostCount ? `战败，遗失 ${lostCount} 件物品` : "战败，已返回树洞", "red");
    state.hp = maxHp();
    endBattle();
    showCalmEvent("🕳️", "重整行装", "栗团已经恢复活力。地图上的遗失物仍在等待拾取。");
    render();
  }

  function endBattle() {
    if (world.engagedEnemy) {
      respawnWorldEnemy(world.engagedEnemy);
      world.engagedEnemy = null;
    }
    enemy = null;
    mode = "digging";
    state.actionProgress = 0;
    battleTimer = 0;
    elements.forestScene.classList.remove("battle");
    elements.eventCard.classList.remove("danger");
    elements.battleArea.classList.add("hidden");
    elements.fleeAction.classList.add("hidden");
    elements.eventAction.disabled = true;
    elements.eventAction.textContent = "继续探索";
    updateActivity();
    saveState();
  }

  function fleeBattle() {
    if (!enemy || mode !== "battle") return;
    const name = enemy.name;
    const escapeDamage = Math.max(1, enemy.attack - Math.floor(totalDefense() / 2));
    state.hp = Math.max(1, state.hp - escapeDamage);
    log(`绕开了 <b>${name}</b>，慌乱中损失 ${escapeDamage} 点活力。`);
    toast(`成功绕开，活力 -${escapeDamage}`);
    endBattle();
    showCalmEvent("🌲", "另寻小路", "栗团从盘根错节的树根间找到了另一条通道。");
  }

  function showCalmEvent(emoji, heading, description) {
    if (mode === "battle") return;
    elements.eventHeading.textContent = heading;
    elements.eventBadge.textContent = "探索中";
    elements.enemyEmoji.textContent = emoji;
    elements.eventDescription.textContent = description;
  }

  function rest() {
    if (mode === "battle") {
      toast("战斗中不能休息", "red");
      return;
    }
    const missing = maxHp() - state.hp;
    if (missing <= 0) {
      toast("栗团现在精神满满");
      return;
    }
    const cost = Math.max(2, Math.ceil(missing / 15));
    if (state.coins < cost) {
      toast(`需要 ${cost} 枚松果币准备食物`, "red");
      return;
    }
    state.coins -= cost;
    state.hp = maxHp();
    log(`在树洞里吃饱睡足，花费 ${cost} 枚松果币恢复了全部活力。`);
    toast("活力已完全恢复");
    beep(600, 0.12);
    render();
  }

  function upgradeClaws() {
    const cost = 30 + (state.basePower - 8) * 22;
    if (state.coins < cost) {
      toast(`还需要 ${cost - state.coins} 枚松果币`, "red");
      return;
    }
    state.coins -= cost;
    state.basePower += 1;
    log(`磨亮了爪子，基础爪力提升到 <b>${state.basePower}</b>。`);
    toast("爪力永久 +1", "gold");
    beep(740, 0.1);
    render();
  }

  function learnSkill(id) {
    const skill = SKILLS[id];
    if (state.skillPoints < 1 || state.skills[id] >= skill.max) return;
    state.skillPoints -= 1;
    state.skills[id] += 1;
    log(`学会了更熟练的 <b>${skill.name} ${state.skills[id]}级</b>。`);
    toast(`${skill.name} 提升至 ${state.skills[id]} 级`, "gold");
    render();
  }

  function recoverDropped() {
    const count = Object.values(state.dropped).reduce((sum, amount) => sum + amount, 0);
    if (!count) return;
    const room = state.bagCapacity - bagCount();
    if (room <= 0) {
      toast("背包没有空间，无法拾取", "red");
      return;
    }
    let recovered = 0;
    for (const [id, amount] of Object.entries({ ...state.dropped })) {
      if (recovered >= room) break;
      const take = Math.min(amount, room - recovered);
      addItem(id, take, true);
      state.dropped[id] -= take;
      recovered += take;
      if (state.dropped[id] <= 0) delete state.dropped[id];
    }
    log(`重新找回了 <b>${recovered} 件遗失物</b>。`);
    toast(`找回遗失物 ×${recovered}`, "gold");
    beep(620, 0.12);
    render();
  }

  function applyOfflineProgress() {
    const elapsed = Math.min(8 * 60 * 60 * 1000, Math.max(0, Date.now() - state.lastSavedAt));
    if (elapsed < 2 * 60 * 1000) return;
    const minutes = Math.floor(elapsed / 60000);
    const actions = Math.min(state.bagCapacity - bagCount(), Math.max(1, Math.floor(minutes / 3)));
    if (actions <= 0) {
      toast(`离开了 ${minutes} 分钟，但背包已经装满`);
      return;
    }
    const coinGain = actions * 2;
    state.coins += coinGain;
    for (let i = 0; i < actions; i += 1) {
      rollLoot(true);
      addXp(2);
    }
    state.depth += actions;
    log(`离线探索 ${minutes} 分钟，带回 <b>${actions} 件物品</b>和 ${coinGain} 枚松果币。`);
    setTimeout(() => toast(`离线收获：${actions} 件物品 · ${coinGain} 松果币`, "gold"), 350);
  }

  function log(message) {
    const now = new Date();
    state.logs.unshift({
      time: `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
      message,
    });
    state.logs = state.logs.slice(0, MAX_LOGS);
  }

  function toast(message, type = "") {
    const node = document.createElement("div");
    node.className = `toast ${type}`;
    node.textContent = message;
    elements.toastStack.appendChild(node);
    setTimeout(() => node.remove(), 3200);
  }

  function showFind(message) {
    elements.findPop.textContent = message;
    elements.findPop.classList.remove("hidden");
    elements.findPop.style.left = `${28 + Math.random() * 32}%`;
    elements.findPop.style.top = `${40 + Math.random() * 12}%`;
    elements.findPop.getAnimations().forEach((animation) => animation.cancel());
    requestAnimationFrame(() => elements.findPop.getAnimations().forEach((animation) => animation.play()));
    setTimeout(() => elements.findPop.classList.add("hidden"), 1550);
  }

  function randomWorldPoint(margin = 42) {
    return {
      x: margin + Math.random() * (WORLD_SIZE - margin * 2),
      y: margin + Math.random() * (WORLD_SIZE - margin * 2),
    };
  }

  function initWorld() {
    worldContext = elements.worldCanvas.getContext("2d");
    resetWorldMap();
    resizeWorldCanvas();
  }

  function resetWorldMap() {
    world.decorations = Array.from({ length: 54 }, (_, index) => {
      const point = randomWorldPoint(18);
      return {
        ...point,
        type: index < 22 ? "tree" : index < 38 ? "bush" : index < 47 ? "rock" : "mushroom",
        size: 0.75 + Math.random() * 0.65,
        tint: Math.random(),
      };
    });
    world.digSpots = Array.from({ length: 6 }, (_, index) => ({
      ...randomWorldPoint(65),
      id: index,
      sparkle: Math.random() * Math.PI * 2,
    }));
    spawnWorldEnemies();
    chooseNextDigSpot();
  }

  function resizeWorldCanvas() {
    const size = elements.worldCanvas.clientWidth || WORLD_SIZE;
    const pixelRatio = Math.min(2, window.devicePixelRatio || 1);
    elements.worldCanvas.width = Math.round(size * pixelRatio);
    elements.worldCanvas.height = Math.round(size * pixelRatio);
    const scale = (size * pixelRatio) / WORLD_SIZE;
    worldContext?.setTransform(scale, 0, 0, scale, 0, 0);
  }

  function spawnWorldEnemies() {
    const templates = availableEnemies();
    const count = 3 + state.activeZone;
    world.enemies = Array.from({ length: count }, (_, index) => {
      const template = templates[index % templates.length];
      const point = randomWorldPoint(55);
      const target = randomWorldPoint(55);
      return {
        template,
        x: point.x,
        y: point.y,
        targetX: target.x,
        targetY: target.y,
        facing: 1,
        state: "patrol",
        cooldown: 2500 + index * 900,
      };
    });
  }

  function respawnWorldEnemy(worldEnemy) {
    const point = randomWorldPoint(55);
    const target = randomWorldPoint(55);
    worldEnemy.x = point.x;
    worldEnemy.y = point.y;
    worldEnemy.targetX = target.x;
    worldEnemy.targetY = target.y;
    worldEnemy.state = "patrol";
    worldEnemy.cooldown = 9000;
  }

  function chooseNextDigSpot() {
    const choices = world.digSpots.filter(
      (spot) => Math.hypot(spot.x - world.mole.x, spot.y - world.mole.y) > 35,
    );
    const spot = choices[Math.floor(Math.random() * choices.length)] || world.digSpots[0];
    world.mole.targetX = spot.x;
    world.mole.targetY = spot.y;
    world.mole.phase = "walk";
    elements.aiState.textContent = "寻路前往宝点";
  }

  function finishWorldDig() {
    const spot = world.digSpots.find(
      (candidate) => Math.hypot(candidate.x - world.mole.targetX, candidate.y - world.mole.targetY) < 4,
    );
    if (spot) {
      const replacement = randomWorldPoint(65);
      spot.x = replacement.x;
      spot.y = replacement.y;
      spot.sparkle = Math.random() * Math.PI * 2;
    }
    chooseNextDigSpot();
  }

  function moveToward(entity, targetX, targetY, speed, delta) {
    const dx = targetX - entity.x;
    const dy = targetY - entity.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 0.01) return 0;
    const step = Math.min(distance, speed * delta);
    entity.x += (dx / distance) * step;
    entity.y += (dy / distance) * step;
    entity.facing = dx >= 0 ? 1 : -1;
    return distance - step;
  }

  function updateWorld(delta) {
    world.time += delta;
    if (state.paused) return;

    if (mode === "digging" && world.mole.phase === "walk") {
      const remaining = moveToward(world.mole, world.mole.targetX, world.mole.targetY, 0.072, delta);
      if (remaining < 2) {
        world.mole.phase = "dig";
        state.actionProgress = 0;
        elements.aiState.textContent = "挥铲挖掘中";
        updateActivity();
      }
    }

    const firefly = world.allies[0];
    firefly.angle += delta * 0.0024;
    const glowX = world.mole.x - 22 + Math.cos(firefly.angle) * 16;
    const glowY = world.mole.y - 25 + Math.sin(firefly.angle * 1.4) * 12;
    moveToward(firefly, glowX, glowY, 0.1, delta);

    const hedgehog = world.allies[1];
    if (mode === "battle" && world.engagedEnemy) {
      moveToward(hedgehog, world.mole.x + 28, world.mole.y + 12, 0.09, delta);
    } else {
      const followDistance = Math.hypot(hedgehog.x - world.mole.x, hedgehog.y - world.mole.y);
      if (followDistance > 105 || Math.hypot(hedgehog.x - hedgehog.targetX, hedgehog.y - hedgehog.targetY) < 4) {
        hedgehog.targetX = world.mole.x - 35 + Math.random() * 70;
        hedgehog.targetY = world.mole.y - 35 + Math.random() * 70;
      }
      moveToward(hedgehog, hedgehog.targetX, hedgehog.targetY, 0.045, delta);
    }

    world.healTimer += delta;
    if (world.healTimer > 14000 && mode !== "battle" && state.hp < maxHp()) {
      world.healTimer = 0;
      state.hp = Math.min(maxHp(), state.hp + 3);
      showFind("✨ 萤萤治疗 +3");
    }

    world.enemies.forEach((worldEnemy) => {
      worldEnemy.cooldown = Math.max(0, worldEnemy.cooldown - delta);
      if (mode === "battle") {
        if (worldEnemy === world.engagedEnemy) {
          const angle = world.time * 0.002;
          moveToward(worldEnemy, world.mole.x + Math.cos(angle) * 38, world.mole.y + Math.sin(angle) * 26, 0.065, delta);
        }
        return;
      }
      const distanceToMole = Math.hypot(worldEnemy.x - world.mole.x, worldEnemy.y - world.mole.y);
      if (worldEnemy.cooldown <= 0 && distanceToMole < 100) {
        worldEnemy.state = "chase";
        moveToward(worldEnemy, world.mole.x, world.mole.y, 0.052 + state.activeZone * 0.006, delta);
        if (distanceToMole < 25) {
          world.engagedEnemy = worldEnemy;
          startEncounter(worldEnemy.template);
        }
      } else {
        worldEnemy.state = "patrol";
        if (Math.hypot(worldEnemy.x - worldEnemy.targetX, worldEnemy.y - worldEnemy.targetY) < 5) {
          const next = randomWorldPoint(48);
          worldEnemy.targetX = next.x;
          worldEnemy.targetY = next.y;
        }
        moveToward(worldEnemy, worldEnemy.targetX, worldEnemy.targetY, 0.024, delta);
      }
    });
  }

  function drawWorld() {
    if (!worldContext) return;
    const ctx = worldContext;
    const map = MAPS[state.activeMap];
    ctx.clearRect(0, 0, WORLD_SIZE, WORLD_SIZE);

    const ground = ctx.createLinearGradient(0, 0, WORLD_SIZE, WORLD_SIZE);
    ground.addColorStop(0, map.palette[0]);
    ground.addColorStop(0.55, map.palette[1]);
    ground.addColorStop(1, map.palette[2]);
    ctx.fillStyle = ground;
    ctx.fillRect(0, 0, WORLD_SIZE, WORLD_SIZE);

    const tile = 52;
    for (let row = 0; row < 10; row += 1) {
      for (let column = 0; column < 10; column += 1) {
        if ((row + column) % 2 === 0) {
          ctx.fillStyle = "rgba(255,250,205,.025)";
          ctx.fillRect(column * tile, row * tile, tile, tile);
        }
      }
    }

    ctx.save();
    ctx.strokeStyle = map.palette[3];
    ctx.lineCap = "round";
    if (state.activeMap === "city") {
      ctx.lineWidth = 48;
      [[-10, 150, 530, 150], [165, -10, 165, 530], [-10, 405, 530, 405]].forEach(([x1, y1, x2, y2]) => {
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      });
      ctx.strokeStyle = "rgba(245,220,151,.18)";
      ctx.lineWidth = 2;
      ctx.setLineDash([12, 13]);
      [[0, 150, 520, 150], [165, 0, 165, 520], [0, 405, 520, 405]].forEach(([x1, y1, x2, y2]) => {
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      });
      ctx.setLineDash([]);
    } else {
      ctx.lineWidth = state.activeMap === "rainforest" ? 38 : 30;
      ctx.beginPath();
      ctx.moveTo(-15, 360);
      ctx.bezierCurveTo(115, 300, 155, 390, 265, 300);
      ctx.bezierCurveTo(355, 225, 430, 265, 545, 180);
      ctx.stroke();
      if (state.activeMap === "rainforest") {
        ctx.strokeStyle = "rgba(95,196,191,.28)";
        ctx.lineWidth = 12;
        ctx.stroke();
      }
    }
    ctx.restore();

    world.decorations.forEach((decoration) => drawDecoration(ctx, decoration));
    world.digSpots.forEach((spot) => drawDigSpot(ctx, spot));

    const actors = [
      ...world.enemies.map((actor) => ({ actor, kind: "enemy", y: actor.y })),
      ...world.allies.map((actor) => ({ actor, kind: "ally", y: actor.y })),
      { actor: world.mole, kind: "mole", y: world.mole.y },
    ].sort((a, b) => a.y - b.y);
    actors.forEach(({ actor, kind }) => {
      if (kind === "mole") drawWorldMole(ctx, actor);
      else if (kind === "ally") drawWorldAlly(ctx, actor);
      else drawWorldEnemy(ctx, actor);
    });
  }

  function drawDecoration(ctx, decoration) {
    ctx.save();
    ctx.translate(decoration.x, decoration.y);
    ctx.scale(decoration.size, decoration.size);
    if (state.activeMap === "city") {
      if (decoration.type === "tree") {
        ctx.fillStyle = "rgba(41,51,56,.2)"; ctx.fillRect(-14, 9, 28, 7);
        ctx.fillStyle = decoration.tint > 0.5 ? "#5f6b70" : "#68777c"; ctx.fillRect(-12, -12, 24, 22);
        ctx.fillStyle = "rgba(220,231,229,.22)"; ctx.fillRect(-8, -8, 6, 6); ctx.fillRect(3, -8, 6, 6);
        ctx.fillStyle = "#424d51"; ctx.fillRect(-15, 8, 30, 4);
      } else if (decoration.type === "bush") {
        ctx.fillStyle = "#46565b"; ctx.fillRect(-2, -12, 4, 24);
        ctx.fillStyle = "#e0c46a"; ctx.beginPath(); ctx.arc(0, -13, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "rgba(255,231,131,.18)"; ctx.beginPath(); ctx.arc(0, -13, 12, 0, Math.PI * 2); ctx.fill();
      } else if (decoration.type === "rock") {
        ctx.fillStyle = "#756854"; ctx.fillRect(-10, -7, 20, 15);
        ctx.strokeStyle = "#9e8d6e"; ctx.strokeRect(-10, -7, 20, 15);
        ctx.fillStyle = "#4d4539"; ctx.fillRect(-2, -7, 3, 15);
      } else {
        ctx.fillStyle = "#6b7f87"; ctx.beginPath(); ctx.ellipse(0, 2, 13, 6, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "rgba(194,225,231,.35)"; ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI); ctx.stroke();
      }
      ctx.restore();
      return;
    }
    if (state.activeMap === "rainforest") {
      if (decoration.type === "tree") {
        ctx.fillStyle = "#4d3e2c"; ctx.fillRect(-4, -4, 8, 24);
        ctx.fillStyle = decoration.tint > 0.5 ? "#176443" : "#28784c";
        [[0, -12, 19], [-14, -2, 13], [14, -3, 14]].forEach(([x, y, radius]) => {
          ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
        });
        ctx.strokeStyle = "#5d9b55"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(8, 5, 14, 0, Math.PI); ctx.stroke();
      } else if (decoration.type === "bush") {
        ctx.fillStyle = "#2e8b53"; ctx.beginPath(); ctx.ellipse(-6, 0, 8, 18, -0.7, 0, Math.PI * 2); ctx.ellipse(7, 0, 8, 18, 0.7, 0, Math.PI * 2); ctx.fill();
      } else if (decoration.type === "rock") {
        ctx.fillStyle = "#667b62"; ctx.beginPath(); ctx.ellipse(0, 2, 11, 8, -0.2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#4d9a58"; ctx.beginPath(); ctx.arc(-3, -3, 5, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.fillStyle = decoration.tint > 0.5 ? "#ef7698" : "#f3bf58";
        for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 3) {
          ctx.beginPath(); ctx.ellipse(Math.cos(angle) * 5, Math.sin(angle) * 5, 3, 6, angle, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.restore();
      return;
    }
    if (decoration.type === "tree") {
      ctx.fillStyle = "rgba(44,51,35,.2)";
      ctx.beginPath(); ctx.ellipse(4, 13, 18, 8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#66543a"; ctx.fillRect(-3, -1, 7, 19);
      ctx.fillStyle = decoration.tint > 0.5 ? "#345f3e" : "#3f7049";
      [[0, -12, 17], [-12, -3, 13], [12, -2, 14]].forEach(([x, y, radius]) => {
        ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
      });
    } else if (decoration.type === "bush") {
      ctx.fillStyle = decoration.tint > 0.5 ? "#527b4c" : "#456f43";
      ctx.beginPath(); ctx.arc(-7, 0, 9, 0, Math.PI * 2); ctx.arc(4, -4, 12, 0, Math.PI * 2); ctx.arc(13, 3, 8, 0, Math.PI * 2); ctx.fill();
    } else if (decoration.type === "rock") {
      ctx.fillStyle = "#777c69"; ctx.beginPath(); ctx.ellipse(0, 2, 10, 7, -0.2, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,.2)"; ctx.beginPath(); ctx.moveTo(-5, -1); ctx.lineTo(3, -3); ctx.stroke();
    } else {
      ctx.fillStyle = "#eee2bd"; ctx.fillRect(-1, 0, 3, 7);
      ctx.fillStyle = decoration.tint > 0.5 ? "#d99758" : "#c45f4e"; ctx.beginPath(); ctx.arc(0, 0, 6, Math.PI, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function drawDigSpot(ctx, spot) {
    const pulse = 0.6 + Math.sin(world.time * 0.004 + spot.sparkle) * 0.25;
    ctx.fillStyle = "rgba(75,55,35,.27)";
    ctx.beginPath(); ctx.ellipse(spot.x, spot.y + 6, 17, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = `rgba(255,225,120,${pulse})`;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(spot.x, spot.y, 10 + pulse * 3, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = "#f8df7b";
    ctx.font = "bold 13px serif";
    ctx.textAlign = "center";
    ctx.fillText("✦", spot.x, spot.y + 4);
  }

  function drawWorldMole(ctx, mole) {
    const digging = mole.phase === "dig" && mode === "digging";
    const bob = digging ? Math.sin(world.time * 0.015) * 2 : Math.sin(world.time * 0.008) * 1.5;
    ctx.save();
    ctx.translate(mole.x, mole.y + bob);
    ctx.scale(mole.facing, 1);
    ctx.fillStyle = "rgba(31,39,33,.24)";
    ctx.beginPath(); ctx.ellipse(0, 15, 20, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#202724";
    ctx.beginPath(); ctx.ellipse(-2, 1, 17, 21, -0.08, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#e1a39a";
    ctx.beginPath(); ctx.arc(-13, -9, 6, 0, Math.PI * 2); ctx.arc(9, -10, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#303834";
    ctx.beginPath(); ctx.ellipse(2, -5, 17, 15, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#faf4d9";
    ctx.beginPath(); ctx.arc(8, -8, 2.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#111714"; ctx.beginPath(); ctx.arc(8.7, -8, 1.1, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#e7a69c";
    ctx.beginPath(); ctx.ellipse(18, -1, 6, 4.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save();
    ctx.translate(14, 6);
    ctx.rotate(digging ? -0.7 + Math.sin(world.time * 0.018) * 0.65 : -0.45);
    ctx.strokeStyle = "#6d4b2f"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, -2); ctx.lineTo(0, 20); ctx.stroke();
    ctx.strokeStyle = "#c8c4ad"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-8, -2); ctx.lineTo(8, -2); ctx.stroke();
    ctx.restore();
    ctx.scale(mole.facing, 1);
    drawActorLabel(ctx, "栗团", 0, -31, "#f7f2d9");
    ctx.restore();
  }

  function drawWorldAlly(ctx, ally) {
    const isFirefly = ally.type === "firefly";
    ctx.save();
    ctx.translate(ally.x, ally.y);
    if (isFirefly) {
      const glow = ctx.createRadialGradient(0, 0, 1, 0, 0, 18);
      glow.addColorStop(0, "rgba(255,242,125,.85)"); glow.addColorStop(1, "rgba(255,242,125,0)");
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = "rgba(119,195,234,.75)";
    ctx.beginPath(); ctx.arc(0, 1, isFirefly ? 8 : 17, 0, Math.PI * 2); ctx.fill();
    ctx.font = `${isFirefly ? 13 : 24}px "Segoe UI Emoji"`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(ally.emoji, 0, 0);
    drawActorLabel(ctx, ally.name, 0, isFirefly ? -15 : -25, "#dff3ff");
    ctx.restore();
  }

  function drawWorldEnemy(ctx, worldEnemy) {
    ctx.save();
    ctx.translate(worldEnemy.x, worldEnemy.y);
    ctx.fillStyle = worldEnemy.state === "chase" ? "rgba(221,82,60,.42)" : "rgba(119,55,43,.25)";
    ctx.beginPath(); ctx.arc(0, 2, 19, 0, Math.PI * 2); ctx.fill();
    ctx.font = '27px "Segoe UI Emoji"';
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(worldEnemy.template.emoji, 0, 0);
    if (worldEnemy.state === "chase") {
      ctx.fillStyle = "#fff3dc"; ctx.font = "bold 12px sans-serif"; ctx.fillText("!", 0, -25);
    }
    drawActorLabel(ctx, worldEnemy.template.name, 0, -31, "#ffe6df");
    ctx.restore();
  }

  function drawActorLabel(ctx, text, x, y, color) {
    ctx.save();
    ctx.font = 'bold 8px "Noto Sans SC", sans-serif';
    ctx.textAlign = "center";
    const width = ctx.measureText(text).width + 10;
    ctx.fillStyle = "rgba(24,43,31,.72)";
    ctx.beginPath(); ctx.roundRect(x - width / 2, y - 8, width, 13, 5); ctx.fill();
    ctx.fillStyle = color; ctx.fillText(text, x, y + 1);
    ctx.restore();
  }

  function beep(frequency, duration) {
    if (!state.sound) return;
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.045, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + duration);
    } catch {
      state.sound = false;
    }
  }

  function unlockZones() {
    document.querySelectorAll(".route-node").forEach((node) => {
      const zone = Number(node.dataset.zone);
      const needed = zone === 1 ? 5 : zone === 2 ? 10 : 1;
      node.classList.toggle("locked", state.level < needed);
      node.classList.toggle("unlocked", state.level >= needed && zone !== state.activeZone);
    });
  }

  function applyMapUI() {
    const map = MAPS[state.activeMap];
    document.body.dataset.map = state.activeMap;
    elements.mapChapter.textContent = map.chapter;
    elements.mapHeroTitle.innerHTML = map.title;
    elements.mapHeroCopy.textContent = map.copy;
    [elements.weatherIcon.textContent, elements.weatherName.textContent, elements.weatherBonus.textContent] = map.weather;
    elements.eventOverline.textContent = map.eventLabel;
    elements.currentZoneTitle.textContent = `${map.name} · ${map.zones[state.activeZone][1]}`;
    elements.worldCanvas.setAttribute("aria-label", `${map.name}方形探索地图`);
    map.zones.forEach(([icon, name], index) => {
      $(`zone-icon-${index}`).textContent = icon;
      $(`zone-name-${index}`).textContent = name;
    });
    document.querySelectorAll(".map-choice").forEach((button) => {
      const active = button.dataset.map === state.activeMap;
      button.classList.toggle("active", active);
      button.querySelector("i").textContent = active ? "探索中" : "前往";
    });
  }

  function selectMap(mapId) {
    if (!MAPS[mapId] || mapId === state.activeMap) return;
    if (mode === "battle") {
      toast("战斗结束后才能更换地图", "red");
      return;
    }
    state.activeMap = mapId;
    state.activeZone = 0;
    state.actionProgress = 0;
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set("map", mapId);
    window.history.replaceState({}, "", currentUrl);
    resetWorldMap();
    applyMapUI();
    const map = MAPS[mapId];
    showCalmEvent(...map.calm);
    log(`启程前往新地图：<b>${map.name}</b>。`);
    toast(`已抵达 ${map.name}`, "gold");
    render();
    saveState();
  }

  function selectZone(zone) {
    const needed = zone === 1 ? 5 : zone === 2 ? 10 : 1;
    if (state.level < needed) {
      toast(`达到 Lv.${needed} 后解锁`, "red");
      return;
    }
    if (mode === "battle") {
      toast("战斗结束后才能移动", "red");
      return;
    }
    state.activeZone = zone;
    state.actionProgress = 0;
    spawnWorldEnemies();
    chooseNextDigSpot();
    const map = MAPS[state.activeMap];
    elements.currentZoneTitle.textContent = `${map.name} · ${map.zones[zone][1]}`;
    log(`前往新的探索区域：<b>${map.zones[zone][1]}</b>。`);
    render();
  }

  function renderInventory() {
    const entries = Object.entries(state.inventory).filter(
      ([id, count]) => count > 0 && (activeFilter === "all" || ITEMS[id].type === activeFilter),
    );
    if (!entries.length) {
      elements.inventoryGrid.innerHTML = '<div class="empty-bag">这里空空的，继续向下挖吧。</div>';
      return;
    }
    elements.inventoryGrid.innerHTML = entries
      .map(([id, count]) => {
        const item = ITEMS[id];
        return `<div class="inventory-slot ${item.rare ? "rare" : ""}" title="${item.name} · 价值 ${item.value} 松果币">
          <span class="count">${count}</span>
          <span class="item-icon">${item.icon}</span>
          <b>${item.name}</b>
        </div>`;
      })
      .join("");
  }

  function renderSkills() {
    elements.skillList.innerHTML = Object.entries(SKILLS)
      .map(([id, skill]) => {
        const level = state.skills[id];
        const bars = Array.from({ length: skill.max }, (_, index) => `<i class="${index < level ? "filled" : ""}"></i>`).join("");
        return `<div class="skill-item">
          <span class="skill-icon">${skill.icon}</span>
          <div class="skill-info">
            <strong>${skill.name} <small>Lv.${level}/${skill.max}</small></strong>
            <small>${skill.desc}</small>
            <div class="skill-level">${bars}</div>
          </div>
          <button class="skill-up" data-skill="${id}" ${state.skillPoints < 1 || level >= skill.max ? "disabled" : ""}>+</button>
        </div>`;
      })
      .join("");
  }

  function renderLogs() {
    if (!state.logs.length) {
      elements.journalList.innerHTML = "<li>森林静悄悄的，第一铲泥土还没落下。</li>";
      return;
    }
    elements.journalList.innerHTML = state.logs
      .map((entry) => `<li><time>${entry.time}</time>${entry.message}</li>`)
      .join("");
  }

  function updateActivity() {
    if (mode === "battle") {
      elements.activityIcon.textContent = "⚔";
      elements.activityTitle.textContent = `正在与${enemy?.name || "野兽"}交战……`;
      elements.activitySubtitle.textContent = state.autoBattle ? "刺团队友正在协助攻击" : "点击右侧按钮，与刺团一起迎战";
      elements.timeLeft.textContent = "战斗中";
      elements.aiState.textContent = "队伍协同作战";
      return;
    }
    if (state.paused) {
      elements.activityIcon.textContent = "☕";
      elements.activityTitle.textContent = "栗团坐下来擦了擦爪子";
      elements.activitySubtitle.textContent = "探索已暂停，进度会保留";
      elements.timeLeft.textContent = "暂停";
      return;
    }
    if (world.mole.phase === "walk") {
      elements.activityIcon.textContent = "🐾";
      elements.activityTitle.textContent = "栗团正在寻找闪光宝点……";
      elements.activitySubtitle.textContent = "队友自主跟随，敌人会巡逻和追击";
      elements.timeLeft.textContent = "移动中";
      elements.aiState.textContent = "AI 自动寻路";
      return;
    }
    elements.activityIcon.textContent = "⛏";
    elements.activityTitle.textContent = "正在挖掘松软泥土……";
    const mapTips = {
      forest: ["可能发现普通材料或松果币", "溪水附近藏着闪亮的东西", "古树深处稀有宝物更多"],
      city: ["翻找街角遗落的旧物", "机械工坊里有珍贵零件", "末班地铁深处信号闪烁"],
      rainforest: ["巨叶下常有新鲜果实", "瀑布附近会冲出晶石", "遗迹深处藏着古老宝物"],
    };
    elements.activitySubtitle.textContent = mapTips[state.activeMap][state.activeZone];
  }

  function renderBattle() {
    if (!enemy) return;
    elements.battlePlayerBar.style.width = `${(state.hp / maxHp()) * 100}%`;
    elements.battlePlayerHp.textContent = state.hp;
    elements.enemyName.textContent = enemy.name;
    elements.enemyHp.textContent = enemy.currentHp;
    elements.enemyBar.style.width = `${(enemy.currentHp / enemy.maxHp) * 100}%`;
  }

  function render() {
    const needed = xpNeeded();
    const hpMax = maxHp();
    applyMapUI();
    elements.coins.textContent = formatNumber(state.coins);
    elements.sprouts.textContent = formatNumber(state.sprouts);
    elements.headerHp.textContent = `${state.hp} / ${hpMax}`;
    elements.level.textContent = state.level;
    elements.xpLabel.textContent = `${state.xp} / ${needed}`;
    elements.xpBar.style.width = `${(state.xp / needed) * 100}%`;
    elements.power.textContent = totalPower();
    elements.defense.textContent = totalDefense();
    elements.luck.textContent = totalLuck();
    elements.hpLabel.textContent = `${state.hp} / ${hpMax}`;
    elements.hpBar.style.width = `${(state.hp / hpMax) * 100}%`;
    elements.depth.textContent = state.depth;
    const cost = 30 + (state.basePower - 8) * 22;
    elements.upgradeCost.textContent = `◆ ${cost}`;
    elements.bagCount.textContent = bagCount();
    elements.bagCapacity.textContent = state.bagCapacity;
    elements.skillPoints.textContent = state.skillPoints;
    elements.rankLevel.textContent = state.level;
    elements.rankDepth.textContent = formatNumber(state.depth);
    elements.autoBattle.checked = state.autoBattle;
    elements.pauseButton.innerHTML = state.paused ? "<span>▶</span> 继续探索" : "<span>Ⅱ</span> 暂停探索";
    elements.forestScene.classList.toggle("paused", state.paused);
    elements.droppedPile.classList.toggle("hidden", Object.keys(state.dropped).length === 0);
    elements.soundButton.textContent = state.sound ? "♪" : "×";
    elements.soundButton.title = state.sound ? "关闭声音" : "开启声音";

    document.querySelectorAll(".route-node").forEach((node) => {
      const zone = Number(node.dataset.zone);
      node.classList.toggle("active", zone === state.activeZone);
      const small = node.querySelector("small");
      if (zone === state.activeZone) small.textContent = "当前";
      else small.textContent = zone === 1 ? "Lv. 5" : zone === 2 ? "Lv. 10" : "可探索";
    });
    elements.routeLine.style.width = `${state.activeZone * 50}%`;
    unlockZones();
    renderInventory();
    renderSkills();
    renderLogs();
    renderBattle();
    updateActivity();
  }

  function loop(now) {
    const delta = Math.min(100, now - lastFrame);
    lastFrame = now;
    updateWorld(delta);

    if (!state.paused) {
      if (mode === "digging") {
        if (world.mole.phase === "dig") {
          const speed = 1 + state.skills.digger * 0.1 + 0.08;
          state.actionProgress += (delta / ACTION_BASE_MS) * speed;
          if (state.actionProgress >= 1) completeDig();
          const duration = ACTION_BASE_MS / speed;
          elements.digBar.style.width = `${Math.min(100, state.actionProgress * 100)}%`;
          elements.timeLeft.textContent = `${Math.max(0, ((1 - state.actionProgress) * duration) / 1000).toFixed(1)}s`;
        } else {
          elements.digBar.style.width = "0%";
          elements.timeLeft.textContent = "移动中";
        }
      } else if (mode === "battle" && state.autoBattle) {
        battleTimer += delta;
        if (battleTimer >= 920) {
          battleTimer = 0;
          battleRound();
        }
      }
    }
    drawWorld();

    saveTimer += delta;
    if (saveTimer > 5000) {
      saveTimer = 0;
      saveState();
    }
    leaderboardTimer += delta;
    if (leaderboardTimer > 60000) {
      leaderboardTimer = 0;
      if (leaderboardConfig().url) submitScore(true);
    }
    requestAnimationFrame(loop);
  }

  function bindEvents() {
    $("pause-button").addEventListener("click", () => {
      if (mode === "battle") {
        toast("战斗中无法暂停探索", "red");
        return;
      }
      state.paused = !state.paused;
      render();
    });
    $("auto-battle").addEventListener("change", (event) => {
      state.autoBattle = event.target.checked;
      updateActivity();
      renderBattle();
    });
    $("event-action").addEventListener("click", () => {
      if (mode !== "battle") return;
      if (!state.autoBattle && enemy) {
        battleRound();
      } else {
        battleRound();
      }
    });
    $("flee-action").addEventListener("click", fleeBattle);
    $("rest-button").addEventListener("click", rest);
    $("upgrade-button").addEventListener("click", upgradeClaws);
    $("dropped-pile").addEventListener("click", recoverDropped);
    $("clear-log").addEventListener("click", () => {
      state.logs = [];
      renderLogs();
    });
    $("skill-list").addEventListener("click", (event) => {
      const button = event.target.closest("[data-skill]");
      if (button) learnSkill(button.dataset.skill);
    });
    $("inventory-filters").addEventListener("click", (event) => {
      const button = event.target.closest("[data-filter]");
      if (!button) return;
      activeFilter = button.dataset.filter;
      document.querySelectorAll("[data-filter]").forEach((node) => node.classList.toggle("active", node === button));
      renderInventory();
    });
    $("map-selector").addEventListener("click", (event) => {
      const button = event.target.closest("[data-map]");
      if (button) selectMap(button.dataset.map);
    });
    document.querySelectorAll(".route-node").forEach((node) => {
      node.addEventListener("click", () => selectZone(Number(node.dataset.zone)));
    });
    $("sound-button").addEventListener("click", () => {
      state.sound = !state.sound;
      if (state.sound) beep(540, 0.08);
      render();
    });
    $("save-name-button").addEventListener("click", () => {
      const name = elements.playerName.value.trim().replace(/\s+/g, " ").slice(0, 12);
      if (!name) {
        toast("名字不能为空", "red");
        return;
      }
      state.playerName = name;
      saveState();
      submitScore();
    });
    $("player-name").addEventListener("keydown", (event) => {
      if (event.key === "Enter") $("save-name-button").click();
    });
    $("refresh-rank-button").addEventListener("click", () => submitScore());
    $("help-button").addEventListener("click", () => elements.helpModal.classList.remove("hidden"));
    $("help-close").addEventListener("click", () => elements.helpModal.classList.add("hidden"));
    $("help-start").addEventListener("click", () => {
      elements.helpModal.classList.add("hidden");
      localStorage.setItem(`${SAVE_KEY}-welcomed`, "true");
    });
    elements.helpModal.addEventListener("click", (event) => {
      if (event.target === elements.helpModal) elements.helpModal.classList.add("hidden");
    });
    window.addEventListener("beforeunload", saveState);
    window.addEventListener("resize", resizeWorldCanvas);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) saveState();
      else lastFrame = performance.now();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") elements.helpModal.classList.add("hidden");
      if (event.code === "Space" && event.target === document.body) {
        event.preventDefault();
        if (mode === "battle") battleRound();
      }
      if (event.key.toLowerCase() === "f" && mode === "battle") fleeBattle();
    });
  }

  function init() {
    const requestedMap = new URLSearchParams(window.location.search).get("map");
    if (MAPS[requestedMap]) state.activeMap = requestedMap;
    if (!MAPS[state.activeMap]) state.activeMap = "forest";
    applyOfflineProgress();
    if (!state.logs.length) log("栗团背起小包，第一次踏进了 <b>苔影森林</b>。");
    state.hp = Math.min(state.hp, maxHp());
    initWorld();
    bindEvents();
    render();
    initLeaderboard();
    if (!localStorage.getItem(`${SAVE_KEY}-welcomed`)) elements.helpModal.classList.remove("hidden");
    requestAnimationFrame(loop);
  }

  init();
})();
