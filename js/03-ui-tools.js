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

        function applyTheme(dark, silent = false) {
            document.body.classList.toggle('theme-dark', dark);
            themeToggleBtn.textContent = dark ? '☀️ 淺色' : '🌙 深色';
            themeToggleBtn.classList.toggle('active', dark);
            try { localStorage.setItem('rama-theme', dark ? 'dark' : 'light'); } catch (_) {}
            updateSliderFills();
            drawRamachandranPlot(currentPhi, currentPsi, currentAA);
            if (!silent) showAppleToast(dark ? '🌙 已切換至 Pro 深色鈦金主題' : '☀️ 已切換至 Studio 淺色主題');
        }
        themeToggleBtn.addEventListener('click', () => {
            applyTheme(!document.body.classList.contains('theme-dark'));
        });
        try {
            if (localStorage.getItem('rama-theme') === 'dark') applyTheme(true, true);
        } catch (_) {}

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
        let currentLang = 'zh';
        const I18N_UI = {
            zh: {
                langBtn: '🌐 EN',
                shareBtn: '🔗 複製連結',
                presentBtn: '⛶ 簡報模式',
                exitPresentBtn: '✕ 退出簡報',
                prevBtn: '← 上一步',
                nextBtn: '下一步 →',
                viewSingle: '單關節雙平面',
                viewChain: '多肽鏈折疊',
                modePro: '真實等高線',
                modeSimple: '入門色塊',
                camPhi: '俯視 φ 軸',
                camPsi: '俯視 ψ 軸',
                camReset: '重設鏡頭',
                export3D: '📷 匯出 3D',
                exportPlot: '📷 匯出圖表',
                heroTitle: '拉氏圖 <span>Ramachandran Plot</span> 3D 自學實驗室',
                heroSub: '從胜肽鍵 1.5 鍵共振、紐曼投影視角到三股膠原蛋白超螺旋，以即時物理引擎探索蛋白質折疊的幾何密碼。'
            },
            en: {
                langBtn: '🌐 繁中',
                shareBtn: '🔗 Share URL',
                presentBtn: '⛶ Present',
                exitPresentBtn: '✕ Exit Present',
                prevBtn: '← Prev',
                nextBtn: 'Next →',
                viewSingle: 'Single Residue',
                viewChain: 'Polypeptide Chain',
                modePro: 'KDE Contours',
                modeSimple: 'Simple Zones',
                camPhi: 'Look down φ',
                camPsi: 'Look down ψ',
                camReset: 'Reset Cam',
                export3D: '📷 Export 3D',
                exportPlot: '📷 Export Plot',
                heroTitle: '<span>Ramachandran Plot</span> 3D Interactive Studio',
                heroSub: 'Explore peptide bond resonance, Newman projections, steric clashes, and collagen triple helices in real time.'
            }
        };

        function applyLanguage(lang) {
            currentLang = lang;
            const t = I18N_UI[lang];
            langToggleBtn.textContent = t.langBtn;
            shareLinkBtn.textContent = t.shareBtn;
            presentModeBtn.textContent = document.body.classList.contains('presentation-mode') ? t.exitPresentBtn : t.presentBtn;
            prevStepBtn.textContent = t.prevBtn;
            if (currentStepIdx < STEPS_DATA.length - 1) nextStepBtn.textContent = t.nextBtn;
            viewSingleBtn.textContent = t.viewSingle;
            viewChainBtn.textContent = t.viewChain;
            modeProBtn.textContent = t.modePro;
            modeSimpleBtn.textContent = t.modeSimple;
            document.getElementById('camPhiBtn').textContent = t.camPhi;
            document.getElementById('camPsiBtn').textContent = t.camPsi;
            document.getElementById('camResetBtn').textContent = t.camReset;
            export3DBtn.textContent = t.export3D;
            exportPlotBtn.textContent = t.exportPlot;
            document.querySelector('.hero-title').innerHTML = t.heroTitle;
            document.querySelector('.hero-subtitle').textContent = t.heroSub;
        }
        langToggleBtn.addEventListener('click', () => {
            applyLanguage(currentLang === 'zh' ? 'en' : 'zh');
        });

