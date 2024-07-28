import { scheduleJob } from 'node-schedule';
import { setupGuild } from '@/setup-guild';
import { sequelize } from '@/sequelize-instance';
import banCommand from '@/commands/ban';
import kickCommand from '@/commands/kick';
import settingsCommand from '@/commands/settings';
import warnCommand from '@/commands/warn';
import modpingCommand from '@/commands/modping';
import messageLogContextMenu from '@/context-menus/messages/message-log';
import slowModeCommand from '@/commands/slow-mode';
import { checkMatchmakingThreads } from '@/matchmaking-threads';
import { loadModel } from '@/check-nsfw';
import type { Database } from 'sqlite3';
import type { Client } from 'discord.js';
import config from '@/config.json';

export default async function readyHandler(client: Client): Promise<void> {
	console.log('Registering global commands');
	loadBotHandlersCollection(client);

	console.log('Establishing DB connection');
	await sequelize.sync(config.sequelize);
	const connection = await sequelize.connectionManager.getConnection({ type: 'write' }) as Database;
	connection.loadExtension('./lib/phhammdist/phhammdist.so');

	console.log('Loading NSFWJS models');
	await loadModel();

	console.log('Setting up guilds');
	const guilds = await client.guilds.fetch();
	for (const id of guilds.keys()) {
		const guild = await guilds.get(id)!.fetch();
		await setupGuild(guild);
	}

	scheduleJob('*/10 * * * *', async () => {
		await checkMatchmakingThreads();
	});

	console.log(`Logged in as ${client.user!.tag}!`);

	await checkMatchmakingThreads();
}

function loadBotHandlersCollection(client: Client): void {
	client.commands.set(banCommand.name, banCommand);
	client.commands.set(kickCommand.name, kickCommand);
	client.commands.set(settingsCommand.name, settingsCommand);
	client.commands.set(warnCommand.name, warnCommand);
	client.commands.set(modpingCommand.name, modpingCommand);
	client.commands.set(slowModeCommand.name, slowModeCommand);

	client.contextMenus.set(messageLogContextMenu.name, messageLogContextMenu);
}
