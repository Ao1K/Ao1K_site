'use client';

import React, { useEffect, useImperativeHandle, useRef, useState } from 'react';
import { TwistyPlayer } from 'cubing/twisty';
import { rotateAlgByY } from '../../composables/algs/algMoves';
import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  AmbientLight,
  DoubleSide,
  Raycaster,
  Vector2,
  TextureLoader,
  LinearMipmapLinearFilter,
  LinearFilter,
  MeshBasicMaterial,
  PlaneGeometry,
  Mesh,
  Group,
  type Object3D,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useCubeColors, useHintFaceletsElevation, DEFAULT_HINT_FACELETS_ELEVATION } from '../../composables/useSettings';
import {
  computeShown,
  buildF2lOverrides,
  freeEoEdgeSet,
  physicalLocOfFacelet,
  rotateCornerLocY,
  rotateEdgeLocY,
  faceletId,
  type FaceKey,
  type FaceletId,
  type FaceletPaint,
  type PieceType,
  type PaintMap,
  type CornerPlacement,
  type EdgePlacement,
  type CornerLocation,
  type EdgeLocation,
  type F2lSlot,
  type PieceRef,
  CENTER_FACE_ORDER,
} from '../../composables/algs/cubePaint';

// a cube click resolved to a location, for the parent to fold into the case config
export type LocationClick =
  | { pieceType: 'CORNERS'; loc: CornerLocation }
  | { pieceType: 'EDGES'; loc: EdgeLocation };

// imperative playback control, driven by the alg cards
export interface TwistyClickableHandle {
  // play a suggestion alg (in the viewing frame), hold briefly, then return to the case
  playAlg: (alg: string) => void;
  // immediately stop any playback and show the case
  reset: () => void;
}

// how fast playback runs, and how long the solved view is held before resetting
const PLAYBACK_TEMPO = 2;
const PLAYBACK_HOLD_MS = 500;
// fallback in case the player never reports playback finishing
const PLAYBACK_SAFETY_MS = 10000;

interface TwistyClickableProps {
  cross?: FaceKey;
  // the F2L pair colors; together with cross they define the placed piece's colors
  pair: [FaceKey, FaceKey];
  // currently placed F2L corner / edge (literal frame), painted via overrides
  corner: CornerPlacement | null;
  edge: EdgePlacement | null;
  // F2L slots filled with solved context pairs (literal frame)
  filledSlots: F2lSlot[];
  // pieces tinted as click hints for the active step (literal frame)
  highlightedPieces: PieceRef[];
  // Full EO step: recolor the free edges to show good (eo color) / bad (grey)
  eoActive: boolean;
  // literal-frame free edges marked bad in the Full EO step
  badEdges: EdgeLocation[];
  // net quarter turns about the vertical axis; the cube eases toward this orientation
  yTurns: number;
  onLocationClick?: (click: LocationClick) => void;
  // fired once playback has finished and the cube has returned to the case
  onPlaybackEnd?: () => void;
  ref?: React.Ref<TwistyClickableHandle>;
}

const ORBITS: PieceType[] = ['CORNERS', 'EDGES', 'CENTERS'];

const hexString = (hex: number) => `#${hex.toString(16).padStart(6, '0')}`;

const TwistyClickable = ({ cross = 'up', pair, corner, edge, filledSlots, highlightedPieces, eoActive, badEdges, yTurns, onLocationClick, onPlaybackEnd, ref }: TwistyClickableProps) => {
  const [cubeColors] = useCubeColors();
  const [elevation] = useHintFaceletsElevation();
  // cleared once the custom scene is built, so the cube fades in instead of a black box
  const [loading, setLoading] = useState(true);
  const cubeColorsRef = useRef(cubeColors);
  // synced from the elevation effect so the imperative scene setup/repaint reads the latest value
  const elevationRef = useRef(elevation);
  const crossRef = useRef(cross);
  // paint inputs kept in refs so the imperative repaint always reads current values
  const pairRef = useRef(pair);
  const cornerRef = useRef(corner);
  const edgeRef = useRef(edge);
  const filledSlotsRef = useRef(filledSlots);
  const highlightedPiecesRef = useRef(highlightedPieces);
  const eoActiveRef = useRef(eoActive);
  const badEdgesRef = useRef(badEdges);

  const playerRef = useRef<TwistyPlayer | null>(null);
  const sceneRef = useRef<Scene | null>(null);
  const cameraRef = useRef<PerspectiveCamera | null>(null);
  const rendererRef = useRef<WebGLRenderer | null>(null);
  const divRef = useRef<HTMLDivElement>(null);
  const cubeObjectRef = useRef<Object3D | null>(null);
  const labelGroupRef = useRef<Group | null>(null);
  // the y-axis angle (radians) the animate loop eases toward, plus the last yTurns it reflects.
  // +1 quarter turn reads as clockwise from above, i.e. a negative rotation about three.js's +Y axis.
  const targetYRef = useRef(-yTurns * (Math.PI / 2));
  const prevYTurnsRef = useRef(yTurns);

  if (prevYTurnsRef.current !== yTurns) {
    let q = (((yTurns - prevYTurnsRef.current) % 4) + 4) % 4;
    if (q > 2) q -= 4;
    targetYRef.current -= q * (Math.PI / 2);
    prevYTurnsRef.current = yTurns;
  }

  // current yTurns / callback, kept in refs so the imperative playback reads the latest
  // (synced from the prop effect below)
  const yTurnsRef = useRef(yTurns);
  const onPlaybackEndRef = useRef(onPlaybackEnd);

  // bumped on every (re)start so stale animation/timer callbacks can bail out
  const playbackTokenRef = useRef(0);
  const playbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playbackCleanupRef = useRef<(() => void) | null>(null);

  // the working color model: per-facelet true color + face. built once from cubing.js.
  const paintMapRef = useRef<PaintMap>(new Map());
  // per-facelet paint overrides (future single-piece recoloring); wins over the mask.
  const overridesRef = useRef<Map<FaceletId, string>>(new Map());
  // lookups tying the model to the actual Three.js meshes
  const meshByFaceletRef = useRef<Map<FaceletId, Mesh>>(new Map());
  // floating hint sticker per facelet (only present when built with hintFacelets: 'floating')
  const hintMeshByFaceletRef = useRef<Map<FaceletId, Mesh>>(new Map());
  const faceletByMeshRef = useRef<Map<string, FaceletId>>(new Map());
  const faceletMeshesRef = useRef<Mesh[]>([]);
  const hintMeshesRef = useRef<Mesh[]>([]);

  // tracks the pointer-down position so a rotate-drag isn't mistaken for a click
  const pointerDownRef = useRef<{ x: number; y: number } | null>(null);

  const buildPaintMap = (cube: any) => {
    const info = cube.kpuzzleFaceletInfo;
    if (!info) return;

    // native center colors → face. The only translation out of cubing.js space
    const trueColorToFace = new Map<number, FaceKey>();
    for (let i = 0; i < 6; i++) {
      const hex = info.CENTERS[i]?.[0]?.facelet?.material?.color?.getHex?.();
      if (hex !== undefined) trueColorToFace.set(hex, CENTER_FACE_ORDER[i]);
    }

    const model: PaintMap = new Map();
    const meshByFacelet = new Map<FaceletId, Mesh>();
    const hintMeshByFacelet = new Map<FaceletId, Mesh>();
    const faceletByMesh = new Map<string, FaceletId>();
    const meshes: Mesh[] = [];
    const hintMeshes: Mesh[] = [];

    for (const orbit of ORBITS) {
      const pieces: any[][] = info[orbit] ?? [];
      pieces.forEach((pieceInfos, pieceIndex) => {
        pieceInfos.forEach((fi, faceletIndex) => {
          const mesh = fi.facelet as Mesh | undefined;
          if (!mesh) return;

          // clone so each facelet owns its material (cubing.js otherwise shares them by color).
          const material = (mesh.material as any).clone();
          material.side = DoubleSide;
          mesh.material = material;

          const trueHex = material.color.getHex();
          const face = trueColorToFace.get(trueHex) ?? CENTER_FACE_ORDER[0];
          const id = faceletId(orbit, pieceIndex, faceletIndex);
          const facelet: FaceletPaint = {
            pieceType: orbit,
            pieceIndex,
            faceletIndex,
            face,
            trueColor: hexString(trueHex),
          };
          model.set(id, facelet);
          meshByFacelet.set(id, mesh);
          faceletByMesh.set(mesh.uuid, id);
          meshes.push(mesh);

          const hintMesh = fi.hintFacelet as Mesh | undefined;
          if (hintMesh) {
            hintMesh.material = (hintMesh.material as any).clone();
            hintMeshByFacelet.set(id, hintMesh);
            hintMeshes.push(hintMesh);
          }
        });
      });
    }

    paintMapRef.current = model;
    meshByFaceletRef.current = meshByFacelet;
    hintMeshByFaceletRef.current = hintMeshByFacelet;
    faceletByMeshRef.current = faceletByMesh;
    faceletMeshesRef.current = meshes;
    hintMeshesRef.current = hintMeshes;
  };

  // recomputes shown colors from the current cross/cubeColors/overrides and applies them
  const repaint = () => {
    if (paintMapRef.current.size === 0) return;
    const shown = computeShown(
      paintMapRef.current,
      crossRef.current,
      (face) => cubeColorsRef.current[face],
      overridesRef.current,
    );
    for (const [id, color] of shown) {
      const mesh = meshByFaceletRef.current.get(id);
      if (mesh) (mesh.material as any).color.set(color);
      const hintMesh = hintMeshByFaceletRef.current.get(id);
      if (hintMesh) (hintMesh.material as any).color.set(color);
    }
  };

  // hint facelets float out from each face by `elevation`; 0 hides them. mirrors TwistyPlayer.
  const applyHintElevation = () => {
    const elev = elevationRef.current;
    if (playerRef.current) playerRef.current.experimentalHintFaceletsElevation = elev;
    for (const mesh of hintMeshesRef.current) mesh.visible = elev > 0;
  };

  // pull the camera back as hint facelets rise so they stay framed (same factor as TwistyPlayer)
  const radiusForElevation = (elev: number) => 1.7 * (1 + (elev - DEFAULT_HINT_FACELETS_ELEVATION) * 0.1);

  // rebuild the F2L paint overrides from the current placement, then repaint
  const recomputeOverrides = () => {
    if (paintMapRef.current.size === 0) return;
    let eoOverlay: { good: EdgeLocation[]; bad: EdgeLocation[]; eoColor: string } | undefined;
    if (eoActiveRef.current) {
      const bad = badEdgesRef.current;
      const good = freeEoEdgeSet(edgeRef.current?.loc ?? null, filledSlotsRef.current).filter((l) => !bad.includes(l));
      eoOverlay = { good, bad, eoColor: cubeColorsRef.current.eo };
    }
    overridesRef.current = buildF2lOverrides(
      paintMapRef.current,
      crossRef.current,
      pairRef.current,
      cornerRef.current,
      edgeRef.current,
      filledSlotsRef.current,
      highlightedPiecesRef.current,
      (face) => cubeColorsRef.current[face],
      yTurnsRef.current,
      eoOverlay,
    );
    repaint();
  };

  const handleClick = (clientX: number, clientY: number) => {
    const renderer = rendererRef.current;
    const camera = cameraRef.current;
    if (!renderer || !camera) return;

    const rect = renderer.domElement.getBoundingClientRect();
    const pointer = new Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );

    const raycaster = new Raycaster();
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(faceletMeshesRef.current, false);
    if (hits.length === 0) return;

    const mesh = hits[0].object as Mesh;
    const id = faceletByMeshRef.current.get(mesh.uuid);
    const facelet = id ? paintMapRef.current.get(id) : undefined;
    if (!facelet) return;

    const loc = physicalLocOfFacelet(paintMapRef.current, facelet);
    if (!loc) return;
    const y = yTurnsRef.current;
    const literal: LocationClick = loc.pieceType === 'CORNERS'
      ? { pieceType: 'CORNERS', loc: rotateCornerLocY(loc.loc, y) }
      : { pieceType: 'EDGES', loc: rotateEdgeLocY(loc.loc, y) };
    onLocationClick?.(literal);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    pointerDownRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    const down = pointerDownRef.current;
    pointerDownRef.current = null;
    if (!down) return;
    // ignore drags (used to orbit the cube); only treat near-stationary clicks
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    if (moved > 6) return;
    handleClick(e.clientX, e.clientY);
  };

  // the animate loop counter-rotates the group against the cube's y turn, so the hints stay
  // fixed in space as a reference frame while the cube rotates beneath them.
  const addFaceLabels = (cube: Object3D) => {
    const group = new Group();
    cube.add(group);
    labelGroupRef.current = group;

    const loader = new TextureLoader();
    const labels: { file: string; position: [number, number, number]; rotation: [number, number, number] }[] = [
      { file: '/U.svg', position: [0, 2, 0], rotation: [-Math.PI / 2, 0, 0] },
      { file: '/D.svg', position: [0, -2, 0], rotation: [Math.PI / 2, 0, 0] },
      { file: '/R.svg', position: [2, 0, 0], rotation: [0, Math.PI / 2, 0] },
      { file: '/L.svg', position: [-2, 0, 0], rotation: [0, -Math.PI / 2, 0] },
      { file: '/B.svg', position: [0, 0, -2], rotation: [0, Math.PI, 0] },
      { file: '/F.svg', position: [0, 0, 2], rotation: [0, 0, 0] },
    ];

    labels.forEach((label) => {
      const texture = loader.load(label.file, () => {
        texture.generateMipmaps = true;
        texture.minFilter = LinearMipmapLinearFilter;
        texture.magFilter = LinearFilter;
        texture.anisotropy = rendererRef.current?.capabilities.getMaxAnisotropy() ?? 1;

        const material = new MeshBasicMaterial({ map: texture, transparent: true });
        const mesh = new Mesh(new PlaneGeometry(1.1, 1.6), material);
        mesh.name = `face-label-${label.file}`;
        mesh.position.set(...label.position);
        mesh.rotation.set(...label.rotation);
        group.add(mesh);
      });
    });
  };

  const waitForPlayerIntersection = (player: TwistyPlayer) =>
    new Promise<void>((resolve) => {
      if (typeof IntersectionObserver === 'undefined') {
        requestAnimationFrame(() => resolve());
        return;
      }
      const observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (entry.target === player && entry.isIntersecting && entry.intersectionRect.height > 0) {
            observer.disconnect();
            resolve();
          }
        }
      });
      observer.observe(player);
    });

  const loadCubeObject = async (): Promise<Object3D | undefined> => {
    let cube = (await playerRef.current!.experimentalCurrentThreeJSPuzzleObject()) as unknown as Object3D;
    let attempts = 0;
    while (!cube && attempts < 100) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      cube = (await playerRef.current!.experimentalCurrentThreeJSPuzzleObject()) as unknown as Object3D;
      attempts++;
    }
    return cube ?? undefined;
  };

  const createCustomScene = async () => {
    playerRef.current!.style.visibility = 'hidden';
    divRef.current!.appendChild(playerRef.current!);

    // cubing defers 3D setup until the player is actually intersecting the viewport
    await waitForPlayerIntersection(playerRef.current!);

    const cube = await loadCubeObject();
    if (!divRef.current || !cube || sceneRef.current) return;

    // remove the raw <twisty-player> element now that we have the 3D object
    let twistyPlayerElement = divRef.current.querySelector('twisty-player');
    while (twistyPlayerElement) {
      divRef.current.removeChild(twistyPlayerElement);
      twistyPlayerElement = divRef.current.querySelector('twisty-player');
    }

    divRef.current.style.width = '100%';
    divRef.current.style.height = '100%';

    const scene = new Scene();
    sceneRef.current = scene;

    buildPaintMap(cube);
    recomputeOverrides();
    applyHintElevation();
    scene.add(cube);
    cube.rotation.y = targetYRef.current;
    cubeObjectRef.current = cube;

    const aspectRatio = (divRef.current.clientWidth - 1) / (divRef.current.clientHeight - 1);
    const camera = new PerspectiveCamera(75, aspectRatio, 0.1, 5);
    const radius = radiusForElevation(elevationRef.current);
    camera.position.set(0, radius * 0.5, radius * (Math.sqrt(3) / 2));
    cameraRef.current = camera;

    const renderer = new WebGLRenderer({ antialias: true });
    renderer.setSize(divRef.current.clientWidth - 1, divRef.current.clientHeight - 1);
    divRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    addFaceLabels(cube);

    scene.add(new AmbientLight(0xffffff, 1));

    // Firefox throws NotFoundError for stale pointer IDs; Chrome silently ignores them
    const domElement = renderer.domElement;
    const origRelease = domElement.releasePointerCapture.bind(domElement);
    domElement.releasePointerCapture = (id: number) => {
      try { origRelease(id); } catch { /* stale pointer id — safe to ignore */ }
    };

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.15;
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.update();

    const animate = () => {
      requestAnimationFrame(animate);
      // ease the cube toward the requested y orientation
      const current = cube.rotation.y;
      const diff = targetYRef.current - current;
      cube.rotation.y = Math.abs(diff) < 0.0005 ? targetYRef.current : current + diff * 0.2;
      // cancel that rotation on the labels so the direction hints stay fixed in space
      if (labelGroupRef.current) labelGroupRef.current.rotation.y = -cube.rotation.y;
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    setLoading(false);
  };

  const handleResize = () => {
    const cam = cameraRef.current;
    const rend = rendererRef.current;
    if (rend && cam && divRef.current) {
      cam.aspect = (divRef.current.clientWidth - 1) / (divRef.current.clientHeight - 1);
      cam.updateProjectionMatrix();
      rend.setSize(divRef.current.clientWidth - 1, divRef.current.clientHeight - 1);
    }
  };

  useEffect(() => {
    playerRef.current = new TwistyPlayer({
      viewerLink: 'none',
      puzzle: '3x3x3',
      // build the floating hint meshes up front; visibility/distance is driven by `elevation`
      hintFacelets: 'floating',
      experimentalHintFaceletsElevation: elevation,
      backView: 'none',
      background: 'none',
      controlPanel: 'none',
    });
    playerRef.current.style.width = '90%';
    playerRef.current.style.height = '90%';
    playerRef.current.experimentalFaceletScale = 0.95;

    createCustomScene();
  }, []);

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // recompute overrides + repaint whenever any paint input changes
  useEffect(() => {
    crossRef.current = cross;
    cubeColorsRef.current = cubeColors;
    pairRef.current = pair;
    cornerRef.current = corner;
    edgeRef.current = edge;
    filledSlotsRef.current = filledSlots;
    highlightedPiecesRef.current = highlightedPieces;
    eoActiveRef.current = eoActive;
    badEdgesRef.current = badEdges;
    yTurnsRef.current = yTurns;
    onPlaybackEndRef.current = onPlaybackEnd;
    recomputeOverrides();
  }, [cross, cubeColors, pair, corner, edge, filledSlots, highlightedPieces, eoActive, badEdges, yTurns, onPlaybackEnd]);

  // reposition/toggle hint facelets and reframe the camera when the elevation setting changes
  useEffect(() => {
    elevationRef.current = elevation;
    applyHintElevation();
    const cam = cameraRef.current;
    if (cam) {
      const newRadius = radiusForElevation(elevation);
      const dist = cam.position.length();
      if (dist > 0.001) cam.position.multiplyScalar(newRadius / dist);
    }
  }, [elevation]);

  // tears down any in-flight playback (timers + model listeners) and invalidates callbacks
  const stopPlayback = () => {
    playbackTokenRef.current++;
    if (playbackTimerRef.current) {
      clearTimeout(playbackTimerRef.current);
      playbackTimerRef.current = null;
    }
    if (playbackCleanupRef.current) {
      playbackCleanupRef.current();
      playbackCleanupRef.current = null;
    }
  };

  // clear the alg and snap home; the case paint overlay stays on the meshes, so the cube
  // shows the case again (the meshes simply return to their solved positions).
  const showCase = () => {
    const player = playerRef.current;
    if (!player) return;
    player.alg = '';
    player.jumpToStart();
  };

  const reset = () => {
    stopPlayback();
    showCase();
  };

  // the painted meshes start in solved positions, so the case is just a recoloring. The
  // suggestion alg solves the case in the viewing frame (cross down, spun by yTurns); the
  // cube object's own frame differs only by that y spin, so we conjugate the alg by yTurns
  // and the painted stickers ride the moves into their solved slot.
  const playAlg = (rawAlg: string) => {
    const player = playerRef.current;
    if (!player || paintMapRef.current.size === 0) return;

    stopPlayback();
    showCase();

    const localAlg = rotateAlgByY(rawAlg, yTurnsRef.current);
    if (localAlg.trim() === '') {
      onPlaybackEndRef.current?.();
      return;
    }

    const token = ++playbackTokenRef.current;
    player.alg = localAlg;
    player.tempoScale = PLAYBACK_TEMPO;
    player.jumpToStart();

    // let the new alg propagate a frame before playing, then watch for it to finish
    requestAnimationFrame(() => {
      if (token !== playbackTokenRef.current || !playerRef.current) return;
      const model = playerRef.current.experimentalModel;
      let seenPlaying = false;
      let safety: ReturnType<typeof setTimeout>;

      function finish() {
        if (token !== playbackTokenRef.current) return;
        model.playingInfo.removeFreshListener(onPlaying);
        clearTimeout(safety);
        playbackCleanupRef.current = null;
        // hold the solved view, then return to the case
        playbackTimerRef.current = setTimeout(() => {
          if (token !== playbackTokenRef.current) return;
          showCase();
          playbackTimerRef.current = null;
          onPlaybackEndRef.current?.();
        }, PLAYBACK_HOLD_MS);
      }

      function onPlaying(info: { playing: boolean }) {
        if (token !== playbackTokenRef.current) return;
        if (info.playing) {
          seenPlaying = true;
          return;
        }
        if (seenPlaying) finish();
      }

      model.playingInfo.addFreshListener(onPlaying);
      safety = setTimeout(() => {
        if (token === playbackTokenRef.current) finish();
      }, PLAYBACK_SAFETY_MS);
      playbackCleanupRef.current = () => {
        model.playingInfo.removeFreshListener(onPlaying);
        clearTimeout(safety);
      };

      playerRef.current.play();
    });
  };

  useImperativeHandle(ref, () => ({ playAlg, reset }), []);

  // stop playback (and its timers) if the component unmounts mid-animation
  useEffect(() => () => stopPlayback(), []);

  return (
    <div className="relative h-full w-full">
      <div
        ref={divRef}
        id="twisty-clickable"
        className="h-full w-full bg-black"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
      />
      {loading && (
        <div className="pointer-events-none absolute inset-0 flex text-xl justify-center items-center text-primary-100">
          Loading cube...
        </div>
      )}
    </div>
  );
};

export default TwistyClickable;
