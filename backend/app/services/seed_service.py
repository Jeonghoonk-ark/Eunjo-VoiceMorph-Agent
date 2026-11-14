"""
Initial Studio Seeding Service for EUNJO VoiceMorph Agent.
Creates verified voice profiles, consent/license records, REAL Korean neural speech acting WAV takes,
and initial conversion jobs & benchmarks.
"""
import json
import hashlib
import asyncio
from pathlib import Path
from typing import Dict, Any, List

import numpy as np

from app.core.database import get_db_connection, DATA_DIR, MODELS_DIR, now_kst_iso
from app.services.audio_engine import (
    synthesize_korean_acting_take,
    write_wav_mono_int16,
    extract_waveform_peaks,
    extract_f0_contour,
    VoiceConversionProvider,
    QualityAnalyzer,
    _edge_tts_part,
    _windows_sapi_fallback,
)


def _generate_character_preview_sample(voice: Dict[str, Any], provider: VoiceConversionProvider) -> np.ndarray:
    """Generate a natural, distinct Korean voice sample for each character profile."""
    vid = voice["voice_id"]
    try:
        if vid == "CHARACTER-001":
            # Warm Storyteller (EUNJO AURA)
            raw = asyncio.run(
                _edge_tts_part(
                    "안녕하세요, 은조 아우라입니다. 당신이 연기한 소중한 감정을 따뜻하게 전해드릴게요.",
                    "ko-KR-SunHiNeural",
                    "-6%",
                    "+2Hz",
                )
            )
        elif vid == "CHARACTER-002":
            # Bright Anime Heroine (NOVA-K)
            raw = asyncio.run(
                _edge_tts_part(
                    "안녕! 나는 노바 케이야! 너의 연기를 밝고 경쾌한 주인공 목소리로 바꿔줄게!",
                    "ko-KR-SunHiNeural",
                    "+14%",
                    "+24Hz",
                )
            )
        elif vid == "CHARACTER-003":
            # Calm Futuristic Male AI Guide (CHRONO-7)
            raw = asyncio.run(
                _edge_tts_part(
                    "크로노 세븐 오디오 시스템 가동. 원본 억양을 보존하여 차분한 안내 음성으로 변환합니다.",
                    "ko-KR-InJoonNeural",
                    "-4%",
                    "-6Hz",
                )
            )
        elif vid == "CHARACTER-004":
            # Tactical Game Commander (VALKYRIE-X)
            raw = asyncio.run(
                _edge_tts_part(
                    "발키리 엑스 통신 연결. 지금부터 우리의 진짜 작전을 시작한다.",
                    "ko-KR-HyunsuMultilingualNeural",
                    "+2%",
                    "-4Hz",
                )
            )
        elif vid == "CHARACTER-005":
            raw = asyncio.run(
                _edge_tts_part(
                    "섀도우 제로 테스트 음색입니다. 현재 성우 동의 심사 대기 상태입니다.",
                    "ko-KR-InJoonNeural",
                    "-8%",
                    "-12Hz",
                )
            )
        else:
            raw = asyncio.run(
                _edge_tts_part(
                    "레트로 바드 아카이브 음색입니다. 사용 계약 기간이 만료되었습니다.",
                    "ko-KR-HyunsuMultilingualNeural",
                    "-6%",
                    "-8Hz",
                )
            )
        pad = np.zeros(int(24000 * 0.1), dtype=np.float32)
        arr = np.concatenate([pad, raw, pad])
        peak = float(np.max(np.abs(arr)) + 1e-6)
        return ((arr / peak) * 0.85).astype(np.float32)
    except Exception:
        base_take = synthesize_korean_acting_take("PLAYFUL_NARRATION", 24000)
        return provider.convert(
            base_take,
            24000,
            {"pitch_shift": voice["pitch_shift_default"], "retrieval_ratio": 0.82},
            voice,
        )


def seed_initial_data(force_rebuild: bool = False) -> None:
    conn = get_db_connection()
    cur = conn.cursor()

    if not force_rebuild:
        cur.execute("SELECT COUNT(*) as cnt FROM voice_profiles")
        if cur.fetchone()["cnt"] > 0:
            conn.close()
            return
    else:
        for tbl in [
            "projects",
            "voice_profiles",
            "voice_models",
            "voice_consents",
            "voice_licenses",
            "audio_assets",
            "audio_segments",
            "conversion_configs",
            "conversion_jobs",
            "quality_metrics",
            "review_results",
            "exports",
            "audit_logs",
        ]:
            cur.execute(f"DELETE FROM {tbl}")
        conn.commit()

    now = now_kst_iso()
    provider = VoiceConversionProvider()

    voices = [
        {
            "voice_id": "CHARACTER-001",
            "voice_name": "EUNJO AURA (은조 아우라)",
            "character_title": "따뜻한 감성 이야기꾼 · Golden Storyteller",
            "description": "풍부한 중음역 공명과 부드러운 호흡감을 지닌 시그니처 내레이션·드라마 캐릭터 음색.",
            "language": ["ko", "en"],
            "model_id": "MDL-RVC-EUNJO-01",
            "model_type": "RVC-v2.5",
            "model_version": "2.5.0",
            "license_type": "Eunjo Golden Orange Exclusive License",
            "license_status": "VERIFIED",
            "consent_status": "APPROVED",
            "commercial_use_allowed": 1,
            "approved_uses": ["CREATIVE_PRODUCTION", "CHARACTER_VIDEO", "EDUCATION", "PRIVATE_DEMO"],
            "pitch_base_hz": 225.0,
            "pitch_shift_default": 1.5,
            "formant_shift": 1.05,
            "timbre_warmth": 0.78,
            "breathiness": 0.05,
            "accent_color": "#FF8A00",
            "provider_name": "Eunjo Voice Lab Original Actor #01",
            "expires_at": "2028-12-31T23:59:59+09:00",
            "status": "ACTIVE",
        },
        {
            "voice_id": "CHARACTER-002",
            "voice_name": "NOVA-K (노바 케이)",
            "character_title": "밝고 경쾌한 애니메이션 히로인 · Bright Anime Lead",
            "description": "선명한 고음역 포르만트와 탄력 있는 어택을 가진 애니메이션·웹툰 주인공 음색.",
            "language": ["ko", "ja"],
            "model_id": "MDL-RVC-NOVA-02",
            "model_type": "RVC-v2.5",
            "model_version": "2.5.0",
            "license_type": "Creator Studio Commercial License",
            "license_status": "VERIFIED",
            "consent_status": "APPROVED",
            "commercial_use_allowed": 1,
            "approved_uses": ["CREATIVE_PRODUCTION", "CHARACTER_VIDEO", "GAME_NPC", "PRIVATE_DEMO"],
            "pitch_base_hz": 268.0,
            "pitch_shift_default": 3.5,
            "formant_shift": 1.15,
            "timbre_warmth": 0.42,
            "breathiness": 0.04,
            "accent_color": "#00F0FF",
            "provider_name": "Studio Nova Voice Guild",
            "expires_at": "2028-06-30T23:59:59+09:00",
            "status": "ACTIVE",
        },
        {
            "voice_id": "CHARACTER-003",
            "voice_name": "CHRONO-7 (크로노 세븐)",
            "character_title": "차분한 미래형 AI 안내자 · Sci-Fi Neural Guide",
            "description": "정돈된 중저음 밸런스와 명료한 자음 전달력을 갖춘 미래 과학관·교육·시스템 브리핑 특화 음색.",
            "language": ["ko", "en"],
            "model_id": "MDL-RVC-CHRONO-03",
            "model_type": "RVC-v2.5",
            "model_version": "2.5.0",
            "license_type": "Enterprise & Education Verified License",
            "license_status": "VERIFIED",
            "consent_status": "APPROVED",
            "commercial_use_allowed": 1,
            "approved_uses": ["EDUCATION", "CREATIVE_PRODUCTION", "PRIVATE_DEMO"],
            "pitch_base_hz": 155.0,
            "pitch_shift_default": -4.0,
            "formant_shift": 0.88,
            "timbre_warmth": 0.68,
            "breathiness": 0.02,
            "accent_color": "#38BDF8",
            "provider_name": "Chrono Acoustic Synthesis Consortium",
            "expires_at": "2029-12-31T23:59:59+09:00",
            "status": "ACTIVE",
        },
        {
            "voice_id": "CHARACTER-004",
            "voice_name": "VALKYRIE-X (발키리 엑스)",
            "character_title": "카리스마 게임 커맨더 · Tactical NPC Lead",
            "description": "깊고 단단한 중저음 공명과 강인한 다이내믹을 표현하는 게임 NPC·시네마틱 트레일러 전용 모델.",
            "language": ["ko"],
            "model_id": "MDL-OV2-VALKYRIE-04",
            "model_type": "OpenVoice-V2",
            "model_version": "2.1.0",
            "license_type": "Indie Game Creator License",
            "license_status": "VERIFIED",
            "consent_status": "APPROVED",
            "commercial_use_allowed": 0,
            "approved_uses": ["GAME_NPC", "CHARACTER_VIDEO", "PRIVATE_DEMO", "CREATIVE_PRODUCTION"],
            "pitch_base_hz": 175.0,
            "pitch_shift_default": -2.5,
            "formant_shift": 0.92,
            "timbre_warmth": 0.72,
            "breathiness": 0.03,
            "accent_color": "#A855F7",
            "provider_name": "Valkyrie Interactive Audio Archive",
            "expires_at": "2027-12-31T23:59:59+09:00",
            "status": "ACTIVE",
        },
        {
            "voice_id": "CHARACTER-005",
            "voice_name": "SHADOW-ZERO (섀도우 제로)",
            "character_title": "권한 심사 대기 음색 · Consent Pending Test Voice",
            "description": "[보안 검증용] 성우 동의서 검수(PENDING) 상태인 음색입니다 (TC-12).",
            "language": ["ko"],
            "model_id": "MDL-EXP-SHADOW-05",
            "model_type": "Seed-VC-Exp",
            "model_version": "0.9.0",
            "license_type": "Unverified Evaluation License",
            "license_status": "PENDING_REVIEW",
            "consent_status": "PENDING",
            "commercial_use_allowed": 0,
            "approved_uses": [],
            "pitch_base_hz": 145.0,
            "pitch_shift_default": -4.5,
            "formant_shift": 0.85,
            "timbre_warmth": 0.50,
            "breathiness": 0.05,
            "accent_color": "#EF4444",
            "provider_name": "External Contributor (Pending Verification)",
            "expires_at": "2027-01-01T00:00:00+09:00",
            "status": "RESTRICTED",
        },
        {
            "voice_id": "CHARACTER-006",
            "voice_name": "RETRO-BARD (레트로 바드)",
            "character_title": "계약 만료 아카이브 음색 · Expired Consent Voice",
            "description": "[보안 검증용] 사용 동의 기간이 만료(EXPIRED)된 레거시 음색입니다 (TC-13).",
            "language": ["ko"],
            "model_id": "MDL-RVC-BARD-06",
            "model_type": "RVC-v2.0",
            "model_version": "2.0.0",
            "license_type": "Legacy Archive License (Expired)",
            "license_status": "EXPIRED",
            "consent_status": "EXPIRED",
            "commercial_use_allowed": 0,
            "approved_uses": ["PRIVATE_DEMO"],
            "pitch_base_hz": 185.0,
            "pitch_shift_default": -1.5,
            "formant_shift": 0.95,
            "timbre_warmth": 0.65,
            "breathiness": 0.05,
            "accent_color": "#64748B",
            "provider_name": "Legacy Voice Archive 2024",
            "expires_at": "2025-12-31T23:59:59+09:00",
            "status": "EXPIRED",
        },
    ]

    for idx, v in enumerate(voices):
        sample_rel = f"samples/preview_{v['voice_id']}.wav"
        sample_abs = DATA_DIR / sample_rel
        char_samples = _generate_character_preview_sample(v, provider)
        write_wav_mono_int16(sample_abs, char_samples, 24000)

        model_hash = "sha256:" + hashlib.sha256(v["model_id"].encode("utf-8")).hexdigest()[:32]
        if v["consent_status"] == "APPROVED":
            manifest_path = MODELS_DIR / f"{v['model_id']}.json"
            manifest_path.write_text(
                json.dumps(
                    {
                        "model_id": v["model_id"],
                        "voice_id": v["voice_id"],
                        "voice_name": v["voice_name"],
                        "model_type": v["model_type"],
                        "model_version": v["model_version"],
                        "license_status": v["license_status"],
                        "consent_status": v["consent_status"],
                        "model_file_hash": model_hash,
                    },
                    ensure_ascii=False,
                    indent=2,
                ),
                encoding="utf-8",
            )

        cur.execute(
            """
            INSERT INTO voice_profiles (
                voice_id, voice_name, character_title, description, language_json,
                model_id, model_type, model_version, license_type, license_status,
                consent_status, commercial_use_allowed, approved_uses_json,
                pitch_base_hz, pitch_shift_default, formant_shift, timbre_warmth,
                breathiness, accent_color, sample_audio_key, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                v["voice_id"],
                v["voice_name"],
                v["character_title"],
                v["description"],
                json.dumps(v["language"]),
                v["model_id"],
                v["model_type"],
                v["model_version"],
                v["license_type"],
                v["license_status"],
                v["consent_status"],
                v["commercial_use_allowed"],
                json.dumps(v["approved_uses"]),
                v["pitch_base_hz"],
                v["pitch_shift_default"],
                v["formant_shift"],
                v["timbre_warmth"],
                v["breathiness"],
                v["accent_color"],
                sample_rel,
                v["status"],
                now,
            ),
        )

        cur.execute(
            """
            INSERT INTO voice_models (
                model_id, model_type, model_version, voice_id, runtime_json,
                model_file_hash, sample_rate, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                v["model_id"],
                v["model_type"],
                v["model_version"],
                v["voice_id"],
                json.dumps(["CPU", "ONNX", "CUDA"]),
                model_hash,
                24000,
                v["status"],
                now,
            ),
        )

        cur.execute(
            """
            INSERT INTO voice_consents (
                consent_id, voice_id, provider_name, consent_date, expires_at,
                consent_status, allowed_purposes_json, commercial_allowed,
                public_distribution_allowed, evidence_doc, revoked
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                f"CNS-2026-00{idx+1}",
                v["voice_id"],
                v["provider_name"],
                "2026-01-15T09:00:00+09:00",
                v["expires_at"],
                v["consent_status"],
                json.dumps(v["approved_uses"]),
                v["commercial_use_allowed"],
                1 if v["consent_status"] == "APPROVED" else 0,
                f"docs/licenses/CONSENT-{v['voice_id']}-SIGNED.pdf",
                0,
            ),
        )

        cur.execute(
            """
            INSERT INTO voice_licenses (
                license_id, model_id, license_name, spdx_id, status, conditions_text
            ) VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                f"LIC-2026-00{idx+1}",
                v["model_id"],
                v["license_type"],
                "Proprietary-Consent-Verified",
                v["license_status"],
                "실존 인물 무단 복제 금지, 승인된 창작·교육 목적 내 사용, AI 생성 메타데이터 의무 표기.",
            ),
        )

    projects = [
        (
            "VM-2026-0001",
            "시나리오 A — 애니메이션 단편 '귀환 (The Return)' 주연 대사",
            "동일 대사 4가지 감정 연기 원본 녹음 및 캐릭터 음색 변환 비교 프로젝트",
            "CHARACTER_VIDEO",
            "ko",
            "ACTIVE",
            "CHARACTER-001",
            now,
            now,
        ),
        (
            "VM-2026-0002",
            "시나리오 B — 다중 캐릭터 오디오 드라마 '황금빛 오렌지 연구소'",
            "1인의 창작자가 4명의 등장인물을 연기하여 세그먼트별로 합성하는 멀티 캐릭터 프로젝트",
            "MULTI_CHARACTER",
            "ko",
            "ACTIVE",
            "CHARACTER-002",
            now,
            now,
        ),
        (
            "VM-2026-0003",
            "시나리오 C — 미래 과학관 양자 음향학 전시 안내 내레이션",
            "교육·전시 안내용 일정 음량 정규화 및 발음 명료도 집중 검증 프로젝트",
            "EDUCATION_NARRATION",
            "ko",
            "ACTIVE",
            "CHARACTER-003",
            now,
            now,
        ),
    ]
    cur.executemany(
        """
        INSERT INTO projects (
            project_id, name, description, scenario_type, language,
            status, default_voice_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        projects,
    )

    emotional_takes = [
        (
            "AUD-ORIG-001",
            "VM-2026-0001",
            "Take #1 — 애절하고 떨리는 감정 연기 (Trembling)",
            "TREMBLING_EMOTION",
            "정말… 네가 돌아온 거야?",
        ),
        (
            "AUD-ORIG-002",
            "VM-2026-0001",
            "Take #2 — 기쁨에 찬 환희의 대사 (Joyful)",
            "JOYFUL_EXCITEMENT",
            "정말! 네가 돌아온 거야?! 정말 보고 싶었어!",
        ),
        (
            "AUD-ORIG-003",
            "VM-2026-0001",
            "Take #3 — 놀라서 속삭이는 대사 (Whisper)",
            "SURPRISED_WHISPER",
            "설마… 정말 네가 돌아온 거야…?",
        ),
        (
            "AUD-ORIG-004",
            "VM-2026-0001",
            "Take #4 — 장난스럽고 경쾌한 연기 (Playful)",
            "PLAYFUL_NARRATION",
            "어라? 정말 네가 돌아온 거야? 깜짝 놀랐잖아!",
        ),
    ]

    first_orig_samples = None
    for audio_id, proj_id, title, emotion_tag, script_text in emotional_takes:
        samples = synthesize_korean_acting_take(emotion_tag, 24000)
        if audio_id == "AUD-ORIG-001":
            first_orig_samples = samples
        rel_key = f"originals/{audio_id}.wav"
        write_wav_mono_int16(DATA_DIR / rel_key, samples, 24000)
        peaks = extract_waveform_peaks(samples, 160)
        f0 = extract_f0_contour(samples, 24000, 100)
        duration_ms = int(len(samples) * 1000 / 24000)

        cur.execute(
            """
            INSERT INTO audio_assets (
                audio_id, project_id, title, emotion_tag, script_text,
                asset_type, format, sample_rate, channels, duration_ms,
                source_type, consent_verified, storage_key,
                waveform_peaks_json, f0_contour_json, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                audio_id,
                proj_id,
                title,
                emotion_tag,
                script_text,
                "ORIGINAL",
                "wav",
                24000,
                1,
                duration_ms,
                "USER_RECORDING",
                1,
                rel_key,
                json.dumps(peaks),
                json.dumps(f0),
                now,
            ),
        )

    if first_orig_samples is not None:
        target_voice = voices[1]  # NOVA-K (+3.5 semitones, clear character difference!)
        conv_config = {
            "config_id": "CFG-2026-0001",
            "target_voice_id": "CHARACTER-001",
            "pitch_shift": 2.5,
            "retrieval_ratio": 0.85,
            "protect_setting": 0.40,
            "noise_reduction": 0.20,
            "output_gain_db": 0.5,
            "formant_preserve": 0.88,
            "segment_mode": "AUTO_VAD",
            "export_format": "wav",
            "purpose": "CREATIVE_PRODUCTION",
        }
        cur.execute(
            """
            INSERT INTO conversion_configs (
                config_id, target_voice_id, pitch_shift, retrieval_ratio,
                protect_setting, noise_reduction, output_gain_db,
                formant_preserve, segment_mode, export_format, purpose
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                conv_config["config_id"],
                conv_config["target_voice_id"],
                conv_config["pitch_shift"],
                conv_config["retrieval_ratio"],
                conv_config["protect_setting"],
                conv_config["noise_reduction"],
                conv_config["output_gain_db"],
                conv_config["formant_preserve"],
                conv_config["segment_mode"],
                conv_config["export_format"],
                conv_config["purpose"],
            ),
        )

        conv_samples = provider.convert(first_orig_samples, 24000, conv_config, voices[0])
        conv_audio_id = "AUD-CONV-001"
        conv_rel_key = f"converted/{conv_audio_id}.wav"
        file_bytes = write_wav_mono_int16(DATA_DIR / conv_rel_key, conv_samples, 24000)
        conv_peaks = extract_waveform_peaks(conv_samples, 160)
        conv_f0 = extract_f0_contour(conv_samples, 24000, 100)
        conv_dur_ms = int(len(conv_samples) * 1000 / 24000)

        cur.execute(
            """
            INSERT INTO audio_assets (
                audio_id, project_id, title, emotion_tag, script_text,
                asset_type, format, sample_rate, channels, duration_ms,
                source_type, consent_verified, storage_key,
                waveform_peaks_json, f0_contour_json, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                conv_audio_id,
                "VM-2026-0001",
                "Take #1 → EUNJO AURA",
                "TREMBLING_EMOTION",
                "정말… 네가 돌아온 거야?",
                "CONVERTED",
                "wav",
                24000,
                1,
                conv_dur_ms,
                "AI_CONVERTED",
                1,
                conv_rel_key,
                json.dumps(conv_peaks),
                json.dumps(conv_f0),
                now,
            ),
        )

        job_id = "JOB-2026-0001"
        cur.execute(
            """
            INSERT INTO conversion_jobs (
                job_id, project_id, source_audio_id, target_voice_id, config_id,
                provider, runtime, status, progress, segment_start_ms, segment_end_ms,
                result_audio_id, processing_time_ms, rtf, peak_ram_mb,
                error_code, error_message, retry_count, model_version_tag,
                created_at, completed_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                job_id,
                "VM-2026-0001",
                "AUD-ORIG-001",
                "CHARACTER-001",
                "CFG-2026-0001",
                "RVC-WSOLA-Clean",
                "CPU",
                "SUCCEEDED",
                100,
                0,
                conv_dur_ms,
                conv_audio_id,
                380,
                0.084,
                312.4,
                None,
                None,
                0,
                "RVC-v2.5-KO-CRISP",
                now,
                now,
            ),
        )

        q_report = QualityAnalyzer.evaluate(
            first_orig_samples,
            conv_samples,
            24000,
            "정말… 네가 돌아온 거야?",
            voices[0],
        )
        cur.execute(
            """
            INSERT INTO quality_metrics (
                metric_id, job_id, source_audio_id, result_audio_id, status,
                duration_ratio, clipping_detected, peak_dbfs, rms_dbfs, snr_db,
                vad_match_ratio, cer, f0_correlation, energy_correlation,
                timbre_consistency, overall_score, source_transcript,
                converted_transcript, warnings_json, level_details_json, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                "QMT-2026-0001",
                job_id,
                "AUD-ORIG-001",
                conv_audio_id,
                q_report["status"],
                q_report["duration_ratio"],
                1 if q_report["clipping_detected"] else 0,
                q_report["peak_dbfs"],
                q_report["rms_dbfs"],
                q_report["snr_db"],
                q_report["vad_match_ratio"],
                q_report["cer"],
                q_report["f0_correlation"],
                q_report["energy_correlation"],
                q_report["timbre_consistency"],
                q_report["overall_score"],
                q_report["source_transcript"],
                q_report["converted_transcript"],
                json.dumps(q_report["warnings"], ensure_ascii=False),
                json.dumps(q_report["level_details"], ensure_ascii=False),
                now,
            ),
        )

        cur.execute(
            """
            INSERT INTO review_results (
                review_id, job_id, reviewer_name, pronunciation_score,
                emotion_preservation_score, timbre_naturalness_score,
                artifact_cleanliness_score, timing_continuity_score,
                comment, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                "REV-2026-0001",
                job_id,
                "JeongHoon & Eunjo",
                5,
                5,
                5,
                5,
                5,
                "WSOLA 타임도메인 엔진 적용으로 위상 왜곡 없이 사람 목소리 그대로 자연스럽게 변환됩니다!",
                now,
            ),
        )

        exp_rel = "exports/EUNJO_AURA_Take1_Master.wav"
        write_wav_mono_int16(DATA_DIR / exp_rel, conv_samples, 24000)
        cur.execute(
            """
            INSERT INTO exports (
                export_id, project_id, audio_id, job_id, format, file_name,
                storage_key, file_size_bytes, ai_watermark_embedded,
                metadata_json, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                "EXP-2026-0001",
                "VM-2026-0001",
                conv_audio_id,
                job_id,
                "wav",
                "EUNJO_AURA_Take1_Master.wav",
                exp_rel,
                file_bytes,
                1,
                json.dumps(
                    {
                        "ai_generated": True,
                        "generator": "EUNJO VoiceMorph Agent v1.1 (WSOLA Clean Engine)",
                        "source_audio_id": "AUD-ORIG-001",
                        "target_voice_id": "CHARACTER-001",
                    },
                    ensure_ascii=False,
                ),
                now,
            ),
        )

    segments = [
        (
            "SEG-001",
            "VM-2026-0002",
            "AUD-ORIG-001",
            "아우라 (내레이터)",
            "정말… 네가 돌아온 거야?",
            "차분하고 애절한 도입",
            0,
            3200,
            3200,
            "CHARACTER-001",
            1.5,
            "CONVERTED",
            "AUD-CONV-001",
            94.8,
            1,
        ),
        (
            "SEG-002",
            "VM-2026-0002",
            "AUD-ORIG-002",
            "노바-K (주인공)",
            "정말! 네가 돌아온 거야?! 정말 보고 싶었어!",
            "기쁨과 벅찬 환희",
            3200,
            6800,
            3600,
            "CHARACTER-002",
            3.5,
            "READY",
            None,
            0.0,
            2,
        ),
        (
            "SEG-003",
            "VM-2026-0002",
            "AUD-ORIG-003",
            "크로노-7 (AI 코어)",
            "설마… 정말 네가 돌아온 거야…?",
            "차분한 중저음 브리핑",
            6800,
            10200,
            3400,
            "CHARACTER-003",
            -4.0,
            "READY",
            None,
            0.0,
            3,
        ),
        (
            "SEG-004",
            "VM-2026-0002",
            "AUD-ORIG-004",
            "발키리-X (커맨더)",
            "어라? 정말 네가 돌아온 거야? 깜짝 놀랐잖아!",
            "당당하고 힘찬 지휘관 톤",
            10200,
            13800,
            3600,
            "CHARACTER-004",
            -2.5,
            "READY",
            None,
            0.0,
            4,
        ),
    ]
    cur.executemany(
        """
        INSERT INTO audio_segments (
            segment_id, project_id, source_audio_id, speaker_label, script_line,
            emotion_note, start_ms, end_ms, duration_ms, target_voice_id,
            pitch_shift, status, converted_audio_id, quality_score, order_index
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        segments,
    )

    audit_entries = [
        (
            "LOG-2026-0001",
            "SYSTEM_BOOT",
            "SYSTEM_ORCHESTRATOR",
            "RUNTIME-WSOLA-CLEAN",
            "SUCCESS",
            "Time-Domain WSOLA + Formant Biquad 클린 음색 변환 엔진 초기화 완료",
            now,
        ),
        (
            "LOG-2026-0002",
            "CONSENT_VERIFIED",
            "CONSENT_GUARD",
            "CHARACTER-001",
            "APPROVED",
            "EUNJO AURA 음색 라이선스 및 성우 동의서 무결성 검증 통과",
            now,
        ),
    ]
    cur.executemany(
        """
        INSERT INTO audit_logs (log_id, event_type, actor, target_id, status, detail, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        audit_entries,
    )

    conn.commit()
    conn.close()
