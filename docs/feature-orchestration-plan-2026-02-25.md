# PingComp 功能编排计划（2026-02-25）

> 目标：同时提升 Dashboard 信息密度、线索编辑效率、以及整体 Geek 视觉质感。

## Phase 1 — Dashboard 可视化与布局（进行中）
- [x] 增加 Dashboard 图表（趋势 + 评分分布 + Enrich 状态分布）
- [x] Dashboard / Leads / Enrich 面板增加横向内边距（避免内容贴边）
- [x] 后端 `/api/dashboard` 扩展 `scoreBuckets`、`enrichRows`

## Phase 2 — 线索展示与编辑效率（进行中）
- [x] Leads 列表加入批量勾选能力
- [x] 接入批量动作（lock/unlock/status 变更）
- [ ] 下一步：加入 Saved Views（预置过滤视图与一键切换）
- [ ] 下一步：加入字段级高亮（最近编辑、人工锁定标签强化）

## Phase 3 — 设计师视角的 Cool / Geek 提升（进行中）
- [x] 顶部区域加入轻量科技感光晕（inset glow）
- [x] 仪表盘图卡层次优化（信息区块更清晰）
- [ ] 下一步：暗色主题下细化边框/分割线对比度
- [ ] 下一步：加入微动效（hover / transition）统一节奏

## 验收口径
1. Dashboard 首屏在 10 秒内读懂“量级 + 质量 + 执行状态”。
2. Leads 常见操作（筛选、编辑、批量状态变更）不超过 3 步。
3. 深色主题视觉更统一，不出现内容拥挤或可读性下降。
