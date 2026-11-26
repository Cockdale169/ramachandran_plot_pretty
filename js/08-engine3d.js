'use strict';
// 11. Three.js 3D 引擎、NeRF 主鏈、標籤防重疊 (最後載入，負責啟動)
// 注意：所有 js/ 檔案共用同一個全域範圍，必須依 index.html 中的順序載入。

        // ==========================================
        // 11. Three.js Apple Pro Studio 雙引擎 + 無重疊標籤系統
        // ==========================================
        async function init3DEngine() {
            try {
                const THREE = await import('three');
                const isMobilePerf = (window.matchMedia && window.matchMedia('(pointer: coarse)').matches)
                    || Math.min(window.innerWidth, window.innerHeight) <= 680;
                const targetDPR = isMobilePerf ? 1 : Math.min(window.devicePixelRatio || 1, 1.5);

                const scene = new THREE.Scene();
                const width = threeContainer.clientWidth || 560;
                const height = threeContainer.clientHeight || 460;
                const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 320);
                camera.position.set(0, 2.8, 9.6);

                const renderer = new THREE.WebGLRenderer({
                    antialias: true,
                    alpha: true,
                    powerPreference: isMobilePerf ? 'default' : 'high-performance'
                });
                renderer.setSize(width, height);
                renderer.setPixelRatio(targetDPR);
                if (!isMobilePerf) {
                    renderer.toneMapping = THREE.ACESFilmicToneMapping;
                    renderer.toneMappingExposure = 1.15;
                }
                if (isMobilePerf) renderer.domElement.style.touchAction = 'none';
                threeContainer.appendChild(renderer.domElement);

                // Studio Environment Reflection (Desktop only; mobile uses lightweight Phong + 3-point studio lights for 60fps)
                if (!isMobilePerf) {
                    try {
                        const { RoomEnvironment } = await import('three/addons/environments/RoomEnvironment.js');
                        const pmremGenerator = new THREE.PMREMGenerator(renderer);
                        const envScene = new RoomEnvironment();
                        const envTexture = pmremGenerator.fromScene(envScene, 0.04).texture;
                        scene.environment = envTexture;
                        envScene.dispose();
                        pmremGenerator.dispose();
                    } catch (_) {
                        // Fallback gracefully if RoomEnvironment unavailable
                    }
                }

                // Controls: Desktop uses unrestricted 360° TrackballControls; Mobile uses smooth touch-native OrbitControls
                let controls;
                if (isMobilePerf) {
                    const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');
                    controls = new OrbitControls(camera, renderer.domElement);
                    controls.enableDamping = true;
                    controls.dampingFactor = 0.08;
                    controls.rotateSpeed = 0.72;
                    controls.zoomSpeed = 0.9;
                    controls.enablePan = false;
                    controls.minDistance = 2.0;
                    controls.maxDistance = 130;
                } else {
                    const { TrackballControls } = await import('three/addons/controls/TrackballControls.js');
                    controls = new TrackballControls(camera, renderer.domElement);
                    controls.rotateSpeed = 1.15;
                    controls.zoomSpeed = 1.0;
                    controls.panSpeed = 0.75;
                    controls.staticMoving = false;
                    controls.dynamicDampingFactor = 0.28;
                    controls.minDistance = 1.2;
                    controls.maxDistance = 140;
                }

                // On-demand render scheduler (0% idle CPU/GPU when scene is static)
                let renderRequested = false;
                let needsRender = true;
                let needsLabelUpdate = true;
                let requestRender = () => {};

                // Smooth camera transition state (including camera.up reset)
                let camAnim = null;
                const defaultUp = new THREE.Vector3(0, 1, 0);
                function animateCameraTo(targetPos, targetLookAt, durationMs = 500, resetUp = true) {
                    camAnim = {
                        startPos: camera.position.clone(),
                        endPos: targetPos.clone(),
                        startTarget: controls.target.clone(),
                        endTarget: targetLookAt.clone(),
                        startUp: camera.up.clone(),
                        endUp: resetUp ? defaultUp.clone() : camera.up.clone(),
                        startTime: performance.now(),
                        duration: durationMs
                    };
                    requestRender(true);
                }
                const cancelCamAnim = () => { camAnim = null; requestRender(true); };
                controls.addEventListener('change', () => requestRender(true));
                controls.addEventListener('start', cancelCamAnim);
                renderer.domElement.addEventListener('pointerdown', cancelCamAnim, { passive: true });
                renderer.domElement.addEventListener('wheel', cancelCamAnim, { passive: true });
                renderer.domElement.addEventListener('touchstart', cancelCamAnim, { passive: true });
                renderer.domElement.addEventListener('dblclick', () => {
                    if (setCameraPresetFn) setCameraPresetFn('reset');
                });

                // Studio 3-Point Lighting
                scene.add(new THREE.AmbientLight(0xdbeafe, 0.45));

                const keyLight = new THREE.DirectionalLight(0xffffff, 1.85);
                keyLight.position.set(7, 12, 9);
                scene.add(keyLight);

                const fillLight = new THREE.DirectionalLight(0x93c5fd, 0.85);
                fillLight.position.set(-9, 3, 5);
                scene.add(fillLight);

                const rimLight = new THREE.DirectionalLight(0xc4b5fd, 0.95);
                rimLight.position.set(0, -6, -10);
                scene.add(rimLight);

                // Ceramic / Anodized Metal Apple PBR Materials (auto-uses fast MeshPhongMaterial on mobile GPUs)
                function makePBRMat(opts) {
                    if (isMobilePerf) {
                        const phongOpts = {
                            color: opts.color,
                            shininess: opts.roughness !== undefined ? Math.round((1 - opts.roughness) * 110) : 80,
                            specular: new THREE.Color(0x555566)
                        };
                        if (opts.transparent) phongOpts.transparent = true;
                        if (opts.opacity !== undefined) phongOpts.opacity = opts.opacity;
                        if (opts.side !== undefined) phongOpts.side = opts.side;
                        if (opts.depthWrite !== undefined) phongOpts.depthWrite = opts.depthWrite;
                        if (opts.emissive !== undefined) phongOpts.emissive = opts.emissive;
                        return new THREE.MeshPhongMaterial(phongOpts);
                    }
                    return new THREE.MeshPhysicalMaterial(opts);
                }

                const matCAlpha = makePBRMat({ color: 0x2c2c2e, roughness: 0.2, metalness: 0.25, clearcoat: 0.9, clearcoatRoughness: 0.12 });
                const matCarbon = makePBRMat({ color: 0x636366, roughness: 0.24, metalness: 0.2, clearcoat: 0.8, clearcoatRoughness: 0.15 });
                const matNitrogen = makePBRMat({ color: 0x0a84ff, roughness: 0.18, metalness: 0.12, clearcoat: 0.95, clearcoatRoughness: 0.1 });
                const matOxygen = makePBRMat({ color: 0xff3b30, roughness: 0.16, metalness: 0.1, clearcoat: 0.95, clearcoatRoughness: 0.08 });
                const matHydrogen = makePBRMat({ color: 0xf5f5f7, roughness: 0.22, metalness: 0.05, clearcoat: 0.85, clearcoatRoughness: 0.12 });
                const matRGroup = makePBRMat({ color: 0xff9f0a, roughness: 0.18, metalness: 0.15, clearcoat: 0.95, clearcoatRoughness: 0.1 });
                const matSulfur = makePBRMat({ color: 0xffd60a, roughness: 0.18, metalness: 0.15, clearcoat: 0.92, clearcoatRoughness: 0.1 });
                const matBond = makePBRMat({ color: 0xd1d1d6, roughness: 0.28, metalness: 0.45, clearcoat: 0.5 });
                const matClashGlow = new THREE.MeshBasicMaterial({ color: 0xff3b30, transparent: true, opacity: 0.34, depthWrite: false });

                const strandColors = [0x64d2ff, 0xff9f0a, 0xff375f];
                const strandMats = strandColors.map(hex => makePBRMat({
                    color: hex, roughness: 0.18, metalness: 0.15, clearcoat: 0.92, clearcoatRoughness: 0.1
                }));
                const ribbonMats = strandColors.map(hex => makePBRMat({
                    color: hex, transparent: true, opacity: 0.3, roughness: 0.15, clearcoat: 0.85, depthWrite: false
                }));
                const matHBondDashed = new THREE.LineDashedMaterial({ color: 0xbf5af2, dashSize: 0.17, gapSize: 0.11 });

                // Cached unit geometries (adaptive detail for smooth 60fps on both desktop & mobile)
                const unitSphereGeo = new THREE.SphereGeometry(1, isMobilePerf ? 18 : 24, isMobilePerf ? 14 : 18);
                const unitCylGeo = new THREE.CylinderGeometry(1, 1, 1, isMobilePerf ? 10 : 14);
                const chainSphereGeo = new THREE.SphereGeometry(1, isMobilePerf ? 12 : 18, isMobilePerf ? 10 : 14);
                const chainCylGeo = new THREE.CylinderGeometry(1, 1, 1, isMobilePerf ? 8 : 10);

                function createSphere(radius, material, pos) {
                    const mesh = new THREE.Mesh(unitSphereGeo, material);
                    mesh.scale.setScalar(radius);
                    mesh.userData.baseRadius = radius;
                    if (pos) mesh.position.copy(pos);
                    return mesh;
                }

                function createBond(p1, p2, radius = 0.105, material = matBond) {
                    const dir = new THREE.Vector3().subVectors(p2, p1);
                    const len = dir.length();
                    const mesh = new THREE.Mesh(unitCylGeo, material);
                    mesh.scale.set(radius, len, radius);
                    mesh.position.copy(p1).add(p2).multiplyScalar(0.5);
                    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
                    return mesh;
                }

                // Rounded Glass Peptide Plate Helper (depthWrite: false to prevent ANY occlusion bugs!)
                function createGlassPlate(w, h, r, colorHex) {
                    const shape = new THREE.Shape();
                    const x = -w / 2, y = -h / 2;
                    shape.moveTo(x + r, y);
                    shape.lineTo(x + w - r, y);
                    shape.quadraticCurveTo(x + w, y, x + w, y + r);
                    shape.lineTo(x + w, y + h - r);
                    shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
                    shape.lineTo(x + r, y + h);
                    shape.quadraticCurveTo(x, y + h, x, y + h - r);
                    shape.lineTo(x, y + r);
                    shape.quadraticCurveTo(x, y, x + r, y);

                    const group = new THREE.Group();
                    const plateMat = makePBRMat({
                        color: colorHex,
                        transparent: true,
                        opacity: 0.22,
                        roughness: 0.12,
                        metalness: 0.05,
                        clearcoat: 1.0,
                        side: THREE.DoubleSide,
                        depthWrite: false
                    });
                    const plateMesh = new THREE.Mesh(new THREE.ShapeGeometry(shape, 16), plateMat);
                    plateMesh.renderOrder = 1;
                    group.add(plateMesh);

                    const borderPts = shape.getPoints(32).map(p => new THREE.Vector3(p.x, p.y, 0));
                    const borderGeo = new THREE.BufferGeometry().setFromPoints(borderPts);
                    const borderMat = new THREE.LineBasicMaterial({ color: colorHex, transparent: true, opacity: 0.65, depthWrite: false });
                    const borderLoop = new THREE.LineLoop(borderGeo, borderMat);
                    borderLoop.renderOrder = 2;
                    group.add(borderLoop);

                    return { group, plateMat, borderMat };
                }

                // 3D Luminous Protractor Ring around rotation axis
                function createProtractorRing(axisDir, colorHex) {
                    const ringGeo = new THREE.RingGeometry(0.52, 0.57, 48);
                    const ringMat = new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false });
                    const ring = new THREE.Mesh(ringGeo, ringMat);
                    ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), axisDir.clone().normalize());
                    return ring;
                }

                // ==========================================
                // Smart Collision-Free Screen-Space Label System
                // ==========================================
                const activeLabels = []; // { id, text, dotColor, object3D, localOffset, groupTag, el, w, h }

                function registerLabel(text, dotColor, object3D, localOffset, groupTag) {
                    const el = document.createElement('div');
                    el.className = 'atom-tag';
                    el.innerHTML = `<span class="atom-tag-dot" style="background:${dotColor};"></span><span>${text}</span>`;
                    labelOverlay.appendChild(el);
                    const item = {
                        text,
                        dotColor,
                        object3D,
                        localOffset: localOffset ? localOffset.clone() : new THREE.Vector3(),
                        groupTag,
                        el,
                        w: 0,
                        h: 0
                    };
                    activeLabels.push(item);
                    return item;
                }

                function clearLabelsByTag(groupTag) {
                    for (let i = activeLabels.length - 1; i >= 0; i--) {
                        if (activeLabels[i].groupTag === groupTag) {
                            activeLabels[i].el.remove();
                            activeLabels.splice(i, 1);
                        }
                    }
                }

                function syncLeaderCanvasSize() {
                    const w = threeContainer.clientWidth || 560;
                    const h = threeContainer.clientHeight || 460;
                    const dpr = targetDPR;
                    labelLeaderCanvas.width = Math.round(w * dpr);
                    labelLeaderCanvas.height = Math.round(h * dpr);
                    leaderCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
                }
                syncLeaderCanvasSize();

                const _labelWorld = new THREE.Vector3();
                const _labelProj = new THREE.Vector3();

                function updateSmartLabels() {
                    const viewW = threeContainer.clientWidth || 560;
                    const viewH = threeContainer.clientHeight || 460;
                    leaderCtx.clearRect(0, 0, viewW, viewH);

                    if (!showLabels3D) {
                        activeLabels.forEach(l => { l.el.style.opacity = '0'; });
                        return;
                    }

                    const visibleItems = [];
                    const tmpWorld = _labelWorld;
                    const tmpProj = _labelProj;

                    // Compute screen centroid of all visible atoms to push labels outward cleanly
                    let sumX = 0, sumY = 0;

                    for (let i = 0; i < activeLabels.length; i++) {
                        const item = activeLabels[i];
                        const isVisibleMode = pdbData
                            ? (item.groupTag === 'pdb')
                            : ((viewMode === 'single' && (item.groupTag === 'single' || item.groupTag === 'sidechain'))
                                || (viewMode === 'chain' && item.groupTag === 'chain'));

                        if (!isVisibleMode || !item.object3D) {
                            item.el.style.opacity = '0';
                            continue;
                        }

                        item.object3D.updateWorldMatrix(true, false);
                        tmpWorld.copy(item.localOffset).applyMatrix4(item.object3D.matrixWorld);
                        tmpProj.copy(tmpWorld).project(camera);

                        if (tmpProj.z > 1) {
                            item.el.style.opacity = '0';
                            continue;
                        }

                        const ax = (tmpProj.x * 0.5 + 0.5) * viewW;
                        const ay = (-tmpProj.y * 0.5 + 0.5) * viewH;

                        if (!item.w) {
                            const r = item.el.getBoundingClientRect();
                            item.w = Math.max(46, r.width || 68);
                            item.h = Math.max(22, r.height || 24);
                        }

                        sumX += ax;
                        sumY += ay;
                        visibleItems.push({ item, ax, ay, x: ax, y: ay, depth: tmpProj.z });
                    }

                    if (visibleItems.length === 0) return;

                    const cx = sumX / visibleItems.length;
                    const cy = sumY / visibleItems.length;

                    // Offset each label radially outward from the molecule centroid so it never covers the atom itself
                    visibleItems.forEach(v => {
                        let dx = v.ax - cx;
                        let dy = v.ay - cy;
                        const len = Math.hypot(dx, dy);
                        if (len < 6) {
                            dx = 0; dy = -1;
                        } else {
                            dx /= len; dy /= len;
                        }
                        v.x = v.ax + dx * 34;
                        v.y = v.ay + dy * 30;
                    });

                    // Iterative 2D AABB Collision Resolution (lighter on mobile for smooth touch orbit)
                    const padX = 8, padY = 6;
                    const margin = 12;
                    const maxIter = isMobilePerf ? 4 : 10;
                    for (let iter = 0; iter < maxIter; iter++) {
                        for (let i = 0; i < visibleItems.length; i++) {
                            for (let j = i + 1; j < visibleItems.length; j++) {
                                const a = visibleItems[i];
                                const b = visibleItems[j];
                                const minDx = (a.item.w + b.item.w) * 0.5 + padX;
                                const minDy = (a.item.h + b.item.h) * 0.5 + padY;
                                const dx = b.x - a.x;
                                const dy = b.y - a.y;
                                const overlapX = minDx - Math.abs(dx);
                                const overlapY = minDy - Math.abs(dy);

                                if (overlapX > 0 && overlapY > 0) {
                                    if (overlapY < overlapX) {
                                        const push = (overlapY * 0.55) * (dy >= 0 ? 1 : -1);
                                        a.y -= push;
                                        b.y += push;
                                    } else {
                                        const push = (overlapX * 0.55) * (dx >= 0 ? 1 : -1);
                                        a.x -= push;
                                        b.x += push;
                                    }
                                }
                            }
                        }

                        // Clamp inside viewport bounds
                        for (let i = 0; i < visibleItems.length; i++) {
                            const v = visibleItems[i];
                            const hw = v.item.w * 0.5 + margin;
                            const hh = v.item.h * 0.5 + margin;
                            v.x = Math.max(hw, Math.min(viewW - hw, v.x));
                            v.y = Math.max(hh, Math.min(viewH - hh, v.y));
                        }
                    }

                    // Render crisp leader lines + position DOM tags
                    visibleItems.forEach(v => {
                        const dist = Math.hypot(v.x - v.ax, v.y - v.ay);
                        if (dist > 14) {
                            leaderCtx.beginPath();
                            leaderCtx.moveTo(v.ax, v.ay);
                            leaderCtx.lineTo(v.x, v.y);
                            leaderCtx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
                            leaderCtx.lineWidth = 1.1;
                            leaderCtx.stroke();

                            leaderCtx.beginPath();
                            leaderCtx.arc(v.ax, v.ay, 2.5, 0, Math.PI * 2);
                            leaderCtx.fillStyle = v.item.dotColor;
                            leaderCtx.fill();
                        }

                        const tx = Math.round(v.x - v.item.w * 0.5);
                        const ty = Math.round(v.y - v.item.h * 0.5);
                        v.item.el.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
                        v.item.el.style.opacity = '1';
                    });
                }

                setLabels3DFn = (visible) => {
                    showLabels3D = visible;
                    updateSmartLabels();
                };

                // ------------------------------------------
                // 引擎 A：單殘基雙平面模型 (Single Residue)
                // ------------------------------------------
                const singleGroup = new THREE.Group();
                scene.add(singleGroup);

                const atomMeshesForVDW = [];
                function regAtom(radius, material, pos) {
                    const m = createSphere(radius, material, pos);
                    atomMeshesForVDW.push(m);
                    return m;
                }

                const caMesh = regAtom(0.42, matCAlpha, new THREE.Vector3(0, 0, 0));
                singleGroup.add(caMesh);
                registerLabel('Cα 關節', '#8e8e93', caMesh, new THREE.Vector3(0, 0, 0), 'single');

                const hAlphaPos = new THREE.Vector3(0, -0.75, 0.55);
                singleGroup.add(regAtom(0.24, matHydrogen, hAlphaPos));
                singleGroup.add(createBond(new THREE.Vector3(0, 0, 0), hAlphaPos, 0.075));

                const sideChainGroup = new THREE.Group();
                singleGroup.add(sideChainGroup);

                // 左側分支 (φ)
                const nPos = new THREE.Vector3(-1.25, 0.65, 0);
                singleGroup.add(createBond(new THREE.Vector3(0, 0, 0), nPos, 0.115));

                const axisPhiDir = nPos.clone().normalize();
                const phiAxisLine = new THREE.Line(
                    new THREE.BufferGeometry().setFromPoints([axisPhiDir.clone().multiplyScalar(-1.1), axisPhiDir.clone().multiplyScalar(3.3)]),
                    new THREE.LineDashedMaterial({ color: 0x64d2ff, dashSize: 0.16, gapSize: 0.1 })
                );
                phiAxisLine.computeLineDistances();
                singleGroup.add(phiAxisLine);

                const phiRing = createProtractorRing(axisPhiDir, 0x0a84ff);
                phiRing.position.copy(nPos).multiplyScalar(0.5);
                singleGroup.add(phiRing);

                const phiPivot = new THREE.Group();
                phiPivot.position.copy(nPos);
                singleGroup.add(phiPivot);
                const nMesh = regAtom(0.38, matNitrogen, new THREE.Vector3(0, 0, 0));
                phiPivot.add(nMesh);
                registerLabel('N (氮)', '#0a84ff', nMesh, new THREE.Vector3(0, 0, 0), 'single');

                const leftPlaneGroup = new THREE.Group();
                phiPivot.add(leftPlaneGroup);

                const hAmideLocal = new THREE.Vector3(-0.35, -0.85, 0);
                const cPrevLocal = new THREE.Vector3(-1.15, 0.65, 0);
                const oPrevLocal = new THREE.Vector3(-1.15, 1.85, 0);
                const caPrevLocal = new THREE.Vector3(-2.35, -0.15, 0);

                const hAmideMesh = regAtom(0.25, matHydrogen, hAmideLocal);
                const cPrevMesh = regAtom(0.36, matCarbon, cPrevLocal);
                const oPrevMesh = regAtom(0.36, matOxygen, oPrevLocal);
                const caPrevMesh = regAtom(0.36, matCAlpha, caPrevLocal);

                registerLabel('H', '#f5f5f7', hAmideMesh, new THREE.Vector3(0, 0, 0), 'single');

                const omegaPivot = new THREE.Group();
                omegaPivot.position.copy(cPrevLocal);
                leftPlaneGroup.add(omegaPivot);

                const oPrevRel = new THREE.Vector3().subVectors(oPrevLocal, cPrevLocal);
                const caPrevRel = new THREE.Vector3().subVectors(caPrevLocal, cPrevLocal);
                oPrevMesh.position.copy(oPrevRel);
                caPrevMesh.position.copy(caPrevRel);
                omegaPivot.add(oPrevMesh, caPrevMesh);
                omegaPivot.add(createBond(new THREE.Vector3(0, 0, 0), oPrevRel, 0.105));
                omegaPivot.add(createBond(new THREE.Vector3(0, 0, 0), caPrevRel, 0.115));

                registerLabel('O (氧)', '#ff3b30', oPrevMesh, new THREE.Vector3(0, 0, 0), 'single');

                leftPlaneGroup.add(hAmideMesh, cPrevMesh);
                leftPlaneGroup.add(createBond(new THREE.Vector3(0, 0, 0), hAmideLocal, 0.075));
                leftPlaneGroup.add(createBond(new THREE.Vector3(0, 0, 0), cPrevLocal, 0.115));

                const leftPlate = createGlassPlate(2.55, 2.35, 0.24, 0x0a84ff);
                leftPlate.group.position.set(-1.22, 0.58, 0);
                leftPlaneGroup.add(leftPlate.group);

                // 右側分支 (ψ)
                const cPrimePos = new THREE.Vector3(1.25, 0.65, 0);
                singleGroup.add(createBond(new THREE.Vector3(0, 0, 0), cPrimePos, 0.115));

                const axisPsiDir = cPrimePos.clone().normalize();
                const psiAxisLine = new THREE.Line(
                    new THREE.BufferGeometry().setFromPoints([axisPsiDir.clone().multiplyScalar(-1.1), axisPsiDir.clone().multiplyScalar(3.3)]),
                    new THREE.LineDashedMaterial({ color: 0x30d158, dashSize: 0.16, gapSize: 0.1 })
                );
                psiAxisLine.computeLineDistances();
                singleGroup.add(psiAxisLine);

                const psiRing = createProtractorRing(axisPsiDir, 0x30d158);
                psiRing.position.copy(cPrimePos).multiplyScalar(0.5);
                singleGroup.add(psiRing);

                const psiPivot = new THREE.Group();
                psiPivot.position.copy(cPrimePos);
                singleGroup.add(psiPivot);
                const cPrimeMesh = regAtom(0.38, matCarbon, new THREE.Vector3(0, 0, 0));
                psiPivot.add(cPrimeMesh);
                registerLabel("C' (碳)", '#8e8e93', cPrimeMesh, new THREE.Vector3(0, 0, 0), 'single');

                const rightPlaneGroup = new THREE.Group();
                psiPivot.add(rightPlaneGroup);

                const oCarbLocal = new THREE.Vector3(0.35, -0.95, 0);
                const nNextLocal = new THREE.Vector3(1.15, 0.65, 0);
                const hNextLocal = new THREE.Vector3(1.15, 1.65, 0);
                const caNextLocal = new THREE.Vector3(2.35, -0.15, 0);

                const oCarbMesh = regAtom(0.36, matOxygen, oCarbLocal);
                const nNextMesh = regAtom(0.36, matNitrogen, nNextLocal);
                const hNextMesh = regAtom(0.25, matHydrogen, hNextLocal);
                const caNextMesh = regAtom(0.36, matCAlpha, caNextLocal);

                registerLabel('O (氧)', '#ff3b30', oCarbMesh, new THREE.Vector3(0, 0, 0), 'single');

                rightPlaneGroup.add(oCarbMesh, nNextMesh, hNextMesh, caNextMesh);
                rightPlaneGroup.add(createBond(new THREE.Vector3(0, 0, 0), oCarbLocal, 0.105));
                rightPlaneGroup.add(createBond(new THREE.Vector3(0, 0, 0), nNextLocal, 0.115));
                rightPlaneGroup.add(createBond(nNextLocal, hNextLocal, 0.075));
                rightPlaneGroup.add(createBond(nNextLocal, caNextLocal, 0.115));

                const rightPlate = createGlassPlate(2.55, 2.35, 0.24, 0x30d158);
                rightPlate.group.position.set(1.22, 0.58, 0);
                rightPlaneGroup.add(rightPlate.group);

                // 共振硬紙板閃爍演示
                pulsePeptidePlaneFn = () => {
                    leftPlate.plateMat.opacity = 0.62;
                    rightPlate.plateMat.opacity = 0.62;
                    leftPlate.borderMat.opacity = 1.0;
                    rightPlate.borderMat.opacity = 1.0;
                    requestRender(false);
                    setTimeout(() => {
                        leftPlate.plateMat.opacity = 0.22;
                        rightPlate.plateMat.opacity = 0.22;
                        leftPlate.borderMat.opacity = 0.65;
                        rightPlate.borderMat.opacity = 0.65;
                        requestRender(false);
                    }, 950);
                };

                const clashSphere1 = createSphere(0.68, matClashGlow, new THREE.Vector3());
                const clashSphere2 = createSphere(0.68, matClashGlow, new THREE.Vector3());
                clashSphere1.visible = false;
                clashSphere2.visible = false;
                singleGroup.add(clashSphere1, clashSphere2);

                const clashLineGeo = new THREE.BufferGeometry();
                clashLineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
                const clashLine = new THREE.Line(
                    clashLineGeo,
                    new THREE.LineBasicMaterial({ color: 0xff453a })
                );
                clashLine.visible = false;
                singleGroup.add(clashLine);

                let rBetaMesh = null;
                let sideChainAtomMeshes = [];
                const SIDECHAIN_MATS = { C: matRGroup, N: matNitrogen, O: matOxygen, S: matSulfur };
                const SIDECHAIN_RADII = { C: 0.34, N: 0.33, O: 0.31, S: 0.40 };

                rebuildSideChainFn = (resKeyOrClass) => {
                    const key = normalizeResidueKey(resKeyOrClass);
                    const aaInfo = AMINO_ACIDS[key] || AMINO_ACIDS.ALA;
                    clearLabelsByTag('sidechain');
                    while (sideChainGroup.children.length > 0) {
                        sideChainGroup.remove(sideChainGroup.children[0]);
                    }
                    rBetaMesh = null;
                    sideChainAtomMeshes = [];

                    const addSCAtom = (radius, mat, pos) => {
                        const m = createSphere(radius, mat, pos);
                        sideChainGroup.add(m);
                        sideChainAtomMeshes.push(m);
                        return m;
                    };

                    if (key === 'GLY') {
                        const hPos = new THREE.Vector3(0, 0.85, -0.65);
                        rBetaMesh = addSCAtom(0.24, matHydrogen, hPos);
                        sideChainGroup.add(createBond(new THREE.Vector3(0, 0, 0), hPos, 0.075));
                        registerLabel(isEN() ? 'H (Gly)' : 'H (甘胺酸無側鏈)', '#30d158', rBetaMesh, new THREE.Vector3(0, 0, 0), 'sidechain');
                    } else if (key === 'PRO') {
                        const cBetaPos = new THREE.Vector3(-0.22, 0.96, -0.72);
                        const cGammaPos = new THREE.Vector3(-1.12, 1.48, -0.78);
                        const cDeltaPos = new THREE.Vector3(-1.58, 1.24, -0.22);
                        rBetaMesh = addSCAtom(0.35, matRGroup, cBetaPos);
                        const cGammaMesh = addSCAtom(0.33, matRGroup, cGammaPos);
                        addSCAtom(0.33, matRGroup, cDeltaPos);
                        sideChainGroup.add(
                            createBond(new THREE.Vector3(0, 0, 0), cBetaPos, 0.105),
                            createBond(cBetaPos, cGammaPos, 0.105),
                            createBond(cGammaPos, cDeltaPos, 0.105),
                            createBond(cDeltaPos, nPos, 0.105)
                        );
                        registerLabel(isEN() ? 'Pro 5-Ring' : 'Pro 五元鎖死環', '#ff9f0a', cGammaMesh, new THREE.Vector3(0, 0, 0), 'sidechain');
                    } else {
                        const caZero = new THREE.Vector3(0, 0, 0);
                        const cbPos = new THREE.Vector3(0, 1.05, -0.82);
                        const isSimpleR = aaInfo.atoms.length === 0;
                        rBetaMesh = addSCAtom(isSimpleR ? 0.44 : 0.36, matRGroup, cbPos);
                        sideChainGroup.add(createBond(caZero, cbPos, 0.11));

                        const posMap = { N: nPos, CA: caZero, CB: cbPos };
                        let labelAnchor = rBetaMesh;
                        let maxDistFromCA = cbPos.length();
                        const bondScale = 0.88;

                        for (let i = 0; i < aaInfo.atoms.length; i++) {
                            const [aName, elem, rA, rB, rC, bLen, bAng, tor] = aaInfo.atoms[i];
                            const pA = posMap[rA], pB = posMap[rB], pC = posMap[rC];
                            if (!pA || !pB || !pC) continue;
                            const pt = placeNextAtom(pA, pB, pC, bLen * bondScale, bAng, tor);
                            posMap[aName] = pt;
                            const m = addSCAtom(SIDECHAIN_RADII[elem] || 0.33, SIDECHAIN_MATS[elem] || matRGroup, pt);
                            sideChainGroup.add(createBond(pC, pt, 0.095));
                            const d = pt.length();
                            if (d > maxDistFromCA) {
                                maxDistFromCA = d;
                                labelAnchor = m;
                            }
                        }
                        for (let i = 0; i < aaInfo.ring.length; i++) {
                            const [u, v] = aaInfo.ring[i];
                            if (posMap[u] && posMap[v]) {
                                sideChainGroup.add(createBond(posMap[u], posMap[v], 0.095));
                            }
                        }

                        const scColor = AA_GROUP_INFO[aaInfo.group] ? AA_GROUP_INFO[aaInfo.group].color : '#ff9f0a';
                        const code3 = key.charAt(0) + key.slice(1).toLowerCase();
                        const scText = key === 'PREPRO'
                            ? (isEN() ? 'Pre-Pro (R)' : 'Pre-Pro (示意 R)')
                            : (isEN() ? `${aaInfo.en} (${code3})` : `${aaInfo.zh} (${code3})`);
                        registerLabel(scText, scColor, labelAnchor, new THREE.Vector3(0, 0, 0), 'sidechain');
                    }

                    const mult = showVDW ? 1.82 : 1.0;
                    sideChainAtomMeshes.forEach(m => m.scale.setScalar(m.userData.baseRadius * mult));
                    requestRender(true);
                };

                setVDW3DFn = (enabled) => {
                    const mult = enabled ? 1.82 : 1.0;
                    atomMeshesForVDW.forEach(m => m.scale.setScalar(m.userData.baseRadius * mult));
                    sideChainAtomMeshes.forEach(m => m.scale.setScalar(m.userData.baseRadius * mult));
                    requestRender(false);
                };

                // ------------------------------------------
                // 引擎 B：統一 NeRF 物理建構引擎 + 光澤骨架緞帶
                // ------------------------------------------
                const chainGroup = new THREE.Group();
                chainGroup.visible = false;
                scene.add(chainGroup);

                const matRibbonSingle = makePBRMat({
                    color: 0x64d2ff,
                    transparent: true,
                    opacity: 0.28,
                    roughness: 0.15,
                    metalness: 0.1,
                    clearcoat: 0.9,
                    depthWrite: false
                });

                function placeNextAtom(a, b, c, bondLen, bondAngleDeg, torsionDeg) {
                    const theta = THREE.MathUtils.degToRad(180 - bondAngleDeg);
                    const phi = THREE.MathUtils.degToRad(torsionDeg);

                    const bc = new THREE.Vector3().subVectors(c, b).normalize();
                    const ab = new THREE.Vector3().subVectors(b, a).normalize();
                    const n = new THREE.Vector3().crossVectors(ab, bc).normalize();
                    const m = new THREE.Vector3().crossVectors(n, bc).normalize();

                    const d = new THREE.Vector3()
                        .addScaledVector(bc, Math.cos(theta))
                        .addScaledVector(m, Math.sin(theta) * Math.cos(phi))
                        .addScaledVector(n, Math.sin(theta) * Math.sin(phi))
                        .multiplyScalar(bondLen);

                    return new THREE.Vector3().addVectors(c, d);
                }

                function computeNeRFChain(nRes, phiDeg, psiDeg, omegaDeg) {
                    const caList = [], nList = [], cList = [], oList = [], cbList = [];

                    let pPrevC = new THREE.Vector3(-1.33, 0, 0);
                    let pN = new THREE.Vector3(0, 0, 0);
                    let pCA = new THREE.Vector3(1.46 * Math.cos(THREE.MathUtils.degToRad(58.3)), 1.46 * Math.sin(THREE.MathUtils.degToRad(58.3)), 0);

                    for (let i = 0; i < nRes; i++) {
                        const pC = placeNextAtom(pPrevC, pN, pCA, 1.52, 111.2, phiDeg);
                        const pO = placeNextAtom(pN, pCA, pC, 1.23, 120.8, psiDeg + 180);
                        const pCB = placeNextAtom(pC, pN, pCA, 1.53, 110.5, phiDeg - 122);

                        nList.push(pN.clone());
                        caList.push(pCA.clone());
                        cList.push(pC.clone());
                        oList.push(pO.clone());
                        cbList.push(pCB.clone());

                        const pNextN = placeNextAtom(pN, pCA, pC, 1.33, 116.2, psiDeg);
                        const pNextCA = placeNextAtom(pCA, pC, pNextN, 1.46, 121.7, omegaDeg);

                        pPrevC = pC;
                        pN = pNextN;
                        pCA = pNextCA;
                    }

                    const axisVec = new THREE.Vector3().subVectors(caList[nRes - 1], caList[0]);
                    if (axisVec.lengthSq() > 0.001) {
                        axisVec.normalize();
                        const alignQuat = new THREE.Quaternion().setFromUnitVectors(axisVec, new THREE.Vector3(0, 1, 0));
                        [nList, caList, cList, oList, cbList].forEach(arr => {
                            arr.forEach(pt => pt.applyQuaternion(alignQuat));
                        });
                    }

                    const center = new THREE.Vector3();
                    caList.forEach(p => center.add(p));
                    center.divideScalar(nRes);

                    [nList, caList, cList, oList, cbList].forEach(arr => {
                        arr.forEach(pt => pt.sub(center));
                    });

                    return { nList, caList, cList, oList, cbList };
                }

                const _instDummy = new THREE.Object3D();
                const _instUp = new THREE.Vector3(0, 1, 0);
                const _instDir = new THREE.Vector3();

                function addInstancedSpheres(group, points, radius, material) {
                    if (!points.length) return;
                    const im = new THREE.InstancedMesh(chainSphereGeo, material, points.length);
                    _instDummy.quaternion.identity();
                    _instDummy.scale.setScalar(radius);
                    for (let i = 0; i < points.length; i++) {
                        _instDummy.position.copy(points[i]);
                        _instDummy.updateMatrix();
                        im.setMatrixAt(i, _instDummy.matrix);
                    }
                    im.instanceMatrix.needsUpdate = true;
                    group.add(im);
                }

                function addInstancedBonds(group, pairs, radius, material) {
                    if (!pairs.length) return;
                    const im = new THREE.InstancedMesh(chainCylGeo, material, pairs.length);
                    for (let i = 0; i < pairs.length; i++) {
                        const [p1, p2] = pairs[i];
                        _instDir.subVectors(p2, p1);
                        const len = _instDir.length();
                        if (len < 1e-5) continue;
                        _instDummy.position.copy(p1).add(p2).multiplyScalar(0.5);
                        _instDummy.quaternion.setFromUnitVectors(_instUp, _instDir.divideScalar(len));
                        _instDummy.scale.set(radius, len, radius);
                        _instDummy.updateMatrix();
                        im.setMatrixAt(i, _instDummy.matrix);
                    }
                    im.instanceMatrix.needsUpdate = true;
                    group.add(im);
                }

                function clearGroupResources(group) {
                    while (group.children.length > 0) {
                        const c = group.children[0];
                        if (c.isInstancedMesh && typeof c.dispose === 'function') {
                            c.dispose();
                        }
                        if (c.geometry && c.geometry !== unitSphereGeo && c.geometry !== unitCylGeo && c.geometry !== chainSphereGeo && c.geometry !== chainCylGeo) {
                            c.geometry.dispose();
                        }
                        group.remove(c);
                    }
                }

                let lastChainRadius = 11.5;

                function buildPolypeptideScene(phiDeg, psiDeg, omegaDeg, aaType) {
                    clearLabelsByTag('chain');
                    clearGroupResources(chainGroup);

                    const N_RES = 12;
                    const baseStrand = computeNeRFChain(N_RES, phiDeg, psiDeg, omegaDeg);
                    const hbPoints = [];

                    if (!showTripleHelix) {
                        // Sleek translucent backbone ribbon curve
                        const curve = new THREE.CatmullRomCurve3(baseStrand.caList);
                        const tubeGeo = new THREE.TubeGeometry(curve, isMobilePerf ? 40 : 72, 0.24, isMobilePerf ? 8 : 12, false);
                        chainGroup.add(new THREE.Mesh(tubeGeo, matRibbonSingle));

                        addInstancedSpheres(chainGroup, baseStrand.nList, 0.32, matNitrogen);
                        addInstancedSpheres(chainGroup, baseStrand.caList, 0.37, matCAlpha);
                        addInstancedSpheres(chainGroup, baseStrand.cList, 0.32, matCarbon);
                        addInstancedSpheres(chainGroup, baseStrand.oList, 0.30, matOxygen);

                        const mainBonds = [];
                        const thinBonds = [];

                        if (aaType !== 'glycine') {
                            addInstancedSpheres(chainGroup, baseStrand.cbList, 0.30, matRGroup);
                            for (let i = 0; i < N_RES; i++) {
                                thinBonds.push([baseStrand.caList[i], baseStrand.cbList[i]]);
                            }
                        }

                        for (let i = 0; i < N_RES; i++) {
                            mainBonds.push([baseStrand.nList[i], baseStrand.caList[i]]);
                            mainBonds.push([baseStrand.caList[i], baseStrand.cList[i]]);
                            thinBonds.push([baseStrand.cList[i], baseStrand.oList[i]]);
                            if (i < N_RES - 1) {
                                mainBonds.push([baseStrand.cList[i], baseStrand.nList[i + 1]]);
                            }
                            if (i + 4 < N_RES) {
                                const distON = baseStrand.oList[i].distanceTo(baseStrand.nList[i + 4]);
                                if (distON >= 2.4 && distON <= 3.8) {
                                    hbPoints.push(baseStrand.oList[i], baseStrand.nList[i + 4]);
                                }
                            }
                        }

                        addInstancedBonds(chainGroup, mainBonds, 0.095, matBond);
                        addInstancedBonds(chainGroup, thinBonds, 0.075, matBond);

                        const nAnchor = new THREE.Object3D();
                        nAnchor.position.copy(baseStrand.nList[0]);
                        const cAnchor = new THREE.Object3D();
                        cAnchor.position.copy(baseStrand.cList[N_RES - 1]);
                        chainGroup.add(nAnchor, cAnchor);

                        registerLabel('N端 (起點)', '#0a84ff', nAnchor, new THREE.Vector3(0, 0, 0), 'chain');
                        registerLabel('C端 (終點)', '#ff3b30', cAnchor, new THREE.Vector3(0, 0, 0), 'chain');

                        let maxR = 6;
                        for (let i = 0; i < N_RES; i++) {
                            maxR = Math.max(maxR, baseStrand.caList[i].length() + 2.2);
                        }
                        lastChainRadius = maxR;

                    } else {
                        const bundleRadius = 1.45;
                        const allStrands = [];
                        const allO = [];
                        const allCB = [];
                        const oBonds = [];
                        const cbBonds = [];

                        for (let s = 0; s < 3; s++) {
                            const phaseAngle = (s * 2 * Math.PI) / 3;
                            const axialStagger = (s - 1) * 0.95;

                            const sCA = [], sN = [], sO = [];
                            const strandBonds = [];

                            for (let i = 0; i < N_RES; i++) {
                                const superTwist = THREE.MathUtils.degToRad(i * 9.5);
                                const totalAngle = phaseAngle + superTwist;

                                const rotY = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), totalAngle);
                                const radialOffset = new THREE.Vector3(Math.cos(totalAngle) * bundleRadius, axialStagger, Math.sin(totalAngle) * bundleRadius);

                                const pCA = baseStrand.caList[i].clone().applyQuaternion(rotY).add(radialOffset);
                                const pN = baseStrand.nList[i].clone().applyQuaternion(rotY).add(radialOffset);
                                const pO = baseStrand.oList[i].clone().applyQuaternion(rotY).add(radialOffset);
                                const pCB = baseStrand.cbList[i].clone().applyQuaternion(rotY).add(radialOffset);

                                sCA.push(pCA);
                                sN.push(pN);
                                sO.push(pO);
                                allO.push(pO);
                                oBonds.push([pCA, pO]);

                                if ((i + s) % 3 !== 0) {
                                    allCB.push(pCB);
                                    cbBonds.push([pCA, pCB]);
                                }

                                if (i > 0) {
                                    strandBonds.push([sCA[i - 1], pCA]);
                                }
                            }

                            addInstancedSpheres(chainGroup, sCA, 0.35, strandMats[s]);
                            addInstancedBonds(chainGroup, strandBonds, 0.125, strandMats[s]);

                            const sCurve = new THREE.CatmullRomCurve3(sCA);
                            chainGroup.add(new THREE.Mesh(new THREE.TubeGeometry(sCurve, isMobilePerf ? 36 : 64, 0.22, isMobilePerf ? 7 : 12, false), ribbonMats[s]));
                            allStrands.push({ sCA, sN, sO });
                        }

                        addInstancedSpheres(chainGroup, allO, 0.22, matOxygen);
                        addInstancedSpheres(chainGroup, allCB, 0.26, matRGroup);
                        addInstancedBonds(chainGroup, oBonds, 0.055, matBond);
                        addInstancedBonds(chainGroup, cbBonds, 0.065, matBond);

                        for (let s = 0; s < 3; s++) {
                            const nextS = (s + 1) % 3;
                            for (let i = 0; i < N_RES; i++) {
                                let minD = 999;
                                let bestO = null;
                                for (let j = 0; j < N_RES; j++) {
                                    const d = allStrands[s].sN[i].distanceTo(allStrands[nextS].sO[j]);
                                    if (d < minD) {
                                        minD = d;
                                        bestO = allStrands[nextS].sO[j];
                                    }
                                }
                                if (bestO && minD >= 2.0 && minD <= 4.6) {
                                    hbPoints.push(allStrands[s].sN[i], bestO);
                                }
                            }
                        }

                        let maxR = 8;
                        for (let i = 0; i < N_RES; i++) {
                            maxR = Math.max(maxR, allStrands[0].sCA[i].length() + 3.0);
                        }
                        lastChainRadius = maxR;
                    }

                    // Single merged draw call for all hydrogen bonds
                    if (hbPoints.length > 0) {
                        const hbLine = new THREE.LineSegments(
                            new THREE.BufferGeometry().setFromPoints(hbPoints),
                            matHBondDashed
                        );
                        hbLine.computeLineDistances();
                        chainGroup.add(hbLine);
                    }
                }

                // ------------------------------------------
                // 引擎 C：真實 PDB 3D 骨架與 Outlier 定位系統 (P2)
                // ------------------------------------------
                const pdbGroup = new THREE.Group();
                pdbGroup.visible = false;
                scene.add(pdbGroup);

                const matPDBFavored = makePBRMat({ color: 0x34c759, roughness: 0.2, metalness: 0.12, clearcoat: 0.9 });
                const matPDBAllowed = makePBRMat({ color: 0xff9f0a, roughness: 0.2, metalness: 0.12, clearcoat: 0.9 });
                const matPDBOutlier = makePBRMat({ color: 0xff3b30, roughness: 0.15, metalness: 0.15, clearcoat: 0.95, emissive: 0x660000 });
                const matPDBTerm = makePBRMat({ color: 0x8e8e93, roughness: 0.25, metalness: 0.2, clearcoat: 0.8 });
                const matPDBRibbon = makePBRMat({ color: 0x64d2ff, transparent: true, opacity: 0.28, roughness: 0.15, clearcoat: 0.85, depthWrite: false });
                const matPDBHighlight = new THREE.MeshBasicMaterial({ color: 0x64d2ff, transparent: true, opacity: 0.45, depthWrite: false });

                let pdbSelectHalo = null;
                let pdbRadius = 14;
                let currentPDBParsed = null;

                renderPDB3DFn = (parsed, keepCamera = false) => {
                    currentPDBParsed = parsed;
                    if (!keepCamera) clearLabelsByTag('pdb');
                    clearGroupResources(pdbGroup);

                    const favPts = [], allPts = [], outPts = [], termPts = [];
                    const caVecs = [];
                    const bonds = [];
                    let maxR = 6;

                    parsed.residues.forEach((r, idx) => {
                        const vCA = new THREE.Vector3(r.ca.x, r.ca.y, r.ca.z);
                        caVecs.push(vCA);
                        maxR = Math.max(maxR, vCA.length() + 2.5);
                        if (r.status === 'favored') favPts.push(vCA);
                        else if (r.status === 'allowed') allPts.push(vCA);
                        else if (r.status === 'outlier') outPts.push(vCA);
                        else termPts.push(vCA);

                        if (idx > 0 && caVecs[idx - 1].distanceTo(vCA) < 4.5) {
                            bonds.push([caVecs[idx - 1], vCA]);
                        }
                    });

                    if (caVecs.length >= 2) {
                        const curve = new THREE.CatmullRomCurve3(caVecs);
                        const tubeSegs = Math.min(isMobilePerf ? 140 : 220, caVecs.length * 4);
                        const radSegs = isMobilePerf ? 7 : 10;
                        pdbGroup.add(new THREE.Mesh(new THREE.TubeGeometry(curve, tubeSegs, 0.17, radSegs, false), matPDBRibbon));
                    }

                    const dense = caVecs.length > 120;
                    addInstancedSpheres(pdbGroup, favPts, dense ? 0.20 : 0.32, matPDBFavored);
                    addInstancedSpheres(pdbGroup, allPts, dense ? 0.28 : 0.36, matPDBAllowed);
                    addInstancedSpheres(pdbGroup, outPts, 0.44, matPDBOutlier);
                    addInstancedSpheres(pdbGroup, termPts, dense ? 0.22 : 0.30, matPDBTerm);
                    if (!dense) addInstancedBonds(pdbGroup, bonds, 0.09, matBond);

                    pdbSelectHalo = createSphere(0.75, matPDBHighlight, new THREE.Vector3());
                    pdbSelectHalo.visible = false;
                    pdbGroup.add(pdbSelectHalo);

                    pdbRadius = maxR;
                    singleGroup.visible = false;
                    chainGroup.visible = false;
                    pdbGroup.visible = true;

                    if (!keepCamera) {
                        const fovRad = THREE.MathUtils.degToRad(camera.fov * 0.5);
                        const fitDist = Math.max(16, Math.min(110, (pdbRadius / Math.sin(fovRad)) * 1.05));
                        animateCameraTo(new THREE.Vector3(0, fitDist * 0.15, fitDist), new THREE.Vector3(0, 0, 0), 520, true);
                    } else {
                        requestRender(true);
                    }
                };

                updatePDB3DGeometryFn = (parsed) => {
                    renderPDB3DFn(parsed, true);
                };

                let pdbPulseUntil = 0;

                selectPDBResidue3DFn = (idx, focusCam = false) => {
                    if (!currentPDBParsed || !pdbSelectHalo) return;
                    const r = currentPDBParsed.residues[idx];
                    if (!r) return;
                    const pos = new THREE.Vector3(r.ca.x, r.ca.y, r.ca.z);
                    pdbSelectHalo.position.copy(pos);
                    pdbSelectHalo.scale.setScalar(0.76);
                    pdbSelectHalo.visible = true;
                    pdbPulseUntil = performance.now() + 1200;
                    const dotColor = r.status === 'favored' ? '#34c759' : (r.status === 'allowed' ? '#ff9f0a' : '#ff3b30');
                    const lblText = r.phi !== null && r.psi !== null
                        ? `${r.resName} ${r.resSeq} (${r.phi}°, ${r.psi}°)`
                        : `${r.resName} ${r.resSeq}`;
                    const existing = activeLabels.find(l => l.groupTag === 'pdb');
                    if (existing) {
                        existing.object3D = pdbSelectHalo;
                        existing.text = lblText;
                        existing.dotColor = dotColor;
                        existing.w = 0;
                        const dotEl = existing.el.querySelector('.atom-tag-dot');
                        const txtEl = existing.el.querySelector('span:last-child');
                        if (dotEl) dotEl.style.background = dotColor;
                        if (txtEl) txtEl.textContent = lblText;
                    } else {
                        registerLabel(lblText, dotColor, pdbSelectHalo, new THREE.Vector3(0, 0, 0), 'pdb');
                    }
                    if (focusCam) {
                        const camDir = camera.position.clone().sub(controls.target).normalize();
                        if (camDir.lengthSq() < 0.01) camDir.set(0, 0.2, 1).normalize();
                        const focusPos = pos.clone().addScaledVector(camDir, Math.min(18, Math.max(9, pdbRadius * 0.75)));
                        animateCameraTo(focusPos, pos, 480, false);
                    } else {
                        requestRender(true);
                    }
                };

                clearPDB3DFn = () => {
                    clearLabelsByTag('pdb');
                    clearGroupResources(pdbGroup);
                    pdbGroup.visible = false;
                    currentPDBParsed = null;
                    pdbSelectHalo = null;
                    requestRender(true);
                };

                // Built-in 20-residue Trp-cage-like Demo PDB generator (with α-helix, 3_10, PPII & 2 turn outliers)
                buildDemoPDBTextFn = () => {
                    const seq = [
                        { name: 'ASN', phi: -62, psi: -42 }, { name: 'LEU', phi: -60, psi: -45 },
                        { name: 'TYR', phi: -63, psi: -41 }, { name: 'ILE', phi: -58, psi: -46 },
                        { name: 'GLN', phi: -61, psi: -43 }, { name: 'TRP', phi: -64, psi: -40 },
                        { name: 'LEU', phi: -59, psi: -44 }, { name: 'LYS', phi: -65, psi: -35 },
                        { name: 'ASP', phi: -82, psi: -10 }, { name: 'GLY', phi: 72, psi: 30 },
                        { name: 'GLY', phi: 120, psi: -15 }, { name: 'PRO', phi: -62, psi: 145 },
                        { name: 'SER', phi: 45, psi: -120 },  // Deliberate Outlier #1 (steric turn)
                        { name: 'SER', phi: -135, psi: 140 }, { name: 'GLY', phi: 75, psi: 25 },
                        { name: 'ARG', phi: 15, psi: -10 },   // Deliberate Outlier #2 (clash zone)
                        { name: 'PRO', phi: -65, psi: 148 }, { name: 'PRO', phi: -60, psi: 142 },
                        { name: 'PRO', phi: -63, psi: 145 }, { name: 'SER', phi: -75, psi: 140 }
                    ];
                    let pPrevC = new THREE.Vector3(-1.33, 0, 0);
                    let pN = new THREE.Vector3(0, 0, 0);
                    let pCA = new THREE.Vector3(1.46 * Math.cos(THREE.MathUtils.degToRad(58.3)), 1.46 * Math.sin(THREE.MathUtils.degToRad(58.3)), 0);
                    const lines = ['HEADER    DEMO TRP-CAGE MINIPROTEIN (20 AA)'];
                    let atomId = 1;
                    const fmt = (n) => n.toFixed(3).padStart(8, ' ');
                    const addAtom = (aName, rName, rSeq, pt) => {
                        lines.push(`ATOM  ${String(atomId++).padStart(5, ' ')}  ${aName.padEnd(3, ' ')} ${rName} A${String(rSeq).padStart(4, ' ')}    ${fmt(pt.x)}${fmt(pt.y)}${fmt(pt.z)}  1.00 20.00           ${aName[0]}`);
                    };
                    for (let i = 0; i < seq.length; i++) {
                        const s = seq[i];
                        const pC = placeNextAtom(pPrevC, pN, pCA, 1.52, 111.2, s.phi);
                        const pO = placeNextAtom(pN, pCA, pC, 1.23, 120.8, s.psi + 180);
                        addAtom('N', s.name, i + 1, pN);
                        addAtom('CA', s.name, i + 1, pCA);
                        addAtom('C', s.name, i + 1, pC);
                        addAtom('O', s.name, i + 1, pO);
                        const pNextN = placeNextAtom(pN, pCA, pC, 1.33, 116.2, s.psi);
                        const pNextCA = placeNextAtom(pCA, pC, pNextN, 1.46, 121.7, 180);
                        pPrevC = pC; pN = pNextN; pCA = pNextCA;
                    }
                    lines.push('END');
                    return lines.join('\n');
                };

                // ------------------------------------------
                // 平滑動畫鏡頭快捷預設 + 自由縮放輔助
                // ------------------------------------------
                function getChainFitDistance() {
                    const fovRad = THREE.MathUtils.degToRad(camera.fov * 0.5);
                    return Math.max(20, Math.min(72, (lastChainRadius / Math.sin(fovRad)) * 1.12));
                }

                setCameraPresetFn = (preset) => {
                    if (preset === 'phi' && viewMode === 'single' && !pdbData) {
                        newmanAxisMode = 'phi';
                        updateNewmanClock();
                        const pos = nPos.clone().addScaledVector(axisPhiDir, -6.4).add(new THREE.Vector3(0, 0.4, 0));
                        animateCameraTo(pos, nPos, 500, true);
                    } else if (preset === 'psi' && viewMode === 'single' && !pdbData) {
                        newmanAxisMode = 'psi';
                        updateNewmanClock();
                        const pos = cPrimePos.clone().addScaledVector(axisPsiDir, -6.4).add(new THREE.Vector3(0, 0.4, 0));
                        animateCameraTo(pos, cPrimePos, 500, true);
                    } else if (preset === 'zoomIn' || preset === 'zoomOut') {
                        const factor = preset === 'zoomIn' ? 0.72 : 1.38;
                        const offset = camera.position.clone().sub(controls.target);
                        const newDist = Math.max(controls.minDistance, Math.min(controls.maxDistance, offset.length() * factor));
                        offset.setLength(newDist);
                        animateCameraTo(controls.target.clone().add(offset), controls.target.clone(), 240, false);
                    } else {
                        newmanAxisMode = null;
                        updateNewmanClock();
                        let pos;
                        if (pdbData) {
                            const fovRad = THREE.MathUtils.degToRad(camera.fov * 0.5);
                            const fitDist = Math.max(16, Math.min(110, (pdbRadius / Math.sin(fovRad)) * 1.05));
                            pos = new THREE.Vector3(0, fitDist * 0.15, fitDist);
                        } else {
                            pos = viewMode === 'single'
                                ? new THREE.Vector3(0, 2.8, 9.6)
                                : new THREE.Vector3(0, 3.2, getChainFitDistance());
                        }
                        animateCameraTo(pos, new THREE.Vector3(0, 0, 0), 500, true);
                    }
                };

                setViewMode3DFn = (mode) => {
                    if (mode === 'single') {
                        singleGroup.visible = true;
                        chainGroup.visible = false;
                        animateCameraTo(new THREE.Vector3(0, 2.8, 9.6), new THREE.Vector3(0, 0, 0), 460, true);
                    } else {
                        singleGroup.visible = false;
                        chainGroup.visible = true;
                        animateCameraTo(new THREE.Vector3(0, 3.2, getChainFitDistance()), new THREE.Vector3(0, 0, 0), 460, true);
                    }
                };

                // ------------------------------------------
                // 總更新與即時 Å 距離尺計算
                // ------------------------------------------
                update3DFn = (phiDeg, psiDeg, omegaDeg, evalResult) => {
                    if (viewMode === 'single') {
                        phiPivot.quaternion.setFromAxisAngle(axisPhiDir, THREE.MathUtils.degToRad(phiDeg + 180));
                        psiPivot.quaternion.setFromAxisAngle(axisPsiDir, THREE.MathUtils.degToRad(psiDeg + 180));
                        omegaPivot.quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), THREE.MathUtils.degToRad(omegaDeg - 180));
                        singleGroup.updateMatrixWorld(true);

                        const posHAmide = new THREE.Vector3().setFromMatrixPosition(hAmideMesh.matrixWorld);
                        const posOPrev = new THREE.Vector3().setFromMatrixPosition(oPrevMesh.matrixWorld);
                        const posOCarb = new THREE.Vector3().setFromMatrixPosition(oCarbMesh.matrixWorld);
                        const posNNext = new THREE.Vector3().setFromMatrixPosition(nNextMesh.matrixWorld);
                        const posRBeta = rBetaMesh ? new THREE.Vector3().setFromMatrixPosition(rBetaMesh.matrixWorld) : new THREE.Vector3(0, 5, 0);

                        const scaleA = 1.15;
                        const pairs = [
                            { name: 'O ↔ H', p1: posHAmide, p2: posOCarb, distA: posHAmide.distanceTo(posOCarb) * scaleA, safeA: 2.40 },
                            { name: 'O ↔ O', p1: posOPrev, p2: posOCarb, distA: posOPrev.distanceTo(posOCarb) * scaleA, safeA: 2.80 },
                            { name: 'O ↔ N', p1: posOPrev, p2: posNNext, distA: posOPrev.distanceTo(posNNext) * scaleA, safeA: 2.75 },
                            { name: 'O ↔ R基', p1: posOCarb, p2: posRBeta, distA: posOCarb.distanceTo(posRBeta) * scaleA, safeA: 2.90 },
                            { name: 'O(左) ↔ R基', p1: posOPrev, p2: posRBeta, distA: posOPrev.distanceTo(posRBeta) * scaleA, safeA: 2.90 }
                        ].sort((a, b) => (a.distA - a.safeA) - (b.distA - b.safeA));

                        const closest = pairs[0];
                        const en = isEN();
                        if (evalResult.status === 'clash') {
                            distanceHud.className = 'distance-hud danger';
                            distanceHud.textContent = en
                                ? `💥 Clash: ${closest.name.replace('R基', 'R').replace('(左)', '(L)')} ${closest.distA.toFixed(2)} Å (min ${closest.safeA.toFixed(2)} Å)`
                                : `💥 碰撞：${closest.name} ${closest.distA.toFixed(2)} Å (下限 ${closest.safeA.toFixed(2)} Å)`;
                            clashSphere1.position.copy(closest.p1);
                            clashSphere2.position.copy(closest.p2);
                            clashSphere1.visible = true;
                            clashSphere2.visible = true;
                            const clashPos = clashLine.geometry.attributes.position;
                            clashPos.setXYZ(0, closest.p1.x, closest.p1.y, closest.p1.z);
                            clashPos.setXYZ(1, closest.p2.x, closest.p2.y, closest.p2.z);
                            clashPos.needsUpdate = true;
                            clashLine.visible = true;
                        } else {
                            distanceHud.className = 'distance-hud';
                            distanceHud.textContent = en
                                ? `📏 Closest: ${closest.name.replace('R基', 'R').replace('(左)', '(L)')} = ${closest.distA.toFixed(2)} Å (Safe)`
                                : `📏 最近距離：${closest.name} = ${closest.distA.toFixed(2)} Å (安全)`;
                            clashSphere1.visible = false;
                            clashSphere2.visible = false;
                            clashLine.visible = false;
                        }
                    } else {
                        distanceHud.className = evalResult.status === 'clash' ? 'distance-hud danger' : 'distance-hud';
                        const resObj = AMINO_ACIDS[currentResidue];
                        const resTag = resObj ? (isEN() ? resObj.en : resObj.zh) : '';
                        distanceHud.textContent = showTripleHelix
                            ? (isEN() ? `🧬 Triple NeRF Helix (${phiDeg}°, ${psiDeg}°)` : `🧬 三股 NeRF 螺旋 (${phiDeg}°, ${psiDeg}°)`)
                            : (isEN() ? `🧬 12-Residue Chain · ${resTag} (${phiDeg}°, ${psiDeg}°)` : `🧬 12 殘基多肽鏈 · ${resTag} (${phiDeg}°, ${psiDeg}°)`);
                        buildPolypeptideScene(phiDeg, psiDeg, omegaDeg, currentAA);
                    }
                    requestRender(true);
                };

                refreshLabelsLang3DFn = () => {
                    const en = isEN();
                    const zhToEn = {
                        'Cα 關節': 'Cα Joint',
                        'N (氮)': 'N',
                        'O (氧)': 'O',
                        "C' (碳)": "C'",
                        'N端 (起點)': 'N-term',
                        'C端 (終點)': 'C-term',
                        'H (甘胺酸無側鏈)': 'H (Gly)',
                        'Pro 五元鎖死環': 'Pro 5-Ring'
                    };
                    const enToZh = Object.fromEntries(Object.entries(zhToEn).map(([k, v]) => [v, k]));
                    const map = en ? zhToEn : enToZh;
                    activeLabels.forEach(item => {
                        if (map[item.text]) {
                            item.text = map[item.text];
                            const sp = item.el.querySelector('span:last-child');
                            if (sp) sp.textContent = item.text;
                            item.w = 0;
                        }
                    });
                    if (viewMode === 'single' && rebuildSideChainFn) rebuildSideChainFn(currentResidue);
                    requestRender(true);
                };

                const handleViewportResize = () => {
                    const newW = threeContainer.clientWidth || 560;
                    const newH = threeContainer.clientHeight || 460;
                    camera.aspect = newW / newH;
                    camera.updateProjectionMatrix();
                    renderer.setSize(newW, newH);
                    if (typeof controls.handleResize === 'function') controls.handleResize();
                    syncLeaderCanvasSize();
                    requestRender(true);
                };
                window.addEventListener('resize', handleViewportResize);
                if (typeof ResizeObserver !== 'undefined') {
                    new ResizeObserver(handleViewportResize).observe(threeContainer);
                }

                export3DFn = () => {
                    renderer.render(scene, camera);
                    const dataUrl = renderer.domElement.toDataURL('image/png');
                    downloadDataURL(dataUrl, `protein_3d_${viewMode}_phi${currentPhi}_psi${currentPsi}.png`);
                };

                const clock = new THREE.Clock();
                const _prevCamPos = new THREE.Vector3();
                const _prevCamQuat = new THREE.Quaternion();
                const _prevTarget = new THREE.Vector3();

                requestRender = (updateLabels = true) => {
                    needsRender = true;
                    if (updateLabels) needsLabelUpdate = true;
                    if (!renderRequested && !document.hidden) {
                        renderRequested = true;
                        requestAnimationFrame(animate);
                    }
                };

                document.addEventListener('visibilitychange', () => {
                    if (!document.hidden) requestRender(true);
                });

                let lastLabelUpdateTime = 0;
                let lastPulseTime = 0;

                function animate() {
                    renderRequested = false;
                    if (document.hidden) return;

                    let stillMoving = false;

                    if (camAnim) {
                        const t = Math.min(1, (performance.now() - camAnim.startTime) / camAnim.duration);
                        const ease = 1 - Math.pow(1 - t, 3);
                        camera.position.lerpVectors(camAnim.startPos, camAnim.endPos, ease);
                        controls.target.lerpVectors(camAnim.startTarget, camAnim.endTarget, ease);
                        camera.up.lerpVectors(camAnim.startUp, camAnim.endUp, ease).normalize();
                        needsRender = true;
                        needsLabelUpdate = true;
                        if (t >= 1) camAnim = null;
                        else stillMoving = true;
                    }

                    _prevCamPos.copy(camera.position);
                    _prevCamQuat.copy(camera.quaternion);
                    _prevTarget.copy(controls.target);

                    controls.update();

                    const camMoved =
                        _prevCamPos.distanceToSquared(camera.position) > 1e-8 ||
                        _prevTarget.distanceToSquared(controls.target) > 1e-8 ||
                        (1 - Math.abs(_prevCamQuat.dot(camera.quaternion))) > 1e-8;
                    if (camMoved) {
                        needsRender = true;
                        needsLabelUpdate = true;
                        stillMoving = true;
                    }

                    const pdbPulsing = pdbSelectHalo && pdbSelectHalo.visible && performance.now() < pdbPulseUntil;
                    const pulsing = clashSphere1.visible || pdbPulsing;
                    if (pulsing) {
                        const now = performance.now();
                        if (now - lastPulseTime >= 66) {
                            lastPulseTime = now;
                            const elapsed = clock.getElapsedTime();
                            if (clashSphere1.visible) {
                                const pulse = 0.68 * (1 + Math.sin(elapsed * 8) * 0.16);
                                clashSphere1.scale.setScalar(pulse);
                                clashSphere2.scale.setScalar(pulse);
                            }
                            if (pdbPulsing) {
                                const p = 0.72 * (1 + Math.sin(elapsed * 6) * 0.18);
                                pdbSelectHalo.scale.setScalar(p);
                            }
                            needsRender = true;
                        }
                        stillMoving = true;
                    }

                    if (needsRender) {
                        renderer.render(scene, camera);
                        needsRender = false;
                    }
                    if (needsLabelUpdate) {
                        const now = performance.now();
                        if (!isMobilePerf || !stillMoving || (now - lastLabelUpdateTime >= 55)) {
                            updateSmartLabels();
                            lastLabelUpdateTime = now;
                            needsLabelUpdate = false;
                        }
                    }

                    if (stillMoving) {
                        renderRequested = true;
                        requestAnimationFrame(animate);
                    }
                }

                goToStep(0);
                applyURLParams();
                applyLanguage(currentLang);
                requestRender(true);

            } catch (err) {
                threeContainer.innerHTML = `<div style="color:#ff9f9a; padding:24px; font-size:0.9rem;">
                    <strong>3D 渲染引擎載入失敗：</strong>${err.message}
                </div>`;
            }
        }

        init3DEngine();
