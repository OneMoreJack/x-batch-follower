# One-Click Follower for X

<div align="center">
  <img src="public/icons/icon-128.png" width="128" height="128" alt="One-Click Follower for X Icon" />
  <p><strong>Smartly extract X (Twitter) accounts from any webpage and follow them automatically.</strong></p>
</div>

---

## 🚀 Features

- **Smart Extraction**: Automatically find all X/Twitter handles on your current webpage.
- **Batch Processing**: Follow all identified users with just one click.
- **Real-time Discovery**: Lists all found accounts in a clean, interactive popup.
- **Privacy Focused**: All data processing happens on your local machine.

---

## 🛠 Installation (Developer Mode)

To run this extension in Chrome while in development:

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/OneMoreJack/x-batch-follower.git
    cd x-batch-follower
    ```

2.  **Install dependencies**:
    ```bash
    pnpm install
    # or npm install / yarn
    ```

3.  **Build the project**:
    ```bash
    pnpm run build
    ```

4.  **Load into Chrome**:
    - Open Chrome and navigate to `chrome://extensions/`.
    - Turn on **Developer mode** (top right).
    - Click **Load unpacked** and select the `dist` folder in this project directory.

---

## 💻 Usage

1.  Navigate to any webpage that contains X handles (e.g., a "Who to follow" list or a community directory).
2.  Click the **One-Click Follower** icon in your browser toolbar.
3.  Review the list of found accounts in the popup.
4.  Click **Follow All** to start the automated batch following process (Make sure you are logged into your X account).

---

## 🏗 Development

The project is built using:
- **React 19**
- **Vite** (Build Tool)
- **Tailwind CSS** (Styling)
- **Chrome Extension API** (Manifest V3)

Run development server (for UI testing):
```bash
npm run dev
```

---

## 🛡 Privacy Policy

We value your privacy. This extension does not collect or transmit any personal data. For more details, please see our [Privacy Policy](privacy.md).

## 📄 License

MIT
