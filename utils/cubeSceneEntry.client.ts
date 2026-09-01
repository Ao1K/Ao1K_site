import { mountScenes } from './cubeSceneRuntime.client'

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => mountScenes())
} else {
  mountScenes()
}
