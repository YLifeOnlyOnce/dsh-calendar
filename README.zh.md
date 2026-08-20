# dsh-calendar

> 一个漂亮的 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 使用日程表 —— 一眼看清 DeepSeek 在什么时间、做了什么、做了多久，支持日 / 月 / 年视图与周期任务排期。

[English](README.md) | 中文

**状态：M1（数据层）。** `calendar` 会话投影单元已实现并通过单元测试；Web 日程表页面（日/月/年视图 + 动画）将在 M2 落地。

## 展示内容

- **时间**：每个项目（Workspace）与任务（Session）的活跃时段 —— 从持久化会话日志折叠（`turn/start` → `turn/end` 区间、工具调用、用户输入）。
- **用量**：每日活跃时长、turn / 工具调用数、模型墙钟时间、失败数。
- **周期任务**：schedule 子系统的提醒（`after` / `at` / `every`）、下次触发时间与触发历史。

## 启用

```sh
dsh web --patch dsh-calendar/cordis.patch.yml
```

然后打开 **设置 → 📅 日程表**。

## 数据模型

每个会话一个 `calendar` 投影值（见 [`src/types.ts`](src/types.ts)）：

| 字段 | 含义 |
|---|---|
| `days` | 每本地日的聚合桶（activeMs、turns、tools、llmMs、prompts、failedTurns），按 `keepDays` 截断 |
| `recentIntervals` | 最近的 turn 区间 / 用户输入点，按 `intervalCap` 截断 |
| `hourProfile` | 最近 `hourProfileDays` 天的 24 小时活跃强度 |
| `schedules` / `scheduleHistory` | 活跃周期任务 + 触发历史 |
| `firstActivityAt` / `lastActivityAt` / `totalActiveMs` | 全日志极值与总活跃时长 |

活跃时长 = 已关闭 turn 的墙钟跨度，按本地日历日归属（宿主机时区）。折叠统计会话完整日志（whole-log 语义，与 `dsh-session-stats` 一致），fork 子会话会显示其继承的父历史。

## 开发

```sh
pnpm install
pnpm typecheck
pnpm test
pnpm build
```

## License

MIT
