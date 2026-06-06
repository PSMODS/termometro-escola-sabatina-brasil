/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { MetricData, LayoutConfig } from '../types';
import { generateWhatsAppSummary } from '../lib/layout';
import { 
  X, Copy, Check, Download, Upload, RotateCcw, 
  Users, BookOpen, HeartHandshake, Compass, Sparkles, Coins, Clipboard 
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: MetricData;
  layout: LayoutConfig;
  setData: (newData: Partial<MetricData> | ((prev: MetricData) => MetricData)) => void;
  setLayout: (newLayout: Partial<LayoutConfig> | ((prev: LayoutConfig) => LayoutConfig)) => void;
  resetAll: () => void;
  exportJSON: () => void;
  importJSON: (jsonString: string) => boolean;
}

export default function SettingsModal({
  isOpen,
  onClose,
  data,
  layout,
  setData,
  setLayout,
  resetAll,
  exportJSON,
  importJSON
}: SettingsModalProps) {
  const [copied, setCopied] = useState(false);
  const [jsonText, setJsonText] = useState('');
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleInputChange = (key: keyof MetricData, value: string) => {
    const num = value === '' ? 0 : Math.max(0, parseFloat(value));
    setData({ [key]: num });
  };

  const handleCopyWhatsApp = () => {
    const text = generateWhatsAppSummary(data, layout.decimals);
    navigator.clipboard.writeText(text)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch((err) => {
        console.error('Erro ao copiar:', err);
      });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const success = importJSON(text);
      if (success) {
        setImportStatus('success');
        setTimeout(() => setImportStatus('idle'), 3000);
      } else {
        setImportStatus('error');
        setTimeout(() => setImportStatus('idle'), 3000);
      }
    };
    reader.readAsText(file);
    if (e.target) {
      e.target.value = ''; // Reset do input
    }
  };

  const handlePasteImport = () => {
    if (!jsonText.trim()) return;
    const success = importJSON(jsonText);
    if (success) {
      setImportStatus('success');
      setJsonText('');
      setTimeout(() => setImportStatus('idle'), 3000);
    } else {
      setImportStatus('error');
      setTimeout(() => setImportStatus('idle'), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity overflow-y-auto">
      <div 
        id="settings-modal-card"
        className="w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-8 max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/45">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-lg">
              <Users size={18} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-white leading-none">Dados Globais</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Configure os dados das métricas do seu termômetro</p>
            </div>
          </div>
          <button 
            id="close-settings-modal"
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Grid de Inputs de Métricas */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-1.5 uppercase tracking-wider font-mono">
              📈 Entrada de Dados (Membros & Alvos)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Total Members */}
              <div className="flex flex-col space-y-1 bg-slate-50 dark:bg-slate-950/20 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                  <Users size={14} className="text-blue-500" /> Membros Matriculados
                </label>
                <input
                  type="number"
                  min="1"
                  value={data.totalMembers || ''}
                  onChange={(e) => handleInputChange('totalMembers', e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-lg text-slate-800 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono font-medium"
                  placeholder="Ex: 50"
                />
                <p className="text-[10px] text-slate-400">Total de membros fixos no livro de matrícula da classe</p>
              </div>

              {/* Members Present */}
              <div className="flex flex-col space-y-1 bg-slate-50 dark:bg-slate-950/20 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                  <Users size={14} className="text-emerald-500" /> Membros Presentes
                </label>
                <input
                  type="number"
                  min="0"
                  value={data.membersPresent || ''}
                  onChange={(e) => handleInputChange('membersPresent', e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-lg text-slate-800 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono font-medium"
                  placeholder="Ex: 35"
                />
                <p className="text-[10px] text-slate-400 font-mono text-emerald-600 dark:text-emerald-400">
                  {data.totalMembers ? `Equivale a ${((data.membersPresent / data.totalMembers) * 100).toFixed(layout.decimals)}%` : '0%'}
                </p>
              </div>

              {/* Communion (Lição) */}
              <div className="flex flex-col space-y-1 bg-slate-50 dark:bg-slate-950/20 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                  <BookOpen size={14} className="text-violet-500" /> Estudos Diários (Lição)
                </label>
                <input
                  type="number"
                  min="0"
                  value={data.communion || ''}
                  onChange={(e) => handleInputChange('communion', e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-lg text-slate-800 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-violet-500 font-mono font-medium"
                  placeholder="Ex: 25"
                />
                <p className="text-[10px] text-slate-400 font-mono text-violet-600 dark:text-violet-400">
                  {data.totalMembers ? `Equivale a ${((data.communion / data.totalMembers) * 100).toFixed(layout.decimals)}%` : '0%'}
                </p>
              </div>

              {/* Small Group */}
              <div className="flex flex-col space-y-1 bg-slate-50 dark:bg-slate-950/20 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                  <HeartHandshake size={14} className="text-pink-500" /> Participantes em Pequeno Grupo
                </label>
                <input
                  type="number"
                  min="0"
                  value={data.smallGroup || ''}
                  onChange={(e) => handleInputChange('smallGroup', e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-lg text-slate-800 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-pink-500 font-mono font-medium"
                  placeholder="Ex: 20"
                />
                <p className="text-[10px] text-slate-400 font-mono text-pink-600 dark:text-pink-400">
                  {data.totalMembers ? `Equivale a ${((data.smallGroup / data.totalMembers) * 100).toFixed(layout.decimals)}%` : '0%'}
                </p>
              </div>

              {/* Biblical Studies */}
              <div className="flex flex-col space-y-1 bg-slate-50 dark:bg-slate-950/20 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                  <Compass size={14} className="text-teal-500" /> Estudos Bíblicos Ativos
                </label>
                <input
                  type="number"
                  min="0"
                  value={data.biblicalStudies || ''}
                  onChange={(e) => handleInputChange('biblicalStudies', e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-lg text-slate-800 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-teal-500 font-mono font-medium"
                  placeholder="Ex: 10"
                />
                <p className="text-[10px] text-slate-400 font-mono text-teal-600 dark:text-teal-400">
                  {data.totalMembers ? `Equivale a ${((data.biblicalStudies / data.totalMembers) * 100).toFixed(layout.decimals)}%` : '0%'}
                </p>
              </div>

              {/* Social Projects */}
              <div className="flex flex-col space-y-1 bg-slate-50 dark:bg-slate-950/20 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-indigo-500" /> Participantes em Ações Sociais
                </label>
                <input
                  type="number"
                  min="0"
                  value={data.projects || ''}
                  onChange={(e) => handleInputChange('projects', e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-lg text-slate-800 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono font-medium"
                  placeholder="Ex: 15"
                />
                <p className="text-[10px] text-slate-400 font-mono text-indigo-600 dark:text-indigo-400">
                  {data.totalMembers ? `Equivale a ${((data.projects / data.totalMembers) * 100).toFixed(layout.decimals)}%` : '0%'}
                </p>
              </div>

              {/* Oferta Atual */}
              <div className="flex flex-col space-y-1 bg-slate-50 dark:bg-slate-950/20 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                  <Coins size={14} className="text-amber-500" /> Valor de Oferta do Sábado (R$)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={data.weeklyAverage || ''}
                  onChange={(e) => handleInputChange('weeklyAverage', e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-lg text-slate-800 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500 font-mono font-medium"
                  placeholder="Ex: 350.00"
                />
                <p className="text-[10px] text-slate-400 font-mono text-amber-600 dark:text-amber-400">
                  {data.weeklyGoal ? `Equivale a ${((data.weeklyAverage / data.weeklyGoal) * 100).toFixed(layout.decimals)}%` : '0%'}
                </p>
              </div>

              {/* Meta de Oferta */}
              <div className="flex flex-col space-y-1 bg-slate-50 dark:bg-slate-950/20 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                  <Coins size={14} className="text-amber-600" /> Meta de Oferta Estabelecida (R$)
                </label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={data.weeklyGoal || ''}
                  onChange={(e) => handleInputChange('weeklyGoal', e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-lg text-slate-800 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-600 font-mono font-medium"
                  placeholder="Ex: 500.00"
                />
                <p className="text-[10px] text-slate-400">Meta financeira estipulada para o sábado corrente</p>
              </div>
            </div>
          </div>

          <hr className="border-slate-100 dark:border-slate-800" />

          {/* Opções de Formato de Resultados */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 uppercase tracking-wider font-mono">
                🎯 Precisão Numérica
              </h3>
              <div className="flex flex-col space-y-2 bg-slate-50 dark:bg-slate-950/20 p-3 rounded-xl border border-slate-150 dark:border-slate-800">
                <span className="text-xs text-slate-500 dark:text-slate-400 mb-1">Selecione o número de casas decimais do termômetro:</span>
                <div className="flex gap-2">
                  {[0, 1, 2].map((dec) => (
                    <button
                      key={dec}
                      onClick={() => setLayout({ decimals: dec })}
                      className={`flex-1 py-2 text-center text-xs font-bold rounded-lg border transition-all ${
                        layout.decimals === dec
                          ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-850'
                      }`}
                    >
                      {dec === 0 ? 'Sem decimais (80%)' : dec === 1 ? '1 decimal (80.5%)' : '2 decimais (80.52%)'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 uppercase tracking-wider font-mono">
                💬 Divulgação Rápida
              </h3>
              <div className="bg-slate-50 dark:bg-slate-950/20 p-3 rounded-xl border border-slate-150 dark:border-slate-800 flex flex-col justify-center h-full min-h-[92px]">
                <button
                  onClick={handleCopyWhatsApp}
                  className={`w-full py-2.5 px-4 text-xs font-bold rounded-lg flex items-center justify-center space-x-2 border transition-all ${
                    copied 
                      ? 'bg-emerald-600 text-white border-emerald-600' 
                      : 'bg-emerald-50 dark:bg-emerald-950/45 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/80 hover:bg-emerald-100 dark:hover:bg-emerald-950'
                  }`}
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  <span>{copied ? 'Copiado para Área de Transferência!' : 'Copiar Resumo para WhatsApp'}</span>
                </button>
              </div>
            </div>
          </div>

          <hr className="border-slate-100 dark:border-slate-800" />

          {/* Backup, Import e Export de Dados */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3.5 flex items-center gap-1.5 uppercase tracking-wider font-mono">
              💾 Sincronização & Backup (JSON)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Import e Export direto */}
              <div className="space-y-3 bg-slate-50 dark:bg-slate-950/20 p-4 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">Estruturação de arquivos</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Gere uma salvaguarda das métricas e das predefinições visuais de layout para usar em outro dispositivo.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <button
                    onClick={exportJSON}
                    className="py-2 px-3 text-xs font-bold bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Download size={14} /> Exportar JSON
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="py-2 px-3 text-xs font-bold bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-750/70 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Upload size={14} /> Importar Arquivo
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".json"
                    className="hidden"
                  />
                </div>
              </div>

              {/* Colagem rápida de JSON */}
              <div className="space-y-3 bg-slate-50 dark:bg-slate-950/20 p-4 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">Colar Backup JSON</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Coloque as informações JSON brutas para restauração imediata:</p>
                </div>
                <div className="flex space-x-1.5 mt-2">
                  <input
                    type="text"
                    value={jsonText}
                    onChange={(e) => setJsonText(e.target.value)}
                    placeholder='{"version":"1.0","data":{...}}'
                    className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-lg text-xs font-mono text-slate-700 dark:text-slate-300 focus:outline-hidden"
                  />
                  <button
                    onClick={handlePasteImport}
                    className="px-3.5 py-1.5 text-xs font-bold bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 hover:bg-slate-700 dark:hover:bg-slate-100 rounded-lg flex items-center gap-1 transition-all"
                  >
                    <Clipboard size={14} /> Aplicar
                  </button>
                </div>
              </div>
            </div>

            {/* Status do Import */}
            {importStatus === 'success' && (
              <div className="mt-3 p-3 text-xs bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 rounded-lg flex items-center gap-1.5">
                <Check size={16} /> Dados importados com sucesso! O termômetro foi atualizado.
              </div>
            )}
            {importStatus === 'error' && (
              <div className="mt-3 p-3 text-xs bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900 rounded-lg flex items-center gap-1.5">
                <X size={16} /> Falha ao importar dados. Verifique a formatação do arquivo JSON corporativo.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950/45 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <button
            onClick={() => {
              if (confirm('Tem certeza que deseja zerar os dados das métricas para os padrões de fábrica? Isso limpará todas as suas alterações.')) {
                resetAll();
              }
            }}
            className="text-xs text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-350 font-semibold flex items-center gap-1 transition-colors"
          >
            <RotateCcw size={14} /> Restaurar Padrões de Fábrica
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-xs hover:shadow-md transition-all cursor-pointer"
          >
            Concluir Ajustes
          </button>
        </div>
      </div>
    </div>
  );
}
