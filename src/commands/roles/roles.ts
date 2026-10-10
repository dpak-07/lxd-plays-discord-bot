import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChatInputCommandInteraction,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ChannelType,
} from 'discord.js';
import { Command } from '../../types/command.js';
import { RoleService } from '../../services/roleService.js';
import { CustomEmbed, COLORS } from '../../utils/embeds.js';

export const rolesCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('roles')
    .setDescription('Self-assignable roles menu and autorole management')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((sub) =>
      sub
        .setName('menu')
        .setDescription('Create a self-assignable role selection dropdown')
        .addChannelOption((opt) =>
          opt.setName('channel').setDescription('Channel to post the menu').addChannelTypes(ChannelType.GuildText).setRequired(true)
        )
        .addStringOption((opt) => opt.setName('title').setDescription('Menu title').setRequired(true))
        .addRoleOption((opt) => opt.setName('role1').setDescription('First selectable role').setRequired(true))
        .addRoleOption((opt) => opt.setName('role2').setDescription('Second selectable role').setRequired(false))
        .addRoleOption((opt) => opt.setName('role3').setDescription('Third selectable role').setRequired(false))
        .addRoleOption((opt) => opt.setName('role4').setDescription('Fourth selectable role').setRequired(false))
        .addRoleOption((opt) => opt.setName('role5').setDescription('Fifth selectable role').setRequired(false))
    )
    .addSubcommand((sub) =>
      sub
        .setName('autorole')
        .setDescription('Configure automatic role assignment for newly joined members')
        .addRoleOption((opt) => opt.setName('role').setDescription('Role to automatically give').setRequired(true))
        .addBooleanOption((opt) => opt.setName('remove').setDescription('Remove from autoroles instead of adding').setRequired(false))
    ),

  category: 'roles',
  userPermissions: [PermissionFlagsBits.Administrator],

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    if (sub === 'menu') {
      const channel = interaction.options.getChannel('channel', true);
      const title = interaction.options.getString('title', true);

      const roles = [];
      for (let i = 1; i <= 5; i++) {
        const role = interaction.options.getRole(`role${i}`);
        if (role) {
          roles.push({ label: role.name, roleId: role.id });
        }
      }

      if (roles.length === 0) {
        await interaction.reply({ embeds: [CustomEmbed.error('Error', 'Please provide at least one role.')], ephemeral: true });
        return;
      }

      const menu = new StringSelectMenuBuilder()
        .setCustomId(`role_select_menu`)
        .setPlaceholder('Choose a role to assign or remove...')
        .addOptions(
          roles.map((r) =>
            new StringSelectMenuOptionBuilder()
              .setLabel(r.label)
              .setValue(r.roleId)
              .setDescription(`Toggle the @${r.label} role`)
          )
        );

      const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);

      const embed = new CustomEmbed()
        .setTitle(title)
        .setDescription('Select an option from the menu below to add or remove that role from your profile.')
        .setColor(COLORS.PURPLE);

      const targetChannel = interaction.guild.channels.cache.get(channel.id);
      if (targetChannel && targetChannel.isTextBased()) {
        const msg = await (targetChannel as any).send({ embeds: [embed], components: [row] });
        await RoleService.saveRoleMenu(guildId, channel.id, msg.id, title, roles);
      }

      await interaction.reply({
        embeds: [CustomEmbed.success('Menu Created', `Role menu published to <#${channel.id}>.`)],
        ephemeral: true,
      });
    } else if (sub === 'autorole') {
      const role = interaction.options.getRole('role', true);
      const remove = interaction.options.getBoolean('remove') || false;

      if (remove) {
        await RoleService.removeAutoRole(guildId, role.id);
        await interaction.reply({
          embeds: [CustomEmbed.info('Autorole Removed', `<@&${role.id}> was removed from autoroles.`)],
          ephemeral: true,
        });
      } else {
        await RoleService.addAutoRole(guildId, role.id);
        await interaction.reply({
          embeds: [CustomEmbed.success('Autorole Configured', `<@&${role.id}> will now automatically be assigned to new members on join.`)],
          ephemeral: true,
        });
      }
    }
  },
};
