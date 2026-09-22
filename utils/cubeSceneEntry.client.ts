import { mountScenes } from './cubeSceneRuntime.client'

declare global {
  interface Window {
    mountCubeScenes?: (scope?: ParentNode) => void
  }
}

window.mountCubeScenes = mountScenes

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => mountScenes())
} else {
  mountScenes()
}
