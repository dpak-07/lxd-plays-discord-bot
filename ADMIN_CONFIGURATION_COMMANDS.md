# 🛡️ Administrator Configuration Commands Manual

> **Security & Access Control Notice:**
> All commands listed in this guide are strictly restricted to members possessing the **Administrator** (`Administrator`) permission on Discord. Non-administrative members cannot view or invoke these configuration endpoints.

---

## 📋 Table of Contents
1. [⭐ Leveling & XP Configuration](#-leveling--xp-configuration)
2. [👋 Welcome & Goodbye Announcements](#-welcome--goodbye-announcements)
3. [🛡️ Server Security & Moderation Logs](#️-server-security--moderation-logs)
4. [🏷️ Verification Gates & Self Roles](#️-verification-gates--self-roles)
5. [🎫 Support Ticket Helpdesk](#-support-ticket-helpdesk)
6. [📢 Server Announcements & Administration Dashboard](#-server-announcements--administration-dashboard)
7. [🎵 Interactive Voice Music Player](#-interactive-voice-music-player)

---

## ⭐ Leveling & XP Configuration

### Command: `/level configure`
Fine-tunes member chat XP gain parameters, cooldown timers, and the dedicated rank/level-up alert channel.

| Option | Type | Required | Description | Example |
| :--- | :--- | :--- | :--- | :--- |
| `announcement_channel` | Channel (Text) | No | Channel where level-up messages & rank alerts will be posted | `#level-ups` |
| `enabled` | Boolean | No | Turn the entire leveling system `True` or `False` | `True` |
| `min_xp` | Integer | No | Minimum random XP awarded per message | `15` |
| `max_xp` | Integer | No | Maximum random XP awarded per message | `25` |
| `cooldown` | Integer | No | Anti-spam cooldown between XP rewards in seconds | `60` |

### Command: `/level reward`
Automates role rewards when members attain a milestone level.
- `/level reward level:<number> role:<@role>`
- *Example:* `/level reward level:10 role:@Veteran`

### Command: `/level multiplier`
Applies XP booster multipliers for special roles (e.g., Server Boosters, VIPs).
- `/level multiplier role:<@role> multiplier:<number>`
- *Example:* `/level multiplier role:@Server Booster multiplier:2`

### Command: `/level ignore-channel` & `/level ignore-role`
Excludes spam channels (e.g. `#bot-commands`, `#spam`) or bots from gaining XP.
- `/level ignore-channel channel:<#channel>`
- `/level ignore-role role:<@role>`

### Command: `/level set` & `/level reset`
Manually adjusts or wipes member XP.
- `/level set user:<@user> xp:<amount>`
- `/level reset user:<@user>` *(Leave user empty to wipe the entire guild XP)*

---

## 👋 Welcome & Goodbye Announcements

### Command: `/welcome setup`
Configures greeting cards, customized announcement text, and optional rules link.

| Option | Type | Required | Description | Example |
| :--- | :--- | :--- | :--- | :--- |
| `channel` | Channel (Text) | **Yes** | Dedicated channel where welcome cards are delivered | `#welcome` |
| `message` | String | No | Custom message text (Supports `{user}`, `{server}`, `{count}`) | `Welcome {user} to {server}! Member #{count}` |
| `title` | String | No | Custom embed title | `Welcome to our server!` |
| `rules_url` | String | No | Adds an interactive button linking to server guidelines | `https://discord.gg/...` |

- `/welcome toggle enabled:<true/false>`: Turn welcome greetings on or off.
- `/welcome test`: Dispatches a live test greeting card to verify image rendering.
- `/welcome preview`: Generates an ephemeral preview card without posting.

### Command: `/goodbye setup`
Configures departure announcements when members leave.

| Option | Type | Required | Description | Example |
| :--- | :--- | :--- | :--- | :--- |
| `channel` | Channel (Text) | **Yes** | Text channel where goodbye alerts are posted | `#goodbyes` |
| `message` | String | No | Farewell message (Supports `{user}`, `{server}`, `{count}`) | `Farewell {user}, we will miss you!` |
| `color` | String | No | Hex color code for the embed | `#ED4245` |

- `/goodbye toggle enabled:<true/false>`: Enable or disable farewell messages.
- `/goodbye test`: Sends a test departure message to the configured channel.

---

## 🛡️ Server Security & Moderation Logs

### Command: `/security configure`
Configures automated raid protection, spam rate limiting, and the audit log channel.

| Option | Type | Required | Description | Example |
| :--- | :--- | :--- | :--- | :--- |
| `log_channel` | Channel (Text) | No | Channel receiving mod action logs, kicks, bans, and cases | `#mod-logs` |
| `anti_spam` | Boolean | No | Automatically detects message floods | `True` |
| `spam_threshold`| Integer | No | Max messages in 5 seconds before muting member (3-20) | `5` |
| `anti_raid` | Boolean | No | Detects sudden mass join bursts and quarantines | `True` |

### Command: `/security panic`
Instantly locks down or releases server channels in the event of an ongoing raid.
- `/security panic enabled:True` — Emergency lockdown.
- `/security panic enabled:False` — Lift lockdown.

---

## 🏷️ Verification Gates & Self Roles

### Command: `/verify setup`
Deploys an automated Click-to-Verify gate with button interaction.

| Option | Type | Required | Description | Example |
| :--- | :--- | :--- | :--- | :--- |
| `channel` | Channel (Text) | **Yes** | Verification lobby where the button will be placed | `#verify-here` |
| `role` | Role | **Yes** | Role to automatically grant on click | `@Member` |
| `message` | String | No | Custom instructions for new members | `Click to gain full access.` |
| `button_label` | String | No | Label text for the button | `Verify Now` |

### Command: `/roles menu`
Posts a dropdown select menu allowing members to self-assign up to 5 roles.
- `/roles menu channel:<#channel> title:<Title> role1:<@role> [role2]...`

### Command: `/roles autorole`
Automatically gives newcomer roles when members join the server.
- `/roles autorole role:<@role> [remove:true/false]`

---

## 🎫 Support Ticket Helpdesk

### Command: `/ticket setup`
Deploys an interactive support embed with an automatic channel generator button.

| Option | Type | Required | Description | Example |
| :--- | :--- | :--- | :--- | :--- |
| `channel` | Channel (Text) | **Yes** | Channel where the "Open Ticket" panel is posted | `#create-a-ticket` |
| `category` | Category | **Yes** | Category where ticket channels are created | `SUPPORT` |
| `support_role` | Role | **Yes** | Staff role with access to view and claim tickets | `@Support Staff` |
| `log_channel` | Channel (Text) | No | Channel where closed ticket transcripts are saved | `#ticket-transcripts` |

---

## 📢 Server Announcements & Administration Dashboard

### Command: `/setup`
Runs a server diagnostics audit checking:
- Bot permissions health (Checks if bot has Manage Roles, Channels, Members, etc.).
- Module enable/disable statuses across Welcome, Leveling, Moderation, and Verification.

### Command: `/announce`
Broadcasts official server announcements with custom hex colors and titles.
- `/announce title:<Title> content:<Body text> [color:#5865F2]`

---

## 🎵 Interactive Voice Music Player

### Features & Capabilities:
- **Interactive Player Controls:** Now supports button controllers:
  - ⏸️ / ▶️ **Toggle Play / Pause**
  - ⏭️ **Skip Track**
  - ⏹️ **Stop & Clear**
  - 🔁 **Cycle Loop Mode** *(Single Track ➔ Queue ➔ Off)*
  - 📜 **View Current Queue**
- **Channel Status Simulation:** Automatically sets the voice channel status text to:
  `🎶 Now Playing: <Song Title>`
- **Live Visual Equalizer Display:**
  `ılı.lıllılı.ıllı. 02:14 ───⚪──── 04:30 ılı.lıllılı.ıllı`

### Commands:
- `/music play query:<song title / url>` — Joins the voice channel and begins playback.
- `/music nowplaying` — Displays real-time track info with animated equalizer and controls.
- `/music volume percent:<1-100>` — Sets stream volume.
- `/music loop mode:<track/queue/off>` — Controls repeat settings.
- `/music leave` — Cleans up voice connection and resets voice channel status.
