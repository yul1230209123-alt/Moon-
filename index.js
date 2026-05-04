const {
  Client,
  GatewayIntentBits,
  Events,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ChannelType,
  PermissionsBitField
} = require('discord.js');

// =======================
// 설정
// =======================

const token = process.env.TOKEN;
const channelId = '1500847046163169441';

// 관리자 역할 ID
const adminRoleId = '1500855072387760179';

// =======================
// 봇 생성
// =======================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

// =======================
// 봇 준비 완료
// =======================

client.once(Events.ClientReady, async () => {

  console.log(`${client.user.tag} 준비완료`);

  try {

    const channel = await client.channels.fetch(channelId);

    if (!channel) {
      console.log('채널 찾기 실패');
      return;
    }

    const button = new ButtonBuilder()
      .setCustomId('ticket_button')
      .setLabel('티켓열기')
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(button);

    await channel.send({
      embeds: [
        {
          color: 0x5865F2,
          title: '아진너 서버 중개봇',

          description:
`티켓 열기 버튼을 누르시고
구매자 & 판매자의 아이디를 적으시면
자동으로 티켓이 생성됩니다.

거래 전 서로 전번 교환 후
티켓 생성 부탁드립니다.`,

          image: {
            url: 'https://i.imgur.com/QGbLMEG.png'
          }
        }
      ],

      components: [row]
    });

    console.log('티켓 메시지 전송 완료');

  } catch (err) {

    console.log('오류 발생');
    console.log(err);

  }
});

// =======================
// 인터랙션
// =======================

client.on(Events.InteractionCreate, async interaction => {

  try {

    // =======================
    // 버튼 클릭
    // =======================

    if (interaction.isButton()) {

      // =======================
      // 티켓 열기
      // =======================

      if (interaction.customId === 'ticket_button') {

        const modal = new ModalBuilder()
          .setCustomId('ticket_modal')
          .setTitle('중개 거래');

        const buyerInput = new TextInputBuilder()
          .setCustomId('buyer')
          .setLabel('구매자 아이디')
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const sellerInput = new TextInputBuilder()
          .setCustomId('seller')
          .setLabel('판매자 아이디')
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const moneyInput = new TextInputBuilder()
          .setCustomId('money')
          .setLabel('거래 금액')
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const row1 = new ActionRowBuilder().addComponents(buyerInput);
        const row2 = new ActionRowBuilder().addComponents(sellerInput);
        const row3 = new ActionRowBuilder().addComponents(moneyInput);

        modal.addComponents(row1, row2, row3);

        await interaction.showModal(modal);
      }

      // =======================
      // 티켓 닫기
      // =======================

      if (interaction.customId === 'close_ticket') {

        await interaction.channel.permissionOverwrites.edit(interaction.guild.id, {
          ViewChannel: false
        });

        for (const overwrite of interaction.channel.permissionOverwrites.cache.values()) {

          if (
            overwrite.id !== interaction.guild.id &&
            overwrite.id !== adminRoleId
          ) {

            await interaction.channel.permissionOverwrites.edit(overwrite.id, {
              ViewChannel: false
            }).catch(() => {});
          }
        }

        await interaction.channel.permissionOverwrites.edit(adminRoleId, {
          ViewChannel: true,
          SendMessages: true
        });

        if (!interaction.channel.name.startsWith('닫힘-')) {

          await interaction.channel.setName(
            `닫힘-${interaction.channel.name}`
          );
        }

        await interaction.reply({
          content: '티켓이 닫혔습니다. 관리자만 볼 수 있습니다.',
          ephemeral: true
        });
      }
    }

    // =======================
    // 모달 제출
    // =======================

    if (interaction.isModalSubmit()) {

      const guild = interaction.guild;

      await guild.members.fetch();

      const buyerName =
        interaction.fields.getTextInputValue('buyer');

      const sellerName =
        interaction.fields.getTextInputValue('seller');

      const money =
        interaction.fields.getTextInputValue('money');

      const buyerUser = guild.members.cache.find(
        m =>
          m.user.username.toLowerCase() === buyerName.toLowerCase() ||

          (m.displayName &&
            m.displayName.toLowerCase() === buyerName.toLowerCase()) ||

          (m.user.globalName &&
            m.user.globalName.toLowerCase() === buyerName.toLowerCase())
      );

      const sellerUser = guild.members.cache.find(
        m =>
          m.user.username.toLowerCase() === sellerName.toLowerCase() ||

          (m.displayName &&
            m.displayName.toLowerCase() === sellerName.toLowerCase()) ||

          (m.user.globalName &&
            m.user.globalName.toLowerCase() === sellerName.toLowerCase())
      );

      if (!buyerUser || !sellerUser) {

        return interaction.reply({
          content: '구매자 또는 판매자를 찾을 수 없습니다.',
          ephemeral: true
        });
      }

      const buyer = buyerUser.id;
      const seller = sellerUser.id;

      const channel = await guild.channels.create({

        name: `거래-${interaction.user.username}`,

        type: ChannelType.GuildText,

        permissionOverwrites: [

          {
            id: guild.id,
            deny: [PermissionsBitField.Flags.ViewChannel],
          },

          {
            id: interaction.user.id,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages
            ],
          },

          {
            id: buyer,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages
            ],
          },

          {
            id: seller,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages
            ],
          },

          {
            id: adminRoleId,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages
            ],
          }
        ],
      });

      await channel.send({

        content: '@everyone',

        embeds: [
          {
            color: 0x5865F2,

            title: '중개 거래 티켓',

            description:
`티켓 생성자: <@${interaction.user.id}>

구매자: <@${buyer}>
판매자: <@${seller}>
거래 금액: ${money}

거래 전 서로 전번 교환은 필수로 부탁드립니다
중개자 태그하고 기다려주세요 중개자가 곧 확인합니다.`,

            image: {
              url: 'https://i.imgur.com/QGbLMEG.png'
            }
          }
        ],

        components: [
          new ActionRowBuilder().addComponents(

            new ButtonBuilder()
              .setCustomId('close_ticket')
              .setLabel('티켓 닫기')
              .setStyle(ButtonStyle.Danger)
          )
        ]
      });

      await interaction.reply({
        content: `티켓 생성 완료: ${channel}`,
        ephemeral: true
      });
    }

  } catch (err) {

    console.log(err);

    if (interaction.replied || interaction.deferred) {

      await interaction.followUp({
        content: '오류가 발생했습니다.',
        ephemeral: true
      }).catch(() => {});

    } else {

      await interaction.reply({
        content: '오류가 발생했습니다.',
        ephemeral: true
      }).catch(() => {});
    }
  }
});

// =======================
// 로그인
// =======================

client.login(token);
