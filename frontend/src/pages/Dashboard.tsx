import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart3,
  Users,
  Shield,
  Activity,
  Settings,
  LogOut,
  Bell,
  Search,
  Menu,
  X,
  TrendingUp,
  TrendingDown,
  Calendar,
  Download
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user] = useState({ name: 'João Silva', email: 'joao@example.com' });
  const navigate = useNavigate();

  const stats = [
    {
      title: 'Total de Usuários',
      value: '2,543',
      change: '+12%',
      trend: 'up',
      icon: <Users className="w-5 h-5" />,
      color: 'blue'
    },
    {
      title: 'Usuários Ativos',
      value: '1,893',
      change: '+5%',
      trend: 'up',
      icon: <Activity className="w-5 h-5" />,
      color: 'green'
    },
    {
      title: 'Taxa de Segurança',
      value: '98.5%',
      change: '+2%',
      trend: 'up',
      icon: <Shield className="w-5 h-5" />,
      color: 'purple'
    },
    {
      title: 'Relatórios',
      value: '145',
      change: '-3%',
      trend: 'down',
      icon: <BarChart3 className="w-5 h-5" />,
      color: 'orange'
    }
  ];

  const recentActivities = [
    { id: 1, user: 'Maria Santos', action: 'Login realizado', time: '2 minutos atrás' },
    { id: 2, user: 'Pedro Costa', action: 'Perfil atualizado', time: '15 minutos atrás' },
    { id: 3, user: 'Ana Lima', action: 'Senha alterada', time: '1 hora atrás' },
    { id: 4, user: 'Carlos Souza', action: 'Novo usuário criado', time: '2 horas atrás' },
  ];

  const handleLogout = () => {
    // Implement logout logic
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0 lg:static lg:inset-0`}>
        <div className="h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-2">
              <Shield className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              <span className="text-xl font-bold">ID Manager</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden"
              aria-label="Fechar sidebar"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <nav className="p-4 space-y-2">
            <Link to="/dashboard">
              <Button variant="ghost" className="w-full justify-start gradient-primary text-white">
                <BarChart3 className="mr-3 h-4 w-4" />
                Dashboard
              </Button>
            </Link>
            <Link to="/profile">
              <Button variant="ghost" className="w-full justify-start">
                <Users className="mr-3 h-4 w-4" />
                Perfil
              </Button>
            </Link>
            <Button variant="ghost" className="w-full justify-start">
              <Shield className="mr-3 h-4 w-4" />
              Segurança
            </Button>
            <Button variant="ghost" className="w-full justify-start">
              <Settings className="mr-3 h-4 w-4" />
              Configurações
            </Button>
          </nav>

          <div className="absolute bottom-0 w-full p-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              variant="ghost"
              className="w-full justify-start text-red-600 dark:text-red-400"
              onClick={handleLogout}
            >
              <LogOut className="mr-3 h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:ml-64">
        {/* Top Bar */}
        <header className="sticky top-0 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden"
                aria-label="Abrir menu"
              >
                <Menu className="w-6 h-6" />
              </button>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Buscar..."
                  className="pl-10 pr-4 py-2 border rounded-lg bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
              </Button>
              <Avatar>
                <AvatarImage src="/avatar.jpg" />
                <AvatarFallback>JS</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="p-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Welcome Section */}
            <div>
              <h1 className="text-3xl font-bold">Olá, {user.name}! 👋</h1>
              <p className="text-gray-600 dark:text-gray-300 mt-1">
                Aqui está um resumo da sua plataforma hoje
              </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {stats.map((stat, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="hover-lift">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
                        {stat.title}
                      </CardTitle>
                      <div className={`p-2 rounded-lg bg-${stat.color}-100 dark:bg-${stat.color}-900/20`}>
                        {stat.icon}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stat.value}</div>
                      <div className="flex items-center mt-2">
                        {stat.trend === 'up' ? (
                          <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                        )}
                        <span className={`text-sm ${
                          stat.trend === 'up' ? 'text-green-500' : 'text-red-500'
                        }`}>
                          {stat.change}
                        </span>
                        <span className="text-sm text-gray-500 ml-1">vs último mês</span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Main Content Tabs */}
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList className="glass-card">
                <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
                <TabsTrigger value="reports">Relatórios</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Activity Chart */}
                  <Card className="glass-card">
                    <CardHeader>
                      <CardTitle>Atividade Mensal</CardTitle>
                      <CardDescription>Visualização dos últimos 30 dias</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64 flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <BarChart3 className="w-16 h-16 text-gray-400" />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Recent Activities */}
                  <Card className="glass-card">
                    <CardHeader>
                      <CardTitle>Atividades Recentes</CardTitle>
                      <CardDescription>Últimas ações dos usuários</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {recentActivities.map((activity) => (
                          <div key={activity.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                            <div className="flex items-center space-x-3">
                              <Avatar className="w-8 h-8">
                                <AvatarFallback>{activity.user.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-sm font-medium">{activity.user}</p>
                                <p className="text-xs text-gray-500">{activity.action}</p>
                              </div>
                            </div>
                            <span className="text-xs text-gray-500">{activity.time}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Progress Section */}
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle>Metas do Mês</CardTitle>
                    <CardDescription>Progresso das metas estabelecidas</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm">Novos Usuários</span>
                        <span className="text-sm font-medium">75%</span>
                      </div>
                      <Progress value={75} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm">Taxa de Retenção</span>
                        <span className="text-sm font-medium">92%</span>
                      </div>
                      <Progress value={92} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm">Satisfação</span>
                        <span className="text-sm font-medium">88%</span>
                      </div>
                      <Progress value={88} className="h-2" />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="analytics">
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle>Analytics</CardTitle>
                    <CardDescription>Análise detalhada de dados</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-96 flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-gray-500">Gráficos de analytics aqui</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="reports">
                <Card className="glass-card">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Relatórios</CardTitle>
                      <CardDescription>Relatórios disponíveis para download</CardDescription>
                    </div>
                    <Button className="gradient-primary text-white">
                      <Download className="mr-2 h-4 w-4" />
                      Exportar
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                          <div className="flex items-center space-x-3">
                            <Calendar className="w-5 h-5 text-gray-400" />
                            <div>
                              <p className="font-medium">Relatório Mensal - {['Janeiro', 'Fevereiro', 'Março'][i-1]} 2024</p>
                              <p className="text-sm text-gray-500">Gerado em {15 - i * 3}/03/2024</p>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm">
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </motion.div>
        </main>
      </div>
    </div>
  );
}