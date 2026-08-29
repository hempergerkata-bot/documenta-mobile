# Documenta current-main feature parity matrix

Evidence status in this matrix is intentionally conservative: “APK” means included in the final standalone `preview` build only after the immutable build SHA is recorded below; “physical pending” is not a claim of native-device success.

## User-facing routes and data flows

| Capability | Source implementation | Route / entry | Data flow | APK | Automated evidence | Physical status |
|---|---|---|---|---|---|---|
| Onboarding and profile | `_layout.tsx`, `onboarding.tsx`, `AppContext.tsx` | First launch | local settings/profile persistence | final build | typecheck; UI smoke | native pending |
| Home/dashboard | `(tabs)/home.tsx` | Home tab | documents → intelligence/action summaries | final build | typecheck; core | native pending |
| Camera scanner | `documentScanner.ts`, `scan-review.tsx` | Add → Scan | scanner pages → local image processing → OCR → intelligence → review | final build | typecheck; OCR aggregation tests | Samsung/native pending |
| Gallery image import | `(tabs)/add.tsx`, `scan-review.tsx` | Add → Gallery | image → review → OCR gate → manual/structured details → persisted document | final build | browser gallery flow PASS | native pending |
| PDF/file import | `(tabs)/add.tsx`, `document-details.tsx` | Add → PDF/file | local PDF URI → manual details → persisted document | final build | browser import/save flow PASS | native pending |
| Multi-page review | `scan-review.tsx`, `ocrPageAggregation.ts` | Scan/gallery review | every page retained with complete/empty/failed result and aggregate status | final build | 6 OCR aggregation assertions | Samsung/native pending |
| Structured details review | `document-details.tsx` | Review continuation | reviewed fields → `addDocument` → index/action/archive derivation | final build | core; browser save flow PASS | native pending |
| Documents library | `(tabs)/documents.tsx` | Documents tab | persisted active/archive records | final build | typecheck; browser search flow | native pending |
| Document detail/lifecycle | `document/[id].tsx` | Document result/detail | edit, archive, delete, relations, export/share, explain, Assistant | final build | browser detail flow PASS | native pending |
| Local search | `(tabs)/search.tsx`, `semanticSearch.ts` | Search tab | document/case/action index with fuzzy/intent search | final build | semanticSearch tests; exact-title UI PASS | native pending |
| Assistant | `assistant.tsx`, `semanticSearch.ts` | Profile/Document → Assistant | local persisted messages + document/case/action context | final build | browser Assistant context PASS | native pending |
| Explanation and document Q&A | `explanationExperience.ts`, document detail | Document detail → Explain | evidence-backed local explanation and questions | final build | explanation tests; action visible in UI | native pending |
| Cases and relationships | `cases.tsx`, `case/[id].tsx`, document detail | Profile/case/document links | case-document relations → progress/actions/timeline | final build | core relationship/action tests | native pending |
| Actions/reminders/calendar candidates | `actionEngine.ts`, action routes | Document/case/action entries | evidence-gated actions; local candidates before explicit confirmation | final build | action engine tests | native pending |
| Journal/timeline/archive | `journal.tsx`, `timeline.tsx`, `archive.tsx`, `archive.ts` | Profile launcher and related routes | local events → timeline/archive/year views | final build | archive/timeline tests; Journal UI PASS | native pending |
| Local PDF package export | `export.tsx`, `exportPdfPackage.*` | Profile → Export | selected real PDFs → ordered local merged PDF + TOC → share/download → record | final build | export core tests; 6-page browser download PASS | Android share pending |
| Security/privacy | `security.tsx`, `AppContext.tsx` | Profile → Privacy | persisted security settings; biometric switch is not local-only UI state | final build | browser persistence/navigation PASS | biometric device pending |
| Settings/languages | `settings.tsx`, `localization.ts` | Profile → Language/Settings | separate app/explanation/reply language settings; RTL direction | final build | 604-key/15-language audit; browser settings PASS | Arabic native RTL pending |
| Notifications | `notifications.tsx`, notification utilities | Profile/action flows | local permission/status gates and notification targets | final build | source/typecheck | native permission pending |
| TTS | `ttsCapability.ts`, settings/explanation | Settings/Explain | local voice inventory/capability gate; no cloud fallback | final build | TTS capability tests | device voice inventory pending |
| Encrypted backup/restore | `backupService.ts`, `backupCrypto.ts`, Drive adapter | Profile → Backup | encrypted local backup; optional Drive app-data adapter | final build | backup crypto/domain/service tests | Drive/device pending |

## Capability and cost boundaries

| Area | Current-main status | Evidence |
|---|---|---|
| OCR | Native local ML Kit path; browser path explicitly reports unavailable instead of inventing text | OCR adapter and page aggregation tests; browser gallery flow |
| Image/PDF processing | Native scanner enhancement and PDF generation are local | source inspection; typecheck; native device still pending |
| Search/Assistant | Local deterministic semantic/fuzzy logic; no hosted embeddings or vector database | semantic search/core tests |
| Translation/TTS | Conservative local capability gating; no document text sent to unverified services | `ttsCapability` tests and memory rule |
| Integrations | Google Drive, mail/calendar integrations are optional and account/permission-gated | source/typecheck; no external side effects in smoke tests |
| Required cost | €0 mandatory external license/service cost | dependency/source review; no paid SDK/API/cloud AI/search requirement |

## Final immutable build evidence

Filled only after the single final EAS build and byte-for-byte route verification:

- GitHub `main` commit SHA: **pending**
- EAS build ID: **pending**
- EAS-reported source commit SHA: **pending**
- GitHub/EAS SHA equality: **pending**
- APK byte size: **pending**
- APK SHA-256: **pending**
- Internal download route: **pending**
- Route byte-for-byte equality with EAS artifact: **pending**

## Explicit validation boundary

The automated and browser evidence above does not substitute for a physical Samsung/Android run. Camera scanning, ML Kit OCR, native PDF/share sheet, notifications/calendar permissions, native TTS voice inventory, Drive account flow, and Arabic RTL on native Android remain explicitly pending until tested on compatible hardware.