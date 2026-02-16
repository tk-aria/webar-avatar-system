import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { AvatarAnimator } from './components/AvatarAnimator.js';
import { ChatManager } from './components/ChatManager.js';

class WebARApp {
  constructor() {
    this.container = document.getElementById('container');
    this.arButton = document.getElementById('ar-button');
    this.loading = document.getElementById('loading');
    this.status = document.getElementById('status');
    this.chatContainer = document.getElementById('chat-container');

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.vrm = null;
    this.animator = null;
    this.chatManager = null;
    this.clock = new THREE.Clock();
    this.isARSupported = false;
    this.avatarSummoned = false;
    this.webglSupported = true;

    this.init();
  }

  async init() {
    this.updateStatus('シーンを初期化中...');

    if (!this.checkWebGLSupport()) {
      this.webglSupported = false;
      this.setupFallbackMode();
      return;
    }

    this.setupScene();
    this.setupLights();
    await this.loadVRM();
    this.setupEventListeners();
    this.checkARSupport();
    this.animate();
  }

  checkWebGLSupport() {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      return !!gl;
    } catch (e) {
      return false;
    }
  }

  setupFallbackMode() {
    this.updateStatus('WebGL非対応 - フォールバックモード');
    this.loading.style.display = 'none';
    this.arButton.disabled = false;
    this.arButton.textContent = 'チャットを開始';

    // フォールバック用のアバター画像を表示
    const fallbackDiv = document.createElement('div');
    fallbackDiv.id = 'fallback-avatar';
    fallbackDiv.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:60vh;color:white;">
        <div style="font-size:120px;margin-bottom:20px;">👧</div>
        <div style="font-size:18px;">美少女アバター</div>
        <div style="font-size:12px;color:#888;margin-top:8px;">(WebGL非対応環境)</div>
      </div>
    `;
    fallbackDiv.style.display = 'none';
    this.container.appendChild(fallbackDiv);

    this.setupEventListeners();

    // ChatManagerをフォールバックモードで初期化
    this.chatManager = new ChatManager(null, null);
    this.chatManager.init();
  }

  setupScene() {
    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.01,
      20
    );
    this.camera.position.set(0, 1.2, 2);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.xr.enabled = true;
    this.container.appendChild(this.renderer.domElement);
  }

  setupLights() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 2, 1);
    this.scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(-1, 1, -1);
    this.scene.add(fillLight);
  }

  async loadVRM() {
    this.updateStatus('VRMモデルを読み込み中...');

    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));

    try {
      const gltf = await loader.loadAsync('/models/AvatarSample_A.vrm');
      this.vrm = gltf.userData.vrm;

      VRMUtils.removeUnnecessaryVertices(this.vrm.scene);
      VRMUtils.removeUnnecessaryJoints(this.vrm.scene);

      this.vrm.scene.visible = false;
      this.vrm.scene.position.set(0, 0, -1.5);
      // VRMは正面向き（rotation.y = 0）で配置
      this.vrm.scene.rotation.y = 0;
      this.scene.add(this.vrm.scene);

      this.animator = new AvatarAnimator(this.vrm);

      this.chatManager = new ChatManager(this.vrm, this.animator);
      this.chatManager.init();

      this.updateStatus('準備完了');
      this.loading.style.display = 'none';
      this.arButton.disabled = false;

    } catch (error) {
      console.error('VRM load error:', error);
      this.updateStatus('モデル読み込みエラー');
    }
  }

  checkARSupport() {
    if ('xr' in navigator) {
      navigator.xr.isSessionSupported('immersive-ar').then((supported) => {
        this.isARSupported = supported;
        if (supported) {
          this.arButton.textContent = 'ARでアバターを召喚';
        } else {
          this.arButton.textContent = 'アバターを召喚';
        }
      });
    } else {
      this.arButton.textContent = 'アバターを召喚';
    }
  }

  setupEventListeners() {
    window.addEventListener('resize', () => this.onResize());

    this.arButton.addEventListener('click', () => this.summonAvatar());

    this.container.addEventListener('touchstart', (e) => {
      if (this.avatarSummoned && e.touches.length === 1) {
        this.handleTouch(e);
      }
    });
  }

  async summonAvatar() {
    if (!this.webglSupported) {
      this.showFallbackAvatar();
      return;
    }

    if (this.isARSupported) {
      await this.startARSession();
    } else {
      this.startNonARMode();
    }
  }

  showFallbackAvatar() {
    const fallbackDiv = document.getElementById('fallback-avatar');
    if (fallbackDiv) {
      fallbackDiv.style.display = 'block';
    }
    this.avatarSummoned = true;
    this.arButton.style.display = 'none';
    this.chatContainer.classList.add('active');
    this.updateStatus('アバター召喚完了！');
  }

  async startARSession() {
    try {
      const session = await navigator.xr.requestSession('immersive-ar', {
        requiredFeatures: ['hit-test', 'local-floor'],
        optionalFeatures: ['dom-overlay'],
        domOverlay: { root: document.body }
      });

      this.renderer.xr.setReferenceSpaceType('local-floor');
      await this.renderer.xr.setSession(session);

      this.showAvatar();

      session.addEventListener('end', () => {
        this.hideAvatar();
      });

    } catch (error) {
      console.error('AR session error:', error);
      this.startNonARMode();
    }
  }

  startNonARMode() {
    this.scene.background = new THREE.Color(0x1a1a2e);
    this.showAvatar();
  }

  showAvatar() {
    if (!this.vrm) return;

    this.vrm.scene.visible = true;
    this.avatarSummoned = true;
    this.arButton.style.display = 'none';
    this.chatContainer.classList.add('active');

    this.animator.playWaveAnimation();
    this.updateStatus('アバター召喚完了！');
  }

  hideAvatar() {
    if (!this.vrm) return;

    this.vrm.scene.visible = false;
    this.avatarSummoned = false;
    this.arButton.style.display = 'block';
    this.chatContainer.classList.remove('active');
    this.scene.background = null;
  }

  handleTouch(event) {
    // Future: implement touch-based interaction
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  updateStatus(text) {
    this.status.textContent = text;
  }

  animate() {
    this.renderer.setAnimationLoop((time, frame) => {
      const delta = this.clock.getDelta();

      if (this.vrm) {
        this.vrm.update(delta);
      }

      if (this.animator) {
        this.animator.update(delta);
      }

      this.renderer.render(this.scene, this.camera);
    });
  }
}

new WebARApp();
