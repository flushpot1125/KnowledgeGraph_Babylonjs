import {
  Observer,
  Ray,
  Scene,
  Vector3,
  WebXRDefaultExperience,
  WebXRState,
} from '@babylonjs/core';
import type { SelectionManager } from '../interaction/SelectionManager';
import type { VRControlPanel } from '../ui/VRControlPanel';

export class XRManager {
  private xrExperience: WebXRDefaultExperience | null = null;
  private scene: Scene;
  private isXRSupported: boolean = false;
  private selectionManager: SelectionManager | null = null;
  private vrControlPanel: VRControlPanel | null = null;
  private controllerAxes: Map<string, { x: number; y: number }> = new Map();
  private leftXButtonPressed: Map<string, boolean> = new Map();
  private beforeRenderObserver: Observer<Scene> | null = null;
  private locomotionSpeed = 2.4;
  private locomotionThreshold = 0.15;
  private panelSummonDistance = 1.35;
  private panelSummonHeightOffset = -0.12;

  constructor(scene: Scene) {
    this.scene = scene;
  }

  setSelectionManager(selectionManager: SelectionManager | null): void {
    this.selectionManager = selectionManager;
  }

  setVRControlPanel(panel: VRControlPanel | null): void {
    this.vrControlPanel = panel;
  }

  async initialize(): Promise<boolean> {
    try {
      // WebXRサポート確認
      const supported = await WebXRDefaultExperience.CreateAsync(this.scene, {
        floorMeshes: [], // 床メッシュ（必要に応じて追加）
        optionalFeatures: true,
      });

      if (supported) {
        this.xrExperience = supported;
        this.isXRSupported = true;
        this.setupXRFeatures();
        return true;
      }

      console.warn('WebXR is not supported in this browser');
      return false;
    } catch (error) {
      console.warn('WebXR initialization failed:', error);
      return false;
    }
  }

  private setupXRFeatures(): void {
    if (!this.xrExperience) return;

    const xr = this.xrExperience;

    // XR状態の変更を監視
    xr.baseExperience.onStateChangedObservable.add((state) => {
      switch (state) {
        case WebXRState.IN_XR:
          console.log('XR session started');
          this.onEnterXR();
          break;
        case WebXRState.NOT_IN_XR:
          console.log('XR session ended');
          this.onExitXR();
          break;
      }
    });

    this.beforeRenderObserver = this.scene.onBeforeRenderObservable.add(() => {
      this.updateLocomotion();
    });

    // コントローラー接続時の処理
    xr.input.onControllerAddedObservable.add((controller) => {
      console.log('Controller added:', controller.uniqueId);

      controller.onDisposeObservable.add(() => {
        this.controllerAxes.delete(controller.uniqueId);
        this.leftXButtonPressed.delete(controller.uniqueId);
      });
      
      // コントローラーのボタンイベント設定
      controller.onMotionControllerInitObservable.add((motionController) => {
        const thumbstickComponent = motionController.getComponentOfType('thumbstick');
        if (thumbstickComponent) {
          thumbstickComponent.onAxisValueChangedObservable.add((axesData) => {
            this.controllerAxes.set(controller.uniqueId, {
              x: axesData.x,
              y: axesData.y,
            });
          });
        }

        if (controller.inputSource.handedness === 'left') {
          const xButtonComponent = motionController.getComponent('x-button');
          if (xButtonComponent) {
            xButtonComponent.onButtonStateChangedObservable.add((component) => {
              const previous = this.leftXButtonPressed.get(controller.uniqueId) ?? false;
              const current = component.pressed;

              if (current && !previous) {
                this.toggleSummonPanel();
              }

              this.leftXButtonPressed.set(controller.uniqueId, current);
            });
          }
        }

        // トリガーボタンの設定
        const triggerComponent = motionController.getComponent('xr-standard-trigger');
        if (triggerComponent) {
          triggerComponent.onButtonStateChangedObservable.add((component) => {
            if (component.pressed) {
              // トリガー押下時の処理（選択処理などで使用）
              this.onTriggerPressed(controller);
            }
          });
        }
      });
    });
  }

  private onEnterXR(): void {
    // XRセッション開始時の処理
    console.log('Entered XR mode');
    if (this.vrControlPanel) {
      this.vrControlPanel.hide();
    }
  }

  private onExitXR(): void {
    // XRセッション終了時の処理
    console.log('Exited XR mode');
    this.controllerAxes.clear();
    this.leftXButtonPressed.clear();
    if (this.vrControlPanel) {
      this.vrControlPanel.hide();
    }
  }

  private toggleSummonPanel(): void {
    if (!this.xrExperience || !this.vrControlPanel) {
      return;
    }

    if (this.vrControlPanel.isPanelVisible()) {
      this.vrControlPanel.hide();
      return;
    }

    const xrCamera = this.xrExperience.baseExperience.camera;
    if (!xrCamera) {
      return;
    }

    const forward = xrCamera.getDirection(new Vector3(0, 0, 1));
    forward.y = 0;
    if (forward.lengthSquared() > 0.0001) {
      forward.normalize();
    }

    const summonPosition = xrCamera.position.add(forward.scale(this.panelSummonDistance));
    summonPosition.y += this.panelSummonHeightOffset;
    this.vrControlPanel.showAt(summonPosition, xrCamera.position.clone());
  }

  private onTriggerPressed(controller: any): void {
    const ray = new Ray(Vector3.Zero(), new Vector3(0, 0, 1));
    controller.getWorldPointerRayToRef(ray);

    if (this.vrControlPanel && this.vrControlPanel.isPanelVisible()) {
      const panelPick = this.scene.pickWithRay(ray, (mesh) => Boolean(mesh.metadata?.action));
      if (panelPick?.hit && panelPick.pickedMesh && this.vrControlPanel.handleRayPick(panelPick.pickedMesh)) {
        return;
      }
    }

    if (this.selectionManager && this.selectionManager.selectByRay(ray)) {
      return;
    }

    console.log('Trigger pressed on controller:', controller.uniqueId);
  }

  private updateLocomotion(): void {
    if (!this.xrExperience || this.xrExperience.baseExperience.state !== WebXRState.IN_XR) {
      return;
    }

    const xrCamera = this.xrExperience.baseExperience.camera;
    if (!xrCamera) {
      return;
    }

    let moveX = 0;
    let moveY = 0;

    for (const axes of this.controllerAxes.values()) {
      if (Math.abs(axes.x) >= this.locomotionThreshold) {
        moveX += axes.x;
      }
      if (Math.abs(axes.y) >= this.locomotionThreshold) {
        moveY += -axes.y;
      }
    }

    if (moveX === 0 && moveY === 0) {
      return;
    }

    const forward = xrCamera.getDirection(new Vector3(0, 0, 1));
    forward.y = 0;
    if (forward.lengthSquared() > 0.0001) {
      forward.normalize();
    }

    const right = xrCamera.getDirection(new Vector3(1, 0, 0));
    right.y = 0;
    if (right.lengthSquared() > 0.0001) {
      right.normalize();
    }

    const movement = forward.scale(moveY).add(right.scale(moveX));
    movement.y = 0;
    if (movement.lengthSquared() > 1) {
      movement.normalize();
    }

    const deltaSeconds = this.scene.getEngine().getDeltaTime() * 0.001;
    xrCamera.position.addInPlace(movement.scale(this.locomotionSpeed * deltaSeconds));
  }

  getXRExperience(): WebXRDefaultExperience | null {
    return this.xrExperience;
  }

  isSupported(): boolean {
    return this.isXRSupported;
  }

  dispose(): void {
    if (this.beforeRenderObserver) {
      this.scene.onBeforeRenderObservable.remove(this.beforeRenderObserver);
      this.beforeRenderObserver = null;
    }
    if (this.xrExperience) {
      this.xrExperience.baseExperience.dispose();
    }
  }
}
