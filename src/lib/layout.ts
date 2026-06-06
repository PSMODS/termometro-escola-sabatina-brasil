/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LayoutConfig, MetricData, SLIDE_DEFINITIONS } from '../types';

export const LAYOUT_PRESETS: Record<'compact' | 'standard' | 'stage', LayoutConfig> = {
  compact: {
    titleSize: 18,
    textSize: 13,
    iconSize: 20,
    spacingScale: 0.8,
    leftPanelWidth: 38,
    resultScale: 0.85,
    showFooterSummary: false,
    showPresentationCards: true,
    showProjectsSlide: true,
    stackLeftCards: true,
    decimals: 0,
    theme: 'light'
  },
  standard: {
    titleSize: 24,
    textSize: 15,
    iconSize: 24,
    spacingScale: 1.0,
    leftPanelWidth: 45,
    resultScale: 1.0,
    showFooterSummary: true,
    showPresentationCards: true,
    showProjectsSlide: true,
    stackLeftCards: false,
    decimals: 1,
    theme: 'light'
  },
  stage: {
    titleSize: 32,
    textSize: 18,
    iconSize: 32,
    spacingScale: 1.2,
    leftPanelWidth: 50,
    resultScale: 1.15,
    showFooterSummary: true,
    showPresentationCards: true,
    showProjectsSlide: true,
    stackLeftCards: false,
    decimals: 1,
    theme: 'stage'
  }
};

// Retorna qual a carinha e a cor baseada no percentual alcançado
export interface ThermometerLevel {
  level: 1 | 2 | 3 | 4;
  label: string;
  colorClass: string;
  bgColorClass: string;
  borderColorClass: string;
  textClass: string;
  emoticon: string;
}

export function getThermometerLevel(percent: number): ThermometerLevel {
  if (percent <= 25) {
    return {
      level: 1,
      label: 'Abaixo do esperado 😓',
      colorClass: 'bg-red-500',
      bgColorClass: 'bg-red-50 dark:bg-red-950/20',
      borderColorClass: 'border-red-200 dark:border-red-900',
      textClass: 'text-red-600 dark:text-red-400',
      emoticon: 'cry'
    };
  } else if (percent <= 50) {
    return {
      level: 2,
      label: 'Em progresso... 😐',
      colorClass: 'bg-orange-500',
      bgColorClass: 'bg-orange-50 dark:bg-orange-950/20',
      borderColorClass: 'border-orange-200 dark:border-orange-900',
      textClass: 'text-orange-600 dark:text-orange-400',
      emoticon: 'neutral'
    };
  } else if (percent <= 75) {
    return {
      level: 3,
      label: 'Bom resultado! 🙂',
      colorClass: 'bg-amber-500',
      bgColorClass: 'bg-amber-50 dark:bg-amber-950/20',
      borderColorClass: 'border-amber-200 dark:border-amber-900',
      textClass: 'text-amber-600 dark:text-amber-400',
      emoticon: 'satisfied'
    };
  } else {
    return {
      level: 4,
      label: 'Excelente resultado! 🎉🤩',
      colorClass: 'bg-emerald-500',
      bgColorClass: 'bg-emerald-50 dark:bg-emerald-950/20',
      borderColorClass: 'border-emerald-200 dark:border-emerald-900',
      textClass: 'text-emerald-600 dark:text-emerald-400',
      emoticon: 'happy'
    };
  }
}

export function generateWhatsAppSummary(data: MetricData, decimals: number = 1): string {
  const formatPercent = (num: number, den: number) => {
    if (!den) return '0%';
    const pct = (num / den) * 100;
    return `${pct.toFixed(decimals)}%`;
  };

  const getEmojiForPercent = (pct: number) => {
    if (pct <= 25) return '🔴 😓';
    if (pct <= 50) return '🟠 😐';
    if (pct <= 75) return '🟡 🙂';
    return '🟢 🤩';
  };

  const pctPresenca = (data.membersPresent / data.totalMembers) * 100;
  const pctComunhao = (data.communion / data.totalMembers) * 100;
  const pctPG = (data.smallGroup / data.totalMembers) * 100;
  const pctEstudos = (data.biblicalStudies / data.totalMembers) * 100;
  const pctProjetos = (data.projects / data.totalMembers) * 100;
  const pctOfertas = data.weeklyGoal > 0 ? (data.weeklyAverage / data.weeklyGoal) * 100 : 0;

  const today = new Date().toLocaleDateString('pt-BR');

  let text = `📊 *MÉTRO DE DESEMPENHO - ESCOLA SABATINA* 🌡️\n`;
  text += `📅 *Relatório de Classe* • ${today}\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

  text += `👥 *Membros Matriculados:* ${data.totalMembers}\n\n`;

  text += `${getEmojiForPercent(pctPresenca)} *Presença:* ${formatPercent(data.membersPresent, data.totalMembers)} (${data.membersPresent} de ${data.totalMembers})\n`;
  text += `${getEmojiForPercent(pctComunhao)} *Estudo Diário:* ${formatPercent(data.communion, data.totalMembers)} (${data.communion} membros)\n`;
  text += `${getEmojiForPercent(pctPG)} *Pequenos Grupos:* ${formatPercent(data.smallGroup, data.totalMembers)} (${data.smallGroup} em PG)\n`;
  text += `${getEmojiForPercent(pctEstudos)} *Estudos Bíblicos:* ${formatPercent(data.biblicalStudies, data.totalMembers)} (${data.biblicalStudies} ministrados)\n`;
  text += `${getEmojiForPercent(pctProjetos)} *Ações Sociais:* ${formatPercent(data.projects, data.totalMembers)} (${data.projects} engajados)\n`;
  text += `${getEmojiForPercent(pctOfertas)} *Ofertas:* ${formatPercent(data.weeklyAverage, data.weeklyGoal)} (R$ ${data.weeklyAverage.toFixed(2)} de alvo R$ ${data.weeklyGoal.toFixed(2)})\n\n`;

  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `🌡️ _"Subindo a temperatura espiritual e a união no serviço!"_`;

  return text;
}
