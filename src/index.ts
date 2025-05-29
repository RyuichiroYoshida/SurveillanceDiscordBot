import { DiscordChatFetcher } from "./discordChatFetcher.js";
import { TOKEN, ID } from "./config.js";
import fs from "node:fs/promises";

async function main() {
	const BOT_TOKEN = TOKEN;
	const CHANNEL_ID = ID;

	const fetcher = new DiscordChatFetcher(BOT_TOKEN);
	if (fetcher) {
		console.log("DiscordChatFetcherのインスタンスが正常に作成されました");
	} else {
		console.error("DiscordChatFetcherのインスタンス作成に失敗しました");
		return;
	}

	try {
		console.log("メッセージを取得中...");
		const recentMessages = await fetcher.fetchMessages(CHANNEL_ID, 100);

		const now = new Date().toLocaleString("ja-JP");
		const saveDir = `./reports/${now.replace(/[:/]/g, "-")}`;
		try {
			await fs.mkdir(saveDir, { recursive: true });
			console.log(`保存フォルダ '${saveDir}' を作成または既に存在します`);
		} catch (err) {
			console.error("フォルダ作成に失敗しました:", err);
			return;
		}

		await fetcher.saveToJSON(recentMessages, `${saveDir}/discord_chat_log.json`);
		await fetcher.saveToText(recentMessages, `${saveDir}/discord_chat_log.txt`);

		console.log("今日のメッセージを取得中...");
		const todayMessages = await fetcher.fetchTodayMessages(CHANNEL_ID);
		await fetcher.saveToJSON(todayMessages, `${saveDir}/discord_today_messages.json`);
		await fetcher.saveToText(todayMessages, `${saveDir}/discord_today_messages.txt`);
		console.log(`今日のメッセージ数: ${todayMessages.length}`);

        // 以下のコードはコメントアウトされていますが、必要に応じて有効化できます
		// const yesterday = new Date();
		// yesterday.setDate(yesterday.getDate() - 1);
		// const yesterdayMessages = await fetcher.fetchMessagesByDate(CHANNEL_ID, yesterday);
		// await fetcher.saveToJSON(yesterdayMessages, `${saveDir}/discord_yesterday_messages.json`);
		// console.log(`昨日のメッセージ数: ${yesterdayMessages.length}`);
	} catch (error) {
		console.error("エラーが発生しました:", error);
	}
}

main();
