# Ramachandran Plot — 3D 結構生物學自學實驗室

雙擊 `啟動_拉曼圖工具.bat` 即可用 Chrome 開啟（`file://` 直接開啟，不需伺服器）。
Three.js 0.160 由 jsdelivr CDN 載入（見 `index.html` 的 importmap），因此 3D 需要網路。

## 給 AI 維護者的說明

本專案由 AI 全權維護，使用者不手動編輯程式碼。修改前請先讀這份文件。

### 檔案結構
| 檔案 | 內容 |
|---|---|
| `index.html` | HTML 結構、importmap、依序載入 js/ |
| `css/style.css` | 全部樣式（含 `body.theme-dark` 深色主題、`body.presentation-mode`、胺基酸資訊卡） |
| `js/00-amino-acids.js` | 20 種標準胺基酸 + Pre-Proline 資料庫（側鏈內部座標、分類、說明、下拉選單與資訊卡渲染） |
| `js/01-vocab-steps.js` | 氣泡字典 `VOCAB_DICT`、十步驟劇本 `STEPS_DATA`（純資料） |
| `js/02-state-pdb.js` | DOM 參照、全域狀態變數、各種 `*Fn` 3D 回呼掛點、PDB 解析/載入/RCSB 下載、`calcDihedralDeg` |
| `js/03-ui-tools.js` | Toast、主題、分享連結/URL 參數、簡報模式、PNG 匯出、Newman 時鐘、中英切換 |
| `js/04-plot-density.js` | 高 DPI 畫布、二維高斯密度模型 `KDE_MODELS`、能量/等高線快取 |
| `js/05-quiz-evaluate.js` | 第 10 步測驗 UI、`evaluateRegion` 區域判定 |
| `js/06-plot-draw.js` | `drawRamachandranPlot` 拉氏圖繪製 |
| `js/07-wizard-events.js` | 十步驟導覽 `goToStep`、`updateAll`、所有互動事件 |
| `js/08-engine3d.js` | `init3DEngine`：Three.js 場景、NeRF 主鏈、標籤防重疊；檔尾呼叫 `init3DEngine()` 啟動 |

### 重要規則
- **不可改用 ES module 的 `import`/`export` 拆檔**：`file://` 下 Chrome 會擋本機 module。js/ 都是一般 `<script src>`，每檔開頭 `'use strict'`。
- 所有 js/ 共用同一全域範圍（頂層 `const`/`let`/`function` 跨檔可見），**載入順序有意義**。頂層「立即執行」的程式碼只能呼叫同檔或更前面檔案定義的函式；事件處理器內則可呼叫任何檔案的函式。
- 跨檔不可重複宣告同名頂層變數/函式（會 SyntaxError 導致整檔失效）。
- 3D 引擎透過 `update3DFn`、`setViewMode3DFn` 等變數（宣告於 02）對外提供功能，其他檔案需先檢查非 null 再呼叫。
- `backup_original/index.html` 是拆檔前的單檔原版，僅供比對/還原。

### 驗證方式
修改後用 headless Chrome 開啟，確認 stderr 沒有 `Uncaught` 錯誤：
`chrome --headless=new --enable-unsafe-swiftshader --enable-logging=stderr --v=0 --virtual-time-budget=10000 --dump-dom file:///.../index.html`
