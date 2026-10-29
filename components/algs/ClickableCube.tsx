'use client';

import React, { useEffect, useImperativeHandle, useRef } from 'react';
import { rotateAlgByY, tokenize } from '../../composables/algs/algMoves';
import { useCubeColors, useHintFaceletsElevation } from '../../composables/useSettings';
import { SimpleCube } from '../../composables/recon/SimpleCube';
import { distanceView, INITIAL_ANGLES, sceneViewBox, smootherStep, timelineMoveMs, turnRotation } from '../../composables/recon/reconCube';
import { createCubeScene, createSvgPainter, type CubeScene } from '../../utils/cubeSceneRuntime.client';
import { CUBE_SVG_CLASS } from '../../utils/cubeSceneIsland';
import { buildColorHex, DEFAULT_SCENE_LOOK } from '../../utils/cubeSceneAuthoring';
import { cubiesFromState } from '../../utils/cubeSvgRender';
import { faceletsFromState, stateFromFacelets } from '../../utils/cubeMoves';
import {
  buildPaintMap,
  computeShown,
  buildF2lOverrides,
  freeEoEdgeSet,
  physicalLocOfFacelet,
  rotateCornerLocY,
  rotateEdgeLocY,
  type FaceKey,
  type CornerPlacement,
  type EdgePlacement,
  type CornerLocation,
  type EdgeLocation,
  type F2lSlot,
  type PieceRef,
} from '../../composables/algs/cubePaint';

export type LocationClick =
  | { pieceType: 'CORNERS'; loc: CornerLocation }
  | { pieceType: 'EDGES'; loc: EdgeLocation };

export interface ClickableCubeHandle {
  playAlg: (alg: string) => void;
  reset: () => void;
}

const PLAYBACK_TEMPO = 1;
const PLAYBACK_HOLD_MS = 1000;
const CAMERA_DISTANCE = 1.87;
const ORBIT_DAMPING = 0.15;
const SPIN_DEG_PER_Y_TURN = -90;
const SPIN_EASE = 0.2;
const SPIN_SETTLED_DEG = 0.03;

const SOLVED_FACELETS = faceletsFromState(new SimpleCube().getCubeState([]));
const PAINT_MAP = buildPaintMap(cubiesFromState(stateFromFacelets(SOLVED_FACELETS)));

interface ClickableCubeProps {
  cross?: FaceKey;
  pair: [FaceKey, FaceKey];
  corner: CornerPlacement | null;
  edge: EdgePlacement | null;
  filledSlots: F2lSlot[];
  highlightedPieces: PieceRef[];
  eoActive: boolean;
  badEdges: EdgeLocation[];
  yTurns: number;
  onLocationClick?: (click: LocationClick) => void;
  onPlaybackEnd?: () => void;
  onHighlightMove?: (moveIndex: number) => void;
  ref?: React.Ref<ClickableCubeHandle>;
}

const ClickableCube = ({ cross = 'up', pair, corner, edge, filledSlots, highlightedPieces, eoActive, badEdges, yTurns, onLocationClick, onPlaybackEnd, onHighlightMove, ref }: ClickableCubeProps) => {
  const [cubeColors] = useCubeColors();
  const [elevation] = useHintFaceletsElevation();

  const orbitAreaRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const sceneRef = useRef<CubeScene | null>(null);

  const spinTargetRef = useRef(yTurns * SPIN_DEG_PER_Y_TURN);
  const spinRef = useRef(yTurns * SPIN_DEG_PER_Y_TURN);
  const spinFrameRef = useRef(0);
  const shownYTurnsRef = useRef(yTurns);

  const playbackTokenRef = useRef(0);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const faceColor = (face: FaceKey) => cubeColors[face];
  const eoOverlay = eoActive
    ? {
      good: freeEoEdgeSet(edge?.loc ?? null, filledSlots).filter((loc) => !badEdges.includes(loc)),
      bad: badEdges,
      eoColor: cubeColors.eo,
    }
    : undefined;
  const overrides = buildF2lOverrides(PAINT_MAP, cross, pair, corner, edge, filledSlots, highlightedPieces, faceColor, yTurns, eoOverlay);
  const paints = computeShown(PAINT_MAP, cross, faceColor, overrides);
  const paintKey = [...paints.values()].join(',');
  const paintsRef = useRef(paints);

  useEffect(() => {
    paintsRef.current = paints;
    sceneRef.current?.setLook({ paints });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paintKey]);

  useEffect(() => {
    sceneRef.current?.setLook({ hints: elevation !== 0 });
    sceneRef.current?.setView(distanceView(CAMERA_DISTANCE, elevation, 1, 1));
  }, [elevation]);

  useEffect(() => {
    let quarterTurns = (((yTurns - shownYTurnsRef.current) % 4) + 4) % 4;
    if (quarterTurns > 2) quarterTurns -= 4;
    shownYTurnsRef.current = yTurns;
    spinTargetRef.current += quarterTurns * SPIN_DEG_PER_Y_TURN;

    const easeSpin = () => {
      const remaining = spinTargetRef.current - spinRef.current;
      spinRef.current = Math.abs(remaining) < SPIN_SETTLED_DEG ? spinTargetRef.current : spinRef.current + remaining * SPIN_EASE;
      sceneRef.current?.setSpin(spinRef.current);
      spinFrameRef.current = spinRef.current === spinTargetRef.current ? 0 : requestAnimationFrame(easeSpin);
    };
    if (!spinFrameRef.current) spinFrameRef.current = requestAnimationFrame(easeSpin);
  }, [yTurns]);

  const stopPlayback = () => {
    playbackTokenRef.current++;
    onHighlightMove?.(-1);
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  };

  const showCase = () => sceneRef.current?.setFacelets(SOLVED_FACELETS);

  const reset = () => {
    stopPlayback();
    showCase();
  };

  const playAlg = (rawAlg: string) => {
    const scene = sceneRef.current;
    if (!scene) return;

    stopPlayback();
    showCase();

    const moves = tokenize(rotateAlgByY(rawAlg, yTurns));
    if (moves.length === 0) {
      onPlaybackEnd?.();
      return;
    }

    const token = playbackTokenRef.current;
    const holdSolvedThenShowCase = () => {
      onHighlightMove?.(-1);
      holdTimerRef.current = setTimeout(() => {
        if (token !== playbackTokenRef.current) return;
        holdTimerRef.current = null;
        showCase();
        onPlaybackEnd?.();
      }, PLAYBACK_HOLD_MS);
    };

    const playFrom = (index: number) => {
      if (token !== playbackTokenRef.current) return;
      if (index >= moves.length) {
        holdSolvedThenShowCase();
        return;
      }
      const turn = turnRotation(moves[index]);
      if (!turn) {
        playFrom(index + 1);
        return;
      }
      onHighlightMove?.(index);
      scene.applyMove([turn], timelineMoveMs(moves[index]) / PLAYBACK_TEMPO, () => playFrom(index + 1));
    };
    playFrom(0);
  };

  useImperativeHandle(ref, () => ({ playAlg, reset }));

  const handlePointerUp = (e: React.PointerEvent) => {
    const scene = sceneRef.current;
    const screenToSvg = svgRef.current?.getScreenCTM()?.inverse();
    if (e.button !== 0 || !scene || !screenToSvg || scene.consumeDrag()) return;

    const point = new DOMPoint(e.clientX, e.clientY).matrixTransform(screenToSvg);
    const facelet = scene.pickSticker(point.x, point.y);
    const paint = facelet === null ? undefined : PAINT_MAP.get(facelet);
    const loc = paint && physicalLocOfFacelet(PAINT_MAP, paint);
    if (!loc) return;

    const literal: LocationClick = loc.pieceType === 'CORNERS'
      ? { pieceType: 'CORNERS', loc: rotateCornerLocY(loc.loc, yTurns) }
      : { pieceType: 'EDGES', loc: rotateEdgeLocY(loc.loc, yTurns) };
    onLocationClick?.(literal);
  };

  useEffect(() => {
    const svg = svgRef.current;
    const orbitArea = orbitAreaRef.current;
    if (!svg || !orbitArea) return;

    const scene = createCubeScene(createSvgPainter(svg), {
      facelets: SOLVED_FACELETS,
      angles: INITIAL_ANGLES,
      view: distanceView(CAMERA_DISTANCE, elevation, 1, 1),
      colors: buildColorHex(cubeColors),
      shade: DEFAULT_SCENE_LOOK.shade,
      dim: DEFAULT_SCENE_LOOK.dim,
      hints: elevation !== 0,
      labels: true,
      paints: paintsRef.current,
      ease: smootherStep,
      orbit: { target: orbitArea, damping: ORBIT_DAMPING },
    });
    scene.setSpin(spinRef.current);
    sceneRef.current = scene;

    const fitViewBox = () => {
      if (orbitArea.clientHeight === 0) return;
      svg.setAttribute('viewBox', sceneViewBox(orbitArea.clientWidth, orbitArea.clientHeight));
    };
    fitViewBox();
    const resizeObserver = new ResizeObserver(fitViewBox);
    resizeObserver.observe(orbitArea);

    return () => {
      resizeObserver.disconnect();
      cancelAnimationFrame(spinFrameRef.current);
      spinFrameRef.current = 0;
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      scene.destroy();
      sceneRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={orbitAreaRef}
      id="clickable-cube"
      className="h-full w-full touch-none bg-black"
      onPointerUp={handlePointerUp}
    >
      <svg ref={svgRef} className={`${CUBE_SVG_CLASS} block h-full w-full`} />
    </div>
  );
};

export default ClickableCube;
