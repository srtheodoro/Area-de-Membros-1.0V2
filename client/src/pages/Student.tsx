import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Button, Card, Loader } from '../components/ui';
import { PlayCircle, CheckCircle, Lock, Download } from 'lucide-react';
import ReactPlayer from 'react-player';
import { jsPDF } from 'jspdf';

// --- Certificate Generator ---
const generateCertificate = (userName: string, courseName: string) => {
  const doc = new jsPDF({ orientation: 'landscape' });
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, 297, 210, 'F');
  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(5);
  doc.rect(10, 10, 277, 190);
  
  doc.setFontSize(40);
  doc.setTextColor(37, 99, 235);
  doc.text("CERTIFICADO DE CONCLUSÃO", 148.5, 60, { align: 'center' });
  
  doc.setFontSize(20);
  doc.setTextColor(50, 50, 50);
  doc.text("Certificamos que", 148.5, 90, { align: 'center' });
  
  doc.setFontSize(30);
  doc.text(userName, 148.5, 110, { align: 'center' });
  
  doc.setFontSize(20);
  doc.text(`Concluiu com êxito o curso: ${courseName}`, 148.5, 135, { align: 'center' });
  
  const validationCode = Math.random().toString(36).substring(7).toUpperCase();
  doc.setFontSize(12);
  doc.text(`Código de Validação: ${validationCode}`, 148.5, 180, { align: 'center' });
  
  doc.save(`certificado-${courseName}.pdf`);
};

export default function StudentArea() {
  const { profile, loading } = useAuth();
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [modules, setModules] = useState<any[]>([]);
  const [activeLesson, setActiveLesson] = useState<any>(null);

  useEffect(() => {
    // Fetch enrolled courses
    const fetchMyCourses = async () => {
      if(!profile) return;
      // Join enrollments with courses
      const { data } = await supabase
        .from('enrollments')
        .select('course:courses(*)')
        .eq('user_id', profile.id);
      
      if(data) setCourses(data.map((d: any) => d.course));
    };
    fetchMyCourses();
  }, [profile]);

  const loadCourseContent = async (course: any) => {
    setSelectedCourse(course);
    // Fetch modules and lessons
    const { data: mods } = await supabase
      .from('modules')
      .select('*, lessons(*)')
      .eq('course_id', course.id)
      .order('position');
    
    if(mods) {
      setModules(mods);
      // Select first lesson of first module
      if(mods.length > 0 && mods[0].lessons.length > 0) {
        setActiveLesson(mods[0].lessons[0]);
      }
    }
  };

  if (loading) return <Loader />;

  // --- Course Player View ---
  if (selectedCourse) {
    return (
      <div className="flex flex-col h-screen">
        <header className="h-16 border-b flex items-center px-6 bg-card justify-between">
           <div className="flex items-center gap-4">
             <Button variant="outline" onClick={() => setSelectedCourse(null)}>Voltar</Button>
             <h1 className="font-bold text-lg">{selectedCourse.title}</h1>
           </div>
           <Button variant="ghost" onClick={() => generateCertificate(profile?.full_name || 'Aluno', selectedCourse.title)}>
             <Download className="mr-2" size={16}/> Certificado
           </Button>
        </header>
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar Modules */}
          <aside className="w-80 border-r bg-secondary/10 overflow-y-auto">
            {modules.map((mod) => (
              <div key={mod.id} className="mb-2">
                <div className="px-4 py-3 font-semibold bg-secondary/30">{mod.title}</div>
                <div>
                  {mod.lessons.map((lesson: any) => (
                    <button
                      key={lesson.id}
                      onClick={() => setActiveLesson(lesson)}
                      className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-secondary/20 ${activeLesson?.id === lesson.id ? 'bg-primary/10 text-primary' : ''}`}
                    >
                      <PlayCircle size={14} /> {lesson.title}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </aside>
          
          {/* Main Content */}
          <main className="flex-1 bg-background overflow-y-auto p-8">
            {activeLesson ? (
              <div className="max-w-4xl mx-auto space-y-6">
                <div className="aspect-video bg-black rounded-lg overflow-hidden shadow-xl">
                  {activeLesson.video_url ? (
                    <ReactPlayer url={activeLesson.video_url} width="100%" height="100%" controls />
                  ) : (
                    <div className="flex items-center justify-center h-full text-white">Sem Vídeo</div>
                  )}
                </div>
                <div>
                  <h2 className="text-2xl font-bold mb-2">{activeLesson.title}</h2>
                  <div className="prose dark:prose-invert">
                    {activeLesson.content}
                  </div>
                </div>
                <div className="border-t pt-6">
                   <h3 className="font-bold mb-4">Dúvidas & Comentários</h3>
                   {/* Ticket component would go here */}
                   <p className="text-muted-foreground text-sm">Área de tickets implementada via tabela `tickets`.</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">Selecione uma aula</div>
            )}
          </main>
        </div>
      </div>
    );
  }

  // --- Dashboard / My Courses View ---
  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Meus Cursos</h1>
      {courses.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-muted-foreground text-lg">Você ainda não possui cursos.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {courses.map(course => (
            <Card key={course.id} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer" >
              <div className="h-40 bg-gray-200 relative">
                {course.thumbnail_url && <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />}
              </div>
              <div className="p-4">
                <h3 className="font-bold text-lg mb-2 truncate">{course.title}</h3>
                <Button className="w-full" onClick={() => loadCourseContent(course)}>Acessar Curso</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}