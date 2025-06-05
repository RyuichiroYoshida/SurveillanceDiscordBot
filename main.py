import json
import glob
import os
from llama_cpp import Llama

# 最新のフォルダを取得
folders = glob.glob("./reports/*/")
latest_folder = max(folders, key=os.path.getmtime)

# 最新フォルダ内のJSONファイルパスを設定
json_path = os.path.join(latest_folder, "discord_today_messages.json")
print(f"✅ 最新のフォルダ: {latest_folder}")

# JSONファイルが存在するか確認
if not os.path.exists(json_path):
    raise FileNotFoundError(f"JSONファイルが見つかりません: {json_path}")
print(f"✅ 最新のJSONパス: {json_path}")

# JSONファイルを読み込み
with open(json_path, "r", encoding="utf-8") as f:
    messages = json.load(f)

# 会話部分だけ抽出・整形
lines = [f"{msg['author']}: {msg['content']}" for msg in messages]
conversation = "\n".join(lines)

# llama.cpp 用のプロンプト形式に変換
prompt = f"""次の会話を要約してください（日本語）:

{conversation}

要約:
"""

# テキストファイルに保存
with open("prompt.txt", "w", encoding="utf-8") as f:
    f.write(prompt)

print("✅ プロンプトを prompt.txt に保存しました")
llm = Llama(model_path=".\\llama.cpp\\models\\DataPilot-ArrowPro-7B-KUJIRA-Q8_0.gguf", n_ctx=2048, n_batch=512)

output = llm(prompt, max_tokens=500, stream=False)
print(output["choices"][0]["text"])
