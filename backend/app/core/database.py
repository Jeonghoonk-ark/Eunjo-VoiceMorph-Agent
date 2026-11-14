"""
Database & Storage Configuration for EUNJO VoiceMorph Agent
Implements the 14 core tables from Section XI of the Development Plan.
"""
import json
import sqlite3
from pathlib import Path
from datetime import datetime, timezone, timedelta

KST = timezone(timedelta(hours=9))

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data"
MODELS_DIR = BASE_DIR / "models" / "approved"
DB_PATH = DATA_DIR / "voicemorph.db"

for sub in ["samples", "originals", "processed", "converted", "exports"]:
    (DATA_DIR / sub).mkdir(parents=True, exist_ok=True)
MODELS_DIR.mkdir(parents=True, exist_ok=True)


def now_kst_iso() -> str:
    return datetime.now(KST).isoformat(timespec="seconds")


def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


def init_db() -> None:
    conn = get_db_connection()
    cur = conn.cursor()

    cur.executescript(
        """
        CREATE TABLE IF NOT EXISTS projects (
            project_id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT DEFAULT '',
            scenario_type TEXT DEFAULT 'CHARACTER_VIDEO',
            language TEXT DEFAULT 'ko',
            status TEXT DEFAULT 'ACTIVE',
            default_voice_id TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS voice_profiles (
            voice_id TEXT PRIMARY KEY,
            voice_name TEXT NOT NULL,
            character_title TEXT NOT NULL,
            description TEXT NOT NULL,
            language_json TEXT NOT NULL,
            model_id TEXT NOT NULL,
            model_type TEXT NOT NULL,
            model_version TEXT NOT NULL,
            license_type TEXT NOT NULL,
            license_status TEXT NOT NULL,
            consent_status TEXT NOT NULL,
            commercial_use_allowed INTEGER NOT NULL DEFAULT 0,
            approved_uses_json TEXT NOT NULL,
            pitch_base_hz REAL NOT NULL DEFAULT 220.0,
            pitch_shift_default REAL NOT NULL DEFAULT 0.0,
            formant_shift REAL NOT NULL DEFAULT 1.0,
            timbre_warmth REAL NOT NULL DEFAULT 0.5,
            breathiness REAL NOT NULL DEFAULT 0.1,
            accent_color TEXT NOT NULL DEFAULT '#FF8A00',
            sample_audio_key TEXT,
            status TEXT NOT NULL DEFAULT 'ACTIVE',
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS voice_models (
            model_id TEXT PRIMARY KEY,
            model_type TEXT NOT NULL,
            model_version TEXT NOT NULL,
            voice_id TEXT NOT NULL,
            runtime_json TEXT NOT NULL,
            model_file_hash TEXT NOT NULL,
            sample_rate INTEGER NOT NULL DEFAULT 24000,
            status TEXT NOT NULL DEFAULT 'ACTIVE',
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS voice_consents (
            consent_id TEXT PRIMARY KEY,
            voice_id TEXT NOT NULL,
            provider_name TEXT NOT NULL,
            consent_date TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            consent_status TEXT NOT NULL,
            allowed_purposes_json TEXT NOT NULL,
            commercial_allowed INTEGER NOT NULL DEFAULT 0,
            public_distribution_allowed INTEGER NOT NULL DEFAULT 1,
            evidence_doc TEXT NOT NULL,
            revoked INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS voice_licenses (
            license_id TEXT PRIMARY KEY,
            model_id TEXT NOT NULL,
            license_name TEXT NOT NULL,
            spdx_id TEXT NOT NULL,
            status TEXT NOT NULL,
            conditions_text TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS audio_assets (
            audio_id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL,
            title TEXT NOT NULL,
            emotion_tag TEXT DEFAULT 'NEUTRAL',
            script_text TEXT DEFAULT '',
            asset_type TEXT NOT NULL,
            format TEXT NOT NULL DEFAULT 'wav',
            sample_rate INTEGER NOT NULL DEFAULT 24000,
            channels INTEGER NOT NULL DEFAULT 1,
            duration_ms INTEGER NOT NULL DEFAULT 0,
            source_type TEXT NOT NULL DEFAULT 'USER_RECORDING',
            consent_verified INTEGER NOT NULL DEFAULT 1,
            storage_key TEXT NOT NULL,
            waveform_peaks_json TEXT DEFAULT '[]',
            f0_contour_json TEXT DEFAULT '[]',
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS audio_segments (
            segment_id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL,
            source_audio_id TEXT NOT NULL,
            speaker_label TEXT NOT NULL,
            script_line TEXT NOT NULL,
            emotion_note TEXT DEFAULT '',
            start_ms INTEGER NOT NULL,
            end_ms INTEGER NOT NULL,
            duration_ms INTEGER NOT NULL,
            target_voice_id TEXT NOT NULL,
            pitch_shift REAL DEFAULT 0.0,
            status TEXT DEFAULT 'READY',
            converted_audio_id TEXT,
            quality_score REAL DEFAULT 0.0,
            order_index INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS conversion_configs (
            config_id TEXT PRIMARY KEY,
            target_voice_id TEXT NOT NULL,
            pitch_shift REAL DEFAULT 0.0,
            retrieval_ratio REAL DEFAULT 0.78,
            protect_setting REAL DEFAULT 0.35,
            noise_reduction REAL DEFAULT 0.25,
            output_gain_db REAL DEFAULT 0.0,
            formant_preserve REAL DEFAULT 0.85,
            segment_mode TEXT DEFAULT 'AUTO_VAD',
            export_format TEXT DEFAULT 'wav',
            purpose TEXT DEFAULT 'CREATIVE_PRODUCTION'
        );

        CREATE TABLE IF NOT EXISTS conversion_jobs (
            job_id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL,
            source_audio_id TEXT NOT NULL,
            target_voice_id TEXT NOT NULL,
            config_id TEXT NOT NULL,
            provider TEXT NOT NULL DEFAULT 'RVC-NeuralDSP',
            runtime TEXT NOT NULL DEFAULT 'CPU',
            status TEXT NOT NULL DEFAULT 'CREATED',
            progress INTEGER NOT NULL DEFAULT 0,
            segment_start_ms INTEGER,
            segment_end_ms INTEGER,
            result_audio_id TEXT,
            processing_time_ms INTEGER DEFAULT 0,
            rtf REAL DEFAULT 0.0,
            peak_ram_mb REAL DEFAULT 0.0,
            error_code TEXT,
            error_message TEXT,
            retry_count INTEGER DEFAULT 0,
            model_version_tag TEXT DEFAULT 'RVC-v2.4-KO-NeuralDSP',
            created_at TEXT NOT NULL,
            completed_at TEXT
        );

        CREATE TABLE IF NOT EXISTS quality_metrics (
            metric_id TEXT PRIMARY KEY,
            job_id TEXT NOT NULL,
            source_audio_id TEXT NOT NULL,
            result_audio_id TEXT NOT NULL,
            status TEXT NOT NULL,
            duration_ratio REAL NOT NULL,
            clipping_detected INTEGER NOT NULL DEFAULT 0,
            peak_dbfs REAL NOT NULL,
            rms_dbfs REAL NOT NULL,
            snr_db REAL NOT NULL,
            vad_match_ratio REAL NOT NULL,
            cer REAL NOT NULL,
            f0_correlation REAL NOT NULL,
            energy_correlation REAL NOT NULL,
            timbre_consistency REAL NOT NULL,
            overall_score REAL NOT NULL,
            source_transcript TEXT DEFAULT '',
            converted_transcript TEXT DEFAULT '',
            warnings_json TEXT NOT NULL DEFAULT '[]',
            level_details_json TEXT NOT NULL DEFAULT '{}',
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS review_results (
            review_id TEXT PRIMARY KEY,
            job_id TEXT NOT NULL,
            reviewer_name TEXT DEFAULT 'Creator',
            pronunciation_score INTEGER NOT NULL,
            emotion_preservation_score INTEGER NOT NULL,
            timbre_naturalness_score INTEGER NOT NULL,
            artifact_cleanliness_score INTEGER NOT NULL,
            timing_continuity_score INTEGER NOT NULL,
            comment TEXT DEFAULT '',
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS exports (
            export_id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL,
            audio_id TEXT NOT NULL,
            job_id TEXT,
            format TEXT NOT NULL,
            file_name TEXT NOT NULL,
            storage_key TEXT NOT NULL,
            file_size_bytes INTEGER NOT NULL,
            ai_watermark_embedded INTEGER NOT NULL DEFAULT 1,
            metadata_json TEXT NOT NULL,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS audit_logs (
            log_id TEXT PRIMARY KEY,
            event_type TEXT NOT NULL,
            actor TEXT NOT NULL DEFAULT 'LOCAL_CREATOR',
            target_id TEXT NOT NULL,
            status TEXT NOT NULL,
            detail TEXT NOT NULL,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS deletion_requests (
            request_id TEXT PRIMARY KEY,
            target_type TEXT NOT NULL,
            target_id TEXT NOT NULL,
            reason TEXT NOT NULL,
            retention_policy TEXT NOT NULL,
            status TEXT NOT NULL,
            requested_at TEXT NOT NULL,
            processed_at TEXT
        );

        CREATE TABLE IF NOT EXISTS system_settings (
            key TEXT PRIMARY KEY,
            value_json TEXT NOT NULL
        );
        """
    )

    conn.commit()
    conn.close()
