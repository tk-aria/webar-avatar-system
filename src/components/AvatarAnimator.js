export class AvatarAnimator {
  constructor(vrm) {
    this.vrm = vrm;
    this.currentAnimation = null;
    this.animationTime = 0;
    this.isAnimating = false;

    this.blinkTimer = 0;
    this.blinkInterval = 3 + Math.random() * 2;
    this.isBlinking = false;

    this.breatheTime = 0;
  }

  update(delta) {
    this.updateBlink(delta);
    this.updateBreathing(delta);

    if (this.isAnimating && this.currentAnimation) {
      this.animationTime += delta;
      this.currentAnimation(this.animationTime, delta);
    }
  }

  updateBlink(delta) {
    this.blinkTimer += delta;

    if (!this.isBlinking && this.blinkTimer >= this.blinkInterval) {
      this.isBlinking = true;
      this.blinkTimer = 0;
      this.blinkInterval = 3 + Math.random() * 2;
    }

    if (this.isBlinking) {
      const blinkProgress = this.blinkTimer / 0.15;

      if (blinkProgress < 0.5) {
        const closeAmount = blinkProgress * 2;
        this.setExpression('blink', closeAmount);
      } else if (blinkProgress < 1) {
        const openAmount = 1 - (blinkProgress - 0.5) * 2;
        this.setExpression('blink', openAmount);
      } else {
        this.setExpression('blink', 0);
        this.isBlinking = false;
        this.blinkTimer = 0;
      }
    }
  }

  updateBreathing(delta) {
    this.breatheTime += delta;
    const breathe = Math.sin(this.breatheTime * 1.5) * 0.002;

    if (this.vrm.humanoid) {
      const chest = this.vrm.humanoid.getNormalizedBoneNode('chest');
      if (chest) {
        chest.position.y = breathe;
      }
    }
  }

  setExpression(name, value) {
    if (this.vrm.expressionManager) {
      this.vrm.expressionManager.setValue(name, value);
    }
  }

  playWaveAnimation() {
    this.isAnimating = true;
    this.animationTime = 0;

    const humanoid = this.vrm.humanoid;
    if (!humanoid) {
      console.warn('No humanoid found');
      return;
    }

    const initialPose = this.captureCurrentPose();

    this.currentAnimation = (time, delta) => {
      const duration = 2.5;

      if (time > duration) {
        this.returnToIdlePose(initialPose);
        this.isAnimating = false;
        this.currentAnimation = null;
        return;
      }

      const rightUpperArm = humanoid.getNormalizedBoneNode('rightUpperArm');
      const rightLowerArm = humanoid.getNormalizedBoneNode('rightLowerArm');
      const rightHand = humanoid.getNormalizedBoneNode('rightHand');

      if (time < 0.5) {
        const progress = time / 0.5;
        const ease = this.easeOutQuad(progress);

        if (rightUpperArm) {
          rightUpperArm.rotation.z = -Math.PI * 0.7 * ease;
          rightUpperArm.rotation.x = -Math.PI * 0.1 * ease;
        }
        if (rightLowerArm) {
          rightLowerArm.rotation.y = Math.PI * 0.2 * ease;
        }
      } else if (time < 2.0) {
        const waveTime = time - 0.5;
        const waveAngle = Math.sin(waveTime * 8) * 0.3;

        if (rightHand) {
          rightHand.rotation.z = waveAngle;
        }

        this.setExpression('happy', 0.7);
      } else {
        const returnProgress = (time - 2.0) / 0.5;
        const ease = this.easeInQuad(returnProgress);

        if (rightUpperArm) {
          rightUpperArm.rotation.z = -Math.PI * 0.7 * (1 - ease);
          rightUpperArm.rotation.x = -Math.PI * 0.1 * (1 - ease);
        }
        if (rightLowerArm) {
          rightLowerArm.rotation.y = Math.PI * 0.2 * (1 - ease);
        }
        if (rightHand) {
          rightHand.rotation.z = 0;
        }

        this.setExpression('happy', 0.7 * (1 - ease));
      }
    };
  }

  playTalkingAnimation() {
    this.setExpression('happy', 0.3);
  }

  stopTalkingAnimation() {
    this.setExpression('happy', 0);
  }

  captureCurrentPose() {
    const pose = {};
    const boneNames = [
      'rightUpperArm', 'rightLowerArm', 'rightHand',
      'leftUpperArm', 'leftLowerArm', 'leftHand'
    ];

    for (const name of boneNames) {
      const bone = this.vrm.humanoid?.getNormalizedBoneNode(name);
      if (bone) {
        pose[name] = {
          x: bone.rotation.x,
          y: bone.rotation.y,
          z: bone.rotation.z
        };
      }
    }

    return pose;
  }

  returnToIdlePose(initialPose) {
    for (const [name, rotation] of Object.entries(initialPose)) {
      const bone = this.vrm.humanoid?.getNormalizedBoneNode(name);
      if (bone) {
        bone.rotation.x = rotation.x;
        bone.rotation.y = rotation.y;
        bone.rotation.z = rotation.z;
      }
    }
  }

  easeOutQuad(t) {
    return t * (2 - t);
  }

  easeInQuad(t) {
    return t * t;
  }
}
