export const CUBE_SCENE_CSS = `.cube-scene {
  position: relative;
  width: 100%;
  cursor: pointer;
}

.cube-scene.orbit {
  cursor: grab;
  touch-action: none;
}

.cube-scene.orbit:active {
  cursor: grabbing;
}

.cube-scene .cube-svg {
  display: block;
  width: 100%;
  height: auto;
}

.cube-scene .cube-svg text {
  pointer-events: none;
  user-select: none;
  -webkit-user-select: none;
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

.cube-scene .icon-replay {
  position: absolute;
  right: 12px;
  bottom: 12px;
  width: 43px;
  height: 43px;
  fill: white;
  transition: opacity 0.2s, filter 0.2s;
}

.cube-scene:hover .icon-replay {
  filter: brightness(0.6);
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
}

.cube-scene .annotations {
  position: absolute;
  inset: 0;
  z-index: 1;
  container-type: inline-size;
  pointer-events: none;
}

.cube-scene .annotation {
  position: absolute;
  padding: 0.2em 0.5em;
  border-radius: 0.3em;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  font-size: 5cqw;
  line-height: 1.25;
  opacity: 0;
  transition: opacity 200ms;
}

.cube-scene .annotation.shown {
  opacity: 1;
}

.cube-scene .annotation:empty {
  display: none;
}`
