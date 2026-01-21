import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { supabase } from './lib/supabase';
import { Button, Input, Card } from './components/ui';
import AdminDashboard from './pages/Admin';
import StudentArea from './pages/Student';

// --- Simple Auth Page ---
function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [msg, setMsg] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
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
    <div className="min-h-screen flex items-center justify-center bg-secondary/30 p-4">
      <Card className="w-full max-w-md p-8 shadow-xl">
        <h1 className="text-2xl font-bold text-center mb-6">{isLogin ? 'Bem-vindo de volta' : 'Criar Conta'}</h1>
        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="text-sm font-medium">E-mail</label>
            <Input type="email" required value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">Senha</label>
            <Input type="password" required value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          {msg && <p className="text-red-500 text-sm text-center">{msg}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Processando...' : (isLogin ? 'Entrar' : 'Cadastrar')}
          </Button>
        </form>
        <div className="mt-4 text-center">
          <button onClick={() => setIsLogin(!isLogin)} className="text-sm text-primary hover:underline">
            {isLogin ? 'Não tem conta? Crie agora' : 'Já tem conta? Faça login'}
          </button>
        </div>
      </Card>
    </div>
  );
}

// --- Protected Route Wrapper ---
const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, loading } = useAuth();
  if (loading) return <div>Carregando...</div>;
  return session ? <>{children}</> : <Navigate to="/auth" />;
};

// --- Error Boundary ---
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean}> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) return <div className="p-10 text-center"><h1>Algo deu errado.</h1><Button onClick={() => window.location.reload()} className="mt-4">Recarregar</Button></div>;
    return this.props.children;
  }
}

// --- Dynamic Theme Loader ---
function ThemeLoader() {
  useEffect(() => {
    supabase.from('platform_settings').select('*').single().then(({ data }) => {
      if (data) {
        document.documentElement.style.setProperty('--primary', data.primary_color);
        // We would convert hex to hsl here for full Tailwind compatibility 
        // For MVP, we assume hex is set to --primary
      }
    });
  }, []);
  return null;
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeLoader />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/admin/*" element={<PrivateRoute><AdminDashboard /></PrivateRoute>} />
            <Route path="/*" element={<PrivateRoute><StudentArea /></PrivateRoute>} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}