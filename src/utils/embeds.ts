import { EmbedBuilder, ColorResolvable } from 'discord.js';

export const COLORS = {
  PRIMARY: '#5865F2' as ColorResolvable,
  SUCCESS: '#57F287' as ColorResolvable,
  WARNING: '#FEE75C' as ColorResolvable,
  ERROR: '#ED4245' as ColorResolvable,
  INFO: '#3BA55D' as ColorResolvable,
  PURPLE: '#9B59B6' as ColorResolvable,
  DARK: '#2B2D31' as ColorResolvable,
};

export class CustomEmbed extends EmbedBuilder {
  constructor() {
    super();
    this.setColor(COLORS.PRIMARY);
    this.setTimestamp();
  }

  static success(title: string, description: string): CustomEmbed {
    const embed = new CustomEmbed();
    embed.setColor(COLORS.SUCCESS);
    embed.setTitle(`✅ ${title}`);
    embed.setDescription(description);
    return embed;
  }

  static error(title: string, description: string): CustomEmbed {
    const embed = new CustomEmbed();
    embed.setColor(COLORS.ERROR);
    embed.setTitle(`❌ ${title}`);
    embed.setDescription(description);
    return embed;
  }

  static warn(title: string, description: string): CustomEmbed {
    const embed = new CustomEmbed();
    embed.setColor(COLORS.WARNING);
    embed.setTitle(`⚠️ ${title}`);
    embed.setDescription(description);
    return embed;
  }

  static info(title: string, description: string): CustomEmbed {
    const embed = new CustomEmbed();
    embed.setColor(COLORS.PRIMARY);
    embed.setTitle(`ℹ️ ${title}`);
    embed.setDescription(description);
    return embed;
  }
}
