
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// --- Configuração do Supabase Admin (Server-Side) ---
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('CRITICAL: Supabase URL or Key missing in environment variables.');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// --- Configuração de E-mail (Nodemailer) ---
// Configurar variáveis SMTP no .env da Hostinger
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.example.com',
  port: process.env.SMTP_PORT || 587,
  secure: false, // true para 465
  auth: {
    user: process.env.SMTP_USER || 'user',
    pass: process.env.SMTP_PASS || 'pass'
  }
});

const sendEmail = async (to, subject, htmlContent) => {
  // Se não houver config real, logar no console (Modo Desenvolvimento/MVP)
  if (!process.env.SMTP_HOST) {
    console.log(`\n--- [MOCK EMAIL] To: ${to} ---`);
    console.log(`Subject: ${subject}`);
    console.log(`Content Preview: ${htmlContent.substring(0, 100)}...`);
    console.log('------------------------------\n');
    return;
  }

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"EAD Platform" <no-reply@eadplatform.com>',
      to,
      subject,
      html: htmlContent
    });
  } catch (err) {
    console.error('Email sending failed:', err);
  }
};

// --- Middlewares Globais ---
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// --- Middleware de Autenticação e RBAC ---
const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Missing Authorization header' });

  const token = authHeader.split(' ')[1];
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) return res.status(401).json({ error: 'Invalid or expired token' });

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile) return res.status(403).json({ error: 'Profile not found' });

  req.user = user;
  req.profile = profile;
  next();
};

const requireAdmin = (req, res, next) => {
  if (req.profile.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied: Admins only' });
  }
  next();
};

// --- ROTA PÚBLICA: Validação de Certificado (Visual Aprimorado) ---
app.get('/verify/:code', async (req, res) => {
  const { code } = req.params;

  try {
    const { data: cert, error } = await supabase
      .from('certificates')
      .select(`
        *,
        profile:profiles(full_name),
        course:courses(title)
      `)
      .eq('validation_code', code)
      .single();

    if (error || !cert) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Certificado Não Encontrado</title>
            <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="bg-slate-50 flex items-center justify-center min-h-screen p-4">
            <div class="max-w-md w-full bg-white rounded-xl shadow-xl p-8 text-center border border-red-100">
                <div class="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
                    <svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </div>
                <h1 class="text-2xl font-bold text-slate-900 mb-2">Certificado Inválido</h1>
                <p class="text-slate-600 mb-6">O código <strong>${code}</strong> não foi encontrado em nossa base de dados.</p>
                <a href="/" class="text-blue-600 hover:text-blue-800 font-medium">Voltar para Home</a>
            </div>
        </body>
        </html>
      `);
    }

    res.send(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Certificado Válido - ${cert.profile.full_name}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap" rel="stylesheet">
          <style>body { font-family: 'Inter', sans-serif; }</style>
      </head>
      <body class="bg-slate-50 flex items-center justify-center min-h-screen p-4 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-100 via-slate-50 to-slate-100">
          <div class="max-w-2xl w-full bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
              <div class="bg-blue-600 p-6 text-center">
                  <h1 class="text-white text-xl font-bold tracking-wider uppercase">Certificado Autêntico</h1>
              </div>
              <div class="p-10 text-center">
                  <div class="inline-block p-4 rounded-full bg-green-50 mb-6">
                     <svg class="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  </div>
                  
                  <p class="text-slate-500 text-sm uppercase tracking-wide font-semibold mb-2">Certificamos que</p>
                  <h2 class="text-3xl md:text-4xl font-extrabold text-slate-900 mb-6">${cert.profile.full_name}</h2>
                  
                  <div class="h-px w-24 bg-slate-200 mx-auto mb-6"></div>
                  
                  <p class="text-slate-600 mb-2">Concluiu com êxito o curso profissionalizante:</p>
                  <h3 class="text-xl md:text-2xl font-bold text-blue-700 mb-8">${cert.course.title}</h3>
                  
                  <div class="bg-slate-50 rounded-lg p-6 border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
                      <div class="text-left">
                          <p class="text-xs text-slate-400 uppercase">Data de Emissão</p>
                          <p class="font-semibold text-slate-800">${new Date(cert.issued_at).toLocaleDateString('pt-BR')}</p>
                      </div>
                      <div class="text-right">
                          <p class="text-xs text-slate-400 uppercase">Código de Validação</p>
                          <p class="font-mono font-bold text-slate-800 tracking-wider">${code}</p>
                      </div>
                  </div>
              </div>
              <div class="bg-slate-50 p-4 text-center text-xs text-slate-400 border-t">
                  Plataforma EAD Pro - Verificação Pública Oficial
              </div>
          </div>
      </body>
      </html>
    `);

  } catch (err) {
    res.status(500).send('Erro interno ao validar certificado.');
  }
});

// --- ROTAS API: ADMIN ---

// Listar Cursos
app.get('/api/admin/courses', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('courses')
      .select('*, _count:enrollments(count)')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Criar Curso
app.post('/api/admin/courses', requireAuth, requireAdmin, async (req, res) => {
  const { title, description, price, thumbnail_url } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });

  try {
    const { data, error } = await supabase
      .from('courses')
      .insert({ title, description, price, thumbnail_url, created_by: req.profile.id })
      .select().single();

    if (error) throw error;
    
    await supabase.from('audit_logs').insert({
      actor_id: req.profile.id,
      action: 'CREATE_COURSE',
      entity_table: 'courses',
      entity_id: data.id,
      details: { title }
    });

    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reordenar Módulos
app.put('/api/admin/modules/reorder', requireAuth, requireAdmin, async (req, res) => {
  const { items } = req.body;
  if (!items || !Array.isArray(items)) return res.status(400).json({ error: 'Invalid items array' });

  try {
    const updates = items.map(({ id, position }) => 
      supabase.from('modules').update({ position }).eq('id', id)
    );
    await Promise.all(updates);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Controle de Acesso (Matricular Aluno Manualmente + E-mail)
app.post('/api/admin/enrollments', requireAuth, requireAdmin, async (req, res) => {
  const { user_id, email, course_id, days_valid } = req.body;
  
  if ((!user_id && !email) || !course_id) return res.status(400).json({ error: 'User ID/Email and Course ID required' });

  try {
    let targetUserId = user_id;
    let isNewUser = false;

    // Se passou email mas não ID, buscar ou criar usuário
    if (!targetUserId && email) {
      // 1. Tentar buscar usuário existente
      const { data: existingUsers } = await supabase.from('profiles').select('id').eq('email', email);
      
      if (existingUsers && existingUsers.length > 0) {
        targetUserId = existingUsers[0].id;
      } else {
        // 2. Criar usuário no Auth (sem senha, email confirmado)
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email: email,
          email_confirm: true 
        });

        if (createError) throw createError;
        targetUserId = newUser.user.id;
        isNewUser = true;
      }
    }

    // Calcular data de expiração
    let access_end_at = null;
    if (days_valid) {
      const date = new Date();
      date.setDate(date.getDate() + parseInt(days_valid));
      access_end_at = date.toISOString();
    }

    // Inserir Matrícula
    const { data: enrollment, error } = await supabase
      .from('enrollments')
      .upsert({ 
        user_id: targetUserId, 
        course_id, 
        access_end_at, 
        status: 'active' 
      }, { onConflict: 'user_id, course_id' })
      .select()
      .single();

    if (error) throw error;

    // Gerar Link de Definição de Senha
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: email || (await supabase.from('profiles').select('email').eq('id', targetUserId).single()).data.email
    });

    if (!linkError && linkData && linkData.properties && linkData.properties.action_link) {
      const resetLink = linkData.properties.action_link;
      const targetEmail = email || linkData.user.email;
      const siteName = process.env.SITE_NAME || 'Plataforma EAD';

      // Conteúdo do E-mail em Português (HTML Bonito)
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb;">${siteName}</h1>
          </div>
          <div style="background-color: #f8fafc; padding: 30px; border-radius: 8px; border: 1px solid #e2e8f0;">
            <h2 style="color: #1e293b; margin-top: 0;">Acesso Liberado! 🚀</h2>
            <p style="line-height: 1.6;">Olá,</p>
            <p style="line-height: 1.6;">Você acaba de receber acesso a um novo curso em nossa plataforma.</p>
            ${isNewUser 
              ? `<p style="line-height: 1.6;">Sua conta foi criada automaticamente. Para definir sua senha e começar a estudar, clique no botão abaixo:</p>` 
              : `<p style="line-height: 1.6;">Seu acesso foi atualizado. Se precisar redefinir sua senha, use o link abaixo:</p>`
            }
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Acessar Plataforma</a>
            </div>
            <p style="font-size: 0.9em; color: #64748b; margin-top: 20px;">
              Ou copie este link: <br>
              <a href="${resetLink}" style="color: #2563eb;">${resetLink}</a>
            </p>
          </div>
        </div>
      `;

      await sendEmail(targetEmail, `Acesso Liberado - ${siteName}`, emailHtml);
    }

    await supabase.from('audit_logs').insert({
      actor_id: req.profile.id,
      action: 'GRANT_ACCESS',
      entity_table: 'enrollments',
      entity_id: enrollment.id,
      details: { targetUserId, course_id, days_valid, email_sent: true }
    });

    res.json({ enrollment, message: 'Access granted and email sent.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Responder Ticket
app.post('/api/admin/tickets/:id/reply', requireAuth, requireAdmin, async (req, res) => {
  const { message } = req.body;
  const { id } = req.params;

  try {
    const { error } = await supabase.from('ticket_messages').insert({
      ticket_id: id,
      user_id: req.profile.id,
      message,
      is_admin_reply: true
    });
    if (error) throw error;
    await supabase.from('tickets').update({ status: 'answered' }).eq('id', id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- ROTAS API: ALUNO (Mantidas as mesmas) ---
app.get('/api/student/courses', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('enrollments')
      .select(`status, access_end_at, course:courses (id, title, thumbnail_url, description)`)
      .eq('user_id', req.user.id)
      .eq('status', 'active');

    if (error) throw error;
    const activeCourses = data.filter(e => !e.access_end_at || new Date(e.access_end_at) > new Date());
    res.json(activeCourses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/student/courses/:id', requireAuth, async (req, res) => {
  const courseId = req.params.id;
  try {
    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('status, access_end_at')
      .eq('user_id', req.user.id)
      .eq('course_id', courseId)
      .eq('status', 'active')
      .single();

    if (!enrollment) return res.status(403).json({ error: 'Not enrolled or expired' });
    if (enrollment.access_end_at && new Date(enrollment.access_end_at) < new Date()) return res.status(403).json({ error: 'Access expired' });

    const { data: course, error } = await supabase
      .from('courses')
      .select(`*, modules (id, title, position, lessons (id, title, duration_seconds, position, video_url, content, provider))`)
      .eq('id', courseId)
      .single();
    
    course.modules.sort((a, b) => a.position - b.position);
    course.modules.forEach(m => m.lessons.sort((a, b) => a.position - b.position));
    if (error) throw error;
    res.json(course);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/student/progress', requireAuth, async (req, res) => {
  const { lesson_id, is_completed } = req.body;
  try {
    const { error } = await supabase.from('progress').upsert({
      user_id: req.user.id,
      lesson_id,
      is_completed,
      completed_at: is_completed ? new Date().toISOString() : null,
      last_watched_at: new Date().toISOString()
    });
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/student/certificates', requireAuth, async (req, res) => {
  const { course_id } = req.body;
  try {
    const { data: existing } = await supabase
      .from('certificates')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('course_id', course_id)
      .single();
    
    if (existing) return res.json(existing);

    const { data: modules } = await supabase.from('modules').select('id').eq('course_id', course_id);
    const moduleIds = modules.map(m => m.id);
    const { count: totalRealLessons } = await supabase.from('lessons').select('*', { count: 'exact', head: true }).in('module_id', moduleIds);
    const { count: completedLessons } = await supabase
      .from('progress')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id)
      .eq('is_completed', true)
      .in('lesson_id', (await supabase.from('lessons').select('id').in('module_id', moduleIds)).data.map(l => l.id));

    if (completedLessons < totalRealLessons) return res.status(400).json({ error: `Progress incomplete: ${completedLessons}/${totalRealLessons}` });

    const validationCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    const { data, error } = await supabase.from('certificates').insert({
      user_id: req.user.id,
      course_id,
      validation_code: validationCode
    }).select().single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Serving Frontend (Production) ---
const distPath = path.join(__dirname, '../client/dist');
app.use(express.static(distPath));

// Rota coringa para SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// --- Error Handler ---
app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
