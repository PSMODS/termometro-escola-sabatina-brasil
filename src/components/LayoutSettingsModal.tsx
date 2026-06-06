/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LayoutConfig } from '../types';
import { LAYOUT_PRESETS } from '../lib/layout';
import { 
  X, Layout, Palette, Sliders, Type, 
  Maximize2, Eye, LayoutGrid, Sun, Moon, MonitorPlay 
} from 'lucide-react';

interface LayoutSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  layout: LayoutConfig;
  setLayout: (newLayout: Partial<LayoutConfig> | ((prev: LayoutConfig) => LayoutConfig)) => void;
}

export default function LayoutSettingsModal({
  isOpen,
  onClose,
  layout,
  setLayout
}: LayoutSettingsModalProps) {
  if (!isOpen) return null;

  const handleApplyPreset = (presetKey: 'compact' | 'standard' | 'stage') => {
    const selected = LAYOUT_PRESETS[presetKey];
    setLayout(selected);
  };

  const updateField = (key: keyof LayoutConfig, value: any) => {
    setLayout({ [key]: value });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity overflow-y-auto">
      <div 
        id="layout-modal-card"
        className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-8 max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/45">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 rounded-lg">
              <Layout size={18} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-white leading-none">Ajustes de Layout & Aparência</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Configure o tamanho, espaçamentos, temas e exibições do telão</p>
            </div>
          </div>
          <button 
            id="close-layout-modal"
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Presets Rápidos */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-1.5 uppercase tracking-wider font-mono">
              <Sliders size={15} className="text-purple-500" /> Presets de Exibição
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {/* Compact */}
              <button
                onClick={() => handleApplyPreset('compact')}
                className="p-3 bg-slate-50 dark:bg-slate-950/20 hover:bg-slate-100 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-left transition-all hover:scale-[1.01] cursor-pointer"
              >
                <span className="block text-xs font-bold text-slate-800 dark:text-white">Compacto</span>
                <span className="block text-[10px] text-slate-500 dark:text-slate-400 mt-1">Fontes menores, perfeito para monitores pequenos ou tablets.</span>
              </button>

              {/* Standard */}
              <button
                onClick={() => handleApplyPreset('standard')}
                className="p-3 bg-blue-50/50 dark:bg-blue-950/10 hover:bg-blue-100/40 dark:hover:bg-blue-900/25 border border-blue-105 dark:border-blue-900/60 rounded-xl text-left transition-all hover:scale-[1.01] cursor-pointer"
              >
                <span className="block text-xs font-bold text-blue-800 dark:text-blue-300">Padrão</span>
                <span className="block text-[10px] text-blue-600/70 dark:text-blue-400 mt-1">Excelente equilíbrio para uso diário em computadores.</span>
              </button>

              {/* Stage */}
              <button
                onClick={() => handleApplyPreset('stage')}
                className="p-3 bg-purple-50/50 dark:bg-purple-950/10 hover:bg-purple-100/40 dark:hover:bg-purple-900/25 border border-purple-105 dark:border-purple-900/60 rounded-xl text-left transition-all hover:scale-[1.01] cursor-pointer"
              >
                <span className="block text-xs font-bold text-purple-800 dark:text-purple-300">Palco (Projeção)</span>
                <span className="block text-[10px] text-purple-600/70 dark:text-purple-400 mt-1">Fontes massivas e contraste perfeito para projetores de telão.</span>
              </button>
            </div>
          </div>

          <hr className="border-slate-105 dark:border-slate-800" />

          {/* Temas Visuais */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-1.5 uppercase tracking-wider font-mono">
              <Palette size={15} className="text-purple-500" /> Tema de Acabamento
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {/* Light */}
              <button
                onClick={() => updateField('theme', 'light')}
                className={`p-3 border rounded-xl flex items-center justify-between transition-all cursor-pointer ${
                  layout.theme === 'light'
                    ? 'bg-amber-50 dark:bg-amber-950 border-amber-300 text-amber-850 dark:text-amber-100 shadow-xs'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                }`}
              >
                <span className="text-xs font-bold">Claro Elegante</span>
                <Sun size={16} className="text-amber-500" />
              </button>

              {/* Dark */}
              <button
                onClick={() => updateField('theme', 'dark')}
                className={`p-3 border rounded-xl flex items-center justify-between transition-all cursor-pointer ${
                  layout.theme === 'dark'
                    ? 'bg-indigo-50 dark:bg-indigo-955 border-indigo-300 text-indigo-850 dark:text-indigo-100 shadow-xs'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                }`}
              >
                <span className="text-xs font-bold">Escuro Moderno</span>
                <Moon size={16} className="text-indigo-500" />
              </button>

              {/* Stage (Neon/High Contrast) */}
              <button
                onClick={() => updateField('theme', 'stage')}
                className={`p-3 border rounded-xl flex items-center justify-between transition-all cursor-pointer ${
                  layout.theme === 'stage'
                    ? 'bg-purple-50 dark:bg-purple-955 border-purple-300 text-purple-850 dark:text-purple-100 shadow-xs'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                }`}
              >
                <span className="text-xs font-bold">Palco / Projetor</span>
                <MonitorPlay size={16} className="text-purple-500" />
              </button>
            </div>
          </div>

          <hr className="border-slate-105 dark:border-slate-800" />

          {/* Ajuste Fino de Tipografia e Dimensões */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-1.5 uppercase tracking-wider font-mono">
              <Type size={15} className="text-purple-500" /> Dimensões Físicas (Escalonamento)
            </h3>
            
            <div className="space-y-4 bg-slate-50 dark:bg-slate-950/20 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
              {/* Título */}
              <div className="space-y-1">
                <div className="flex justify-between font-medium">
                  <span className="text-slate-600 dark:text-slate-450">Tamanho do Título</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300 font-bold">{layout.titleSize}px</span>
                </div>
                <input
                  type="range"
                  min="18"
                  max="36"
                  value={layout.titleSize}
                  onChange={(e) => updateField('titleSize', Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
                />
              </div>

              {/* Texto descritivo */}
              <div className="space-y-1">
                <div className="flex justify-between font-medium">
                  <span className="text-slate-600 dark:text-slate-450">Tamanho das Legendas</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300 font-bold">{layout.textSize}px</span>
                </div>
                <input
                  type="range"
                  min="12"
                  max="24"
                  value={layout.textSize}
                  onChange={(e) => updateField('textSize', Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
                />
              </div>

              {/* Ícones */}
              <div className="space-y-1">
                <div className="flex justify-between font-medium">
                  <span className="text-slate-600 dark:text-slate-450">Tamanho dos Ícones</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300 font-bold">{layout.iconSize}px</span>
                </div>
                <input
                  type="range"
                  min="18"
                  max="36"
                  value={layout.iconSize}
                  onChange={(e) => updateField('iconSize', Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
                />
              </div>

              {/* Espaçamento Global */}
              <div className="space-y-1">
                <div className="flex justify-between font-medium">
                  <span className="text-slate-600 dark:text-slate-450">Escala de Espaçamento</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300 font-bold">{(layout.spacingScale * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="75"
                  max="125"
                  step="5"
                  value={layout.spacingScale * 100}
                  onChange={(e) => updateField('spacingScale', Number(e.target.value) / 100)}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
                />
              </div>

              {/* Largura Painel Esquerdo */}
              <div className="space-y-1">
                <div className="flex justify-between font-medium">
                  <span className="text-slate-600 dark:text-slate-450">Fração do Painel de Entrada</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300 font-bold">{layout.leftPanelWidth}%</span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="70"
                  value={layout.leftPanelWidth}
                  onChange={(e) => updateField('leftPanelWidth', Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
                />
              </div>

              {/* Escala do Rosto/Resultado */}
              <div className="space-y-1">
                <div className="flex justify-between font-medium">
                  <span className="text-slate-600 dark:text-slate-450">Escala das Faces do Termômetro</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300 font-bold">{(layout.resultScale * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="80"
                  max="120"
                  step="5"
                  value={layout.resultScale * 100}
                  onChange={(e) => updateField('resultScale', Number(e.target.value) / 100)}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
                />
              </div>
            </div>
          </div>

          <hr className="border-slate-105 dark:border-slate-800" />

          {/* Toggles de Visualização de Seções */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3.5 flex items-center gap-1.5 uppercase tracking-wider font-mono">
              <Eye size={15} className="text-purple-500" /> Toggles de Exibição Local
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 bg-slate-50 dark:bg-slate-950/20 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
              {/* Footer Summary */}
              <label className="flex items-center space-x-3 select-none cursor-pointer">
                <input
                  type="checkbox"
                  checked={layout.showFooterSummary}
                  onChange={(e) => updateField('showFooterSummary', e.target.checked)}
                  className="w-4.5 h-4.5 text-purple-600 rounded bg-slate-150 border-slate-300 focus:outline-hidden"
                />
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">Mostrar Resumo no Footer</span>
                  <span className="text-[10px] text-slate-400">Exibe uma fita compacta com dados consolidados abaixo.</span>
                </div>
              </label>

              {/* Show Presentation Cards */}
              <label className="flex items-center space-x-3 select-none cursor-pointer">
                <input
                  type="checkbox"
                  checked={layout.showPresentationCards}
                  onChange={(e) => updateField('showPresentationCards', e.target.checked)}
                  className="w-4.5 h-4.5 text-purple-600 rounded bg-slate-150 border-slate-300 focus:outline-hidden"
                />
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">Exibir Cards da Esquerda</span>
                  <span className="text-[10px] text-slate-400 font-medium">Mostra caixas descritivas de cada indicador de dados.</span>
                </div>
              </label>

              {/* Show Projects Slide */}
              <label className="flex items-center space-x-3 select-none cursor-pointer">
                <input
                  type="checkbox"
                  checked={layout.showProjectsSlide}
                  onChange={(e) => updateField('showProjectsSlide', e.target.checked)}
                  className="w-4.5 h-4.5 text-purple-600 rounded bg-slate-150 border-slate-300 focus:outline-hidden"
                />
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">Habilitar Aba Projetos Sociais</span>
                  <span className="text-[10px] text-slate-400">Ativa a aba das métricas sociais comunitárias da classe.</span>
                </div>
              </label>

              {/* Stack Left Cards */}
              <label className="flex items-center space-x-3 select-none cursor-pointer">
                <input
                  type="checkbox"
                  checked={layout.stackLeftCards}
                  onChange={(e) => updateField('stackLeftCards', e.target.checked)}
                  className="w-4.5 h-4.5 text-purple-600 rounded bg-slate-150 border-slate-300 focus:outline-hidden"
                />
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">Empilhar Cards Verticalmente</span>
                  <span className="text-[10px] text-slate-400">No painel esquerdo, empilha os indicadores uns sobre os outros.</span>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950/45 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-xs hover:shadow-md transition-all cursor-pointer"
          >
            Confirmar Layout
          </button>
        </div>
      </div>
    </div>
  );
}
