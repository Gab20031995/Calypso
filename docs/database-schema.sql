-- =========================================================
-- SALSAS CALYPSO — Esquema de base de datos (Supabase/Postgres)
-- Pega este archivo completo en el SQL Editor de tu proyecto
-- de Supabase y dale "Run".
-- =========================================================

-- ---------------------------------------------------------
-- 1. TABLA DE PERFILES (extiende auth.users)
-- ---------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  phone text,
  address text,
  stickers_count integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Los usuarios ven su propio perfil" on public.profiles;
create policy "Los usuarios ven su propio perfil"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Los usuarios actualizan su propio perfil" on public.profiles;
create policy "Los usuarios actualizan su propio perfil"
  on public.profiles for update
  using (auth.uid() = id);

-- ---------------------------------------------------------
-- 2. TRIGGER: crear perfil automáticamente al registrarse
-- ---------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, phone, address, stickers_count)
  values (
    new.id,
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'address',
    0
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------
-- 3. TABLAS DE PEDIDOS
-- ---------------------------------------------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  total numeric(10,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  flavor text not null,          -- 'original' | 'mango' | 'sweetchili'
  quantity integer not null default 1,
  price numeric(10,2) not null default 0,
  is_free boolean not null default false
);

alter table public.orders enable row level security;
alter table public.order_items enable row level security;

drop policy if exists "Los usuarios ven sus propios pedidos" on public.orders;
create policy "Los usuarios ven sus propios pedidos"
  on public.orders for select
  using (auth.uid() = user_id);

drop policy if exists "Los usuarios ven sus propios items" on public.order_items;
create policy "Los usuarios ven sus propios items"
  on public.order_items for select
  using (
    order_id in (select id from public.orders where user_id = auth.uid())
  );

-- ---------------------------------------------------------
-- 4. FUNCIÓN: registrar pedido y sumar sellos
--    p_items ejemplo: [{"flavor":"mango","quantity":2,"price":5,"is_free":false}]
-- ---------------------------------------------------------
create or replace function public.register_order(p_items jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_total numeric := 0;
  v_bottles integer := 0;
  v_item jsonb;
  v_new_stickers integer;
begin
  insert into orders (user_id) values (auth.uid()) returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    insert into order_items (order_id, flavor, quantity, price, is_free)
    values (
      v_order_id,
      v_item->>'flavor',
      (v_item->>'quantity')::int,
      (v_item->>'price')::numeric,
      coalesce((v_item->>'is_free')::boolean, false)
    );

    v_total := v_total + (v_item->>'price')::numeric * (v_item->>'quantity')::int;

    if not coalesce((v_item->>'is_free')::boolean, false) then
      v_bottles := v_bottles + (v_item->>'quantity')::int;
    end if;
  end loop;

  update orders set total = v_total where id = v_order_id;

  update profiles
    set stickers_count = stickers_count + v_bottles
    where id = auth.uid()
    returning stickers_count into v_new_stickers;

  return v_new_stickers;
end;
$$;

-- ---------------------------------------------------------
-- 5. FUNCIÓN: canjear recompensa (6 sellos = 1 botella gratis)
-- ---------------------------------------------------------
create or replace function public.redeem_reward()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current integer;
begin
  select stickers_count into v_current from profiles where id = auth.uid();

  if v_current is null or v_current < 6 then
    raise exception 'No tienes suficientes sellos todavía';
  end if;

  update profiles set stickers_count = stickers_count - 6 where id = auth.uid();

  return v_current - 6;
end;
$$;

-- =========================================================
-- Fin del esquema. Con esto ya tienes: cuentas de cliente,
-- historial de pedidos y el Club Calypso funcionando en la
-- base de datos.
-- =========================================================
