-- EXTENSIONS
create extension if not exists "uuid-ossp";

-- ENUMS (Tipos personalizados para consistência)
create type user_role as enum ('student', 'admin', 'support');
create type enrollment_status as enum ('active', 'expired', 'revoked', 'pending');
create type ticket_status as enum ('open', 'answered', 'closed');
create type video_provider as enum ('youtube', 'vimeo', 'panda', 'custom');

-- 1. PROFILES (Extensão da tabela auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  avatar_url text,
  role user_role default 'student'::user_role,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

-- 2. THEME SETTINGS (White-label)
-- Tabela singleton (geralmente apenas 1 registro)
create table public.theme_settings (
  id int generated always as identity primary key,
  site_name text default 'Minha Plataforma EAD',
  logo_url text,
  favicon_url text,
  primary_color text default '#2563eb', -- Tailwind Blue-600
  secondary_color text default '#1e40af', -- Tailwind Blue-800
  is_glass_mode boolean default false,
  updated_at timestamp with time zone default now()
);

-- Inserir configuração padrão inicial
insert into public.theme_settings (site_name) values ('EAD Pro Platform');

-- 3. COURSES
create table public.courses (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  slug text unique, -- Para URLs amigáveis
  description text,
  thumbnail_url text,
  price decimal(10, 2) default 0.00,
  is_published boolean default false,
  created_by uuid references public.profiles(id),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 4. MODULES
create table public.modules (
  id uuid default uuid_generate_v4() primary key,
  course_id uuid references public.courses(id) on delete cascade not null,
  title text not null,
  description text,
  position int default 0, -- Para ordenação Drag-and-Drop
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 5. LESSONS
create table public.lessons (
  id uuid default uuid_generate_v4() primary key,
  module_id uuid references public.modules(id) on delete cascade not null,
  title text not null,
  content text, -- Rich Text / HTML description
  video_url text,
  provider video_provider default 'youtube'::video_provider,
  duration_seconds int default 0,
  position int default 0, -- Para ordenação Drag-and-Drop
  is_free_preview boolean default false, -- Aula liberada para não-compradores
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 6. ENROLLMENTS (Matrículas e Controle de Acesso)
create table public.enrollments (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  course_id uuid references public.courses(id) on delete cascade not null,
  status enrollment_status default 'active'::enrollment_status,
  access_end_at timestamp with time zone, -- Validade do acesso (NULL = Vitalício)
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique (user_id, course_id) -- Impede duplicidade
);

-- 7. PROGRESS (Rastreamento de Aulas)
create table public.progress (
  user_id uuid references public.profiles(id) on delete cascade not null,
  lesson_id uuid references public.lessons(id) on delete cascade not null,
  is_completed boolean default false,
  completed_at timestamp with time zone,
  last_watched_at timestamp with time zone default now(),
  primary key (user_id, lesson_id) -- Chave composta
);

-- 8. NOTES (Anotações Privadas do Aluno)
create table public.notes (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  lesson_id uuid references public.lessons(id) on delete cascade not null,
  content text not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 9. TICKETS (Sistema de Dúvidas/Suporte)
create table public.tickets (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null, -- Quem abriu
  course_id uuid references public.courses(id) on delete cascade not null,
  lesson_id uuid references public.lessons(id) on delete set null, -- Opcional, dúvida geral ou de aula
  subject text not null,
  status ticket_status default 'open'::ticket_status,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 10. TICKET MESSAGES (Histórico da Conversa)
create table public.ticket_messages (
  id uuid default uuid_generate_v4() primary key,
  ticket_id uuid references public.tickets(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete set null, -- Quem enviou (aluno ou admin)
  message text not null,
  is_admin_reply boolean default false, -- Flag para facilitar estilização no front
  created_at timestamp with time zone default now()
);

-- 11. CERTIFICATES
create table public.certificates (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  course_id uuid references public.courses(id) on delete cascade not null,
  validation_code text unique not null, -- Código para validação pública
  issued_at timestamp with time zone default now(),
  unique (user_id, course_id) -- Apenas 1 certificado por curso por aluno
);

-- 12. AUDIT LOG (Auditoria de Ações Administrativas)
create table public.audit_logs (
  id uuid default uuid_generate_v4() primary key,
  actor_id uuid references public.profiles(id) on delete set null, -- Admin que realizou a ação
  action text not null, -- Ex: 'CREATE_COURSE', 'REVOKE_ACCESS', 'UPDATE_SETTINGS'
  entity_table text not null, -- Ex: 'courses', 'enrollments'
  entity_id uuid, -- ID do registro afetado
  details jsonb, -- Dados anteriores e novos (snapshot)
  created_at timestamp with time zone default now()
);

-- INDEXES (Performance)
create index idx_modules_course_pos on public.modules (course_id, position);
create index idx_lessons_module_pos on public.lessons (module_id, position);
create index idx_enrollments_user_status on public.enrollments (user_id, status);
create index idx_enrollments_course on public.enrollments (course_id);
create index idx_tickets_course_status on public.tickets (course_id, status);
create index idx_progress_user on public.progress (user_id);

-- FUNCTION: Update 'updated_at' column automatically
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

-- TRIGGERS (Auto-update timestamps)
create trigger update_profiles_modtime before update on public.profiles for each row execute procedure update_updated_at_column();
create trigger update_theme_modtime before update on public.theme_settings for each row execute procedure update_updated_at_column();
create trigger update_courses_modtime before update on public.courses for each row execute procedure update_updated_at_column();
create trigger update_modules_modtime before update on public.modules for each row execute procedure update_updated_at_column();
create trigger update_lessons_modtime before update on public.lessons for each row execute procedure update_updated_at_column();
create trigger update_enrollments_modtime before update on public.enrollments for each row execute procedure update_updated_at_column();
create trigger update_notes_modtime before update on public.notes for each row execute procedure update_updated_at_column();
create trigger update_tickets_modtime before update on public.tickets for each row execute procedure update_updated_at_column();

-- FUNCTION: Handle New User (Supabase Auth Hook)
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id, 
    new.email, 
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)), 
    'student'
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for Auth
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ROW LEVEL SECURITY (RLS) - Basic Policies
-- (Na produção, refinar para garantir que alunos só vejam cursos comprados ou públicos)

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.theme_settings enable row level security;
alter table public.courses enable row level security;
alter table public.modules enable row level security;
alter table public.lessons enable row level security;
alter table public.enrollments enable row level security;
alter table public.progress enable row level security;
alter table public.notes enable row level security;
alter table public.tickets enable row level security;
alter table public.ticket_messages enable row level security;
alter table public.certificates enable row level security;
alter table public.audit_logs enable row level security;

-- Admin Helper Policy Function
-- (Assume que o perfil do usuário logado tem role='admin')
-- Nota: Para setup inicial, você pode precisar desabilitar RLS ou criar um usuário manualmente.

-- POLICIES (Exemplos Simplificados)
-- Profiles: Usuário vê o seu, Admin vê todos
create policy "Users view own profile" on profiles for select using (auth.uid() = id);
create policy "Admins view all profiles" on profiles for select using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "Admins update all profiles" on profiles for update using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- Theme Settings: Público vê, Admin edita
create policy "Public view settings" on theme_settings for select using (true);
create policy "Admins edit settings" on theme_settings for all using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- Courses/Modules/Lessons: Leitura baseada em publicação, Escrita apenas Admin
create policy "Public/Students view published courses" on courses for select using (is_published = true or exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "Admins manage courses" on courses for all using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- Enrollments: Aluno vê as suas, Admin vê todas
create policy "Student view own enrollments" on enrollments for select using (auth.uid() = user_id);
create policy "Admins manage enrollments" on enrollments for all using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- Tickets/Messages: Aluno vê os seus, Admin vê todos
create policy "Student manage own tickets" on tickets for all using (auth.uid() = user_id);
create policy "Admins manage all tickets" on tickets for all using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
