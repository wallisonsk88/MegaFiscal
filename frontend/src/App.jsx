import React, { useState } from 'react';
import { UploadZone } from './components/UploadZone';
import { Dashboard } from './components/Dashboard';
import { FiscalAnalysis } from './components/FiscalAnalysis';
import { LayoutDashboard, FileUp, PieChart } from 'lucide-react';
import { cn } from './lib/utils';

function App() {
  const [activeTab, setActiveTab] = useState('upload'); // 'dashboard', 'upload', 'analysis'

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col fixed h-full z-10">
        <div className="p-6 border-b border-gray-100">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            MegaFiscal
          </h1>
          <p className="text-xs text-gray-500 mt-1">Gestão Inteligente</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <SidebarItem
            icon={<LayoutDashboard size={20} />}
            label="Visão Geral"
            active={activeTab === 'dashboard'}
            onClick={() => setActiveTab('dashboard')}
          />
          <SidebarItem
            icon={<FileUp size={20} />}
            label="Importar Notas"
            active={activeTab === 'upload'}
            onClick={() => setActiveTab('upload')}
          />
          <SidebarItem
            icon={<PieChart size={20} />}
            label="Análise Fiscal"
            active={activeTab === 'analysis'}
            onClick={() => setActiveTab('analysis')}
          />
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
              A
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate">Admin User</p>
              <p className="text-xs text-gray-500 truncate">Farmácia Central</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 p-8">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800">
            {activeTab === 'dashboard' && 'Visão Geral'}
            {activeTab === 'upload' && 'Importação de Documentos'}
            {activeTab === 'analysis' && 'Análise Fiscal & CEST'}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {activeTab === 'dashboard' && 'Acompanhe seus indicadores financeiros e fiscais.'}
            {activeTab === 'upload' && 'Envie seus arquivos XML para processamento automático.'}
            {activeTab === 'analysis' && 'Verifique inconsistências e oportunidades de economia.'}
          </p>
        </header>

        <div className="max-w-6xl mx-auto">
          {activeTab === 'upload' && <UploadZone />}

          {activeTab === 'dashboard' && <Dashboard />}

          {activeTab === 'analysis' && <FiscalAnalysis />}
        </div>
      </main>
    </div>
  );
}

function SidebarItem({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
        active
          ? "bg-primary/10 text-primary"
          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
      )}
    >
      {icon}
      {label}
    </button>
  )
}

export default App;
