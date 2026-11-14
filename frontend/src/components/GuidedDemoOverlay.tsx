import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowRight,
  ArrowLeft,
  X,
  Compass,
  Play,
  Pause,
  Sparkles,
  MapPin,
  CheckCircle2,
} from 'lucide-react';

export interface TourStop {
  id: string;
  stepNum: string;
  locationBadge: string;
  title: string;
  roleDesc: string;
  howToUse: string;
  tryLabel?: string;
}

export const TOUR_STOPS: TourStop[] = [
  {
    id: 'slim-dock',
    stepNum: '01',
    locationBadge: '좌측 사이드바',
    title: '슬림 아이콘 메뉴 독 (Navigation)',
    roleDesc: '스튜디오의 7개 핵심 화면(변환 스튜디오, 음색 라이브러리, 멀티 캐릭터, 품질 검증, 출력 매니저 등)을 전환하는 메인 메뉴입니다.',
    howToUse: '아이콘에 마우스를 올리면 기능 이름이 표시되며, 하단 마이크 아이콘으로 언제든 새 녹음을 시작할 수 있습니다.',
  },
  {
    id: 'source-takes',
    stepNum: '02',
    locationBadge: '좌측 상단 패널',
    title: '1단계: 원본 한국어 음성 준비 (SOURCE TAKES)',
    roleDesc: '변환의 재료가 되는 내 원본 연기 음성을 선택하거나 새로 녹음·업로드하는 곳입니다.',
    howToUse: '[+ REC] 버튼으로 마이크 녹음/파일 업로드를 하거나, 목록의 테이크를 클릭해 원본 목소리를 들어보세요.',
    tryLabel: '원본 음성 들어보기',
  },
  {
    id: 'target-voice',
    stepNum: '03',
    locationBadge: '좌측 하단 패널',
    title: '2단계: AI 캐릭터 음색 선택 (TARGET VOICE)',
    roleDesc: '내 연기에 입힐 허가된 AI 캐릭터 목소리를 고르는 곳입니다.',
    howToUse: 'APPROVED 배지가 붙은 캐릭터를 클릭해 선택하고, 우측 재생(▶) 버튼으로 캐릭터의 기본 목소리를 미리 들어보세요.',
    tryLabel: '노바-K 캐릭터 선택 & 미리듣기',
  },
  {
    id: 'morph-controls',
    stepNum: '04',
    locationBadge: '우측 컨트롤 패널',
    title: '3단계: 음색·억양 세부 조절 (MORPH CONTROLS)',
    roleDesc: '캐릭터 음역대에 맞춰 피치(Pitch), 음색 강도(Timbre), 한국어 받침 명료도 보호(Protect)를 조절하는 컨트롤러입니다.',
    howToUse: '캐릭터를 선택하면 최적 피치가 자동 세팅되며, 슬라이더로 원하는 톤을 미세 조정할 수 있습니다.',
  },
  {
    id: 'morph-btn',
    stepNum: '05',
    locationBadge: '우측 하단 실행 버튼',
    title: '4단계: 음색 변환 실행 (MORPH & PLAY)',
    roleDesc: '설정한 캐릭터와 옵션으로 실제 Speech-to-Speech 음색 변환을 수행하는 핵심 실행 버튼입니다.',
    howToUse: '버튼을 누르면 원본의 호흡·침묵·억양은 그대로 유지한 채 선택한 캐릭터 음색으로 새 오디오를 생성합니다.',
    tryLabel: '지금 바로 변환 실행해보기',
  },
  {
    id: 'waveform-scope',
    stepNum: '06',
    locationBadge: '중앙 메인 캔버스',
    title: '5단계: 파형 비교 & 구간 재변환 (WAVEFORM SCOPE)',
    roleDesc: '상단(CH A 원본)과 하단(CH B 변환본)의 파형 및 F0 억양 곡선을 시각적으로 비교하고 A/B 교차 청취하는 영역입니다.',
    howToUse: '[REGION SPLICE] 버튼을 켜면 원하는 시간 구간만 드래그해 부분 재변환할 수 있습니다.',
    tryLabel: '구간 선택 모드 켜보기',
  },
  {
    id: 'radial-gauges',
    stepNum: '07',
    locationBadge: '중앙 하단 게이지 바',
    title: '6단계: 5계층 품질 자동 검증 (QUALITY GAUGES)',
    roleDesc: '변환된 음성의 종합 품질, F0 억양 일치율, 감정 다이내믹, 발음 명료도(SNR/CER)를 실시간 표시합니다.',
    howToUse: '수치가 82% 이상이면 PASSED로 판정되며, 어색한 구간이 있다면 5단계의 구간 재변환으로 다듬을 수 있습니다.',
  },
  {
    id: 'export-btns',
    stepNum: '08',
    locationBadge: '중앙 파형 우측 상단',
    title: '7단계: 최종 파일 다운로드 (WAV / ZIP 출력)',
    roleDesc: '완성된 캐릭터 음성을 고음질 WAV 파일이나 메타데이터가 포함된 편집용 ZIP 패키지로 저장하는 버튼입니다.',
    howToUse: '[WAV] 또는 [ZIP] 버튼을 누르면 즉시 내 PC로 결과물 파일이 다운로드됩니다.',
  },
];

interface GuidedDemoOverlayProps {
  onClose: () => void;
  onEnsureWorkspaceTab: () => void;
  onTriggerTryAction: (stopId: string) => Promise<void>;
}

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export const GuidedDemoOverlay: React.FC<GuidedDemoOverlayProps> = ({
  onClose,
  onEnsureWorkspaceTab,
  onTriggerTryAction,
}) => {
  const [stepIdx, setStepIdx] = useState<number>(0);
  const [rect, setRect] = useState<SpotlightRect | null>(null);
  const [autoWalk, setAutoWalk] = useState<boolean>(false);
  const [busy, setBusy] = useState<boolean>(false);

  const currentStop = TOUR_STOPS[stepIdx];

  const measureTarget = useCallback(() => {
    onEnsureWorkspaceTab();
    const el = document.querySelector(`[data-tour="${currentStop.id}"]`);
    if (el) {
      const r = el.getBoundingClientRect();
      const pad = 4;
      setRect({
        top: Math.max(6, r.top - pad),
        left: Math.max(6, r.left - pad),
        width: r.width + pad * 2,
        height: Math.min(window.innerHeight - 12, r.height + pad * 2),
      });
    } else {
      setRect(null);
    }
  }, [currentStop.id, onEnsureWorkspaceTab]);

  useEffect(() => {
    const t = setTimeout(measureTarget, 60);
    window.addEventListener('resize', measureTarget);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', measureTarget);
    };
  }, [measureTarget, stepIdx]);

  useEffect(() => {
    if (!autoWalk) return;
    const timer = setInterval(() => {
      setStepIdx((prev) => {
        if (prev < TOUR_STOPS.length - 1) return prev + 1;
        setAutoWalk(false);
        return prev;
      });
    }, 4500);
    return () => clearInterval(timer);
  }, [autoWalk]);

  // Calculate callout card position and connector line coordinates
  const getLayoutCoords = () => {
    const cardW = 380;
    const cardH = 265;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    if (!rect) {
      return {
        cardTop: vh / 2 - cardH / 2,
        cardLeft: vw / 2 - cardW / 2,
        anchorX: vw / 2,
        anchorY: vh / 2,
        cardConnectX: vw / 2,
        cardConnectY: vh / 2,
      };
    }

    // Case 1: Target on left -> Place card to the right of target
    if (rect.left + rect.width + cardW + 36 < vw) {
      const cardLeft = rect.left + rect.width + 28;
      const cardTop = Math.min(vh - cardH - 24, Math.max(68, rect.top + 12));
      return {
        cardTop,
        cardLeft,
        anchorX: rect.left + rect.width,
        anchorY: Math.min(rect.top + rect.height - 20, Math.max(rect.top + 24, cardTop + 36)),
        cardConnectX: cardLeft,
        cardConnectY: cardTop + 36,
      };
    }

    // Case 2: Target on right -> Place card to the left of target
    if (rect.left - cardW - 32 > 72) {
      const cardLeft = rect.left - cardW - 28;
      const cardTop = Math.min(vh - cardH - 24, Math.max(68, rect.top));
      return {
        cardTop,
        cardLeft,
        anchorX: rect.left,
        anchorY: Math.min(rect.top + rect.height / 2, cardTop + 42),
        cardConnectX: cardLeft + cardW,
        cardConnectY: cardTop + 42,
      };
    }

    // Case 3: Target in center -> Place card below or above target
    if (rect.top + rect.height + cardH + 28 < vh) {
      const cardTop = rect.top + rect.height + 22;
      const cardLeft = Math.min(vw - cardW - 28, Math.max(88, rect.left + rect.width / 2 - cardW / 2));
      return {
        cardTop,
        cardLeft,
        anchorX: rect.left + rect.width / 2,
        anchorY: rect.top + rect.height,
        cardConnectX: cardLeft + cardW / 2,
        cardConnectY: cardTop,
      };
    }

    const cardTop = Math.max(68, rect.top - cardH - 22);
    const cardLeft = Math.min(vw - cardW - 28, Math.max(88, rect.left + rect.width / 2 - cardW / 2));
    return {
      cardTop,
      cardLeft,
      anchorX: rect.left + rect.width / 2,
      anchorY: rect.top,
      cardConnectX: cardLeft + cardW / 2,
      cardConnectY: cardTop + cardH,
    };
  };

  const coords = getLayoutCoords();

  const handleTry = async () => {
    setBusy(true);
    try {
      await onTriggerTryAction(currentStop.id);
      setTimeout(measureTarget, 120);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 160, pointerEvents: 'none' }}>
      {/* SVG Spotlight Cutout Mask + Sci-Fi Laser Connector Line */}
      <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <mask id="tour-spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {rect && (
              <rect
                x={rect.left}
                y={rect.top}
                width={rect.width}
                height={rect.height}
                rx="12"
                ry="12"
                fill="black"
              />
            )}
          </mask>
        </defs>

        {/* Dimmed Backdrop */}
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(3, 6, 14, 0.72)"
          mask="url(#tour-spotlight-mask)"
        />

        {/* Sci-Fi Laser Pointer Line from Target to Guide Card */}
        {rect && (
          <g>
            <line
              x1={coords.anchorX}
              y1={coords.anchorY}
              x2={coords.cardConnectX}
              y2={coords.cardConnectY}
              stroke="#00f0ff"
              strokeWidth="1.8"
              strokeDasharray="4 4"
            />
            <circle cx={coords.anchorX} cy={coords.anchorY} r="5" fill="#ff8a00" />
            <circle cx={coords.anchorX} cy={coords.anchorY} r="9" stroke="#ff8a00" strokeWidth="1.5" fill="none" />
            <circle cx={coords.cardConnectX} cy={coords.cardConnectY} r="4" fill="#00f0ff" />
          </g>
        )}
      </svg>

      {/* Clean Highlighted Frame (No Cluttered Text On the Frame!) */}
      {rect && (
        <div
          style={{
            position: 'fixed',
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            borderRadius: '12px',
            border: '2px solid #ff8a00',
            boxShadow: '0 0 24px rgba(255, 138, 0, 0.5), inset 0 0 14px rgba(0, 240, 255, 0.2)',
            transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Floating Coach-Mark Guide Card */}
      <div
        style={{
          position: 'fixed',
          top: `${coords.cardTop}px`,
          left: `${coords.cardLeft}px`,
          width: '380px',
          borderRadius: '16px',
          background: 'rgba(9, 14, 26, 0.98)',
          border: '1px solid rgba(0, 240, 255, 0.55)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.88), 0 0 28px rgba(0, 240, 255, 0.22)',
          padding: '18px 20px',
          pointerEvents: 'auto',
          transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Top Header Row: Clean Step Pill + Location Badge (Never wraps!) */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
            <span
              style={{
                padding: '3px 9px',
                borderRadius: '6px',
                background: 'linear-gradient(135deg, #ff8a00, #ff5e00)',
                color: '#05070c',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                fontWeight: 900,
                letterSpacing: '0.04em',
              }}
            >
              STEP {currentStop.stepNum} / 0{TOUR_STOPS.length}
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px 9px',
                borderRadius: '6px',
                background: 'rgba(0, 240, 255, 0.1)',
                border: '1px solid rgba(0, 240, 255, 0.3)',
                color: 'var(--quantum-cyan)',
                fontSize: '11px',
                fontWeight: 700,
              }}
            >
              <MapPin size={11} />
              <span>{currentStop.locationBadge}</span>
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
            <button
              className={`btn-ghost ${autoWalk ? 'active' : ''}`}
              onClick={() => setAutoWalk(!autoWalk)}
              style={{ padding: '4px 8px', fontSize: '10.5px', whiteSpace: 'nowrap' }}
            >
              {autoWalk ? <Pause size={11} /> : <Play size={11} />}
              <span>{autoWalk ? '정지' : '자동'}</span>
            </button>
            <button className="btn-ghost" onClick={onClose} style={{ padding: '4px 7px' }} title="가이드 닫기">
              <X size={13} />
            </button>
          </div>
        </div>

        {/* Step Progress Bar */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${TOUR_STOPS.length}, 1fr)`,
            gap: '5px',
            marginBottom: '14px',
          }}
        >
          {TOUR_STOPS.map((st, idx) => (
            <div
              key={st.id}
              onClick={() => {
                setAutoWalk(false);
                setStepIdx(idx);
              }}
              style={{
                height: '4px',
                borderRadius: '99px',
                cursor: 'pointer',
                background:
                  idx === stepIdx
                    ? 'var(--eunjo-orange)'
                    : idx < stepIdx
                    ? '#10b981'
                    : 'rgba(255,255,255,0.14)',
              }}
              title={st.title}
            />
          ))}
        </div>

        {/* Title & Role Explanation */}
        <div style={{ marginBottom: '12px' }}>
          <div
            style={{
              fontSize: '15px',
              fontWeight: 800,
              color: '#fff',
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
            }}
          >
            <Compass size={15} color="#ff8a00" style={{ flexShrink: 0 }} />
            <span>{currentStop.title}</span>
          </div>

          <div
            style={{
              padding: '10px 12px',
              borderRadius: '10px',
              background: 'rgba(255, 138, 0, 0.08)',
              border: '1px solid rgba(255, 138, 0, 0.25)',
              fontSize: '12.5px',
              color: '#f8fafc',
              lineHeight: 1.5,
              marginBottom: '8px',
            }}
          >
            <strong style={{ color: 'var(--eunjo-gold)' }}>역할 · </strong>
            {currentStop.roleDesc}
          </div>

          <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.45 }}>
            <strong style={{ color: 'var(--quantum-cyan)' }}>팁 · </strong>
            {currentStop.howToUse}
          </div>
        </div>

        {/* Optional Interactive "Try It Here" Button */}
        {currentStop.tryLabel && (
          <button
            className="btn-sci-cyan"
            onClick={handleTry}
            disabled={busy}
            style={{ width: '100%', marginBottom: '10px', padding: '8px', fontSize: '12px' }}
          >
            <Sparkles size={13} />
            <span>{busy ? '실행 중...' : currentStop.tryLabel}</span>
          </button>
        )}

        {/* Navigation Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
          <button
            className="btn-ghost"
            disabled={stepIdx === 0}
            onClick={() => {
              setAutoWalk(false);
              setStepIdx((s) => Math.max(0, s - 1));
            }}
            style={{ padding: '7px 12px', whiteSpace: 'nowrap' }}
          >
            <ArrowLeft size={13} />
            <span>이전</span>
          </button>

          {stepIdx < TOUR_STOPS.length - 1 ? (
            <button
              className="btn-primary-orange"
              onClick={() => {
                setAutoWalk(false);
                setStepIdx((s) => s + 1);
              }}
              style={{ flex: 1, padding: '8px 14px', fontSize: '12.5px' }}
            >
              <span>다음 기능 위치 보기</span>
              <ArrowRight size={14} />
            </button>
          ) : (
            <button
              className="btn-primary-orange"
              onClick={onClose}
              style={{ flex: 1, padding: '8px 14px', fontSize: '12.5px' }}
            >
              <CheckCircle2 size={14} />
              <span>가이드 완료</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
