/**
 * Умная Теплица - 3D Interactive Model Viewer (Three.js + GLB / GLTF / OBJ / MTL + OrbitControls)
 */

class GreenhouseViewer3D {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.model = null;
    this.materials = null;
    this.lights = {};
    this.maxDim = 20;
    this.isWireframe = false;
    this.lightMode = 'sunset'; // 'day', 'sunset', 'night'
    this.initialCamPos = null;

    this.init();
  }

  init() {
    this.setupScene();
    this.setupCamera();
    this.setupRenderer();
    this.setupControls();
    this.setupLights();
    this.setupGroundGrid();
    this.loadModel();
    this.setupEventListeners();
    this.setupUIControls();
    this.animate();
  }

  setupScene() {
    this.scene = new THREE.Scene();
    const isLight = document.documentElement.classList.contains('light');
    const bgColor = isLight ? 0xf8f6f0 : 0x16130f;
    this.scene.background = new THREE.Color(bgColor);
    this.scene.fog = new THREE.FogExp2(bgColor, 0.015);
  }

  updateTheme(theme) {
    if (!this.scene) return;
    const isLight = theme === 'light';
    const targetHex = isLight ? 0xf8f6f0 : 0x16130f;
    const targetColor = new THREE.Color(targetHex);

    if (this._themeAnimId) {
      cancelAnimationFrame(this._themeAnimId);
      this._themeAnimId = null;
    }

    const startColor = (this.scene.background && this.scene.background.isColor)
      ? this.scene.background.clone()
      : new THREE.Color(isLight ? 0x16130f : 0xf8f6f0);

    const duration = 500;
    const startTime = performance.now();

    const animateColor = (now) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      // Smooth cubic ease
      const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      const cur = startColor.clone().lerp(targetColor, ease);

      if (this.scene.background && this.scene.background.isColor) {
        this.scene.background.copy(cur);
      } else {
        this.scene.background = cur.clone();
      }

      if (this.scene.fog) {
        this.scene.fog.color.copy(cur);
      }

      if (t < 1) {
        this._themeAnimId = requestAnimationFrame(animateColor);
      } else {
        this._themeAnimId = null;
      }
    };

    this._themeAnimId = requestAnimationFrame(animateColor);
  }

  setupCamera() {
    const width = this.container.clientWidth || 800;
    const height = this.container.clientHeight || 550;
    const aspect = width / height;
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
    this.camera.position.set(25, 18, 28);
  }

  setupRenderer() {
    const width = this.container.clientWidth || 800;
    const height = this.container.clientHeight || 550;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Clear container and append canvas
    this.container.innerHTML = '';
    this.container.appendChild(this.renderer.domElement);
    this.renderer.domElement.id = 'canvas-3d';
  }

  setupControls() {
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.screenSpacePanning = true;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.02; // Prevent going below ground
    this.controls.enableZoom = true;
    this.controls.zoomSpeed = 1.6; // Быстрый и плавный зум колесиком мыши
    this.controls.minDistance = 0.8; // Позволяет приближаться вплотную и заглядывать внутрь теплицы
    this.controls.maxDistance = 250;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.8;
  }

  setupLights() {
    // Ambient soft fill (Clean daylight)
    this.lights.ambient = new THREE.AmbientLight(0xffffff, 0.95);
    this.scene.add(this.lights.ambient);

    // Main Sun Directional Light (Natural sunlight)
    this.lights.sun = new THREE.DirectionalLight(0xfffbf2, 1.4);
    this.lights.sun.position.set(30, 45, 25);
    this.lights.sun.castShadow = true;
    this.lights.sun.shadow.mapSize.width = 2048;
    this.lights.sun.shadow.mapSize.height = 2048;
    this.lights.sun.shadow.camera.near = 0.5;
    this.lights.sun.shadow.camera.far = 180;
    const d = 35;
    this.lights.sun.shadow.camera.left = -d;
    this.lights.sun.shadow.camera.right = d;
    this.lights.sun.shadow.camera.top = d;
    this.lights.sun.shadow.camera.bottom = -d;
    this.lights.sun.shadow.bias = -0.0005;
    this.scene.add(this.lights.sun);

    // Secondary fill light (sky tint)
    this.lights.skyFill = new THREE.DirectionalLight(0xdde6ee, 0.6);
    this.lights.skyFill.position.set(-25, 20, -20);
    this.scene.add(this.lights.skyFill);

    // Interior subtle fill light
    this.lights.interiorGlow = new THREE.PointLight(0xffffff, 0.4, 45, 1.2);
    this.lights.interiorGlow.position.set(0, 5, 0);
    this.scene.add(this.lights.interiorGlow);
  }

  setupGroundGrid() {
    // Soft neutral subtle grid on ground
    const grid = new THREE.GridHelper(80, 40, 0x6b7280, 0x2e2924);
    grid.position.y = -0.02;
    grid.material.opacity = 0.22;
    grid.material.transparent = true;
    this.scene.add(grid);

    // Soft ground plane for shadow reception
    const groundGeo = new THREE.PlaneGeometry(160, 160);
    const groundMat = new THREE.ShadowMaterial({ opacity: 0.35 });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.y = -0.03;
    groundMesh.receiveShadow = true;
    this.scene.add(groundMesh);
  }

  loadModel() {
    const loadingBar = document.getElementById('model-loading-bar');
    const loadingText = document.getElementById('model-loading-text');
    const loadingOverlay = document.getElementById('model-loading-overlay');

    if (loadingText) loadingText.textContent = 'Загрузка 3D модели (GLB)...';

    // 1. Приоритетная загрузка GLB модели
    if (typeof THREE.GLTFLoader === 'function') {
      const gltfLoader = new THREE.GLTFLoader();
      
      const glbCandidates = [
        'assets/model/greenhouse.glb'
      ];

      const tryLoadGlb = (index) => {
        if (index >= glbCandidates.length) {
          console.warn('Все пути к GLB исчерпаны, переключаюсь на OBJ/MTL fallback');
          this.loadObjFallback();
          return;
        }

        const url = glbCandidates[index];
        gltfLoader.load(
          url,
          (gltf) => {
            const object = gltf.scene || gltf.scenes[0];
            this.model = object;

            // Enable shadows & double sided
            object.traverse((child) => {
              if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                if (child.material) {
                  const mats = Array.isArray(child.material) ? child.material : [child.material];
                  mats.forEach(m => {
                    m.side = THREE.DoubleSide;
                    if (m.name && m.name.toLowerCase().includes('glass')) {
                      m.transparent = true;
                      m.opacity = 0.35;
                      m.roughness = 0.1;
                    }
                  });
                }
              }
            });

            // Center model at origin
            const box = new THREE.Box3().setFromObject(object);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());

            object.position.x = -center.x;
            object.position.y = -box.min.y; // Sit on ground
            object.position.z = -center.z;

            this.scene.add(object);

            // Set camera framing
            this.maxDim = Math.max(size.x, size.y, size.z) || 20;
            const camDistance = this.maxDim * 1.4;
            this.camera.position.set(camDistance * 0.9, camDistance * 0.5, camDistance * 0.9);
            this.camera.lookAt(0, this.maxDim * 0.2, 0);
            this.controls.target.set(0, this.maxDim * 0.2, 0);
            this.initialCamPos = this.camera.position.clone();
            this.controls.maxDistance = this.maxDim * 6;
            this.controls.minDistance = 0.8;
            this.controls.update();

            // Update stats HUD
            const polyCountEl = document.getElementById('hud-polycount');
            if (polyCountEl) {
              let triangles = 0;
              object.traverse((c) => {
                if (c.isMesh && c.geometry) {
                  if (c.geometry.index) {
                    triangles += c.geometry.index.count / 3;
                  } else if (c.geometry.attributes.position) {
                    triangles += c.geometry.attributes.position.count / 3;
                  }
                }
              });
              polyCountEl.textContent = `${Math.round(triangles).toLocaleString()} полигонов (GLB)`;
            }

            // Hide loading overlay smoothly
            if (loadingOverlay) {
              loadingOverlay.style.opacity = '0';
              setTimeout(() => { loadingOverlay.style.display = 'none'; }, 400);
            }

            setTimeout(() => this.onWindowResize(), 100);
          },
          (xhr) => {
            if (xhr.lengthComputable && loadingBar && loadingText) {
              const percent = Math.round((xhr.loaded / xhr.total) * 100);
              loadingBar.style.width = percent + '%';
              const mbLoaded = (xhr.loaded / (1024 * 1024)).toFixed(1);
              const mbTotal = (xhr.total / (1024 * 1024)).toFixed(1);
              loadingText.textContent = `Загрузка GLB модели: ${percent}% (${mbLoaded} / ${mbTotal} МБ)`;
            }
          },
          (err) => {
            console.warn(`Не удалось загрузить GLB по пути ${url}:`, err);
            tryLoadGlb(index + 1);
          }
        );
      };

      tryLoadGlb(0);
    } else {
      console.warn('THREE.GLTFLoader не найден, загружаю через OBJ/MTL');
      this.loadObjFallback();
    }
  }

  loadObjFallback() {
    const loadingBar = document.getElementById('model-loading-bar');
    const loadingText = document.getElementById('model-loading-text');
    const loadingOverlay = document.getElementById('model-loading-overlay');

    if (typeof THREE.MTLLoader !== 'function' || typeof THREE.OBJLoader !== 'function') {
      console.error('Загрузчики OBJ/MTL не найдены');
      if (loadingText) loadingText.textContent = 'Ошибка загрузки 3D компонентов';
      return;
    }

    const mtlLoader = new THREE.MTLLoader();
    mtlLoader.setPath('assets/model/');
    mtlLoader.load(
      'greenhouse.mtl',
      (materials) => {
        materials.preload();
        this.materials = materials;

        for (let matName in materials.materials) {
          const mat = materials.materials[matName];
          if (mat.name && mat.name.toLowerCase().includes('glass')) {
            mat.transparent = true;
            mat.opacity = 0.35;
            mat.roughness = 0.1;
            mat.metalness = 0.1;
            mat.side = THREE.DoubleSide;
          } else {
            mat.side = THREE.DoubleSide;
          }
        }

        const objLoader = new THREE.OBJLoader();
        objLoader.setMaterials(materials);
        objLoader.setPath('assets/model/');

        objLoader.load(
          'greenhouse.obj',
          (object) => {
            this.model = object;

            object.traverse((child) => {
              if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                if (child.material) {
                  child.material.side = THREE.DoubleSide;
                }
              }
            });

            const box = new THREE.Box3().setFromObject(object);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());

            object.position.x = -center.x;
            object.position.y = -box.min.y;
            object.position.z = -center.z;

            this.scene.add(object);

            this.maxDim = Math.max(size.x, size.y, size.z);
            const camDistance = this.maxDim * 1.4;
            this.camera.position.set(camDistance * 0.9, camDistance * 0.5, camDistance * 0.9);
            this.camera.lookAt(0, this.maxDim * 0.2, 0);
            this.controls.target.set(0, this.maxDim * 0.2, 0);
            this.initialCamPos = this.camera.position.clone();
            this.controls.maxDistance = this.maxDim * 6;
            this.controls.minDistance = 0.8;
            this.controls.update();

            const polyCountEl = document.getElementById('hud-polycount');
            if (polyCountEl) {
              let triangles = 0;
              object.traverse((c) => {
                if (c.isMesh && c.geometry) {
                  triangles += c.geometry.attributes.position.count / 3;
                }
              });
              polyCountEl.textContent = `${Math.round(triangles).toLocaleString()} полигонов (OBJ)`;
            }

            if (loadingOverlay) {
              loadingOverlay.style.opacity = '0';
              setTimeout(() => { loadingOverlay.style.display = 'none'; }, 400);
            }

            setTimeout(() => this.onWindowResize(), 100);
          },
          (xhr) => {
            if (xhr.lengthComputable && loadingBar && loadingText) {
              const percent = Math.round((xhr.loaded / xhr.total) * 100);
              loadingBar.style.width = percent + '%';
              loadingText.textContent = `Загрузка геометрии OBJ: ${percent}%`;
            }
          },
          (error) => {
            console.error('Error loading OBJ:', error);
            if (loadingText) loadingText.textContent = 'Ошибка загрузки 3D модели';
          }
        );
      },
      (xhr) => {
        if (loadingText) loadingText.textContent = 'Загрузка материалов...';
      },
      (error) => {
        console.error('Error loading MTL:', error);
      }
    );
  }

  setupUIControls() {
    const btnIso = document.getElementById('btn-view-iso');
    const btnTop = document.getElementById('btn-view-top');
    const btnFront = document.getElementById('btn-view-front');
    const btnReset = document.getElementById('btn-view-reset');

    if (btnIso) {
      btnIso.addEventListener('click', () => {
        this.setCameraView(this.maxDim * 1.1, this.maxDim * 0.6, this.maxDim * 1.1);
      });
    }

    if (btnTop) {
      btnTop.addEventListener('click', () => {
        this.setCameraView(0.01, this.maxDim * 1.6, 0.01);
      });
    }

    if (btnFront) {
      btnFront.addEventListener('click', () => {
        this.setCameraView(0, this.maxDim * 0.35, this.maxDim * 1.5);
      });
    }

    if (btnReset) {
      btnReset.addEventListener('click', () => {
        if (this.initialCamPos) {
          this.setCameraView(this.initialCamPos.x, this.initialCamPos.y, this.initialCamPos.z);
        }
      });
    }

    const btnRotate = document.getElementById('btn-toggle-rotate');
    if (btnRotate) {
      btnRotate.addEventListener('click', () => {
        this.controls.autoRotate = !this.controls.autoRotate;
        btnRotate.classList.toggle('bg-primary-container/30');
        btnRotate.classList.toggle('text-white');
      });
    }

    const btnWireframe = document.getElementById('btn-toggle-wireframe');
    if (btnWireframe) {
      btnWireframe.addEventListener('click', () => {
        this.isWireframe = !this.isWireframe;
        if (this.model) {
          this.model.traverse((child) => {
            if (child.isMesh && child.material) {
              if (Array.isArray(child.material)) {
                child.material.forEach(m => m.wireframe = this.isWireframe);
              } else {
                child.material.wireframe = this.isWireframe;
              }
            }
          });
        }
        btnWireframe.classList.toggle('bg-primary-container/30');
      });
    }

    const btnLight = document.getElementById('btn-toggle-light');
    if (btnLight) {
      btnLight.addEventListener('click', () => {
        this.toggleLightingMode();
      });
    }

    const btnZoomIn = document.getElementById('btn-zoom-in');
    if (btnZoomIn) {
      btnZoomIn.addEventListener('click', () => this.zoomIn());
    }

    const btnZoomOut = document.getElementById('btn-zoom-out');
    if (btnZoomOut) {
      btnZoomOut.addEventListener('click', () => this.zoomOut());
    }

    const btnFullscreen = document.getElementById('btn-toggle-fullscreen');
    const viewerCard = document.getElementById('viewer-card');
    if (btnFullscreen && viewerCard) {
      btnFullscreen.addEventListener('click', () => {
        if (!document.fullscreenElement) {
          viewerCard.requestFullscreen().catch(err => console.warn(err));
        } else {
          document.exitFullscreen();
        }
      });
    }
  }

  zoomIn() {
    if (!this.camera || !this.controls) return;
    const offset = this.camera.position.clone().sub(this.controls.target);
    const newDist = offset.length() * 0.82;
    if (newDist >= (this.controls.minDistance || 0.8)) {
      offset.multiplyScalar(0.82);
      this.camera.position.copy(this.controls.target).add(offset);
      this.controls.update();
    }
  }

  zoomOut() {
    if (!this.camera || !this.controls) return;
    const offset = this.camera.position.clone().sub(this.controls.target);
    const newDist = offset.length() * 1.22;
    if (newDist <= (this.controls.maxDistance || 300)) {
      offset.multiplyScalar(1.22);
      this.camera.position.copy(this.controls.target).add(offset);
      this.controls.update();
    }
  }

  setCameraView(x, y, z) {
    if (!this.camera || !this.controls) return;
    this.controls.autoRotate = false;
    
    const targetPos = new THREE.Vector3(x, y, z);
    const startPos = this.camera.position.clone();
    let progress = 0;
    
    const animateCam = () => {
      progress += 0.05;
      this.camera.position.lerpVectors(startPos, targetPos, progress);
      this.camera.lookAt(0, this.maxDim * 0.2, 0);
      this.controls.target.set(0, this.maxDim * 0.2, 0);
      if (progress < 1) {
        requestAnimationFrame(animateCam);
      }
    };
    animateCam();
  }

  toggleLightingMode() {
    const modes = ['sunset', 'day', 'night'];
    const nextIdx = (modes.indexOf(this.lightMode) + 1) % modes.length;
    this.lightMode = modes[nextIdx];

    const labelEl = document.getElementById('light-mode-label');

    if (this.lightMode === 'day') {
      this.scene.background = new THREE.Color(0x1a1c1d);
      this.lights.ambient.color.setHex(0xffffff);
      this.lights.ambient.intensity = 1.0;
      this.lights.sun.color.setHex(0xfff8ee);
      this.lights.sun.intensity = 2.0;
      this.lights.sun.position.set(20, 50, 20);
      this.renderer.toneMappingExposure = 1.25;
      if (labelEl) labelEl.textContent = 'День';
    } else if (this.lightMode === 'sunset') {
      this.scene.background = new THREE.Color(0x16130f);
      this.lights.ambient.color.setHex(0xffecd0);
      this.lights.ambient.intensity = 0.8;
      this.lights.sun.color.setHex(0xffbf69);
      this.lights.sun.intensity = 1.8;
      this.lights.sun.position.set(30, 35, 25);
      this.renderer.toneMappingExposure = 1.2;
      if (labelEl) labelEl.textContent = 'Закат (Осень)';
    } else if (this.lightMode === 'night') {
      this.scene.background = new THREE.Color(0x0a0c0e);
      this.lights.ambient.color.setHex(0x112233);
      this.lights.ambient.intensity = 0.3;
      this.lights.sun.color.setHex(0x334466);
      this.lights.sun.intensity = 0.5;
      this.lights.interiorGlow.intensity = 3.5;
      this.renderer.toneMappingExposure = 1.0;
      if (labelEl) labelEl.textContent = 'Ночь (LED)';
    }
  }

  setupEventListeners() {
    window.addEventListener('resize', () => this.onWindowResize());

    if (window.ResizeObserver && this.container) {
      const ro = new ResizeObserver(() => this.onWindowResize());
      ro.observe(this.container);
    }

    // Блокировка прокрутки веб-страницы при вращении колесика над 3D карточкой:
    // Гарантирует, что колесико мыши всегда приближает/отдаляет 3D модель, а не скроллит страницу
    const viewerCard = document.getElementById('viewer-card') || this.container;
    if (viewerCard) {
      viewerCard.addEventListener('wheel', (e) => {
        if (this.controls && this.renderer) {
          e.preventDefault();
        }
      }, { passive: false });
    }
  }

  onWindowResize() {
    if (!this.container || !this.renderer || !this.camera) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (width === 0 || height === 0) return;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    if (this.controls) this.controls.update();
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }
}

// Запуск 3D модели по требованию (не запускается сразу при входе)
window.launch3DViewer = function() {
  const startOverlay = document.getElementById('model-start-overlay');
  if (startOverlay) {
    startOverlay.style.opacity = '0';
    startOverlay.style.pointerEvents = 'none';
    setTimeout(() => { startOverlay.style.display = 'none'; }, 400);
  }
  if (!window.viewer3D && document.getElementById('3d-viewport')) {
    const loadingOverlay = document.getElementById('model-loading-overlay');
    if (loadingOverlay) {
      loadingOverlay.classList.remove('hidden');
      loadingOverlay.style.opacity = '1';
      loadingOverlay.style.display = 'flex';
    }
    window.viewer3D = new GreenhouseViewer3D('3d-viewport');
    window.greenhouseViewer = window.viewer3D;
  }
};

// Закрытие 3D модели (возврат стартового экрана)
window.close3DViewer = function() {
  const startOverlay = document.getElementById('model-start-overlay');
  if (startOverlay) {
    startOverlay.style.display = 'flex';
    requestAnimationFrame(() => {
      startOverlay.style.opacity = '1';
      startOverlay.style.pointerEvents = 'auto';
    });
  }
  const loadingOverlay = document.getElementById('model-loading-overlay');
  if (loadingOverlay) {
    loadingOverlay.style.display = 'none';
    loadingOverlay.classList.add('hidden');
  }
  if (window.viewer3D) {
    if (window.viewer3D.controls) {
      window.viewer3D.controls.autoRotate = false;
    }
    const rotBtn = document.getElementById('btn-toggle-rotate');
    if (rotBtn) {
      rotBtn.classList.remove('bg-primary-container/20', 'border-primary-container/50', 'shadow-[0_0_15px_rgba(232,141,35,0.35)]');
      rotBtn.classList.add('text-on-surface');
    }
    if (window.viewer3D.initialCamPos && typeof window.viewer3D.setCameraView === 'function') {
      window.viewer3D.setCameraView(window.viewer3D.initialCamPos.x, window.viewer3D.initialCamPos.y, window.viewer3D.initialCamPos.z);
    }
  }
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
  }
};

