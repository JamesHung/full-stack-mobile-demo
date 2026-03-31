# AgentMD Change Log

| 日期       | 變更摘要 |
|------------|----------|
| 2026-03-31 | 新增「品質硬需求」區塊：強制 agent 修改關鍵路徑前執行 `make verify`／`make doctor`；新增 Makefile target 必須實際執行驗證規則；擴充 Code Review 自查清單；新增 smoke-kit 工具說明；強化 Shell 腳本驗證規則 |
| 2026-03-30 | 新增 CLI Flag 與依賴驗證規則、Shell 腳本語法驗證規則；新增 `ci-fix-loop` skill |
| 2026-03-20 | 建立專案 constitution 基線（Expo、RN、TypeScript、Vitest、NativeWind、TanStack Query）|
| 2026-03-20 | 擴充 constitution：優先共用 web/mobile 邏輯、跨平台視覺一致性、強制 regression suite |
| 2026-03-20 | 新增 CI 視覺回歸治理；Expo Orbit 定位為本機 QA 輔助，非 CI gate |
| 2026-03-24 | 更新 AGENTS.md：新增 Task Routing and Delegation 規範（中文翻譯）；調整為專用 Changelog 檔案 |
| 2026-03-23 | 新增 backend 治理：Python 3.13 + uv、Pydantic 驗證、env-based secrets、集中 logging / 自訂例外、pytest 覆蓋率、Swagger 端點描述 |
