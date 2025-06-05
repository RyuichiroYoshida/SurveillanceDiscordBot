import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v10";
import fs from "node:fs/promises";

export interface Message {
	id: string;
	content: string;
	author: {
		id: string;
		username: string;
		discriminator: string;
	};
	timestamp: string;
	edited_timestamp: string | null;
}

/**
 * Discordのチャンネルからメッセージを取得・保存するためのユーティリティクラスです。
 *
 * - 指定したチャンネルからメッセージを取得（最大100件/リクエスト）
 * - チャンネル内の全メッセージを最大指定数まで取得
 * - 本日分または指定日のメッセージのみを取得
 * - 取得したメッセージをJSONまたはテキストファイルとして保存
 *
 * @example
 * ```typescript
 * const fetcher = new DiscordChatFetcher('YOUR_BOT_TOKEN');
 * const messages = await fetcher.fetchTodayMessages('CHANNEL_ID');
 * await fetcher.saveToJSON(messages, 'today.json');
 * ```
 *
 * @remarks
 * Discord APIのレートリミットを考慮し、リクエスト間に1秒のウェイトを設けています。
 *
 * @see https://discord.com/developers/docs/reference
 */
export class DiscordChatFetcher {
	private rest: REST;

	constructor(token: string) {
		this.rest = new REST({ version: "10" }).setToken(token);
	}

	async fetchChannelName(channelId: string): Promise<string> {
		try {
			const channel: any = await this.rest.get(Routes.channel(channelId));
			if ("name" in channel) {
				return channel.name;
			} else {
				throw new Error("チャンネル名の取得に失敗しました");
			}
		} catch (error) {
			console.error("チャンネル名の取得に失敗しました:", error);
			throw error;
		}
	}

	async fetchMessages(channelId: string, limit: number = 100, before?: string): Promise<Message[]> {
		try {
			const params = new URLSearchParams();
			params.append("limit", Math.min(limit, 100).toString());
			if (before) params.append("before", before);

			const messages = (await this.rest.get(`${Routes.channel(channelId)}/messages?${params}`)) as Message[];
			return messages;
		} catch (error) {
			console.error("メッセージの取得に失敗しました:", error);
			throw error;
		}
	}

	async fetchAllMessages(channelId: string, maxMessages: number = 1000): Promise<Message[]> {
		const allMessages: Message[] = [];
		let lastMessageId: string | undefined;

		while (allMessages.length < maxMessages) {
			const messages = await this.fetchMessages(channelId, 100, lastMessageId);
			if (messages.length === 0) break;
			allMessages.push(...messages);
			lastMessageId = messages[messages.length - 1].id;
			await new Promise((resolve) => setTimeout(resolve, 1000));
		}
		return allMessages.slice(0, maxMessages);
	}

	async fetchTodayMessages(channelId: string): Promise<Message[]> {
		const todayMessages: Message[] = [];
		let lastMessageId: string | undefined;
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const todayTimestamp = today.getTime();

		while (true) {
			const messages = await this.fetchMessages(channelId, 100, lastMessageId);
			if (messages.length === 0) break;
			const todayOnly = messages.filter((msg) => {
				const msgTimestamp = new Date(msg.timestamp).getTime();
				return msgTimestamp >= todayTimestamp;
			});
			todayMessages.push(...todayOnly);
			const lastMsgTime = new Date(messages[messages.length - 1].timestamp).getTime();
			if (lastMsgTime < todayTimestamp) break;
			lastMessageId = messages[messages.length - 1].id;
			await new Promise((resolve) => setTimeout(resolve, 1000));
		}
		return todayMessages;
	}

	async fetchMessagesByDate(channelId: string, date: Date): Promise<Message[]> {
		const dateMessages: Message[] = [];
		let lastMessageId: string | undefined;
		const startDate = new Date(date);
		startDate.setHours(0, 0, 0, 0);
		const endDate = new Date(date);
		endDate.setHours(23, 59, 59, 999);
		const startTimestamp = startDate.getTime();
		const endTimestamp = endDate.getTime();

		while (true) {
			const messages = await this.fetchMessages(channelId, 100, lastMessageId);
			if (messages.length === 0) break;
			const dateOnly = messages.filter((msg) => {
				const msgTimestamp = new Date(msg.timestamp).getTime();
				return msgTimestamp >= startTimestamp && msgTimestamp <= endTimestamp;
			});
			dateMessages.push(...dateOnly);
			const lastMsgTime = new Date(messages[messages.length - 1].timestamp).getTime();
			if (lastMsgTime < startTimestamp) break;
			lastMessageId = messages[messages.length - 1].id;
			await new Promise((resolve) => setTimeout(resolve, 1000));
		}
		return dateMessages;
	}

	async saveToJSON(messages: Message[], filename: string): Promise<void> {
		const formattedMessages = messages.map((msg) => ({
			id: msg.id,
			author: `${msg.author.username}#${msg.author.discriminator}`,
			content: msg.content,
			timestamp: new Date(msg.timestamp).toLocaleString("ja-JP"),
			edited: msg.edited_timestamp ? new Date(msg.edited_timestamp).toLocaleString("ja-JP") : null,
		}));
		await fs.writeFile(filename, JSON.stringify(formattedMessages, null, 2), "utf-8");
		console.log(`${filename}に${messages.length}件のメッセージを保存しました`);
	}

	async saveToText(messages: Message[], filename: string): Promise<void> {
		const textContent = messages
			.map((msg) => {
				const timestamp = new Date(msg.timestamp).toLocaleString("ja-JP");
				return `[${timestamp}] ${msg.author.username}: ${msg.content}`;
			})
			.join("\n");
		await fs.writeFile(filename, textContent, "utf-8");
		console.log(`${filename}に${messages.length}件のメッセージを保存しました`);
	}
}
