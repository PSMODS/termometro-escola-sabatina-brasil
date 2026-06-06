/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { SLIDE_DEFINITIONS, SlideDefinition, MetricData, LayoutConfig } from '../types';
import { getThermometerLevel, generateWhatsAppSummary } from '../lib/layout';
import { useThermometerData } from '../hooks/useThermometerData';
import AnimatedFace from './AnimatedFaces';
import SettingsModal from './SettingsModal';
import LayoutSettingsModal from './LayoutSettingsModal';
import AboutModal from './AboutModal';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Settings, Layout as LayoutIcon, Play, Pause, RotateCcw, 
  Download, ChevronLeft, ChevronRight, Share2, Sparkles, 
  Tv, Eye, EyeOff, HelpCircle, Check, Users, BookOpen, HeartHandshake, 
  Compass, Coins, Monitor, Maximize2, Minimize2, Flame, Instagram, MessageCircle
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const PDF_COLOR_FALLBACK = 'rgb(100, 110, 130)';
const PDF_STYLE_PROPS_TO_SANITIZE = [
  'color',
  'background-color',
  'background-image',
  'border-top-color',
  'border-right-color',
  'border-bottom-color',
  'border-left-color',
  'outline-color',
  'text-decoration-color',
  'column-rule-color',
  'caret-color',
  'fill',
  'stroke',
  'box-shadow',
  'text-shadow'
];

const hasUnsupportedColorFunction = (value?: string | null) => {
  return !!value && (value.toLowerCase().includes('oklch(') || value.toLowerCase().includes('oklab('));
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const parseCssNumber = (value: string, percentScale: number = 1) => {
  if (value === 'none') {
    return 0;
  }

  if (value.endsWith('%')) {
    return (Number.parseFloat(value) / 100) * percentScale;
  }

  return Number.parseFloat(value);
};

const parseHue = (value: string) => {
  if (value === 'none') {
    return 0;
  }

  const numericValue = Number.parseFloat(value);
  if (value.endsWith('rad')) {
    return numericValue * (180 / Math.PI);
  }
  if (value.endsWith('turn')) {
    return numericValue * 360;
  }
  if (value.endsWith('grad')) {
    return numericValue * 0.9;
  }

  return numericValue;
};

const linearRgbToSrgb = (value: number) => {
  const srgb = value >= 0.0031308
    ? 1.055 * Math.pow(value, 1 / 2.4) - 0.055
    : 12.92 * value;

  return Math.round(clamp(srgb, 0, 1) * 255);
};

const oklabToRgb = (lightness: number, a: number, b: number, alpha: number = 1) => {
  const lPrime = lightness + 0.3963377774 * a + 0.2158037573 * b;
  const mPrime = lightness - 0.1055613458 * a - 0.0638541728 * b;
  const sPrime = lightness - 0.0894841775 * a - 1.2914855480 * b;

  const l = lPrime ** 3;
  const m = mPrime ** 3;
  const s = sPrime ** 3;

  const r = linearRgbToSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s);
  const g = linearRgbToSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s);
  const blue = linearRgbToSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s);
  const safeAlpha = clamp(alpha, 0, 1);

  return safeAlpha < 1 ? `rgba(${r}, ${g}, ${blue}, ${safeAlpha})` : `rgb(${r}, ${g}, ${blue})`;
};

const convertUnsupportedColorFunction = (colorSpace: 'oklch' | 'oklab', rawArgs: string) => {
  const normalizedArgs = rawArgs.trim().replace(/\s*\/\s*/g, ' / ');
  if (!normalizedArgs || normalizedArgs.startsWith('from ')) {
    return null;
  }

  const args = normalizedArgs.split(/\s+/);
  const slashIndex = args.indexOf('/');
  const colorArgs = slashIndex === -1 ? args : args.slice(0, slashIndex);
  const alphaArg = slashIndex === -1 ? undefined : args[slashIndex + 1];

  if (colorArgs.length < 3) {
    return null;
  }

  const lightness = parseCssNumber(colorArgs[0]);
  const alpha = alphaArg ? parseCssNumber(alphaArg) : 1;
  let a = parseCssNumber(colorArgs[1]);
  let b = parseCssNumber(colorArgs[2]);

  if (colorSpace === 'oklch') {
    const chroma = parseCssNumber(colorArgs[1]);
    const hueRadians = (parseHue(colorArgs[2]) * Math.PI) / 180;
    a = chroma * Math.cos(hueRadians);
    b = chroma * Math.sin(hueRadians);
  }

  if ([lightness, a, b, alpha].some(component => Number.isNaN(component))) {
    return null;
  }

  return oklabToRgb(lightness, a, b, alpha);
};

const sanitizeUnsupportedColorFunctions = (value: string, fallback: string = PDF_COLOR_FALLBACK) => {
  const lowerValue = value.toLowerCase();
  let sanitizedValue = '';
  let charIndex = 0;

  while (charIndex < value.length) {
    const isOklch = lowerValue.startsWith('oklch(', charIndex);
    const isOklab = lowerValue.startsWith('oklab(', charIndex);

    if (isOklch || isOklab) {
      const colorSpace = isOklch ? 'oklch' : 'oklab';
      const argsStart = charIndex + (isOklch ? 'oklch('.length : 'oklab('.length);
      charIndex = argsStart;
      let parenCount = 1;

      while (charIndex < value.length && parenCount > 0) {
        if (value[charIndex] === '(') {
          parenCount++;
        } else if (value[charIndex] === ')') {
          parenCount--;
        }
        charIndex++;
      }

      const argsEnd = charIndex - 1;
      const rawArgs = value.slice(argsStart, argsEnd);
      sanitizedValue += convertUnsupportedColorFunction(colorSpace, rawArgs) || fallback;
    } else {
      sanitizedValue += value[charIndex];
      charIndex++;
    }
  }

  return sanitizedValue;
};

const sanitizeComputedStylesForPDF = (sourceRoot: HTMLElement, cloneRoot: HTMLElement) => {
  const sourceElements = [sourceRoot, ...Array.from(sourceRoot.querySelectorAll('*'))];
  const cloneElements = [cloneRoot, ...Array.from(cloneRoot.querySelectorAll('*'))];

  sourceElements.forEach((sourceElement, index) => {
    const cloneElement = cloneElements[index] as HTMLElement | SVGElement | undefined;
    if (!cloneElement || !('style' in cloneElement)) {
      return;
    }

    const computedStyle = window.getComputedStyle(sourceElement);
    PDF_STYLE_PROPS_TO_SANITIZE.forEach(prop => {
      const value = computedStyle.getPropertyValue(prop);
      if (hasUnsupportedColorFunction(value)) {
        cloneElement.style.setProperty(prop, sanitizeUnsupportedColorFunctions(value));
      }
    });
  });
};

function getSlideIcon(iconName: string, size: number, className?: string) {
  switch (iconName) {
    case 'Users': return <Users size={size} className={className} />;
    case 'BookOpen': return <BookOpen size={size} className={className} />;
    case 'HeartHandshake': return <HeartHandshake size={size} className={className} />;
    case 'Compass': return <Compass size={size} className={className} />;
    case 'Sparkles': return <Sparkles size={size} className={className} />;
    case 'Coins': return <Coins size={size} className={className} />;
    default: return <HelpCircle size={size} className={className} />;
  }
}

const getLevelGradientAndGlow = (levelNum: number) => {
  switch (levelNum) {
    case 1:
      return {
        bg: 'linear-gradient(to top, #9f1239, #dc2626)',
        glow: 'none',
        textColor: 'text-rose-700 dark:text-rose-400',
        textColorHex: '#dc2626',
        bgPill: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30',
        borderPill: 'border-rose-200'
      };
    case 2:
      return {
        bg: 'linear-gradient(to top, #c2410c, #ea580c)',
        glow: 'none',
        textColor: 'text-orange-700 dark:text-orange-400',
        textColorHex: '#ea580c',
        bgPill: 'bg-orange-50 text-orange-705 border-orange-200 dark:bg-orange-950/20 dark:text-orange-400 dark:border-orange-900/30',
        borderPill: 'border-orange-200'
      };
    case 3:
      return {
        bg: 'linear-gradient(to top, #b45309, #d97706)',
        glow: 'none',
        textColor: 'text-amber-700 dark:text-amber-400',
        textColorHex: '#d97706',
        bgPill: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30',
        borderPill: 'border-amber-200'
      };
    case 4:
    default:
      return {
        bg: 'linear-gradient(to top, #0f766e, #0d9488)',
        glow: 'none',
        textColor: 'text-teal-700 dark:text-teal-400',
        textColorHex: '#0d9488',
        bgPill: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/20 dark:text-teal-400 dark:border-teal-900/30',
        borderPill: 'border-teal-200'
      };
  }
};

export default function ThermometerDisplay() {
  const {
    sessionId,
    data,
    layout,
    isLoading,
    setData,
    setLayout,
    resetAll,
    exportJSON,
    importJSON
  } = useThermometerData();

  // Gerenciamento de Slides ativos baseados em Layout
  const slides = SLIDE_DEFINITIONS.filter(slide => {
    if (slide.id === 'projetos_sociais' && !layout.showProjectsSlide) {
      return false;
    }
    return true;
  });

  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const slide = slides[currentSlideIndex] || slides[0] || SLIDE_DEFINITIONS[0];

  // Estados de Revelação (por slide id)
  const [revealedSlides, setRevealedSlides] = useState<Record<string, boolean>>({});
  const isCurrentRevealed = !!revealedSlides[slide.id];

  // Número animado flutuante para efeito de reveal
  const [animatedPercent, setAnimatedPercent] = useState(0);
  const animationFrameRef = useRef<number | null>(null);

  // Estados de modais
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLayoutOpen, setIsLayoutOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  // Modo Espera (Countdown)
  const [isCountdownActive, setIsCountdownActive] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(300); // 5 minutos padrão
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Modo de Tela Cheia Real (Presentation View)
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Mensagem flutuante para feedbacks
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'info' } | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Calcular o percentual atual bruto
  const numerator = Number(data[slide.numeratorKey]);
  const denominator = Number(data[slide.denominatorKey]);
  const realPercent = denominator > 0 ? (numerator / denominator) * 100 : 0;

  // Lógica do contador regressivo
  useEffect(() => {
    if (isCountdownActive && countdownSeconds > 0) {
      countdownTimerRef.current = setInterval(() => {
        setCountdownSeconds(prev => {
          if (prev <= 1) {
            setIsCountdownActive(false);
            showFeedback('O momento da Escola Sabatina começou! 🎼📖', 'success');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
    }
    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
    };
  }, [isCountdownActive]);

  // Sincronizar o número animado quando muda o slide ou revela seu resultado
  useEffect(() => {
    if (isCurrentRevealed) {
      // Começa a animar o número do 0 até o realPercent em 850ms
      const startTime = performance.now();
      const duration = 850;

      const animate = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing simples decimal para naturalidade cinética
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        const currentVal = easeProgress * realPercent;
        
        setAnimatedPercent(currentVal);

        if (progress < 1) {
          animationFrameRef.current = requestAnimationFrame(animate);
        } else {
          setAnimatedPercent(realPercent);
        }
      };

      animationFrameRef.current = requestAnimationFrame(animate);
    } else {
      setAnimatedPercent(0);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isCurrentRevealed, realPercent, slide.id]);

  // Garantir limites de index quando as abas mudam
  useEffect(() => {
    if (currentSlideIndex >= slides.length) {
      setCurrentSlideIndex(Math.max(0, slides.length - 1));
    }
  }, [slides.length, currentSlideIndex]);

  // Ouvintes de teclado para os slides
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return; // ignora se estiver digitando

      if (e.key === 'ArrowRight') {
        handleNextSlide();
      } else if (e.key === 'ArrowLeft') {
        handlePrevSlide();
      } else if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        handleToggleReveal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSlideIndex, slides.length, slide.id]);

  // Feedback flutuante
  const showFeedback = (text: string, type: 'success' | 'info' = 'info') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const handleNextSlide = () => {
    setCurrentSlideIndex(prev => (prev + 1) % slides.length);
  };

  const handlePrevSlide = () => {
    setCurrentSlideIndex(prev => (prev - 1 + slides.length) % slides.length);
  };

  const handleToggleReveal = () => {
    const nextState = !isCurrentRevealed;
    setRevealedSlides(prev => ({
      ...prev,
      [slide.id]: nextState
    }));
    
    if (nextState) {
      showFeedback('Resultado Revelado! 🏆✨', 'success');
    }
  };

  const handleResetReveal = () => {
    setRevealedSlides({});
    showFeedback('Resultados ocultados em todas as métricas. Prontos para nova apresentação!', 'info');
  };

  // Lógica do Fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch(err => {
          showFeedback('Erro ao ativar tela cheia no navegador.', 'info');
          console.error(err);
        });
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Monitorar se o usuário sai do fullscreen nativo voluntariamente (pelo ESC)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Formatar o timer
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const textSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${textSecs.toString().padStart(2, '0')}`;
  };

  // Ajustar o tempo countdown
  const adjustCountdown = (amount: number) => {
    setCountdownSeconds(prev => Math.max(10, prev + amount));
  };

  // Lógica de exportação para PDF (Slides Gerados com Alta Definição e Resolução Uniforme)
  const generatePDFReport = async () => {
    try {
      setIsGeneratingPDF(true);
      showFeedback('Prontinho para começar! Preparando o portfólio completo de slides em PDF...', 'info');

      // 1. Guardar estados originais do usuário para restaurar no final
      const originalSlideIndex = currentSlideIndex;
      const originalRevealed = { ...revealedSlides };

      // 2. Criar folha de documento A4 em formato Paisagem (Landscape)
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      // 3. Forçar todas as revelações para verdadeiro para que o resultado saia preenchido no PDF
      const tempRevealed = { ...revealedSlides };
      slides.forEach(s => {
        tempRevealed[s.id] = true;
      });
      setRevealedSlides(tempRevealed);

      // Esperar brevemente para registrar a revelação
      await new Promise(resolve => setTimeout(resolve, 150));

      // 4. Rodar ciclo sobre cada slide individualmente para captura independente
      for (let i = 0; i < slides.length; i++) {
        showFeedback(`Gerando slide ${i + 1} de ${slides.length}: ${slides[i].title}...`, 'info');

        // Mudar o slide programaticamente
        setCurrentSlideIndex(i);

        // Aguardar o tempo da animação cinética do termômetro e dos números se completarem (850ms)
        await new Promise(resolve => setTimeout(resolve, 950));

        const element = document.getElementById('presentation-main-area');
        if (!element) {
          throw new Error(`Área de apresentação do slide ${slides[i].title} não está legível.`);
        }

        // Para evitar problemas de compatibilidade do html2canvas com cores oklch e oklab das folhas de estilo do Tailwind,
        // limpamos temporariamente estas funções das tags de styles criadas pelo compilador, das regras ativas do CSSOM e dos estilos inline.
        const stylesToRestore: { element: HTMLStyleElement; originalText: string }[] = [];
        const ruleStylesToRestore: { rule: CSSStyleRule; property: string; value: string }[] = [];
        
        try {
          // 1. Sanitizar as tags de estilo <style> brutas
          const styleTags = Array.from(document.querySelectorAll('style'));
          for (const style of styleTags) {
            const text = style.textContent || '';
            if (hasUnsupportedColorFunction(text)) {
              stylesToRestore.push({ element: style, originalText: text });
              
              // Sanitização robusta contra parênteses aninhados (ex: oklch(from var(--color-blue-500) l c h))
              let sanitizedText = '';
              let charIndex = 0;
              while (charIndex < text.length) {
                if (text.startsWith('oklch(', charIndex) || text.startsWith('oklab(', charIndex)) {
                  const startToken = text.startsWith('oklch(', charIndex) ? 'oklch(' : 'oklab(';
                  charIndex += startToken.length;
                  let parenCount = 1;
                  while (charIndex < text.length && parenCount > 0) {
                    if (text[charIndex] === '(') {
                      parenCount++;
                    } else if (text[charIndex] === ')') {
                      parenCount--;
                    }
                    charIndex++;
                  }
                  sanitizedText += 'rgb(100, 110, 130)';
                } else {
                  sanitizedText += text[charIndex];
                  charIndex++;
                }
              }
              style.textContent = sanitizeUnsupportedColorFunctions(text);
            }
          }
        } catch (err) {
          console.warn('Erro passivo de sanitização na folha de estilos brute:', err);
        }

        try {
          // 2. Sanitizar regras ativas diretamente no CSSOM (document.styleSheets)
          for (const sheet of Array.from(document.styleSheets)) {
            try {
              const rules = Array.from(sheet.cssRules || sheet.rules || []);
              for (const rule of rules) {
                if (rule instanceof CSSStyleRule) {
                  const style = rule.style;
                  for (let k = 0; k < style.length; k++) {
                    const prop = style[k];
                    const val = style.getPropertyValue(prop);
                    if (hasUnsupportedColorFunction(val)) {
                      ruleStylesToRestore.push({ rule, property: prop, value: val });
                      
                      let sanitizedVal = '';
                      let charIndex = 0;
                      while (charIndex < val.length) {
                        if (val.startsWith('oklch(', charIndex) || val.startsWith('oklab(', charIndex)) {
                          const startToken = val.startsWith('oklch(', charIndex) ? 'oklch(' : 'oklab(';
                          charIndex += startToken.length;
                          let parenCount = 1;
                          while (charIndex < val.length && parenCount > 0) {
                            if (val[charIndex] === '(') {
                              parenCount++;
                            } else if (val[charIndex] === ')') {
                              parenCount--;
                            }
                            charIndex++;
                          }
                          sanitizedVal += 'rgb(100, 110, 130)';
                        } else {
                          sanitizedVal += val[charIndex];
                          charIndex++;
                        }
                      }
                      style.setProperty(prop, sanitizeUnsupportedColorFunctions(val));
                    }
                  }
                }
              }
            } catch (sheetErr) {
              // Ignorar erros CORS se alguma folha de estilo for de outro domínio
            }
          }
        } catch (err) {
          console.warn('Erro passivo de sanitização no CSSOM:', err);
        }

        // Criar o clone isolado e posicioná-lo fora da tela visível
        const clone = element.cloneNode(true) as HTMLElement;
        clone.style.position = 'fixed';
        clone.style.top = '0';
        clone.style.left = '-20000px';
        clone.style.width = '1200px';
        clone.style.height = '848px'; // Proporção áurea do A4 Landscape (~1.415)
        clone.style.display = 'flex';
        clone.style.flexDirection = 'row';
        clone.style.overflow = 'hidden';
        clone.style.boxSizing = 'border-box';
        clone.style.zIndex = '-99999';
        clone.style.pointerEvents = 'none';

        // Estilizar o fundo de acordo com o tema selecionado
        if (layout.theme === 'light') {
          clone.style.backgroundColor = '#f8fafc';
          clone.classList.add('bg-slate-50', 'text-slate-900');
        } else if (layout.theme === 'stage') {
          clone.style.backgroundColor = '#030712';
          clone.classList.add('bg-[#030712]', 'text-white');
        } else {
          clone.style.backgroundColor = '#090d16';
          clone.classList.add('bg-slate-950', 'text-white');
        }

        // Ajustar esteticamente as larguras e proporções de painéis para visualização de PDF
        const sections = Array.from(clone.querySelectorAll('section'));
        if (sections.length >= 2) {
          const leftSec = sections[0];
          const rightSec = sections[1];

          // Painel de Dados
          leftSec.style.width = '460px';
          leftSec.style.flex = 'none';
          leftSec.style.padding = '48px';
          leftSec.style.borderRight = '1px solid rgba(148, 163, 184, 0.15)';
          leftSec.style.display = 'flex';
          leftSec.style.flexDirection = 'column';
          leftSec.style.justifyContent = 'space-between';
          leftSec.style.height = '100%';
          leftSec.style.boxSizing = 'border-box';

          // Painel do Termômetro
          rightSec.style.flex = '1';
          rightSec.style.padding = '48px';
          rightSec.style.display = 'flex';
          rightSec.style.flexDirection = 'column';
          rightSec.style.justifyContent = 'center';
          rightSec.style.alignItems = 'center';
          rightSec.style.height = '100%';
          rightSec.style.boxSizing = 'border-box';
        }

        // Remover controles e botões de navegação interativos no clone para o PDF ficar limpo
        const navControls = clone.querySelector('.absolute.bottom-6.flex.items-center');
        if (navControls instanceof HTMLElement) {
          navControls.style.display = 'none';
        }

        const actionButtons = Array.from(clone.querySelectorAll('button'));
        actionButtons.forEach(btn => {
          if (btn.textContent?.includes('Revelar') || btn.textContent?.includes('Resultado') || btn.textContent?.includes('Anterior') || btn.textContent?.includes('Próximo')) {
            btn.style.display = 'none';
          }
        });

        // Corrigir possíveis bugs de distorção de escala de componentes de animação
        const scaledElements = Array.from(clone.querySelectorAll('[style*="scale"]'));
        scaledElements.forEach(item => {
          if (item instanceof HTMLElement) {
            item.style.transform = 'none';
            item.style.scale = '1';
          }
        });

        // Sanitizar estilos em linha (inline styles) nos elementos do clone
        try {
          const elementsInClone = [clone, ...Array.from(clone.querySelectorAll('*'))] as HTMLElement[];
          for (const el of elementsInClone) {
            if (el.style) {
              for (let k = 0; k < el.style.length; k++) {
                const prop = el.style[k];
                const val = el.style.getPropertyValue(prop);
                if (hasUnsupportedColorFunction(val)) {
                  let sanitizedVal = '';
                  let charIndex = 0;
                  while (charIndex < val.length) {
                    if (val.startsWith('oklch(', charIndex) || val.startsWith('oklab(', charIndex)) {
                      const startToken = val.startsWith('oklch(', charIndex) ? 'oklch(' : 'oklab(';
                      charIndex += startToken.length;
                      let parenCount = 1;
                      while (charIndex < val.length && parenCount > 0) {
                        if (val[charIndex] === '(') {
                          parenCount++;
                        } else if (val[charIndex] === ')') {
                          parenCount--;
                        }
                        charIndex++;
                      }
                      sanitizedVal += 'rgb(100, 110, 130)';
                    } else {
                      sanitizedVal += val[charIndex];
                      charIndex++;
                    }
                  }
                  el.style.setProperty(prop, sanitizeUnsupportedColorFunctions(val));
                }
              }
            }
          }
          sanitizeComputedStylesForPDF(element, clone);
        } catch (cloneErr) {
          console.warn('Erro passivo de sanitização nos estilos inline do clone:', cloneErr);
        }

        document.body.appendChild(clone);

        try {
          const canvas = await html2canvas(clone, {
            scale: 2, // Maior DPI garantindo nitidez vetorial excelente para impressão
            useCORS: true,
            backgroundColor: layout.theme === 'light' ? '#f8fafc' : (layout.theme === 'stage' ? '#030712' : '#090d16')
          });

          const imgData = canvas.toDataURL('image/png');

          // Adicionar nova página para slides subsequentes
          if (i > 0) {
            doc.addPage();
          }

          // Inserir a imagem em formato paisagem com preenchimento total de margem zero
          doc.addImage(imgData, 'PNG', 0, 0, 297, 210);

        } finally {
          // Remover o clone temporário do DOM
          if (clone.parentNode) {
            clone.parentNode.removeChild(clone);
          }
          // Restaurar folhas de estilos brutas originais
          for (const item of stylesToRestore) {
            try {
              item.element.textContent = item.originalText;
            } catch (err) {}
          }
          // Restaurar regras ativas originais no CSSOM
          for (const item of ruleStylesToRestore) {
            try {
              item.rule.style.setProperty(item.property, item.value);
            } catch (err) {}
          }
        }
      }

      // 5. Restaurar os estados originais de navegação e visualização do usuário
      setCurrentSlideIndex(originalSlideIndex);
      setRevealedSlides(originalRevealed);

      // 6. Finalizar e salvar o documento PDF
      const todayStr = new Date().toLocaleDateString('pt-BR');
      doc.save(`slides-termometro-escola-sabatina-${todayStr.replace(/\//g, '-')}.pdf`);
      showFeedback('Prontinho! Portfólio de slides em PDF gerado com sucesso.', 'success');

    } catch (e) {
      console.error(e);
      showFeedback('Ops, ocorreu um erro na geração do PDF de slides.', 'info');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const percentFormat = (percent: number) => {
    return `${percent.toFixed(layout.decimals)}%`;
  };

  // Coleta do Nível do Termômetro do slide atual
  const getSlideThermometerLevel = (percent: number) => {
    if (slide.id === 'ofertas' && percent < 100) {
      return getThermometerLevel(Math.min(percent, 75));
    }

    return getThermometerLevel(percent);
  };
  const animatedLevel = getSlideThermometerLevel(animatedPercent);
  const hasExcellentResult = slide.id === 'ofertas' ? realPercent >= 100 : realPercent >= 76;

  const getThemeClasses = () => {
    switch (layout.theme) {
      case 'dark':
        return {
          bg: 'bg-slate-950 text-white transition-colors duration-300',
          bgHex: '#090d16',
          card: 'bg-slate-900 border-slate-800 text-white rounded-2xl shadow-[0_12px_32px_rgba(0,0,0,0.35)] border',
          cardBgHex: '#1e293b',
          cardBorderHex: '#334155',
          label: 'text-slate-400 font-extrabold uppercase tracking-widest text-[11px]',
          inputText: 'text-white bg-slate-900 border-slate-800 focus:ring-amber-500',
          panelBorder: 'border-slate-800/60',
          subText: 'text-slate-300',
          subTextHex: '#94a3b8',
          headerBg: 'bg-[#012245] border-[#0f325a]',
          footerBg: 'bg-slate-900 border-slate-850',
          footerBgHex: '#0f172a',
          activeTab: 'bg-[#012245] text-[#e3a857] border-[#012245]',
          inactiveTab: 'bg-[#001730]/50 text-slate-400 hover:bg-[#001730]',
          btnSecondary: 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200 rounded-lg px-4 py-2 text-xs font-bold transition-all',
          btnPrimary: 'bg-blue-650 hover:bg-blue-700 text-white rounded-lg px-5 py-2 text-xs font-bold shadow-lg shadow-blue-900/50 transition-all',
          leftPanelBg: 'bg-slate-900/40'
        };
      case 'stage':
        return {
          bg: 'bg-[#030712] text-white font-sans selection:bg-purple-600 transition-colors duration-300',
          bgHex: '#030712',
          card: 'bg-[#0a0f1d] border-slate-800 text-white shadow-[0_15px_35px_rgba(0,0,0,0.5)] rounded-2xl border',
          cardBgHex: '#0a0f1d',
          cardBorderHex: '#1e293b',
          label: 'text-purple-300 font-mono tracking-wider font-extrabold uppercase text-[11px]',
          inputText: 'text-purple-300 bg-black/60 border-purple-900 focus:ring-purple-500',
          panelBorder: 'border-slate-800/80',
          subText: 'text-slate-200',
          subTextHex: '#cbd5e1',
          headerBg: 'bg-[#012245] border-[#0f325a]',
          footerBg: 'bg-slate-950 border-t border-purple-650/40',
          footerBgHex: '#030712',
          activeTab: 'bg-purple-950 border-purple-500 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.2)]',
          inactiveTab: 'bg-black border-slate-900 text-slate-550 hover:text-slate-300',
          btnSecondary: 'bg-purple-900/80 hover:bg-purple-800 border-purple-700 text-purple-105 rounded-full px-5 py-2.5 text-xs font-bold transition-all',
          btnPrimary: 'bg-purple-650 hover:bg-purple-750 text-white rounded-full px-6 py-2.5 text-xs font-bold shadow-lg shadow-purple-900/50 transition-all',
          leftPanelBg: 'bg-black/40'
        };
      default: // light
        return {
          bg: 'bg-slate-50 text-slate-900 transition-colors duration-300',
          bgHex: '#f8fafc',
          card: 'bg-white border-slate-200 text-slate-905 shadow-[0_10px_30px_rgba(0,0,0,0.04)] border rounded-2xl',
          cardBgHex: '#ffffff',
          cardBorderHex: '#e2e8f0',
          label: 'text-slate-550 font-extrabold uppercase tracking-widest text-[11px]',
          inputText: 'text-slate-800 bg-white border-slate-200 focus:ring-blue-500',
          panelBorder: 'border-slate-200/80',
          subText: 'text-slate-600',
          subTextHex: '#475569',
          headerBg: 'bg-[#012245] border-[#0f325a]',
          footerBg: 'bg-white border-t border-slate-200',
          footerBgHex: '#ffffff',
          activeTab: 'bg-indigo-50 text-indigo-755 border-indigo-500 font-bold',
          inactiveTab: 'bg-white border-slate-200 text-slate-500 hover:bg-slate-105',
          btnSecondary: 'bg-slate-100 hover:bg-slate-200 border-slate-300/40 text-slate-705 rounded-lg px-4 py-2 text-xs font-bold transition-all',
          btnPrimary: 'bg-[#012245] hover:bg-[#0c2d54] text-white rounded-lg px-5 py-2 text-xs font-bold shadow-lg shadow-indigo-100 transition-all',
          leftPanelBg: 'bg-slate-100'
        };
    }
  };

  const themeTheme = getThemeClasses();
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-500 animate-pulse">Sincronizando Banco de Dados Local...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`min-h-screen flex flex-col font-sans transition-colors duration-300 ${themeTheme.bg}`}
      style={{ fontSize: `${layout.textSize}px` }}
    >
      {/* 1. Header do Aplicativo (Sleek Adventist Institutional Style) */}
      <header className="h-21 px-6 sm:px-8 border-b flex items-center justify-between shadow-md flex-shrink-0 sticky top-0 z-30 bg-gradient-to-r from-[#011a35] via-[#012245] to-[#0a2f5c] border-[#0f325a] text-white">
        <div className="flex items-center gap-3.5">
          <div className="w-10.5 h-10.5 bg-gradient-to-br from-[#0c2d54] to-[#012245] rotate-3 text-white rounded-xl flex items-center justify-center shadow-lg border border-indigo-400/25 relative overflow-hidden group">
            <Flame size={23} className="text-amber-400 fill-amber-400/20 group-hover:scale-110 transition-transform" />
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500" />
          </div>
          <div>
            <h1 className="text-sm sm:text-base md:text-lg font-black text-white tracking-tight uppercase leading-none">
              Escola Sabatina
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[9px] text-amber-400 font-black tracking-widest uppercase font-mono bg-amber-500/15 px-1.5 py-0.5 rounded border border-amber-500/20">
                OFFLINE-FIRST
              </span>
              <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider hidden sm:inline">
                🌡️ TERMÔMETRO DE DESEMPENHO
              </span>
            </div>
          </div>
        </div>

        {/* CONTROLES / BOTÕES DE UTILIDADES OPERACIONAIS COMPATÍVEIS COM SLEEK DESIGN */}
        <div className="flex items-center gap-2">
          {/* Espera countdown */}
          <button
            onClick={() => setIsCountdownActive(!isCountdownActive)}
            title="Hora de Espera (Timer)"
            className={`p-2 flex items-center justify-center rounded-full w-9.5 h-9.5 transition-all cursor-pointer ${
              isCountdownActive 
                ? 'bg-amber-500 text-white shadow-md animate-pulse border-amber-500' 
                : 'bg-white/10 hover:bg-white/20 text-white border border-white/10 shadow-sm'
            }`}
          >
            <Play size={15} />
          </button>
          
          {/* Tela cheia */}
          <button
            onClick={toggleFullscreen}
            title="Modo Apresentação (Tela Cheia)"
            className="p-2 flex items-center justify-center rounded-full w-9.5 h-9.5 bg-white/10 hover:bg-white/20 text-white border border-white/10 shadow-sm transition-colors cursor-pointer"
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>

          {/* Preset design selection */}
          <button
            onClick={() => setIsLayoutOpen(true)}
            title="Presets & Temas"
            className="p-2 flex items-center justify-center rounded-full w-9.5 h-9.5 bg-white/10 hover:bg-white/20 text-white border border-white/10 shadow-sm transition-colors cursor-pointer"
          >
            <LayoutIcon size={15} />
          </button>

          {/* Grupo WhatsApp */}
          <a
            href="https://chat.whatsapp.com/BKkRZhcOjjgFWc6kxTQQoB"
            target="_blank"
            rel="noopener noreferrer"
            title="Entrar no Grupo do WhatsApp"
            className="flex items-center gap-1.5 px-3 md:px-4 py-2 bg-emerald-600 hover:bg-emerald-550 active:bg-emerald-700 rounded-full text-xs sm:text-sm font-black text-white shadow-md border border-emerald-500/20 transition-all hover:scale-[1.02]"
          >
            <MessageCircle size={15} className="fill-white/15" />
            <span className="hidden sm:inline">Grupo</span>
          </a>

          {/* Informações / Sobre */}
          <button
            onClick={() => setIsAboutOpen(true)}
            title="Sobre o Aplicativo & Allan Instagram"
            className="p-2 flex items-center justify-center rounded-full w-9.5 h-9.5 bg-white/10 hover:bg-white/20 text-amber-400 hover:text-amber-300 border border-white/10 shadow-sm transition-colors cursor-pointer"
          >
            <HelpCircle size={15} />
          </button>

          {/* Ajustes popup */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            title="Editar Métricas e Dados"
            className="flex items-center gap-1.5 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full text-xs sm:text-sm font-semibold text-white border border-white/10 shadow-sm transition-colors cursor-pointer"
          >
            <Settings size={15} />
            <span className="hidden md:inline">Ajustes</span>
          </button>

          {/* Exportar PDF principal de ação */}
          <button
            onClick={generatePDFReport}
            disabled={isGeneratingPDF}
            className="flex items-center gap-1.5 px-4.5 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 rounded-full text-xs sm:text-sm font-extrabold text-navy-950 shadow-md transition-all cursor-pointer border border-amber-400"
          >
            <Download size={15} />
            <span>{isGeneratingPDF ? 'Salvando...' : 'Exportar PDF'}</span>
          </button>
        </div>
      </header>

      {/* Navigation Tabs (Sleek Theme Dynamic style) */}
      <nav className={`border-b flex-shrink-0 transition-colors duration-300 ${layout.theme === 'light' ? 'bg-white border-slate-205' : 'bg-[#0f172a] border-slate-800'}`}>
        <div className="flex justify-center gap-3 py-4.5 flex-wrap px-6 max-w-7xl mx-auto">
          {slides.map((tab, idx) => {
            const isActive = slide.id === tab.id;
            let barColor = 'bg-slate-400';
            let activeColorStyles = '';
            let btnBg = '';
            
            if (tab.id === 'presenca') { 
              barColor = 'bg-rose-500'; 
              activeColorStyles = isActive ? 'text-rose-600 dark:text-rose-455 border-rose-500/50 shadow-[0_4px_12px_rgba(244,63,94,0.12)] bg-rose-500/5 dark:bg-rose-950/15' : '';
              btnBg = isActive ? 'bg-rose-50 dark:bg-rose-950/20' : 'hover:bg-rose-50/50 dark:hover:bg-rose-950/5';
            } else if (tab.id === 'comunhao') { 
              barColor = 'bg-emerald-500'; 
              activeColorStyles = isActive ? 'text-emerald-600 dark:text-emerald-450 border-emerald-500/50 shadow-[0_4px_12px_rgba(16,185,129,0.12)] bg-emerald-500/5 dark:bg-emerald-950/15' : '';
              btnBg = isActive ? 'bg-emerald-50 dark:bg-emerald-950/20' : 'hover:bg-emerald-50/50 dark:hover:bg-emerald-950/5';
            } else if (tab.id === 'pequenos_grupos') { 
              barColor = 'bg-amber-500'; 
              activeColorStyles = isActive ? 'text-amber-600 dark:text-amber-450 border-amber-500/50 shadow-[0_4px_12px_rgba(245,158,11,0.12)] bg-amber-500/5 dark:bg-amber-950/15' : '';
              btnBg = isActive ? 'bg-amber-50 dark:bg-amber-950/20' : 'hover:bg-amber-50/50 dark:hover:bg-amber-950/5';
            } else if (tab.id === 'estudos_biblicos') { 
              barColor = 'bg-orange-500'; 
              activeColorStyles = isActive ? 'text-orange-600 dark:text-orange-455 border-orange-500/50 shadow-[0_4px_12px_rgba(249,115,22,0.12)] bg-orange-500/5 dark:bg-orange-950/15' : '';
              btnBg = isActive ? 'bg-orange-50 dark:bg-orange-950/20' : 'hover:bg-orange-50/50 dark:hover:bg-orange-950/5';
            } else if (tab.id === 'projetos_sociais') { 
              barColor = 'bg-indigo-500'; 
              activeColorStyles = isActive ? 'text-indigo-600 dark:text-indigo-400 border-indigo-500/50 shadow-[0_4px_12px_rgba(99,102,241,0.12)] bg-indigo-505/5 dark:bg-indigo-950/15' : '';
              btnBg = isActive ? 'bg-indigo-50 dark:bg-indigo-950/20' : 'hover:bg-indigo-50/55 dark:hover:bg-indigo-950/5';
            } else if (tab.id === 'ofertas') { 
              barColor = 'bg-teal-500'; 
              activeColorStyles = isActive ? 'text-teal-600 dark:text-teal-400 border-teal-500/50 shadow-[0_4px_12px_rgba(20,184,166,0.12)] bg-teal-500/5 dark:bg-teal-950/15' : '';
              btnBg = isActive ? 'bg-teal-50 dark:bg-teal-950/20' : 'hover:bg-teal-50/50 dark:hover:bg-teal-950/5';
            }

            return (
              <button
                key={tab.id}
                onClick={() => {
                  setCurrentSlideIndex(idx);
                  showFeedback(`Carregado indicador: ${tab.title}`, 'info');
                }}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all cursor-pointer ${
                  isActive 
                    ? `border-indigo-500 font-extrabold ${activeColorStyles} scale-103 shadow-md` 
                    : `border-slate-205 dark:border-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:shadow-xs ${btnBg}`
                }`}
              >
                <div className={`p-1.5 rounded-lg ${isActive ? 'bg-white dark:bg-slate-900 shadow-sm' : 'bg-slate-100 dark:bg-slate-800'}`}>
                  {getSlideIcon(tab.icon, 14, isActive ? '' : 'text-slate-400')}
                </div>
                <div className="flex flex-col items-start leading-none">
                  <span className="text-[9px] uppercase tracking-widest font-black text-slate-400 dark:text-slate-505">
                    Série {idx + 1}
                  </span>
                  <span className="text-xs font-bold tracking-tight mt-0.5">
                    {tab.id === 'comunhao' ? 'Estudos Diários' : tab.title.split(' ')[0]}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </nav>

      {/* 2. Feedback flutuante em cima */}
      <AnimatePresence>
        {feedbackMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className={`fixed top-18 right-6 z-40 px-5.5 py-3 rounded-xl shadow-lg border border-slate-200 flex items-center space-x-2 text-xs font-semibold ${
              feedbackMsg.type === 'success' 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                : 'bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-800'
            }`}
          >
            <Sparkles size={14} className={feedbackMsg.type === 'success' ? 'text-emerald-500 animate-spin' : 'text-blue-500'} />
            <span>{feedbackMsg.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Se Modo Espera (Countdown) estiver Ativo e Visível */}
      <AnimatePresence>
        {isCountdownActive && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 bg-gradient-to-tr from-slate-900 to-indigo-950 text-white flex flex-col items-center justify-center p-8 text-center relative overflow-hidden"
          >
            {/* Efeitos orbitais no fundo */}
            <div className="absolute w-[500px] h-[500px] bg-indigo-500/10 blur-[80px] rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
            <div className="absolute w-[300px] h-[300px] bg-rose-500/5 blur-[50px] rounded-full bottom-10 right-10" />

            <div className="relative z-10 space-y-6 max-w-xl">
              <span className="text-xs uppercase font-extrabold tracking-widest text-rose-400 bg-rose-500/10 px-3.5 py-1.5 rounded-full border border-rose-500/20 font-mono">
                ⏱️ Contagem Regressiva para Escola Sabatina
              </span>
              
              <h2 className="text-6xl md:text-8xl font-black font-mono tracking-tight text-white drop-shadow-md select-none">
                {formatTime(countdownSeconds)}
              </h2>

              <p className="text-slate-300 text-sm md:text-base tracking-wide italic">
                "Este é o momento de adoração, comunhão e preparo espiritual. Reúna sua classe e pegue o seu guia da lição!"
              </p>

              {/* Controles do timer */}
              <div className="flex gap-2.5 justify-center items-center pt-4">
                <button
                  onClick={() => adjustCountdown(-60)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 rounded-lg cursor-pointer"
                >
                  - 1 Min
                </button>
                <button
                  onClick={() => adjustCountdown(60)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 rounded-lg cursor-pointer"
                >
                  + 1 Min
                </button>
                <button
                  onClick={() => setIsCountdownActive(false)}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-lg cursor-pointer transition-all"
                >
                  Pausar Contagem
                </button>
                <button
                  onClick={() => {
                    setCountdownSeconds(300);
                    setIsCountdownActive(false);
                  }}
                  className="p-2.5 bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg border border-slate-750 cursor-pointer"
                  title="Reiniciar Timer"
                >
                  <RotateCcw size={14} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. Painel Principal do Dashboard (Oculto se timer estiver rolando) */}
      {!isCountdownActive && (
        <main className="flex-1 flex flex-col md:flex-row" id="presentation-main-area">
          {/* PAINEL ESQUERDO: ENTRADA E CARDS INFORMATIVOS */}
          <section  
            className={`border-r p-8 flex flex-col justify-between transition-all duration-300 ${themeTheme.panelBorder} ${layout.theme === 'light' ? 'bg-[#f8fafc]' : 'bg-[#090d16]/30'}`}
            style={{ width: `${layout.leftPanelWidth}%`, minWidth: '320px' }}
          >
            <div className="space-y-6">
              {/* Título do slide ativo */}
              <div>
                <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 font-extrabold mb-1">
                  {getSlideIcon(slide.icon, layout.iconSize + 2, "animate-pulse")}
                  <span className="text-[10px] font-black uppercase tracking-widest font-mono">
                    Indicador {currentSlideIndex + 1} de {slides.length}
                  </span>
                </div>
                <h2 
                  className="font-black tracking-tight mt-1 text-[#012245] dark:text-white leading-tight"
                  style={{ fontSize: `${layout.titleSize}px` }}
                >
                  {slide.title}
                </h2>
                <div className="w-16 h-1 bg-[#012245] dark:bg-amber-500 rounded-full my-3.5" />
                <p className="text-slate-650 dark:text-slate-300 text-sm max-w-md leading-relaxed font-medium">
                  {slide.description}
                </p>
              </div>

              {/* Cards de Exibição de Resumo de Dados (Esquerda) */}
              {layout.showPresentationCards && (
                <div className={`grid gap-4.5 ${layout.stackLeftCards ? 'grid-cols-1' : 'grid-cols-2'}`}>
                  {/* Numerador Card */}
                  <div className={`p-4.5 rounded-2xl border flex flex-col justify-between hover:scale-[1.02] transition-all bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-md`}>
                    <span className="text-[10px] uppercase font-black tracking-widest text-slate-450 dark:text-slate-400 block mb-1">
                      {slide.numeratorLabel}
                    </span>
                    <div className="flex items-baseline space-x-1 mt-1">
                      <span className="text-4xl font-black font-mono tracking-tight text-[#012245] dark:text-amber-400">
                        {numerator}
                      </span>
                    </div>
                  </div>

                  {/* Denominador Card */}
                  <div className={`p-4.5 rounded-2xl border flex flex-col justify-between hover:scale-[1.02] transition-all bg-white dark:bg-slate-900 border-slate-201 dark:border-slate-800 shadow-md`}>
                    <span className="text-[10px] uppercase font-black tracking-widest text-slate-450 dark:text-slate-400 block mb-1">
                      {slide.denominatorLabel}
                    </span>
                    <div className="flex items-baseline space-x-1 mt-1">
                      <span className="text-4xl font-black font-mono tracking-tight text-slate-700 dark:text-slate-200">
                        {denominator}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Botão Principal de Revelar Resultado */}
              <div className="pt-2">
                {!isCurrentRevealed ? (
                  <button
                    onClick={handleToggleReveal}
                    className="w-full py-4 px-6 bg-[#012245] hover:bg-[#0c2d54] text-white rounded-xl font-extrabold shadow-md flex items-center justify-center space-x-2.5 transition-all text-xs uppercase tracking-wider cursor-pointer scale-100 hover:scale-[1.02] border border-[#0f325a]"
                  >
                    <Eye size={16} className="text-white" />
                    <span>Revelar Resultado do Sábado</span>
                  </button>
                ) : (
                  <div className="flex space-x-2">
                    <button
                      onClick={handleToggleReveal}
                      className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-sm"
                    >
                      Ocultar Resultado
                    </button>
                    <button
                      onClick={handleResetReveal}
                      title="Zerar status de revelações de todas as abas"
                      className="px-5 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-all border border-red-500 text-xs font-black cursor-pointer shadow-md"
                    >
                      Zerar Tudo
                    </button>
                  </div>
                )}
              </div>

              {/* Editar Dados de Metas e Reais Shortcut button */}
              <div className="pt-1">
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="w-full py-3.5 border border-dashed border-slate-350 dark:border-slate-700 bg-white/45 dark:bg-slate-900/10 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-2xl text-slate-500 hover:text-[#011a35] dark:text-slate-400 dark:hover:text-amber-400 hover:border-indigo-500 transition-all font-bold text-xs flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <Settings size={13} />
                  <span>Configurar Metas & Valores Reais</span>
                </button>
              </div>
            </div>

            {/* Texto de Ajuda / Informações Metodológicas */}
            <div className="pt-6 border-t border-slate-200/85 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
              💡 <strong className="font-bold text-indigo-650 dark:text-indigo-400 uppercase font-mono tracking-tight">Dica:</strong> {slide.helpText}
            </div>
          </section>

          {/* PAINEL DIREITO: INTERATIVIDADE DO TERMÔMETRO VISUAL (Institutional & Sleek Symmetrical Design) */}
          <section className={`flex-1 p-6 xl:p-12 flex flex-col items-center justify-center relative min-h-[480px] overflow-hidden select-none ${layout.theme === 'light' ? 'bg-slate-50' : 'bg-[#090d16]'}`}>
            
            <div 
              className="flex items-center space-x-12 select-none z-10 transition-transform"
              style={{ transform: `scale(${layout.resultScale})` }}
            >
              {/* TERMÔMETRO DE VIDRO SEAMLESS */}
              <div className="flex flex-col items-center relative py-6">
                
                {/* Tubo de vidro principal e bulbo integrado em flexbox vertical seguro */}
                <div className="relative flex flex-col items-center">
                  
                  {/* NOME EM CIMA - Alinhado perfeitamente com o centro */}
                  <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4 font-mono leading-none">
                    MERCÚRIO
                  </span>

                  {/* Corpo do termômetro com escala lateral absoluta */}
                  <div className="relative flex flex-col items-center">
                    
                    {/* Escala Graduada Lateral Absoluta - Alinhada perfeitamente com o tubo h-64 */}
                    <div className="absolute right-full mr-4.5 top-0 h-64 flex flex-col justify-between text-[11px] font-black text-slate-450 dark:text-slate-500 font-mono text-right select-none w-10 py-1.5 pointer-events-none">
                      <span className="text-indigo-600 dark:text-indigo-400 leading-none">100%</span>
                      <span className="leading-none">75%</span>
                      <span className="leading-none">50%</span>
                      <span className="leading-none">25%</span>
                      <span className="text-slate-500 font-bold leading-none">0%</span>
                    </div>

                    {/* Tubo Principal com Bordas Sem Emendas de Base */}
                    <div className="w-10 h-64 bg-slate-205/30 dark:bg-slate-900/80 border-2 border-b-0 border-slate-300 dark:border-slate-800 rounded-t-full relative shadow-[0_2px_8px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col justify-end z-10">
                      
                      {/* Gradiente Interno de Medição Real */}
                      <motion.div
                        initial={{ height: '0%' }}
                        animate={{ height: isCurrentRevealed ? `${Math.min(100, realPercent)}%` : '0%' }}
                        transition={{ type: 'spring', stiffness: 50, damping: 15 }}
                        className="w-full rounded-t-full relative"
                        style={{
                          background: isCurrentRevealed ? getLevelGradientAndGlow(animatedLevel.level).bg : '#ef4444'
                        }}
                      >
                        {/* Efeito de Reflexo Glossy Realista de Vidro */}
                        <div className="absolute left-1.5 top-0 w-2 h-full bg-gradient-to-r from-white/30 to-transparent rounded-full" />
                        
                        {/* Soft pulsing shine overlay when reached excellent */}
                        {isCurrentRevealed && hasExcellentResult && (
                          <div className="absolute inset-0 bg-white/10 animate-pulse" />
                        )}
                      </motion.div>
                    </div>

                    {/* Bulbo de Esfera (Reserva no Pé) - Seamless connection via z-20 overlay and -mt offset */}
                    <div className="w-16 h-16 rounded-full bg-slate-200/50 dark:bg-slate-950/90 border-2 border-slate-300 dark:border-slate-800 shadow-[0_4px_12px_rgba(0,0,0,0.08)] flex items-center justify-center relative -mt-[18px] z-20">
                      <motion.div
                        animate={{ 
                          scale: isCurrentRevealed && hasExcellentResult ? [1, 1.04, 1] : 1 
                        }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="w-11 h-11 rounded-full absolute inset-0 m-auto overflow-hidden transition-all duration-500"
                        style={{
                          background: isCurrentRevealed ? getLevelGradientAndGlow(animatedLevel.level).bg : '#ef4444'
                        }}
                      >
                        {/* Reflexo Glossy 3D no Bulbo */}
                        <div className="absolute left-2.5 top-2.5 w-3 h-3 bg-gradient-to-br from-white/50 to-transparent rounded-full blur-[0.4px]" />
                      </motion.div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ROSTO EMOTIVO & PERCENTUAL FLUTUANTE */}
              <div className="flex flex-col items-center space-y-6">
                
                {/* Carinha animada com reflexo de fundo institucional */}
                <div className="relative p-2.5 rounded-full bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800/80 shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
                  <AnimatedFace
                    type={isCurrentRevealed ? animatedLevel.emoticon as any : 'mystery'}
                    scale={1.3}
                    revealed={isCurrentRevealed}
                  />
                </div>

                {/* Numeração Percentual Digital */}
                <div className="text-center">
                  <div className="text-4xl md:text-5xl font-black font-mono tracking-tight text-slate-850 dark:text-white flex items-baseline justify-center">
                    <span>{isCurrentRevealed ? percentFormat(animatedPercent) : '??%'}</span>
                  </div>
                  
                  {/* Status Badges */}
                  <div className="mt-3.5 flex justify-center">
                    <span 
                      className={`text-[9px] font-extrabold uppercase tracking-widest font-mono px-3.5 py-1.5 rounded-full border shadow-sm transition-all duration-300 ${
                        isCurrentRevealed 
                          ? `${getLevelGradientAndGlow(animatedLevel.level).bgPill} ${getLevelGradientAndGlow(animatedLevel.level).borderPill}`
                          : 'bg-slate-100 text-slate-400 border-slate-200'
                      }`}
                    >
                      {isCurrentRevealed ? animatedLevel.label : 'Aguardando revelação...'}
                    </span>
                  </div>
                </div>

                {/* Horizontal Performance Gauge Bar (Sleek Theme Specific Feature) */}
                {isCurrentRevealed && (
                  <div className="w-58 mt-4 select-none">
                    <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-[#012245] dark:text-slate-400 font-mono mb-2">
                      <span>M. Baixo</span>
                      <span>Baixo</span>
                      <span>Regular</span>
                      <span>Bom</span>
                      <span className="text-emerald-500">Excelente</span>
                    </div>
                    {/* Multi-colored tracker */}
                    <div className="h-2.5 w-full rounded-full bg-slate-200 dark:bg-slate-850 overflow-hidden flex relative border border-transparent shadow-[inset_0_1px_3px_rgba(0,0,0,0.1)]">
                      <div className="w-[49%] h-full bg-[#f43f5e]" />
                      <div className="w-[1%] h-full bg-transparent" />
                      <div className="w-[19%] h-full bg-[#f97316]" />
                      <div className="w-[1%] h-full bg-transparent" />
                      <div className="w-[20%] h-full bg-[#10b981]" />
                      <div className="w-[10%] h-full bg-[#0d9488]" />
                      
                      {/* Vertical tracker indicator cursor line */}
                      <div 
                        className="absolute -top-0.5 bottom-0.5 w-2 h-3.5 bg-slate-900 dark:bg-white border-2 border-white dark:border-slate-950 shadow-lg rounded-full transition-all duration-500"
                        style={{ left: `${Math.min(100, realPercent)}%`, transform: 'translateX(-50%)' }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Controle de navegação manual entre Slides no rodapé direito */}
            <div className="absolute bottom-6 flex items-center space-x-3.5 z-10 bg-white/80 dark:bg-slate-900/85 p-2.5 rounded-full border border-slate-200 dark:border-slate-800 shadow-[0_8px_30px_rgba(0,0,0,0.1)] backdrop-blur-md">
              <button
                onClick={handlePrevSlide}
                className="p-1 px-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer font-bold text-xs flex items-center gap-1"
                title="Aba Anterior"
              >
                <ChevronLeft size={16} />
                <span className="hidden sm:inline">Anterior</span>
              </button>
              <div className="h-4 w-px bg-slate-250 dark:bg-slate-800" />
              <span className="text-xs font-mono font-black text-slate-600 dark:text-slate-350">
                {currentSlideIndex + 1} / {slides.length}
              </span>
              <div className="h-4 w-px bg-slate-250 dark:bg-slate-800" />
              <button
                onClick={handleNextSlide}
                className="p-1 px-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer font-bold text-xs flex items-center gap-1"
                title="Próxima Aba"
              >
                <span className="hidden sm:inline">Próxima</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </section>
        </main>
      )}

      {/* 5. Resumo consolidador em fita de cards individuais premium */}
      {layout.showFooterSummary && !isCountdownActive && (
        <footer className={`px-6 py-5 border-t select-none transition-colors duration-300 ${themeTheme.footerBg}`}>
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-5">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-6 bg-[#012245] dark:bg-amber-500 rounded-full" />
              <div>
                <h4 className="text-[10px] sm:text-xs font-black tracking-widest text-[#012245] dark:text-slate-300 uppercase leading-none">
                  Consolidado Geral
                </h4>
                <p className="text-[9px] text-slate-400 font-bold uppercase mt-1 leading-none font-mono">
                  Sábado Corrente
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 sm:gap-4.5">
              {/* Presença Card */}
              <div className="flex items-center gap-3 px-4.5 py-2.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-xl shadow-xs transition-transform hover:scale-[1.02]">
                <div className="p-1.5 bg-rose-500 text-white rounded-lg">
                  <Users size={13} strokeWidth={2.5} />
                </div>
                <div>
                  <span className="text-[8px] uppercase tracking-widest font-black text-slate-400 block leading-none">
                    Presença
                  </span>
                  <span className="text-xs sm:text-sm font-black font-mono text-rose-600 dark:text-rose-400 leading-none mt-1 inline-block">
                    {percentFormat((data.membersPresent / data.totalMembers) * 100)}
                  </span>
                </div>
              </div>

              {/* Estudo Card */}
              <div className="flex items-center gap-3 px-4.5 py-2.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-xl shadow-xs transition-transform hover:scale-[1.02]">
                <div className="p-1.5 bg-emerald-500 text-white rounded-lg">
                  <BookOpen size={13} strokeWidth={2.5} />
                </div>
                <div>
                  <span className="text-[8px] uppercase tracking-widest font-black text-slate-400 block leading-none">
                    Estudos Diários
                  </span>
                  <span className="text-xs sm:text-sm font-black font-mono text-emerald-600 dark:text-emerald-400 leading-none mt-1 inline-block">
                    {percentFormat((data.communion / data.totalMembers) * 100)}
                  </span>
                </div>
              </div>

              {/* Ofertas Card */}
              <div className="flex items-center gap-3 px-4.5 py-2.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-xl shadow-xs transition-transform hover:scale-[1.02]">
                <div className="p-1.5 bg-amber-500 text-[#011a35] rounded-lg">
                  <Coins size={13} strokeWidth={2.5} />
                </div>
                <div>
                  <span className="text-[8px] uppercase tracking-widest font-black text-slate-400 block leading-none">
                    Ofertas
                  </span>
                  <span className="text-xs sm:text-sm font-black font-mono text-amber-600 dark:text-amber-400 leading-none mt-1 inline-block">
                    {percentFormat(data.weeklyGoal > 0 ? (data.weeklyAverage / data.weeklyGoal) * 105 : 0)}
                  </span>
                </div>
              </div>

              {/* ID da sessão */}
              <div className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-xl text-[9px] font-bold text-slate-500 font-mono tracking-tight shadow-xs">
                Sessão: <span className="font-black text-slate-750 dark:text-slate-350">{sessionId.substring(0, 8)}</span>
              </div>
            </div>
          </div>
        </footer>
      )}

      {/* 6. MODAL DE CONFIGURAÇÃO DE DADOS MOLARES ENTRADOS */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        data={data}
        layout={layout}
        setData={setData}
        setLayout={setLayout}
        resetAll={resetAll}
        exportJSON={exportJSON}
        importJSON={importJSON}
      />

      {/* 7. MODAL DE AJUSTE ADICIONAL DE DESIGN E LAYOUTS */}
      <LayoutSettingsModal
        isOpen={isLayoutOpen}
        onClose={() => setIsLayoutOpen(false)}
        layout={layout}
        setLayout={setLayout}
      />

      {/* 8. MODAL SOBRE / DESENVOLVEDOR */}
      <AboutModal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
      />

      {/* Mini Assinatura Externa de Apoio */}
      <div className="py-4 text-center border-t border-slate-150 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/20 text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-center gap-4 flex-wrap">
        <span>Desenvolvido por <a href="https://www.instagram.com/allan.psxd1" target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-amber-500 hover:underline font-extrabold transition-all hover:scale-[1.01]">Allan</a></span>
        <span className="text-slate-300 dark:text-slate-700">|</span>
        <a href="https://chat.whatsapp.com/BKkRZhcOjjgFWc6kxTQQoB" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-emerald-650 dark:text-emerald-400 hover:underline transition-all hover:scale-[1.01]">
          <MessageCircle size={10} className="fill-emerald-650/10" />
          <span>Grupo Oficial WhatsApp</span>
        </a>
      </div>
    </div>
  );
}
