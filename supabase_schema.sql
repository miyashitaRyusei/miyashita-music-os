-- ==========================================
-- みやした音楽OS - Supabase Schema
-- ==========================================

-- 1. 楽曲テーブル (songs)
CREATE TABLE IF NOT EXISTS public.songs (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  original_key TEXT NOT NULL,
  bpm INTEGER NOT NULL,
  min_note TEXT,
  max_note TEXT,
  imported_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. ピッチ辞書テーブル (pitch_patterns)
CREATE TABLE IF NOT EXISTS public.pitch_patterns (
  id TEXT PRIMARY KEY,
  song_id TEXT REFERENCES public.songs(id) ON DELETE CASCADE,
  degrees JSONB NOT NULL,
  count INTEGER DEFAULT 1,
  source TEXT NOT NULL,
  preference TEXT NOT NULL,
  section TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. リズム辞書テーブル (rhythm_patterns)
CREATE TABLE IF NOT EXISTS public.rhythm_patterns (
  id TEXT PRIMARY KEY,
  song_id TEXT REFERENCES public.songs(id) ON DELETE CASCADE,
  timings JSONB NOT NULL,
  description TEXT,
  count INTEGER DEFAULT 1,
  source TEXT NOT NULL,
  preference TEXT NOT NULL,
  section TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. コード辞書テーブル (chord_progressions)
CREATE TABLE IF NOT EXISTS public.chord_progressions (
  id TEXT PRIMARY KEY,
  song_id TEXT REFERENCES public.songs(id) ON DELETE CASCADE,
  chords JSONB NOT NULL,
  label TEXT,
  key TEXT NOT NULL,
  count INTEGER DEFAULT 1,
  source TEXT NOT NULL,
  preference TEXT NOT NULL,
  sections JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- セキュリティルールの設定 (だれでも読み書き可能にする)
-- ==========================================

-- RLS（Row Level Security）を無効化し、全テーブルで誰でも操作可能にする
ALTER TABLE public.songs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.pitch_patterns DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.rhythm_patterns DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.chord_progressions DISABLE ROW LEVEL SECURITY;

-- 既存のデータを全削除したい場合は以下を実行
-- TRUNCATE TABLE public.songs CASCADE;
