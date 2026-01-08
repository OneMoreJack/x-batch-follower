# One-Click Follower for X (一键批量关注)

[English](README.md) | 简体中文

<div align="center">
  <img src="public/icons/icon-128.png" width="128" height="128" alt="One-Click Follower for X 图标" />
  <p><strong>智能提取网页中的 X (Twitter) 账号并实现一键自动批量关注。</strong></p>
</div>

---

## 📥 下载与安装 (推荐)

如果您不想从源码编译，可以直接下载使用：

1.  访问 [Releases](https://github.com/OneMoreJack/One-Click-Follower-for-X/releases) 页面。
2.  下载最新的 `xxx.zip` 压缩包。
3.  在 Chrome 浏览器中打开 `chrome://extensions/`。
4.  在右上角开启 **开发者模式**。
5.  将下载的 `xxx.zip` 文件直接拖动到该页面即可完成安装。

---

## 🚀 功能特性

- **智能提取**：自动识别当前网页中所有的 X (Twitter) 用户名。
- **批量处理**：一键即可自动关注所有识别出的用户。
- **实时发现**：在清晰的弹出窗口中列出所有找到的账号。
- **保护隐私**：所有数据处理均在本地浏览器完成，不上传服务器。

---

## 🛠 开发者模式安装 (从源码编译)

1.  **克隆仓库**:
    ```bash
    git clone https://github.com/OneMoreJack/x-batch-follower.git
    cd x-batch-follower
    ```

2.  **安装依赖**:
    ```bash
    pnpm install
    ```

3.  **构建项目**:
    ```bash
    pnpm run build
    ```

4.  **加载到 Chrome**:
    - 打开 Chrome 并进入 `chrome://extensions/`。
    - 开启右上角的 **开发者模式**。
    - 点击 **加载已解压的扩展程序** 并选择本项目中的 `dist` 文件夹。

---

## 💻 使用方法

1.  访问任何包含 X 账号的网页（例如“推荐关注”列表或社区目录）。
2.  点击浏览器工具栏中的 **One-Click Follower** 图标。
3.  在弹窗中确认找到的账号列表。
4.  点击 **Follow All** 开始自动批量关注（请确保您已登录 X 账号）。

---

## 🏗 开发相关

本项目基于以下技术构建：
- **React 19**
- **Vite** (构建工具)
- **Tailwind CSS** (样式)
- **Chrome Extension API** (Manifest V3)

运行开发服务器（仅用于 UI 设计）:
```bash
npm run dev
```

---

## 🛡 隐私政策

我们非常重视您的隐私。本扩展不会收集或传输任何个人数据。更多详情请参阅我们的 [隐私政策](privacy.md)。

## 📄 开源协议

MIT
