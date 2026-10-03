/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, type CSSProperties } from 'react';
import { SLIDE_DEFINITIONS } from '../types';
import { getThermometerLevel } from '../lib/layout';
import { useThermometerData } from '../hooks/useThermometerData';
import AnimatedFace from './AnimatedFaces';
import SettingsModal from './SettingsModal';
import LayoutSettingsModal from './LayoutSettingsModal';
import AboutModal from './AboutModal';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Settings, Layout as LayoutIcon, Play, RotateCcw,
  Download, ChevronLeft, ChevronRight, Sparkles,
  Eye, EyeOff, HelpCircle, Users, BookOpen, HeartHandshake,
  Compass, Coins, Maximize2, Minimize2, Flame
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

export default function ThermometerDisplay() {
  const {
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
  // O palco sempre apresenta os seis indicadores definidos para a Escola Sabatina.
  // A preferência antiga de esconder projetos fica preservada no JSON, mas não remove
  // uma aba do novo rodapé de navegação.
  const slides = SLIDE_DEFINITIONS;

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
        clone.style.width = `${element.clientWidth}px`;
        clone.style.height = `${element.clientHeight}px`;
        clone.style.display = 'flex';
        clone.style.flexDirection = 'row';
        clone.style.overflow = 'hidden';
        clone.style.boxSizing = 'border-box';
        clone.style.zIndex = '-99999';
        clone.style.pointerEvents = 'none';

        // O PDF usa as mesmas três colunas e o fundo da apresentação.
        clone.style.display = 'grid';
        clone.style.gridTemplateColumns = '34% 25% 41%';
        clone.style.backgroundColor = '#08182d';
        clone.style.color = '#f5f8ff';
        clone.style.setProperty('--stage-gold', '#f4ce83');
        clone.style.setProperty('--result-color', getComputedStyle(containerRef.current!).getPropertyValue('--result-color'));
        clone.style.fontFamily = 'ui-sans-serif, system-ui, sans-serif';
        const actions = clone.querySelector('.stage-actions') as HTMLElement | null;
        if (actions) actions.style.display = 'none';

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
            backgroundColor: '#08182d'
          });

          const imgData = canvas.toDataURL('image/png');

          // Adicionar nova página para slides subsequentes
          if (i > 0) {
            doc.addPage();
          }

          // Preservar a proporção da apresentação na página A4 paisagem.
          const imageHeight = Math.min(210, 297 * canvas.height / canvas.width);
          const imageWidth = imageHeight * canvas.width / canvas.height;
          doc.setFillColor(8, 24, 45);
          doc.rect(0, 0, 297, 210, 'F');
          doc.addImage(imgData, 'PNG', (297 - imageWidth) / 2, (210 - imageHeight) / 2, imageWidth, imageHeight);

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

  const indicatorNames: Record<string, string> = {
    presenca: 'Presença', comunhao: 'Comunhão', pequenos_grupos: 'Pequenos grupos',
    estudos_biblicos: 'Estudos bíblicos', projetos_sociais: 'Ações sociais', ofertas: 'Ofertas'
  };
  const levelColors = ['#f87171', '#fb923c', '#facc15', '#34d399'];
  const resultColor = isCurrentRevealed ? levelColors[animatedLevel.level - 1] : '#8fa8c6';
  const formatValue = (value: number) => slide.id === 'ofertas'
    ? value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : value.toLocaleString('pt-BR');

  if (isLoading) return <div className="stage-loading">Preparando a Escola Sabatina…</div>;

  return (
    <div ref={containerRef} className="sabbath-stage" data-theme={layout.theme}
      style={{
        '--result-color': resultColor,
        '--stage-title-size': `${layout.titleSize}px`,
        '--stage-copy-size': `${layout.textSize}px`,
        '--stage-icon-size': `${layout.iconSize}px`,
        '--stage-spacing': layout.spacingScale,
        '--stage-result-scale': layout.resultScale,
      } as CSSProperties}>
      <header className="stage-header">
        <div className="stage-brand">
          <div className="stage-logo"><Flame aria-hidden="true" /></div>
          <div><h1>Escola Sabatina</h1><span>Termômetro de participação</span></div>
        </div>
        <div className="stage-current"><span>{currentSlideIndex + 1}/{slides.length}</span><strong>{indicatorNames[slide.id]}</strong></div>
        <div className="stage-tools">
          <button onClick={() => setIsCountdownActive(!isCountdownActive)} title="Contagem regressiva" aria-label="Contagem regressiva"><Play size={19} /></button>
          <button onClick={toggleFullscreen} title="Tela cheia" aria-label="Tela cheia">{isFullscreen ? <Minimize2 size={19} /> : <Maximize2 size={19} />}</button>
          <button onClick={() => setIsLayoutOpen(true)} title="Ajustar apresentação" aria-label="Ajustar apresentação"><LayoutIcon size={19} /></button>
          <button onClick={() => setIsAboutOpen(true)} title="Sobre o aplicativo" aria-label="Sobre o aplicativo"><HelpCircle size={19} /></button>
          <button onClick={() => setIsSettingsOpen(true)} title="Editar dados" aria-label="Editar dados"><Settings size={19} /></button>
          <button onClick={generatePDFReport} disabled={isGeneratingPDF} title="Exportar PDF" aria-label="Exportar PDF"><Download size={19} /></button>
        </div>
      </header>
      <AnimatePresence>
        {feedbackMsg && <motion.div className="stage-toast" role="status" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>{feedbackMsg.text}</motion.div>}
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


      {!isCountdownActive && (
        <main id="presentation-main-area" className="stage-main">
          <section className="stage-values" aria-label="Valores do indicador">
            <div className="stage-heading"><span className="stage-eyebrow">NOSSA ESCOLA • NESTE SÁBADO</span><h2>{indicatorNames[slide.id]}</h2></div>
            {layout.showPresentationCards && (
              <div className="stage-cards">
                <div className="stage-card stage-card-primary"><span>{getSlideIcon(slide.icon, 22, '')}{slide.numeratorLabel}</span><strong>{formatValue(numerator)}</strong></div>
                <div className="stage-card"><span>{slide.id === 'ofertas' ? 'Meta de oferta' : slide.denominatorLabel}</span><strong>{formatValue(denominator)}</strong></div>
              </div>
            )}
            <div className="stage-actions">
              <button className="stage-reveal" onClick={handleToggleReveal}>{isCurrentRevealed ? <EyeOff size={21} /> : <Eye size={21} />}{isCurrentRevealed ? 'Ocultar resultado' : 'Revelar resultado'}<kbd>Espaço</kbd></button>
              <div className="stage-secondary-actions">
                <button onClick={() => setIsSettingsOpen(true)}><Settings size={16} /> Editar dados</button>
                {isCurrentRevealed && <button onClick={handleResetReveal} title="Ocultar resultados de todos os indicadores"><RotateCcw size={16} /> Ocultar todos</button>}
              </div>
            </div>
          </section>
          <section className="stage-thermometer" aria-label="Termômetro do indicador atual">
            <div className="stage-instrument">
              <div className="stage-scale" aria-hidden="true">{[100, 75, 50, 25, 0].map(value => <span key={value}>{value}<i /></span>)}</div>
              <div className="stage-tube">
                <motion.div className="stage-liquid" initial={{ height: '0%' }}
                  animate={{ height: isCurrentRevealed ? `${Math.min(100, realPercent)}%` : '0%' }}
                  transition={{ type: 'spring', stiffness: 50, damping: 15 }} style={{ background: resultColor }}>
                  {isCurrentRevealed && hasExcellentResult && <div className="stage-liquid-shine animate-pulse" />}
                </motion.div>
                <div className="stage-glass-shine" />
              </div>
              <div className="stage-bulb">
                <motion.div className="stage-bulb-liquid"
                  animate={{ scale: isCurrentRevealed && hasExcellentResult ? [1, 1.04, 1] : 1 }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  style={{ background: isCurrentRevealed ? resultColor : '#152c48' }} />
              </div>
            </div>
          </section>
          <section className="stage-result" aria-label="Resultado">
            <span className="stage-eyebrow">{slide.id === 'ofertas' ? 'DA META ALCANÇADA' : 'DE PARTICIPAÇÃO'}</span>
            <div className="stage-percent" aria-live="off">{isCurrentRevealed ? percentFormat(animatedPercent) : '??%'}</div>
            <motion.div className="stage-face" key={`${slide.id}-${isCurrentRevealed}`}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
              <AnimatedFace type={isCurrentRevealed ? animatedLevel.emoticon as 'cry' | 'neutral' | 'satisfied' | 'happy' : 'neutral'} scale={1} revealed />
            </motion.div>
            <motion.div className="stage-classification" key={`status-${slide.id}-${isCurrentRevealed}`}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
              <span className="stage-status-dot" />{isCurrentRevealed ? animatedLevel.label : 'Aguardando revelação'}
            </motion.div>
          </section>
        </main>
      )}
      <footer className="stage-footer">
        <nav className="stage-navigation" aria-label="Indicadores da Escola Sabatina">
          <button className="stage-arrow" onClick={handlePrevSlide} title="Anterior (←)" aria-label="Indicador anterior"><ChevronLeft /></button>
          {slides.map((tab, idx) => (
            <button key={tab.id} className={`stage-tab ${slide.id === tab.id ? 'is-active' : ''}`}
              aria-current={slide.id === tab.id ? 'page' : undefined}
              onClick={() => { setCurrentSlideIndex(idx); showFeedback(`Carregado indicador: ${tab.title}`, 'info'); }}>
              {getSlideIcon(tab.icon, 24, '')}<span>{indicatorNames[tab.id]}</span><small>{String(idx + 1).padStart(2, '0')}</small>
            </button>
          ))}
          <button className="stage-arrow" onClick={handleNextSlide} title="Próximo (→)" aria-label="Próximo indicador"><ChevronRight /></button>
        </nav>
        <div className="stage-footer-note"><span>Juntos no estudo, na comunhão e na missão.</span><span>← → Navegar <span className="stage-note-divider">/</span> Espaço Revelar</span></div>
      </footer>
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


    </div>
  );
}
