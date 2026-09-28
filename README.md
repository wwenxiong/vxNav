<div align="center">

# 🧭 vxNav

**记录每一次启航 · 极简优雅的现代化个人网址导航与数字工作台**

[![Next.js](https://img.shields.io/badge/Next.js-16.3-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2-blue?logo=react)](https://react.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

[功能特性](#-功能特性) • [本地运行](#-本地运行) • [浏览器收藏生态](#-浏览器收藏生态) • [部署指南](#-部署指南)

</div>

---

## ✨ 功能特性

- 🎨 **极简毛玻璃美学 (Glassmorphism)**
  - 精心调配的高级拟态磨砂质感，自适应深色 / 浅色模式与高对比度文字阴影。
  - 内置精选风景壁纸，并支持自定义在线壁纸与透明度微调。

- ⚡ **120Hz 高刷新率流体动效**
  - 基于物理弹簧阻尼模型打造，滚轮滚动卡片自适应缩放呈现，丝滑无卡顿。
  - 全面启用 GPU 硬件合成层加速，消除掉帧与重绘损耗。

- 🔍 **多引擎极速聚合搜索**
  - 快速切换 Google、百度、必应、GitHub、DuckDuckGo 等主流搜索引擎。
  - 支持键盘快捷键对焦与直观的切换菜单。

- 🌤️ **实时天气与时钟仪表盘**
  - 自动基于用户公网 IP 定位当前城市，支持随时搜索切换任意城市与定位模式。
  - 实时显示气温、天气状态与高精度时钟。

- 📁 **分类导航与拖拽管理**
  - 支持创建、编辑、重命名分类，自定义图标与排列顺序。
  - **原生拖拽支持**：随意拖动书签调整先后位置，直接将书签拖入任意分类标题即刻归类。

- 📦 **高效批量管理**
  - 一键开启批量模式，批量勾选、全选/取消全选。
  - 支持跨分类批量迁移、批量置顶/取消置顶、批量删除防误触。

- ☁️ **多设备跨端云同步**
  - 内置轻量安全的用户账户系统，基于 SQLite 数据库持久化存储。
  - 手机、平板、电脑多端数据秒级自动同步，随时随地保持一致。

- 🔖 **便捷收藏与数据导入导出**
  - **书签栏小工具 (Bookmarklet)**：拖拽胶囊到浏览器书签栏，浏览任何网页随时一键收藏。
  - **浏览器扩展 (Extension)**：提供专属 Chrome / Edge 扩展插件。
  - **HTML 书签导入/导出**：兼容 Chrome、Edge、Safari、Firefox 等浏览器标准导出的书签文件，自动智能分门别类。

---

## 🚀 本地运行

确保本地已安装 **Node.js (>= 18.18)**：

```bash
# 1. 克隆代码仓库
git clone https://github.com/wwenxiong/vxNav.git
cd vxNav

# 2. 安装项目依赖
npm install

# 3. 启动开发服务器
npm run dev
```

打开浏览器访问 [http://localhost:3000](http://localhost:3000) 即可体验。

---

## 🧩 浏览器收藏生态

### 1. 书签栏一键收藏小脚本 (Bookmarklet)
在导航站点击右上角设置菜单中的 **「快捷收藏」**，将浮动按钮直接拖拽至您的浏览器书签栏即可。浏览任意网页时点击该书签，自动呼出添加弹窗。

### 2. Chrome / Edge 扩展插件
本仓库 `extension/` 目录包含已打包的 Chromium 浏览器扩展源码：
1. 访问 `chrome://extensions/` 或 `edge://extensions/`；
2. 开启右上角 **「开发者模式」**；
3. 点击 **「加载已解压的扩展程序」**，选择项目的 `extension` 目录即可。

---

## 🛠️ 构建与部署

```bash
# 生产环境编译
npm run build

# 启动生产服务
npm run start
```

---

<div align="center">
  <sub>Built with ❤️ by Wayne</sub>
</div>
