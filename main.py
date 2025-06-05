import json
import glob
import os
from llama_cpp import Llama

# 最新のフォルダを取得
folders = glob.glob("./reports/*/")
latest_folder = max(folders, key=os.path.getmtime)

# 最新フォルダ内のすべてのJSONファイルを取得
json_files = glob.glob(os.path.join(latest_folder, "*.json"))
print(f"✅ 最新のフォルダ: {latest_folder}")
print(f"✅ JSONファイル一覧: {json_files}")

llm = Llama(model_path="./llama.cpp/models/DataPilot-ArrowPro-7B-KUJIRA-Q8_0.gguf", n_ctx=2048, n_batch=512)

for json_path in json_files:
    file_name = os.path.basename(json_path)
    file_name = os.path.splitext(file_name)[0]  # 拡張子を除去
    print(f"✅ 処理中のファイル: {file_name}")

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

    output = llm(prompt, max_tokens=250, stream=False)
    print(f"--- {file_name} の要約 ---")
    print(output["choices"][0]["text"])
    print("------------------------")