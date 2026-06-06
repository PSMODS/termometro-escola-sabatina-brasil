/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { MetricData, LayoutConfig } from '../types';
import { LAYOUT_PRESETS } from '../lib/layout';

const DEFAULT_METRIC_DATA: MetricData = {
  totalMembers: 50,
  membersPresent: 38,
  communion: 25,
  smallGroup: 18,
  biblicalStudies: 10,
  projects: 15,
  weeklyAverage: 380,
  weeklyGoal: 500
};

const DEFAULT_LAYOUT = LAYOUT_PRESETS.standard;

export function useThermometerData() {
  const [sessionId, setSessionId] = useState<string>('');
  const [data, setDataState] = useState<MetricData>(DEFAULT_METRIC_DATA);
  const [layout, setLayoutState] = useState<LayoutConfig>(DEFAULT_LAYOUT);
  const [isLoading, setIsLoading] = useState(true);

  // Use refs para manter os dados atualizados para o salvamento automático (debounce)
  const dataRef = useRef<MetricData>(data);
  const layoutRef = useRef<LayoutConfig>(layout);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // 1. Resolver o session ID
    let sid = localStorage.getItem('thermometer_session_id');
    if (!sid) {
      sid = 'session_' + Math.random().toString(36).substring(2, 11);
      localStorage.setItem('thermometer_session_id', sid);
    }
    setSessionId(sid);

    // 2. Carregar dados das métricas
    const savedData = localStorage.getItem(`thermometer_data:${sid}`);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        // Garantir que todos os campos estão presentes
        setDataState({
          totalMembers: Number(parsed.totalMembers ?? DEFAULT_METRIC_DATA.totalMembers),
          membersPresent: Number(parsed.membersPresent ?? DEFAULT_METRIC_DATA.membersPresent),
          communion: Number(parsed.communion ?? DEFAULT_METRIC_DATA.communion),
          smallGroup: Number(parsed.smallGroup ?? DEFAULT_METRIC_DATA.smallGroup),
          biblicalStudies: Number(parsed.biblicalStudies ?? DEFAULT_METRIC_DATA.biblicalStudies),
          projects: Number(parsed.projects ?? DEFAULT_METRIC_DATA.projects),
          weeklyAverage: Number(parsed.weeklyAverage ?? DEFAULT_METRIC_DATA.weeklyAverage),
          weeklyGoal: Number(parsed.weeklyGoal ?? DEFAULT_METRIC_DATA.weeklyGoal),
        });
      } catch (e) {
        console.error('Erro ao ler dados salvos:', e);
        setDataState(DEFAULT_METRIC_DATA);
      }
    } else {
      setDataState(DEFAULT_METRIC_DATA);
    }

    // 3. Carregar dados de Layout
    const savedLayout = localStorage.getItem(`thermometer_layout:${sid}`);
    if (savedLayout) {
      try {
        const parsed = JSON.parse(savedLayout);
        setLayoutState({
          titleSize: Number(parsed.titleSize ?? DEFAULT_LAYOUT.titleSize),
          textSize: Number(parsed.textSize ?? DEFAULT_LAYOUT.textSize),
          iconSize: Number(parsed.iconSize ?? DEFAULT_LAYOUT.iconSize),
          spacingScale: Number(parsed.spacingScale ?? DEFAULT_LAYOUT.spacingScale),
          leftPanelWidth: Number(parsed.leftPanelWidth ?? DEFAULT_LAYOUT.leftPanelWidth),
          resultScale: Number(parsed.resultScale ?? DEFAULT_LAYOUT.resultScale),
          showFooterSummary: Boolean(parsed.showFooterSummary ?? DEFAULT_LAYOUT.showFooterSummary),
          showPresentationCards: Boolean(parsed.showPresentationCards ?? DEFAULT_LAYOUT.showPresentationCards),
          showProjectsSlide: Boolean(parsed.showProjectsSlide ?? DEFAULT_LAYOUT.showProjectsSlide),
          stackLeftCards: Boolean(parsed.stackLeftCards ?? DEFAULT_LAYOUT.stackLeftCards),
          decimals: Number(parsed.decimals ?? DEFAULT_LAYOUT.decimals),
          theme: (parsed.theme ?? DEFAULT_LAYOUT.theme) as 'light' | 'dark' | 'stage',
        });
      } catch (e) {
        console.error('Erro ao ler layout salvo:', e);
        setLayoutState(DEFAULT_LAYOUT);
      }
    } else {
      setLayoutState(DEFAULT_LAYOUT);
    }

    setIsLoading(false);
  }, []);

  // Mantém os refs em sincronia com o state actual
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    layoutRef.current = layout;
  }, [layout]);

  // Função para agendar o salvamento com debounce de 1 segundo
  const scheduleSave = (targetSessionId: string) => {
    if (!targetSessionId) return;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      localStorage.setItem(`thermometer_data:${targetSessionId}`, JSON.stringify(dataRef.current));
      localStorage.setItem(`thermometer_layout:${targetSessionId}`, JSON.stringify(layoutRef.current));
    }, 1000);
  };

  // State setters emparelhados com salvamento automático
  const setData = (newData: Partial<MetricData> | ((prev: MetricData) => MetricData)) => {
    setDataState((prev) => {
      const resolved = typeof newData === 'function' ? newData(prev) : { ...prev, ...newData };
      scheduleSave(sessionId);
      return resolved;
    });
  };

  const setLayout = (newLayout: Partial<LayoutConfig> | ((prev: LayoutConfig) => LayoutConfig)) => {
    setLayoutState((prev) => {
      const resolved = typeof newLayout === 'function' ? newLayout(prev) : { ...prev, ...newLayout };
      scheduleSave(sessionId);
      return resolved;
    });
  };

  // Cancelar timeout na desmontagem do hook
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  // Restaurar padrões
  const resetAll = () => {
    setDataState(DEFAULT_METRIC_DATA);
    setLayoutState(DEFAULT_LAYOUT);
    if (sessionId) {
      localStorage.setItem(`thermometer_data:${sessionId}`, JSON.stringify(DEFAULT_METRIC_DATA));
      localStorage.setItem(`thermometer_layout:${sessionId}`, JSON.stringify(DEFAULT_LAYOUT));
    }
  };

  // Exportar para JSON
  const exportJSON = () => {
    const payload = {
      version: '1.0',
      sessionId,
      exportedAt: new Date().toISOString(),
      data,
      layout
    };
    
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `termometro_escola_sabatina_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Importar de JSON
  const importJSON = (jsonString: string): boolean => {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed || (typeof parsed !== 'object')) return false;

      let hasChanges = false;
      
      if (parsed.data && typeof parsed.data === 'object') {
        const d = parsed.data;
        setDataState({
          totalMembers: Math.max(1, Number(d.totalMembers ?? DEFAULT_METRIC_DATA.totalMembers)),
          membersPresent: Math.max(0, Number(d.membersPresent ?? DEFAULT_METRIC_DATA.membersPresent)),
          communion: Math.max(0, Number(d.communion ?? DEFAULT_METRIC_DATA.communion)),
          smallGroup: Math.max(0, Number(d.smallGroup ?? DEFAULT_METRIC_DATA.smallGroup)),
          biblicalStudies: Math.max(0, Number(d.biblicalStudies ?? DEFAULT_METRIC_DATA.biblicalStudies)),
          projects: Math.max(0, Number(d.projects ?? DEFAULT_METRIC_DATA.projects)),
          weeklyAverage: Math.max(0, Number(d.weeklyAverage ?? DEFAULT_METRIC_DATA.weeklyAverage)),
          weeklyGoal: Math.max(1, Number(d.weeklyGoal ?? DEFAULT_METRIC_DATA.weeklyGoal)),
        });
        hasChanges = true;
      }

      if (parsed.layout && typeof parsed.layout === 'object') {
        const l = parsed.layout;
        setLayoutState({
          titleSize: Number(l.titleSize ?? DEFAULT_LAYOUT.titleSize),
          textSize: Number(l.textSize ?? DEFAULT_LAYOUT.textSize),
          iconSize: Number(l.iconSize ?? DEFAULT_LAYOUT.iconSize),
          spacingScale: Number(l.spacingScale ?? DEFAULT_LAYOUT.spacingScale),
          leftPanelWidth: Number(l.leftPanelWidth ?? DEFAULT_LAYOUT.leftPanelWidth),
          resultScale: Number(l.resultScale ?? DEFAULT_LAYOUT.resultScale),
          showFooterSummary: Boolean(l.showFooterSummary ?? DEFAULT_LAYOUT.showFooterSummary),
          showPresentationCards: Boolean(l.showPresentationCards ?? DEFAULT_LAYOUT.showPresentationCards),
          showProjectsSlide: Boolean(l.showProjectsSlide ?? DEFAULT_LAYOUT.showProjectsSlide),
          stackLeftCards: Boolean(l.stackLeftCards ?? DEFAULT_LAYOUT.stackLeftCards),
          decimals: Number(l.decimals ?? DEFAULT_LAYOUT.decimals),
          theme: (l.theme ?? DEFAULT_LAYOUT.theme) as 'light' | 'dark' | 'stage',
        });
        hasChanges = true;
      }

      // Se passou as validações, agendar salvamento persistente
      if (hasChanges && sessionId) {
        setTimeout(() => {
          localStorage.setItem(`thermometer_data:${sessionId}`, JSON.stringify(dataRef.current));
          localStorage.setItem(`thermometer_layout:${sessionId}`, JSON.stringify(layoutRef.current));
        }, 50);
      }

      return hasChanges;
    } catch (e) {
      console.error('Falha ao importar JSON:', e);
      return false;
    }
  };

  return {
    sessionId,
    data,
    layout,
    isLoading,
    setData,
    setLayout,
    resetAll,
    exportJSON,
    importJSON
  };
}
