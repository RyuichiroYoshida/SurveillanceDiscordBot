/**
 * DiscordChatFetcher
 *
 * このモジュールはDiscordの指定チャンネルからメッセージを取得し、JSONまたはテキスト形式で保存するためのクラスとサンプル実行コードを提供します。
 *
 * 主な機能:
 * - 指定チャンネルから最新のメッセージを取得
 * - チャンネル内の全メッセージを取得（API制限に注意）
 * - 今日または任意の日付のメッセージのみを取得
 * - 取得したメッセージをJSONまたはテキストファイルとして保存
 *
 * 使用例はmain関数内に記載されています。
 *
 * 必要なパッケージ:
 * - @discordjs/rest
 * - discord-api-types
 * - node.js (fs/promises)
 *
 * 注意:
 * - DiscordのBotトークンとチャンネルIDが必要です。
 * - API制限に注意し、連続リクエスト時は適切な待機時間を設けています。
 * - 保存ファイル名や取得件数は用途に応じて調整してください。
 */
import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v10";
import fs from "node:fs/promises";
import { TOKEN, ID } from "./config.js";

interface Message {
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

class DiscordChatFetcher {
	private rest: REST;

	constructor(token: string) {
		this.rest = new REST({ version: "10" }).setToken(token);
	}

	/**
	 * 指定されたチャンネルからメッセージを取得
	 * @param channelId チャンネルID
	 * @param limit 取得するメッセージ数（最大100）
	 * @param before 指定したメッセージIDより前のメッセージを取得
	 */
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

	/**
	 * チャンネルの全メッセージを取得（API制限に注意）
	 * @param channelId チャンネルID
	 * @param maxMessages 取得する最大メッセージ数
	 */
	async fetchAllMessages(channelId: string, maxMessages: number = 1000): Promise<Message[]> {
		const allMessages: Message[] = [];
		let lastMessageId: string | undefined;

		while (allMessages.length < maxMessages) {
			const messages = await this.fetchMessages(channelId, 100, lastMessageId);

			if (messages.length === 0) break;

			allMessages.push(...messages);
			lastMessageId = messages[messages.length - 1].id;

			// API制限を避けるため少し待機
			await new Promise((resolve) => setTimeout(resolve, 1000));
		}

		return allMessages.slice(0, maxMessages);
	}

	/**
	 * 今日のメッセージを取得
	 * @param channelId チャンネルID
	 */
	async fetchTodayMessages(channelId: string): Promise<Message[]> {
		const todayMessages: Message[] = [];
		let lastMessageId: string | undefined;

		// 今日の開始時刻（0:00:00）を取得
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const todayTimestamp = today.getTime();

		while (true) {
			const messages = await this.fetchMessages(channelId, 100, lastMessageId);

			if (messages.length === 0) break;

			// 今日のメッセージのみフィルタリング
			const todayOnly = messages.filter((msg) => {
				const msgTimestamp = new Date(msg.timestamp).getTime();
				return msgTimestamp >= todayTimestamp;
			});

			todayMessages.push(...todayOnly);

			// 最後のメッセージが今日より前の場合は終了
			const lastMsgTime = new Date(messages[messages.length - 1].timestamp).getTime();
			if (lastMsgTime < todayTimestamp) break;

			lastMessageId = messages[messages.length - 1].id;

			// API制限を避けるため少し待機
			await new Promise((resolve) => setTimeout(resolve, 1000));
		}

		return todayMessages;
	}

	/**
	 * 指定した日付のメッセージを取得
	 * @param channelId チャンネルID
	 * @param date 取得したい日付
	 */
	async fetchMessagesByDate(channelId: string, date: Date): Promise<Message[]> {
		const dateMessages: Message[] = [];
		let lastMessageId: string | undefined;

		// 指定日の開始と終了時刻
		const startDate = new Date(date);
		startDate.setHours(0, 0, 0, 0);
		const endDate = new Date(date);
		endDate.setHours(23, 59, 59, 999);

		const startTimestamp = startDate.getTime();
		const endTimestamp = endDate.getTime();

		while (true) {
			const messages = await this.fetchMessages(channelId, 100, lastMessageId);

			if (messages.length === 0) break;

			// 指定日のメッセージのみフィルタリング
			const dateOnly = messages.filter((msg) => {
				const msgTimestamp = new Date(msg.timestamp).getTime();
				return msgTimestamp >= startTimestamp && msgTimestamp <= endTimestamp;
			});

			dateMessages.push(...dateOnly);

			// 最後のメッセージが指定日より前の場合は終了
			const lastMsgTime = new Date(messages[messages.length - 1].timestamp).getTime();
			if (lastMsgTime < startTimestamp) break;

			lastMessageId = messages[messages.length - 1].id;

			// API制限を避けるため少し待機
			await new Promise((resolve) => setTimeout(resolve, 1000));
		}

		return dateMessages;
	}

	/**
	 * メッセージをJSON形式で保存
	 * @param messages メッセージ配列
	 * @param filename 保存先ファイル名
	 */
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

	/**
	 * メッセージをテキスト形式で保存
	 * @param messages メッセージ配列
	 * @param filename 保存先ファイル名
	 */
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

// 使用例
async function main() {
	const BOT_TOKEN = TOKEN; // 環境変数からBotトークンを取得
	const CHANNEL_ID = ID; // 環境変数からチャンネルIDを取得

	const fetcher = new DiscordChatFetcher(BOT_TOKEN);
	if (fetcher) {
		console.log("DiscordChatFetcherのインスタンスが正常に作成されました");
	} else {
		console.error("DiscordChatFetcherのインスタンス作成に失敗しました");
		return;
	}

	try {
		// 最新100件のメッセージを取得
		console.log("メッセージを取得中...");
		const recentMessages = await fetcher.fetchMessages(CHANNEL_ID, 100);

		// 現在時刻の取得と表示
		const now = new Date().toLocaleString("ja-JP");

		// 保存用のフォルダを作成（存在しない場合のみ）
		const saveDir = `./reports/${now.replace(/[:/]/g, "-")}`;
		try {
			await fs.mkdir(saveDir, { recursive: true });
			console.log(`保存フォルダ '${saveDir}' を作成または既に存在します`);
		} catch (err) {
			console.error("フォルダ作成に失敗しました:", err);
			return;
		}

		// JSON形式で保存
		await fetcher.saveToJSON(recentMessages, `${saveDir}/discord_chat_log.json`);

		// テキスト形式でも保存
		await fetcher.saveToText(recentMessages, `${saveDir}/discord_chat_log.txt`);

		// 今日のメッセージを取得
		console.log("今日のメッセージを取得中...");
		const todayMessages = await fetcher.fetchTodayMessages(CHANNEL_ID);
		await fetcher.saveToJSON(todayMessages, `${saveDir}/discord_today_messages.json`);
		await fetcher.saveToText(todayMessages, `${saveDir}/discord_today_messages.txt`);
		console.log(`今日のメッセージ数: ${todayMessages.length}`);

		// 特定の日付のメッセージを取得（例：昨日）
		const yesterday = new Date();
		yesterday.setDate(yesterday.getDate() - 1);
		const yesterdayMessages = await fetcher.fetchMessagesByDate(CHANNEL_ID, yesterday);
		await fetcher.saveToJSON(yesterdayMessages, "discord_yesterday_messages.json");
		console.log(`昨日のメッセージ数: ${yesterdayMessages.length}`);

		// より多くのメッセージを取得したい場合
		// const allMessages = await fetcher.fetchAllMessages(CHANNEL_ID, 500);
		// await fetcher.saveToJSON(allMessages, 'discord_all_messages.json');
	} catch (error) {
		console.error("エラーが発生しました:", error);
	}
}

// 実行
main();
