-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Profiles (Extends Auth)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  role text default 'student' check (role in ('student', 'admin')),
  full_name text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Platform Settings (White-label)
create table platform_settings (
  id int primary key generated always as identity,
  site_name text default 'EAD Platform',
  primary_color text default '#2563eb',
  secondary_color text default '#1e40af',
  logo_url text,
  favicon_url text,
  is_glass_mode boolean default false,
  updated_at timestamp with time zone default now()
);

insert into platform_settings (site_name) values ('Minha Plataforma EAD');

-- 3. Courses
create table courses (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text,
  thumbnail_url text,
  price decimal(10,2) default 0.00,
  is_published boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 4. Modules
create table modules (
  id uuid default uuid_generate_v4() primary key,
  course_id uuid references courses(id) on delete cascade,
  title text not null,
  position int default 0,
  created_at timestamp with time zone default now()
);

-- 5. Lessons
create table lessons (
  id uuid default uuid_generate_v4() primary key,
  module_id uuid references modules(id) on delete cascade,
  title text not null,
  video_url text, -- Embed URL
  provider text default 'youtube', -- youtube, vimeo, panda, etc.
  content text, -- Rich text description
  duration_seconds int default 0,
  position int default 0,
  created_at timestamp with time zone default now()
);

-- 6. Enrollments (Access Control)
create table enrollments (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade,
  course_id uuid references courses(id) on delete cascade,
  expires_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  unique(user_id, course_id)
);

-- 7. Progress
create table progress (
  user_id uuid references profiles(id) on delete cascade,
  lesson_id uuid references lessons(id) on delete cascade,
  is_completed boolean default false,
  completed_at timestamp with time zone default now(),
  primary key (user_id, lesson_id)
);

-- 8. Private Notes
create table notes (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade,
  lesson_id uuid references lessons(id) on delete cascade,
  content text not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 9. Tickets (Q&A)
create table tickets (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade,
  lesson_id uuid references lessons(id) on delete cascade,
  subject text not null,
  message text not null,
  status text default 'open' check (status in ('open', 'answered', 'closed')),
  admin_response text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- RLS Policies (Simplified for Initial Setup)
alter table profiles enable row level security;
alter table platform_settings enable row level security;
alter table courses enable row level security;
alter table modules enable row level security;
alter table lessons enable row level security;
alter table enrollments enable row level security;
alter table progress enable row level security;
alter table notes enable row level security;
alter table tickets enable row level security;

-- Public Read for Settings
create policy "Public read settings" on platform_settings for select using (true);
-- Only admin can update settings
create policy "Admin update settings" on platform_settings for update using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- Profiles: Users see themselves, Admins see all
create policy "Users read own profile" on profiles for select using (auth.uid() = id);
create policy "Admins read all profiles" on profiles for select using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "Admins update profiles" on profiles for update using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- Courses/Content: Admins all access, Students read if published (or specific logic)
create policy "Admin full course access" on courses for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "Student read published courses" on courses for select using (is_published = true);

-- Enrollments: Admins all, Users read own
create policy "Admin full enrollment access" on enrollments for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "User read own enrollments" on enrollments for select using (auth.uid() = user_id);

-- Trigger to create profile on signup
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', 'student');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
