import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Button, Input, Card, Loader } from '../components/ui';
import { Plus, Trash2, Edit, Save, Settings, Users, BookOpen, GripVertical } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// --- Types ---
type Course = { id: string; title: string; is_published: boolean; price: number };

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
    supabase.from('platform_settings').select('*').single().then(({ data }) => {
      if(data) setConfig(data);
    });
  }, []);

  const handleSave = async () => {
    setLoading(true);
    await supabase.from('platform_settings').update(config).eq('id', 1); // Assuming ID 1 exists
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
        {activeTab === 'users' && (
          <div>
            <h2 className="text-2xl font-bold mb-4">Gestão de Alunos</h2>
            <p className="text-muted-foreground">Funcionalidade de adicionar alunos manualmente, definir validade e enviar e-mail de boas-vindas.</p>
            {/* Implementation omitted for brevity, follows standard CRUD pattern with 'enrollments' table */}
            <div className="mt-8 border p-8 rounded-lg border-dashed text-center text-muted-foreground">
               Área de listagem de alunos e controle de matriculas (Tabela Enrollments)
            </div>
          </div>
        )}
      </main>
    </div>
  );
}