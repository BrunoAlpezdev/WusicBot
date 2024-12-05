const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource } = require('@discordjs/voice');
const ytdl = require('ytdl-core');
const ytSearch = require('yt-search');

// Configuración del bot
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const PREFIX = '"'; // Prefijo para los comandos
const audioPlayers = new Map();

client.on('ready', () => {
  console.log(`¡Bot listo como ${client.user.tag}!`);
});

client.on('messageCreate', async (message) => {
  if (!message.content.startsWith(PREFIX) || message.author.bot) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (command === 'join') {
    if (!message.member.voice.channel) {
      return message.reply('¡Debes estar en un canal de voz!');
    }

    joinVoiceChannel({
      channelId: message.member.voice.channel.id,
      guildId: message.guild.id,
      adapterCreator: message.guild.voiceAdapterCreator,
    });

    message.reply('¡Me uní al canal de voz!');
  }

  if (command === 'play') {
    if (!message.member.voice.channel) {
      return message.reply('¡Debes estar en un canal de voz para usar este comando!');
    }

    const query = args.join(' ');
    if (!query) {
      return message.reply('Debes proporcionar un enlace o búsqueda de YouTube.');
    }

    const connection = joinVoiceChannel({
      channelId: message.member.voice.channel.id,
      guildId: message.guild.id,
      adapterCreator: message.guild.voiceAdapterCreator,
    });

    const player = createAudioPlayer();
    connection.subscribe(player);

    try {
      const video = await searchYouTube(query);
      if (!video) {
        return message.reply('No encontré ningún resultado.');
      }

      const stream = ytdl(video.url, { filter: 'audioonly' });
      const resource = createAudioResource(stream);

      player.play(resource);
      audioPlayers.set(message.guild.id, player);

      message.reply(`🎵 Reproduciendo: **${video.title}**`);
    } catch (error) {
      console.error(error);
      message.reply('Hubo un error al reproducir el audio.');
    }
  }

  if (command === 'stop') {
    const player = audioPlayers.get(message.guild.id);
    if (player) {
      player.stop();
      message.reply('⏹️ Música detenida.');
    } else {
      message.reply('No estoy reproduciendo nada.');
    }
  }

  if (command === 'leave') {
    const connection = getVoiceConnection(message.guild.id);
    if (connection) {
      connection.destroy();
      message.reply('👋 ¡Salí del canal de voz!');
    } else {
      message.reply('No estoy en un canal de voz.');
    }
  }
});

async function searchYouTube(query) {
  const result = await ytSearch(query);
  return result.videos.length > 0 ? result.videos[0] : null;
}

client.login(process.env.DISCORD_TOKEN);
