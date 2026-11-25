'use strict';
// 3. UI 元素參照、全域狀態、PDB 解析/載入/RCSB 下載
// 注意：所有 js/ 檔案共用同一個全域範圍，必須依 index.html 中的順序載入。

        // ==========================================
        // 3. UI 元素與全域狀態
        // ==========================================
        const threeContainer = document.getElementById('threeContainer');
        const labelOverlay = document.getElementById('labelOverlay');
        const labelLeaderCanvas = document.getElementById('labelLeaderCanvas');
        const leaderCtx = labelLeaderCanvas.getContext('2d');
        const threeCaption = document.getElementById('threeCaption');
        const threeHint = document.getElementById('threeHint');
        const distanceHud = document.getElementById('distanceHud');
        const navStepStatus = document.getElementById('navStepStatus');
        const ramaCanvas = document.getElementById('ramaCanvas');
        const rCtx = ramaCanvas.getContext('2d');

        const phiSlider = document.getElementById('phiSlider');
        const psiSlider = document.getElementById('psiSlider');
        const omegaSlider = document.getElementById('omegaSlider');
        const lockOmegaChk = document.getElementById('lockOmegaChk');
        const vdwToggleChk = document.getElementById('vdwToggleChk');
        const tripleHelixRow = document.getElementById('tripleHelixRow');
        const tripleHelixChk = document.getElementById('tripleHelixChk');

        const phiVal = document.getElementById('phiVal');
        const psiVal = document.getElementById('psiVal');
        const omegaVal = document.getElementById('omegaVal');
        const aaSelect = document.getElementById('aaType');

        const statusPanel = document.getElementById('statusPanel');
        const statusTitle = document.getElementById('statusTitle');
        const statusDesc = document.getElementById('statusDesc');

        const modeProBtn = document.getElementById('modeProBtn');
        const modeEnergyBtn = document.getElementById('modeEnergyBtn');
        const modeSimpleBtn = document.getElementById('modeSimpleBtn');
        const viewSingleBtn = document.getElementById('viewSingleBtn');
        const viewChainBtn = document.getElementById('viewChainBtn');
        const plotLegend = document.getElementById('plotLegend');
        const quizContainer = document.getElementById('quizContainer');

        let currentStepIdx = 0;
        let currentPhi = -57;
        let currentPsi = -47;
        let currentOmega = 180;
        let currentResidue = 'ALA';
        let currentAA = 'general';
        let plotMode = 'pro';
        let viewMode = 'single';
        let showVDW = false;
        let showTripleHelix = false;
        let showLabels3D = true;
        let questTarget = null;
        let quizStage = 1;
        let stage1DotReached = false;
        let misfoldAnimId = null;

        let update3DFn = null;
        let rebuildSideChainFn = null;
        let setViewMode3DFn = null;
        let setVDW3DFn = null;
        let setLabels3DFn = null;
        let setCameraPresetFn = null;
        let pulsePeptidePlaneFn = null;
        let export3DFn = null;
        let renderPDB3DFn = null;
        let selectPDBResidue3DFn = null;
        let clearPDB3DFn = null;
        let buildDemoPDBTextFn = null;
        let refreshLabelsLang3DFn = null;

        // P2: PDB State
        let pdbData = null; // { name, residues: [{ chain, resSeq, resName, aaClass, phi, psi, omega, status, ca, n, c, o }], selectedIdx }
        const pdbFileInput = document.getElementById('pdbFileInput');
        const pdbDropzone = document.getElementById('pdbDropzone');
        const rcsbInput = document.getElementById('rcsbInput');
        const rcsbFetchBtn = document.getElementById('rcsbFetchBtn');
        const pdbChainSelect = document.getElementById('pdbChainSelect');
        const exportPdbCsvBtn = document.getElementById('exportPdbCsvBtn');
        const loadDemoPdbBtn = document.getElementById('loadDemoPdbBtn');
        const clearPdbBtn = document.getElementById('clearPdbBtn');
        const pdbSummaryBox = document.getElementById('pdbSummaryBox');
        const pdbFileNameEl = document.getElementById('pdbFileName');
        const pdbFavPctEl = document.getElementById('pdbFavPct');
        const pdbAllPctEl = document.getElementById('pdbAllPct');
        const pdbOutCntEl = document.getElementById('pdbOutCnt');
        const pdbOutlierListEl = document.getElementById('pdbOutlierList');

        function calcDihedralDeg(p1, p2, p3, p4) {
            const b0x = p1.x - p2.x, b0y = p1.y - p2.y, b0z = p1.z - p2.z;
            const b1x = p3.x - p2.x, b1y = p3.y - p2.y, b1z = p3.z - p2.z;
            const b2x = p4.x - p3.x, b2y = p4.y - p3.y, b2z = p4.z - p3.z;

            const b1Len = Math.hypot(b1x, b1y, b1z);
            if (b1Len < 1e-6) return null;
            const ux = b1x / b1Len, uy = b1y / b1Len, uz = b1z / b1Len;

            const dot0 = b0x * ux + b0y * uy + b0z * uz;
            const vx = b0x - dot0 * ux, vy = b0y - dot0 * uy, vz = b0z - dot0 * uz;

            const dot2 = b2x * ux + b2y * uy + b2z * uz;
            const wx = b2x - dot2 * ux, wy = b2y - dot2 * uy, wz = b2z - dot2 * uz;

            const x = vx * wx + vy * wy + vz * wz;
            // (u x v) . w
            const cx = uy * vz - uz * vy;
            const cy = uz * vx - ux * vz;
            const cz = ux * vy - uy * vx;
            const y = cx * wx + cy * wy + cz * wz;
            return Math.round(Math.atan2(y, x) * (180 / Math.PI));
        }

        function parsePDBText(text, fileName = 'protein.pdb', preferredChain = null) {
            const lines = text.split(/\r?\n/);
            const chainsMap = new Map();

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                if (line.startsWith('ENDMDL')) break;
                if (!line.startsWith('ATOM  ')) continue;

                const atomName = line.slice(12, 16).trim();
                if (atomName !== 'N' && atomName !== 'CA' && atomName !== 'C' && atomName !== 'O') continue;

                const altLoc = line[16] || ' ';
                if (altLoc !== ' ' && altLoc !== 'A' && altLoc !== '1') continue;

                const resName = line.slice(17, 20).trim().toUpperCase();
                const chain = (line[21] || 'A').trim() || 'A';

                const resSeq = parseInt(line.slice(22, 26).trim(), 10);
                const x = parseFloat(line.slice(30, 38));
                const y = parseFloat(line.slice(38, 46));
                const z = parseFloat(line.slice(46, 54));
                if (isNaN(resSeq) || isNaN(x) || isNaN(y) || isNaN(z)) continue;

                if (!chainsMap.has(chain)) chainsMap.set(chain, { map: new Map(), order: [] });
                const cObj = chainsMap.get(chain);
                const key = `${chain}:${resSeq}`;
                if (!cObj.map.has(key)) {
                    const entry = { chain, resSeq, resName, atoms: {} };
                    cObj.map.set(key, entry);
                    cObj.order.push(entry);
                }
                const entry = cObj.map.get(key);
                if (!entry.atoms[atomName]) {
                    entry.atoms[atomName] = { x, y, z };
                }
            }

            const validChains = [];
            chainsMap.forEach((cObj, ch) => {
                const valid = cObj.order.filter(r => r.atoms.N && r.atoms.CA && r.atoms.C);
                if (valid.length >= 3) validChains.push({ chain: ch, validRes: valid });
            });
            if (validChains.length === 0) return null;

            const chosen = (preferredChain && validChains.find(c => c.chain === preferredChain)) || validChains[0];
            const validRes = chosen.validRes;
            const firstChain = chosen.chain;

            // Compute centroid to center 3D coordinates
            let cx = 0, cy = 0, cz = 0;
            validRes.forEach(r => { cx += r.atoms.CA.x; cy += r.atoms.CA.y; cz += r.atoms.CA.z; });
            cx /= validRes.length; cy /= validRes.length; cz /= validRes.length;

            const residues = validRes.map((r, idx) => {
                const prev = idx > 0 ? validRes[idx - 1] : null;
                const next = idx < validRes.length - 1 ? validRes[idx + 1] : null;

                // Ensure peptide bond connectivity (< 2.2 Å between C_prev and N_curr)
                const connectedPrev = prev && Math.hypot(
                    prev.atoms.C.x - r.atoms.N.x,
                    prev.atoms.C.y - r.atoms.N.y,
                    prev.atoms.C.z - r.atoms.N.z
                ) < 2.2;
                const connectedNext = next && Math.hypot(
                    r.atoms.C.x - next.atoms.N.x,
                    r.atoms.C.y - next.atoms.N.y,
                    r.atoms.C.z - next.atoms.N.z
                ) < 2.2;

                const phi = connectedPrev ? calcDihedralDeg(prev.atoms.C, r.atoms.N, r.atoms.CA, r.atoms.C) : null;
                const psi = connectedNext ? calcDihedralDeg(r.atoms.N, r.atoms.CA, r.atoms.C, next.atoms.N) : null;
                const omega = connectedPrev ? calcDihedralDeg(prev.atoms.CA, prev.atoms.C, r.atoms.N, r.atoms.CA) : 180;

                const aaClass = ramaClassForResidue(r.resName, connectedNext ? next.resName : null);
                let status = 'terminal';
                if (phi !== null && psi !== null) {
                    const density = computeDensity(phi, psi, aaClass);
                    const tFav = getFavoredThreshold(aaClass);
                    const tAll = 0.11;
                    status = density >= tFav ? 'favored' : (density >= tAll ? 'allowed' : 'outlier');
                }

                const shift = (p) => p ? { x: p.x - cx, y: p.y - cy, z: p.z - cz } : null;
                return {
                    chain: r.chain,
                    resSeq: r.resSeq,
                    resName: r.resName,
                    aaClass,
                    phi,
                    psi,
                    omega: omega !== null ? Math.abs(omega) : 180,
                    status,
                    ca: shift(r.atoms.CA),
                    n: shift(r.atoms.N),
                    c: shift(r.atoms.C),
                    o: shift(r.atoms.O)
                };
            });

            return {
                name: fileName,
                chain: firstChain,
                chains: validChains.map(c => c.chain),
                rawText: text,
                residues,
                selectedIdx: -1
            };
        }

        function selectPDBResidue(idx, focusCam = false) {
            if (!pdbData || idx < 0 || idx >= pdbData.residues.length) return;
            pdbData.selectedIdx = idx;
            const r = pdbData.residues[idx];

            if (r.phi !== null && r.psi !== null) {
                currentPhi = r.phi;
                currentPsi = r.psi;
                phiSlider.value = r.phi;
                psiSlider.value = r.psi;
                phiVal.textContent = `${r.phi}°`;
                psiVal.textContent = `${r.psi}°`;
            }
            if (r.omega !== null) {
                currentOmega = Math.min(180, Math.max(0, r.omega));
                omegaSlider.value = currentOmega;
                omegaVal.textContent = `${currentOmega}°`;
            }
            currentResidue = r.aaClass === 'prepro' ? 'PREPRO' : normalizeResidueKey(r.resName);
            currentAA = r.aaClass;
            aaSelect.value = currentResidue;
            renderAAInfoCard(currentResidue);

            const en = isEN();
            const statusMap = en ? {
                favored: { cls: 'safe', icon: '✅', label: 'Favored Core' },
                allowed: { cls: 'allowed', icon: '⚠️', label: 'Allowed Region' },
                outlier: { cls: 'clash', icon: '⛔', label: 'Steric Outlier!' },
                terminal: { cls: 'safe', icon: '🔹', label: 'Chain Terminus (N/C)' }
            } : {
                favored: { cls: 'safe', icon: '✅', label: 'Favored 核心安全區' },
                allowed: { cls: 'allowed', icon: '⚠️', label: 'Allowed 額外容許區' },
                outlier: { cls: 'clash', icon: '⛔', label: 'Outlier 立體阻礙異常點！' },
                terminal: { cls: 'safe', icon: '🔹', label: '鏈端殘基 (N/C-terminus)' }
            };
            const st = statusMap[r.status] || statusMap.terminal;
            statusPanel.className = `status-panel ${st.cls}`;
            statusTitle.textContent = `${st.icon} ${r.resName} ${r.resSeq} (Chain ${r.chain}) — ${st.label}`;
            statusDesc.textContent = r.phi !== null && r.psi !== null
                ? (en
                    ? `Measured backbone torsions: φ = ${r.phi}°, ψ = ${r.psi}°, |ω| = ${r.omega}°. Tap other plot dots or Outlier chips below to inspect.`
                    : `實測主鏈二面角：φ = ${r.phi}°, ψ = ${r.psi}°, |ω| = ${r.omega}°。點擊拉氏圖上其他圓點或下方 Outlier 標籤可切換檢視。`)
                : (en
                    ? 'Terminal residue at the N- or C-terminus with only one backbone dihedral angle.'
                    : '此殘基位於多肽鏈起點或終點，僅具單側二面角。');

            document.querySelectorAll('.pdb-chip').forEach(ch => {
                ch.classList.toggle('selected', parseInt(ch.dataset.idx, 10) === idx);
            });

            drawRamachandranPlot(currentPhi, currentPsi, currentAA);
            if (selectPDBResidue3DFn) selectPDBResidue3DFn(idx, focusCam);
        }

        function loadPDBContent(text, fileName, preferredChain = null) {
            const parsed = parsePDBText(text, fileName, preferredChain);
            if (!parsed) {
                threeCaption.innerHTML = '⚠️ <strong>PDB 解析失敗：</strong>未偵測到足夠的蛋白質主鏈 ATOM (N, CA, C) 紀錄，請確認檔案格式。';
                return;
            }
            pdbData = parsed;
            pdbChainSelect.innerHTML = parsed.chains.map(ch =>
                `<option value="${ch}" ${ch === parsed.chain ? 'selected' : ''}>Chain ${ch}</option>`
            ).join('');
            pdbChainSelect.disabled = parsed.chains.length <= 1;

            const scored = parsed.residues.filter(r => r.phi !== null && r.psi !== null);
            const favCnt = scored.filter(r => r.status === 'favored').length;
            const allCnt = scored.filter(r => r.status === 'allowed').length;
            const outliers = parsed.residues
                .map((r, i) => ({ r, i }))
                .filter(x => x.r.status === 'outlier');

            const denom = Math.max(1, scored.length);
            pdbFileNameEl.textContent = `📄 ${parsed.name}（Chain ${parsed.chain} · ${parsed.residues.length} 殘基）`;
            pdbFavPctEl.textContent = `${Math.round((favCnt / denom) * 100)}%`;
            pdbAllPctEl.textContent = `${Math.round((allCnt / denom) * 100)}%`;
            pdbOutCntEl.textContent = `${outliers.length}`;

            if (outliers.length > 0) {
                pdbOutlierListEl.innerHTML = `<span style="width:100%; color:var(--apple-red-dark); font-weight:600; font-size:0.73rem;">點擊聚焦定位 Outlier 異常殘基：</span>` +
                    outliers.map(({ r, i }) => `<button class="pdb-chip" data-idx="${i}">${r.resName} ${r.resSeq} (${r.phi}°, ${r.psi}°)</button>`).join('');
                pdbOutlierListEl.querySelectorAll('.pdb-chip').forEach(btn => {
                    btn.addEventListener('click', () => selectPDBResidue(parseInt(btn.dataset.idx, 10), true));
                });
            } else {
                pdbOutlierListEl.innerHTML = `<span style="color:var(--apple-green-dark); font-weight:600; font-size:0.74rem;">✨ 完美結構：零 Outliers！</span>`;
            }

            pdbSummaryBox.style.display = 'block';
            clearPdbBtn.style.display = 'inline-block';
            if (plotMode === 'simple') setPlotMode('pro');
            newmanAxisMode = null;
            updateNewmanClock();

            threeHint.innerHTML = `<strong>真實 PDB 解析模式：</strong>已載入 <strong>${parsed.name}</strong>（綠色＝Favored、橘色＝Allowed、紅色＝Outlier），點擊拉氏圖上的圓點可即時 3D 定位！`;
            distanceHud.className = outliers.length > 0 ? 'distance-hud danger' : 'distance-hud';
            distanceHud.textContent = `🧬 PDB: ${parsed.name} · ${parsed.residues.length} aa · ${outliers.length} Outliers`;
            threeCaption.innerHTML = `🔬 <strong>PDB 實測解析完成：</strong>共分析 ${scored.length} 個內部殘基，Favored ${Math.round((favCnt / denom) * 100)}%、Outliers ${outliers.length} 個。可直接點擊拉氏圖圓點或匯出 CSV。`;

            if (renderPDB3DFn) renderPDB3DFn(parsed);

            const firstTarget = outliers.length > 0 ? outliers[0].i : Math.min(1, parsed.residues.length - 1);
            selectPDBResidue(firstTarget, false);
            showAppleToast(`🧬 已載入 ${parsed.name}（Chain ${parsed.chain} · ${parsed.residues.length} aa）`);
        }

        function clearPDBMode() {
            if (!pdbData) return;
            pdbData = null;
            pdbSummaryBox.style.display = 'none';
            clearPdbBtn.style.display = 'none';
            pdbFileInput.value = '';
            if (clearPDB3DFn) clearPDB3DFn();
            threeCaption.innerHTML = STEPS_DATA[currentStepIdx].caption;
            setViewMode(viewMode);
            updateAll();
        }

        function handlePDBFile(file) {
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => loadPDBContent(String(ev.target.result || ''), file.name);
            reader.readAsText(file);
        }

        pdbDropzone.addEventListener('click', () => pdbFileInput.click());
        pdbFileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) handlePDBFile(e.target.files[0]);
        });
        [pdbDropzone, ramaCanvas, threeContainer].forEach(target => {
            target.addEventListener('dragover', (e) => {
                e.preventDefault();
                pdbDropzone.classList.add('dragover');
            });
            target.addEventListener('dragleave', () => pdbDropzone.classList.remove('dragover'));
            target.addEventListener('drop', (e) => {
                e.preventDefault();
                pdbDropzone.classList.remove('dragover');
                if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handlePDBFile(e.dataTransfer.files[0]);
                }
            });
        });

        loadDemoPdbBtn.addEventListener('click', () => {
            if (buildDemoPDBTextFn) {
                const demoText = buildDemoPDBTextFn();
                loadPDBContent(demoText, '1L2Y_TrpCage_Demo.pdb');
            }
        });
        clearPdbBtn.addEventListener('click', clearPDBMode);

        pdbChainSelect.addEventListener('change', (e) => {
            if (pdbData && pdbData.rawText) {
                loadPDBContent(pdbData.rawText, pdbData.name, e.target.value);
            }
        });

        exportPdbCsvBtn.addEventListener('click', () => {
            if (!pdbData || !pdbData.residues.length) return;
            const rows = ['Chain,ResSeq,ResName,AA_Class,Phi_deg,Psi_deg,Omega_deg,Status'];
            pdbData.residues.forEach(r => {
                rows.push(`${r.chain},${r.resSeq},${r.resName},${r.aaClass},${r.phi ?? ''},${r.psi ?? ''},${r.omega ?? ''},${r.status}`);
            });
            const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            downloadDataURL(url, `${pdbData.name.replace(/\.pdb$/i, '')}_chain${pdbData.chain}_angles.csv`);
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            showAppleToast('📥 已匯出殘基二面角 CSV 表格');
        });

        async function fetchRCSB(rawId) {
            const id = (rawId || '').trim().toUpperCase();
            if (!/^[A-Z0-9]{4}$/.test(id)) {
                showAppleToast('⚠️ 請輸入 4 碼 PDB ID（例如 1CRN 或 1UBQ）');
                return;
            }
            rcsbFetchBtn.disabled = true;
            rcsbFetchBtn.textContent = '載入中...';
            try {
                const res = await fetch(`https://files.rcsb.org/download/${id}.pdb`);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const text = await res.text();
                loadPDBContent(text, `${id}.pdb`);
            } catch (err) {
                showAppleToast(`❌ 無法從 RCSB 下載 ${id}（請確認網路或 ID）`);
            } finally {
                rcsbFetchBtn.disabled = false;
                rcsbFetchBtn.textContent = '☁️ 線上載入';
            }
        }
        rcsbFetchBtn.addEventListener('click', () => fetchRCSB(rcsbInput.value));
        rcsbInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') fetchRCSB(rcsbInput.value);
        });

