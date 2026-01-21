import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Button, Card, Loader, Input } from '../components/ui';
import { PlayCircle, CheckCircle, Lock, Download, FileCheck, User, LogOut, X, Shield, QrCode } from 'lucide-react';
import ReactPlayer from 'react-player';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';

// --- Certificate Generator ---
const generateCertificate = async (userName: string, courseName: string, validationCode: string) => {
  const doc = new jsPDF({ orientation: 'landscape', format: 'a4', unit: 'mm' });
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  
  // Background
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, width, height, 'F');
  
  // Border
  doc.setDrawColor(37, 99, 235); // Blue-600
  doc.setLineWidth(3);
  doc.rect(10, 10, width - 20, height - 20);
  
  doc.setDrawColor(30, 64, 175); // Blue-800
  doc.setLineWidth(1);
  doc.rect(15, 15, width - 30, height - 30);

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(40);
  doc.setTextColor(37, 99, 235);
  doc.text("CERTIFICADO", width / 2, 50, { align: 'center' });
  doc.setFontSize(20);
  doc.text("DE CONCLUSÃO", width / 2, 60, { align: 'center' });
  
  // Content
  doc.setFont("times", "normal");
  doc.setFontSize(18);
  doc.setTextColor(60, 60, 60);
  doc.text("Certificamos que", width / 2, 85, { align: 'center' });
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(32);
  doc.setTextColor(0, 0, 0);
  doc.text(userName, width / 2, 105, { align: 'center' });
  doc.setLineWidth(0.5);
  doc.line((width / 2) - 80, 107, (width / 2) + 80, 107); // Underline
  
  doc.setFont("times", "normal");
  doc.setFontSize(18);
  doc.setTextColor(60, 60, 60);
  doc.text(`Concluiu com êxito o curso profissionalizante:`, width / 2, 125, { align: 'center' });
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.setTextColor(37, 99, 235);
  doc.text(courseName, width / 2, 140, { align: 'center' });

  // Date
  const dateStr = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
  doc.setFont("times", "italic");
  doc.setFontSize(14);
  doc.setTextColor(100, 100, 100);
  doc.text(`Emitido em ${dateStr}`, width / 2, 160, { align: 'center' });

  // QR Code Generation
  const validationUrl = `${window.location.protocol}//${window.location.host}/verify/${validationCode}`;
  try {
    const qrDataUrl = await QRCode.toDataURL(validationUrl, { margin: 1 });
    doc.addImage(qrDataUrl, 'PNG', width - 50, height - 50, 35, 35);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text("Valide este certificado:", width - 32.5, height - 52, { align: 'center' });
  } catch (e) {
    console.error("QR Code Error", e);
  }

  // Footer / Validation Code
  doc.setFont("courier", "bold");
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(`Código: ${validationCode}`, 30, height - 30);
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`URL: ${validationUrl}`, 30, height - 25);
  
  doc.save(`certificado-${validationCode}.pdf`);
};

const ProfileModal = ({ onClose }: { onClose: () => void }) => {
  const { profile } = useAuth();
  const [tab, setTab] = useState<'general' | 'security'>('general');
  
  // General State
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // MFA State
  const [mfaFactors, setMfaFactors] = useState<any[]>([]);
  const [enrollData, setEnrollData] = useState<any>(null); // { id, type, totp: { qr_code, secret, uri } }
  const [verifyCode, setVerifyCode] = useState('');
  const [qrImage, setQrImage] = useState('');

  useEffect(() => {
    fetchFactors();
  }, []);

  const fetchFactors = async () => {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (!error) setMfaFactors(data.all);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      alert("Senha atualizada com sucesso!");
      setPassword('');
    } catch (err: any) {
      alert("Erro ao atualizar: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const startMfaEnrollment = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
      if (error) throw error;
      
      setEnrollData(data);
      // Generate QR Code Image from URI
      const url = await QRCode.toDataURL(data.totp.uri);
      setQrImage(url);
    } catch (err: any) {
      alert("Erro ao iniciar 2FA: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const verifyAndActivateMfa = async () => {
    if(!enrollData) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.challengeAndVerify({
        factorId: enrollData.id,
        code: verifyCode
      });
      if (error) throw error;
      
      alert("Autenticação de 2 Fatores ativada com sucesso!");
      setEnrollData(null);
      setVerifyCode('');
      fetchFactors();
    } catch (err: any) {
      alert("Código inválido ou erro: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const unenrollMfa = async (factorId: string) => {
    if(!confirm("Tem certeza que deseja remover o 2FA? Sua conta ficará menos segura.")) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw error;
      fetchFactors();
    } catch (err: any) {
      alert("Erro: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg p-0 bg-background relative overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b flex justify-between items-center">
           <h3 className="text-xl font-bold">Minha Conta</h3>
           <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
             <X size={20} />
           </button>
        </div>
        
        <div className="flex border-b">
           <button 
             className={`flex-1 p-3 text-sm font-medium ${tab === 'general' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
             onClick={() => setTab('general')}
           >
             Geral
           </button>
           <button 
             className={`flex-1 p-3 text-sm font-medium ${tab === 'security' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
             onClick={() => setTab('security')}
           >
             Segurança & 2FA
           </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {tab === 'general' && (
            <>
              <div className="mb-6 bg-secondary/20 p-4 rounded-lg">
                <label className="text-xs text-muted-foreground uppercase font-bold">Nome</label>
                <div className="font-medium text-lg">{profile?.full_name}</div>
                <label className="text-xs text-muted-foreground mt-3 block uppercase font-bold">E-mail</label>
                <div className="font-medium">{profile?.email}</div>
              </div>
              
              <form onSubmit={handleUpdatePassword}>
                <h4 className="font-semibold mb-2">Redefinir Senha</h4>
                <div className="mb-4">
                  <Input 
                      type="password" 
                      placeholder="Nova Senha" 
                      minLength={6}
                      value={password} 
                      onChange={e => setPassword(e.target.value)} 
                      required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Atualizando..." : "Salvar Nova Senha"}
                </Button>
              </form>
            </>
          )}

          {tab === 'security' && (
            <div className="space-y-6">
               <div>
                 <h4 className="font-semibold flex items-center gap-2"><Shield size={18} className="text-primary"/> Autenticação de 2 Fatores (2FA)</h4>
                 <p className="text-sm text-muted-foreground mt-1">
                   Adicione uma camada extra de segurança à sua conta usando um aplicativo autenticador (Google Authenticator, Authy, etc).
                 </p>
               </div>

               {mfaFactors.some(f => f.status === 'verified') ? (
                 <div className="bg-green-100 text-green-800 p-4 rounded border border-green-200 flex items-center justify-between">
                    <span className="flex items-center gap-2"><CheckCircle size={16}/> 2FA Ativo</span>
                    <Button variant="danger" size="sm" onClick={() => unenrollMfa(mfaFactors[0].id)} disabled={loading}>Desativar</Button>
                 </div>
               ) : (
                 !enrollData ? (
                   <Button onClick={startMfaEnrollment} disabled={loading} className="w-full">
                     <QrCode size={16} className="mr-2"/> Configurar 2FA Agora
                   </Button>
                 ) : (
                   <div className="border rounded-lg p-4 bg-secondary/10">
                      <div className="text-center mb-4">
                        <p className="text-sm font-bold mb-2">1. Escaneie o QR Code no seu App:</p>
                        {qrImage && <img src={qrImage} alt="QR Code" className="mx-auto border p-1 bg-white rounded" />}
                        <p className="text-xs text-muted-foreground mt-2 break-all font-mono select-all">{enrollData.totp.secret}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-bold">2. Digite o código gerado:</p>
                        <Input 
                          placeholder="000000" 
                          value={verifyCode} 
                          onChange={e => setVerifyCode(e.target.value)} 
                          maxLength={6}
                          className="text-center tracking-widest text-lg"
                        />
                        <Button onClick={verifyAndActivateMfa} disabled={loading || verifyCode.length < 6} className="w-full">
                          Verificar e Ativar
                        </Button>
                        <Button variant="ghost" onClick={() => setEnrollData(null)} size="sm" className="w-full">Cancelar</Button>
                      </div>
                   </div>
                 )
               )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default function StudentArea() {
  const { profile, loading, session, signOut } = useAuth();
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [modules, setModules] = useState<any[]>([]);
  const [activeLesson, setActiveLesson] = useState<any>(null);
  const [issuingCert, setIssuingCert] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    // Fetch enrolled courses
    const fetchMyCourses = async () => {
      if(!profile) return;
      // Join enrollments with courses
      const { data } = await supabase
        .from('enrollments')
        .select('course:courses(*)')
        .eq('user_id', profile.id)
        .eq('status', 'active');
      
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

  const handleCertificate = async () => {
    if (!selectedCourse) return;
    setIssuingCert(true);
    try {
      // 1. Request Server to validate completion and issue code
      const response = await fetch('/api/student/certificates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ course_id: selectedCourse.id })
      });
      
      const data = await response.json();
      
      if (response.ok && data.validation_code) {
         await generateCertificate(profile?.full_name || 'Aluno', selectedCourse.title, data.validation_code);
      } else {
         alert(data.error || "Erro ao emitir certificado. Verifique se concluiu todas as aulas.");
      }
    } catch (err) {
      alert("Erro de conexão.");
    } finally {
      setIssuingCert(false);
    }
  };

  if (loading) return <Loader />;

  // --- Course Player View ---
  if (selectedCourse) {
    return (
      <div className="flex flex-col h-screen">
        <header className="h-16 border-b flex items-center px-6 bg-card justify-between shadow-sm z-10">
           <div className="flex items-center gap-4">
             <Button variant="outline" size="sm" onClick={() => setSelectedCourse(null)}>Voltar</Button>
             <h1 className="font-bold text-lg hidden md:block">{selectedCourse.title}</h1>
           </div>
           <Button variant="ghost" onClick={handleCertificate} disabled={issuingCert} className="text-primary hover:bg-primary/10">
             {issuingCert ? <Loader /> : <><FileCheck className="mr-2" size={18}/> Emitir Certificado</>}
           </Button>
        </header>
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar Modules */}
          <aside className="w-80 border-r bg-secondary/10 overflow-y-auto hidden md:block">
            {modules.map((mod) => (
              <div key={mod.id} className="mb-2">
                <div className="px-4 py-3 font-semibold bg-secondary/30 text-sm">{mod.title}</div>
                <div>
                  {mod.lessons.map((lesson: any) => (
                    <button
                      key={lesson.id}
                      onClick={() => setActiveLesson(lesson)}
                      className={`w-full text-left px-4 py-3 text-sm flex items-center gap-2 hover:bg-secondary/20 transition-colors border-l-2 ${activeLesson?.id === lesson.id ? 'bg-primary/10 text-primary border-primary' : 'border-transparent'}`}
                    >
                      <PlayCircle size={14} /> {lesson.title}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </aside>
          
          {/* Main Content */}
          <main className="flex-1 bg-background overflow-y-auto p-4 md:p-8">
            {activeLesson ? (
              <div className="max-w-4xl mx-auto space-y-6">
                <div className="aspect-video bg-black rounded-lg overflow-hidden shadow-xl">
                  {activeLesson.video_url ? (
                    <ReactPlayer url={activeLesson.video_url} width="100%" height="100%" controls />
                  ) : (
                    <div className="flex items-center justify-center h-full text-white bg-slate-900">
                        <div className="text-center">
                            <Lock className="mx-auto mb-2 opacity-50" />
                            <p>Conteúdo de Texto/Leitura</p>
                        </div>
                    </div>
                  )}
                </div>
                
                <div className="flex items-start justify-between">
                    <div>
                        <h2 className="text-2xl font-bold mb-2">{activeLesson.title}</h2>
                        <div className="prose dark:prose-invert max-w-none text-muted-foreground">
                            {activeLesson.content || "Sem descrição adicional."}
                        </div>
                    </div>
                </div>

                <div className="border-t pt-6 bg-secondary/10 p-4 rounded-lg">
                   <h3 className="font-bold mb-4 flex items-center gap-2"><CheckCircle size={18}/> Dúvidas & Comentários</h3>
                   <div className="text-center py-8 text-muted-foreground border-dashed border-2 rounded">
                       Funcionalidade de Tickets disponível na próxima atualização.
                   </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground flex-col gap-4">
                  <PlayCircle size={48} className="opacity-20"/>
                  <p>Selecione uma aula para começar.</p>
              </div>
            )}
          </main>
        </div>
      </div>
    );
  }

  // --- Dashboard / My Courses View ---
  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Meus Cursos</h1>
        <div className="flex gap-2">
           <Button variant="outline" onClick={() => setShowProfile(true)}>
             <User size={18} className="mr-2"/> Minha Conta
           </Button>
           <Button variant="ghost" onClick={signOut} className="text-destructive hover:bg-destructive/10">
             <LogOut size={18} className="mr-2"/> Sair
           </Button>
        </div>
      </div>

      {courses.length === 0 ? (
        <div className="text-center py-20 bg-secondary/20 rounded-lg">
          <p className="text-muted-foreground text-lg mb-4">Você ainda não possui cursos matriculados.</p>
          <Button variant="outline">Ver Catálogo</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {courses.map(course => (
            <Card key={course.id} className="overflow-hidden hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer group" >
              <div className="h-40 bg-gray-200 relative overflow-hidden">
                {course.thumbnail_url ? (
                    <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-2xl">
                        {course.title.substring(0,2).toUpperCase()}
                    </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-bold text-lg mb-2 truncate">{course.title}</h3>
                <Button className="w-full" onClick={() => loadCourseContent(course)}>Acessar Curso</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
      
      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
    </div>
  );
}