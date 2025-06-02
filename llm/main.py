import json

# JSONファイルを読み込み
with open("discord_today_messages.json", "r", encoding="utf-8") as f:
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
