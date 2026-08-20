# dsh-calendar 功能设计文档

> DeepSeek Harness 使用日程表 —— 一眼看清 DeepSeek 在什么时间、做了什么、做了多久。
> 面向「好用 + 好看 + 高星」目标的功能设计 v1。

---

## 1. 项目定位

**一句话**：一个独立的 DSH 插件项目，在 Web GUI 里新增一个「日程表」页面，以 **日 / 月 / 年** 三个维度可视化 DeepSeek Harness 里每个项目（Workspace）、每个任务（Session）的执行时间跨度与活跃强度，同时展示所有**周期任务**（Schedule 提醒）的排期与触发历史。

**目标用户**：所有用 `dsh web` 的人 —— 想知道"昨天 DeepSeek 帮我干了什么"、"这个月哪些项目在持续跑"、"下个周期任务什么时候触发"。

**高星要素**（设计从一开始就为传播服务）：

| 要素 | 设计承诺 |
|---|---|
| 一眼可读 | GitHub 风格年度贡献热力图（52×7），全年活跃一目了然 |
| 漂亮 | 渐变热力色阶、柔和圆角、暗色主题适配、流畅动画 |
| 有动画 | 视图切换过渡、热力格子生长涟漪、时间轴区间滑入、数字滚动、实时脉冲 |
| 零配置 | `dsh web --patch dsh-calendar/cordis.patch.yml` 一行启用 |
| 双语 | 中 / 英 README 与界面文案，含效果截图 |
| 轻依赖 | 只依赖 DSH 官方包与 react，无第三方 UI 库 |

---

## 2. 核心数据模型

插件理解"DeepSeek 在什么时间做了什么"依靠以下既有事实（全部来自 DSH 会话事件日志，带 epoch-ms 时间戳，已在 `docs/persistence-catalog.md` 定型）：

### 2.1 实体

```ts
/** 一个任务 = 一个会话。标题、所属工作区、创建时间来自会话头。 */
interface CalendarSession {
  sessionId: string
  title: string            // session/title 折叠值，回退到 cwd basename
  workspaceId?: string     // 会话所属 Workspace（项目），未分组的为空
  cwd: string
  firstActivityAt?: number // 首个活跃事件时间
  lastActivityAt?: number  // 最近活跃事件时间
  totalActiveMs: number    // 总活跃时长（见 2.3 区间定义）
}

/** 一个活跃区间：DeepSeek 在一段时间内连续"工作"的跨度。 */
interface ActivityInterval {
  start: number            // epoch ms
  end: number              // epoch ms；进行中（运行会话）可为 null
  kind: 'turn' | 'step' | 'tool' | 'prompt'
  sessionId: string
  title?: string           // 区间归属会话标题（客户端可省略，靠 sessionId 关联）
}

/** 每日聚合桶（日历/热力图的原子数据）。 */
interface DayBucket {
  date: string             // 'YYYY-MM-DD'（本地时区）
  activeMs: number         // 当日活跃毫秒
  turns: number            // 当日 turn 数
  tools: number            // 当日工具调用数
  llmMs: number            // 当日模型调用墙钟时间
  prompts: number          // 当日用户消息数
  failedTurns: number      // 当日失败 turn 数（turn/end reason 非正常）
  workflowRuns: number     // 当日 workflow run 数
  subagents: number        // 当日子代理数
}

/** 周期任务（来自 schedule/change 事件折叠，语义与 schedule 子系统一致）。 */
interface CalendarSchedule {
  id: string
  sessionId: string        // 归属会话
  kind: 'after' | 'at' | 'every'
  prompt: string           // 提醒内容
  scheduledAt: string      // RFC 3339 UTC 目标
  everySeconds?: number    // every 记录的固定间隔
  state: 'scheduled' | 'overdue' | 'dispatched' | 'deleted'
  firedAt?: string         // 最近一次触发时间（dispatch 事件时间）
}
```

### 2.2 "活跃区间"定义（折叠规则）

区间是日历的最小视觉单元，从会话事件流折叠：

| 区间来源 | 开始事件 | 结束事件 | kind |
|---|---|---|---|
| 一轮对话 turn | `turn/start` | `turn/end`（含 reason） | `turn` |
| 用户输入时刻 | `user/message`（source kind=`user`） | 无（点事件） | `prompt` |

- **activeMs = 已关闭 turn 的墙钟跨度之和**。step/tool 的墙钟已包含在 turn 区间内，不计为独立区间（避免重复计时）；step 的 `step/start` → `assistant/message` 时长仅用于 `llmMs` 统计。
- **折叠期不做区间合并**（activeMs 不含 turn 之间的空隙）；日视图上相邻区间由客户端按视觉阈值（60s）连绘，避免噪点。
- 点事件（`prompt`）在日视图上渲染为时刻标记，不占宽度；计入 `prompts` 计数与近期区间环。
- 进行中的会话：最后一个未关闭的 turn 由客户端结合会话实时状态渲染为"进行中"（投影值不含运行标志）。
- **whole-log 边界**：折叠统计会话完整日志（与 `session-stats` 一致）。fork 子会话的投影包含继承的父历史，跨会话聚合时父历史被父/子会话各计一次 —— 已知边界，后续在投影单元可访问会话头（`seedLength`）时收敛。

### 2.3 周期任务数据

- 直接折叠 `schedule/change` 事件（create / delete / dispatch），与 `dsh-schedule` 的持久化折叠一致（fork 不继承父会话提醒；`scheduledAt` 一律 UTC）。
- 展示两类信息：
  - **排期视图**：每个会话当前 active 的提醒（`scheduled` / `overdue`），按 next due 排序 —— "下个周期任务什么时候触发"。
  - **触发历史**：dispatch 事件按时间落到日历 —— "周期任务实际在哪些时间点唤醒过 DeepSeek"。

### 2.4 正在运行的任务（实时层）

- 客户端已镜像宿主 `session/jobs` 帧（`jobsBySession`）：正在运行的 bash 后台任务（含 `startedAt`）。
- 日视图"现在"列叠加：运行中的后台任务 + 运行中的会话，显示脉冲动画。

---

## 3. 架构

### 3.1 总体数据流

```
会话事件日志 (SessionEvent, epoch-ms time)
   │  session/event 提交
   ▼
Host 插件 dsh-calendar（投影单元 calendar）
   │  init/apply/view 纯函数折叠 → 整值 JSON
   ▼
sessionProjections 注册表 → session/projection 推送帧 + 列表行镜像
   ▼
Client 运行时 SessionSummary.projectionValues（每个会话一行）
   ▼
Client 插件 dsh-calendar（日程表页面）
   │  useSessions() × useWorkspaces() 聚合
   ▼
日 / 月 / 年视图渲染（Canvas-free，纯 DOM + CSS 动画）
```

**关键决策**：数据通道完全复用 DSH 现成的 **session-projection 机制**（与官方 `session-stats` 同一条路），**不引入新的 RPC / API 网关**。原因：

1. 独立插件项目无法运行 DSH 仓库内的 Typert 生成器构建链（`@Remote` 需要 build 期 TS Program 分析）；
2. 投影机制自带推送、缓存（`session-projection-cache`）、HMR 生命周期，零额外基建；
3. 官方先例 `session-stats` 证明这条路对独立折叠插件完全可行。

### 3.2 Host 端（Node）

```
dsh-calendar/
  src/index.ts          # 插件主体：apply(ctx, config) → 注册投影单元 + 生命周期
  src/activity.ts       # 事件 → 活动区间 / 每日桶 折叠纯函数
  src/schedules.ts      # schedule/change → 排期视图 折叠纯函数
  src/types.ts          # 2.x 的共享 wire 类型（host/client 共用，type-only）
  src/config.ts         # schemastery Config：mergeGapMs / keepDays / intervalCap…
```

投影单元注册（对齐 `session-projection` 契约）：

```ts
ctx.sessionProjections.register({
  key: 'calendar',
  schema: CalendarValueSchema,   // zod，整值 JSON 校验
  stateVersion: 1,
  init: () => emptyState,
  apply: (state, event) => foldActivity(state, event),   // 纯同步
  view: (state) => toWireValue(state),                   // 整值视图
})
```

**折叠产物（wire 值，控制体积）**：

```ts
interface CalendarValue {
  firstActivityAt?: number
  lastActivityAt?: number
  totalActiveMs: number
  /** 每日桶：保留最近 keepDays（默认 400）天，之前只留合计。 */
  days: DayBucket[]                      // ≤ 400 条
  /** 近期精确区间：最近 intervalCap（默认 300）条。 */
  recentIntervals: ActivityInterval[]    // 日视图"今天/昨天"的精确渲染数据
  /** 24 小时活跃画像：最近 hourProfileDays（默认 30）天按小时聚合。 */
  hourProfile: number[]                  // 24 个值，0..1 归一
  /** 周期任务：活跃排期（客户端按本地时钟派生 scheduled/overdue）+ 最近 50 条触发。 */
  schedules: CalendarSchedule[]
  scheduleHistory: CalendarDispatch[]
}
// DayBucket = { date, activeMs, turns, tools, llmMs, prompts, failedTurns }
```

体积预算：`days ≤ 400 × ~60B + intervals ≤ 300 × ~48B + 其余` ≈ **30–50 KB / 会话**，与投影机制"UI 规模整值"定位一致（可后续加每 key 懒加载）。v1 不含 workflow/subagent 计数（其事件类型需额外声明合并，价值有限，推迟）。

### 3.3 Client 端（Browser）

```
dsh-calendar/
  src/client/index.ts        # apply：注册 settings.section 页面 + 文案 + 实时刷新
  src/client/CalendarSection.tsx   # 页面外壳：视图切换（日/月/年）+ 筛选 + 统计头
  src/client/YearView.tsx     # GitHub 风格 52×7 贡献热力图 + 月份轴
  src/client/MonthView.tsx    # 月历网格：每日热度 + 区间计数 + 悬浮详情
  src/client/DayView.tsx      # 24h 时间轴：会话区间 Gantt + 周期任务标记 + 运行任务
  src/client/SchedulePanel.tsx# 周期任务列表：upcoming / overdue / 触发历史
  src/client/useCalendarData.ts # useSessions()×useWorkspaces() 聚合 → 视图模型
  src/client/animations.ts / calendar.css # 动画与主题
```

页面注册（复用官方 settings 页面模式，`ui-settings-models` 同款）：

```ts
ctx.slots.inject('settings.section', () => ctx.slots.register({
  name: 'settings.section',
  id: 'calendar',
  order: 40,                       // 排在 Models 之后
  label: () => t('nav'),           // "📅 日程表"
  inject: ['sessions', 'workspaces', 'locale', 'jobs'],
}, CalendarSection))
```

数据聚合：`useSessions()` 每一行的 `projectionValues['calendar']` 即为该会话的 CalendarValue；客户端按 Workspace 分组、按日期累加生成视图模型。**不打开会话、不拉全量日志**。

---

## 4. 功能规格

### 4.1 三个核心视图

#### 年视图（Year）—— 第一眼冲击

- GitHub 风格贡献热力图：52 周 × 7 天网格，格子颜色按当日 `activeMs` 分 5 档色阶（无/低/中/高/极高），右列 4 档图例。
- 顶部月份轴（Jan…Dec）、左侧星期标签；未来日期灰显。
- 悬浮格子 → tooltip：日期、活跃时长、turn 数、工具数、涉及项目。
- 点击某天 → 平滑钻取到月视图（自动定位该月）。
- 动画：进入时格子按"周列"从左到右逐列生长（staggered fade+scale），悬停放大 1.3x + 阴影。

#### 月视图（Month）

- 传统月历网格（周一开头），每日格子显示：热度底色 + 活跃时长徽标 + 区间数。
- 今日格子描边 + 脉冲点；非本月日期淡显。
- 点击某天 → 钻取到日视图；点击"今天"按钮快速返回。
- 动画：月份切换时网格内容淡入 + 格子依次上浮；切换月份用水平滑入。

#### 日视图（Day）—— "什么时间做了什么"

- 顶部 24h 时间轴（0:00–24:00），主区按**会话（任务）行**纵向排列，每行渲染该会话当天的活动区间条（Gantt 风格，颜色按 kind 区分：turn=蓝、tool=紫、step=青、prompt=绿点）。
- 背景叠加 24h 活跃画像热力条（该会话最近 30 天"典型活跃时段"）。
- 周期任务标记：`scheduledAt` 落在当天的提醒在时间轴上以"⏰ 标记 + 悬浮卡片"显示。
- 实时层：现在时刻竖线 + 红色脉冲；运行中的会话区间以"→ 现在"动画延伸；运行中的后台任务以芯片悬浮在对应行。
- 点一个区间 → 悬浮卡片：时间跨度、时长、turn/tool 数、所属会话；点"打开会话"跳转。

### 4.2 周期任务面板（Schedule）

- 位于页面右侧（或日视图下方）的可折叠面板，两类列表：
  - **即将触发**：所有会话 active 的 `after/at/every` 提醒，按 next due 排序，`overdue` 红色高亮，显示归属会话与内容。
  - **触发历史**：最近 N 条 dispatch（时间、会话、内容）。
- 与日视图联动：点击提醒 → 日历定位到它的触发时间/目标时间。

### 4.3 顶部统计摘要

当前选中范围（年/月/日）的聚合卡：**总活跃时长 · 完成 turn 数 · 工具调用数 · 失败 turn 数 · 活跃项目数 · 最活跃时段**。数字变化时滚动动画（count-up）。

### 4.4 筛选与导航

- 按 **Workspace（项目）** 多选过滤；未分组会话独立一项。
- 按会话关键词过滤。
- 视图切换器（日/月/年）+ 日期导航（上一天/下一天、今天、跳转选择器）。
- 无数据状态：友好空态 + "新建会话"引导（不报错，冷会话策略见 4.5）。

### 4.5 冷会话（persisted 但未打开）策略

- 投影单元格对冷会话在首次读取时惰性折叠；若装配了 `session-projection-cache`，从持久化行种子化 —— Web 装配默认挂载，因此**开箱即有历史**。
- 无投影值的会话（如从未激活的空白会话）：日历按"无活跃"处理，不展示，不计入统计。
- 文档中说明：未挂载 cache 的冷装配，历史从"会话被打开/恢复"开始累积（与 session-stats 同边界）。

### 4.6 主题与动画规范

- 完全适配 DSH 暗色主题（复用 ui-theme 令牌色系：背景 #12151a 系、主色 #4D6BFE 系、强调绿/紫/青）。
- 动画全走 CSS transforms/opacity（GPU 合成），尊重 `prefers-reduced-motion`（降级为淡入）。
- 色阶 5 档对色觉障碍友好（亮度 + 饱和度双编码，不单靠颜色）。

---

## 5. 性能与规模边界

| 项 | 设计值 |
|---|---|
| 每会话 wire 值 | ≤ 400 日桶 + ≤ 300 近期区间 ≈ 30–50 KB |
| 客户端聚合 | 数百会话 × 读投影整值（引用稳定，无订阅放大） |
| 投影 apply | 每事件 O(1) 纯函数，与 event 无关时返回同引用（机制自带门控） |
| 年视图渲染 | 52×7=364 个 DOM 节点 + 月/日视图按需渲染，无虚拟化压力 |
| 实时刷新 | 投影推送帧驱动 + 客户端 1s 节流重绘"现在"线 |

---

## 6. 工程结构（独立项目，对齐 dsh-smarthome 模板）

```
/Users/yao/workspace/deepseek harness/dsh-calendar/
  package.json               # name: dsh-calendar; dsh.bundle.patch + dsh.client manifest
  cordis.patch.yml           # insert calendar host 插件（可配置项见下）
  tsconfig.json
  tsdown.config.ts           # host 构建
  tsdown.client.config.ts    # client 构建（window.__ModuleLoader__ 格式，同 smarthome）
  src/                       # 见 3.2 / 3.3
  tests/
    activity.test.ts         # 折叠单元测试（区间配对、合并、每日桶）
    schedules.test.ts        # schedule/change 折叠测试
    calendar.client.spec.tsx # 组件测试（视图渲染、聚合）
  README.md / README.zh.md   # 双语 + 截图 + 安装/配置/权限说明
  docs/screenshots/          # 三视图效果图（star 导向）
```

**依赖**（peer + dev，版本对齐 `0.1.0-rc.7`）：
- host：`@deepseek-ai/cordis`、`@deepseek-ai/dsh-session`（事件类型）、`@deepseek-ai/dsh-session-projection`（注册投影）、`@deepseek-ai/schemastery`（Config）
- client：`react`、`@deepseek-ai/dsh-client-runtime/client`（类型）、`@deepseek-ai/dsh-client-ui-slots`（slot 类型 + LocaleNamespaceMap 合并）、`@deepseek-ai/dsh-client-locale/client`（文案）、`@deepseek-ai/dsh-client-ui-primitives`（图标，可选）
- client external：react 家族 + `@deepseek-ai/dsh-client-runtime/client` + `@deepseek-ai/dsh-client-ui-slots` + `@deepseek-ai/dsh-client-web-react` + `@deepseek-ai/dsh-client-ui-primitives`（同 smarthome 的 externals 表）

**启用方式**（对齐 web-schedule 示例）：
```sh
dsh web --patch dsh-calendar/cordis.patch.yml
```
`cordis.patch.yml` 内容：
```yaml
- insert:
    - id: calendar
      name: dsh-calendar
      config:
        keepDays: 400
        intervalCap: 300
        hourProfileDays: 30
```

---

## 7. 里程碑

| 阶段 | 内容 | 验收 |
|---|---|---|
| **M1 数据层** ✅ | 项目骨架 + host 投影单元（activity/schedules 折叠）+ 单元测试 | 折叠正确、wire 值体积达标、随会话事件实时更新 |
| **M2 年/月视图** | settings 页面 + YearView 热力图 + MonthView + 动画 | 三视图数据正确、动画流畅、暗色主题适配 |
| **M3 日视图 + 周期任务** | DayView 时间轴 + SchedulePanel + 实时层 | 区间/提醒/运行任务完整呈现、交互达标 |
| **M4 打磨发布** | 统计摘要、筛选、空态、reduced-motion、双语 README + 截图、演示视频 | 可直接 `--patch` 启用，README 具备高星质量 |

**M1 落地记录**：`dsh-calendar` 项目已创建（`src/activity.ts` 活动折叠、`src/schedules.ts` 周期任务折叠、`src/projection.ts` 投影单元、27 个单元测试通过、`pnpm build` 产出 host + client 双 bundle）。与设计稿的偏差：去掉 `mergeGapMs`（折叠期不合并）、`DayBucket` 不含 workflow/subagent 计数、wire 值不含 `running`（客户端用会话实时状态）、区间 kind 收敛为 `turn`/`prompt`。

---

## 8. 已确认的开放决策（推荐值）

1. **项目名/位置**：`dsh-calendar`，与 `dsh-smarthome` 平级（`/Users/yao/workspace/deepseek harness/dsh-calendar`）。✅ 推荐
2. **UI 主入口**：v1 用 `settings.section` 页面（设置面板 1080×700，稳妥、官方同款模式）；后续可做全屏沉浸式覆盖层。⚠️ 可选替代：全屏覆盖层 + 侧栏触发（需更多 slot 定制，风险略高）
3. **数据通道**：session-projection 机制（无新 RPC）。✅ 推荐
4. **范围裁剪**：v1 不做 token 用量统计（`assistant/message.usage` 可作 v2 增强）、不做导出/分享图片。
5. **周期任务范围**：DSH 自带 schedule 子系统（after/at/every）；cron 类第三方调度不在 v1。
