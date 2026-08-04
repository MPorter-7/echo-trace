import { useEffect, useRef } from 'react'
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

export function ThreeCarousel({ scrollProgress }: ThreeCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const ringRef = useRef<THREE.Group | null>(null)
  const meshesRef = useRef<THREE.Mesh[]>([])
  const raycasterRef = useRef(new THREE.Raycaster())
  const mouseRef = useRef(new THREE.Vector2())
  const dragRef = useRef({ isDragging: false, startX: 0, currentOffset: 0, velocity: 0 })
  const animFrameRef = useRef<number>(0)
  const hoveredIndexRef = useRef<number | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const isMobile = window.innerWidth < 768
    const imageCount = isMobile ? 6 : 10
    const radius = isMobile ? 250 : RADIUS

    // Scene setup
    const scene = new THREE.Scene()
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      2000
    )
    camera.position.z = 750
    camera.position.y = 30
    cameraRef.current = camera

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.domElement.style.width = '100%'
    renderer.domElement.style.height = '100%'
    renderer.domElement.style.display = 'block'
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Ring group
    const ring = new THREE.Group()
    ring.rotation.x = isMobile ? 0 : THREE.MathUtils.degToRad(3)
    scene.add(ring)
    ringRef.current = ring

    // Load textures and create meshes
    const textureLoader = new THREE.TextureLoader()
    const geometry = new THREE.PlaneGeometry(IMAGE_WIDTH, IMAGE_HEIGHT)

    CAROUSEL_IMAGES.slice(0, imageCount).forEach((img, i) => {
      const texture = textureLoader.load(img.src)
      texture.minFilter = THREE.LinearFilter
      texture.magFilter = THREE.LinearFilter

      const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: 1,
        side: THREE.DoubleSide,
      })

      const mesh = new THREE.Mesh(geometry, material)
      const angle = (i / imageCount) * Math.PI * 2
      mesh.position.x = Math.sin(angle) * radius
      mesh.position.z = Math.cos(angle) * radius
      mesh.rotation.y = angle + Math.PI

      // Shadow plane behind each image
      const shadowGeo = new THREE.PlaneGeometry(IMAGE_WIDTH + 10, IMAGE_HEIGHT + 10)
      const shadowMat = new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.08,
      })
      const shadow = new THREE.Mesh(shadowGeo, shadowMat)
      shadow.position.z = -5
      mesh.add(shadow)

      mesh.userData = { index: i, title: img.title, originalOpacity: 1 }
      ring.add(mesh)
      meshesRef.current.push(mesh)
    })

    // Drag handlers
    const onPointerDown = (e: PointerEvent) => {
      dragRef.current.isDragging = true
      dragRef.current.startX = e.clientX
      dragRef.current.velocity = 0
      renderer.domElement.style.cursor = 'grabbing'
    }

    const onPointerMove = (e: PointerEvent) => {
      // Update mouse for raycaster
      const rect = renderer.domElement.getBoundingClientRect()
      mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

      if (dragRef.current.isDragging) {
        const delta = e.clientX - dragRef.current.startX
        dragRef.current.currentOffset += delta * 0.3
        dragRef.current.velocity = delta * 0.3
        dragRef.current.startX = e.clientX
      }
    }

    const onPointerUp = () => {
      dragRef.current.isDragging = false
      renderer.domElement.style.cursor = 'grab'
    }

    renderer.domElement.style.cursor = 'grab'
    renderer.domElement.style.touchAction = 'none'
    renderer.domElement.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)

    // Render loop
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate)

      const scrollRot = scrollProgress.current * Math.PI * 2
      const dragRot = THREE.MathUtils.degToRad(dragRef.current.currentOffset)

      // Apply momentum when not dragging
      if (!dragRef.current.isDragging) {
        dragRef.current.velocity *= 0.95
        dragRef.current.currentOffset += dragRef.current.velocity
        if (Math.abs(dragRef.current.velocity) < 0.01) {
          dragRef.current.velocity = 0
        }
      }

      if (ringRef.current) {
        ringRef.current.rotation.y = scrollRot + dragRot
      }

      // Raycasting for hover
      raycasterRef.current.setFromCamera(mouseRef.current, camera)
      const intersects = raycasterRef.current.intersectObjects(meshesRef.current)

      if (intersects.length > 0) {
        const hitMesh = intersects[0].object as THREE.Mesh
        const index = hitMesh.userData.index as number
        if (hoveredIndexRef.current !== index) {
          hoveredIndexRef.current = index
          // Scale up hovered mesh
          gsap.to(hitMesh.scale, { x: 1.03, y: 1.03, duration: 0.3, ease: 'power2.out' })
        }
      } else {
        if (hoveredIndexRef.current !== null) {
          const prevMesh = meshesRef.current[hoveredIndexRef.current]
          if (prevMesh) {
            gsap.to(prevMesh.scale, { x: 1, y: 1, duration: 0.3, ease: 'power2.out' })
          }
          hoveredIndexRef.current = null
        }
      }

      // Adjust opacity based on z-position (depth)
      meshesRef.current.forEach((mesh) => {
        const worldPos = new THREE.Vector3()
        mesh.getWorldPosition(worldPos)
        // Normalize z to determine if front or back
        const normalizedZ = (worldPos.z + radius) / (radius * 2)
        const targetOpacity = normalizedZ < 0.3 ? 0.5 : 1
        const mat = mesh.material as THREE.MeshBasicMaterial
        mat.opacity += (targetOpacity - mat.opacity) * 0.1
      })

      renderer.render(scene, camera)
    }

    animate()

    // Resize handler
    const handleResize = () => {
      if (!container || !camera || !renderer) return
      camera.aspect = container.clientWidth / container.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(container.clientWidth, container.clientHeight)
    }

    window.addEventListener('resize', handleResize)

    const meshes = meshesRef.current
    return () => {
      cancelAnimationFrame(animFrameRef.current)
      window.removeEventListener('resize', handleResize)
      renderer.domElement.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)

      meshes.forEach((mesh) => {
        mesh.geometry.dispose()
        ;(mesh.material as THREE.MeshBasicMaterial).dispose()
        mesh.children.forEach((child) => {
          ;(child as THREE.Mesh).geometry.dispose()
          ;((child as THREE.Mesh).material as THREE.MeshBasicMaterial).dispose()
        })
      })
      renderer.dispose()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [scrollProgress])

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
      style={{ touchAction: 'none' }}
    />
  )
}
