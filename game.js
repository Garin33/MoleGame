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
    { name: "尖牙野鼠", emoji: "🐀", hp: 28, attack: 5, xp: 15, coins: 8 },
    { name: "护巢黄蜂", emoji: "🐝", hp: 22, attack: 6, xp: 13, coins: 7 },
    { name: "林地獾", emoji: "🦡", hp: 42, attack: 8, xp: 22, coins: 12, minLevel: 3 },
    { name: "迷路野猪", emoji: "🐗", hp: 58, attack: 10, xp: 30, coins: 18, minLevel: 5 },
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
    activityIcon: $("activity-icon"),
    activityTitle: $("activity-title"),
    activitySubtitle: $("activity-subtitle"),
    timeLeft: $("time-left"),
    digBar: $("dig-bar"),
    forestScene: $("forest-scene"),
    sceneMole: $("scene-mole"),
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
    let id;
    if (roll < rareChance * 0.35) id = "acornIdol";
    else if (roll < rareChance) id = "amber";
    else if (roll < 0.18 + zoneBonus) id = "feather";
    else if (roll < 0.36) id = "mushroom";
    else if (roll < 0.52) id = "berry";
    else if (roll < 0.72) id = "moss";
    else if (roll < 0.87) id = "stone";
    else id = "twig";
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
    moveMole();

    const encounterChance = 0.14 + state.activeZone * 0.05;
    if (Math.random() < encounterChance) {
      startEncounter();
    } else if (Math.random() < 0.09) {
      const heal = Math.min(maxHp() - state.hp, 8 + Math.floor(Math.random() * 8));
      if (heal > 0) {
        state.hp += heal;
        log(`遇见友善的 <b>花栗鼠</b>，分享莓果恢复了 ${heal} 点活力。`);
        showCalmEvent("🐿️", "友善的花栗鼠", `它从树杈上丢来一把新鲜莓果，恢复了 ${heal} 点活力。`);
      }
    } else {
      showCalmEvent("🦋", "旅途平静", "蝴蝶在光斑间飞舞，苔影森林暂时没有危险。");
    }
    render();
  }

  function availableEnemies() {
    return ENEMIES.filter((candidate) => !candidate.minLevel || state.level >= candidate.minLevel);
  }

  function startEncounter() {
    const templates = availableEnemies();
    const base = templates[Math.floor(Math.random() * templates.length)];
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
    const damage = Math.max(1, Math.round(totalPower() * (0.78 + Math.random() * 0.42) * (critical ? 1.75 : 1)));
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

  function moveMole() {
    elements.sceneMole.style.left = `${16 + Math.random() * 60}%`;
    elements.sceneMole.style.top = `${48 + Math.random() * 25}%`;
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
    const names = ["旧树根", "萤火溪", "古树心"];
    document.querySelector(".expedition-card .section-heading h2").textContent = `苔影森林 · ${names[zone]}`;
    log(`前往新的探索区域：<b>${names[zone]}</b>。`);
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
      elements.activitySubtitle.textContent = state.autoBattle ? "栗团会自动挥爪反击" : "点击右侧按钮进行攻击";
      elements.timeLeft.textContent = "战斗中";
      return;
    }
    if (state.paused) {
      elements.activityIcon.textContent = "☕";
      elements.activityTitle.textContent = "栗团坐下来擦了擦爪子";
      elements.activitySubtitle.textContent = "探索已暂停，进度会保留";
      elements.timeLeft.textContent = "暂停";
      return;
    }
    elements.activityIcon.textContent = "⛏";
    elements.activityTitle.textContent = "正在挖掘松软泥土……";
    elements.activitySubtitle.textContent = ["可能发现普通材料或松果币", "溪水附近藏着闪亮的东西", "古树深处稀有宝物更多"][state.activeZone];
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

    if (!state.paused) {
      if (mode === "digging") {
        const speed = 1 + state.skills.digger * 0.1 + 0.08;
        state.actionProgress += (delta / ACTION_BASE_MS) * speed;
        if (state.actionProgress >= 1) completeDig();
        const duration = ACTION_BASE_MS / speed;
        elements.digBar.style.width = `${Math.min(100, state.actionProgress * 100)}%`;
        elements.timeLeft.textContent = `${Math.max(0, ((1 - state.actionProgress) * duration) / 1000).toFixed(1)}s`;
      } else if (mode === "battle" && state.autoBattle) {
        battleTimer += delta;
        if (battleTimer >= 920) {
          battleTimer = 0;
          battleRound();
        }
      }
    }

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
    applyOfflineProgress();
    if (!state.logs.length) log("栗团背起小包，第一次踏进了 <b>苔影森林</b>。");
    state.hp = Math.min(state.hp, maxHp());
    bindEvents();
    render();
    initLeaderboard();
    if (!localStorage.getItem(`${SAVE_KEY}-welcomed`)) elements.helpModal.classList.remove("hidden");
    requestAnimationFrame(loop);
  }

  init();
})();
