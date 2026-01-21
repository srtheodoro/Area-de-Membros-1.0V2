import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card } from '../components/ui';
import { 
  Shield, BookOpen, Award, PlayCircle, LogIn, ArrowRight, 
  CheckCircle2, Star, Zap, Globe, Users, HelpCircle 
} from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-50 selection:bg-primary/20">
      
      {/* --- Navbar --- */}
      <header className="fixed top-0 w-full z-50 glass border-b border-white/20 transition-all duration-300">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight text-slate-900 cursor-pointer" onClick={() => window.scrollTo(0,0)}>
            <div className="bg-primary/10 p-1.5 rounded-lg">
              <BookOpen className="text-primary h-5 w-5" />
            </div>
            <span>EAD Platform<span className="text-primary">Pro</span></span>
          </div>
          <div className="flex gap-4 items-center">
            <button className="hidden md:block text-sm font-medium text-slate-600 hover:text-primary transition-colors">Recursos</button>
            <button className="hidden md:block text-sm font-medium text-slate-600 hover:text-primary transition-colors">Planos</button>
            <div className="h-4 w-px bg-slate-200 hidden md:block"></div>
            <Button variant="ghost" onClick={() => navigate('/auth')} className="font-semibold">Entrar</Button>
            <Button onClick={() => navigate('/auth')} className="shadow-lg shadow-primary/20">Começar Agora</Button>
          </div>
        </div>
      </header>

      {/* --- Hero Section --- */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        {/* Abstract Background Shapes */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-primary/5 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 right-0 w-[800px] h-[600px] bg-purple-500/5 rounded-full blur-3xl -z-10" />

        <div className="container mx-auto flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
          <div className="lg:w-1/2 space-y-8 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-sm font-semibold tracking-wide animate-in fade-in slide-in-from-bottom-4 duration-700">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              Nova versão 2.0 disponível
            </div>
            
            <h1 className="text-5xl lg:text-7xl font-extrabold leading-[1.1] text-slate-900 tracking-tight">
              Sua Escola Online <br/>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600">
                Profissional & Escalável
              </span>
            </h1>
            
            <p className="text-xl text-slate-600 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              Transforme conhecimento em negócio. Uma plataforma LMS completa com área de membros, gestão de certificados e pagamentos integrados.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-4">
              <Button size="lg" className="h-14 px-8 text-lg rounded-full gap-2 shadow-xl shadow-blue-600/20 hover:scale-105 transition-transform" onClick={() => navigate('/auth')}>
                Criar Conta Grátis <ArrowRight size={20} />
              </Button>
              <Button size="lg" variant="outline" className="h-14 px-8 text-lg rounded-full gap-2 bg-white/50 backdrop-blur-sm hover:bg-white transition-all">
                <PlayCircle size={20} /> Ver Demonstração
              </Button>
            </div>

            <div className="pt-8 flex items-center justify-center lg:justify-start gap-4 text-sm text-slate-500">
              <div className="flex -space-x-2">
                 {[1,2,3,4].map(i => (
                   <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center overflow-hidden">
                     <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`} alt="User" />
                   </div>
                 ))}
              </div>
              <p>Mais de <span className="font-bold text-slate-700">1.000+</span> alunos ativos hoje.</p>
            </div>
          </div>

          <div className="lg:w-1/2 relative lg:h-[600px] w-full flex items-center justify-center perspective-1000">
             <div className="relative w-full max-w-lg aspect-square lg:aspect-auto lg:h-full bg-gradient-to-tr from-slate-100 to-white rounded-2xl shadow-2xl border border-white/50 p-2 transform rotate-y-12 rotate-x-6 hover:rotate-0 transition-all duration-700 ease-out">
                <img 
                  src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=2070&auto=format&fit=crop" 
                  alt="Dashboard Platform" 
                  className="w-full h-full object-cover rounded-xl shadow-inner opacity-90"
                />
                
                {/* Floating Cards */}
                <div className="absolute -left-12 bottom-20 bg-white p-4 rounded-xl shadow-xl border border-slate-100 animate-bounce delay-700">
                  <div className="flex items-center gap-3">
                    <div className="bg-green-100 p-2 rounded-full">
                      <CheckCircle2 className="text-green-600 h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase font-bold">Status</p>
                      <p className="font-bold text-slate-800">Certificado Emitido</p>
                    </div>
                  </div>
                </div>

                <div className="absolute -right-8 top-20 bg-white p-4 rounded-xl shadow-xl border border-slate-100 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-100 p-2 rounded-full">
                      <Users className="text-blue-600 h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase font-bold">Alunos</p>
                      <p className="font-bold text-slate-800">+12 Novos hoje</p>
                    </div>
                  </div>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* --- Brands / Social Proof --- */}
      <section className="py-10 border-y bg-white/50">
        <div className="container mx-auto px-6 text-center">
           <p className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-6">Empresas que confiam na nossa tecnologia</p>
           <div className="flex flex-wrap justify-center items-center gap-12 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
              {['Acme Corp', 'Global Learn', 'TechEdu', 'Future Skills', 'UniOnline'].map((brand) => (
                <span key={brand} className="text-xl font-bold font-serif text-slate-800">{brand}</span>
              ))}
           </div>
        </div>
      </section>

      {/* --- Features Grid --- */}
      <section className="py-24 bg-slate-50 relative">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-base text-primary font-semibold tracking-wide uppercase mb-2">Tudo o que você precisa</h2>
            <h3 className="text-4xl font-extrabold text-slate-900 mb-4">Recursos poderosos para criadores</h3>
            <p className="text-lg text-slate-600">Não desperdice tempo com configurações técnicas complexas. Focamos na infraestrutura para você focar no conteúdo.</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Shield />} 
              title="Segurança Militar" 
              desc="Seus vídeos e dados protegidos com criptografia de ponta e controle de acesso rigoroso."
              color="text-blue-600 bg-blue-50"
            />
            <FeatureCard 
              icon={<Award />} 
              title="Certificados Automáticos" 
              desc="Emissão instantânea de certificados com validação via QR Code para LinkedIn."
              color="text-purple-600 bg-purple-50"
            />
            <FeatureCard 
              icon={<PlayCircle />} 
              title="Player Otimizado" 
              desc="Experiência estilo Netflix. Retomada automática, controle de velocidade e qualidade adaptativa."
              color="text-red-600 bg-red-50"
            />
            <FeatureCard 
              icon={<Zap />} 
              title="Alta Performance" 
              desc="Carregamento instantâneo das páginas. Backend Node.js otimizado para escala."
              color="text-yellow-600 bg-yellow-50"
            />
             <FeatureCard 
              icon={<Globe />} 
              title="Domínio Próprio" 
              desc="Use seu próprio domínio (www.suaescola.com) e remova nossa marca com o White-label."
              color="text-indigo-600 bg-indigo-50"
            />
             <FeatureCard 
              icon={<Users />} 
              title="Gestão de Alunos" 
              desc="Controle matrículas, validade de acesso e progresso individual em um painel intuitivo."
              color="text-green-600 bg-green-50"
            />
          </div>
        </div>
      </section>

      {/* --- Pricing (Fake/Demo) --- */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-6">
           <div className="text-center mb-16">
             <h2 className="text-4xl font-extrabold text-slate-900">Planos Simples e Transparentes</h2>
             <p className="mt-4 text-lg text-slate-600">Comece grátis e escale conforme seu negócio cresce.</p>
           </div>

           <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              <PricingCard 
                 title="Starter" 
                 price="R$ 0" 
                 features={['Até 50 alunos', '1 Curso', 'Certificados Básicos', 'Suporte por E-mail']} 
              />
              <PricingCard 
                 title="Pro" 
                 price="R$ 97" 
                 popular 
                 features={['Alunos Ilimitados', '10 Cursos', 'Certificados Personalizados', 'Domínio Próprio', 'Suporte Prioritário']} 
              />
              <PricingCard 
                 title="Enterprise" 
                 price="Consultar" 
                 features={['API Dedicada', 'White-label Total', 'SSO Corporativo', 'SLA de 99.9%', 'Gerente de Contas']} 
              />
           </div>
        </div>
      </section>

      {/* --- CTA Final --- */}
      <section className="py-24 px-6">
        <div className="container mx-auto">
          <div className="bg-primary rounded-3xl p-12 md:p-20 text-center relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
             
             <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 relative z-10">Pronto para lançar sua escola?</h2>
             <p className="text-blue-100 text-lg mb-8 max-w-2xl mx-auto relative z-10">Junte-se a milhares de criadores que estão monetizando seu conhecimento hoje mesmo.</p>
             
             <div className="relative z-10">
               <Button size="lg" variant="secondary" className="h-14 px-10 text-lg font-bold shadow-2xl" onClick={() => navigate('/auth')}>
                 Começar Agora Gratuitamente
               </Button>
               <p className="text-blue-200 text-sm mt-4">Nenhum cartão de crédito necessário.</p>
             </div>
          </div>
        </div>
      </section>

      {/* --- Footer --- */}
      <footer className="bg-slate-900 text-slate-300 py-12 border-t border-slate-800">
        <div className="container mx-auto px-6 grid md:grid-cols-4 gap-8">
           <div className="space-y-4">
              <div className="flex items-center gap-2 font-bold text-xl text-white">
                <BookOpen className="text-blue-500 h-6 w-6" />
                <span>EAD Platform Pro</span>
              </div>
              <p className="text-sm text-slate-400">
                A infraestrutura completa para o seu negócio de educação digital.
              </p>
           </div>
           
           <div>
             <h4 className="font-bold text-white mb-4">Produto</h4>
             <ul className="space-y-2 text-sm">
               <li><a href="#" className="hover:text-blue-400">Recursos</a></li>
               <li><a href="#" className="hover:text-blue-400">Preços</a></li>
               <li><a href="#" className="hover:text-blue-400">Showcase</a></li>
             </ul>
           </div>

           <div>
             <h4 className="font-bold text-white mb-4">Empresa</h4>
             <ul className="space-y-2 text-sm">
               <li><a href="#" className="hover:text-blue-400">Sobre nós</a></li>
               <li><a href="#" className="hover:text-blue-400">Blog</a></li>
               <li><a href="#" className="hover:text-blue-400">Carreiras</a></li>
             </ul>
           </div>

           <div>
             <h4 className="font-bold text-white mb-4">Legal</h4>
             <ul className="space-y-2 text-sm">
               <li><a href="#" className="hover:text-blue-400">Privacidade</a></li>
               <li><a href="#" className="hover:text-blue-400">Termos de Uso</a></li>
             </ul>
           </div>
        </div>
        <div className="container mx-auto px-6 mt-12 pt-8 border-t border-slate-800 text-center text-sm text-slate-500">
          &copy; 2024 EAD Platform Pro. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
}

// --- Components Helpers ---

function FeatureCard({ icon, title, desc, color }: { icon: React.ReactNode, title: string, desc: string, color?: string }) {
  return (
    <div className="group p-8 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
      <div className={`mb-6 p-4 rounded-xl inline-block ${color || 'bg-slate-100 text-slate-600'} transition-transform group-hover:scale-110`}>
        {React.cloneElement(icon as React.ReactElement, { size: 28 })}
      </div>
      <h3 className="text-xl font-bold mb-3 text-slate-800">{title}</h3>
      <p className="text-slate-600 leading-relaxed">{desc}</p>
    </div>
  );
}

function PricingCard({ title, price, features, popular }: { title: string, price: string, features: string[], popular?: boolean }) {
  return (
    <div className={`relative p-8 rounded-2xl bg-white border ${popular ? 'border-primary shadow-2xl scale-105 z-10' : 'border-slate-200 shadow-lg'} flex flex-col`}>
      {popular && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
          Mais Popular
        </div>
      )}
      <div className="text-center mb-8">
         <h3 className="text-lg font-bold text-slate-500 uppercase tracking-widest">{title}</h3>
         <div className="text-4xl font-extrabold text-slate-900 mt-2">{price}<span className="text-lg font-normal text-slate-400">/mês</span></div>
      </div>
      
      <ul className="space-y-4 mb-8 flex-1">
        {features.map((feat, idx) => (
          <li key={idx} className="flex items-center gap-3 text-slate-600 text-sm">
             <CheckCircle2 className="text-green-500 h-5 w-5 shrink-0" />
             {feat}
          </li>
        ))}
      </ul>
      
      <Button variant={popular ? 'primary' : 'outline'} className="w-full">
        Escolher {title}
      </Button>
    </div>
  );
}