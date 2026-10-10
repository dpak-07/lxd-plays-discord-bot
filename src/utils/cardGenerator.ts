import { createCanvas, loadImage } from '@napi-rs/canvas';
import fs from 'fs';
import path from 'path';

export async function generateWelcomeCard(options: {
  avatarUrl: string;
  username: string;
  guildName: string;
  memberCount: number;
  customBannerPathOrUrl?: string;
}): Promise<Buffer> {
  const width = 1024;
  const height = 500;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // 1. Draw Background Image
  let bgLoaded = false;
  const localDefaultBanner = path.resolve(process.cwd(), 'assets', 'welcome-banner.jpg');

  if (options.customBannerPathOrUrl) {
    try {
      const bg = await loadImage(options.customBannerPathOrUrl);
      ctx.drawImage(bg, 0, 0, width, height);
      bgLoaded = true;
    } catch {}
  }

  if (!bgLoaded && fs.existsSync(localDefaultBanner)) {
    try {
      const bg = await loadImage(localDefaultBanner);
      ctx.drawImage(bg, 0, 0, width, height);
      bgLoaded = true;
    } catch {}
  }

  if (!bgLoaded) {
    // Elegant dark red gaming gradient fallback
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#1a0000');
    grad.addColorStop(0.5, '#4a0000');
    grad.addColorStop(1, '#0d0d0d');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }

  // 2. Add subtle vignette/dimmer overlay for high contrast readability
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.fillRect(0, 0, width, height);

  // 3. Draw circular avatar with glowing red border
  const avatarSize = 160;
  const avatarX = width / 2;
  const avatarY = 140;

  ctx.save();
  // Outer Glow
  ctx.shadowColor = '#FF0033';
  ctx.shadowBlur = 25;
  ctx.beginPath();
  ctx.arc(avatarX, avatarY, avatarSize / 2 + 5, 0, Math.PI * 2);
  ctx.fillStyle = '#FF0033';
  ctx.fill();
  ctx.restore();

  // Clip Avatar
  ctx.save();
  ctx.beginPath();
  ctx.arc(avatarX, avatarY, avatarSize / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  try {
    let avatarBuffer: Buffer | null = null;
    const res = await fetch(options.avatarUrl, {
      headers: { 'User-Agent': 'DiscordBot (https://discord.js.org, v14)' },
    });
    if (res.ok) {
      avatarBuffer = Buffer.from(await res.arrayBuffer());
    }

    const avatar = avatarBuffer ? await loadImage(avatarBuffer) : await loadImage(options.avatarUrl);
    ctx.drawImage(avatar, avatarX - avatarSize / 2, avatarY - avatarSize / 2, avatarSize, avatarSize);
  } catch (err) {
    ctx.fillStyle = '#2B2D31';
    ctx.fillRect(avatarX - avatarSize / 2, avatarY - avatarSize / 2, avatarSize, avatarSize);
  }
  ctx.restore();

  // 4. Render User and Server Texts
  ctx.textAlign = 'center';

  // Subtitle: WELCOME
  ctx.font = 'bold 30px sans-serif';
  ctx.fillStyle = '#FF4444';
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 10;
  ctx.fillText('WELCOME TO THE SERVER', width / 2, 280);

  // Username
  ctx.font = 'bold 44px sans-serif';
  ctx.fillStyle = '#FFFFFF';
  const displayUser = options.username.length > 20 ? options.username.slice(0, 18) + '...' : options.username;
  ctx.fillText(displayUser, width / 2, 335);

  // Member Count Badge
  ctx.font = '24px sans-serif';
  ctx.fillStyle = '#CCCCCC';
  ctx.fillText(`Member #${options.memberCount} • Have fun & enjoy!`, width / 2, 380);

  // 5. Convert directly to PNG buffer in-memory
  const buffer = canvas.toBuffer('image/png');

  // Immediately clear memory
  return buffer;
}
