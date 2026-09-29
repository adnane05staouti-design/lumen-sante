import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  PerspectiveCamera,
  Points,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
import { buildShape, type ShapeName } from "./shapes";


const vertex = /* glsl */ `
  attribute vec3 aFrom;
  attribute vec3 aTo;
  attribute float aRand;
  attribute vec3 aColor;
  uniform float uProgress;
  uniform float uTime;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform vec3 uMouse;
  uniform float uMouseForce;
  uniform vec2 uBurstOrigin;
  uniform float uBurstTime;
  uniform float uScatter;
  varying vec3 vColor;
  varying float vTwinkle;

  void main() {
    // staggered morph: every particle leaves at a slightly different moment
    float t = clamp(uProgress * 1.4 - aRand * 0.4, 0.0, 1.0);
    t = t * t * (3.0 - 2.0 * t);
    vec3 p = mix(aFrom, aTo, t);
    // particles swirl outwards in the middle of a morph
    float mid = sin(t * 3.14159);
    p += normalize(p + 0.0001) * mid * (aRand - 0.25) * 0.55;
    // scroll speed scatters the particles a little (the shape "breathes" with the scroll)
    p += normalize(p + 0.0001) * (aRand - 0.5) * uScatter;
    // idle breathing
    p += 0.018 * vec3(sin(uTime * 1.3 + aRand * 40.0), cos(uTime * 1.1 + aRand * 30.0), sin(uTime * 0.9 + aRand * 20.0));

    vec4 world = modelMatrix * vec4(p, 1.0);
    // pointer pushes nearby particles away
    vec2 d = world.xy - uMouse.xy;
    float dist = length(d);
    world.xy += normalize(d + 0.0001) * uMouseForce * smoothstep(1.3, 0.0, dist) * 0.45;
    // click: a shock wave rings out from the pointer
    vec2 b = world.xy - uBurstOrigin;
    float bd = length(b);
    float wave = smoothstep(0.7, 0.0, abs(bd - uBurstTime * 5.5)) * exp(-uBurstTime * 1.6);
    world.xy += normalize(b + 0.0001) * wave * 0.7;
    world.z += wave * (aRand - 0.3) * 1.4;

    vec4 mv = viewMatrix * world;
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * uPixelRatio * (0.55 + aRand * 0.9) / -mv.z;
    vColor = aColor;
    vTwinkle = 0.65 + 0.35 * sin(uTime * 2.2 + aRand * 60.0);
  }
`;

const fragment = /* glsl */ `
  uniform float uOpacity;
  varying vec3 vColor;
  varying float vTwinkle;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    a *= a;
    gl_FragColor = vec4(vColor, a * vTwinkle * uOpacity);
  }
`;

/** Shapes that face the viewer (they only sway); the others rotate freely. */
const FACING: ShapeName[] = ["tooth", "eye", "bear", "heart", "skin", "brain"];

/**
 * One WebGL canvas behind the whole page: thousands of particles that morph
 * from one medical shape to another as the visitor scrolls.
 * Single draw call, GPU-animated: stays smooth even on modest laptops.
 */
export class ParticleEngine {
  private renderer: WebGLRenderer;
  private scene = new Scene();
  private camera = new PerspectiveCamera(40, 1, 0.1, 50);
  private group = new Group();
  private geometry = new BufferGeometry();
  private material: ShaderMaterial;
  private count: number;
  private rand: Float32Array;
  private from: Float32Array;
  private to: Float32Array;
  private cache = new Map<ShapeName, Float32Array>();
  private shape: ShapeName = "field";
  private place = { x: 0, y: 0, size: 0.7 };
  private opacity = 1;
  private progress = 1;
  private frame = 0;
  private last = 0;
  private time = 0;
  private pointer = { x: 0, y: 0, force: 0 };
  private spin = 0;
  private sway = 0;
  private velocity = 0;
  private width = 1;
  private height = 1;

  constructor(canvas: HTMLCanvasElement, opts: { count: number; colors: [string, string]; dpr: number }) {
    this.count = opts.count;
    this.renderer = new WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(opts.dpr);
    this.camera.position.set(0, 0, 7);
    this.scene.add(this.group);

    const n = this.count;
    this.rand = new Float32Array(n);
    const colors = new Float32Array(n * 3);
    const a = new Color(opts.colors[0]);
    const b = new Color(opts.colors[1]);
    const c = new Color();
    for (let i = 0; i < n; i++) {
      this.rand[i] = Math.random();
      const r = Math.random();
      if (r < 0.06) c.set("#ffffff");
      else c.copy(a).lerp(b, Math.pow(Math.random(), 1.4));
      colors.set([c.r, c.g, c.b], i * 3);
    }
    this.from = this.getShape("field").slice();
    this.to = this.from.slice();

    this.geometry.setAttribute("position", new BufferAttribute(this.to, 3)); // used only for bounds
    this.geometry.setAttribute("aFrom", new BufferAttribute(this.from, 3));
    this.geometry.setAttribute("aTo", new BufferAttribute(this.to, 3));
    this.geometry.setAttribute("aRand", new BufferAttribute(this.rand, 1));
    this.geometry.setAttribute("aColor", new BufferAttribute(colors, 3));

    this.material = new ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: {
        uProgress: { value: 1 },
        uTime: { value: 0 },
        uSize: { value: 30 },
        uPixelRatio: { value: opts.dpr },
        uMouse: { value: new Vector3(99, 99, 0) },
        uMouseForce: { value: 0 },
        uOpacity: { value: 0 },
        uBurstOrigin: { value: new Vector2(0, 0) },
        uBurstTime: { value: 99 },
        uScatter: { value: 0 },
      },
    });
    const points = new Points(this.geometry, this.material);
    points.frustumCulled = false;
    this.group.add(points);
  }

  private getShape(name: ShapeName) {
    let s = this.cache.get(name);
    if (!s) {
      s = buildShape(name, this.count);
      this.cache.set(name, s);
    }
    return s;
  }

  /** Morph to a new shape; the current (possibly mid-morph) state becomes the start. */
  setTarget(shape: ShapeName, opacity: number) {
    this.opacity = opacity;
    if (shape === this.shape) return;
    this.shape = shape;
    // keep angles small so a facing shape never unwinds several turns
    const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
    this.group.rotation.y = wrap(this.group.rotation.y);
    this.spin = wrap(this.spin);
    const p = this.progress;
    for (let i = 0; i < this.count; i++) {
      let t = Math.min(1, Math.max(0, p * 1.4 - this.rand[i] * 0.4));
      t = t * t * (3 - 2 * t);
      for (let k = 0; k < 3; k++) {
        const j = i * 3 + k;
        this.from[j] = this.from[j] + (this.to[j] - this.from[j]) * t;
      }
    }
    this.to.set(this.getShape(shape));
    (this.geometry.getAttribute("aFrom") as BufferAttribute).needsUpdate = true;
    (this.geometry.getAttribute("aTo") as BufferAttribute).needsUpdate = true;
    this.progress = 0;
  }

  /** Where the shape sits: centre in normalized screen coords (-1…1) and size as a fraction of the screen height. */
  setPlacement(x: number, y: number, size: number) {
    this.place.x = x;
    this.place.y = y;
    this.place.size = size;
  }

  setPointer(x: number, y: number) {
    this.pointer.x = x;
    this.pointer.y = y;
    this.pointer.force = 1;
  }

  addScrollVelocity(v: number) {
    this.velocity += v;
  }

  /** Click / tap: shock wave from that point (normalized screen coords) + a spin kick. */
  burst(x: number, y: number) {
    const halfH = Math.tan((this.camera.fov * Math.PI) / 360) * this.camera.position.z;
    const halfW = halfH * this.camera.aspect;
    this.material.uniforms.uBurstOrigin.value.set(x * halfW, y * halfH);
    this.material.uniforms.uBurstTime.value = 0;
    this.velocity += (x >= 0 ? 1 : -1) * 900;
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  start() {
    const loop = (now: number) => {
      this.frame = requestAnimationFrame(loop);
      if (document.hidden) return;
      const dt = Math.min(0.05, (now - (this.last || now)) / 1000);
      this.last = now;
      this.tick(dt);
      this.renderer.render(this.scene, this.camera);
    };
    this.frame = requestAnimationFrame(loop);
  }

  private tick(dt: number) {
    const u = this.material.uniforms;
    this.time += dt;
    u.uTime.value = this.time;
    this.progress = Math.min(1, this.progress + dt / 0.85);
    u.uBurstTime.value += dt;
    const scatter = Math.min(0.55, Math.abs(this.velocity) * 0.0011);
    u.uScatter.value += (scatter - u.uScatter.value) * Math.min(1, dt * 6);
    u.uProgress.value = this.progress;
    // softer on phones, where the particles sit behind the text
    const opacity = this.opacity * (this.width < 768 ? 0.6 : 1);
    u.uOpacity.value += (opacity - u.uOpacity.value) * Math.min(1, dt * 3);

    // placement: the shape follows the box of the active section (it scrolls with the page)
    const halfH = Math.tan((this.camera.fov * Math.PI) / 360) * this.camera.position.z;
    const halfW = halfH * this.camera.aspect;
    const g = this.group;
    const k = Math.min(1, dt * 4);
    g.position.x += (this.place.x * halfW - g.position.x) * k;
    g.position.y += (this.place.y * halfH - g.position.y) * k;
    const targetScale = Math.max(0.25, (this.place.size * halfH) / 1.8);
    g.scale.setScalar(g.scale.x + (targetScale - g.scale.x) * k);

    // rotation: free spin or gentle sway, plus pointer parallax and scroll inertia
    this.velocity *= Math.pow(0.02, dt);
    const facing = FACING.includes(this.shape);
    this.spin += dt * (facing ? 0 : 0.12) + this.velocity * 0.0009;
    this.sway += dt;
    const baseY = facing ? Math.sin(this.sway * 0.35) * 0.35 + this.spin * 0.3 : this.spin;
    const targetRy = baseY + this.pointer.x * 0.35;
    const targetRx = -this.pointer.y * 0.2 + (facing ? 0 : Math.sin(this.sway * 0.2) * 0.15);
    g.rotation.y += (targetRy - g.rotation.y) * Math.min(1, dt * 3);
    g.rotation.x += (targetRx - g.rotation.x) * Math.min(1, dt * 3);
    if (facing) this.spin *= Math.pow(0.3, dt);

    u.uMouse.value.set(this.pointer.x * halfW, this.pointer.y * halfH, 0);
    this.pointer.force *= Math.pow(0.25, dt);
    u.uMouseForce.value = this.pointer.force;
  }

  dispose() {
    cancelAnimationFrame(this.frame);
    this.geometry.dispose();
    this.material.dispose();
    this.renderer.dispose();
  }
}
