'use strict';
// 8. 繪製拉氏圖
// 注意：所有 js/ 檔案共用同一個全域範圍，必須依 index.html 中的順序載入。

        // ==========================================
        // 8. 繪製高清拉氏圖 (Apple Precision Chart)
        // ==========================================
        function drawRamachandranPlot(phi, psi, aaType) {
            const w = LOGICAL_SIZE;
            const h = LOGICAL_SIZE;
            const pad = 44;
            const plotW = w - pad * 2;
            const plotH = h - pad * 2;

            rCtx.clearRect(0, 0, w, h);

            const toX = (deg) => pad + ((deg + 180) / 360) * plotW;
            const toY = (deg) => pad + ((180 - deg) / 360) * plotH;

            // Plot background
            rCtx.fillStyle = '#ffffff';
            rCtx.fillRect(pad, pad, plotW, plotH);

            if (plotMode === 'pro') {
                if (!contourCache[aaType]) {
                    putCanvasCache(contourCache, aaType, generateContourCache(aaType, plotW, plotH));
                }
                rCtx.drawImage(contourCache[aaType], pad, pad, plotW, plotH);
            } else if (plotMode === 'energy') {
                if (!energyCache[aaType]) {
                    putCanvasCache(energyCache, aaType, generateEnergyCache(aaType, plotW, plotH));
                }
                rCtx.drawImage(energyCache[aaType], pad, pad, plotW, plotH);
            } else {
                if (aaType === 'glycine') {
                    rCtx.fillStyle = 'rgba(52, 199, 89, 0.16)';
                    rCtx.fillRect(pad, pad, plotW, plotH);
                    rCtx.fillStyle = '#ffffff';
                    rCtx.fillRect(toX(-25), toY(25), (50 / 360) * plotW, (50 / 360) * plotH);
                } else if (aaType === 'proline') {
                    rCtx.fillStyle = 'rgba(52, 199, 89, 0.14)';
                    rCtx.fillRect(toX(-85), pad, (50 / 360) * plotW, plotH);
                    rCtx.fillStyle = 'rgba(52, 199, 89, 0.34)';
                    rCtx.fillRect(toX(-85), toY(0), (50 / 360) * plotW, (60 / 360) * plotH);
                    rCtx.fillRect(toX(-85), toY(170), (50 / 360) * plotW, (60 / 360) * plotH);
                } else if (aaType === 'ileval') {
                    rCtx.fillStyle = 'rgba(52, 199, 89, 0.14)';
                    rCtx.fillRect(toX(-175), toY(178), (115 / 360) * plotW, (105 / 360) * plotH);
                    rCtx.fillStyle = 'rgba(52, 199, 89, 0.34)';
                    rCtx.fillRect(toX(-160), toY(165), (85 / 360) * plotW, (75 / 360) * plotH);
                    rCtx.fillStyle = 'rgba(0, 113, 227, 0.24)';
                    rCtx.fillRect(toX(-82), toY(-22), (42 / 360) * plotW, (38 / 360) * plotH);
                } else if (aaType === 'prepro') {
                    rCtx.fillStyle = 'rgba(52, 199, 89, 0.14)';
                    rCtx.fillRect(toX(-175), toY(178), (120 / 360) * plotW, (135 / 360) * plotH);
                    rCtx.fillStyle = 'rgba(52, 199, 89, 0.30)';
                    rCtx.fillRect(toX(-160), toY(168), (100 / 360) * plotW, (60 / 360) * plotH);
                    rCtx.fillStyle = 'rgba(0, 113, 227, 0.20)';
                    rCtx.fillRect(toX(-160), toY(98), (60 / 360) * plotW, (48 / 360) * plotH);
                    rCtx.fillRect(toX(-82), toY(-22), (44 / 360) * plotW, (40 / 360) * plotH);
                } else {
                    rCtx.fillStyle = 'rgba(52, 199, 89, 0.12)';
                    rCtx.fillRect(toX(-175), toY(180), (120 / 360) * plotW, (120 / 360) * plotH);
                    rCtx.fillRect(toX(-130), toY(20), (100 / 360) * plotW, (100 / 360) * plotH);
                    rCtx.fillStyle = 'rgba(52, 199, 89, 0.30)';
                    rCtx.fillRect(toX(-165), toY(175), (90 / 360) * plotW, (80 / 360) * plotH);
                    rCtx.fillStyle = 'rgba(0, 113, 227, 0.24)';
                    rCtx.fillRect(toX(-95), toY(-15), (60 / 360) * plotW, (50 / 360) * plotH);
                    rCtx.fillStyle = 'rgba(175, 82, 222, 0.24)';
                    rCtx.fillRect(toX(35), toY(65), (40 / 360) * plotW, (45 / 360) * plotH);
                }
            }

            // Subtle Apple gridlines
            rCtx.strokeStyle = 'rgba(142, 142, 147, 0.22)';
            rCtx.lineWidth = 1;
            [-120, -60, 60, 120].forEach(deg => {
                rCtx.beginPath();
                rCtx.moveTo(toX(deg), pad);
                rCtx.lineTo(toX(deg), pad + plotH);
                rCtx.moveTo(pad, toY(deg));
                rCtx.lineTo(pad + plotW, toY(deg));
                rCtx.stroke();
            });

            // Origin axes
            rCtx.strokeStyle = 'rgba(29, 29, 31, 0.28)';
            rCtx.lineWidth = 1.1;
            rCtx.beginPath();
            rCtx.moveTo(toX(0), pad);
            rCtx.lineTo(toX(0), pad + plotH);
            rCtx.moveTo(pad, toY(0));
            rCtx.lineTo(pad + plotW, toY(0));
            rCtx.stroke();

            // Outer frame
            rCtx.strokeStyle = 'rgba(29, 29, 31, 0.22)';
            rCtx.lineWidth = 1.2;
            rCtx.strokeRect(pad, pad, plotW, plotH);

            // Ticks
            const isDarkTheme = document.body.classList.contains('theme-dark');
            rCtx.fillStyle = isDarkTheme ? '#a1a1a6' : '#6e6e73';
            rCtx.font = '500 10.5px -apple-system, BlinkMacSystemFont, sans-serif';
            rCtx.textAlign = 'center';
            [-180, -120, -60, 0, 60, 120, 180].forEach(deg => {
                rCtx.fillText(deg + '°', toX(deg), h - 20);
                rCtx.fillText(deg + '°', 22, toY(deg) + 3.5);
            });

            // Axis titles
            rCtx.font = '600 12px -apple-system, BlinkMacSystemFont, "PingFang TC", "Noto Sans TC", sans-serif';
            rCtx.fillStyle = isDarkTheme ? '#f5f5f7' : '#1d1d1f';
            rCtx.fillText('φ (Phi) 角度', w / 2, h - 4);

            rCtx.save();
            rCtx.translate(11, h / 2);
            rCtx.rotate(-Math.PI / 2);
            rCtx.fillText('ψ (Psi) 角度', 0, 0);
            rCtx.restore();

            // Quest target bullseye (clamped inside plot)
            if (questTarget) {
                const tx = toX(questTarget.phi);
                const ty = toY(questTarget.psi);
                rCtx.strokeStyle = '#af52de';
                rCtx.lineWidth = 2.2;
                rCtx.setLineDash([4, 3]);
                rCtx.beginPath();
                rCtx.arc(tx, ty, 16, 0, Math.PI * 2);
                rCtx.stroke();
                rCtx.setLineDash([]);

                rCtx.fillStyle = 'rgba(175, 82, 222, 0.16)';
                rCtx.fill();

                const qText = `🎯 ${questTarget.name}`;
                rCtx.font = '600 11px -apple-system, "PingFang TC", sans-serif';
                const qW = rCtx.measureText(qText).width;
                const qX = (tx + 20 + qW > pad + plotW) ? tx - qW - 20 : tx + 20;
                rCtx.textAlign = 'left';
                drawCrispLabel(ctxFallback(rCtx), qText, qX, ty + 4, '#6e2b91');
            }

            // P2: If PDB is loaded, render all parsed residues as interactive scatter dots
            if (pdbData && pdbData.residues.length > 0) {
                const isDensePDB = pdbData.residues.length > 80;
                pdbData.residues.forEach((r, idx) => {
                    if (r.phi === null || r.psi === null) return;
                    const rx = toX(r.phi);
                    const ry = toY(r.psi);
                    const isSel = idx === pdbData.selectedIdx;
                    const color = r.status === 'favored'
                        ? (isDensePDB ? 'rgba(52, 199, 89, 0.72)' : '#34c759')
                        : (r.status === 'allowed' ? '#ff9500' : '#ff3b30');

                    if (isSel) {
                        rCtx.beginPath();
                        rCtx.arc(rx, ry, 11, 0, Math.PI * 2);
                        rCtx.fillStyle = 'rgba(0, 113, 227, 0.22)';
                        rCtx.fill();
                        rCtx.strokeStyle = '#0071e3';
                        rCtx.lineWidth = 2;
                        rCtx.stroke();
                    }

                    rCtx.beginPath();
                    const dotR = isSel ? 5.5 : (r.status === 'outlier' ? 4.8 : (isDensePDB ? 3.0 : 4.0));
                    rCtx.arc(rx, ry, dotR, 0, Math.PI * 2);
                    rCtx.fillStyle = color;
                    rCtx.fill();
                    rCtx.strokeStyle = '#ffffff';
                    rCtx.lineWidth = isSel ? 2 : (isDensePDB ? 0.9 : 1.3);
                    rCtx.stroke();
                });

                if (pdbData.selectedIdx >= 0) {
                    const sel = pdbData.residues[pdbData.selectedIdx];
                    if (sel && sel.phi !== null && sel.psi !== null) {
                        const sx = toX(sel.phi);
                        const sy = toY(sel.psi);
                        const tag = `${sel.resName}${sel.resSeq} (${sel.phi}°, ${sel.psi}°)`;
                        rCtx.font = '600 10.5px "SF Mono", ui-monospace, monospace';
                        const tw = rCtx.measureText(tag).width;
                        const pw = tw + 14, ph = 21;
                        let px = sel.phi > 50 ? sx - pw - 10 : sx + 10;
                        let py = sel.psi > 140 ? sy + 10 : sy - ph - 10;
                        px = Math.max(pad + 4, Math.min(pad + plotW - pw - 4, px));
                        py = Math.max(pad + 4, Math.min(pad + plotH - ph - 4, py));

                        rCtx.save();
                        rCtx.shadowColor = 'rgba(0,0,0,0.16)';
                        rCtx.shadowBlur = 8;
                        rCtx.fillStyle = 'rgba(255,255,255,0.95)';
                        rCtx.beginPath();
                        rCtx.roundRect(px, py, pw, ph, 999);
                        rCtx.fill();
                        rCtx.restore();

                        rCtx.strokeStyle = sel.status === 'outlier' ? 'rgba(255,59,48,0.5)' : 'rgba(0,113,227,0.4)';
                        rCtx.lineWidth = 1;
                        rCtx.beginPath();
                        rCtx.roundRect(px, py, pw, ph, 999);
                        rCtx.stroke();

                        rCtx.fillStyle = sel.status === 'outlier' ? '#d70015' : '#0051a8';
                        rCtx.textAlign = 'center';
                        rCtx.textBaseline = 'middle';
                        rCtx.fillText(tag, px + pw / 2, py + ph / 2 + 0.5);
                        rCtx.textBaseline = 'alphabetic';
                    }
                }
                return;
            }

            // Current angle crosshair & glowing Apple red marker
            const curX = toX(phi);
            const curY = toY(psi);

            rCtx.strokeStyle = 'rgba(255, 59, 48, 0.42)';
            rCtx.lineWidth = 1;
            rCtx.setLineDash([4, 4]);
            rCtx.beginPath();
            rCtx.moveTo(curX, pad);
            rCtx.lineTo(curX, pad + plotH);
            rCtx.moveTo(pad, curY);
            rCtx.lineTo(pad + plotW, curY);
            rCtx.stroke();
            rCtx.setLineDash([]);

            // Outer soft halo
            rCtx.beginPath();
            rCtx.arc(curX, curY, 12, 0, Math.PI * 2);
            rCtx.fillStyle = 'rgba(255, 59, 48, 0.18)';
            rCtx.fill();

            // Crisp dot
            rCtx.beginPath();
            rCtx.arc(curX, curY, 6.5, 0, Math.PI * 2);
            rCtx.fillStyle = '#ff3b30';
            rCtx.fill();
            rCtx.strokeStyle = '#ffffff';
            rCtx.lineWidth = 2.2;
            rCtx.stroke();

            // Rounded coordinate pill
            const coordText = `(${phi}°, ${psi}°)`;
            rCtx.font = '600 11px "SF Mono", ui-monospace, SFMono-Regular, Menlo, monospace';
            const textW = rCtx.measureText(coordText).width;
            const pillW = textW + 14;
            const pillH = 22;
            let pillX = phi > 75 ? curX - pillW - 12 : curX + 12;
            let pillY = psi > 145 ? curY + 10 : curY - pillH - 10;
            pillX = Math.max(pad + 4, Math.min(pad + plotW - pillW - 4, pillX));
            pillY = Math.max(pad + 4, Math.min(pad + plotH - pillH - 4, pillY));

            rCtx.save();
            rCtx.shadowColor = 'rgba(0, 0, 0, 0.14)';
            rCtx.shadowBlur = 8;
            rCtx.shadowOffsetY = 2;
            rCtx.fillStyle = 'rgba(255, 255, 255, 0.94)';
            rCtx.beginPath();
            rCtx.roundRect(pillX, pillY, pillW, pillH, 999);
            rCtx.fill();
            rCtx.restore();

            rCtx.strokeStyle = 'rgba(255, 59, 48, 0.35)';
            rCtx.lineWidth = 1;
            rCtx.beginPath();
            rCtx.roundRect(pillX, pillY, pillW, pillH, 999);
            rCtx.stroke();

            rCtx.fillStyle = '#d70015';
            rCtx.textAlign = 'center';
            rCtx.textBaseline = 'middle';
            rCtx.fillText(coordText, pillX + pillW / 2, pillY + pillH / 2 + 0.5);
            rCtx.textBaseline = 'alphabetic';
        }

        function ctxFallback(c) { return c; }

