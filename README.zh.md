# 📅 dsh-calendar

> **一眼看清 DeepSeek 在什么时间、做了什么、做了多久。** 一个漂亮、跟随主题的 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 使用日程表 —— 每个项目与任务的执行时间，支持 **日 / 7天 / 月 / 年** 视图。

[English](README.md) | 中文

[![npm version](https://img.shields.io/npm/v/dsh-usage-calendar)](https://www.npmjs.com/package/dsh-usage-calendar) [![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

---

## 效果预览

**年度热力图 · 7天时间线 · 日视图 Gantt · 月历**（演示数据，亮/暗主题自动跟随 DSH）

![dsh-calendar 年度热力图](docs/screenshots/demo-dark-top.png)

![dsh-calendar 日视图与7天时间线](docs/screenshots/demo-dark-bottom.png)

![dsh-calendar 亮色主题](docs/screenshots/demo-light-top.png)

## 为什么需要它

你每天都在用 DeepSeek Harness —— 几十个会话、后台任务、周期提醒。但一直缺一个"看见工作"的窗口：每个项目什么时候跑的、跑了多久、有多少工具活动、下个周期任务什么时候触发。

`dsh-calendar` 把 harness 的**持久化会话日志**折叠成一个漂亮、跟随主题的日历。打开 **设置 → 📅 日程表**，全部使用历史都在 —— 零配置、不引入额外数据存储、无需维护。

## 功能特性

| | |
|---|---|
| 🗓️ **年度热力图** | GitHub 风格 52×7 活跃贡献图，格子逐列生长动画 |
| 📅 **7天时间线** | 七列、每列一天 —— 纵向 24h 时间线，会话按专属色标记（同一会话跨天同色，可追踪） |
| ⏱️ **日视图时间轴** | 24h Gantt 轴线，按工作区 → 会话分组。turn 区间合并为**任务段**（用户输入开启一段，5 分钟内的 turn 并入），带脉冲的红色**现在**线 |
| 🗂️ **月历** | 经典月历网格 + 每日热度条与统计 |
| 🃏 **主界面卡片** | 可拖拽的小卡片（统计、年、7天、日、月）悬浮在主界面之上 —— 任意移动、折叠、关闭；在设置页勾选展示哪些 |
| 📊 **统计条** | 当前范围的活跃时长 / 会话数 / 轮次 / 工具调用，带 decrypt 解密动画与数字滚动 |
| 🖱️ **点击直达** | 点击任意时间轴区间，**直接打开对应的对话会话** |
| 🎨 **主题跟随** | 所有颜色经由 harness ui-theme tokens 解析 —— 亮色与暗色模式自动适配 |
| ✨ **动画** | [anime.js](https://animejs.com) 入场效果 + 自实现的 decrypt-reveal 标题动画（灵感来自 [canvas-ui 的 DecryptReveal](https://github.com/DavidHDev/canvas-ui)） |
| 🕐 **历史数据开箱即用** | 启动时自动折叠并缓存所有持久化会话 —— 上个月的活动无需打开任何会话即可见 |

## 先看效果 —— 演示预览

不需要真实 harness：仓库自带一个用丰富合成数据的独立演示页（可切换亮/暗主题）。

```sh
pnpm demo:build     # 构建 lib/demo.js
# 然后打开 docs/demo.html（或把仓库根目录作为静态服务，如 python3 -m http.server）
```

## 安装与启用

需要与 `0.1.0-rc.7` 对齐的 DeepSeek Harness Web profile。

```sh
dsh plugin --profile web add dsh-usage-calendar
```

重启 `dsh web`，然后打开 **设置 → 📅 日程表**。

> 插件是一个 **bundle layer**：加入 web profile 的 `dsh.profile.bundles`、应用其 `cordis.patch.yml` 覆盖层，浏览器端通过 `dsh.client` 声明自动发现 —— 无需手工接线。

## 使用方法

- **视图切换**：用分段控件在 日 / 7天 / 月 / 年 之间切换。
- **导航**：`‹ ›` 按当前视图的粒度步进；**今天**一键回到当前；点击热力图格子或月历格子钻取到对应日期。
- **点击直达**：点击时间轴上的任务区间，打开对应的对话会话。
- **主界面卡片**：按住 `⠿` 把手拖拽移动、`▾` 折叠、`×` 关闭；在 **设置 → 日程表 → 主界面卡片** 重新勾选。
- **悬浮**：任意格子或时间轴区间显示精确的时间窗、时长与轮次数。
- **实时**：运行中会话的区间脉冲显示，今天的日视图绘制实时"现在"线。

## 工作原理

零新增基础设施：插件复用 harness 的 **session-projection 机制**（与官方 `session-stats` 同一条链路）。

```
会话事件日志（turn/start→end、tool/call→result、user/message、schedule/change…）
        │  session/event
        ▼
Host 插件 · calendar 投影单元（纯函数折叠，plain-JSON 状态）
        │  sessionProjections → session/projection 帧 + 列表行
        ▼
浏览器插件 · 聚合 useSessions() 行 → 日聚合桶、任务段、热力图
```

- **活跃时长** = 已关闭 turn 的墙钟跨度，按本地日历日归属（跨午夜切分，DST 安全）。工具调用发生在 turn 内部，单独累加会重复计时。
- **任务段** = 用户输入开启一段，后续 turn 在 5 分钟间隙内并入 —— 时间轴上"一个任务一根条"。
- **每会话 wire 值**紧凑且有界：≤ 400 个日聚合桶、≤ 1000 个近期区间、24h 活跃画像、周期任务排期与触发历史。
- **冷会话预热**：启动时通过投影缓存的 `coldSnapshot` 折叠每个持久化会话并写回检查点 —— 历史立即可见。
- **周期任务**：从 `schedule/change` 事件流折叠（schedule 子系统自己的记录）—— 展示下次触发时间与触发历史。
- **whole-log 语义**与 `session-stats` 一致：fork 子会话包含继承的父历史（已知边界）。

## 配置

在自己的 profile 的 `cordis.patch.yml` 中覆盖：

```yaml
- id: calendar
  config:
    keepDays: 400        # 每会话保留的日聚合桶（年视图需要 ~400）
    intervalCap: 1000    # 每会话保留的近期活动区间（日/7天视图精度）
    hourProfileDays: 30  # 24h 活跃画像的采样天数
```

## 开发

```sh
pnpm install
pnpm typecheck          # 严格 TypeScript
pnpm test               # 33 个单元测试（折叠语义、任务段、边界、周期任务）
pnpm build              # host ESM + 浏览器 module-loader bundle
pnpm demo:build         # 独立演示页（docs/demo.html）
pnpm verify:sessions    # 用你真实的 ~/.dsh/sessions 日志生成终端报告
```

```
项目结构：
  src/
    index.ts        # host 插件：注册投影单元 + 冷会话预热
    activity.ts     # 事件 → 日聚合桶 / 区间 / 24h 画像 折叠
    schedules.ts    # schedule/change → 提醒排期 + 触发历史 折叠
    projection.ts   # `calendar` ProjectionDefinition（zod 校验 wire 值）
    warmup.ts       # 冷会话投影预热（投影缓存 coldSnapshot）
    config.ts       # schemastery Config
    types.ts        # 共享 wire 类型 + 事件/投影声明合并
    client/
      index.ts          # 浏览器插件：设置页 + 主界面卡片 + 样式
      CalendarSection.tsx  # 设置页：视图切换、导航、统计
      CardOverlay.tsx     # 主界面悬浮卡片（shell.overlay）
      YearView / WeekView / MonthView / DayView
      useCalendarData.ts  # useSessions 聚合、任务段合并、分位数
      decrypt.tsx         # decrypt-reveal 文字动画
      calendar.css.ts     # 主题 tokens 样式表
      demo.tsx            # 演示页（mock 数据，`pnpm demo:build`）
```

## Roadmap

- **周期任务面板**（即将触发 / 已逾期 / 触发历史）与时间轴上的 ⏰ 标记
- **Wrapped 年度报告** + 可分享的 PNG 导出
- 日历内的工作区筛选与会话搜索
- iCal 导出 DeepSeek 活跃时段

## License

[MIT](LICENSE)
