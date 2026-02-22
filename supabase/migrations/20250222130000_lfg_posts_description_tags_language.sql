-- Add description, tags, and language to LFG posts; enable filtering and author delete.

alter table public.lfg_posts
  add column if not exists description text default '',
  add column if not exists tags text[] default '{}',
  add column if not exists language text default 'English';

create index if not exists lfg_posts_tags on public.lfg_posts using gin (tags);
create index if not exists lfg_posts_language on public.lfg_posts (language);
