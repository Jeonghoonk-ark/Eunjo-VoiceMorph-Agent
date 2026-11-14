# EUNJO VoiceMorph Agent
### 한국어 녹음 음성 기반 AI 캐릭터 음색 변환 시스템 (Quantum Acoustic Studio v1.0)

> **"목소리는 달라져도, 당신의 연기는 그대로."**  
> **"사람이 감정을 연기하고, AI가 새로운 음색을 입히며, 창작자가 결과를 완성한다."**  
> *JeongHoon & Eunjo — Eunjo Golden Orange Lab (2026.11.14)*

---

## 1. 프로젝트 개요 및 핵심 특징

**EUNJO VoiceMorph Agent**는 창작자가 직접 마이크로 연기한 한국어 대사의 **억양(F0 윤곽), 문장 간 침묵, 호흡, 감정 표현**을 그대로 보존하면서, 사용권과 성우 동의가 확인된 **AI 캐릭터 음색**으로 변환하는 Local-First / CPU-First 창작 스튜디오입니다.

### 주요 구현 기능
1. **시네마틱 인트로 극장 (`CinematicIntro.tsx`)**
   - **ACT I (추진 배경)**: 기존 TTS의 한계와 동일 대사(`"정말… 네가 돌아온 거야?"`) 4가지 감정 연기 파형·운율 실시간 비교 청취
   - **ACT II (핵심 목표)**: 원본 연기와 AI 캐릭터 변환본(A/B) 즉시 교차 청취
   - **ACT III (구현 아키텍처)**: 5단계 양자 음향 변환 및 권리·품질 검증 파이프라인 시각화
   - **ACT IV (프로젝트 핵심 선언)**: 스튜디오 모듈 즉시 진입
2. **울트라 슬림 SVG 아이콘 독 (`Slim Icon Dock`)**
   - 이모지를 배제한 정교한 최신 벡터 SVG 아이콘 기반 68px 초슬림 네비게이션 및 플로팅 툴팁
3. **Speech-to-Speech 변환 및 구간 부분 재변환 (`Audioengine` & `WaveformComparisonCanvas`)**
   - PyTorch STFT 포르만트 스펙트럼 워핑 + F0 피치 시프트 + 한국어 받침/자음 보호(`Protect`) 하이브리드 엔진
   - 타임라인 특정 구간(예: `1.00s ~ 2.80s`) 핀포인트 부분 재변환 및 25ms 코사인 크로스페이드 자동 병합 (`TC-21`)
4. **Consent & License Guard (`권리 및 동의 차단기`)**
   - 성우 동의 상태(`APPROVED`, `PENDING`, `EXPIRED`) 및 콘텐츠 사용 목적 사전 검증 (`TC-12`, `TC-13`, `TC-24`)
5. **5계층 자동 음질 검증 & 5점 척도 청취 평가 (`QualityAnalyzer`)**
   - 파일 유효성, 신호 품질(Peak/RMS/SNR/Clipping), 한국어 발화 보존(CER), F0 상관계수(`f0_correlation`), 음색 일관성 자동 산출
6. **다중 캐릭터 타임라인 합성 (`시나리오 B`)**
   - 1인 다역 대사 세그먼트별 캐릭터 배정 및 원클릭 마스터 오디오 합성

---

## 2. 실행 방법

```powershell
# 원클릭 실행 스크립트
.\start_studio.ps1
```

- **Frontend Web Studio**: `http://localhost:5173`
- **Backend FastAPI Docs**: `http://127.0.0.1:8000/docs`
- **자동화 테스트 실행 (TC-01 ~ TC-24)**:
  ```powershell
  $env:PYTHONPATH="c:\Dev\Eunjo-VoiceMorph-Agent\backend"
  python -m pytest backend/tests/test_voicemorph.py -v
  ```
