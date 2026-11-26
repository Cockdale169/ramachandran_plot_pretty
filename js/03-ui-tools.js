'use strict';
// 3b. 分享連結、主題、簡報模式、匯出、Newman 時鐘、中英切換
// 注意：所有 js/ 檔案共用同一個全域範圍，必須依 index.html 中的順序載入。

        // ==========================================
        // P0: URL 參數狀態同步、簡報模式與 PNG 匯出
        // ==========================================
        const shareLinkBtn = document.getElementById('shareLinkBtn');
        const presentModeBtn = document.getElementById('presentModeBtn');
        const exportPlotBtn = document.getElementById('exportPlotBtn');
        const export3DBtn = document.getElementById('export3DBtn');
        const themeToggleBtn = document.getElementById('themeToggleBtn');
        const wizardProgressFill = document.getElementById('wizardProgressFill');
        const appleToastEl = document.getElementById('appleToast');

        let toastTimer = null;
        function showAppleToast(msg) {
            if (!appleToastEl) return;
            appleToastEl.textContent = msg;
            appleToastEl.classList.add('show');
            if (toastTimer) clearTimeout(toastTimer);
            toastTimer = setTimeout(() => appleToastEl.classList.remove('show'), 2200);
        }

        function updateSliderFills() {
            const isDark = document.body.classList.contains('theme-dark');
            const trackBg = isDark ? 'rgba(255,255,255,0.16)' : '#d2d2d7';
            const applyCenterFill = (el, val, min, max, color) => {
                const pct = ((val - min) / (max - min)) * 100;
                const mid = 50;
                const lo = Math.min(mid, pct);
                const hi = Math.max(mid, pct);
                el.style.background = `linear-gradient(90deg, ${trackBg} 0%, ${trackBg} ${lo}%, ${color} ${lo}%, ${color} ${hi}%, ${trackBg} ${hi}%, ${trackBg} 100%)`;
            };
            applyCenterFill(phiSlider, currentPhi, -180, 180, isDark ? '#2997ff' : '#0071e3');
            applyCenterFill(psiSlider, currentPsi, -180, 180, isDark ? '#30d158' : '#34c759');
            const omPct = (currentOmega / 180) * 100;
            const omColor = isDark ? '#bf5af2' : '#af52de';
            omegaSlider.style.background = `linear-gradient(90deg, ${omColor} 0%, ${omColor} ${omPct}%, ${trackBg} ${omPct}%, ${trackBg} 100%)`;
        }

        let syncStarfieldState = null;
        function applyTheme(dark, silent = false) {
            document.body.classList.toggle('theme-dark', dark);
            themeToggleBtn.textContent = isEN()
                ? (dark ? '☀️ Light' : '🌙 Dark')
                : (dark ? '☀️ 淺色' : '🌙 深色');
            themeToggleBtn.classList.toggle('active', dark);
            try { localStorage.setItem('rama-theme', dark ? 'dark' : 'light'); } catch (_) {}
            updateSliderFills();
            if (typeof drawRamachandranPlot === 'function') drawRamachandranPlot(currentPhi, currentPsi, currentAA);
            if (!silent) showAppleToast(isEN()
                ? (dark ? '🌙 Switched to Pro Titanium Dark' : '☀️ Switched to Studio Light')
                : (dark ? '🌙 已切換至 Pro 深色鈦金主題' : '☀️ 已切換至 Studio 淺色主題'));
            if (typeof syncStarfieldState === 'function') syncStarfieldState();
        }
        themeToggleBtn.addEventListener('click', () => {
            applyTheme(!document.body.classList.contains('theme-dark'));
        });
        try {
            const savedTheme = localStorage.getItem('rama-theme');
            if (savedTheme === 'light') applyTheme(false, true);
            else applyTheme(true, true);
        } catch (_) {
            applyTheme(true, true);
        }

        function buildShareURL() {
            const params = new URLSearchParams();
            params.set('step', currentStepIdx + 1);
            params.set('view', viewMode);
            params.set('plot', plotMode);
            params.set('aa', currentResidue);
            params.set('phi', currentPhi);
            params.set('psi', currentPsi);
            params.set('omega', currentOmega);
            params.set('vdw', showVDW ? '1' : '0');
            params.set('triple', showTripleHelix ? '1' : '0');
            return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
        }

        function applyURLParams() {
            const params = new URLSearchParams(window.location.search);
            if (![...params.keys()].length) return;

            if (params.has('step')) {
                const s = parseInt(params.get('step'), 10);
                if (!isNaN(s) && s >= 1 && s <= STEPS_DATA.length) {
                    goToStep(s - 1);
                }
            }
            if (params.has('view')) {
                const vMode = params.get('view');
                if (vMode === 'single' || vMode === 'chain') setViewMode(vMode);
            }
            if (params.has('plot')) {
                const pMode = params.get('plot');
                if (pMode === 'pro' || pMode === 'energy' || pMode === 'simple') setPlotMode(pMode);
            }
            if (params.has('aa')) {
                setAminoAcid(params.get('aa'));
            }
            if (params.has('triple')) {
                showTripleHelix = params.get('triple') === '1';
                tripleHelixChk.checked = showTripleHelix;
            }
            if (params.has('vdw')) {
                showVDW = params.get('vdw') === '1';
                vdwToggleChk.checked = showVDW;
                if (setVDW3DFn) setVDW3DFn(showVDW);
            }
            if (params.has('omega')) {
                const om = Math.max(0, Math.min(180, parseInt(params.get('omega'), 10) || 180));
                currentOmega = om;
                omegaSlider.value = om;
                const locked = om === 180;
                lockOmegaChk.checked = locked;
                omegaSlider.disabled = locked;
            }
            const p = params.has('phi') ? Math.max(-180, Math.min(180, parseInt(params.get('phi'), 10) || 0)) : currentPhi;
            const s = params.has('psi') ? Math.max(-180, Math.min(180, parseInt(params.get('psi'), 10) || 0)) : currentPsi;
            setAngles(p, s);
        }

        shareLinkBtn.addEventListener('click', async () => {
            const url = buildShareURL();
            try {
                await navigator.clipboard.writeText(url);
                shareLinkBtn.textContent = '✓ 已複製連結';
                showAppleToast('🔗 已複製目前角度與模式的分享連結');
            } catch (_) {
                window.prompt('複製以下分享連結：', url);
                shareLinkBtn.textContent = '✓ 已產生連結';
            }
            setTimeout(() => { shareLinkBtn.textContent = currentLang === 'en' ? '🔗 Share URL' : '🔗 複製連結'; }, 1800);
        });

        function togglePresentationMode(forceState) {
            const next = typeof forceState === 'boolean' ? forceState : !document.body.classList.contains('presentation-mode');
            document.body.classList.toggle('presentation-mode', next);
            presentModeBtn.classList.toggle('active', next);
            presentModeBtn.textContent = next ? '✕ 退出簡報' : '⛶ 簡報模式';
            window.dispatchEvent(new Event('resize'));
        }
        presentModeBtn.addEventListener('click', () => togglePresentationMode());
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && document.body.classList.contains('presentation-mode')) {
                togglePresentationMode(false);
            }
        });

        function downloadDataURL(dataUrl, filename) {
            const a = document.createElement('a');
            a.href = dataUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
        }

        exportPlotBtn.addEventListener('click', () => {
            const tmp = document.createElement('canvas');
            tmp.width = ramaCanvas.width;
            tmp.height = ramaCanvas.height;
            const tCtx = tmp.getContext('2d');
            tCtx.fillStyle = '#ffffff';
            tCtx.fillRect(0, 0, tmp.width, tmp.height);
            tCtx.drawImage(ramaCanvas, 0, 0);
            downloadDataURL(tmp.toDataURL('image/png'), `ramachandran_phi${currentPhi}_psi${currentPsi}.png`);
            showAppleToast('📊 已匯出 4K 高清拉氏圖 PNG');
        });

        export3DBtn.addEventListener('click', () => {
            if (export3DFn) {
                export3DFn();
                showAppleToast('📷 已匯出高畫質 3D 分子透明背景 PNG');
            }
        });

        // ==========================================
        // P1: 紐曼投影時鐘刻度 + 中英雙語切換 (i18n)
        // ==========================================
        const newmanClockOverlay = document.getElementById('newmanClockOverlay');
        const newmanNeedle = document.getElementById('newmanNeedle');
        const newmanAngleLabel = document.getElementById('newmanAngleLabel');
        let newmanAxisMode = null; // null | 'phi' | 'psi'

        function updateNewmanClock() {
            if (!newmanAxisMode || viewMode !== 'single') {
                newmanClockOverlay.classList.remove('visible');
                return;
            }
            newmanClockOverlay.classList.add('visible');
            const deg = newmanAxisMode === 'phi' ? currentPhi : currentPsi;
            const color = newmanAxisMode === 'phi' ? '#64d2ff' : '#30d158';
            const rad = (deg * Math.PI) / 180;
            const r = 88;
            const x2 = 120 + r * Math.sin(rad);
            const y2 = 120 - r * Math.cos(rad);
            newmanNeedle.setAttribute('x2', x2.toFixed(1));
            newmanNeedle.setAttribute('y2', y2.toFixed(1));
            newmanNeedle.setAttribute('stroke', color);
            newmanAngleLabel.setAttribute('fill', color);
            newmanAngleLabel.textContent = `${newmanAxisMode === 'phi' ? 'φ' : 'ψ'} = ${deg}°`;
        }

        const langToggleBtn = document.getElementById('langToggleBtn');
        const I18N_UI = {
            zh: {
                langBtn: '🌐 EN',
                themeLight: '☀️ 淺色',
                themeDark: '🌙 深色',
                shareBtn: '🔗 複製連結',
                presentBtn: '⛶ 簡報模式',
                exitPresentBtn: '✕ 退出簡報',
                prevBtn: '← 上一步',
                nextBtn: '下一步 →',
                doneBtn: '已完成全部課程 🎉',
                viewSingle: '單關節雙平面',
                viewChain: '多肽鏈折疊',
                modePro: '真實等高線',
                modeEnergy: '自由能熱圖',
                modeSimple: '入門色塊',
                camPhi: '俯視 φ 軸',
                camPsi: '俯視 ψ 軸',
                camReset: '重設鏡頭',
                labelsOn: '標籤: 開',
                labelsOff: '標籤: 關',
                export3D: '📷 匯出 3D',
                exportPlot: '📷 匯出圖表',
                heroTitle: '拉氏圖 <span>Ramachandran Plot</span> 3D 自學實驗室',
                heroSub: '從胜肽鍵 1.5 鍵共振、紐曼投影視角到三股膠原蛋白超螺旋，以即時物理引擎探索蛋白質折疊的幾何密碼。',
                specs: ['Studio PBR 光影渲染', '即時 NeRF 多肽鏈物理', '4K 高斯核密度等高線'],
                cardTitles: ['3D 蛋白質空間模型', '拉氏圖 (Ramachandran Plot)', '關節角度與物理參數', '課本與生活結構一鍵跳轉', '真實 PDB 結構解析'],
                ramaHint: '可<strong>直接在圖上點擊或拖曳紅點</strong>，左側 3D 模型與原子距離尺會即時連動。',
                gestureHint: '左鍵 360° 自由旋轉 · 滾輪縮放 · 右鍵平移 · 雙擊重設',
                atomLegend: ['Cα 中心關節', '碳 (C)', '氮 (N)', '氧 (O)', '氫 (H)', '側鏈 (R基)', '氫鍵 (虛線)'],
                phiLabel: '<i class="slider-label-dot"></i><strong>φ (Phi)</strong>（N - Cα 旋轉）',
                psiLabel: '<i class="slider-label-dot"></i><strong>ψ (Psi)</strong>（Cα - C 旋轉）',
                omegaLabel: '<i class="slider-label-dot"></i><strong>ω (Omega)</strong>（胜肽鍵平面角）',
                lockOmegaText: '鎖定 ω = 180°（反式平面剛性限制，取消勾選可測試順式 cis）',
                aaLabel: '胺基酸側鏈類型（20 種標準胺基酸 + Pre-Pro）',
                vdwLabel: '顯示凡得瓦真實體積球 (VDW)',
                tripleLabel: '🧬 膠原蛋白三股超螺旋 (3 Chains)',
                presets: {
                    btnAlphaR: '右手 α-螺旋<small>頭髮角蛋白 (-57°, -47°)</small>',
                    btnBetaAnti: '反平行 β-摺疊<small>蠶絲蛋白 (-139°, +135°)</small>',
                    btnBetaPara: '平行 β-摺疊<small>平行片狀 (-119°, +113°)</small>',
                    btnPPII: '🧬 膠原蛋白三股螺旋<small>皮膚肌腱 (-75°, +145°)</small>',
                    btnAlpha310: '3₁₀-螺旋<small>螺旋頭尾 (-49°, -26°)</small>',
                    btnAlphaL: '左手 α-螺旋<small>罕見反向 (+57°, +47°)</small>',
                    btnMisfold: '🧠 疾病演示：健康 α-螺旋 → 異常 β-摺疊斑塊<small>模擬狂牛症 / 阿茲海默症蛋白質錯誤折疊</small>',
                    btnClash: '⚠ 故意撞車測試 (φ=0°, ψ=0°)<small>轉入白色立體阻礙禁區觀察原子距離</small>'
                },
                pdbDropTitle: '📂 拖曳或點擊上傳 .pdb 檔案',
                pdbDropSub: '自動計算所有殘基 (φ, ψ, ω) 並標記 Outliers',
                rcsbPlaceholder: 'PDB ID (如 1CRN, 1UBQ)',
                rcsbFetch: '☁️ 線上載入',
                loadDemoPdb: '🧬 範例 PDB (Trp-cage 20aa)',
                clearPdb: '✕ 清除',
                exportCsv: '📥 匯出 CSV',
                dock: ['導覽', '3D模型', '拉氏圖', '控制', 'PDB']
            },
            en: {
                langBtn: '🌐 繁中',
                themeLight: '☀️ Light',
                themeDark: '🌙 Dark',
                shareBtn: '🔗 Share URL',
                presentBtn: '⛶ Present',
                exitPresentBtn: '✕ Exit Present',
                prevBtn: '← Prev',
                nextBtn: 'Next →',
                doneBtn: 'Course Completed 🎉',
                viewSingle: 'Single Residue',
                viewChain: 'Polypeptide Chain',
                modePro: 'KDE Contours',
                modeEnergy: 'Free Energy',
                modeSimple: 'Simple Zones',
                camPhi: 'Look down φ',
                camPsi: 'Look down ψ',
                camReset: 'Reset Cam',
                labelsOn: 'Labels: ON',
                labelsOff: 'Labels: OFF',
                export3D: '📷 Export 3D',
                exportPlot: '📷 Export Plot',
                heroTitle: '<span>Ramachandran Plot</span> 3D Interactive Studio',
                heroSub: 'Explore peptide bond resonance, Newman projections, steric clashes, and collagen triple helices in real time.',
                specs: ['Studio PBR Rendering', 'Real-Time NeRF Physics', '4K KDE Contours'],
                cardTitles: ['3D Protein Structure', 'Ramachandran Plot', 'Torsion Angles & Side Chain', 'Classic Structure Presets', 'Real PDB Structure Analyzer'],
                ramaHint: '<strong>Click or drag the red dot</strong> on the plot to rotate the 3D backbone and update distances in real time.',
                gestureHint: 'Drag to rotate 360° · Scroll/Pinch to zoom · Right-drag to pan · Double-click to reset',
                atomLegend: ['Cα Joint', 'Carbon (C)', 'Nitrogen (N)', 'Oxygen (O)', 'Hydrogen (H)', 'Side Chain (R)', 'H-Bond (Dashed)'],
                phiLabel: '<i class="slider-label-dot"></i><strong>φ (Phi)</strong> (N – Cα rotation)',
                psiLabel: '<i class="slider-label-dot"></i><strong>ψ (Psi)</strong> (Cα – C rotation)',
                omegaLabel: '<i class="slider-label-dot"></i><strong>ω (Omega)</strong> (Peptide plane)',
                lockOmegaText: 'Lock ω = 180° (rigid trans plane; uncheck to test cis)',
                aaLabel: 'Amino Acid Side Chain (20 Standard AAs + Pre-Pro)',
                vdwLabel: 'Van der Waals Space-Filling Spheres (VDW)',
                tripleLabel: '🧬 Collagen Triple Helix (3 Chains)',
                presets: {
                    btnAlphaR: 'Right α-Helix<small>Hair Keratin (−57°, −47°)</small>',
                    btnBetaAnti: 'Antiparallel β-Sheet<small>Silk Fibroin (−139°, +135°)</small>',
                    btnBetaPara: 'Parallel β-Sheet<small>Parallel Strands (−119°, +113°)</small>',
                    btnPPII: '🧬 Collagen Triple Helix<small>Skin & Tendon (−75°, +145°)</small>',
                    btnAlpha310: '3₁₀-Helix<small>Helix Caps (−49°, −26°)</small>',
                    btnAlphaL: 'Left α-Helix<small>Rare Turn (+57°, +47°)</small>',
                    btnMisfold: '🧠 Misfolding Demo: Healthy α-Helix → Amyloid β-Sheet<small>Simulates Prion / Alzheimer’s misfolding transition</small>',
                    btnClash: '⚠ Steric Clash Test (φ=0°, ψ=0°)<small>Enter forbidden white zone to inspect collisions</small>'
                },
                pdbDropTitle: '📂 Drop or Click to Load .pdb File',
                pdbDropSub: 'Computes all residue (φ, ψ, ω) angles & flags Outliers',
                rcsbPlaceholder: 'PDB ID (e.g. 1CRN, 1UBQ)',
                rcsbFetch: '☁️ Fetch RCSB',
                loadDemoPdb: '🧬 Demo PDB (Trp-cage 20aa)',
                clearPdb: '✕ Clear',
                exportCsv: '📥 Export CSV',
                dock: ['Guide', '3D View', 'Plot', 'Controls', 'PDB']
            }
        };

        function applyLanguage(lang) {
            currentLang = lang;
            const t = I18N_UI[lang];
            const dark = document.body.classList.contains('theme-dark');
            document.documentElement.lang = lang === 'en' ? 'en' : 'zh-TW';
            document.title = lang === 'en'
                ? 'Ramachandran Plot — 3D Structural Biology Studio'
                : 'Ramachandran Plot — 3D 結構生物學自學實驗室';

            langToggleBtn.textContent = t.langBtn;
            themeToggleBtn.textContent = dark ? t.themeLight : t.themeDark;
            shareLinkBtn.textContent = t.shareBtn;
            presentModeBtn.textContent = document.body.classList.contains('presentation-mode') ? t.exitPresentBtn : t.presentBtn;
            prevStepBtn.textContent = t.prevBtn;
            nextStepBtn.textContent = currentStepIdx >= STEPS_DATA.length - 1 ? t.doneBtn : t.nextBtn;
            navStepStatus.textContent = lang === 'en'
                ? `Step ${currentStepIdx + 1} / ${STEPS_DATA.length}`
                : `第 ${currentStepIdx + 1} / ${STEPS_DATA.length} 步`;

            viewSingleBtn.textContent = t.viewSingle;
            viewChainBtn.textContent = t.viewChain;
            modeProBtn.textContent = t.modePro;
            modeEnergyBtn.textContent = t.modeEnergy;
            modeSimpleBtn.textContent = t.modeSimple;
            document.getElementById('camPhiBtn').textContent = t.camPhi;
            document.getElementById('camPsiBtn').textContent = t.camPsi;
            document.getElementById('camResetBtn').textContent = t.camReset;
            if (typeof toggleLabelsBtn !== 'undefined' && toggleLabelsBtn) {
                toggleLabelsBtn.textContent = showLabels3D ? t.labelsOn : t.labelsOff;
            }
            export3DBtn.textContent = t.export3D;
            exportPlotBtn.textContent = t.exportPlot;
            document.querySelector('.hero-title').innerHTML = t.heroTitle;
            document.querySelector('.hero-subtitle').textContent = t.heroSub;

            document.querySelectorAll('.hero-specs .bento-val').forEach((el, i) => {
                if (t.specs[i]) el.textContent = t.specs[i];
            });

            document.querySelectorAll('.workspace-grid .card .card-title-row h2').forEach((h2, i) => {
                if (t.cardTitles[i]) h2.textContent = t.cardTitles[i];
            });

            const ramaHintEl = document.querySelector('#secRama .hint');
            if (ramaHintEl) ramaHintEl.innerHTML = t.ramaHint;
            const gestureEl = document.querySelector('.gesture-hint');
            if (gestureEl) {
                const isTouch = (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) || Math.min(window.innerWidth, window.innerHeight) <= 680;
                gestureEl.textContent = isTouch
                    ? (lang === 'en' ? '1-finger rotate · 2-finger pinch zoom · Double-tap reset' : '單指旋轉 · 雙指縮放 · 雙擊重設')
                    : t.gestureHint;
            }

            document.querySelectorAll('.atom-legend span').forEach((sp, i) => {
                if (!t.atomLegend[i]) return;
                const dot = sp.querySelector('i');
                sp.innerHTML = '';
                if (dot) sp.appendChild(dot);
                sp.appendChild(document.createTextNode(t.atomLegend[i]));
            });

            const phiSpan = document.querySelector('.phi-box .slider-header > span:first-child');
            const psiSpan = document.querySelector('.psi-box .slider-header > span:first-child');
            const omegaSpan = document.querySelector('.omega-box .slider-header > span:first-child');
            if (phiSpan) phiSpan.innerHTML = t.phiLabel;
            if (psiSpan) psiSpan.innerHTML = t.psiLabel;
            if (omegaSpan) omegaSpan.innerHTML = t.omegaLabel;

            const lockLbl = lockOmegaChk && lockOmegaChk.parentElement;
            if (lockLbl) {
                const checked = lockOmegaChk.checked;
                lockLbl.innerHTML = '';
                lockLbl.appendChild(lockOmegaChk);
                lockOmegaChk.checked = checked;
                lockLbl.appendChild(document.createTextNode(' ' + t.lockOmegaText));
            }

            const aaLbl = document.querySelector('label[for="aaType"]');
            if (aaLbl) aaLbl.textContent = t.aaLabel;

            const toggleSpans = document.querySelectorAll('#secControls .toggle-row > span:first-child');
            if (toggleSpans[0]) toggleSpans[0].textContent = t.vdwLabel;
            if (toggleSpans[1]) toggleSpans[1].textContent = t.tripleLabel;

            Object.entries(t.presets).forEach(([id, html]) => {
                const el = document.getElementById(id);
                if (el) el.innerHTML = html;
            });

            const dropStrong = pdbDropzone.querySelector('strong');
            const dropSpan = pdbDropzone.querySelector('span');
            if (dropStrong) dropStrong.textContent = t.pdbDropTitle;
            if (dropSpan) dropSpan.textContent = t.pdbDropSub;
            rcsbInput.placeholder = t.rcsbPlaceholder;
            rcsbFetchBtn.textContent = t.rcsbFetch;
            loadDemoPdbBtn.textContent = t.loadDemoPdb;
            clearPdbBtn.textContent = t.clearPdb;
            exportPdbCsvBtn.textContent = t.exportCsv;

            document.querySelectorAll('#mobileDock .dock-btn small').forEach((sm, i) => {
                if (t.dock[i]) sm.textContent = t.dock[i];
            });

            // 同步目前步驟文字、20 種胺基酸選單、等高線圖例、測驗與 3D 標籤
            const step = getStepData(currentStepIdx);
            if (step) {
                wizBadge.textContent = step.badge;
                wizTitle.textContent = step.title;
                wizText.innerHTML = step.text;
                wizAction.innerHTML = step.action;
                if (!pdbData) threeCaption.innerHTML = step.caption;
                bindVocabTooltips();
                const demoResBtn = document.getElementById('demoResonanceBtn');
                if (demoResBtn && pulsePeptidePlaneFn) {
                    demoResBtn.addEventListener('click', () => {
                        pulsePeptidePlaneFn();
                        threeCaption.innerHTML = isEN()
                            ? "🔒 <strong>Resonance Lock Demo:</strong> The C'–N bond has partial double-bond (1.5) character, locking the blue & green planes rigid so only Cα rotates!"
                            : "🔒 <strong>共振鎖死演示：</strong>C'-N 鍵具有部分雙鍵性質（1.5 鍵），藍色與綠色平面被固定成剛性玻璃板，只有中間 Cα 能旋轉！";
                    });
                }
            }

            if (typeof clearContourCache === 'function') clearContourCache();
            renderAAInfoCard(currentResidue);
            if (typeof setPlotMode === 'function') setPlotMode(plotMode);
            if (!pdbData && typeof updateViewHintText === 'function') updateViewHintText();
            if (typeof refreshLabelsLang3DFn === 'function') refreshLabelsLang3DFn();
            if (typeof renderQuizUI === 'function') renderQuizUI();
            if (pdbData && pdbData.selectedIdx >= 0) selectPDBResidue(pdbData.selectedIdx, false);
            else if (typeof updateAll === 'function') updateAll();
        }
        langToggleBtn.addEventListener('click', () => {
            applyLanguage(currentLang === 'zh' ? 'en' : 'zh');
        });

        // Mobile iOS-Style Bottom Dock Quick-Jump & Active Highlight
        (function initMobileDock() {
            const dock = document.getElementById('mobileDock');
            if (!dock) return;
            const btns = Array.from(dock.querySelectorAll('.dock-btn'));
            btns.forEach(btn => {
                btn.addEventListener('click', () => {
                    const target = document.getElementById(btn.dataset.target);
                    if (!target) return;
                    btns.forEach(b => b.classList.toggle('active', b === btn));
                    const navH = document.querySelector('.apple-nav')?.offsetHeight || 56;
                    const y = target.getBoundingClientRect().top + window.scrollY - navH - 10;
                    window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
                });
            });

            if (typeof IntersectionObserver !== 'undefined') {
                const sections = btns
                    .map(b => ({ btn: b, el: document.getElementById(b.dataset.target) }))
                    .filter(x => x.el);
                const obs = new IntersectionObserver((entries) => {
                    let best = null;
                    for (const entry of entries) {
                        if (entry.isIntersecting && (!best || entry.intersectionRatio > best.intersectionRatio)) {
                            best = entry;
                        }
                    }
                    if (best) {
                        const match = sections.find(s => s.el === best.target);
                        if (match) btns.forEach(b => b.classList.toggle('active', b === match.btn));
                    }
                }, { rootMargin: '-20% 0px -55% 0px', threshold: [0.1, 0.4, 0.7] });
                sections.forEach(s => obs.observe(s.el));
            }
        })();

        // ==========================================
        // Realistic Astronomical Night Sky & Milky Way Renderer (Dark Mode)
        // ==========================================
        (function initRealisticStarfield() {
            const canvas = document.getElementById('starfieldCanvas');
            if (!canvas) return;
            const ctx = canvas.getContext('2d', { alpha: false });
            let bgBuffer = null;
            let twinkleStars = [];
            let timerId = null;

            // Deterministic PRNG for consistent organic star distribution
            let seed = 42197;
            function rand() {
                seed = (seed * 1664525 + 1013904223) >>> 0;
                return seed / 4294967296;
            }
            function gauss() {
                return (rand() + rand() + rand() - 1.5) * 0.82;
            }

            // Real stellar blackbody colors (O, B, A, F, G, K, M spectral types)
            const STAR_COLORS = [
                [175, 208, 255], // O/B blue-white
                [210, 228, 255], // A blue-white
                [255, 255, 255], // F crisp white
                [255, 255, 255], // F/G white
                [255, 244, 218], // G warm white
                [255, 218, 168], // K golden-orange
                [255, 188, 148]  // M soft amber-red
            ];

            function buildSky() {
                const w = window.innerWidth || 1280;
                const h = window.innerHeight || 800;
                canvas.width = w;
                canvas.height = h;

                if (!bgBuffer) bgBuffer = document.createElement('canvas');
                bgBuffer.width = w;
                bgBuffer.height = h;
                const bCtx = bgBuffer.getContext('2d', { alpha: false });

                seed = 42197;
                twinkleStars = [];

                // 1. Deep realistic night-sky zenith-to-horizon gradient
                const skyGrad = bCtx.createLinearGradient(0, 0, 0, h);
                skyGrad.addColorStop(0, '#02040a');
                skyGrad.addColorStop(0.55, '#050915');
                skyGrad.addColorStop(1, '#091122');
                bCtx.fillStyle = skyGrad;
                bCtx.fillRect(0, 0, w, h);

                // 2. Diagonal Milky Way galactic band (soft layered nebula clouds + faint warm core)
                bCtx.save();
                bCtx.translate(w * 0.52, h * 0.48);
                bCtx.rotate(-0.46);
                const bandLen = Math.hypot(w, h) * 1.15;

                // Broad outer galactic glow
                const mwOuter = bCtx.createRadialGradient(0, 0, bandLen * 0.02, 0, 0, bandLen * 0.55);
                mwOuter.addColorStop(0, 'rgba(130, 160, 225, 0.14)');
                mwOuter.addColorStop(0.35, 'rgba(95, 118, 195, 0.085)');
                mwOuter.addColorStop(0.7, 'rgba(55, 70, 140, 0.03)');
                mwOuter.addColorStop(1, 'rgba(0, 0, 0, 0)');
                bCtx.save();
                bCtx.scale(1, 0.28);
                bCtx.fillStyle = mwOuter;
                bCtx.fillRect(-bandLen, -bandLen, bandLen * 2, bandLen * 2);
                bCtx.restore();

                // Warm galactic core + subtle magenta/cyan emission nebulae patches
                const clouds = [
                    { x: -bandLen * 0.12, y: 0, rx: bandLen * 0.22, ry: bandLen * 0.065, c: 'rgba(215, 185, 155, 0.085)' },
                    { x: bandLen * 0.14, y: -12, rx: bandLen * 0.20, ry: bandLen * 0.06, c: 'rgba(110, 175, 255, 0.08)' },
                    { x: -bandLen * 0.28, y: 14, rx: bandLen * 0.16, ry: bandLen * 0.055, c: 'rgba(180, 115, 235, 0.065)' },
                    { x: bandLen * 0.02, y: 18, rx: bandLen * 0.18, ry: bandLen * 0.05, c: 'rgba(255, 140, 175, 0.045)' }
                ];
                clouds.forEach(cl => {
                    bCtx.save();
                    bCtx.translate(cl.x, cl.y);
                    bCtx.scale(1, cl.ry / cl.rx);
                    const g = bCtx.createRadialGradient(0, 0, 0, 0, 0, cl.rx);
                    g.addColorStop(0, cl.c);
                    g.addColorStop(1, 'rgba(0,0,0,0)');
                    bCtx.fillStyle = g;
                    bCtx.beginPath();
                    bCtx.arc(0, 0, cl.rx, 0, Math.PI * 2);
                    bCtx.fill();
                    bCtx.restore();
                });

                // Subtle dark cosmic dust rift along the center of the Milky Way
                const rift = bCtx.createRadialGradient(0, 4, 0, 0, 4, bandLen * 0.36);
                rift.addColorStop(0, 'rgba(2, 4, 10, 0.42)');
                rift.addColorStop(0.6, 'rgba(2, 4, 10, 0.16)');
                rift.addColorStop(1, 'rgba(2, 4, 10, 0)');
                bCtx.save();
                bCtx.scale(1, 0.06);
                bCtx.fillStyle = rift;
                bCtx.fillRect(-bandLen, -bandLen, bandLen * 2, bandLen * 2);
                bCtx.restore();
                bCtx.restore();

                // 3. Dense faint star dust concentrated along the Milky Way plane + uniform field stars
                const areaFactor = Math.min(1.3, (w * h) / (1280 * 800));
                const dustCount = Math.round(420 * areaFactor);
                const fieldCount = Math.round(240 * areaFactor);
                const cosA = Math.cos(-0.46), sinA = Math.sin(-0.46);

                for (let i = 0; i < dustCount; i++) {
                    const along = (rand() - 0.5) * bandLen;
                    const across = gauss() * Math.min(w, h) * 0.19;
                    const x = w * 0.52 + along * cosA - across * sinA;
                    const y = h * 0.48 + along * sinA + across * cosA;
                    if (x < 0 || x > w || y < 0 || y > h) continue;
                    const col = STAR_COLORS[Math.floor(rand() * STAR_COLORS.length)];
                    const r = 0.35 + Math.pow(rand(), 3) * 1.1;
                    const a = 0.18 + Math.pow(rand(), 2) * 0.65;
                    bCtx.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${a.toFixed(2)})`;
                    bCtx.beginPath();
                    bCtx.arc(x, y, r, 0, Math.PI * 2);
                    bCtx.fill();
                }

                for (let i = 0; i < fieldCount; i++) {
                    const x = rand() * w;
                    const y = rand() * h;
                    const col = STAR_COLORS[Math.floor(rand() * STAR_COLORS.length)];
                    const r = 0.4 + Math.pow(rand(), 3.2) * 1.25;
                    const a = 0.25 + rand() * 0.65;
                    bCtx.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${a.toFixed(2)})`;
                    bCtx.beginPath();
                    bCtx.arc(x, y, r, 0, Math.PI * 2);
                    bCtx.fill();
                }

                // 4. Select ~38 bright stars for realistic gentle scintillation (twinkling)
                const brightCount = Math.round(36 * areaFactor);
                for (let i = 0; i < brightCount; i++) {
                    const col = STAR_COLORS[Math.floor(rand() * STAR_COLORS.length)];
                    const isHero = i < 7;
                    twinkleStars.push({
                        x: rand() * w,
                        y: rand() * h,
                        r: isHero ? (1.45 + rand() * 0.65) : (0.9 + rand() * 0.6),
                        col,
                        phase: rand() * Math.PI * 2,
                        speed: 0.9 + rand() * 1.8,
                        hero: isHero
                    });
                }

                drawFrame(0);
            }

            function drawFrame(tSec) {
                if (!bgBuffer) return;
                ctx.drawImage(bgBuffer, 0, 0);
                for (let i = 0; i < twinkleStars.length; i++) {
                    const s = twinkleStars[i];
                    const tw = 0.58 + 0.42 * Math.sin(tSec * s.speed + s.phase);
                    const [cr, cg, cb] = s.col;

                    // Soft atmospheric halo
                    const haloR = s.r * (s.hero ? 5.2 : 3.2);
                    const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, haloR);
                    g.addColorStop(0, `rgba(${cr},${cg},${cb},${(0.85 * tw).toFixed(2)})`);
                    g.addColorStop(0.35, `rgba(${cr},${cg},${cb},${(0.24 * tw).toFixed(2)})`);
                    g.addColorStop(1, 'rgba(0,0,0,0)');
                    ctx.fillStyle = g;
                    ctx.beginPath();
                    ctx.arc(s.x, s.y, haloR, 0, Math.PI * 2);
                    ctx.fill();

                    // Crisp star core
                    ctx.fillStyle = `rgba(255,255,255,${(0.7 + 0.3 * tw).toFixed(2)})`;
                    ctx.beginPath();
                    ctx.arc(s.x, s.y, s.r * 0.65, 0, Math.PI * 2);
                    ctx.fill();

                    // Subtle astronomical 4-point diffraction spikes on the brightest stars
                    if (s.hero) {
                        const sp = s.r * (4.2 + 1.8 * tw);
                        ctx.strokeStyle = `rgba(${cr},${cg},${cb},${(0.32 * tw).toFixed(2)})`;
                        ctx.lineWidth = 0.8;
                        ctx.beginPath();
                        ctx.moveTo(s.x - sp, s.y); ctx.lineTo(s.x + sp, s.y);
                        ctx.moveTo(s.x, s.y - sp); ctx.lineTo(s.x, s.y + sp);
                        ctx.stroke();
                    }
                }
            }

            function stopLoop() {
                if (timerId) { clearInterval(timerId); timerId = null; }
            }

            syncStarfieldState = () => {
                const active = document.body.classList.contains('theme-dark') && !document.hidden;
                if (active) {
                    if (!bgBuffer || bgBuffer.width !== window.innerWidth || bgBuffer.height !== window.innerHeight) {
                        buildSky();
                    }
                    if (!timerId) {
                        const start = performance.now();
                        timerId = setInterval(() => {
                            drawFrame((performance.now() - start) * 0.001);
                        }, 110); // ~9 FPS gentle scintillation, <1% CPU
                    }
                } else {
                    stopLoop();
                }
            };

            let resizeDebounce = null;
            window.addEventListener('resize', () => {
                if (!document.body.classList.contains('theme-dark')) return;
                clearTimeout(resizeDebounce);
                resizeDebounce = setTimeout(() => buildSky(), 180);
            });
            document.addEventListener('visibilitychange', syncStarfieldState);
            syncStarfieldState();
        })();

