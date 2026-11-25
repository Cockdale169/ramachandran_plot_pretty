'use strict';
// 4-5. 高 DPI 畫布、高斯密度模型、能量/等高線快取
// 注意：所有 js/ 檔案共用同一個全域範圍，必須依 index.html 中的順序載入。

        // ==========================================
        // 4. 高 DPI (4K/Retina) 高清畫布初始化
        // ==========================================
        const LOGICAL_SIZE = 460;
        const DPR = Math.min(window.devicePixelRatio || 1, 2);

        function setupHighDPICanvas() {
            ramaCanvas.width = LOGICAL_SIZE * DPR;
            ramaCanvas.height = LOGICAL_SIZE * DPR;
            rCtx.setTransform(DPR, 0, 0, DPR, 0, 0);
        }
        setupHighDPICanvas();

        // ==========================================
        // 5. 高斯核密度等高線場運算 (Apple Oceanic Palette)
        // ==========================================
        function wrapDiff(a, b) {
            let d = a - b;
            while (d > 180) d -= 360;
            while (d < -180) d += 360;
            return d;
        }

        function evalGaussian2D(phi, psi, muPhi, muPsi, sigPhi, sigPsi, rho, weight) {
            const dx = wrapDiff(phi, muPhi) / sigPhi;
            const dy = wrapDiff(psi, muPsi) / sigPsi;
            const z = (dx * dx - 2 * rho * dx * dy + dy * dy) / (2 * (1 - rho * rho));
            return weight * Math.exp(-z);
        }

        const KDE_MODELS = {
            general: [
                { muPhi: -62, muPsi: -43, sigPhi: 14, sigPsi: 14, rho: -0.35, w: 1.00 },
                { muPhi: -75, muPsi: -12, sigPhi: 22, sigPsi: 18, rho: -0.25, w: 0.42 },
                { muPhi: -138, muPsi: 138, sigPhi: 20, sigPsi: 22, rho: -0.30, w: 0.85 },
                { muPhi: -116, muPsi: 118, sigPhi: 18, sigPsi: 18, rho: -0.20, w: 0.72 },
                { muPhi: -72, muPsi: 145, sigPhi: 15, sigPsi: 20, rho: -0.15, w: 0.78 },
                { muPhi: -125, muPsi: 78, sigPhi: 24, sigPsi: 22, rho: 0.10, w: 0.28 },
                { muPhi: 57, muPsi: 44, sigPhi: 13, sigPsi: 15, rho: -0.20, w: 0.58 },
                { muPhi: 75, muPsi: -60, sigPhi: 14, sigPsi: 16, rho: 0.0, w: 0.22 }
            ],
            glycine: [
                { muPhi: -65, muPsi: -40, sigPhi: 22, sigPsi: 22, rho: -0.2, w: 0.85 },
                { muPhi: 68, muPsi: 35, sigPhi: 24, sigPsi: 24, rho: -0.2, w: 0.90 },
                { muPhi: -155, muPsi: 160, sigPhi: 30, sigPsi: 28, rho: -0.1, w: 0.80 },
                { muPhi: -85, muPsi: 155, sigPhi: 24, sigPsi: 24, rho: -0.1, w: 0.65 },
                { muPhi: 155, muPsi: -160, sigPhi: 30, sigPsi: 28, rho: -0.1, w: 0.75 },
                { muPhi: 90, muPsi: -155, sigPhi: 24, sigPsi: 24, rho: -0.1, w: 0.60 },
                { muPhi: -80, muPsi: 5, sigPhi: 26, sigPsi: 18, rho: 0.0, w: 0.35 },
                { muPhi: 80, muPsi: -5, sigPhi: 26, sigPsi: 18, rho: 0.0, w: 0.35 }
            ],
            proline: [
                { muPhi: -62, muPsi: 145, sigPhi: 12, sigPsi: 22, rho: -0.1, w: 0.95 },
                { muPhi: -60, muPsi: -35, sigPhi: 11, sigPsi: 18, rho: -0.1, w: 0.90 },
                { muPhi: -62, muPsi: 50, sigPhi: 10, sigPsi: 35, rho: 0.0, w: 0.18 }
            ],
            ileval: [
                { muPhi: -120, muPsi: 126, sigPhi: 22, sigPsi: 22, rho: -0.25, w: 1.00 },
                { muPhi: -140, muPsi: 146, sigPhi: 18, sigPsi: 18, rho: -0.20, w: 0.78 },
                { muPhi: -63, muPsi: -42, sigPhi: 11, sigPsi: 12, rho: -0.35, w: 0.88 },
                { muPhi: -84, muPsi: -12, sigPhi: 16, sigPsi: 14, rho: -0.20, w: 0.28 },
                { muPhi: -74, muPsi: 140, sigPhi: 12, sigPsi: 16, rho: -0.10, w: 0.36 },
                { muPhi: 56, muPsi: 42, sigPhi: 10, sigPsi: 12, rho: -0.15, w: 0.16 }
            ],
            prepro: [
                { muPhi: -126, muPsi: 138, sigPhi: 22, sigPsi: 22, rho: -0.25, w: 0.92 },
                { muPhi: -72, muPsi: 146, sigPhi: 16, sigPsi: 20, rho: -0.15, w: 0.90 },
                { muPhi: -135, muPsi: 75, sigPhi: 24, sigPsi: 22, rho: 0.15, w: 0.72 },
                { muPhi: -63, muPsi: -42, sigPhi: 12, sigPsi: 13, rho: -0.30, w: 0.72 },
                { muPhi: -85, muPsi: -8, sigPhi: 18, sigPsi: 16, rho: -0.20, w: 0.25 }
            ]
        };

        function getFavoredThreshold(aaType) {
            if (aaType === 'proline') return 0.36;
            if (aaType === 'ileval' || aaType === 'prepro') return 0.35;
            return 0.34;
        }

        function computeDensity(phi, psi, aaType) {
            const peaks = KDE_MODELS[aaType] || KDE_MODELS.general;
            let sum = 0;
            for (let i = 0; i < peaks.length; i++) {
                const p = peaks[i];
                sum += evalGaussian2D(phi, psi, p.muPhi, p.muPsi, p.sigPhi, p.sigPsi, p.rho, p.w);
            }
            return sum;
        }

        const contourCache = {};
        const energyCache = {};
        const MAX_CANVAS_CACHE = 5;

        function putCanvasCache(cacheObj, key, canvas) {
            const keys = Object.keys(cacheObj);
            if (!cacheObj[key] && keys.length >= MAX_CANVAS_CACHE) {
                const oldestKey = keys[0];
                const oldCanvas = cacheObj[oldestKey];
                if (oldCanvas) {
                    oldCanvas.width = 0;
                    oldCanvas.height = 0;
                }
                delete cacheObj[oldestKey];
            }
            cacheObj[key] = canvas;
        }

        function clearContourCache() {
            Object.keys(contourCache).forEach(k => {
                if (contourCache[k]) {
                    contourCache[k].width = 0;
                    contourCache[k].height = 0;
                }
                delete contourCache[k];
            });
        }

        function generateEnergyCache(aaType, logicalW, logicalH) {
            const physW = Math.round(logicalW * DPR);
            const physH = Math.round(logicalH * DPR);
            const offCanvas = document.createElement('canvas');
            offCanvas.width = physW;
            offCanvas.height = physH;
            const ctx = offCanvas.getContext('2d');
            const imgData = ctx.createImageData(physW, physH);
            const data = imgData.data;

            // E(phi, psi) = -kT * ln(P), kT ~ 0.596 kcal/mol at 300K, normalized [0..4.5 kcal/mol]
            const kT = 0.596;
            const maxE = 4.2;
            const stops = [
                [0.00, 18, 22, 78],     // Deep low-energy well (0 kcal/mol)
                [0.22, 0, 113, 227],    // Apple Blue
                [0.45, 34, 184, 178],   // Teal
                [0.68, 250, 198, 60],   // Warm Amber
                [0.86, 255, 118, 87],   // Coral
                [1.00, 250, 250, 252]   // High-energy barrier
            ];

            for (let py = 0; py < physH; py++) {
                const psi = 180 - (py / physH) * 360;
                for (let px = 0; px < physW; px++) {
                    const phi = (px / physW) * 360 - 180;
                    const p = Math.max(computeDensity(phi, psi, aaType), 0.0008);
                    const E = Math.min(maxE, Math.max(0, -kT * Math.log(p)));
                    const t = E / maxE;

                    // Interpolate thermal palette
                    let r = 250, g = 250, b = 252;
                    for (let s = 0; s < stops.length - 1; s++) {
                        if (t >= stops[s][0] && t <= stops[s + 1][0]) {
                            const f = (t - stops[s][0]) / (stops[s + 1][0] - stops[s][0]);
                            r = Math.round(stops[s][1] + (stops[s + 1][1] - stops[s][1]) * f);
                            g = Math.round(stops[s][2] + (stops[s + 1][2] - stops[s][2]) * f);
                            b = Math.round(stops[s][3] + (stops[s + 1][3] - stops[s][3]) * f);
                            break;
                        }
                    }

                    // Subtle iso-energy contour lines every 0.8 kcal/mol
                    const iso = (E % 0.8);
                    if (E < 3.6 && iso < 0.045) {
                        r = Math.min(255, r + 35);
                        g = Math.min(255, g + 35);
                        b = Math.min(255, b + 35);
                    }

                    const idx = (py * physW + px) * 4;
                    data[idx] = r; data[idx + 1] = g; data[idx + 2] = b; data[idx + 3] = 255;
                }
            }
            ctx.putImageData(imgData, 0, 0);
            return offCanvas;
        }

        function drawCrispLabel(ctx, text, x, y, fill = '#004080') {
            ctx.save();
            ctx.lineWidth = 3;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
            ctx.lineJoin = 'round';
            ctx.strokeText(text, x, y);
            ctx.fillStyle = fill;
            ctx.fillText(text, x, y);
            ctx.restore();
        }

        function generateContourCache(aaType, logicalW, logicalH) {
            const physW = Math.round(logicalW * DPR);
            const physH = Math.round(logicalH * DPR);
            const offCanvas = document.createElement('canvas');
            offCanvas.width = physW;
            offCanvas.height = physH;
            const ctx = offCanvas.getContext('2d');
            const imgData = ctx.createImageData(physW, physH);
            const data = imgData.data;

            const tFavored = getFavoredThreshold(aaType);
            const tAllowed = 0.11;

            const grid = new Float32Array(physW * physH);
            for (let py = 0; py < physH; py++) {
                const psi = 180 - (py / physH) * 360;
                for (let px = 0; px < physW; px++) {
                    const phi = (px / physW) * 360 - 180;
                    grid[py * physW + px] = computeDensity(phi, psi, aaType);
                }
            }

            const strokeStep = Math.max(1, Math.round(DPR));
            for (let py = 0; py < physH; py++) {
                for (let px = 0; px < physW; px++) {
                    const idx = py * physW + px;
                    const val = grid[idx];
                    const rightVal = px < physW - strokeStep ? grid[idx + strokeStep] : val;
                    const downVal = py < physH - strokeStep ? grid[idx + physW * strokeStep] : val;

                    const crossFavored = (val >= tFavored) !== (rightVal >= tFavored) || (val >= tFavored) !== (downVal >= tFavored);
                    const crossAllowed = (val >= tAllowed) !== (rightVal >= tAllowed) || (val >= tAllowed) !== (downVal >= tAllowed);

                    const pIdx = idx * 4;
                    if (crossFavored) {
                        // Apple Blue crisp contour
                        data[pIdx] = 0; data[pIdx + 1] = 113; data[pIdx + 2] = 227; data[pIdx + 3] = 255;
                    } else if (crossAllowed) {
                        data[pIdx] = 90; data[pIdx + 1] = 180; data[pIdx + 2] = 248; data[pIdx + 3] = 215;
                    } else if (val >= tFavored) {
                        // Subtle density shading inside favored core
                        const boost = Math.min(1, (val - tFavored) / 0.65);
                        data[pIdx] = Math.round(168 - boost * 42);
                        data[pIdx + 1] = Math.round(212 - boost * 32);
                        data[pIdx + 2] = 255;
                        data[pIdx + 3] = 242;
                    } else if (val >= tAllowed) {
                        data[pIdx] = 232; data[pIdx + 1] = 244; data[pIdx + 2] = 255; data[pIdx + 3] = 235;
                    } else {
                        data[pIdx] = 255; data[pIdx + 1] = 255; data[pIdx + 2] = 255; data[pIdx + 3] = 255;
                    }
                }
            }
            ctx.putImageData(imgData, 0, 0);

            ctx.save();
            ctx.scale(DPR, DPR);
            ctx.font = '600 10.5px -apple-system, BlinkMacSystemFont, "PingFang TC", "Noto Sans TC", sans-serif';
            ctx.textAlign = 'center';
            const toPX = (deg) => ((deg + 180) / 360) * logicalW;
            const toPY = (deg) => ((180 - deg) / 360) * logicalH;

            const en = isEN();
            if (aaType === 'general') {
                drawCrispLabel(ctx, en ? 'Antiparallel β' : '反平行 β', toPX(-144), toPY(156), '#004080');
                drawCrispLabel(ctx, en ? 'Parallel β' : '平行 β', toPX(-120), toPY(108), '#004080');
                drawCrispLabel(ctx, en ? 'PPII / Collagen' : 'PPII / 膠原', toPX(-66), toPY(156), '#004080');
                drawCrispLabel(ctx, en ? 'Right α' : '右手 α', toPX(-62), toPY(-46), '#004080');
                drawCrispLabel(ctx, '3₁₀', toPX(-84), toPY(-8), '#0055aa');
                drawCrispLabel(ctx, en ? 'Left α' : '左手 α', toPX(57), toPY(45), '#004080');
                ctx.font = '500 9.5px -apple-system, sans-serif';
                drawCrispLabel(ctx, 'γ-turn', toPX(75), toPY(-62), '#0071e3');
            } else if (aaType === 'glycine') {
                drawCrispLabel(ctx, en ? 'Right α' : '右手 α 區', toPX(-65), toPY(-40), '#004080');
                drawCrispLabel(ctx, en ? 'Left α' : '左手 α 區', toPX(68), toPY(35), '#004080');
                drawCrispLabel(ctx, 'β / PPII', toPX(-125), toPY(158), '#004080');
                drawCrispLabel(ctx, en ? 'Symmetric β' : '對稱延伸區', toPX(125), toPY(-158), '#004080');
            } else if (aaType === 'proline') {
                drawCrispLabel(ctx, en ? 'PPII / Collagen' : 'PPII / 膠原島', toPX(-62), toPY(145), '#004080');
                drawCrispLabel(ctx, en ? 'α-Helix' : 'α-螺旋島', toPX(-60), toPY(-35), '#004080');
                ctx.font = '500 10px -apple-system, sans-serif';
                drawCrispLabel(ctx, en ? 'φ locked near −60° by 5-ring' : 'φ 被五元環鎖定在 -60° 附近', toPX(52), toPY(0), '#6e6e73');
            } else if (aaType === 'ileval') {
                drawCrispLabel(ctx, en ? 'β-Sheet (Favored)' : 'β-摺疊主峰 (偏好)', toPX(-124), toPY(136), '#004080');
                drawCrispLabel(ctx, en ? 'Right α (Narrow)' : '右手 α (偏窄)', toPX(-63), toPY(-45), '#004080');
                ctx.font = '500 9.5px -apple-system, sans-serif';
                drawCrispLabel(ctx, en ? 'β-branch suppresses αL' : 'β-分支壓縮左手 α 區', toPX(68), toPY(42), '#6e6e73');
            } else if (aaType === 'prepro') {
                drawCrispLabel(ctx, 'β / PPII', toPX(-104), toPY(148), '#004080');
                drawCrispLabel(ctx, en ? 'ζ Region (Pre-Pro)' : 'ζ 區 (Pre-Pro 特有)', toPX(-126), toPY(75), '#0055aa');
                drawCrispLabel(ctx, en ? 'Right α (Smaller)' : '右手 α (縮小)', toPX(-63), toPY(-44), '#004080');
                ctx.font = '500 9.5px -apple-system, sans-serif';
                drawCrispLabel(ctx, en ? 'Left α nearly forbidden' : '左手 α 幾乎消失', toPX(68), toPY(42), '#6e6e73');
            }
            ctx.restore();
            return offCanvas;
        }

        function isCollagenRegion(phi, psi) {
            return (phi >= -92 && phi <= -48 && psi >= 122 && psi <= 168);
        }

