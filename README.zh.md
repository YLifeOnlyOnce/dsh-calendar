# 📅 dsh-calendar

> **一眼看清 DeepSeek 在什么时间、做了什么、做了多久。** 一个漂亮、跟随主题的 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 使用日程表 —— 每个项目与任务的执行时间，支持 **日 / 7天 / 月 / 年** 视图。

[English](README.md) | 中文

[![npm version](https://img.shields.io/npm/v/dsh-usage-calendar)](https://www.npmjs.com/package/dsh-usage-calendar) [![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

![dsh-calendar banner](docs/screenshots/banner.png)

---

## 效果预览

四个时间视角看你的 DeepSeek 使用 —— 亮色与暗色都自动跟随 DSH。

<table align="center">
  <tr>
    <td align="center"><img src="docs/screenshots/logs-year.png" width="175" alt="年视图"/><br/><b>🗓️ 年</b></td>
    <td align="center"><img src="docs/screenshots/logs-month.png" width="175" alt="月视图"/><br/><b>🗂️ 月</b></td>
    <td align="center"><img src="docs/screenshots/logs-7days.png" width="175" alt="7天视图"/><br/><b>📅 7天</b></td>
    <td align="center"><img src="docs/screenshots/logs-day.png" width="175" alt="日视图"/><br/><b>⏱️ 日</b></td>
  </tr>
</table>

<table align="center">
  <tr>
    <td align="center"><img src="docs/screenshots/card-7days.png" width="280" alt="主界面卡片 7天"/><br/><b>🃏 主界面卡片 · 7天</b></td>
    <td align="center"><img src="docs/screenshots/card-day.png" width="280" alt="主界面卡片 日"/><br/><b>🃏 主界面卡片 · 日</b></td>
  </tr>
</table>

---

## 为什么需要它

你每天都在用 DeepSeek Harness —— 几十个会话、后台任务、周期提醒。但一直缺一个"看见工作"的窗口：每个项目什么时候跑的、跑了多久、有多少工具活动、下个周期任务什么时候触发。

`dsh-calendar` 把你的使用历史变成一个漂亮的日历 —— **零配置、不引入额外数据存储、无需维护。** 装好、重启、打开 **设置 → 📅 日程表**，全部历史都在。

## 功能特性

| | |
|---|---|
| 🗓️ **年度热力图** | GitHub 风格 52×7 活跃贡献图 —— 一眼看出你哪段时间最忙 |
| 📅 **7天时间线** | 七列、每列一天，纵向 24h 时间线。每个会话保持专属色，跨天也能追踪同一个任务 |
| ⏱️ **日视图时间轴** | 24h Gantt 轴线，按工作区 → 会话分组。turn 合并为**任务段** —— 一次用户输入开启一个任务，后续工作并入，一个任务一根条 |
| 🗂️ **月历** | 经典日历网格 + 每日热度条与统计 |
| 🃏 **主界面卡片** | 可拖拽的小卡片（统计 / 年 / 7天 / 日 / 月）悬浮在主界面之上 —— 移动、折叠、关闭；在设置页勾选展示哪些。磨砂半透明 + 柔和阴影，轻盈地浮在工作内容之上 |
| 🏷️ **工作区标题行** | 时间轴的工作区行带文件夹图标、发光渐变条与会话数/活跃时长徽章 —— 每个工作区一目了然 |
| 🖱️ **点击直达** | 点击任意时间轴区间，**直接打开对应的对话会话** |
| 📊 **统计条** | 所选范围的活跃时长 / 会话数 / 轮次 / 工具调用，数字滚动动画 |
| 🎨 **主题跟随** | 跟随 harness 主题 —— 亮色与暗色自动适配；时间条与热力图在两种主题下都使用真正的品牌蓝 |
| ✨ **动画** | 柔和的入场效果与解密式标题动画 —— 不花哨、不碍事 |
| 🕐 **历史数据开箱即用** | 过去的会话启动时自动折叠缓存 —— 上个月的活动无需打开任何会话即可见 |

## 安装

```sh
dsh plugin --profile web add dsh-usage-calendar
```

重启 `dsh web`，然后打开 **设置 → 📅 日程表**。

## 使用方法

- **视图切换**：一键切换 日 / 7天 / 月 / 年；`‹ ›` 步进，**今天**一键回到当前。
- **点击直达**：点击热力图格子、月历格子或时间轴区间，跳到对应日期或对话会话。
- **主界面卡片**：按住 `⠿` 任意移动、`▾` 折叠、`×` 关闭；在 **设置 → 日程表 → 主界面卡片** 重新勾选。
- **悬浮**：任意格子或区间显示精确的时间窗、时长与轮次数。
- **实时**：运行中会话的区间脉冲显示，今天的日视图绘制实时"现在"线。

## 演示预览

▶️ **在线演示：** [打开展示页](https://htmlpreview.github.io/?https://raw.githubusercontent.com/YLifeOnlyOnce/dsh-calendar/main/docs/showcase.html) —— hero banner、四个视图与主界面卡片，可直接截图。

本地预览也不需要真实 harness —— 仓库自带一个用丰富示例数据的演示页（可切换亮/暗）：

```sh
pnpm demo:build && open docs/demo.html
```

## Roadmap

- **周期任务面板**（即将触发 / 已逾期 / 触发历史）与时间轴上的 ⏰ 标记
- **年度 Wrapped 报告** + 可分享的 PNG 导出
- 工作区筛选与会话搜索
- iCal 导出 DeepSeek 活跃时段

## License

[MIT](LICENSE)
