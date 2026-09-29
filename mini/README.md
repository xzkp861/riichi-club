# BOS RIICHI 微信小程序

第一阶段包含排行榜（七项指标可排序）与最近四场对局，使用现有网站的只读 API。历史、玩家页、速查和管理功能尚未移植。

1. 在 `mini/` 运行 `npm install`。
2. 将 `.env.example` 复制为 `.env`，填入已部署网站的 HTTPS 地址。
3. 运行 `npm run dev:weapp`，用微信开发者工具打开 `mini/`。
4. `project.config.json` 的 `touristappid` 只供本地体验；上传前换成真实 AppID，并在微信公众平台配置该 HTTPS 域名为 `request` 合法域名。

网站仍按原有方式部署，新增 `/api/leaderboard`、`/api/games/recent`、`/api/games/history` 只读接口。小程序不存放 Supabase 密钥。
