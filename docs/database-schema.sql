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
  email text,
  phone text,
  address text,
  stickers_count integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.profiles add column if not exists email text;

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
  insert into public.profiles (id, name, email, phone, address, stickers_count)
  values (
    new.id,
    new.raw_user_meta_data->>'name',
    new.email,
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
  status text not null default 'pending',
  created_at timestamptz not null default now()
);
alter table public.orders add column if not exists status text not null default 'pending';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'orders_status_check') then
    alter table public.orders add constraint orders_status_check
      check (status in ('pending','accepted','shipped','delivered','cancelled'));
  end if;
end $$;

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
-- 5. TABLA DE SOLICITUDES DE CANJE
--    El cliente solicita canjear su botella gratis; el admin
--    la aprueba desde el panel. Los sellos no se descuentan
--    hasta que el admin confirma la entrega.
-- ---------------------------------------------------------
create table if not exists public.redemptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  status text not null default 'pending' check (status in ('pending','fulfilled','cancelled')),
  requested_at timestamptz not null default now(),
  fulfilled_at timestamptz,
  fulfilled_by uuid references public.profiles(id)
);

alter table public.redemptions enable row level security;

drop policy if exists "Los usuarios ven sus propios canjes" on public.redemptions;
create policy "Los usuarios ven sus propios canjes"
  on public.redemptions for select
  using (auth.uid() = user_id or public.is_admin());

-- ---------------------------------------------------------
-- 6. FUNCIÓN: el cliente solicita canjear (6 sellos = 1 botella gratis)
--    No descuenta sellos todavía: solo crea la solicitud.
-- ---------------------------------------------------------
create or replace function public.redeem_reward()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current integer;
  v_pending integer;
  v_id uuid;
begin
  select stickers_count into v_current from profiles where id = auth.uid();
  if v_current is null or v_current < 6 then
    raise exception 'No tienes suficientes sellos todavía';
  end if;

  select count(*) into v_pending from redemptions
    where user_id = auth.uid() and status = 'pending';
  if v_pending > 0 then
    raise exception 'Ya tienes una solicitud de canje pendiente';
  end if;

  insert into redemptions (user_id) values (auth.uid()) returning id into v_id;
  return v_id;
end;
$$;

-- ---------------------------------------------------------
-- 7. ROL DE ADMINISTRADOR
-- ---------------------------------------------------------
alter table public.profiles add column if not exists is_admin boolean not null default false;

-- Si ya tenías cuentas creadas antes de agregar la columna "email",
-- esto la rellena a partir de auth.users (seguro correrlo varias veces).
update public.profiles p set email = u.email
  from auth.users u where p.id = u.id and p.email is null;

-- Función auxiliar: evita la recursión de RLS al consultar el propio
-- rol de administrador (corre con permisos elevados, sin pasar por RLS).
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- El admin puede ver todos los perfiles, pedidos e items, no solo los suyos.
drop policy if exists "Los admins ven todos los perfiles" on public.profiles;
create policy "Los admins ven todos los perfiles"
  on public.profiles for select
  using (auth.uid() = id or public.is_admin());

drop policy if exists "Los usuarios ven su propio perfil" on public.profiles;

drop policy if exists "Los admins ven todos los pedidos" on public.orders;
create policy "Los admins ven todos los pedidos"
  on public.orders for select
  using (auth.uid() = user_id or public.is_admin());

drop policy if exists "Los usuarios ven sus propios pedidos" on public.orders;

drop policy if exists "Los admins ven todos los items" on public.order_items;
create policy "Los admins ven todos los items"
  on public.order_items for select
  using (
    order_id in (select id from public.orders where user_id = auth.uid())
    or public.is_admin()
  );

drop policy if exists "Los usuarios ven sus propios items" on public.order_items;

-- ---------------------------------------------------------
-- 8. FUNCIÓN: el admin agrega o resta sellos manualmente
--    (por ejemplo, una venta hecha en persona o una corrección)
-- ---------------------------------------------------------
create or replace function public.admin_adjust_stickers(p_user_id uuid, p_delta integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new integer;
begin
  if not public.is_admin() then
    raise exception 'No autorizado';
  end if;

  update profiles
    set stickers_count = greatest(0, stickers_count + p_delta)
    where id = p_user_id
    returning stickers_count into v_new;

  return v_new;
end;
$$;

-- ---------------------------------------------------------
-- 9. FUNCIÓN: el admin aprueba un canje (descuenta los 6 sellos)
-- ---------------------------------------------------------
create or replace function public.admin_fulfill_redemption(p_redemption_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_status text;
  v_new integer;
begin
  if not public.is_admin() then
    raise exception 'No autorizado';
  end if;

  select user_id, status into v_user_id, v_status from redemptions where id = p_redemption_id;
  if v_status is null then
    raise exception 'Solicitud no encontrada';
  end if;
  if v_status <> 'pending' then
    raise exception 'Esta solicitud ya fue procesada';
  end if;

  update profiles set stickers_count = greatest(0, stickers_count - 6)
    where id = v_user_id
    returning stickers_count into v_new;

  update redemptions
    set status = 'fulfilled', fulfilled_at = now(), fulfilled_by = auth.uid()
    where id = p_redemption_id;

  return v_new;
end;
$$;

-- ---------------------------------------------------------
-- 10. FUNCIÓN: el admin rechaza/cancela un canje sin descontar sellos
-- ---------------------------------------------------------
create or replace function public.admin_cancel_redemption(p_redemption_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'No autorizado';
  end if;

  update redemptions
    set status = 'cancelled', fulfilled_at = now(), fulfilled_by = auth.uid()
    where id = p_redemption_id and status = 'pending';
end;
$$;

-- ---------------------------------------------------------
-- 11. FUNCIÓN: el admin acepta / despacha / entrega / cancela un pedido
-- ---------------------------------------------------------
create or replace function public.admin_update_order_status(p_order_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'No autorizado';
  end if;
  if p_status not in ('pending','accepted','shipped','delivered','cancelled') then
    raise exception 'Estado inválido: %', p_status;
  end if;
  update orders set status = p_status where id = p_order_id;
end;
$$;

-- =========================================================
-- Fin del esquema. Con esto ya tienes: cuentas de cliente,
-- pedidos con estado, el Club Calypso y el panel de admin
-- funcionando en la base de datos.
--
-- Para volverte administrador, corre esto UNA VEZ con tu
-- propio correo (después de haberte registrado en el sitio):
--
--   update public.profiles set is_admin = true
--   where id = (select id from auth.users where email = 'tu@correo.com');
-- =========================================================
