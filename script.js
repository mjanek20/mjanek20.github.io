import * as THREE from "./three.module.js";
import { OBJExporter } from "./OBJExporter.js";
import { ARButton } from "https://cdn.jsdelivr.net/npm/three@0.155.0/examples/jsm/webxr/ARButton.js";

let renderer, scene, camera;
let sceneGroup = new THREE.Group();
let hitTestSource = null;
let localReferenceSpace = null;

async function init() {
  // Initialize renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  // Create a basic scene
  scene = new THREE.Scene();
  scene.add(sceneGroup);

  // Define the camera
  camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.01,
    20
  );

  // Create AR button with hit-test feature
  document.body.appendChild(
    ARButton.createButton(renderer, {
      requiredFeatures: ["hit-test"],
      optionalFeatures: [], // Ensure dom-overlay is not requested
    })
  );

  // Start rendering loop
  renderer.setAnimationLoop(render);

  renderer.xr.addEventListener("sessionstart", onSessionStart);
}

function onSessionStart() {
  console.log("Session started");

  const session = renderer.xr.getSession();

  session.requestReferenceSpace("viewer").then((viewerSpace) => {
    session
      .requestHitTestSource({ space: viewerSpace })
      .then((source) => {
        hitTestSource = source;
      })
      .catch((error) => {
        console.error("Failed to get hit test source:", error);
      });
  });

  session.requestReferenceSpace("local").then((refSpace) => {
    localReferenceSpace = refSpace;
  });

  // Handle session end
  session.addEventListener("end", () => {
    console.log("Session ended");
    hitTestSource = null;
  });
}

function render(time, frame) {
  if (frame) {
    processFrame(time, frame);
  }

  renderer.render(scene, camera);
}

function processFrame(time, frame) {
  const session = renderer.xr.getSession();

  if (hitTestSource && frame) {
    const hitTestResults = frame.getHitTestResults(hitTestSource);

    if (hitTestResults.length > 0) {
      const hit = hitTestResults[0];
      const pose = hit.getPose(localReferenceSpace);

      if (pose) {
        console.log("Hit test detected at:", pose.transform.position);

        // Create a marker at the hit position
        const geometry = new THREE.SphereGeometry(0.05, 16, 16);
        const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const marker = new THREE.Mesh(geometry, material);
        marker.position.set(
          pose.transform.position.x,
          pose.transform.position.y,
          pose.transform.position.z
        );
        sceneGroup.add(marker);

        // Save the scene if desired
        if (sceneGroup.children.length > 0) {
          console.log("Saving scene to OBJ...");
          saveSceneAsOBJ();
          session.end();
        }
      }
    } else {
      console.log("No hit test results");
    }
  } else {
    console.log("Hit test source not available");
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

// Start the application
init();
