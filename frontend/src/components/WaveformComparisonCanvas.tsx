import React, { useRef, useEffect } from 'react';
import { Play, Pause, Repeat, Scissors, Sparkles, Radio } from 'lucide-react';

export interface AudioAssetItem {
  audio_id: string;
  project_id: string;
  title: string;
  emotion_tag: string;
  script_text: string;
  asset_type: string;
  format: string;
  sample_rate: number;
  channels: number;
  duration_ms: number;
  source_type: string;
  consent_verified: boolean;
  storage_key: string;
  waveform_peaks: number[];
  f0_contour: number[];
  stream_url: string;
  created_at: string;
}

interface WaveformComparisonCanvasProps {
  originalAudio: AudioAssetItem | null;
  convertedAudio: AudioAssetItem | null;
  activeChannel: 'A' | 'B';
  setActiveChannel: (ch: 'A' | 'B') => void;
  isPlaying: boolean;
  onTogglePlay: (ch?: 'A' | 'B') => void;
  playProgressRatio: number;
  segmentRange: [number, number];
  setSegmentRange: (range: [number, number]) => void;
  enablePartialMode: boolean;
  setEnablePartialMode: (enabled: boolean) => void;
  onRunPartialReconvert: () => void;
  isConverting: boolean;
}

export const WaveformComparisonCanvas: React.FC<WaveformComparisonCanvasProps> = ({
  originalAudio,
  convertedAudio,
  activeChannel,
  setActiveChannel,
  isPlaying,
  onTogglePlay,
  playProgressRatio,
  segmentRange,
  setSegmentRange,
  enablePartialMode,
  setEnablePartialMode,
  onRunPartialReconvert,
  isConverting,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Subtle scientific grid
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.06)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    const midY = h / 2;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(w, midY);
    ctx.stroke();

    // Original Waveform (Top - Quantum Cyan)
    const origPeaks = originalAudio?.waveform_peaks || [];
    if (origPeaks.length > 0) {
      const barW = w / origPeaks.length;
      origPeaks.forEach((pk, idx) => {
        const x = idx * barW;
        const barH = Math.max(3, pk * (midY - 18));
        const ratio = idx / origPeaks.length;
        ctx.fillStyle =
          activeChannel === 'A' && ratio <= playProgressRatio
            ? '#00f0ff'
            : 'rgba(0, 240, 255, 0.42)';
        ctx.fillRect(x + 1, midY - barH - 3, Math.max(1.5, barW - 1.5), barH);
      });
    }

    // Converted Waveform (Bottom - Eunjo Golden Orange)
    const convPeaks = convertedAudio?.waveform_peaks || [];
    if (convPeaks.length > 0) {
      const barW = w / convPeaks.length;
      convPeaks.forEach((pk, idx) => {
        const x = idx * barW;
        const barH = Math.max(3, pk * (midY - 18));
        const ratio = idx / convPeaks.length;
        ctx.fillStyle =
          activeChannel === 'B' && ratio <= playProgressRatio
            ? '#ff8a00'
            : 'rgba(255, 138, 0, 0.45)';
        ctx.fillRect(x + 1, midY + 3, Math.max(1.5, barW - 1.5), barH);
      });
    }

    // F0 Pitch Contours
    const drawF0Curve = (f0: number[], color: string, yBase: number, dir: number) => {
      if (!f0 || f0.length === 0) return;
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      let started = false;
      f0.forEach((hz, idx) => {
        if (hz <= 40) {
          started = false;
          return;
        }
        const x = (idx / f0.length) * w;
        const norm = Math.min(1, Math.max(0, (hz - 90) / 280));
        const y = yBase + dir * (10 + norm * (midY - 24));
        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();
    };

    if (originalAudio?.f0_contour) {
      drawF0Curve(originalAudio.f0_contour, '#e0f2fe', midY, -1);
    }
    if (convertedAudio?.f0_contour) {
      drawF0Curve(convertedAudio.f0_contour, '#fde047', midY, 1);
    }

    // Partial Re-conversion Selection Region
    if (enablePartialMode && originalAudio) {
      const dur = Math.max(1, originalAudio.duration_ms);
      const startX = (segmentRange[0] / dur) * w;
      const endX = (segmentRange[1] / dur) * w;
      ctx.fillStyle = 'rgba(168, 85, 247, 0.2)';
      ctx.fillRect(startX, 0, Math.max(4, endX - startX), h);

      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(startX, 0);
      ctx.lineTo(startX, h);
      ctx.moveTo(endX, 0);
      ctx.lineTo(endX, h);
      ctx.stroke();
    }

    // Playhead
    const playX = playProgressRatio * w;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(playX, 0);
    ctx.lineTo(playX, h);
    ctx.stroke();
  }, [
    originalAudio,
    convertedAudio,
    activeChannel,
    playProgressRatio,
    enablePartialMode,
    segmentRange,
  ]);

  const durMs = originalAudio?.duration_ms || 4600;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Clean Visual A/B Transport Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            className={`btn-ghost ${activeChannel === 'A' ? 'active' : ''}`}
            onClick={() => {
              setActiveChannel('A');
              onTogglePlay('A');
            }}
            style={{
              borderColor: activeChannel === 'A' ? 'var(--quantum-cyan)' : undefined,
              color: activeChannel === 'A' ? 'var(--quantum-cyan)' : undefined,
            }}
          >
            {isPlaying && activeChannel === 'A' ? <Pause size={14} /> : <Play size={14} />}
            <Radio size={13} />
            <span>A // ORIGINAL</span>
          </button>

          <button
            className={`btn-ghost ${activeChannel === 'B' ? 'active' : ''}`}
            disabled={!convertedAudio}
            onClick={() => {
              setActiveChannel('B');
              onTogglePlay('B');
            }}
          >
            {isPlaying && activeChannel === 'B' ? <Pause size={14} /> : <Play size={14} />}
            <Sparkles size={13} />
            <span>B // MORPHED</span>
          </button>

          <button
            className="btn-ghost"
            disabled={!convertedAudio}
            onClick={() => {
              const next = activeChannel === 'A' ? 'B' : 'A';
              setActiveChannel(next);
              onTogglePlay(next);
            }}
            title="A/B 교차 재생"
          >
            <Repeat size={13} />
            <span>A/B</span>
          </button>
        </div>

        <button
          className={`btn-ghost ${enablePartialMode ? 'active' : ''}`}
          onClick={() => setEnablePartialMode(!enablePartialMode)}
        >
          <Scissors size={13} />
          <span>REGION SPLICE</span>
        </button>
      </div>

      {/* Dual Waveform Canvas */}
      <div
        style={{
          position: 'relative',
          borderRadius: '12px',
          overflow: 'hidden',
          border: '1px solid rgba(148, 163, 184, 0.18)',
          background: '#04070f',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '8px',
            left: '12px',
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            color: 'var(--quantum-cyan)',
            pointerEvents: 'none',
          }}
        >
          CH A · ORIGINAL + F0
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: '8px',
            left: '12px',
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            color: 'var(--eunjo-gold)',
            pointerEvents: 'none',
          }}
        >
          CH B · MORPHED + F0
        </div>
        <canvas
          ref={canvasRef}
          width={860}
          height={230}
          style={{ width: '100%', height: '230px', display: 'block' }}
        />
      </div>

      {/* Compact Partial Region Bar */}
      {enablePartialMode && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: '10px',
            background: 'rgba(168, 85, 247, 0.1)',
            border: '1px solid rgba(168, 85, 247, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '14px',
          }}
        >
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#e9d5ff' }}>
            {(segmentRange[0] / 1000).toFixed(1)}s – {(segmentRange[1] / 1000).toFixed(1)}s
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
            <input
              type="range"
              className="sci-slider"
              min={0}
              max={Math.max(500, segmentRange[1] - 400)}
              step={100}
              value={segmentRange[0]}
              onChange={(e) => setSegmentRange([Number(e.target.value), segmentRange[1]])}
            />
            <input
              type="range"
              className="sci-slider"
              min={segmentRange[0] + 400}
              max={durMs}
              step={100}
              value={segmentRange[1]}
              onChange={(e) => setSegmentRange([segmentRange[0], Number(e.target.value)])}
            />
          </div>
          <button
            className="btn-sci-cyan"
            onClick={onRunPartialReconvert}
            disabled={isConverting}
            style={{ borderColor: '#a855f7', color: '#f3e8ff', background: 'rgba(168, 85, 247, 0.25)' }}
          >
            <Scissors size={13} />
            <span>구간 재변환</span>
          </button>
        </div>
      )}
    </div>
  );
};
