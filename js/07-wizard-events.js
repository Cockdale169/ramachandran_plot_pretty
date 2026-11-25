'use strict';
// 9-10. 十步驟導覽、滑桿/按鈕/拖曳等互動事件
// 注意：所有 js/ 檔案共用同一個全域範圍，必須依 index.html 中的順序載入。

        // ==========================================
        // 9. 十步驟導覽器控制邏輯
        // ==========================================
        const stepPillsContainer = document.getElementById('stepPillsContainer');
        const prevStepBtn = document.getElementById('prevStepBtn');
        const nextStepBtn = document.getElementById('nextStepBtn');
        const wizBadge = document.getElementById('wizBadge');
        const wizTitle = document.getElementById('wizTitle');
        const wizText = document.getElementById('wizText');
        const wizAction = document.getElementById('wizAction');

        STEPS_DATA.forEach((_, idx) => {
            const btn = document.createElement('button');
            btn.className = 'step-pill';
            btn.textContent = idx + 1;
            btn.title = `跳至第 ${idx + 1} 步`;
            btn.addEventListener('click', () => goToStep(idx));
            stepPillsContainer.appendChild(btn);
        });

        function goToStep(idx) {
            if (pdbData) clearPDBMode();
            if (misfoldAnimId) {
                cancelAnimationFrame(misfoldAnimId);
                misfoldAnimId = null;
            }
            currentStepIdx = Math.max(0, Math.min(STEPS_DATA.length - 1, idx));
            const step = getStepData(currentStepIdx);
            const en = isEN();

            navStepStatus.textContent = en
                ? `Step ${currentStepIdx + 1} / ${STEPS_DATA.length}`
                : `第 ${currentStepIdx + 1} / ${STEPS_DATA.length} 步`;
            if (wizardProgressFill) {
                wizardProgressFill.style.width = `${((currentStepIdx + 1) / STEPS_DATA.length) * 100}%`;
            }

            document.querySelectorAll('.step-pill').forEach((el, i) => {
                el.classList.remove('active', 'done');
                if (i === currentStepIdx) el.classList.add('active');
                else if (i < currentStepIdx) el.classList.add('done');
            });

            prevStepBtn.disabled = currentStepIdx === 0;
            nextStepBtn.disabled = currentStepIdx === STEPS_DATA.length - 1;
            nextStepBtn.textContent = currentStepIdx === STEPS_DATA.length - 1
                ? (en ? 'Course Completed 🎉' : '已完成全部課程 🎉')
                : (en ? 'Next →' : '下一步 →');

            wizBadge.textContent = step.badge;
            wizTitle.textContent = step.title;
            wizText.innerHTML = step.text;
            wizAction.innerHTML = step.action;
            threeCaption.innerHTML = step.caption;

            bindVocabTooltips();

            const demoResonanceBtn = document.getElementById('demoResonanceBtn');
            if (demoResonanceBtn && pulsePeptidePlaneFn) {
                demoResonanceBtn.addEventListener('click', () => {
                    pulsePeptidePlaneFn();
                    threeCaption.innerHTML = "🔒 <strong>共振鎖死演示：</strong>C'-N 鍵具有部分雙鍵性質（1.5 鍵），藍色與綠色平面被固定成剛性玻璃板，只有中間 Cα 能旋轉！";
                });
            }

            if (currentStepIdx === 9) {
                quizStage = 1;
                stage1DotReached = false;
            }

            const s = step.setup;
            questTarget = s.questTarget;
            showTripleHelix = s.triple;
            tripleHelixChk.checked = s.triple;

            setViewMode(s.view);
            setPlotMode(s.plot);
            setAminoAcid(s.aa);

            lockOmegaChk.checked = s.lockOmega;
            omegaSlider.disabled = s.lockOmega;
            currentOmega = s.omega;
            omegaSlider.value = s.omega;

            vdwToggleChk.checked = s.vdw;
            showVDW = s.vdw;
            if (setVDW3DFn) setVDW3DFn(showVDW);

            setAngles(s.phi, s.psi);
            renderQuizUI();
        }

        prevStepBtn.addEventListener('click', () => goToStep(currentStepIdx - 1));
        nextStepBtn.addEventListener('click', () => goToStep(currentStepIdx + 1));

        // ==========================================
        // 10. 互動事件與狀態同步 (支援滑鼠 + 觸控)
        // ==========================================
        let isDraggingPlot = false;

        function handlePlotPointer(e, deferred = false) {
            const rect = ramaCanvas.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * LOGICAL_SIZE;
            const y = ((e.clientY - rect.top) / rect.height) * LOGICAL_SIZE;

            const pad = 44;
            const plotW = LOGICAL_SIZE - pad * 2;
            const plotH = LOGICAL_SIZE - pad * 2;

            // P2: If PDB is active, pick nearest residue dot on click
            if (pdbData && pdbData.residues.length > 0) {
                let bestIdx = -1;
                let bestDist = 18;
                pdbData.residues.forEach((r, idx) => {
                    if (r.phi === null || r.psi === null) return;
                    const rx = pad + ((r.phi + 180) / 360) * plotW;
                    const ry = pad + ((180 - r.psi) / 360) * plotH;
                    const d = Math.hypot(x - rx, y - ry);
                    if (d < bestDist) {
                        bestDist = d;
                        bestIdx = idx;
                    }
                });
                if (bestIdx !== -1) selectPDBResidue(bestIdx);
                return;
            }

            let degPhi = Math.round(((x - pad) / plotW) * 360 - 180);
            let degPsi = Math.round(180 - ((y - pad) / plotH) * 360);

            degPhi = Math.max(-180, Math.min(180, degPhi));
            degPsi = Math.max(-180, Math.min(180, degPsi));

            setAngles(degPhi, degPsi, deferred);
        }

        let _interactiveRaf = 0;
        function scheduleInteractiveUpdate() {
            if (_interactiveRaf) return;
            _interactiveRaf = requestAnimationFrame(() => {
                _interactiveRaf = 0;
                updateAll();
            });
        }

        ramaCanvas.addEventListener('pointerdown', (e) => {
            isDraggingPlot = true;
            ramaCanvas.setPointerCapture(e.pointerId);
            handlePlotPointer(e);
        });
        ramaCanvas.addEventListener('pointermove', (e) => {
            if (isDraggingPlot) handlePlotPointer(e, true);
        });
        ramaCanvas.addEventListener('pointerup', () => {
            isDraggingPlot = false;
        });
        ramaCanvas.addEventListener('pointercancel', () => {
            isDraggingPlot = false;
        });

        function setAngles(phi, psi, deferred = false) {
            currentPhi = phi;
            currentPsi = psi;
            phiSlider.value = phi;
            psiSlider.value = psi;
            if (deferred) scheduleInteractiveUpdate();
            else updateAll();
        }

        function setAminoAcid(aa) {
            const key = normalizeResidueKey(aa);
            currentResidue = key;
            currentAA = AMINO_ACIDS[key].cls;
            aaSelect.value = key;
            renderAAInfoCard(key);
            if (rebuildSideChainFn) rebuildSideChainFn(key);
            updateAll();
            if (currentStepIdx === 9 && quizStage === 2) {
                renderQuizUI();
            }
        }

        function setPlotMode(mode) {
            plotMode = mode;
            const en = isEN();
            modeProBtn.classList.toggle('active', mode === 'pro');
            modeEnergyBtn.classList.toggle('active', mode === 'energy');
            modeSimpleBtn.classList.toggle('active', mode === 'simple');
            if (mode === 'pro') {
                plotLegend.innerHTML = en ? `
                    <span class="badge favored">Dark Blue Contour: Favored Core</span>
                    <span class="badge allowed-pro">Light Blue Contour: Allowed Region</span>
                ` : `
                    <span class="badge favored">深藍實線內：最有利核心區 (Favored)</span>
                    <span class="badge allowed-pro">淺藍外圈內：額外容許區 (Allowed)</span>
                `;
            } else if (mode === 'energy') {
                plotLegend.innerHTML = en ? `
                    <span class="badge favored">Deep Blue/Teal: Low Free Energy (0–1.5 kcal/mol)</span>
                    <span class="badge allowed-pro">Amber/White: High Steric Barrier (E = −kT ln P)</span>
                ` : `
                    <span class="badge favored">深藍/青綠：低自由能盆地 (0 ~ 1.5 kcal/mol)</span>
                    <span class="badge allowed-pro">琥珀/橘白：高能立體阻礙障壁 (E = -kT ln P)</span>
                `;
            } else {
                plotLegend.innerHTML = en ? `
                    <span class="badge beta">Top-Left: β-Sheet</span>
                    <span class="badge alpha-r">Bottom-Left: Right α-Helix</span>
                    <span class="badge alpha-l">Top-Right: Left α-Helix</span>
                ` : `
                    <span class="badge beta">左上：β-摺疊</span>
                    <span class="badge alpha-r">左下：右手 α-螺旋</span>
                    <span class="badge alpha-l">右上：左手 α-螺旋</span>
                `;
            }
            drawRamachandranPlot(currentPhi, currentPsi, currentAA);
        }

        function updateViewHintText() {
            if (viewMode === 'single') {
                threeHint.innerHTML = isEN()
                    ? '<strong>Single Residue:</strong> Blue dashed line = <strong>φ axis</strong>, green dashed line = <strong>ψ axis</strong>. Use the toolbar to look down either axis.'
                    : '<strong>單關節模式：</strong>藍色虛線是 <strong>φ 轉軸</strong>，綠色虛線是 <strong>ψ 轉軸</strong>，可點擊上方按鈕平滑俯視轉軸。';
            } else {
                updateChainHintText();
            }
        }

        function setViewMode(mode) {
            viewMode = mode;
            const camPhiBtn = document.getElementById('camPhiBtn');
            const camPsiBtn = document.getElementById('camPsiBtn');
            if (mode === 'single') {
                viewSingleBtn.classList.add('active');
                viewChainBtn.classList.remove('active');
                tripleHelixRow.style.display = 'none';
                camPhiBtn.style.display = 'inline-block';
                camPsiBtn.style.display = 'inline-block';
            } else {
                viewChainBtn.classList.add('active');
                viewSingleBtn.classList.remove('active');
                tripleHelixRow.style.display = 'flex';
                camPhiBtn.style.display = 'none';
                camPsiBtn.style.display = 'none';
            }
            updateViewHintText();
            if (setViewMode3DFn) setViewMode3DFn(mode);
        }

        function updateChainHintText() {
            if (showTripleHelix) {
                threeHint.innerHTML = isEN()
                    ? '<strong>Collagen Triple Helix (3 Chains):</strong> Three NeRF-built polypeptide strands intertwined with purple <strong>inter-chain H-bonds</strong>.'
                    : '<strong>三股超螺旋模式 (3 Chains)：</strong>3 條 NeRF 計算的多肽鏈並排纏繞，紫色虛線為<strong>跨鏈氫鍵</strong>。';
            } else {
                threeHint.innerHTML = isEN()
                    ? '<strong>12-Residue Polypeptide Chain:</strong> Repeats the current (φ, ψ) 12 times; purple dashed lines show <strong>intra-chain H-bonds</strong>.'
                    : '<strong>單股 12 殘基多肽鏈模式：</strong>將同一組 (φ, ψ) 連續重複 12 次，紫色虛線代表自動形成的<strong>鏈內氫鍵</strong>。';
            }
        }

        function updateAll() {
            phiVal.textContent = `${currentPhi}°`;
            psiVal.textContent = `${currentPsi}°`;
            omegaVal.textContent = `${currentOmega}°`;
            updateSliderFills();

            if (viewMode === 'chain') {
                updateChainHintText();
            }

            const evalResult = evaluateRegion(currentPhi, currentPsi, currentOmega, currentAA);
            statusPanel.className = `status-panel ${evalResult.status}`;
            statusTitle.textContent = evalResult.title;
            statusDesc.textContent = evalResult.desc;

            drawRamachandranPlot(currentPhi, currentPsi, currentAA);
            updateNewmanClock();
            if (update3DFn) {
                update3DFn(currentPhi, currentPsi, currentOmega, evalResult);
            }
        }

        modeProBtn.addEventListener('click', () => setPlotMode('pro'));
        modeEnergyBtn.addEventListener('click', () => setPlotMode('energy'));
        modeSimpleBtn.addEventListener('click', () => setPlotMode('simple'));
        viewSingleBtn.addEventListener('click', () => { if (pdbData) clearPDBMode(); setViewMode('single'); updateAll(); });
        viewChainBtn.addEventListener('click', () => { if (pdbData) clearPDBMode(); setViewMode('chain'); updateAll(); });

        tripleHelixChk.addEventListener('change', (e) => {
            showTripleHelix = e.target.checked;
            updateAll();
        });

        phiSlider.addEventListener('input', (e) => { currentPhi = parseInt(e.target.value, 10); scheduleInteractiveUpdate(); });
        psiSlider.addEventListener('input', (e) => { currentPsi = parseInt(e.target.value, 10); scheduleInteractiveUpdate(); });
        omegaSlider.addEventListener('input', (e) => { currentOmega = parseInt(e.target.value, 10); scheduleInteractiveUpdate(); });

        lockOmegaChk.addEventListener('change', (e) => {
            omegaSlider.disabled = e.target.checked;
            if (e.target.checked) {
                currentOmega = 180;
                omegaSlider.value = 180;
            }
            updateAll();
        });

        vdwToggleChk.addEventListener('change', (e) => {
            showVDW = e.target.checked;
            if (setVDW3DFn) setVDW3DFn(showVDW);
        });

        aaSelect.addEventListener('change', (e) => setAminoAcid(e.target.value));

        document.getElementById('btnAlphaR').addEventListener('click', () => {
            showTripleHelix = false;
            tripleHelixChk.checked = false;
            setAngles(-57, -47);
        });
        document.getElementById('btnBetaAnti').addEventListener('click', () => {
            showTripleHelix = false;
            tripleHelixChk.checked = false;
            setAngles(-139, 135);
        });
        document.getElementById('btnBetaPara').addEventListener('click', () => {
            showTripleHelix = false;
            tripleHelixChk.checked = false;
            setAngles(-119, 113);
        });
        document.getElementById('btnPPII').addEventListener('click', () => {
            showTripleHelix = true;
            tripleHelixChk.checked = true;
            setViewMode('chain');
            setAminoAcid('proline');
            setAngles(-75, 145);
        });
        document.getElementById('btnAlpha310').addEventListener('click', () => {
            showTripleHelix = false;
            tripleHelixChk.checked = false;
            setAngles(-49, -26);
        });
        document.getElementById('btnAlphaL').addEventListener('click', () => {
            showTripleHelix = false;
            tripleHelixChk.checked = false;
            setAngles(57, 47);
        });
        document.getElementById('btnClash').addEventListener('click', () => {
            setViewMode('single');
            vdwToggleChk.checked = true;
            showVDW = true;
            if (setVDW3DFn) setVDW3DFn(true);
            setAngles(0, 0);
        });

        document.getElementById('btnMisfold').addEventListener('click', () => {
            if (misfoldAnimId) cancelAnimationFrame(misfoldAnimId);
            showTripleHelix = false;
            tripleHelixChk.checked = false;
            setViewMode('chain');
            setAminoAcid('general');

            const startPhi = -57, startPsi = -47;
            const endPhi = -139, endPsi = 135;
            const duration = 2600;
            const startTime = performance.now();

            threeCaption.innerHTML = isEN()
                ? "🧠 <strong>Misfolding Demo Running:</strong> Healthy α-helix is losing intra-chain H-bonds and extending into abnormal β-sheet (Prion / Amyloid plaque mechanism)..."
                : "🧠 <strong>疾病演示進行中：</strong>健康的 α-螺旋正在失去鏈內氫鍵並拉直成異常 β-摺疊（普里昂蛋白與類澱粉斑塊致病機制）...";

            function stepAnim(now) {
                const t = Math.min(1, (now - startTime) / duration);
                const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
                const p = Math.round(startPhi + (endPhi - startPhi) * ease);
                const s = Math.round(startPsi + (endPsi - startPsi) * ease);
                setAngles(p, s);
                if (t < 1) {
                    misfoldAnimId = requestAnimationFrame(stepAnim);
                } else {
                    misfoldAnimId = null;
                    threeCaption.innerHTML = isEN()
                        ? "⚠️ <strong>Misfolding Complete:</strong> The isolated α-helix has unraveled into an extended β-strand prone to stacking into insoluble amyloid plaques!"
                        : "⚠️ <strong>異常折疊完成：</strong>原本獨立的螺旋彈簧已拉直成 β-摺疊長鏈，在腦部容易互相堆疊沉積成不溶性斑塊！";
                }
            }
            misfoldAnimId = requestAnimationFrame(stepAnim);
        });

        document.getElementById('camPhiBtn').addEventListener('click', () => { if (setCameraPresetFn) setCameraPresetFn('phi'); });
        document.getElementById('camPsiBtn').addEventListener('click', () => { if (setCameraPresetFn) setCameraPresetFn('psi'); });
        document.getElementById('camZoomInBtn').addEventListener('click', () => { if (setCameraPresetFn) setCameraPresetFn('zoomIn'); });
        document.getElementById('camZoomOutBtn').addEventListener('click', () => { if (setCameraPresetFn) setCameraPresetFn('zoomOut'); });
        document.getElementById('camResetBtn').addEventListener('click', () => { if (setCameraPresetFn) setCameraPresetFn('reset'); });

        const toggleLabelsBtn = document.getElementById('toggleLabelsBtn');
        toggleLabelsBtn.addEventListener('click', () => {
            showLabels3D = !showLabels3D;
            toggleLabelsBtn.textContent = isEN()
                ? (showLabels3D ? 'Labels: ON' : 'Labels: OFF')
                : (showLabels3D ? '標籤: 開' : '標籤: 關');
            toggleLabelsBtn.classList.toggle('active', showLabels3D);
            if (setLabels3DFn) setLabels3DFn(showLabels3D);
        });

