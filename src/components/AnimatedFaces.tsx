/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';

interface AnimatedFaceProps {
  type: 'cry' | 'neutral' | 'satisfied' | 'happy' | 'mystery';
  scale?: number;
  revealed?: boolean;
}

export default function AnimatedFace({ type, scale = 1, revealed = true }: AnimatedFaceProps) {
  const size = 180 * scale;

  // Lógica de Mistério antes de revelar
  if (!revealed || type === 'mystery') {
    return (
      <div 
        className="flex flex-col items-center justify-center relative select-none" 
        style={{ width: size, height: size }}
      >
        <motion.div
          animate={{
            scale: [1, 1.04, 1],
            rotate: [0, -2, 2, 0],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="w-full h-full rounded-full bg-gradient-to-tr from-slate-900 to-slate-800 border-4 border-dashed border-indigo-500/40 flex flex-col items-center justify-center shadow-xl relative overflow-hidden"
        >
          {/* Detalhe Glassy de Brilho no topo */}
          <div className="absolute top-1 left-0 right-0 h-[45%] bg-gradient-to-b from-white/10 to-transparent rounded-t-full pointer-events-none" />

          {/* Olhos espiando em 3D */}
          <div className="flex space-x-7 mb-2.5 z-10">
            <div className="w-5.5 h-5.5 bg-slate-950 rounded-full relative overflow-hidden flex items-center justify-center shadow-inner border border-white/10">
              <motion.div
                animate={{ x: [-3, 3, -3], y: [-1, 1, -1] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                className="w-2.5 h-2.5 bg-white rounded-full absolute top-1 left-1"
              />
            </div>
            <div className="w-5.5 h-5.5 bg-slate-950 rounded-full relative overflow-hidden flex items-center justify-center shadow-inner border border-white/10">
              <motion.div
                animate={{ x: [-3, 3, -3], y: [-1, 1, -1] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                className="w-2.5 h-2.5 bg-white rounded-full absolute top-1 left-1"
              />
            </div>
          </div>

          {/* Boca flutuante */}
          <svg width="40" height="15" viewBox="0 0 40 15" fill="none" className="z-10">
            <motion.path
              d="M 5 7.5 H 35"
              stroke="#818cf8"
              strokeWidth="4"
              strokeLinecap="round"
              animate={{
                d: [
                  "M 5 7.5 H 35",
                  "M 5 7.5 C 5 7.5, 20 12, 35 7.5",
                  "M 5 7.5 H 35"
                ]
              }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            />
          </svg>

          {/* Símbolos de dúvidas em 3D */}
          <div className="absolute right-4 top-4 text-3xl font-extrabold font-mono text-indigo-500/30 animate-pulse">
            ?
          </div>
          <div className="absolute left-4 bottom-4 text-3xl font-extrabold font-mono text-indigo-500/30 animate-pulse delay-500">
            ?
          </div>
        </motion.div>
      </div>
    );
  }

  // Configuração avançada dos emoticons 3D Premium
  const get3DEmoji = () => {
    switch (type) {
      case 'cry':
        return {
          title: 'Precisa melhorar bastante! 😓',
          subTitle: 'Vamos nos mobilizar para engajar a classe no próximo sábado!',
          svg: (
            <svg width="100%" height="100%" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <radialGradient id="cryBg" cx="35%" cy="30%" r="65%">
                  <stop offset="0%" stopColor="#fca5a5" />
                  <stop offset="60%" stopColor="#ef4444" />
                  <stop offset="100%" stopColor="#991b1b" />
                </radialGradient>
                <filter id="cryDropShadow" x="-10%" y="-10%" width="120%" height="120%">
                  <feDropShadow dx="1" dy="2.5" stdDeviation="1.5" floodColor="#450a0a" floodOpacity="0.5" />
                </filter>
                <radialGradient id="tearLeft" cx="35%" cy="30%" r="70%">
                  <stop offset="0%" stopColor="#e0f2fe" />
                  <stop offset="50%" stopColor="#38bdf8" />
                  <stop offset="100%" stopColor="#0369a1" />
                </radialGradient>
                <radialGradient id="tearRight" cx="35%" cy="30%" r="70%">
                  <stop offset="0%" stopColor="#e0f2fe" />
                  <stop offset="50%" stopColor="#38bdf8" />
                  <stop offset="100%" stopColor="#0369a1" />
                </radialGradient>
              </defs>

              {/* Corpo Principal Esférico */}
              <circle cx="50" cy="50" r="46" fill="url(#cryBg)" stroke="#7f1d1d" strokeWidth="2.5" />

              {/* Gloss de Superfície da Esfera */}
              <path d="M 12 35 A 40 40 0 0 1 88 35 A 40 41 0 0 0 12 35 Z" fill="#ffffff" fillOpacity="0.25" />
              <ellipse cx="32" cy="18" rx="8" ry="3.5" transform="rotate(-15, 32, 18)" fill="#ffffff" fillOpacity="0.4" />

              {/* Sobrancelhas tristes / inclinadas */}
              <g filter="url(#cryDropShadow)">
                <path d="M 23 29 C 28 32, 33 32, 36 27" stroke="#450a0a" strokeWidth="3" strokeLinecap="round" fill="none" />
                <path d="M 77 29 C 72 32, 67 32, 64 27" stroke="#450a0a" strokeWidth="3" strokeLinecap="round" fill="none" />
              </g>

              {/* Olhos de choro cerrados */}
              <g filter="url(#cryDropShadow)">
                <path d="M 22 41 C 26 36, 32 36, 36 41" stroke="#450a0a" strokeWidth="3.5" strokeLinecap="round" fill="none" />
                <path d="M 78 41 C 74 36, 68 36, 64 41" stroke="#450a0a" strokeWidth="3.5" strokeLinecap="round" fill="none" />
              </g>

              {/* Bochechas levemente ruborizadas */}
              <circle cx="16" cy="54" r="5" fill="#f43f5e" fillOpacity="0.4" filter="blur(1px)" />
              <circle cx="84" cy="54" r="5" fill="#f43f5e" fillOpacity="0.4" filter="blur(1px)" />

              {/* Lágrimas grandes em 3D escorrendo */}
              <g filter="url(#cryDropShadow)">
                <motion.path 
                  animate={{ y: [0, 4, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  d="M 28 44 C 28 44, 21 54, 21 59 C 21 63, 25 66, 29 66 C 33 66, 36 63, 36 59 C 36 54, 28 44, 28 44 Z" 
                  fill="url(#tearLeft)" 
                  stroke="#0284c7" 
                  strokeWidth="0.8"
                />
                <motion.path 
                  animate={{ y: [0, 4, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                  d="M 72 44 C 72 44, 79 54, 79 59 C 79 63, 75 66, 71 66 C 67 66, 64 63, 64 59 C 64 54, 72 44, 72 44 Z" 
                  fill="url(#tearRight)" 
                  stroke="#0284c7" 
                  strokeWidth="0.8"
                />
              </g>

              {/* Boca de tristeza profunda */}
              <path d="M 33 74 C 40 68, 60 68, 67 74" stroke="#450a0a" strokeWidth="4.5" strokeLinecap="round" fill="none" filter="url(#cryDropShadow)" />
            </svg>
          )
        };

      case 'neutral':
        return {
          title: 'Em andamento, continue firme! 😐',
          subTitle: 'Falta pouco para atingirmos o nível ideal. Vamos incentivar!',
          svg: (
            <svg width="100%" height="100%" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <radialGradient id="neutralBg" cx="35%" cy="30%" r="65%">
                  <stop offset="0%" stopColor="#fed7aa" />
                  <stop offset="65%" stopColor="#f97316" />
                  <stop offset="100%" stopColor="#ac2e05" />
                </radialGradient>
                <filter id="neuDropShadow" x="-10%" y="-10%" width="120%" height="120%">
                  <feDropShadow dx="1" dy="2.5" stdDeviation="1.5" floodColor="#431407" floodOpacity="0.4" />
                </filter>
              </defs>

              {/* Corpo Esférico */}
              <circle cx="50" cy="50" r="46" fill="url(#neutralBg)" stroke="#9a3412" strokeWidth="2.5" />

              {/* Gloss de Superfície da Esfera */}
              <path d="M 12 35 A 40 40 0 0 1 88 35 A 40 41 0 0 0 12 35 Z" fill="#ffffff" fillOpacity="0.25" />
              <ellipse cx="32" cy="18" rx="8" ry="3.5" transform="rotate(-15, 32, 18)" fill="#ffffff" fillOpacity="0.4" />

              {/* Sobrancelhas retas e analíticas */}
              <g filter="url(#neuDropShadow)">
                <path d="M 22 28 H 38" stroke="#431407" strokeWidth="3" strokeLinecap="round" />
                <path d="M 62 28 H 78" stroke="#431407" strokeWidth="3" strokeLinecap="round" />
              </g>

              {/* Olhos redondos curiosos con brilho */}
              <g filter="url(#neuDropShadow)">
                <circle cx="30" cy="42" r="5.5" fill="#431407" />
                <circle cx="28.5" cy="40" r="1.5" fill="#ffffff" />
                
                <circle cx="70" cy="42" r="5.5" fill="#431407" />
                <circle cx="68.5" cy="40" r="1.5" fill="#ffffff" />
              </g>

              {/* Bochechas */}
              <circle cx="18" cy="55" r="4" fill="#ea580c" fillOpacity="0.5" filter="blur(1.2px)" />
              <circle cx="82" cy="55" r="4" fill="#ea580c" fillOpacity="0.5" filter="blur(1.2px)" />

              {/* Boca neutra reta */}
              <path d="M 32 66 H 68" stroke="#431407" strokeWidth="5" strokeLinecap="round" filter="url(#neuDropShadow)" />
            </svg>
          )
        };

      case 'satisfied':
        return {
          title: 'Bom trabalho! Quase lá! 🙂',
          subTitle: 'Nossa temperatura está subindo! Ótimo engajamento hoje.',
          svg: (
            <svg width="100%" height="100%" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <radialGradient id="satBg" cx="35%" cy="30%" r="65%">
                  <stop offset="0%" stopColor="#fef08a" />
                  <stop offset="60%" stopColor="#eab308" />
                  <stop offset="100%" stopColor="#854d0e" />
                </radialGradient>
                <filter id="satDropShadow" x="-10%" y="-10%" width="120%" height="120%">
                  <feDropShadow dx="1" dy="2.5" stdDeviation="1.5" floodColor="#422006" floodOpacity="0.4" />
                </filter>
              </defs>

              {/* Corpo Esférico */}
              <circle cx="50" cy="50" r="46" fill="url(#satBg)" stroke="#a16207" strokeWidth="2.5" />

              {/* Gloss de Superfície da Esfera */}
              <path d="M 12 35 A 40 40 0 0 1 88 35 A 40 41 0 0 0 12 35 Z" fill="#ffffff" fillOpacity="0.25" />
              <ellipse cx="32" cy="18" rx="8" ry="3.5" transform="rotate(-15, 32, 18)" fill="#ffffff" fillOpacity="0.4" />

              {/* Sobrancelhas Arqueadas amigáveis */}
              <g filter="url(#satDropShadow)">
                <path d="M 21 28 C 26 23, 34 23, 37 27" stroke="#422006" strokeWidth="3" strokeLinecap="round" fill="none" />
                <path d="M 79 28 C 74 23, 66 23, 63 27" stroke="#422006" strokeWidth="3" strokeLinecap="round" fill="none" />
              </g>

              {/* Olhos Sorridentes (arcos superiores) */}
              <g filter="url(#satDropShadow)">
                <path d="M 22 41 C 25 34, 35 34, 38 41" stroke="#422006" strokeWidth="4.5" strokeLinecap="round" fill="none" />
                <path d="M 78 41 C 75 34, 65 34, 62 41" stroke="#422006" strokeWidth="4.5" strokeLinecap="round" fill="none" />
              </g>

              {/* Ruborização das Bochechas */}
              <circle cx="16" cy="52" r="5" fill="#f43f5e" fillOpacity="0.5" filter="blur(1.5px)" />
              <circle cx="84" cy="52" r="5" fill="#f43f5e" fillOpacity="0.5" filter="blur(1.5px)" />

              {/* Sorriso simpático com boca */}
              <path d="M 30 60 C 37 72, 63 72, 70 60" stroke="#422006" strokeWidth="5" strokeLinecap="round" fill="none" filter="url(#satDropShadow)" />
            </svg>
          )
        };

      case 'happy':
      default:
        return {
          title: 'Excelente resultado! 🎉🤩',
          subTitle: 'Parabéns à classe Escola Sabatina pelo fervor e dedicação exemplar!',
          svg: (
            <svg width="100%" height="100%" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <radialGradient id="hapBg" cx="35%" cy="30%" r="65%">
                  <stop offset="0%" stopColor="#a7f3d0" />
                  <stop offset="55%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#044e34" />
                </radialGradient>
                <filter id="hapDropShadow" x="-10%" y="-10%" width="120%" height="120%">
                  <feDropShadow dx="1.5" dy="3" stdDeviation="1.8" floodColor="#022c22" floodOpacity="0.5" />
                </filter>
              </defs>

              {/* Corpo Esférico */}
              <circle cx="50" cy="50" r="46" fill="url(#hapBg)" stroke="#047857" strokeWidth="2.5" />

              {/* Gloss de Superfície da Esfera */}
              <path d="M 12 35 A 40 40 0 0 1 88 35 A 40 41 0 0 0 12 35 Z" fill="#ffffff" fillOpacity="0.25" />
              <ellipse cx="32" cy="18" rx="8" ry="3.5" transform="rotate(-15, 32, 18)" fill="#ffffff" fillOpacity="0.4" />

              {/* Sobrancelhas expressivas voando de alegria */}
              <g filter="url(#hapDropShadow)">
                <path d="M 20 25 C 24 16, 32 17, 36 22" stroke="#022c22" strokeWidth="3" strokeLinecap="round" fill="none" />
                <path d="M 80 25 C 76 16, 68 17, 64 22" stroke="#022c22" strokeWidth="3" strokeLinecap="round" fill="none" />
              </g>

              {/* Olhos gigantes brilhando de felicidade */}
              <g filter="url(#hapDropShadow)">
                <circle cx="30" cy="38" r="6" fill="#022c22" />
                <circle cx="28" cy="35" r="2" fill="#ffffff" />
                <circle cx="31.8" cy="39.8" r="0.8" fill="#ffffff" />
                
                <circle cx="70" cy="38" r="6" fill="#022c22" />
                <circle cx="68" cy="35" r="2" fill="#ffffff" />
                <circle cx="71.8" cy="39.8" r="0.8" fill="#ffffff" />
              </g>

              {/* Bochechas super alegres */}
              <circle cx="15" cy="49" r="6.5" fill="#f43f5e" fillOpacity="0.65" filter="blur(1.5px)" />
              <circle cx="85" cy="49" r="6.5" fill="#f43f5e" fillOpacity="0.65" filter="blur(1.5px)" />

              {/* Sorrisão 3D aberto mostrando dentes e língua */}
              <g filter="url(#hapDropShadow)">
                {/* Boca Aberta */}
                <path d="M 24 55 C 24 55, 27 78, 50 78 C 73 78, 76 55, 76 55 Z" fill="#4c0519" stroke="#022c22" strokeWidth="2.5" />
                {/* Língua */}
                <path d="M 37 68 C 37 68, 41 77, 50 77 C 59 77, 63 68, 63 68 C 63 68, 59 71, 50 71 C 41 71, 37 68, 37 68 Z" fill="#fda4af" />
                {/* Dentes Superiores brancos */}
                <path d="M 25.5 56.5 H 74.5 C 72 61, 62 61, 50 61 C 38 61, 28 61, 25.5 56.5 Z" fill="#ffffff" />
              </g>
            </svg>
          )
        };
    }
  };

  const config = get3DEmoji();

  return (
    <div className="flex flex-col items-center select-none">
      <motion.div
        id={`face-badge-${type}`}
        initial={{ scale: 0.2, opacity: 0, rotate: -35 }}
        animate={{ scale: scale, opacity: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 140, damping: 12 }}
        className="relative flex items-center justify-center transition-all duration-300 filter drop-shadow-[0_12px_24px_rgba(0,0,0,0.18)]"
        style={{ width: 172, height: 172 }}
      >
        {config.svg}
      </motion.div>
    </div>
  );
}
