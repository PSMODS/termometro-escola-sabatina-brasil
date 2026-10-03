/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LayoutConfig } from '../types';
import { LAYOUT_PRESETS } from '../lib/layout';
import {
  Check,
  Eye,
  Layout,
  Moon,
  Palette,
  Ruler,
  Sliders,
  Sparkles,
  Sun,
  Type,
  X,
} from 'lucide-react';

interface LayoutSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  layout: LayoutConfig;
  setLayout: (newLayout: Partial<LayoutConfig> | ((prev: LayoutConfig) => LayoutConfig)) => void;
}

type PresetKey = 'compact' | 'standard' | 'stage';
type ThemeKey = LayoutConfig['theme'];

const presetOptions: Array<{ key: PresetKey; title: string; description: string; accent: string }> = [
  { key: 'compact', title: 'Compacto', description: 'Mais conteúdo e controles discretos.', accent: 'blue' },
  { key: 'standard', title: 'Equilibrado', description: 'Leitura confortável para computador e TV.', accent: 'cyan' },
  { key: 'stage', title: 'Palco', description: 'Máximo contraste para telão 16:9.', accent: 'gold' },
];

const themeOptions: Array<{ key: ThemeKey; title: string; description: string; icon: typeof Sun }> = [
  { key: 'light', title: 'Claro', description: 'Fundo claro para uso em sala.', icon: Sun },
  { key: 'dark', title: 'Azul noturno', description: 'Escuro e confortável para leitura.', icon: Moon },
  { key: 'stage', title: 'Palco', description: 'Azul-marinho com alto contraste.', icon: Sparkles },
];

const sameLayoutValue = (left: LayoutConfig, right: LayoutConfig, key: keyof LayoutConfig) => left[key] === right[key];

export default function LayoutSettingsModal({
  isOpen,
  onClose,
  layout,
  setLayout,
}: LayoutSettingsModalProps) {
  if (!isOpen) return null;

  const updateField = <K extends keyof LayoutConfig>(key: K, value: LayoutConfig[K]) => {
    setLayout({ [key]: value });
  };

  const applyPreset = (presetKey: PresetKey) => {
    const preset = LAYOUT_PRESETS[presetKey];
    setLayout({ ...preset, theme: presetKey === 'stage' ? 'stage' : layout.theme });
  };

  const isPresetActive = (presetKey: PresetKey) => {
    const preset = LAYOUT_PRESETS[presetKey];
    return (['titleSize', 'textSize', 'iconSize', 'spacingScale', 'resultScale', 'decimals', 'theme'] as const)
      .every(key => sameLayoutValue(layout, preset, key));
  };

  const rangeFields: Array<{
    key: 'titleSize' | 'textSize' | 'iconSize' | 'spacingScale' | 'resultScale';
    label: string;
    min: number;
    max: number;
    step: number;
    format: (value: number) => string;
  }> = [
    { key: 'titleSize', label: 'Títulos', min: 18, max: 36, step: 1, format: value => `${value}px` },
    { key: 'textSize', label: 'Textos e legendas', min: 12, max: 24, step: 1, format: value => `${value}px` },
    { key: 'iconSize', label: 'Ícones', min: 18, max: 36, step: 1, format: value => `${value}px` },
    { key: 'spacingScale', label: 'Espaçamento', min: 75, max: 125, step: 5, format: value => `${value}%` },
    { key: 'resultScale', label: 'Resultado e carinha', min: 80, max: 120, step: 5, format: value => `${value}%` },
  ];

  const rangeValue = (field: typeof rangeFields[number]) => {
    const value = layout[field.key];
    return field.key === 'spacingScale' || field.key === 'resultScale' ? Number(value) * 100 : Number(value);
  };

  const setRangeValue = (field: typeof rangeFields[number], value: number) => {
    const nextValue = field.key === 'spacingScale' || field.key === 'resultScale' ? value / 100 : value;
    updateField(field.key, nextValue as LayoutConfig[typeof field.key]);
  };

  return (
    <div className="layout-settings-overlay" role="presentation">
      <div className="layout-settings-card" role="dialog" aria-modal="true" aria-labelledby="layout-modal-title">
        <header className="layout-settings-header">
          <div className="layout-settings-heading">
            <div className="layout-settings-icon"><Layout size={20} /></div>
            <div>
              <h2 id="layout-modal-title">Ajustes da apresentação</h2>
              <p>Controles compatíveis com o novo palco 16:9</p>
            </div>
          </div>
          <button className="layout-settings-close" onClick={onClose} aria-label="Fechar ajustes">
            <X size={20} />
          </button>
        </header>

        <div className="layout-settings-body">
          <section className="layout-settings-section">
            <div className="layout-settings-section-title"><Sliders size={16} /><span>Preset de leitura</span><small>aplica uma combinação pronta</small></div>
            <div className="layout-choice-grid layout-choice-grid-3">
              {presetOptions.map(option => {
                const active = isPresetActive(option.key);
                return (
                  <button
                    key={option.key}
                    className={`layout-choice layout-choice-${option.accent} ${active ? 'is-active' : ''}`}
                    onClick={() => applyPreset(option.key)}
                    aria-pressed={active}
                  >
                    <span className="layout-choice-check">{active && <Check size={13} />}</span>
                    <strong>{option.title}</strong>
                    <span>{option.description}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="layout-settings-section">
            <div className="layout-settings-section-title"><Palette size={16} /><span>Cor da apresentação</span><small>azul-marinho recomendado para telão</small></div>
            <div className="layout-choice-grid layout-choice-grid-3">
              {themeOptions.map(option => {
                const Icon = option.icon;
                const active = layout.theme === option.key;
                return (
                  <button
                    key={option.key}
                    className={`layout-theme-choice ${active ? 'is-active' : ''}`}
                    onClick={() => updateField('theme', option.key)}
                    aria-pressed={active}
                  >
                    <span className="layout-theme-icon"><Icon size={17} /></span>
                    <span><strong>{option.title}</strong><small>{option.description}</small></span>
                    {active && <Check className="layout-theme-check" size={16} />}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="layout-settings-section">
            <div className="layout-settings-section-title"><Ruler size={16} /><span>Escala do palco</span><small>ajuste o tamanho sem alterar cálculos</small></div>
            <div className="layout-range-panel">
              {rangeFields.map(field => {
                const value = rangeValue(field);
                return (
                  <label className="layout-range" key={field.key}>
                    <span><b>{field.label}</b><strong>{field.format(value)}</strong></span>
                    <input
                      type="range"
                      min={field.min}
                      max={field.max}
                      step={field.step}
                      value={value}
                      onChange={event => setRangeValue(field, Number(event.target.value))}
                    />
                  </label>
                );
              })}
            </div>
          </section>

          <section className="layout-settings-section">
            <div className="layout-settings-section-title"><Type size={16} /><span>Exibição do resultado</span><small>preferências do indicador atual</small></div>
            <div className="layout-settings-options">
              <label className="layout-toggle-row">
                <span className="layout-toggle-copy"><Eye size={17} /><span><b>Cards de valores</b><small>mostra numerador e denominador à esquerda</small></span></span>
                <input type="checkbox" checked={layout.showPresentationCards} onChange={event => updateField('showPresentationCards', event.target.checked)} />
              </label>
              <label className="layout-toggle-row">
                <span className="layout-toggle-copy"><Type size={17} /><span><b>Casas decimais</b><small>escolha a precisão exibida nos percentuais</small></span></span>
                <select value={layout.decimals} onChange={event => updateField('decimals', Number(event.target.value))}>
                  <option value={0}>0 casas</option>
                  <option value={1}>1 casa</option>
                  <option value={2}>2 casas</option>
                </select>
              </label>
            </div>
          </section>

          <div className="layout-settings-note">
            <Sparkles size={16} /> Os seis indicadores permanecem disponíveis no rodapé. As opções antigas de esconder projetos ou empilhar cards não são usadas pelo layout de palco.
          </div>
        </div>

        <footer className="layout-settings-footer">
          <button onClick={onClose}>Confirmar alterações</button>
        </footer>
      </div>
    </div>
  );
}
