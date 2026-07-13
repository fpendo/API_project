import { useEffect, useRef } from 'react'

interface P { x: number; y: number; r: number; vx: number; vy: number; a: number }

/** Subtle drifting particle field — the landing page demos the effects Twin Native sells. */
export default function Particles() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    let w = 0, h = 0
    let particles: P[] = []
    let raf = 0

    const resize = () => {
      w = canvas.offsetWidth
      h = canvas.offsetHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      particles = Array.from({ length: 50 }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 0.6 + Math.random() * 1.8,
        vx: (Math.random() - 0.5) * 0.25,
        vy: -0.05 - Math.random() * 0.25,
        a: 0.15 + Math.random() * 0.4,
      }))
    }

    const tick = () => {
      ctx.clearRect(0, 0, w, h)
      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy
        if (p.y < -4) { p.y = h + 4; p.x = Math.random() * w }
        if (p.x < -4) p.x = w + 4
        if (p.x > w + 4) p.x = -4
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(251, 146, 60, ${p.a * 0.6})`
        ctx.fill()
      }
      raf = requestAnimationFrame(tick)
    }

    resize()
    tick()
    window.addEventListener('resize', resize)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={ref} className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden />
}
