import { roomModels } from "./room-models-data.js";

// A single on-demand WebGL scene. No room video or continuous render loop.
export function enhanceRoomView({ stage }) {
  const $ = (id) => document.getElementById(id);
  const canvas = $("room-canvas");
  const poster = $("room-poster");
  const feedback = $("room-status");
  const message = $("room-status-message");
  const retry = $("room-retry");
  const buttons = [
    "room-zoom-in",
    "room-zoom-out",
    "room-top",
    "room-walls",
    "room-reset",
  ].map($);
  let engine, renderer, scene, camera, controls, loader, model, bounds;
  let room,
    nearViewport = false,
    generation = 0,
    pending,
    frame;
  let fitBoxes = [];
  let wallsVisible = true;
  let homeDistance = 1,
    fittedAspect = 1,
    contextLost = false;

  function status(state, text = "") {
    stage.dataset.state = state;
    stage.setAttribute("aria-busy", String(state === "loading"));
    feedback.dataset.state = state;
    feedback.hidden = state === "ready" || state === "idle";
    message.textContent = text;
    retry.hidden = state !== "error";
    poster.hidden = state === "ready";
    canvas.hidden = state !== "ready";
    for (const button of buttons) button.disabled = state !== "ready";
    if (controls) controls.enabled = state === "ready";
  }
  status("idle");

  function render() {
    frame = undefined;
    if (!renderer || !model || contextLost || document.hidden) return;
    renderer.render(scene, camera);
    const zoom = homeDistance / camera.position.distanceTo(controls.target);
    $("room-zoom").textContent = `${Math.round(zoom * 100)}%`;
    // Also describes the current view to diagnostics without exposing renderer internals.
    stage.dataset.camera = JSON.stringify({
      position: camera.position.toArray(),
      target: controls.target.toArray(),
      zoom,
    });
  }
  function invalidate() {
    if (!frame) frame = requestAnimationFrame(render);
  }
  function dispose(object) {
    if (!object) return;
    const geometries = new Set(),
      materials = new Set(),
      textures = new Set(),
      bitmaps = new Set();
    object.traverse((node) => {
      if (node.geometry) geometries.add(node.geometry);
      for (const material of [].concat(node.material || [])) {
        materials.add(material);
        for (const value of Object.values(material)) {
          if (!value?.isTexture) continue;
          textures.add(value);
          if (value.source?.data?.close) bitmaps.add(value.source.data);
        }
      }
    });
    geometries.forEach((value) => value.dispose());
    textures.forEach((value) => value.dispose());
    materials.forEach((value) => value.dispose());
    bitmaps.forEach((value) => value.close());
  }
  function clearModel() {
    if (model) {
      scene.remove(model);
      dispose(model);
      model = null;
    }
    bounds = null;
    fitBoxes = [];
    delete stage.dataset.camera;
    $("room-zoom").textContent = "100%";
  }
  function resize() {
    if (!renderer || contextLost) return;
    const { width, height } = stage.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    // Retain the view on ordinary resizes, but reframe when phone orientation changes.
    if (model && Math.abs(camera.aspect - fittedAspect) > 0.25) reset();
    invalidate();
  }
  async function initialize() {
    engine ||= await import("./vendor/room-engine.js");
    if (renderer) return;
    const T = engine;
    renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    scene = new T.Scene();
    scene.background = new T.Color("#f4f6f8");
    camera = new T.PerspectiveCamera(42, 1, 0.02, 500);
    controls = new T.OrbitControls(camera, canvas);
    controls.enableDamping = false;
    controls.maxPolarAngle = Math.PI * 0.92;
    controls.addEventListener("change", invalidate);
    controls.addEventListener("start", () =>
      stage.classList.add("is-dragging"),
    );
    controls.addEventListener("end", () =>
      stage.classList.remove("is-dragging"),
    );
    scene.add(new T.HemisphereLight(0xffffff, 0xc9d1d9, 1.4));
    const key = new T.DirectionalLight(0xffffff, 2.1);
    key.position.set(3, 10, 5);
    scene.add(key);
    const fill = new T.DirectionalLight(0xffffff, 0.9);
    fill.position.set(-5, 5, -8);
    scene.add(fill);
    loader = new T.GLTFLoader();
    resize();
  }
  function targetPoint() {
    const size = bounds.getSize(new engine.Vector3());
    const center = bounds.getCenter(new engine.Vector3());
    center.y = bounds.min.y + size.y * 0.42;
    return center;
  }
  function fitDistance(direction, target) {
    // Fit visible mesh bounds in both dimensions, including portrait viewports.
    const forward = direction.clone().negate();
    const right = new engine.Vector3()
      .crossVectors(forward, camera.up)
      .normalize();
    const up = new engine.Vector3().crossVectors(right, forward).normalize();
    const vertical = Math.tan(engine.MathUtils.degToRad(camera.fov / 2));
    const horizontal = vertical * camera.aspect;
    let distance = 1;
    for (const box of fitBoxes)
      for (const x of [box.min.x, box.max.x])
        for (const y of [box.min.y, box.max.y])
          for (const z of [box.min.z, box.max.z]) {
            const corner = new engine.Vector3(x, y, z).sub(target);
            distance = Math.max(
              distance,
              Math.abs(corner.dot(right)) / horizontal + corner.dot(direction),
              Math.abs(corner.dot(up)) / vertical + corner.dot(direction),
            );
          }
    return distance * 1.12;
  }
  function reset() {
    if (!bounds) return;
    const target = targetPoint();
    const direction = new engine.Vector3(0.68, 1.1, 0.92).normalize();
    homeDistance = fitDistance(direction, target);
    fittedAspect = camera.aspect;
    camera.position.copy(target).addScaledVector(direction, homeDistance);
    camera.near = Math.max(0.005, homeDistance / 1500);
    camera.far = Math.max(100, homeDistance * 20);
    camera.updateProjectionMatrix();
    controls.target.copy(target);
    controls.cursor.copy(target);
    controls.maxTargetRadius =
      bounds.getSize(new engine.Vector3()).length() * 1.5;
    controls.minDistance = homeDistance / 8;
    controls.maxDistance = homeDistance * 3;
    controls.update();
    invalidate();
  }
  function prepare(object) {
    const telelab = room.category === "real2sim";
    object.updateMatrixWorld(true);
    bounds = new engine.Box3();
    object.traverse((node) => {
      if (!node.isMesh) return;
      const name = (node.userData.name || node.name).toLowerCase();
      const materials = [].concat(node.material);
      // Hide export helpers and roof panels. Keep lamps, fixtures and original materials.
      const hidden =
        /^(left|right)_eef_target_/.test(name) ||
        /(^|:)ceiling_|(^|:)roof_/.test(name) ||
        materials.every((material) => material.opacity === 0) ||
        (telelab &&
          /^(floor_visual|wall_(back|front|left|right)_visual)/.test(name));
      node.userData.roomWall =
        /(^|:)(wall_|walls_|standardwallsize_)/.test(name) && !telelab;
      node.visible = !hidden;
      if (node.visible) {
        const box = new engine.Box3().setFromObject(node, true);
        fitBoxes.push(box);
        bounds.union(box);
      }
    });
    if (bounds.isEmpty())
      throw new Error("The room contains no visible geometry");
  }
  async function load() {
    if (
      !room ||
      !nearViewport ||
      contextLost ||
      stage.dataset.state === "loading" ||
      stage.dataset.state === "ready"
    )
      return;
    const token = ++generation;
    const chosen = room;
    const asset = roomModels[chosen.id];
    pending?.abort();
    const controller = new AbortController();
    pending = controller;
    status("loading", "Loading room model…");
    try {
      if (!asset) throw new Error("Missing room model");
      await initialize();
      if (token !== generation) return;
      const response = await fetch(new URL(asset.src, document.baseURI), {
        signal: controller.signal,
      });
      if (!response.ok)
        throw new Error(`Model request failed: ${response.status}`);
      const reader = response.body?.getReader();
      let buffer;
      if (reader) {
        const chunks = [];
        let loaded = 0,
          lastPercent = -1;
        const total =
          Number(response.headers.get("content-length")) || asset.bytes;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          loaded += value.length;
          const percent = Math.min(99, Math.round((loaded / total) * 100));
          if (token === generation && percent !== lastPercent) {
            message.textContent = `Loading room model… ${percent}%`;
            lastPercent = percent;
          }
        }
        const bytes = new Uint8Array(loaded);
        let offset = 0;
        for (const chunk of chunks) {
          bytes.set(chunk, offset);
          offset += chunk.length;
        }
        buffer = bytes.buffer;
      } else buffer = await response.arrayBuffer();
      if (token !== generation) return;
      message.textContent = "Preparing 3D view…";
      // Published models may use lossless gzip transport. Geometry and embedded
      // textures are decoded to their original GLB bytes before parsing.
      const header = new Uint8Array(buffer, 0, Math.min(2, buffer.byteLength));
      if (header[0] === 0x1f && header[1] === 0x8b) {
        if (typeof DecompressionStream === "function") {
          buffer = await new Response(
            new Blob([buffer])
              .stream()
              .pipeThrough(new DecompressionStream("gzip")),
          ).arrayBuffer();
        } else {
          const { gunzipSync } = await import("./vendor/room-gzip.js");
          const decoded = gunzipSync(new Uint8Array(buffer));
          buffer = decoded.buffer.slice(
            decoded.byteOffset,
            decoded.byteOffset + decoded.byteLength,
          );
        }
      }
      if (token !== generation) return;
      const gltf = await loader.parseAsync(buffer, "");
      if (token !== generation) {
        dispose(gltf.scene);
        return;
      }
      model = gltf.scene;
      prepare(model);
      scene.add(model);
      resize();
      reset();
      // Reveal only after the first actual rendered frame, never leave an empty canvas.
      render();
      status("ready");
      canvas.setAttribute(
        "aria-label",
        `${chosen.title}: interactive 3D model`,
      );
    } catch (error) {
      if (token !== generation || error.name === "AbortError") return;
      clearModel();
      status(
        "error",
        renderer
          ? "This room could not load. Please try again."
          : "3D viewing needs WebGL. Enable graphics acceleration and try again.",
      );
    } finally {
      if (pending === controller) pending = null;
    }
  }
  function selectRoom(value) {
    generation++;
    pending?.abort();
    pending = null;
    room = value;
    wallsVisible = true;
    $("room-walls").hidden = room.category === "real2sim";
    $("room-walls").setAttribute("aria-pressed", "true");
    clearModel();
    stage.classList.remove("is-dragging");
    stage.dataset.room = room.id;
    stage.setAttribute("aria-label", `${room.title}: interactive 3D room view`);
    poster.src = new URL(room.poster, document.baseURI).href;
    status("idle");
    load();
  }
  function zoomBy(factor) {
    if (!model || stage.dataset.state !== "ready") return;
    const offset = camera.position.clone().sub(controls.target);
    const distance = engine.MathUtils.clamp(
      offset.length() / factor,
      controls.minDistance,
      controls.maxDistance,
    );
    camera.position.copy(controls.target).add(offset.setLength(distance));
    controls.update();
    invalidate();
  }
  $("room-zoom-in").addEventListener("click", () => zoomBy(1.2));
  $("room-zoom-out").addEventListener("click", () => zoomBy(1 / 1.2));
  $("room-reset").addEventListener("click", reset);
  $("room-top").addEventListener("click", () => {
    if (!bounds) return;
    const target = bounds.getCenter(new engine.Vector3());
    const direction = new engine.Vector3(0, 1, 0.0001).normalize();
    controls.target.copy(target);
    camera.position
      .copy(target)
      .addScaledVector(direction, fitDistance(direction, target));
    controls.update();
    invalidate();
  });
  $("room-walls").addEventListener("click", () => {
    if (!model) return;
    wallsVisible = !wallsVisible;
    $("room-walls").setAttribute("aria-pressed", String(wallsVisible));
    model.traverse((node) => {
      if (node.userData.roomWall) node.visible = wallsVisible;
    });
    invalidate();
  });
  retry.addEventListener("click", () => {
    status("idle");
    load();
  });
  canvas.addEventListener("pointerdown", () =>
    stage.focus({ preventScroll: true }),
  );
  canvas.addEventListener("dblclick", reset);
  stage.addEventListener("keydown", (event) => {
    if (
      event.target !== stage ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      !model
    )
      return;
    const key = event.key;
    if (
      ![
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
        "+",
        "=",
        "-",
        "_",
        "0",
        "Home",
      ].includes(key)
    )
      return;
    event.preventDefault();
    if (key === "0" || key === "Home") return reset();
    if (["+", "=", "-", "_"].includes(key))
      return zoomBy(key === "+" || key === "=" ? 1.2 : 1 / 1.2);
    const horizontal = key === "ArrowLeft" ? 1 : key === "ArrowRight" ? -1 : 0;
    const vertical = key === "ArrowUp" ? 1 : key === "ArrowDown" ? -1 : 0;
    if (event.shiftKey) {
      const amount = camera.position.distanceTo(controls.target) * 0.04;
      const shift = new engine.Vector3()
        .setFromMatrixColumn(camera.matrix, 0)
        .multiplyScalar(-horizontal * amount);
      shift.addScaledVector(
        new engine.Vector3().setFromMatrixColumn(camera.matrix, 1),
        vertical * amount,
      );
      camera.position.add(shift);
      controls.target.add(shift);
    } else {
      const spherical = new engine.Spherical().setFromVector3(
        camera.position.clone().sub(controls.target),
      );
      spherical.theta += (horizontal * Math.PI) / 18;
      spherical.phi = engine.MathUtils.clamp(
        spherical.phi - (vertical * Math.PI) / 18,
        0.001,
        controls.maxPolarAngle,
      );
      camera.position
        .copy(controls.target)
        .add(new engine.Vector3().setFromSpherical(spherical));
    }
    controls.update();
    invalidate();
  });
  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    contextLost = true;
    generation++;
    pending?.abort();
    status(
      "error",
      "3D graphics were interrupted. Waiting for your browser to restore them.",
    );
    retry.hidden = true;
  });
  canvas.addEventListener("webglcontextrestored", () => {
    contextLost = false;
    clearModel();
    status("idle");
    load();
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) invalidate();
  });
  new ResizeObserver(resize).observe(stage);
  new IntersectionObserver(
    ([entry]) => {
      nearViewport = entry.isIntersecting;
      if (nearViewport) load();
    },
    { rootMargin: "150px 0px" },
  ).observe(stage);
  window.addEventListener("pagehide", (event) => {
    if (event.persisted) return;
    generation++;
    pending?.abort();
    cancelAnimationFrame(frame);
    controls?.dispose();
    clearModel();
    renderer?.dispose();
  });
  return { selectRoom };
}
