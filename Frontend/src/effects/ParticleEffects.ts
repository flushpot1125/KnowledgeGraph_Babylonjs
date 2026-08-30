import {
  Scene,
  ParticleSystem,
  Texture,
  Color4,
  Vector3,
  Mesh,
} from '@babylonjs/core';

export class ParticleEffects {
  private scene: Scene;
  private activeParticleSystems: Map<string, ParticleSystem> = new Map();

  constructor(scene: Scene) {
    this.scene = scene;
  }

  // ノード周辺の微粒子エフェクト
  createNodeParticles(nodeId: string, position: Vector3, emitter: Mesh): void {
    const particleSystem = new ParticleSystem(`particles_${nodeId}`, 200, this.scene);

    // パーティクルのテクスチャ（簡易的な円形）
    particleSystem.particleTexture = this.createParticleTexture();

    // エミッター設定
    particleSystem.emitter = emitter;
    particleSystem.minEmitBox = new Vector3(-0.2, -0.2, -0.2);
    particleSystem.maxEmitBox = new Vector3(0.2, 0.2, 0.2);

    // パーティクルの色（シアン系）
    particleSystem.color1 = new Color4(0, 0.8, 1, 0.8);
    particleSystem.color2 = new Color4(0.5, 0.5, 1, 0.4);
    particleSystem.colorDead = new Color4(0, 0.2, 0.5, 0);

    // パーティクルのサイズ
    particleSystem.minSize = 0.02;
    particleSystem.maxSize = 0.08;

    // パーティクルのライフタイム
    particleSystem.minLifeTime = 1.0;
    particleSystem.maxLifeTime = 3.0;

    // エミッション速度
    particleSystem.emitRate = 20;

    // パーティクルの速度
    particleSystem.direction1 = new Vector3(-0.2, 0.1, -0.2);
    particleSystem.direction2 = new Vector3(0.2, 0.3, 0.2);
    particleSystem.minEmitPower = 0.1;
    particleSystem.maxEmitPower = 0.3;

    // 重力
    particleSystem.gravity = new Vector3(0, -0.1, 0);

    // ブレンドモード
    particleSystem.blendMode = ParticleSystem.BLENDMODE_ADD;

    particleSystem.start();
    this.activeParticleSystems.set(nodeId, particleSystem);
  }

  // 選択時の爆発的エフェクト
  createSelectionBurst(position: Vector3): void {
    const burstSystem = new ParticleSystem('burst', 500, this.scene);

    burstSystem.particleTexture = this.createParticleTexture();
    burstSystem.emitter = position;

    // カラフルなバーストエフェクト
    burstSystem.color1 = new Color4(0, 1, 1, 1);
    burstSystem.color2 = new Color4(1, 0.5, 0, 1);
    burstSystem.colorDead = new Color4(0, 0, 0, 0);

    burstSystem.minSize = 0.05;
    burstSystem.maxSize = 0.15;

    burstSystem.minLifeTime = 0.3;
    burstSystem.maxLifeTime = 0.8;

    burstSystem.emitRate = 1000;

    // 放射状に広がる
    burstSystem.createSphereEmitter(1);
    burstSystem.minEmitPower = 2;
    burstSystem.maxEmitPower = 5;

    burstSystem.blendMode = ParticleSystem.BLENDMODE_ADD;

    // 短時間で停止
    burstSystem.start();
    setTimeout(() => {
      burstSystem.stop();
      setTimeout(() => burstSystem.dispose(), 1000);
    }, 200);
  }

  // パーティクルテクスチャ作成（簡易的な円形）
  private createParticleTexture(): Texture {
    // 既存のテクスチャがあれば再利用
    const existingTexture = this.scene.getTextureByName('particleTexture');
    if (existingTexture) {
      return existingTexture as Texture;
    }

    // データURLで簡易的な円形テクスチャを作成
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    // グラデーション円を描画
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.5)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);

    const dataUrl = canvas.toDataURL();
    const texture = new Texture(dataUrl, this.scene, false, false);
    texture.name = 'particleTexture';

    return texture;
  }

  // パーティクルシステムを停止
  stopParticles(nodeId: string): void {
    const system = this.activeParticleSystems.get(nodeId);
    if (system) {
      system.stop();
      system.dispose();
      this.activeParticleSystems.delete(nodeId);
    }
  }

  // すべてのパーティクルを削除
  dispose(): void {
    this.activeParticleSystems.forEach(system => {
      system.stop();
      system.dispose();
    });
    this.activeParticleSystems.clear();
  }
}
