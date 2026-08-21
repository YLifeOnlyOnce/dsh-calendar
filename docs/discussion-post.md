# 📅 dsh-calendar — 把 DeepSeek 的使用痕迹，变成一张好看的日程表

> **One glance at what DeepSeek did, and when.** 一个漂亮、跟随主题的 DeepSeek Harness 使用日程表插件：每个项目与任务的执行时间，支持 **日 / 7天 / 月 / 年** 四种视图，外加可拖拽的主界面小卡片。

<div align="center">

[![npm version](https://img.shields.io/npm/v/dsh-usage-calendar)](https://www.npmjs.com/package/dsh-usage-calendar)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/YLifeOnlyOnce/dsh-calendar/blob/main/LICENSE)

![dsh-calendar banner](https://raw.githubusercontent.com/YLifeOnlyOnce/dsh-calendar/main/docs/screenshots/banner.png)

</div>

---

## ✨ 它解决什么问题

你每天都在用 DeepSeek Harness——几十个会话、后台任务、周期提醒。但一直缺一个「看见工作」的窗口：**每个项目什么时候跑的、跑了多久、用了多少 token、下个周期任务什么时候触发**。

`dsh-calendar` 把已有的使用历史变成一张漂亮的日历——**零配置、不引入额外数据存储、无需维护**。安装 → 重启 → 打开 **设置 → 📅 日程表**，全部历史都在。

## 🎯 核心功能

| | |
|---|---|
| 🗓️ **年度热力图** | GitHub 风格 52×7 活跃贡献图，一眼看出你哪段时间最忙 |
| 📅 **7天时间线** | 七列、每列一天，纵向 24h 时间线。每个会话保持专属色，跨天也能追踪同一个任务 |
| ⏱️ **日视图时间轴** | 24h Gantt 轴线，按工作区 → 会话分组。一次问答算一段——turn 自动合并为**任务段**，一根条一个任务 |
| 🗂️ **月历** | 经典日历网格 + 每日热度条与统计 |
| 🏆 **会话排行** | 按月份排名 TOP 会话：活跃时长 / 轮次 / 工具调用 / token，领奖台徽章 🥇🥈🥉 |
| ⏰ **周期提醒面板** | 所有会话的提醒一目了然：即将触发 / 已过期 / 触发历史，时间线上有 ⏰ 标记 |
| 🪙 **Token 用量** | 按日 / 会话 / 工作区统计计费 token（输入 + 缓存 + 输出）——provider 上报时精确，否则启发式估算 |
| 🃏 **主界面卡片** | 可拖拽的小卡片（统计 / 年 / 7天 / 日 / 月 / 提醒）悬浮在主界面之上，磨砂半透明，轻盈不挡事 |
| 🖱️ **点击直达** | 点任意时间轴区间 / 热力图格子，**直接打开对应的对话会话** |
| 🎨 **主题跟随** | 亮色与暗色自动适配，两种主题下都使用真正的品牌蓝 |

## 📸 效果预览

**日视图（暗色 / 亮色）** — 顶部是当日时间线，提醒触发时刻有 ⏰ 标记：

<table align="center">
  <tr>
    <td align="center"><img src="https://raw.githubusercontent.com/YLifeOnlyOnce/dsh-calendar/main/docs/screenshots/logs-day-dark.png" width="340" alt="日视图（暗色）"/><br/><b>🌙 Dark</b></td>
    <td align="center"><img src="https://raw.githubusercontent.com/YLifeOnlyOnce/dsh-calendar/main/docs/screenshots/logs-day-light.png" width="340" alt="日视图（亮色）"/><br/><b>☀️ Light</b></td>
  </tr>
</table>

**年 / 月 / 7天视图**：

<table align="center">
  <tr>
    <td align="center"><img src="https://raw.githubusercontent.com/YLifeOnlyOnce/dsh-calendar/main/docs/screenshots/logs-year.png" width="200" alt="年视图"/><br/><b>🗓️ Year</b></td>
    <td align="center"><img src="https://raw.githubusercontent.com/YLifeOnlyOnce/dsh-calendar/main/docs/screenshots/logs-month.png" width="200" alt="月视图"/><br/><b>🗂️ Month</b></td>
    <td align="center"><img src="https://raw.githubusercontent.com/YLifeOnlyOnce/dsh-calendar/main/docs/screenshots/logs-7days.png" width="200" alt="7天视图"/><br/><b>📅 7-day</b></td>
  </tr>
</table>

**主界面悬浮卡片**：

<table align="center">
  <tr>
    <td align="center"><img src="https://raw.githubusercontent.com/YLifeOnlyOnce/dsh-calendar/main/docs/screenshots/card-7days.png" width="300" alt="7天卡片"/><br/><b>7-day</b></td>
    <td align="center"><img src="https://raw.githubusercontent.com/YLifeOnlyOnce/dsh-calendar/main/docs/screenshots/card-day-dark.png" width="300" alt="日卡片（暗色）"/><br/><b>Day · 🌙</b></td>
    <td align="center"><img src="https://raw.githubusercontent.com/YLifeOnlyOnce/dsh-calendar/main/docs/screenshots/card-day-light.png" width="300" alt="日卡片（亮色）"/><br/><b>Day · ☀️</b></td>
  </tr>
</table>

## 🚀 安装

```sh
dsh plugin --profile web add dsh-usage-calendar
```

重启 `dsh web`，然后打开 **设置 → 📅 日程表**。

> **兼容性**：`0.1.4` 适配 DSH **0.1.1-rc.1**（`next`）；`0.1.0–0.1.3` 对应 `0.1.0-rc.7`。

## ▶️ 在线预览

不用装也能先看效果：[打开 showcase 演示页](https://htmlpreview.github.io/?https://raw.githubusercontent.com/YLifeOnlyOnce/dsh-calendar/main/docs/showcase.html)——首页横幅、四种视图、主界面卡片，亮暗主题可切换，直接拿来截图。

## 🔗 链接

- **源码**: https://github.com/YLifeOnlyOnce/dsh-calendar
- **npm**: https://www.npmjs.com/package/dsh-usage-calendar
- **README**: [English](https://github.com/YLifeOnlyOnce/dsh-calendar/blob/main/README.md) · [中文](https://github.com/YLifeOnlyOnce/dsh-calendar/blob/main/README.zh.md)

---

*如果你也在用 DeepSeek Harness 干大事，欢迎装上试试，顺手点个 ⭐ 支持一下——遇到问题或想要新功能，欢迎在 issues 里聊！*
