import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Button, Input, Card, Loader } from '../components/ui';
import { Plus, Trash2, Edit, Save, Settings, Users, BookOpen, GripVertical, X, Check, Search } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// --- Types ---
type Course = { id: string; title: string; is_published: boolean; price: number };
type Enrollment = { 
  id: string; 
  status: string; 
  access_end_at: string | null; 
  user_id: string;
  course_id: string;
  profile: { email: string; full_name: string };
  course: { title: string };
};

// --- Sortable Item Component ---
function SortableItem({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 mb-2 p-2 bg-secondary/20 rounded">
      <div {...attributes} {...listeners} className="cursor-grab"><GripVertical size={16} /></div>
      {children}
    </div>
  );
}

// --- Admin Sub-Pages ---

const AdminSettings = () => {
  const [config, setConfig] = useState({ primary_color: '#2563eb', site_name: '', is_glass_mode: false });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from('theme_settings').select('*').single().then(({ data }) => {
      if(data) setConfig(data);
    });
  }, []);

  const handleSave = async () => {
    setLoading(true);
    await supabase.from('theme_settings').update(config).eq('id', 1); // Assuming ID 1 exists
    // Force reload to apply theme or use context to update runtime
    window.location.reload(); 
    setLoading(false);
  };

  return (
    <Card className="p-6 max-w-lg">
      <h2 className="text-2xl font-bold mb-4">Personalização White-label</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Nome da Plataforma</label>
          <Input value={config.site_name} onChange={e => setConfig({...config, site_name: e.target.value})} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Cor Primária (HEX)</label>
          <Input type="color" className="h-12 w-full p-1" value={config.primary_color} onChange={e => setConfig({...config, primary_color: e.target.value})} />
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="glass" checked={config.is_glass_mode} onChange={e => setConfig({...config, is_glass_mode: e.target.checked})} />
          <label htmlFor="glass">Modo Glassmorphism</label>
        </div>
        <Button onClick={handleSave} disabled={loading}>{loading ? 'Salvando...' : 'Salvar Alterações'}</Button>
      </div>
    </Card>
  );
};

const AdminCourses = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [newTitle, setNewTitle] = useState('');

  const fetchCourses = async () => {
    const { data } = await supabase.from('courses').select('*').order('created_at', { ascending: false });
    if(data) setCourses(data);
  };

  useEffect(() => { fetchCourses(); }, []);

  const createCourse = async () => {
    if(!newTitle) return;
    await supabase.from('courses').insert({ title: newTitle, is_published: false });
    setNewTitle('');
    fetchCourses();
  };

  const togglePublish = async (id: string, current: boolean) => {
    await supabase.from('courses').update({ is_published: !current }).eq('id', id);
    fetchCourses();
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        <Input placeholder="Nome do novo curso" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
        <Button onClick={createCourse}><Plus size={16} className="mr-2" /> Criar Curso</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {courses.map(course => (
          <Card key={course.id} className="p-4 flex flex-col justify-between h-40">
            <div>
              <h3 className="font-bold text-lg">{course.title}</h3>
              <span className={`text-xs px-2 py-1 rounded ${course.is_published ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                {course.is_published ? 'Publicado' : 'Rascunho'}
              </span>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={() => togglePublish(course.id, course.is_published)}>
                {course.is_published ? 'Despublicar' : 'Publicar'}
              </Button>
              {/* Note: Full content editing would link to a detail page */}
              <Button size="sm" variant="secondary"><Edit size={16} /></Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

const AdminUsers = () => {
  const { session } = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [email, setEmail] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [days, setDays] = useState('365');

  const fetchData = async () => {
    // Fetch Enrollments
    const { data: enrollmentData } = await supabase
      .from('enrollments')
      .select('*, profile:profiles(email, full_name), course:courses(title)')
      .order('created_at', { ascending: false });
    
    if (enrollmentData) setEnrollments(enrollmentData as any);

    // Fetch Courses for Select
    const { data: courseData } = await supabase
      .from('courses')
      .select('id, title')
      .eq('is_published', true);
    
    if (courseData) setCourses(courseData as any);
  };

  useEffect(() => { fetchData(); }, []);

  const handleGrantAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/admin/enrollments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          email,
          course_id: selectedCourse,
          days_valid: days
        })
      });

      if (!response.ok) throw new Error('Falha ao conceder acesso');
      
      alert('Acesso concedido e e-mail enviado com sucesso!');
      setShowModal(false);
      setEmail('');
      fetchData();
    } catch (err) {
      alert('Erro ao processar solicitação.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm('Tem certeza que deseja revogar este acesso?')) return;
    await supabase.from('enrollments').update({ status: 'revoked' }).eq('id', id);
    fetchData();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gestão de Acessos</h2>
        <Button onClick={() => setShowModal(true)}><Plus size={16} className="mr-2"/> Novo Acesso Manual</Button>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-secondary/30 text-muted-foreground uppercase">
              <tr>
                <th className="px-6 py-3">Aluno</th>
                <th className="px-6 py-3">Curso</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Validade</th>
                <th className="px-6 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {enrollments.map((item) => (
                <tr key={item.id} className="border-b hover:bg-secondary/10">
                  <td className="px-6 py-4">
                    <div className="font-medium">{item.profile?.full_name || 'N/A'}</div>
                    <div className="text-xs text-muted-foreground">{item.profile?.email}</div>
                  </td>
                  <td className="px-6 py-4">{item.course?.title}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${item.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {item.access_end_at ? new Date(item.access_end_at).toLocaleDateString() : 'Vitalício'}
                  </td>
                  <td className="px-6 py-4">
                    {item.status === 'active' && (
                      <Button variant="danger" size="sm" onClick={() => handleRevoke(item.id)}>Revogar</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal Novo Acesso */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md p-6 bg-background relative">
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
              <X size={20} />
            </button>
            <h3 className="text-xl font-bold mb-4">Conceder Acesso</h3>
            <form onSubmit={handleGrantAccess} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">E-mail do Aluno</label>
                <Input type="email" required placeholder="aluno@exemplo.com" value={email} onChange={e => setEmail(e.target.value)} />
                <p className="text-xs text-muted-foreground mt-1">Se o aluno não existir, uma conta será criada e um link de senha enviado.</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Curso</label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  required 
                  value={selectedCourse} 
                  onChange={e => setSelectedCourse(e.target.value)}
                >
                  <option value="">Selecione um curso...</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Validade (dias)</label>
                <Input type="number" required value={days} onChange={e => setDays(e.target.value)} />
                <p className="text-xs text-muted-foreground mt-1">Deixe 0 para acesso vitalício (ajustar backend se necessário).</p>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Processando...' : 'Conceder Acesso & Enviar E-mail'}
              </Button>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};

// --- Main Admin Layout ---
export default function AdminDashboard() {
  const { isAdmin, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<'courses' | 'users' | 'settings'>('courses');

  if (loading) return <Loader />;
  if (!isAdmin) return <div className="p-10 text-center text-red-500">Acesso Negado.</div>;

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-secondary/30 p-4 hidden md:block">
        <h1 className="text-xl font-bold mb-8 text-primary">Admin Pro</h1>
        <nav className="space-y-2">
          <Button variant={activeTab === 'courses' ? 'primary' : 'ghost'} className="w-full justify-start" onClick={() => setActiveTab('courses')}>
            <BookOpen size={18} className="mr-2" /> Cursos
          </Button>
          <Button variant={activeTab === 'users' ? 'primary' : 'ghost'} className="w-full justify-start" onClick={() => setActiveTab('users')}>
            <Users size={18} className="mr-2" /> Alunos & Acessos
          </Button>
          <Button variant={activeTab === 'settings' ? 'primary' : 'ghost'} className="w-full justify-start" onClick={() => setActiveTab('settings')}>
            <Settings size={18} className="mr-2" /> Configurações
          </Button>
        </nav>
      </aside>

      {/* Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        {activeTab === 'courses' && <AdminCourses />}
        {activeTab === 'settings' && <AdminSettings />}
        {activeTab === 'users' && <AdminUsers />}
      </main>
    </div>
  );
}