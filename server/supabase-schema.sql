-- Run this in Supabase Dashboard → SQL Editor to create LFG tables.
-- Replace schema if you prefer a different namespace.

-- Posts: one per (author_name, server) per game server
create table if not exists public.lfg_posts (
  id bigserial primary key,
  author_name text not null,
  text text not null,
  slots int not null default 4 check (slots >= 1 and slots <= 20),
  server text not null default '1',
  created_at timestamptz not null default now()
);

create index if not exists lfg_posts_server_created_at on public.lfg_posts (server, created_at desc);

alter table public.lfg_posts add column if not exists description text default '';
alter table public.lfg_posts add column if not exists tags text[] default '{}';
alter table public.lfg_posts add column if not exists language text default 'English';
create index if not exists lfg_posts_tags on public.lfg_posts using gin (tags);
create index if not exists lfg_posts_language on public.lfg_posts (language);

-- Interested players per post (one row per player per post)
create table if not exists public.lfg_interested (
  id bigserial primary key,
  post_id bigint not null references public.lfg_posts(id) on delete cascade,
  player_name text not null
);
create unique index if not exists lfg_interested_post_player_lower on public.lfg_interested (post_id, lower(trim(player_name)));

create index if not exists lfg_interested_post_id on public.lfg_interested (post_id);

-- Comments per post
create table if not exists public.lfg_comments (
  id bigserial primary key,
  post_id bigint not null references public.lfg_posts(id) on delete cascade,
  author_name text not null,
  text text not null,
  created_at timestamptz not null default now()
);

create index if not exists lfg_comments_post_id on public.lfg_comments (post_id);

-- RLS: only your backend (using the service_role key) can access these tables.
-- service_role bypasses RLS; anon key has no policies so no client access.
alter table public.lfg_posts enable row level security;
alter table public.lfg_interested enable row level security;
alter table public.lfg_comments enable row level security;
