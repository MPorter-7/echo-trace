import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import * as THREE from 'three'

interface ThreeCarouselProps {
  scrollProgress: React.MutableRefObject<number>
}

const CAROUSEL_IMAGES = [
  { src: '/images/carousel/carousel-01.jpg', title: 'Passport Photos' },
  { src: '/images/carousel/carousel-02.jpg', title: 'Address Book' },
  { src: '/images/carousel/carousel-03.jpg', title: 'Email Archives' },
  { src: '/images/carousel/carousel-04.jpg', title: 'Identity Cards' },
  { src: '/images/carousel/carousel-05.jpg', title: 'Social Profile' },
  { src: '/images/carousel/carousel-06.jpg', title: 'Memory Box' },
  { src: '/images/carousel/carousel-07.jpg', title: 'Digital Fragments' },
  { src: '/images/carousel/carousel-08.jpg', title: 'Card Catalog' },
  { src: '/images/carousel/carousel-09.jpg', title: 'Location History' },
  { src: '/images/carousel/carousel-10.jpg', title: 'Connection Graph' },
]

const RADIUS = 420
const IMAGE_WIDTH = 220
const IMAGE_HEIGHT = 280

type CanvasFactory = () => HTMLCanvasElement

export function hasWebGLSupport(
  createCanvas: CanvasFactory = () => document.createElement('canvas')
) {
  try {
    const canvas = createCanvas()
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'))
  } catch {
    return false
  }
}

function StaticCarouselFallback() {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center overflow-hidden px-4 md:px-10"
      role="img"
      aria-label="A collection of personal archive materials"
      data-testid="carousel-fallback"
    >
      <div className="flex items-center justify-center gap-3 md:gap-8">
        {CAROUSEL_IMAGES.slice(0, 3).map((image, index) => (
          <figure
            key={image.src}
            className={`overflow-hidden rounded border border-ink/15 bg-white shadow-lg ${index === 1 ? 'relative z-10' : 'hidden sm:block opacity-70'}`}
            style={{
              width: index === 1 ? 'min(52vw, 220px)' : 'min(34vw, 190px)',
              transform: index === 0 ? 'rotate(-5deg)' : index === 2 ? 'rotate(5deg)' : undefined,
            }}
          >
            <img
              src={image.src}
              alt={image.title}
              className="aspect-[11/14] w-full object-cover"
            />
          </figure>
        ))}
      </div>
    </div>
  )
}

export function ThreeCarousel({ scrollProgress }: ThreeCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef({ isDragging: false, startX: 0, currentOffset: 0, velocity: 0 })
  const raycasterRef = useRef(new THREE.Raycaster())
  const mouseRef = useRef(new THREE.Vector2())
  const hoveredIndexRef = useRef<number | null>(null)
  const [webGLFailed, setWebGLFailed] = useState(false)

  useEffect(() => {
    const container = containerRef.current
    if (!container || webGLFailed) return

    let renderer: THREE.WebGLRenderer | null = null
    let animationFrame = 0
    let cleanedUp = false
    let failed = false
    const meshes: THREE.Mesh[] = []
    const disposers: Array<() => void> = []

    const cleanup = () => {
      if (cleanedUp) return
      cleanedUp = true
      cancelAnimationFrame(animationFrame)
      disposers.splice(0).forEach((dispose) => dispose())

      meshes.forEach((mesh) => {
        mesh.geometry.dispose()
        const material = mesh.material as THREE.MeshBasicMaterial
        material.map?.dispose()
        material.dispose()
        mesh.children.forEach((child) => {
          const childMesh = child as THREE.Mesh
          childMesh.geometry.dispose()
          ;(childMesh.material as THREE.Material).dispose()
        })
      })

      renderer?.dispose()
      if (renderer && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }

    const showFallback = () => {
      if (failed) return
      failed = true
      cleanup()
      setWebGLFailed(true)
    }

    if (!hasWebGLSupport()) {
      showFallback()
      return cleanup
    }

    try {
      const isMobile = window.innerWidth < 768
      const imageCount = isMobile ? 6 : 10
      const radius = isMobile ? 250 : RADIUS
      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(
        45,
        container.clientWidth / container.clientHeight,
        0.1,
        2000
      )
      camera.position.z = 750
      camera.position.y = 30

      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
      renderer.setSize(container.clientWidth, container.clientHeight)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.domElement.style.width = '100%'
      renderer.domElement.style.height = '100%'
      renderer.domElement.style.display = 'block'
      renderer.domElement.style.cursor = 'grab'
      renderer.domElement.style.touchAction = 'none'
      container.appendChild(renderer.domElement)

      const activeRenderer = renderer
      const ring = new THREE.Group()
      ring.rotation.x = isMobile ? 0 : THREE.MathUtils.degToRad(3)
      scene.add(ring)

      const textureLoader = new THREE.TextureLoader()
      CAROUSEL_IMAGES.slice(0, imageCount).forEach((image, index) => {
        const texture = textureLoader.load(image.src)
        texture.minFilter = THREE.LinearFilter
        texture.magFilter = THREE.LinearFilter

        const material = new THREE.MeshBasicMaterial({
          map: texture,
          transparent: true,
          opacity: 1,
          side: THREE.DoubleSide,
        })
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(IMAGE_WIDTH, IMAGE_HEIGHT), material)
        const angle = (index / imageCount) * Math.PI * 2
        mesh.position.x = Math.sin(angle) * radius
        mesh.position.z = Math.cos(angle) * radius
        mesh.rotation.y = angle + Math.PI

        const shadow = new THREE.Mesh(
          new THREE.PlaneGeometry(IMAGE_WIDTH + 10, IMAGE_HEIGHT + 10),
          new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.08 })
        )
        shadow.position.z = -5
        mesh.add(shadow)
        mesh.userData = { index, title: image.title }
        ring.add(mesh)
        meshes.push(mesh)
      })

      const onPointerDown = (event: PointerEvent) => {
        dragRef.current.isDragging = true
        dragRef.current.startX = event.clientX
        dragRef.current.velocity = 0
        activeRenderer.domElement.style.cursor = 'grabbing'
      }
      const onPointerMove = (event: PointerEvent) => {
        const rect = activeRenderer.domElement.getBoundingClientRect()
        mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
        mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

        if (dragRef.current.isDragging) {
          const delta = event.clientX - dragRef.current.startX
          dragRef.current.currentOffset += delta * 0.3
          dragRef.current.velocity = delta * 0.3
          dragRef.current.startX = event.clientX
        }
      }
      const onPointerUp = () => {
        dragRef.current.isDragging = false
        activeRenderer.domElement.style.cursor = 'grab'
      }
      const onContextLost = (event: Event) => {
        event.preventDefault()
        showFallback()
      }
      const handleResize = () => {
        if (failed) return
        camera.aspect = container.clientWidth / container.clientHeight
        camera.updateProjectionMatrix()
        activeRenderer.setSize(container.clientWidth, container.clientHeight)
      }

      activeRenderer.domElement.addEventListener('pointerdown', onPointerDown)
      activeRenderer.domElement.addEventListener('webglcontextlost', onContextLost)
      window.addEventListener('pointermove', onPointerMove)
      window.addEventListener('pointerup', onPointerUp)
      window.addEventListener('resize', handleResize)
      disposers.push(
        () => activeRenderer.domElement.removeEventListener('pointerdown', onPointerDown),
        () => activeRenderer.domElement.removeEventListener('webglcontextlost', onContextLost),
        () => window.removeEventListener('pointermove', onPointerMove),
        () => window.removeEventListener('pointerup', onPointerUp),
        () => window.removeEventListener('resize', handleResize)
      )

      const animate = () => {
        if (failed || cleanedUp) return
        try {
          const scrollRotation = scrollProgress.current * Math.PI * 2
          const dragRotation = THREE.MathUtils.degToRad(dragRef.current.currentOffset)

          if (!dragRef.current.isDragging) {
            dragRef.current.velocity *= 0.95
            dragRef.current.currentOffset += dragRef.current.velocity
            if (Math.abs(dragRef.current.velocity) < 0.01) dragRef.current.velocity = 0
          }

          ring.rotation.y = scrollRotation + dragRotation
          raycasterRef.current.setFromCamera(mouseRef.current, camera)
          const intersections = raycasterRef.current.intersectObjects(meshes)

          if (intersections.length > 0) {
            const hitMesh = intersections[0].object as THREE.Mesh
            const index = hitMesh.userData.index as number
            if (hoveredIndexRef.current !== index) {
              const previous = hoveredIndexRef.current === null ? null : meshes[hoveredIndexRef.current]
              if (previous) gsap.to(previous.scale, { x: 1, y: 1, duration: 0.3, ease: 'power2.out' })
              hoveredIndexRef.current = index
              gsap.to(hitMesh.scale, { x: 1.03, y: 1.03, duration: 0.3, ease: 'power2.out' })
            }
          } else if (hoveredIndexRef.current !== null) {
            const previous = meshes[hoveredIndexRef.current]
            if (previous) gsap.to(previous.scale, { x: 1, y: 1, duration: 0.3, ease: 'power2.out' })
            hoveredIndexRef.current = null
          }

          meshes.forEach((mesh) => {
            const worldPosition = new THREE.Vector3()
            mesh.getWorldPosition(worldPosition)
            const normalizedZ = (worldPosition.z + radius) / (radius * 2)
            const targetOpacity = normalizedZ < 0.3 ? 0.5 : 1
            const material = mesh.material as THREE.MeshBasicMaterial
            material.opacity += (targetOpacity - material.opacity) * 0.1
          })

          activeRenderer.render(scene, camera)
          animationFrame = requestAnimationFrame(animate)
        } catch {
          showFallback()
        }
      }

      animate()
    } catch {
      showFallback()
    }

    return cleanup
  }, [scrollProgress, webGLFailed])

  if (webGLFailed) return <StaticCarouselFallback />

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
      style={{ touchAction: 'none' }}
    />
  )
}
