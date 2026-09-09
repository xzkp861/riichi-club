# Riichi Club MVP

一个用于朋友日麻四麻半庄记录、排行榜和个人战绩的轻量网页应用。

## 当前功能
- 添加玩家
- 录入四人终局点数
- 自动算顺位
- 按 25000 起点 / 30000 返还 / UMA +20,+10,-10,-20 自动算积分
- 首页排行榜
- 历史对局
- 玩家个人统计
- 公共只读，写入需要 ADMIN_PIN

## 1. 创建 Supabase 项目
在 Supabase Dashboard 新建项目，打开 SQL Editor，把 `supabase/migrations/001_init.sql` 全部复制进去运行。

## 2. 配置环境变量
复制 `.env.example` 为 `.env.local`，填入：

- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
- SUPABASE_SERVICE_ROLE_KEY
- ADMIN_PIN

`SUPABASE_SERVICE_ROLE_KEY` 只能放在服务端环境变量，绝对不要提交到 GitHub。

## 3. 本地运行
```bash
npm install
npm run dev
```
然后打开 http://localhost:3000

## 4. 部署 Vercel
把项目推到 GitHub，在 Vercel 导入仓库，并添加与 `.env.local` 相同的四个环境变量，然后 Deploy。

## 下一版建议
- 规则设置页面（UMA/返还点/东风或半庄）
- 登录与角色权限
- Rating / TrueSkill
- 月榜、年榜、赛季榜
- 趋势图
- 同点处理
- 编辑/删除错误对局
- PWA 手机桌面图标
