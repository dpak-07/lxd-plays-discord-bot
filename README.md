# 🤖 All-in-One Discord Bot

Production-ready, multi-server Discord bot architecture built with **Node.js 22 LTS**, **TypeScript**, **discord.js v14**, **LibSQL / SQLite**, and **Drizzle ORM**.

---

## 🌟 Key Features

1. **👋 Welcome & Goodbye System**
   - Customizable rich embeds with member avatars, member counts, server names, and custom templates (`{user}`, `{username}`, `{server}`, `{memberCount}`).
   - Direct button link to rules / guidelines.
   - Independent welcome DM options and `/welcome preview` or `/welcome test` triggers.
   - Separate departure channel announcements.

2. **⭐ XP, Levels, Ranks & Leaderboards**
   - Message-based XP with configurable rates (e.g. 15–25 XP) and cooldown anti-spam protection (prevents farming).
   - Documented XP curve: $\text{XP} = 100 \times \text{Level}^{1.5}$.
   - Role-based XP multipliers (e.g. 2x, 3x for VIP or Server Boosters).
   - Channel & role exclusions (ignore spam bots or commands).
   - Interactive rank card with ASCII progress bars, avatars, and current ranking.
   - Paginated server leaderboard with interactive **Previous / Next** buttons and medals (🥇, 🥈, 🥉).
   - Automatic level-up role reward unlocking.

3. **🛡️ Moderation & Server Protection**
   - Commands: `/mod warn`, `/mod warnings`, `/mod timeout`, `/mod kick`, `/mod ban`, `/mod unban`, `/mod purge`, `/mod slowmode`, `/mod lock`, `/mod unlock`, `/mod case`.
   - Complete Discord role-hierarchy enforcement: prevents moderating users with equal or higher roles, or the server owner.
   - Audit trail storing persistent case numbers, moderator IDs, targets, timestamps, and reasons.
   - Anti-spam automated rate limiter (e.g. >5 messages in 5s triggers automatic 1m mute).
   - Panic mode lockdown switch (`/security panic`).

4. **🏷️ Verification & Role Management**
   - Click-to-verify interactive button gate (`/verify setup`).
   - Self-assignable role selection dropdown menus (`/roles menu`).
   - Autoroles assigned to newly joined members (`/roles autorole`).

5. **🎫 Support Tickets & Feedback**
   - Private support ticket creation with interactive "Open Ticket" panel.
   - Support staff claiming (`/ticket claim`) and deletion lifecycle (`/ticket close`).
   - Community suggestion boards with automated voting reactions (`/suggest`).

6. **🎵 Optional Music Player**
   - Voice streaming using `@discordjs/voice` and `play-dl`.
   - Full playback suite: `/music play`, `/music pause`, `/music resume`, `/music skip`, `/music stop`, `/music queue`, `/music nowplaying`, `/music volume`, `/music loop`, `/music leave`.
   - Isolated architecture: audio playback failures cannot crash core leveling or moderation systems.
   - Inactivity auto-disconnect timer (leaves after 3 minutes idle).

7. **⚙️ General Utilities & Administration**
   - Diagnostic `/botinfo` displaying memory usage, ping latency, uptime, and Node.js platform info.
   - `/serverinfo`, `/userinfo`, `/avatar`, `/announce`.
   - Persistent reminders scheduler (`/remind`).
   - Interactive administrative `/setup` wizard inspecting permissions and module configuration.
   - Interactive `/help` system with category dropdown menus.

---

## 📋 Required Discord Developer Portal Setup

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications).
2. Create an Application, go to **Bot**, and retrieve your **Bot Token**.
3. Enable **Privileged Gateway Intents**:
   - ✅ **Server Members Intent** (Required for welcome, goodbye, autoroles, and rank cards)
   - ✅ **Message Content Intent** (Required for chat XP and anti-spam detection)
4. Under **OAuth2 -> URL Generator**, select:
   - Scopes: `bot`, `applications.commands`
   - Bot Permissions: `Administrator` (or `Manage Server`, `Manage Roles`, `Manage Channels`, `Moderate Members`, `Kick Members`, `Ban Members`, `Send Messages`, `Embed Links`, `Connect`, `Speak`).

---

## 🛠️ Installation & Local Setup

### 1. Requirements
- Node.js 20+ or 22+ LTS
- npm

### 2. Setup Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Fill in your credentials:
```env
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_client_id_here
GUILD_ID=optional_dev_guild_id_here
DATABASE_URL=file:./data/bot.sqlite
LOG_LEVEL=info
NODE_ENV=development
MUSIC_ENABLED=true
```

### 3. Install & Initialize
```bash
npm install
npm run db:migrate
```

### 4. Deploy Commands & Run
```bash
# Register slash commands
npm run register

# Start in development watch mode
npm run dev

# Or build & start for production
npm run build
npm start
```

---

## 🐳 Docker & Continuous 24/7 Hosting

### Docker Compose Deployment
```bash
docker compose up -d --build
```
Your SQLite database will be automatically persisted in the named volume `bot-data`.

### Free Cloud Deployment Options

| Provider | Free Tier Details | Persistence & Suitability |
| :--- | :--- | :--- |
| **Oracle Cloud Free Tier** *(Recommended)* | Always-free Ampere A1 (up to 4 OCPUs, 24 GB RAM, 200 GB disk) | Best 24/7 option; full persistence and zero sleep timers. |
| **Render.com / Railway / Fly.io** | Generous free trials or free hobby credit pools | Requires attaching a persistent disk volume for SQLite. |
| **Turso (LibSQL Cloud)** | Free tier with 9 GB storage and 500 databases | Replace local `file:` URL with `libsql://your-turso-db.turso.io` and auth token for cloud-hosted persistence. |

---

## 🧪 Testing & Code Quality

Run tests:
```bash
npm test
```

Create database snapshot backup:
```bash
npx tsx src/scripts/backup.ts
```

Compile TypeScript:
```bash
npm run build
```

---

## 📜 License
Released under the [MIT License](LICENSE).
