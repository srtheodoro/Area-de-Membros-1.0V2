import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { supabase, isConfigured } from './lib/supabase';
import { Button, Input, Card } from './components/ui';
import AdminDashboard from './pages/Admin';
import StudentArea from './pages/Student';
import LandingPage from './pages/Landing';
import { BookOpen, AlertTriangle } from 'lucide-react';

// --- Simple Auth Page (Styled) ---
function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [msg, setMsg] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfigured) {
      setMsg("Erro: Backend não configurado.");
      return;
    }
    setLoading(true);
    setMsg('');
    
    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMsg(error.message);
    } else {
      const { error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: { data: { full_name: email.split('@')[0] } } 
      });
      if (error) setMsg(error.message);
      else setMsg('Verifique seu e-mail para confirmar!');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-50 to-indigo-100 -z-10"></div>
      <div className="absolute -top-20 -right-20 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>

      <Card className="w-full max-w-md p-8 shadow-2xl glass border-t-4 border-t-primary">
        <div className="text-center mb-8">
           <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-full mb-4">
             <BookOpen className="text-primary h-8 w-8" />
           </div>
           <h1 className="text-2xl font-bold">{isLogin ? 'Bem-vindo de volta' : 'Criar nova conta'}</h1>
           <p className="text-sm text-muted-foreground mt-2">Acesse sua área de aprendizado</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-5">
          <div>
            <label className="text-sm font-medium mb-1.5 block">E-mail</label>
            <Input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="bg-white/50" placeholder="seu@email.com" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Senha</label>
            <Input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="bg-white/50" placeholder="••••••••" />
          </div>
          {msg && <p className="text-red-500 text-sm text-center bg-red-50 p-2 rounded border border-red-100">{msg}</p>}
          <Button type="submit" className="w-full h-11 text-base shadow-lg shadow-blue-500/20" disabled={loading}>
            {loading ? 'Processando...' : (isLogin ? 'Entrar na Plataforma' : 'Cadastrar-se Gratuitamente')}
          </Button>
        </form>
        <div className="mt-6 text-center pt-4 border-t border-dashed">
          <button onClick={() => setIsLogin(!isLogin)} className="text-sm text-primary hover:underline font-medium">
            {isLogin ? 'Não tem conta? Crie agora' : 'Já tem conta? Faça login'}
          </button>
        </div>
      </Card>
    </div>
  );
}

// --- Protected Route Wrapper ---
const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session, loading } = useAuth();
  if (loading) return <div className="flex h-screen items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  return session ? <>{children}</> : <Navigate to="/auth" />;
};

// --- Error Boundary ---
interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  
  static getDerivedStateFromError(error: Error): ErrorBoundaryState { 
    return { hasError: true, error }; 
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-red-50 p-4 text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Ops! Algo deu errado.</h1>
          <p className="text-red-800 mb-4">Ocorreu um erro inesperado na aplicação.</p>
          <div className="bg-white p-4 rounded shadow text-left text-xs font-mono text-red-500 overflow-auto max-w-2xl w-full mb-4 border border-red-200">
            {this.state.error?.toString()}
          </div>
          <Button onClick={() => window.location.href = '/'} className="bg-red-600 hover:bg-red-700 text-white">
            Tentar Novamente
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- Dynamic Theme Loader ---
function ThemeLoader() {
  useEffect(() => {
    if (isConfigured) {
      supabase.from('theme_settings').select('*').single().then(({ data }) => {
        if (data) {
          document.documentElement.style.setProperty('--primary', data.primary_color);
        }
      });
    }
  }, []);
  return null;
}

// --- Setup Screen for Missing Env Vars ---
function SetupScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-100 p-8 text-center">
      <div className="bg-white p-8 rounded-xl shadow-xl max-w-lg w-full">
        <AlertTriangle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Configuração Pendente</h1>
        <p className="text-slate-600 mb-6">
          As variáveis de ambiente do <strong>Supabase</strong> não foram detectadas. A aplicação precisa delas para funcionar.
        </p>
        <div className="text-left bg-slate-900 text-slate-200 p-4 rounded-lg font-mono text-xs mb-6 overflow-x-auto">
          <p className="text-green-400"># Adicione ao seu .env</p>
          <p>VITE_SUPABASE_URL=...</p>
          <p>VITE_SUPABASE_ANON_KEY=...</p>
        </div>
        <Button onClick={() => window.location.reload()}>Verificar Novamente</Button>
      </div>
    </div>
  );
}

export default function App() {
  // Verificação inicial de configuração
  if (!isConfigured) {
    return <SetupScreen />;
  }

  return (
    <ErrorBoundary>
      {/* Test Indicator as requested */}
      <div className="fixed top-0 left-0 bg-green-500 text-white text-[10px] px-2 py-1 z-[9999] font-bold">
        APP CARREGOU
      </div>
      
      <ThemeLoader />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth" element={<AuthPage />} />
            
            <Route path="/admin/*" element={<PrivateRoute><AdminDashboard /></PrivateRoute>} />
            <Route path="/student/*" element={<PrivateRoute><StudentArea /></PrivateRoute>} />
            
            {/* Fallback for legacy routes or 404 */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}