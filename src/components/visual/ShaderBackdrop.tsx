import { useEffect, useRef, useState } from 'react'
import { useMotionPreference } from '../../hooks/useMotionPreference'

/** Props for {@link ShaderBackdrop} and {@link GlowBlobs}. */
interface BackdropProps {
  /** Optional extra class names appended to the root element. */
  className?: string
}

/**
 * Lightweight, dependency-free decorative fallback: a few blurred radial-gradient
 * blobs in the brand + teal palette. Uses `animate-float`, which the Foundation
 * CSS auto-stops under reduced/off motion. Also used as the non-WebGL fallback
 * for {@link ShaderBackdrop}.
 */
export function GlowBlobs({ className }: BackdropProps) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 -z-10 overflow-hidden ${className ?? ''}`}
      aria-hidden="true"
    >
      <div className="animate-float absolute -top-24 -left-16 h-72 w-72 rounded-full bg-brand-500/30 blur-3xl" />
      <div
        className="animate-float absolute -right-12 top-12 h-64 w-64 rounded-full bg-accent-500/20 blur-3xl"
        style={{ animationDelay: '1.5s' }}
      />
      <div
        className="animate-float absolute bottom-0 left-1/3 h-56 w-56 rounded-full bg-violet-500/20 blur-3xl"
        style={{ animationDelay: '3s' }}
      />
    </div>
  )
}

const VERTEX_SHADER = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`

// Calm, low-contrast aurora field tuned to sit BEHIND text on bg-immersive.
// Brand indigo/violet with a teal accent; everything stays in the dark range.
const FRAGMENT_SHADER = `
precision mediump float;

uniform vec2 u_resolution;
uniform float u_time;

// Brand palette.
const vec3 INDIGO = vec3(0.310, 0.275, 0.898); // #4f46e5
const vec3 VIOLET = vec3(0.486, 0.227, 0.929); // #7c3aed
const vec3 TEAL   = vec3(0.176, 0.831, 0.749); // #2dd4bf
const vec3 BASE   = vec3(0.039, 0.047, 0.094); // deep navy base

// Smooth value noise.
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float total = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 5; i++) {
    total += noise(p) * amp;
    p *= 2.02;
    amp *= 0.5;
  }
  return total;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  // Preserve aspect so the aurora doesn't stretch oddly.
  vec2 p = uv;
  p.x *= u_resolution.x / u_resolution.y;

  float t = u_time * 0.04;

  // Slowly drifting flow field for the aurora bands.
  float flow = fbm(p * 1.6 + vec2(t, t * 0.6));
  float bands = fbm(p * 2.4 + vec2(-t * 0.5, flow * 1.5));

  // Vertical gradient gives the hero a grounded, premium feel.
  float vgrad = smoothstep(0.0, 1.2, uv.y + flow * 0.25);

  vec3 col = BASE;
  col = mix(col, INDIGO, smoothstep(0.35, 0.95, bands) * 0.55);
  col = mix(col, VIOLET, smoothstep(0.5, 1.0, flow) * 0.45);

  // A restrained teal ribbon that ebbs in and out.
  float teal = smoothstep(0.55, 0.85, fbm(p * 3.0 + vec2(t * 0.8, -t)));
  col = mix(col, TEAL, teal * 0.18);

  // Keep it low-contrast and dark overall.
  col *= 0.55 + vgrad * 0.5;

  // Subtle vignette to focus the center where text lives.
  vec2 c = uv - 0.5;
  float vign = smoothstep(1.1, 0.3, dot(c, c) * 2.4);
  col *= 0.7 + 0.3 * vign;

  gl_FragColor = vec4(col, 1.0);
}
`

/** Compiles a single shader stage, returning null on failure. */
function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string,
): WebGLShader | null {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader)
    return null
  }
  return shader
}

/**
 * A self-contained, lightweight WebGL aurora field for dark `bg-immersive`
 * heroes. Renders raw WebGL (no three.js, no extra deps) with a calm, premium,
 * low-contrast palette so text stays legible on top.
 *
 * Falls back to {@link GlowBlobs} when motion is disabled, WebGL is
 * unavailable, or context/shader setup fails. The root carries the
 * `shader-backdrop` class so the Foundation CSS hides it under reduced/off.
 */
export default function ShaderBackdrop({ className }: BackdropProps) {
  const { animationsEnabled } = useMotionPreference()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  // Tracks whether GL setup failed so we can swap in the fallback on re-render.
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!animationsEnabled || failed) return
    if (typeof window === 'undefined') return
    const canvas = canvasRef.current
    if (!canvas) return

    const gl =
      (canvas.getContext('webgl', { antialias: true, alpha: false }) as
        | WebGLRenderingContext
        | null) ||
      (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null)

    if (!gl) {
      setFailed(true)
      return
    }

    const vert = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER)
    const frag = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER)
    const program = gl.createProgram()
    if (!vert || !frag || !program) {
      setFailed(true)
      return
    }
    gl.attachShader(program, vert)
    gl.attachShader(program, frag)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      setFailed(true)
      gl.deleteProgram(program)
      gl.deleteShader(vert)
      gl.deleteShader(frag)
      return
    }

    gl.useProgram(program)

    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    )
    const positionLoc = gl.getAttribLocation(program, 'a_position')
    gl.enableVertexAttribArray(positionLoc)
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0)

    const resolutionLoc = gl.getUniformLocation(program, 'u_resolution')
    const timeLoc = gl.getUniformLocation(program, 'u_time')

    // Cap the device pixel ratio: this is a soft decorative backdrop.
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)

    const resize = () => {
      const w = Math.max(1, Math.floor(canvas.clientWidth * dpr))
      const h = Math.max(1, Math.floor(canvas.clientHeight * dpr))
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }
      gl.viewport(0, 0, canvas.width, canvas.height)
    }

    let observer: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(resize)
      observer.observe(canvas)
    } else {
      window.addEventListener('resize', resize)
    }
    resize()

    const start = performance.now()
    let raf = 0
    const render = (now: number) => {
      const elapsed = (now - start) / 1000
      gl.uniform2f(resolutionLoc, canvas.width, canvas.height)
      gl.uniform1f(timeLoc, elapsed)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      raf = requestAnimationFrame(render)
    }
    raf = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(raf)
      if (observer) observer.disconnect()
      else window.removeEventListener('resize', resize)
      gl.deleteBuffer(buffer)
      gl.deleteProgram(program)
      gl.deleteShader(vert)
      gl.deleteShader(frag)
      const lose = gl.getExtension('WEBGL_lose_context')
      if (lose) lose.loseContext()
    }
  }, [animationsEnabled, failed])

  // No WebGL animation: render the lightweight blob fallback.
  if (!animationsEnabled || failed) {
    return <GlowBlobs className={className} />
  }

  return (
    <div
      className={`shader-backdrop pointer-events-none absolute inset-0 -z-10 overflow-hidden ${className ?? ''}`}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="h-full w-full" />
      {/* Static blob layer enriches the field and shows instantly before first paint. */}
      <div className="animate-float absolute -top-24 -left-16 h-72 w-72 rounded-full bg-brand-500/20 blur-3xl" />
      <div
        className="animate-float absolute -right-12 bottom-0 h-64 w-64 rounded-full bg-accent-500/15 blur-3xl"
        style={{ animationDelay: '2s' }}
      />
    </div>
  )
}
