import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  Volume2,
  VolumeX,
  Radio,
  Sparkles,
  ShieldCheck,
  Activity,
  Layers,
  Sliders,
  ArrowRight,
  Disc,
  Waves,
} from 'lucide-react';

interface CinematicIntroProps {
  onEnterStudio: (targetTab?: string) => void;
}

interface SceneData {
  id: number;
  tag: string;
  headline: string;
  subline: string;
  caption: string;
}

const SCENES: SceneData[] = [
  {
    id: 0,
    tag: '01 // THE PROBLEM',
    headline: '같은 대사, 네 개의 심장 박동',
    subline: '기존 TTS는 글자만 읽을 뿐, 당신의 호흡과 연기를 담지 못합니다.',
    caption: '아래 감정 오브를 클릭해 같은 대사의 서로 다른 파형을 들어보세요.',
  },
  {
    id: 1,
    tag: '02 // THE VISION',
    headline: '목소리는 달라져도, 당신의 연기는 그대로.',
    subline: '문장 사이의 침묵, 감정의 고조, 말끝의 떨림까지 그대로 캐릭터에게 입힙니다.',
    caption: '내 원본 연기와 AI 캐릭터 변환본을 즉시 교차 비교해 보세요.',
  },
  {
    id: 2,
    tag: '03 // THE ARCHITECTURE',
    headline: '5-Stage Quantum Acoustic Pipeline',
    subline: '운율 분리 · 권리 가드 · 뉴럴 음색 변환 · 구간 재변환 · 5계층 품질 검증',
    caption: '외부 전송 없는 100% 로컬 추론과 성우 권리 보호 가드로 안전하게 작동합니다.',
  },
  {
    id: 3,
    tag: '04 // THE STUDIO',
    headline: '당신의 이야기에, 새로운 목소리를 입히세요.',
    subline: 'Record Your Emotion. Transform Your Voice.',
    caption: 'EUNJO Golden Orange Lab — 지금 스튜디오로 진입하세요.',
  },
];

export const CinematicIntro: React.FC<CinematicIntroProps> = ({ onEnterStudio }) => {
  const [sceneIdx, setSceneIdx] = useState<number>(0);
  const [autoPlay, setAutoPlay] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const triggerChime = (freqBase = 440) => {
    if (!soundEnabled) return;
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freqBase, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freqBase * 1.5, ctx.currentTime + 0.4);
      gain.gain.setValueAtTime(0.035, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.52);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (!autoPlay) return;
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setSceneIdx((s) => (s + 1) % SCENES.length);
          return 0;
        }
        return prev + 1.4;
      });
    }, 100);
    return () => clearInterval(timer);
  }, [autoPlay]);

  // Fullscreen Widescreen Particle + Harmonic Wave Visualizer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let t = 0;

    const render = () => {
      t += 0.032;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Center glowing core ring
      const cx = w / 2;
      const cy = h / 2;
      const baseRadius = 56 + Math.sin(t * 2) * 6 + (playingId ? 14 : 0);

      const grad = ctx.createRadialGradient(cx, cy, 8, cx, cy, baseRadius * 2.6);
      grad.addColorStop(0, 'rgba(255, 138, 0, 0.28)');
      grad.addColorStop(0.5, 'rgba(0, 240, 255, 0.10)');
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, baseRadius * 2.6, 0, Math.PI * 2);
      ctx.fill();

      // 3 Flowing Acoustic Ribbon Waves
      const ribbons = [
        { color: 'rgba(255, 138, 0, 0.85)', amp: playingId ? 62 : 36, freq: 0.011, speed: 1.2, lw: 2.8 },
        { color: 'rgba(0, 240, 255, 0.75)', amp: playingId ? 48 : 28, freq: 0.017, speed: -1.5, lw: 2.2 },
        { color: 'rgba(168, 85, 247, 0.55)', amp: playingId ? 38 : 20, freq: 0.024, speed: 0.9, lw: 1.6 },
      ];

      ribbons.forEach((rb) => {
        ctx.beginPath();
        ctx.strokeStyle = rb.color;
        ctx.lineWidth = rb.lw;
        for (let x = 0; x <= w; x += 4) {
          const bell = Math.sin((x / w) * Math.PI);
          const y =
            cy +
            Math.sin(x * rb.freq + t * rb.speed) *
              rb.amp *
              bell *
              (0.7 + 0.3 * Math.cos(t + x * 0.004));
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      });

      // Vertical frequency spectrum bars in center
      const barCount = 48;
      const totalBarW = 360;
      const startX = cx - totalBarW / 2;
      for (let i = 0; i < barCount; i++) {
        const norm = 1 - Math.abs(i - barCount / 2) / (barCount / 2);
        const boost = playingId ? 1.65 : 1.0;
        const barH =
          (8 + Math.abs(Math.sin(t * 2.6 + i * 0.45)) * 42 * norm) * boost;
        ctx.fillStyle = i % 2 === 0 ? 'rgba(255, 184, 0, 0.45)' : 'rgba(0, 240, 255, 0.45)';
        ctx.fillRect(startX + i * (totalBarW / barCount), cy - barH / 2, 3, barH);
      }

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [playingId, sceneIdx]);

  const selectScene = (idx: number) => {
    setSceneIdx(idx);
    setProgress(0);
    triggerChime(360 + idx * 80);
  };

  const playDemoAudio = (url: string, key: string) => {
    setAutoPlay(false);
    if (audioRef.current) audioRef.current.pause();
    if (playingId === key) {
      setPlayingId(null);
      return;
    }
    const audio = new Audio(url);
    audioRef.current = audio;
    setPlayingId(key);
    audio.play().catch(() => setPlayingId(null));
    audio.onended = () => setPlayingId(null);
  };

  useEffect(() => {
    return () => {
      if (audioRef.current) audioRef.current.pause();
    };
  }, []);

  const scene = SCENES[sceneIdx];

  return (
    <div className="cinema-overlay">
      {/* Minimal Top Letterbox */}
      <div className="cinema-letterbox-top">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '12px',
              fontWeight: 800,
              color: 'var(--eunjo-orange)',
              letterSpacing: '0.16em',
            }}
          >
            EUNJO VOICEMORPH
          </span>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              color: 'var(--text-secondary)',
              letterSpacing: '0.08em',
            }}
          >
            CINEMATIC PROLOGUE
          </span>
        </div>

        {/* Minimal Scene Progress Bars */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '320px' }}>
          {SCENES.map((s, idx) => {
            const active = idx === sceneIdx;
            const past = idx < sceneIdx;
            return (
              <div
                key={s.id}
                onClick={() => selectScene(idx)}
                style={{
                  flex: 1,
                  height: '4px',
                  borderRadius: '99px',
                  background: 'rgba(255,255,255,0.12)',
                  cursor: 'pointer',
                  overflow: 'hidden',
                }}
                title={s.tag}
              >
                <div
                  style={{
                    height: '100%',
                    width: active ? `${progress}%` : past ? '100%' : '0%',
                    background: 'linear-gradient(90deg, var(--eunjo-orange), var(--quantum-cyan))',
                    transition: 'width 0.1s linear',
                  }}
                />
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            className="btn-ghost"
            onClick={() => setSoundEnabled(!soundEnabled)}
            style={{ padding: '6px 10px' }}
          >
            {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
          </button>
          <button
            className="btn-ghost"
            onClick={() => setAutoPlay(!autoPlay)}
            style={{ padding: '6px 10px' }}
          >
            {autoPlay ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <button
            className="btn-primary-orange"
            onClick={() => onEnterStudio('workspace')}
            style={{ padding: '6px 14px', fontSize: '12px' }}
          >
            <span>SKIP TO STUDIO</span>
            <SkipForward size={13} />
          </button>
        </div>
      </div>

      {/* Center Widescreen Visual Stage */}
      <div className="cinema-stage" style={{ textAlign: 'center', gap: '18px' }}>
        <div className="cinema-spotlight" />

        {/* Scene Tag Pill */}
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.18em',
            color: 'var(--quantum-cyan)',
            padding: '4px 14px',
            borderRadius: '99px',
            background: 'rgba(0, 240, 255, 0.08)',
            border: '1px solid rgba(0, 240, 255, 0.28)',
            zIndex: 2,
          }}
        >
          {scene.tag}
        </div>

        {/* Big Kinetic Movie Headline */}
        <h1
          style={{
            fontSize: '36px',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            lineHeight: 1.25,
            background: 'linear-gradient(90deg, #ffffff 0%, #fde68a 52%, #00f0ff 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            zIndex: 2,
            maxWidth: '820px',
          }}
        >
          {scene.headline}
        </h1>

        {/* Single Concise Subtitle */}
        <p
          style={{
            fontSize: '15px',
            color: '#cbd5e1',
            fontWeight: 500,
            maxWidth: '680px',
            zIndex: 2,
          }}
        >
          {scene.subline}
        </p>

        {/* Widescreen Neural Soundwave Visualizer */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: '860px',
            height: '180px',
            zIndex: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <canvas
            ref={canvasRef}
            width={860}
            height={180}
            style={{ width: '100%', height: '180px', display: 'block' }}
          />
        </div>

        {/* Interactive Visual Controls per Scene (Minimal Text, High Visual Impact) */}
        <div style={{ zIndex: 2, width: '100%', maxWidth: '780px' }}>
          {sceneIdx === 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
              {[
                { id: 'AUD-ORIG-001', title: '애절한 떨림', tag: 'TREMBLING', color: '#00f0ff' },
                { id: 'AUD-ORIG-002', title: '벅찬 기쁨', tag: 'JOYFUL', color: '#ff8a00' },
                { id: 'AUD-ORIG-003', title: '놀란 속삭임', tag: 'WHISPER', color: '#a855f7' },
                { id: 'AUD-ORIG-004', title: '장난스러움', tag: 'PLAYFUL', color: '#10b981' },
              ].map((orb) => {
                const active = playingId === orb.id;
                return (
                  <button
                    key={orb.id}
                    onClick={() => playDemoAudio(`/api/audio/${orb.id}/stream`, orb.id)}
                    style={{
                      padding: '14px 12px',
                      borderRadius: '14px',
                      background: active ? 'rgba(255, 138, 0, 0.18)' : 'rgba(13, 19, 33, 0.78)',
                      border: `1px solid ${active ? orb.color : 'rgba(148, 163, 184, 0.2)'}`,
                      boxShadow: active ? `0 0 24px ${orb.color}44` : 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        background: `${orb.color}22`,
                        border: `1px solid ${orb.color}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: orb.color,
                      }}
                    >
                      {active ? <Pause size={16} /> : <Play size={16} />}
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>{orb.title}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: orb.color }}>
                      {orb.tag}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {sceneIdx === 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '18px' }}>
              <button
                onClick={() => playDemoAudio('/api/audio/AUD-ORIG-001/stream', 'ab-orig')}
                style={{
                  padding: '16px 28px',
                  borderRadius: '14px',
                  background: playingId === 'ab-orig' ? 'rgba(0, 240, 255, 0.18)' : 'rgba(13, 19, 33, 0.8)',
                  border: '1px solid var(--quantum-cyan)',
                  color: '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                }}
              >
                <Radio size={22} color="#00f0ff" />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '14px', fontWeight: 800 }}>ORIGINAL ACTING</div>
                  <div style={{ fontSize: '11px', color: 'var(--quantum-cyan)' }}>내 원본 감정 연기 듣기</div>
                </div>
              </button>

              <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}>
                <ArrowRight size={22} />
              </div>

              <button
                onClick={() => playDemoAudio('/api/audio/AUD-CONV-001/stream', 'ab-conv')}
                style={{
                  padding: '16px 28px',
                  borderRadius: '14px',
                  background: playingId === 'ab-conv' ? 'rgba(255, 138, 0, 0.22)' : 'rgba(13, 19, 33, 0.8)',
                  border: '1px solid var(--eunjo-orange)',
                  color: '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  boxShadow: '0 0 24px rgba(255, 138, 0, 0.25)',
                }}
              >
                <Sparkles size={22} color="#ff8a00" />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '14px', fontWeight: 800 }}>EUNJO AURA MORPH</div>
                  <div style={{ fontSize: '11px', color: 'var(--eunjo-gold)' }}>변환된 캐릭터 목소리 듣기</div>
                </div>
              </button>
            </div>
          )}

          {sceneIdx === 2 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
              {[
                { icon: <Waves size={18} color="#00f0ff" />, label: 'VAD & F0', sub: '운율 추출' },
                { icon: <ShieldCheck size={18} color="#10b981" />, label: 'CONSENT', sub: '권리 가드' },
                { icon: <Sparkles size={18} color="#ff8a00" />, label: 'RVC-DSP', sub: '음색 변환' },
                { icon: <Sliders size={18} color="#a855f7" />, label: 'SPLICE', sub: '구간 재변환' },
                { icon: <Activity size={18} color="#fde047" />, label: '5-LEVEL', sub: '품질 검증' },
              ].map((node, i) => (
                <div
                  key={i}
                  style={{
                    padding: '14px 10px',
                    borderRadius: '12px',
                    background: 'rgba(13, 19, 33, 0.82)',
                    border: '1px solid rgba(148, 163, 184, 0.18)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {node.icon}
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 800, color: '#fff' }}>
                    {node.label}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{node.sub}</div>
                </div>
              ))}
            </div>
          )}

          {sceneIdx === 3 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '14px' }}>
              <button
                className="btn-primary-orange"
                onClick={() => onEnterStudio('workspace')}
                style={{ padding: '14px 28px', fontSize: '14px' }}
              >
                <Disc size={18} />
                <span>오디오 스튜디오 시작</span>
              </button>
              <button
                className="btn-sci-cyan"
                onClick={() => onEnterStudio('multichar')}
                style={{ padding: '14px 24px', fontSize: '14px' }}
              >
                <Layers size={18} />
                <span>다중 캐릭터 스튜디오</span>
              </button>
            </div>
          )}
        </div>

        {/* Minimal Bottom Caption */}
        <div
          style={{
            fontSize: '12px',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
            marginTop: '4px',
            zIndex: 2,
          }}
        >
          {scene.caption}
        </div>
      </div>

      {/* Minimal Bottom Letterbox */}
      <div className="cinema-letterbox-bottom">
        <div style={{ display: 'flex', gap: '8px' }}>
          {SCENES.map((s, idx) => (
            <button
              key={s.id}
              className={`btn-ghost ${idx === sceneIdx ? 'active' : ''}`}
              onClick={() => selectScene(idx)}
              style={{ padding: '5px 12px', fontSize: '11px', fontFamily: 'var(--font-mono)' }}
            >
              0{idx + 1}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {sceneIdx < SCENES.length - 1 && (
            <button className="btn-sci-cyan" onClick={() => selectScene(sceneIdx + 1)}>
              <span>NEXT SCENE</span>
              <ArrowRight size={14} />
            </button>
          )}
          <button className="btn-primary-orange" onClick={() => onEnterStudio('workspace')}>
            <span>ENTER STUDIO</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
