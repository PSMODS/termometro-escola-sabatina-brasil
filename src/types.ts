/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface MetricData {
  totalMembers: number;        // Membros matriculados
  membersPresent: number;      // Membros presentes
  communion: number;           // Estudos diários (Lição)
  smallGroup: number;          // Pequenos grupos
  biblicalStudies: number;     // Estudos bíblicos
  projects: number;            // Projetos sociais
  weeklyAverage: number;       // Ofertas (atual)
  weeklyGoal: number;          // Ofertas (meta)
}

export interface LayoutConfig {
  titleSize: number;           // 18-36px
  textSize: number;            // 12-24px
  iconSize: number;            // 18-36px
  spacingScale: number;        // 0.75-1.25
  leftPanelWidth: number;      // 30-70%
  resultScale: number;         // 0.8-1.2
  showFooterSummary: boolean;
  showPresentationCards: boolean;
  showProjectsSlide: boolean;  // Mostrar aba "Projetos"
  stackLeftCards: boolean;     // Empilhar cards verticalmente
  decimals: number;            // 0, 1 ou 2 casas decimais
  theme: 'light' | 'dark' | 'stage'; // Temas visuais
}

export type MetricType = 
  | 'presenca' 
  | 'comunhao' 
  | 'pequenos_grupos' 
  | 'estudos_biblicos' 
  | 'projetos_sociais' 
  | 'ofertas';

export interface SlideDefinition {
  id: MetricType;
  title: string;
  description: string;
  icon: string;
  numeratorLabel: string;
  denominatorLabel: string;
  numeratorKey: keyof MetricData;
  denominatorKey: keyof MetricData;
  unit: string;
  helpText: string;
}

export const SLIDE_DEFINITIONS: SlideDefinition[] = [
  {
    id: 'presenca',
    title: 'Presença na Escola Sabatina',
    description: 'Monitoramento da frequência presencial dos membros no sábado de manhã.',
    icon: 'Users',
    numeratorLabel: 'Membros Presentes',
    denominatorLabel: 'Membros Matriculados',
    numeratorKey: 'membersPresent',
    denominatorKey: 'totalMembers',
    unit: '% de presença',
    helpText: 'Membros que estiveram presentes no momento da Escola Sabatina.'
  },
  {
    id: 'comunhao',
    title: 'Estudos Diários (Comunhão)',
    description: 'Estudo diário do guia da lição da Escola Sabatina.',
    icon: 'BookOpen',
    numeratorLabel: 'Estudantes Diários (Lição)',
    denominatorLabel: 'Membros Matriculados',
    numeratorKey: 'communion',
    denominatorKey: 'totalMembers',
    unit: '% de comunhão diária',
    helpText: 'Membros que estudaram a lição pelo menos 5 dias na semana.'
  },
  {
    id: 'pequenos_grupos',
    title: 'Pequenos Grupos',
    description: 'Envolvimento ativo dos membros da Escola Sabatina em Pequenos Grupos durante a semana.',
    icon: 'HeartHandshake',
    numeratorLabel: 'Participantes em PG',
    denominatorLabel: 'Membros Matriculados',
    numeratorKey: 'smallGroup',
    denominatorKey: 'totalMembers',
    unit: '% de participação',
    helpText: 'Membros inscritos e frequentes em um Pequeno Grupo ativo.'
  },
  {
    id: 'estudos_biblicos',
    title: 'Estudos Bíblicos',
    description: 'Membros ativos dando estudos bíblicos ou acompanhando novos interessados.',
    icon: 'Compass',
    numeratorLabel: 'Estudos Bíblicos Ativos',
    denominatorLabel: 'Membros Matriculados',
    numeratorKey: 'biblicalStudies',
    denominatorKey: 'totalMembers',
    unit: '% de discipulado',
    helpText: 'Membros dando estudo bíblico pessoal de forma contínua ou liderando classes bíblicas.'
  },
  {
    id: 'projetos_sociais',
    title: 'Ações Sociais',
    description: 'Participação em projetos comunitários, de assistência social e de voluntariado.',
    icon: 'Sparkles',
    numeratorLabel: 'Participantes em Projetos',
    denominatorLabel: 'Membros Matriculados',
    numeratorKey: 'projects',
    denominatorKey: 'totalMembers',
    unit: '% de engajamento prático',
    helpText: 'Membros envolvidos em ao menos um projeto missionário ou social no mês.'
  },
  {
    id: 'ofertas',
    title: 'Fidelidade & Ofertas',
    description: 'Acompanhamento do pacto de ofertas da Escola Sabatina em relação ao alvo planejado.',
    icon: 'Coins',
    numeratorLabel: 'Oferta do Sábado',
    denominatorLabel: 'Meta Concluída',
    numeratorKey: 'weeklyAverage',
    denominatorKey: 'weeklyGoal',
    unit: '% atingido do plano',
    helpText: 'Oferta arrecadada no dia em comparação ao alvo estabelecido para a classe/departamento.'
  }
];
