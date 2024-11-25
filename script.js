import * as THREE from "./three.module.js";
import { OBJExporter } from "./OBJExporter.js";
import { ARButton } from "https://cdn.jsdelivr.net/npm/three@0.155.0/examples/jsm/webxr/ARButton.js";

let renderer;
let sceneGroup = new THREE.Group();
let hitTestSource = null;

async function init() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.xr.enabled = true;

  const button = ARButton.createButton(renderer, { requiredFeatures: ["plane-detection", "mesh-detection"] });
  document.body.appendChild(button);

  renderer.xr.addEventListener("sessionstart", onSessionStart);
}

async function onSessionStart() {
  console.log("Session started");

  const session = renderer.xr.getSession();
  const referenceSpace = await session.requestReferenceSpace("viewer");

  try {
    hitTestSource = await session.requestHitTestSource({ space: referenceSpace });
    console.log("Hit test source established");
  } catch (error) {
    console.error("Failed to set up hit test source:", error);
  }

  session.addEventListener("end", () => {
    hitTestSource = null;
    console.log("Session ended");
  });

  session.requestAnimationFrame(processFrame);
}

function processFrame(_, frame) {
  console.log("Processing frame...");

  const referenceSpace = renderer.xr.getReferenceSpace();

  // Debugowanie płaszczyzn
  if (frame.detectedPlanes) {
    console.log("Detected planes:", frame.detectedPlanes.size);
    frame.detectedPlanes.forEach((plane) => {
      const pose = frame.getPose(plane.planeSpace, referenceSpace);
      if (pose) {
        console.log("Plane detected at:", pose.transform.position);
      }
    });
  } else {
    console.log("No planes detected");
  }

  // Debugowanie siatek
  if (frame.detectedMeshes) {
    console.log("Detected meshes:", frame.detectedMeshes.size);
    frame.detectedMeshes.forEach((mesh) => {
      const pose = frame.getPose(mesh.meshSpace, referenceSpace);
      if (pose) {
        console.log("Mesh detected at:", pose.transform.position);
      }
    });
  } else {
    console.log("No meshes detected");
  }

  // Jeśli mamy dane, zapisujemy do OBJ
  if (sceneGroup.children.length > 0) {
    console.log("Saving scene to OBJ...");
    saveSceneAsOBJ();
    renderer.xr.getSession().end();
  } else {
    console.log("No objects in sceneGroup yet");
    renderer.xr.getSession().requestAnimationFrame(processFrame);
  }
}

function saveSceneAsOBJ() {
  const exporter = new OBJExporter();
  const objString = exporter.parse(sceneGroup);

  const blob = new Blob([objString], { type: "text/plain" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "scene.obj";
  link.click();
}

init();
