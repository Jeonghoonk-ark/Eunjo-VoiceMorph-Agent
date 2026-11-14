import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  Square,
  Upload,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Volume2,
  X,
} from 'lucide-react';

interface AudioRecorderModalProps {
  projectId: string;
  onClose: () => void;
  onAudioCreated: (newAudioId: string) => void;
}

function encodeFloat32ToWavBlob(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buffer], { type: 'audio/wav' });
}

export const AudioRecorderModal: React.FC<AudioRecorderModalProps> = ({
  projectId,
  onClose,
  onAudioCreated,
}) => {
  const [title, setTitle] = useState<string>('마이크 직접 연기 테이크');
  const [scriptText, setScriptText] = useState<string>('정말… 네가 돌아온 거야?');
  const [emotionTag, setEmotionTag] = useState<string>('TREMBLING_EMOTION');
  const [consentChecked, setConsentChecked] = useState<boolean>(true);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordSeconds, setRecordSeconds] = useState<number>(0);
  const [inputLevel, setInputLevel] = useState<number>(0);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Float32Array[]>([]);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      stopMicStream();
    };
  }, []);

  const stopMicStream = () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
    }
  };

  const startBrowserRecording = async () => {
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx({ sampleRate: 24000 });
      audioCtxRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const processor = ctx.createScriptProcessor(4096, 1, 1);
      chunksRef.current = [];

      processor.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0);
        chunksRef.current.push(new Float32Array(input));
        let sum = 0;
        for (let i = 0; i < input.length; i++) sum += input[i] * input[i];
        const rms = Math.sqrt(sum / input.length);
        setInputLevel(Math.min(100, Math.round(rms * 350)));
      };

      source.connect(processor);
      processor.connect(ctx.destination);

      setIsRecording(true);
      setRecordSeconds(0);
      timerRef.current = window.setInterval(() => {
        setRecordSeconds((s) => s + 1);
      }, 1000);
    } catch {
      setErrorMsg(
        '마이크 장치를 찾을 수 없거나 권한이 거부되었습니다. 아래 [감정 연기 신디사이저 테이크 생성] 또는 [파일 업로드]를 사용할 수 있습니다.'
      );
    }
  };

  const stopAndSaveBrowserRecording = async () => {
    if (!isRecording) return;
    setIsRecording(false);
    const sr = audioCtxRef.current?.sampleRate || 24000;
    stopMicStream();

    const totalLen = chunksRef.current.reduce((acc, c) => acc + c.length, 0);
    if (totalLen < 2400) {
      setErrorMsg('녹음 시간이 너무 짧습니다. 1초 이상 녹음해 주세요.');
      return;
    }

    const merged = new Float32Array(totalLen);
    let offset = 0;
    for (const c of chunksRef.current) {
      merged.set(c, offset);
      offset += c.length;
    }

    const wavBlob = encodeFloat32ToWavBlob(merged, sr);
    await uploadWavBlob(wavBlob, `${title}.wav`);
  };

  const uploadWavBlob = async (blob: Blob, filename: string, overrideTitle?: string) => {
    if (!consentChecked) {
      setErrorMsg('본인 녹음 및 적법한 음성 사용 권한 동의 체크가 필요합니다.');
      return;
    }
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const formData = new FormData();
      formData.append('file', blob, filename);
      formData.append('title', overrideTitle || title);
      formData.append('emotion_tag', emotionTag);
      formData.append('script_text', scriptText);
      formData.append('consent_verified', String(consentChecked));

      const res = await fetch(`/api/projects/${projectId}/audio`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || '오디오 업로드에 실패했습니다.');
      }
      setStatusMsg('성공적으로 녹음/업로드 및 VAD·F0 분석이 완료되었습니다!');
      onAudioCreated(data.audio_id);
      setTimeout(onClose, 600);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : '업로드 오류 발생');
    } finally {
      setIsSubmitting(false);
    }
  };

  const [isDraggingFile, setIsDraggingFile] = useState<boolean>(false);

  const processAndUploadAudioFile = async (file: File) => {
    const cleanName = file.name.replace(/\.[^/.]+$/, '');
    const uploadTitle = title === '마이크 직접 연기 테이크' ? cleanName : title;

    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    // Directly supported by soundfile (WAV, MP3, FLAC, OGG)
    if (['wav', 'mp3', 'flac', 'ogg'].includes(ext)) {
      await uploadWavBlob(file, file.name, uploadTitle);
      return;
    }

    // Fallback for M4A / AAC / WEBM / MP4 using Web Audio API decodeAudioData -> 24kHz WAV
    try {
      setIsSubmitting(true);
      const arrayBuf = await file.arrayBuffer();
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx({ sampleRate: 24000 });
      const audioBuffer = await ctx.decodeAudioData(arrayBuf);
      const channelData = audioBuffer.getChannelData(0);
      const wavBlob = encodeFloat32ToWavBlob(channelData, audioBuffer.sampleRate);
      await ctx.close();
      await uploadWavBlob(wavBlob, `${cleanName}.wav`, uploadTitle);
    } catch {
      setIsSubmitting(false);
      setErrorMsg('지원하지 않거나 손상된 오디오 파일입니다 (WAV, MP3, M4A, FLAC, OGG 지원).');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    await processAndUploadAudioFile(f);
  };

  const handleDropFile = async (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDraggingFile(false);
    const f = e.dataTransfer.files?.[0];
    if (!f) return;
    await processAndUploadAudioFile(f);
  };

  const handleSynthesizeStudioTake = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/recordings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          title,
          emotion_tag: emotionTag,
          script_text: scriptText,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || '테이크 생성 실패');
      setStatusMsg('한국어 감정 연기 테이크가 생성되었습니다!');
      onAudioCreated(data.audio_id);
      setTimeout(onClose, 500);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : '테이크 생성 오류');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 150,
        background: 'rgba(3, 6, 14, 0.82)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div className="sci-panel glow-orange" style={{ width: '100%', maxWidth: '580px', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Mic size={18} color="#ff8a00" />
            <h3 style={{ fontSize: '16px', fontWeight: 800 }}>한국어 대사 녹음 · 파일 입력 스튜디오</h3>
          </div>
          <button className="btn-ghost" onClick={onClose}>
            <X size={15} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>
              테이크 제목 (Take Title)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                background: 'rgba(15, 23, 42, 0.9)',
                border: '1px solid var(--border-subtle)',
                color: '#fff',
                fontSize: '13px',
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>
                대사 스크립트 (Korean Script)
              </label>
              <input
                type="text"
                value={scriptText}
                onChange={(e) => setScriptText(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  background: 'rgba(15, 23, 42, 0.9)',
                  border: '1px solid var(--border-subtle)',
                  color: '#fff',
                  fontSize: '13px',
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>
                감정 연기 스타일 (Acting Emotion)
              </label>
              <select
                value={emotionTag}
                onChange={(e) => setEmotionTag(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  background: 'rgba(15, 23, 42, 0.9)',
                  border: '1px solid var(--border-subtle)',
                  color: '#fff',
                  fontSize: '13px',
                }}
              >
                <option value="TREMBLING_EMOTION">애절하고 떨리는 감정 (Trembling)</option>
                <option value="JOYFUL_EXCITEMENT">기쁨에 찬 환희 (Joyful Excitement)</option>
                <option value="SURPRISED_WHISPER">놀라서 속삭이는 대사 (Whisper)</option>
                <option value="PLAYFUL_NARRATION">장난스럽고 경쾌한 대사 (Playful)</option>
              </select>
            </div>
          </div>

          {/* Consent Checkbox (Section XIV.2) */}
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '9px',
              padding: '10px 12px',
              borderRadius: '8px',
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              fontSize: '12px',
              color: '#d1fae5',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={consentChecked}
              onChange={(e) => setConsentChecked(e.target.checked)}
            />
            <span>
              [필수] 본 음성은 창작자 본인이 직접 녹음했거나 적법한 사용 권한을 확보한 음성임을 확인합니다.
            </span>
          </label>

          {/* Live Microphone Recorder Box */}
          <div
            style={{
              padding: '16px',
              borderRadius: '10px',
              background: 'rgba(6, 10, 19, 0.9)',
              border: '1px solid rgba(0, 240, 255, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Volume2 size={15} color="#00f0ff" />
                <span style={{ fontSize: '12px', fontWeight: 700 }}>브라우저 마이크 실시간 녹음 (24kHz PCM WAV)</span>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--eunjo-gold)' }}>
                {isRecording ? `REC ● 00:0${recordSeconds}` : 'READY'}
              </span>
            </div>

            {/* Level Meter */}
            <div
              style={{
                width: '100%',
                height: '8px',
                background: 'rgba(255,255,255,0.07)',
                borderRadius: '99px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${isRecording ? Math.max(8, inputLevel) : 0}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #10b981, #ff8a00, #ef4444)',
                  transition: 'width 0.08s ease',
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {!isRecording ? (
                <button className="btn-primary-orange" onClick={startBrowserRecording} disabled={isSubmitting}>
                  <Mic size={14} />
                  <span>마이크 녹음 시작</span>
                </button>
              ) : (
                <button
                  className="btn-primary-orange"
                  onClick={stopAndSaveBrowserRecording}
                  style={{ background: '#ef4444', color: '#fff' }}
                >
                  <Square size={14} />
                  <span>녹음 정지 및 저장</span>
                </button>
              )}

              <button className="btn-sci-cyan" onClick={handleSynthesizeStudioTake} disabled={isSubmitting}>
                <Sparkles size={14} />
                <span>감정 연기 테이크 즉시 생성</span>
              </button>
            </div>
          </div>

          {/* Drag & Drop File Upload Zone */}
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setIsDraggingFile(true);
            }}
            onDragLeave={() => setIsDraggingFile(false)}
            onDrop={handleDropFile}
            style={{
              padding: '16px',
              borderRadius: '10px',
              border: isDraggingFile
                ? '1.5px dashed #ff8a00'
                : '1.5px dashed rgba(0, 240, 255, 0.38)',
              background: isDraggingFile
                ? 'rgba(255, 138, 0, 0.12)'
                : 'rgba(6, 12, 24, 0.75)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              cursor: 'pointer',
              transition: 'all 0.18s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '9px',
                  background: 'rgba(255, 138, 0, 0.14)',
                  border: '1px solid rgba(255, 138, 0, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ff8a00',
                  flexShrink: 0,
                }}
              >
                <Upload size={17} />
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#fff' }}>
                  내 PC 오디오 파일 업로드 (클릭 또는 드래그 앤 드롭)
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  WAV · MP3 · M4A · FLAC · OGG 지원 (24kHz 자동 리샘플링 및 F0 억양 추출)
                </div>
              </div>
            </div>
            <span
              style={{
                padding: '6px 12px',
                borderRadius: '7px',
                background: 'rgba(255, 138, 0, 0.18)',
                border: '1px solid rgba(255, 138, 0, 0.45)',
                color: '#ffb800',
                fontSize: '11.5px',
                fontWeight: 800,
                whiteSpace: 'nowrap',
              }}
            >
              파일 선택
            </span>
            <input
              type="file"
              accept=".wav,.mp3,.m4a,.flac,.ogg,.webm,audio/*"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
          </label>

          {errorMsg && (
            <div
              style={{
                padding: '10px 12px',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.14)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                color: '#fca5a5',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertTriangle size={15} />
              <span>{errorMsg}</span>
            </div>
          )}

          {statusMsg && (
            <div
              style={{
                padding: '10px 12px',
                borderRadius: '8px',
                background: 'rgba(16, 185, 129, 0.14)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                color: '#6ee7b7',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <CheckCircle2 size={15} />
              <span>{statusMsg}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
