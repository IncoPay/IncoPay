declare module 'three' {
  export class WebGLRenderer {
    domElement: HTMLCanvasElement;
    constructor(params?: any);
    setSize(width: number, height: number, updateStyle?: boolean): void;
    setPixelRatio(value: number): void;
    setClearColor(color: number, alpha?: number): void;
    render(scene: Scene, camera: OrthographicCamera): void;
    dispose(): void;
    forceContextLoss(): void;
  }
  export class ShaderMaterial {
    uniforms: { [key: string]: { value: any } };
    constructor(params?: any);
    dispose(): void;
  }
  export class Vector2 {
    constructor(x?: number, y?: number);
    set(x: number, y: number): this;
    copy(v: Vector2): this;
    lerp(v: Vector2, alpha: number): this;
  }
  export class Vector3 {
    constructor(x?: number, y?: number, z?: number);
    set(x: number, y: number, z: number): this;
    copy(v: Vector3): this;
  }
  export class Color {
    constructor(color?: string | number);
    r: number;
    g: number;
    b: number;
  }
  export class Scene {
    constructor();
    add(...args: any[]): this;
  }
  export class OrthographicCamera {
    constructor(
      left?: number,
      right?: number,
      top?: number,
      bottom?: number,
      near?: number,
      far?: number
    );
  }
  export class PlaneGeometry {
    constructor(width?: number, height?: number);
    dispose(): void;
  }
  export class Mesh {
    constructor(geometry?: any, material?: any);
  }
  export class Clock {
    constructor();
    getDelta(): number;
    elapsedTime: number;
  }
}
