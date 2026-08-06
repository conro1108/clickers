-- Puppy Mill's slice of the shared toybox database.
--
-- Full rebuild, not a migration: pushing drops the schema and every in-progress
-- match with it. A half-finished five-minute race is not worth a migration
-- history, and `cascade` stops at the schema boundary so this cannot reach
-- another project's data. The persistent single-player mill lives in
-- localStorage and is not in here at all.
--
--
-- WHY THERE IS NO GAME STATE IN THIS FILE
--
-- The only mutable thing a match owns is an append-only log of commands. There
-- is no puppies column, no rate column, no shield column — `packages/sim` folds
-- the log into a MatchState and both clients do it independently, exactly as
-- the offline game already does through `applyCommand`.
--
-- That is not laziness about validation, it's what removes the hardest bug in
-- the design. Sabotage is a read-modify-write across two players: two attacks
-- landing together would both compute absorption against the same pre-attack
-- shield pool and the shield would eat both. That race needs a row lock — but
-- only if there is a row holding derived state to lose an update on. With a log,
-- two attacks are two rows with different sequence numbers, every client applies
-- them in the same order through the same pure function, and the outcome is
-- identical everywhere by construction.
--
-- So what Postgres enforces is what breaks by accident rather than by malice:
-- who may write as whom, into which match, in what order, on whose clock. It
-- cannot enforce "you could afford that" — affordability is cost curves and
-- multiplier stacks living in the sim, and reimplementing the economy in plpgsql
-- would give us two of them to keep in step. A modified client can cheat its
-- friend. That's a social problem, and the honest server is still one import
-- away: the sim is I/O-free, so an Edge Function can validate this same log the
-- day that stops being funny.

drop schema if exists puppy_mill cascade;
create schema puppy_mill;
grant usage on schema puppy_mill to anon, authenticated;

create type puppy_mill.match_status as enum ('waiting', 'active', 'finished', 'abandoned');

-- ---------------------------------------------------------------------------
-- Who you are
-- ---------------------------------------------------------------------------

-- Everyone plays anonymously. Identity is what makes you *challengeable*: a
-- standing rivalry needs the other person to still exist tomorrow, and an
-- anonymous session is one cleared localStorage away from a new uuid pointing a
-- challenge at a ghost.
--
-- security definer because auth.users is not readable by the caller, and the
-- JWT only says whether *you* are anonymous — not whether Brad is.
create function puppy_mill.is_claimed(p_user uuid)
returns boolean
language sql
security definer
stable
set search_path = auth, public
as $$
  select coalesce(not u.is_anonymous, false) from auth.users u where u.id = p_user;
$$;

grant execute on function puppy_mill.is_claimed(uuid) to authenticated;

-- Finding someone to challenge. app.profiles is world-readable already, so this
-- exists for the one column that isn't in it: whether that handle belongs to a
-- real account or to a stranger who happens to be mid-session.
create function puppy_mill.lookup(p_handle text)
returns table (id uuid, handle text, display_name text, claimed boolean)
language sql
security definer
stable
set search_path = app, public
as $$
  select p.id, p.handle, p.display_name, puppy_mill.is_claimed(p.id)
    from app.profiles p
   where lower(p.handle) = lower(trim(p_handle))
   limit 1;
$$;

grant execute on function puppy_mill.lookup(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Matches
-- ---------------------------------------------------------------------------

create table puppy_mill.matches (
  id          uuid primary key default gen_random_uuid(),
  -- Cleared once someone joins, so a shared code stops working after it's used.
  -- The stranger path: no identity needed, you read it aloud across a room.
  join_code   text unique,
  host        uuid not null references auth.users on delete cascade,
  guest       uuid references auth.users on delete cascade,

  -- MatchConfig, as the sim takes it. Seed is here rather than generated
  -- client-side because it keys the PRNG every replay depends on.
  seed        text not null default gen_random_uuid()::text,
  duration_ms int not null check (duration_ms between 30000 and 604800000),
  scoring     text not null default 'total_raised' check (scoring in ('total_raised', 'on_hand')),

  status      puppy_mill.match_status not null default 'waiting',
  -- Server clock, set when the second player arrives. Every command timestamp is
  -- measured against this one, and none of them come from a client — client
  -- clocks lie, and a match whose start time is a lie is unreplayable.
  started_at  timestamptz,
  winner      uuid references auth.users on delete set null,
  created_at  timestamptz not null default now(),
  check (guest is null or guest <> host)
);

-- The whole of the mutable game. Nothing derived, ever.
create table puppy_mill.commands (
  match_id uuid not null references puppy_mill.matches on delete cascade,
  -- Dense and per-match, assigned by the trigger below. Dense matters: it's how
  -- a client knows it missed a realtime message rather than guessing.
  seq      bigint not null,
  player   uuid not null default auth.uid() references auth.users on delete cascade,
  -- Server time, also assigned by the trigger. This is the `now` the sim is
  -- handed when the command is folded in, so it has to be the same number on
  -- both machines.
  at       timestamptz not null,
  -- The Command from packages/sim, minus `player` — the column is the identity,
  -- and a body that could disagree with it would be a second source of truth.
  body     jsonb not null,
  primary key (match_id, seq)
);

create index on puppy_mill.matches (host) where status <> 'finished';
create index on puppy_mill.matches (guest) where status <> 'finished';

-- Sequence and clock, both from the database.
--
-- The lock is on the *match* row, not on commands, and it's here rather than in
-- a policy because a policy on `commands` that subqueries `commands` is infinite
-- recursion (42P17) — which Postgres only tells you on the first insert. Two
-- players writing at once serialise through this; at two writers and a click
-- batch every 500ms there is nothing to contend over.
create function puppy_mill.stamp_command()
returns trigger
language plpgsql
security definer
set search_path = puppy_mill, public
as $$
declare
  live puppy_mill.matches;
begin
  select * into live from puppy_mill.matches where id = new.match_id for update;

  if live.id is null then
    raise exception 'no such match' using errcode = '23503';
  end if;
  if live.status <> 'active' then
    raise exception 'match is not active' using errcode = '23514';
  end if;
  if new.player not in (live.host, live.guest) then
    raise exception 'not a player in this match' using errcode = '42501';
  end if;

  select coalesce(max(c.seq) + 1, 0) into new.seq
    from puppy_mill.commands c where c.match_id = new.match_id;
  new.at := now();
  return new;
end;
$$;

create trigger commands_stamped
  before insert on puppy_mill.commands
  for each row execute function puppy_mill.stamp_command();

-- ---------------------------------------------------------------------------
-- Challenges
-- ---------------------------------------------------------------------------

create table puppy_mill.challenges (
  id          uuid primary key default gen_random_uuid(),
  challenger  uuid not null default auth.uid() references auth.users on delete cascade,
  opponent    uuid not null references auth.users on delete cascade,
  duration_ms int not null check (duration_ms between 30000 and 604800000),
  scoring     text not null default 'total_raised' check (scoring in ('total_raised', 'on_hand')),
  status      text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  match_id    uuid references puppy_mill.matches on delete set null,
  created_at  timestamptz not null default now(),
  check (challenger <> opponent)
);

create index on puppy_mill.challenges (opponent) where status = 'pending';

-- ---------------------------------------------------------------------------
-- Row level security
--
-- This is namespacing, not isolation — every toy ships the same publishable key
-- and can reach any exposed schema. These policies are the only thing between a
-- stranger and your match.
-- ---------------------------------------------------------------------------

alter table puppy_mill.matches enable row level security;
alter table puppy_mill.commands enable row level security;
alter table puppy_mill.challenges enable row level security;

-- Matches are visible to their two players and nobody else. Finding one by code
-- goes through join_match() below: a select policy that matched on join_code
-- would let anyone list every open game and walk in.
create policy "players see their own matches" on puppy_mill.matches
  for select using (auth.uid() in (host, guest));

create policy "anyone can host" on puppy_mill.matches
  for insert with check (host = auth.uid() and guest is null and status = 'waiting');

-- Ending it, forfeiting it, abandoning it. The config and the seat are not
-- updatable at all — a match that could change its own duration mid-race would
-- make the clock a negotiation.
create policy "players can settle their match" on puppy_mill.matches
  for update using (auth.uid() in (host, guest))
  with check (auth.uid() in (host, guest));

create policy "players see their own commands" on puppy_mill.commands
  for select using (
    exists (
      select 1 from puppy_mill.matches m
      where m.id = match_id and auth.uid() in (m.host, m.guest)
    )
  );

-- You may only act as yourself. Everything else about the insert — which match,
-- whether it's running, what sequence number it lands on — is the trigger's job,
-- because it needs a lock and a policy cannot take one.
create policy "you may only act as yourself" on puppy_mill.commands
  for insert with check (player = auth.uid());

create policy "both sides see a challenge" on puppy_mill.challenges
  for select using (auth.uid() in (challenger, opponent));

-- The identity rule, in the one place it can't be talked out of. Both ends have
-- to be a real account: an anonymous challenger can't be answered tomorrow, and
-- an anonymous target can't be found tomorrow.
create policy "claimed players may challenge claimed players" on puppy_mill.challenges
  for insert with check (
    challenger = auth.uid()
    and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
    and puppy_mill.is_claimed(opponent)
  );

create policy "either side may retire a challenge" on puppy_mill.challenges
  for update using (auth.uid() in (challenger, opponent))
  with check (auth.uid() in (challenger, opponent));

grant select, insert, update on puppy_mill.matches to authenticated;
grant select, insert on puppy_mill.commands to authenticated;
grant select, insert, update on puppy_mill.challenges to authenticated;

-- ---------------------------------------------------------------------------
-- The two ways in
-- ---------------------------------------------------------------------------

-- Server time, for the clock-offset handshake. Every client extrapolates
-- production forward from a checkpoint, so a client whose clock is a minute fast
-- would see a minute of puppies nobody grew.
create function puppy_mill.server_now()
returns timestamptz
language sql
stable
as $$ select now(); $$;

grant execute on function puppy_mill.server_now() to anon, authenticated;

-- Joining by code. security definer so the lookup can see a row the caller has
-- no select policy for yet, and the single UPDATE means two people racing on the
-- same code produce one guest rather than two.
create function puppy_mill.join_match(p_code text)
returns puppy_mill.matches
language plpgsql
security definer
set search_path = puppy_mill, public
as $$
declare
  m puppy_mill.matches;
begin
  update puppy_mill.matches
     set guest = auth.uid(),
         status = 'active',
         join_code = null,
         started_at = now()
   where join_code = upper(trim(p_code))
     and status = 'waiting'
     and host <> auth.uid()
  returning * into m;

  if m.id is null then
    raise exception 'no open match with that code';
  end if;
  return m;
end;
$$;

grant execute on function puppy_mill.join_match(text) to authenticated;

-- Accepting a challenge, which is the other way a match starts. It has to be a
-- function because the person pressing the button is the guest, and the insert
-- policy only lets you create a match you host.
--
-- The match starts the instant this returns: a sit-down race has no lobby to
-- wait in, and the challenger is already watching for it.
create function puppy_mill.accept_challenge(p_challenge uuid)
returns puppy_mill.matches
language plpgsql
security definer
set search_path = puppy_mill, public
as $$
declare
  c puppy_mill.challenges;
  m puppy_mill.matches;
begin
  update puppy_mill.challenges
     set status = 'accepted'
   where id = p_challenge
     and opponent = auth.uid()
     and status = 'pending'
  returning * into c;

  if c.id is null then
    raise exception 'no pending challenge for you with that id';
  end if;

  insert into puppy_mill.matches (host, guest, duration_ms, scoring, status, started_at)
  values (c.challenger, c.opponent, c.duration_ms, c.scoring, 'active', now())
  returning * into m;

  update puppy_mill.challenges set match_id = m.id where id = c.id;
  return m;
end;
$$;

grant execute on function puppy_mill.accept_challenge(uuid) to authenticated;

-- Realtime. Publication membership is dropped with the schema, so it has to be
-- re-added on every push.
alter publication supabase_realtime add table puppy_mill.matches;
alter publication supabase_realtime add table puppy_mill.commands;
alter publication supabase_realtime add table puppy_mill.challenges;
