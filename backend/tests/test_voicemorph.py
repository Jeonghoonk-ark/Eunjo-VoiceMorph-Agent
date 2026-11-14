"""
Automated Test Suite for EUNJO VoiceMorph Agent Backend
Verifies Test Scenarios TC-01 through TC-24 from Section XVII of the Development Plan.
"""
import io
import wave
import numpy as np
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.database import init_db
from app.services.seed_service import seed_initial_data

init_db()
seed_initial_data()
client = TestClient(app)


def _make_wav_bytes(samples: np.ndarray, sample_rate: int = 24000) -> bytes:
    buf = io.BytesIO()
    pcm16 = (np.clip(samples, -0.999, 0.999) * 32767.0).astype(np.int16)
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(pcm16.tobytes())
    return buf.getvalue()


def test_tc01_upload_valid_wav():
    """TC-01: 정상 WAV 업로드 및 파일 분석 성공"""
    t = np.linspace(0, 1.5, 24000 * 2, dtype=np.float32)
    sig = 0.5 * np.sin(2 * np.pi * 220.0 * t)
    wav_bytes = _make_wav_bytes(sig, 24000)

    res = client.post(
        "/api/projects/VM-2026-0001/audio",
        files={"file": ("test_valid.wav", wav_bytes, "audio/wav")},
        data={
            "title": "TC-01 정상 업로드 테스트",
            "emotion_tag": "NEUTRAL",
            "script_text": "테스트 음성입니다.",
            "consent_verified": "true",
        },
    )
    assert res.status_code == 200
    body = res.json()
    assert body["audio_id"].startswith("AUD-UP-")
    assert len(body["waveform_peaks"]) == 160
    assert len(body["f0_contour"]) == 100


def test_tc03_corrupted_audio_rejected():
    """TC-03: 손상된 오디오 업로드 시 오류 표시"""
    res = client.post(
        "/api/projects/VM-2026-0001/audio",
        files={"file": ("corrupt.wav", b"NOT_A_VALID_WAV_HEADER_DATA_BYTES_12345678901234567890", "audio/wav")},
        data={"title": "Corrupt", "consent_verified": "true"},
    )
    assert res.status_code == 400
    assert "TC-03" in res.json()["detail"]


def test_tc04_silent_audio_rejected():
    """TC-04: 무음 입력 시 무음 안내 및 거부"""
    silent = np.zeros(24000, dtype=np.float32)
    wav_bytes = _make_wav_bytes(silent, 24000)
    res = client.post(
        "/api/projects/VM-2026-0001/audio",
        files={"file": ("silent.wav", wav_bytes, "audio/wav")},
        data={"title": "Silent", "consent_verified": "true"},
    )
    assert res.status_code == 400
    assert "TC-04" in res.json()["detail"]


def test_tc06_to_tc11_korean_emotional_speech_conversion_and_metrics():
    """TC-06~11, TC-14, TC-20: 한국어 감정 대사 변환, F0/운율 보존, CPU 추론 시간 측정"""
    res = client.post(
        "/api/conversions",
        json={
            "project_id": "VM-2026-0001",
            "source_audio_id": "AUD-ORIG-002",
            "target_voice_id": "CHARACTER-002",
            "pitch_shift": 2.0,
            "retrieval_ratio": 0.85,
            "protect_setting": 0.40,
            "noise_reduction": 0.20,
            "output_gain_db": 0.0,
            "purpose": "CREATIVE_PRODUCTION",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["job"]["status"] == "SUCCEEDED"
    assert data["job"]["rtf"] < 1.0
    assert data["quality_metrics"]["f0_correlation"] >= 0.70
    assert data["quality_metrics"]["overall_score"] >= 75.0


def test_tc12_unauthorized_voice_blocked():
    """TC-12: 허가되지 않은 음색(PENDING) 변환 차단"""
    res = client.post(
        "/api/conversions",
        json={
            "project_id": "VM-2026-0001",
            "source_audio_id": "AUD-ORIG-001",
            "target_voice_id": "CHARACTER-005",  # PENDING consent
            "purpose": "CREATIVE_PRODUCTION",
        },
    )
    assert res.status_code == 403
    assert "Consent Guard" in res.json()["detail"]


def test_tc13_expired_consent_blocked():
    """TC-13: 만료된 동의(EXPIRED) 음색 변환 차단"""
    res = client.post(
        "/api/conversions",
        json={
            "project_id": "VM-2026-0001",
            "source_audio_id": "AUD-ORIG-001",
            "target_voice_id": "CHARACTER-006",  # EXPIRED consent
            "purpose": "PRIVATE_DEMO",
        },
    )
    assert res.status_code == 403
    assert "Consent Guard" in res.json()["detail"]


def test_tc24_purpose_violation_blocked():
    """TC-24: 음색 사용 목적 위반 요청 차단"""
    res = client.post(
        "/api/conversions",
        json={
            "project_id": "VM-2026-0001",
            "source_audio_id": "AUD-ORIG-001",
            "target_voice_id": "CHARACTER-004",  # Allowed: GAME_NPC, CHARACTER_VIDEO, PRIVATE_DEMO
            "purpose": "UNAUTHORIZED_PUBLIC_BROADCAST",
        },
    )
    assert res.status_code == 403
    assert "TC-24" in res.json()["detail"]


def test_tc21_partial_segment_reconversion():
    """TC-21: 특정 구간(1000ms~2800ms) 선택 부분 재변환 및 크로스페이드 병합"""
    res = client.post(
        "/api/conversions",
        json={
            "project_id": "VM-2026-0001",
            "source_audio_id": "AUD-ORIG-001",
            "target_voice_id": "CHARACTER-001",
            "pitch_shift": 3.5,
            "segment_start_ms": 1000,
            "segment_end_ms": 2800,
            "base_converted_audio_id": "AUD-CONV-001",
            "purpose": "CREATIVE_PRODUCTION",
        },
    )
    assert res.status_code == 200
    body = res.json()
    assert "구간 재변환" in body["converted_audio"]["title"]


def test_tc18_export_and_download():
    """TC-18: WAV 및 패키지 출력 파일 생성 및 다운로드 검증"""
    exp_res = client.post(
        "/api/projects/VM-2026-0001/exports",
        json={
            "audio_id": "AUD-CONV-001",
            "job_id": "JOB-2026-0001",
            "format": "wav",
            "file_name": "Test_Export_Master",
        },
    )
    assert exp_res.status_code == 200
    exp_data = exp_res.json()
    dl_res = client.get(exp_data["download_url"])
    assert dl_res.status_code == 200
    assert len(dl_res.content) > 1000
