"use client";

import { useEffect } from "react";

const RUNTIME_SRC = "/learn/cubeScene.js";

export default function CubeSceneLoader() {
  useEffect(() => {
    if (window.mountCubeScenes) {
      window.mountCubeScenes();
      return;
    }

    const runtimeAlreadyRequested = document.querySelector(`script[src="${RUNTIME_SRC}"]`);
    if (runtimeAlreadyRequested) return;

    const script = document.createElement("script");
    script.src = RUNTIME_SRC;
    script.defer = true;
    document.body.appendChild(script);
  }, []);

  return null;
}
