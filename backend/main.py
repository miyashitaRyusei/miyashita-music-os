from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="みやした音楽OS API")

# --- CORS設定 ---
# Vercelの本番ドメインやプレビュードメイン、ローカル開発環境からのアクセスを許可します
origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://miyashita-music-os.vercel.app",  # 本番環境のURLに合わせて変更してください
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://.*\.vercel\.app",  # Vercelのプレビュードメインをすべて許可
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/ping")
def ping():
    """
    Renderデプロイ時のコールドスタート対策（Wake-up）用エンドポイント。
    フロントエンドの App.jsx からマウント時に非同期で呼ばれます。
    """
    return {"status": "ok", "message": "Backend is awake!"}

# TODO: 今後ここにMIDIの重い解析ロジック（DTW等）を実装する
@app.post("/analyze")
def analyze_midi():
    return {"status": "success", "data": "Analysis results will be returned here."}
