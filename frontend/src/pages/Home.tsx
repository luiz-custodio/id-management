import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Shield, ArrowRight, Users, Zap, CheckCircle } from 'lucide-react';

export default function Home() {
  const features = [
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Organização Automática",
      description: "Sistema inteligente de organização de documentos com estrutura padronizada"
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "Gestão de Empresas", 
      description: "Gerencie múltiplas empresas e unidades de forma centralizada"
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Interface Moderna",
      description: "Dashboard responsivo com design moderno e intuitivo"
    },
    {
      icon: <CheckCircle className="w-6 h-6" />,
      title: "Validação Inteligente",
      description: "Detecção automática do tipo de documento e validação de nomenclatura"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="container mx-auto px-6 py-8">
        <nav className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="w-8 h-8 text-blue-600" />
            <span className="text-xl font-bold text-gray-900">ID Manager</span>
          </div>
          <div className="hidden md:flex items-center space-x-6">
            <a href="#features" className="text-gray-600 hover:text-blue-600 transition-colors">
              Funcionalidades
            </a>
            <Link to="/importar" className="text-gray-600 hover:text-blue-600 transition-colors">
              Importar
            </Link>
            <Link to="/teste" className="text-gray-600 hover:text-blue-600 transition-colors">
              Teste
            </Link>
            <Link to="/login">
              <Button className="gradient-primary text-white">
                Login
              </Button>
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-16 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Sistema de
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {" "}Gerenciamento de IDs
            </span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Organizador automático de documentos com numeração padronizada e estrutura de pastas espelho.
            Simplifique sua gestão documental com inteligência artificial.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/dashboard">
              <Button size="lg" className="gradient-primary text-white group">
                Começar Agora
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="border-2 border-blue-200">
              Ver Demonstração
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Funcionalidades Principais
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Descubra como nosso sistema pode transformar sua gestão documental
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-white p-6 rounded-xl shadow-lg hover-lift border border-gray-100"
            >
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 text-blue-600">
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-blue-600 text-white py-16">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold mb-2">100%</div>
              <div className="text-blue-100">Automatização</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">50+</div>
              <div className="text-blue-100">Tipos de Documento</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">24/7</div>
              <div className="text-blue-100">Disponibilidade</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-6 py-16 text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
            Pronto para Organizar seus Documentos?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Comece hoje mesmo e veja como nosso sistema pode transformar sua gestão documental
          </p>
          
          {/* Menu de Navegação Rápida */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Link to="/dashboard">
              <Button size="lg" className="w-full gradient-primary text-white">
                📊 Dashboard
              </Button>
            </Link>
            <Link to="/importar">
              <Button size="lg" variant="outline" className="w-full border-2 border-blue-200">
                📁 Importar Arquivos
              </Button>
            </Link>
            <Link to="/teste">
              <Button size="lg" variant="outline" className="w-full border-2 border-green-200">
                🧪 Teste Integração
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="w-full border-2 border-purple-200">
                🔐 Login
              </Button>
            </Link>
          </div>
          
          <Link to="/dashboard">
            <Button size="lg" className="gradient-primary text-white">
              Iniciar Teste Gratuito
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Shield className="w-6 h-6" />
                <span className="text-lg font-bold">ID Manager</span>
              </div>
              <p className="text-gray-400">
                Sistema completo para organização automática de documentos
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Produto</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Funcionalidades</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Preços</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Documentação</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Empresa</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Sobre</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contato</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Suporte</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Documentação</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Suporte</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contato</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 ID Manager. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
