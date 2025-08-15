/* filepath: c:\Users\User\Documents\PROJETOS\id-management\src\app\page.tsx */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  ArrowRight, 
  Shield, 
  Users, 
  Zap, 
  CheckCircle,
  Github,
  Twitter,
  Linkedin
} from 'lucide-react';

export default function Home() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const features = [
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Segurança Avançada",
      description: "Autenticação robusta com criptografia de ponta a ponta"
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "Gestão Completa",
      description: "Controle total sobre usuários e permissões"
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Performance",
      description: "Sistema otimizado para resposta instantânea"
    }
  ];

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 glass-card">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center space-x-2"
            >
              <Shield className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              <span className="text-xl font-bold bg-clip-text text-transparent gradient-primary">
                ID Management
              </span>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center space-x-4"
            >
              <Link href="/login">
                <Button variant="ghost" className="hidden sm:inline-flex">
                  Entrar
                </Button>
              </Link>
              <Link href="/register">
                <Button className="gradient-primary text-white">
                  Começar Agora
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-7xl">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
              <span className="bg-clip-text text-transparent gradient-primary">
                Gestão de Identidade
              </span>
              <br />
              <span className="text-gray-900 dark:text-white">
                Simples e Segura
              </span>
            </h1>
            
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
              Controle completo sobre autenticação e autorização. 
              Proteja seus dados com a solução mais moderna do mercado.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register">
                <Button size="lg" className="gradient-primary text-white hover-lift">
                  Criar Conta Grátis
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button size="lg" variant="outline" className="hover-lift">
                  Ver Demo
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Hero Image/Illustration */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="mt-16 relative"
          >
            <div className="absolute inset-0 gradient-primary opacity-10 blur-3xl rounded-full"></div>
            <Card className="glass-card p-8 hover-lift">
              <div className="aspect-video bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 rounded-lg flex items-center justify-center">
                <Shield className="w-32 h-32 text-blue-600 dark:text-blue-400 animate-float" />
              </div>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-900/50">
        <div className="container mx-auto max-w-7xl">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Por que escolher nossa plataforma?
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Recursos pensados para simplificar sua gestão
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="glass-card p-6 hover-lift h-full">
                  <div className="w-12 h-12 rounded-lg gradient-primary flex items-center justify-center text-white mb-4">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    {feature.description}
                  </p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="glass-card p-12 rounded-2xl"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Pronto para começar?
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
              Junte-se a milhares de empresas que já confiam em nossa solução
            </p>
            <Link href="/register">
              <Button size="lg" className="gradient-primary text-white hover-lift">
                Criar Conta Agora
                <CheckCircle className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-gray-200 dark:border-gray-700">
        <div className="container mx-auto max-w-7xl">
          <div className="flex flex-col sm:flex-row justify-between items-center">
            <div className="mb-4 sm:mb-0">
              <p className="text-gray-600 dark:text-gray-300">
                © 2024 ID Management. Todos os direitos reservados.
              </p>
            </div>
            <div className="flex space-x-4">
              <Button variant="ghost" size="icon">
                <Github className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon">
                <Twitter className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon">
                <Linkedin className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}