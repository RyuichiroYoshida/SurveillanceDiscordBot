import json
import glob
import os
from llama_cpp import Llama
import requests
from dotenv import load_dotenv

# 最新のフォルダを取得
folders = glob.glob("./reports/*/")
latest_folder = max(folders, key=os.path.getmtime)

# 最新フォルダ内のすべてのJSONファイルを取得
json_files = glob.glob(os.path.join(latest_folder, "*.json"))
print(f"✅ 最新のフォルダ: {latest_folder}")
print(f"✅ JSONファイル一覧: {json_files}")

llm = Llama(
    model_path="./llama.cpp/models/DataPilot-ArrowPro-7B-KUJIRA-Q8_0.gguf",
    n_ctx=10000,
    n_batch=512
)

# python-dotenvを使って.envファイルから環境変数を読み込む
load_dotenv()
WEBHOOK_URL = os.getenv("DISCORD_WEBHOOK_URL")
if not WEBHOOK_URL:
    raise Exception("⚠️ 環境変数 DISCORD_WEBHOOK_URL が設定されていません")

for json_path in json_files:
    file_name = os.path.splitext(os.path.basename(json_path))[0]
    print(f"✅ 処理中のファイル: {file_name}")

    with open(json_path, "r", encoding="utf-8") as f:
        messages = json.load(f)

    if not messages:
        print(f"⚠️ {file_name} は空のためスキップします")
        data = {
            "content": f"**{file_name} チャンネルは過去一日間にメッセージがありませんでした。**\n要約はありません。"
        }
        response = requests.post(WEBHOOK_URL, json=data)
        if response.status_code == 204:
            print(f"✅ {file_name} の要約をDiscordに送信しました")
        else:
            print(f"⚠️ Discord送信失敗: {response.status_code} {response.text}")
        continue

    # 会話部分だけ抽出・整形
    lines = [f"{msg['author']}: {msg['content']}" for msg in messages]
    conversation = "\n".join(lines)

    # llama.cpp 用のプロンプト形式に変換
    prompt = f"""次の会話を要約してください（日本語）:

{conversation}

要約:
"""

    output = llm(prompt, max_tokens=250, stream=False)
    text = output["choices"][0]["text"]
    print(f"--- {file_name} チャンネル の要約 ---")
    print(text)
    print("------------------------")

    # 要約結果をDiscordに送信
    data = {
        "content": f"**{file_name} チャンネル の要約**\n{text}"
    }
    response = requests.post(WEBHOOK_URL, json=data)
    if response.status_code == 204:
        print(f"✅ {file_name} の要約をDiscordに送信しました")
    else:
        print(f"⚠️ Discord送信失敗: {response.status_code} {response.text}")