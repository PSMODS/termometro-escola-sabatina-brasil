/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { X, Instagram, MessageCircle, Info, ExternalLink, Heart, Award, ShieldCheck } from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AboutModal({ isOpen, onClose }: AboutModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity overflow-y-auto">
      <div 
        id="about-modal-card"
        className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-8 max-h-[90vh] animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-[#012245] text-white">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-white/10 text-amber-400 rounded-lg">
              <Info size={18} />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight uppercase leading-none">Sobre o Aplicativo</h2>
              <p className="text-[11px] text-slate-350 tracking-wider mt-1 uppercase font-semibold">Minhas Informações & Redes</p>
            </div>
          </div>
          <button 
            id="close-about-modal"
            onClick={onClose}
            className="p-1.5 hover:bg-white/15 text-slate-300 hover:text-white rounded-md transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Sessão 1: Canal/Grupo de Comunicação Oficial (WhatsApp) */}
          <div className="bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-3 bg-emerald-500 text-white rounded-2xl shadow-md flex-shrink-0 animate-pulse duration-[3000ms]">
                <MessageCircle size={24} strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="text-sm font-black text-[#012245] dark:text-emerald-400 uppercase tracking-wide leading-none">
                  Grupo do WhatsApp
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-450 font-bold mt-1 uppercase tracking-wide font-mono">
                  Escola Sabatina Oficial
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                  Entre em contato e participe de nosso grupo oficial de discussões, materiais de estudo e atualizações da nossa classe.
                </p>
              </div>
            </div>
            
            <a
              href="https://chat.whatsapp.com/BKkRZhcOjjgFWc6kxTQQoB"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-5 py-3 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 border border-emerald-400 hover:scale-[1.03]"
            >
              <span>Entrar no Grupo</span>
              <ExternalLink size={14} />
            </a>
          </div>

          {/* Sessão 2: Informações de Desenvolvedor / Creator */}
          <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-[#012245] text-amber-400 rounded-xl">
                <Award size={18} />
              </div>
              <div>
                <h3 className="text-xs uppercase tracking-wider font-extrabold text-slate-400 dark:text-slate-550 block font-mono">
                  Desenvolvimento & Design
                </h3>
                <span className="text-base font-black text-slate-850 dark:text-white block mt-0.5 leading-none">
                  Allan • @allan.psxd1
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-650 dark:text-slate-300 leading-relaxed">
              Olá! Eu desenvolvi este sistema interativo com muito carinho para revolucionar a forma como gerenciamos e visualizamos
              as métricas da nossa <strong>Escola Sabatina</strong>. Minha missão é providenciar ferramentas ricas em design,
              offline-first e dinâmicas para o fortalecimento da nossa igreja.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <a
                href="https://www.instagram.com/allan.psxd1"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 active:from-purple-800 active:to-pink-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 hover:scale-[1.015]"
              >
                <Instagram size={16} />
                <span>Seguir no Instagram</span>
              </a>
            </div>
          </div>

          {/* Rodapé de Instrução ou Selo */}
          <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400 font-extrabold uppercase tracking-widest font-mono select-none">
            <ShieldCheck size={14} className="text-indigo-500" />
            <span>Sistema Seguro & Local</span>
            <span>•</span>
            <Heart size={10} className="text-rose-500 fill-rose-500" />
            <span>Advento 2026</span>
          </div>
        </div>
      </div>
    </div>
  );
}
