# 鼹途 · 森林挖宝记

一个零依赖、可直接部署的网页挂机挖宝游戏。目前完成第一张地图「苔影森林」。

## 运行

直接双击 `index.html` 即可游玩。也可以用任意静态服务器打开项目目录。

## 已实现

- 自动探索、挖掘、经验升级与角色成长
- 森林三区域及等级解锁
- 随机材料、食物、稀有宝物和背包筛选
- 随机怪物遭遇、自动/手动战斗与绕开危险
- 战败遗失物品，并可在地图中重新拾取
- 爪子强化与三类可升级技能
- 浏览器自动存档及最多 8 小时离线收益
- 基于 Supabase 匿名账号的跨玩家排行榜
- 桌面端和移动端响应式界面

## 部署

整个项目都是静态文件。将项目目录上传到 GitHub Pages、Cloudflare Pages、Netlify、Vercel 或任意网页服务器即可，无需构建命令。发布目录为项目根目录。

### 排行榜配置

1. 在 Supabase 创建项目。
2. 在 Authentication > Providers 中启用 Anonymous Sign-Ins。
3. 在 SQL Editor 执行 `supabase-setup.sql`。
4. 将 Project URL 和 Publishable key（或 anon public key）填入 `config.js`。

排行榜使用匿名账号和行级安全策略。浏览器只能更新自己的记录；`service_role` 或 secret key 绝对不能放进网页代码。

## 后续地图

城市和雨林可沿用 `game.js` 中的物品、敌人、技能与探索状态系统继续扩展。
