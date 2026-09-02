export const CUBE_SCENE_CSS = `.cube-scene {
  position: relative;
  width: 100%;
  cursor: pointer;
}

.cube-scene .cube-svg {
  display: block;
  width: 100%;
  height: auto;
}

.cube-scene .overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
  transition: background 0.2s;
}

.cube-scene .icon-play {
  position: absolute;
  width: 72px;
  height: 72px;
  fill: white;
  transition: opacity 0.2s;
  pointer-events: none;
}

.cube-scene .progress {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  z-index: 2;
}

.cube-scene .progress-fill {
  height: 100%;
  width: 0%;
  background: #e00;
}`
