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

// --- ROTA PÚBLICA: Validação de Certificado ---
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
        <div style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h1 style="color: red;">Certificado Não Encontrado</h1>
          <p>O código <strong>${code}</strong> não corresponde a um certificado válido em nossa base.</p>
        </div>
      `);
    }

    res.send(`
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ccc; border-radius: 10px; text-align: center; background-color: #f9f9f9;">
        <h1 style="color: #2563eb;">Certificado Válido ✓</h1>
        <p>Este documento certifica que</p>
        <h2 style="color: #333;">${cert.profile.full_name}</h2>
        <p>concluiu com êxito o curso</p>
        <h3 style="color: #333;">${cert.course.title}</h3>
        <hr style="margin: 20px 0; opacity: 0.3;" />
        <p style="font-size: 0.9em; color: #666;">
          Emitido em: ${new Date(cert.issued_at).toLocaleDateString('pt-BR')}<br>
          Código de Validação: <strong>${code}</strong>
        </p>
      </div>
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
  
  // Se vier user_id, usa. Se vier email, busca ID ou cria "shadow user".
  // Para simplificar MVP, assumiremos que o admin passa user_id (selecionado de lista) ou email para novo user.
  
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
        // Isso requer a SERVICE_ROLE_KEY
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email: email,
          email_confirm: true // Confirmar automaticamente para permitir reset de senha
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

      // Conteúdo do E-mail em Português
      const emailHtml = `
        <div style="font-family: sans-serif; color: #333;">
          <h2>Olá!</h2>
          <p>Seu acesso ao curso na <strong>${siteName}</strong> foi liberado com sucesso.</p>
          ${isNewUser 
            ? `<p>Sua conta foi criada. Para definir sua senha segura e acessar a plataforma, clique no botão abaixo:</p>` 
            : `<p>Seu acesso foi atualizado. Se precisar redefinir sua senha, use o link abaixo:</p>`
          }
          <p style="margin: 20px 0;">
            <a href="${resetLink}" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Definir Minha Senha</a>
          </p>
          <p style="font-size: 0.9em; color: #666;">Se o botão não funcionar, copie e cole o link: <br>${resetLink}</p>
          <p>Bons estudos!</p>
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

// --- ROTAS API: ALUNO (Mantidas as mesmas, sem alterações profundas) ---
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