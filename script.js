import * as THREE from "./three.module.js";
import { OBJExporter } from "./OBJExporter.js";
import { ARButton } from "https://cdn.jsdelivr.net/npm/three@0.155.0/examples/jsm/webxr/ARButton.js";

let renderer, scene, camera;
let sceneGroup = new THREE.Group();

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

  // Add AR button with mesh-detection feature
  const button = ARButton.createButton(renderer, {
    requiredFeatures: ["mesh-detection"],
  });
  document.body.appendChild(button);

  // Start rendering loop
  renderer.setAnimationLoop(render);

  renderer.xr.addEventListener("sessionstart", onSessionStart);
}

function onSessionStart() {
  console.log("Session started");

  const session = renderer.xr.getSession();

  // Handle session end
  session.addEventListener("end", () => {
    console.log("Session ended");
  });

  // Start processing frames
  session.requestAnimationFrame(processFrame);
}

function render(time, frame) {
  if (frame) {
    processFrame(time, frame);
  }

  renderer.render(scene, camera);
}

function processFrame(time, frame) {
  const session = renderer.xr.getSession();
  const referenceSpace = renderer.xr.getReferenceSpace();

  // Handle mesh detection
  if (
    frame.worldInformation &&
    frame.worldInformation.detectedMeshes &&
    frame.worldInformation.detectedMeshes.size > 0
  ) {
    console.log("Detected meshes:", frame.worldInformation.detectedMeshes.size);
    frame.worldInformation.detectedMeshes.forEach((mesh) => {
      const pose = frame.getPose(mesh.meshSpace, referenceSpace);
      if (pose) {
        console.log("Mesh detected at:", pose.transform.position);

        // Create geometry from mesh data
        const geometry = createGeometry(mesh.vertices, mesh.indices);
        const material = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true });
        const meshObject = new THREE.Mesh(geometry, material);

        meshObject.position.set(
          pose.transform.position.x,
          pose.transform.position.y,
          pose.transform.position.z
        );
        meshObject.quaternion.set(
          pose.transform.orientation.x,
          pose.transform.orientation.y,
          pose.transform.orientation.z,
          pose.transform.orientation.w
        );

        sceneGroup.add(meshObject);
      }
    });
  } else {
    console.log("No meshes detected");
  }

  // If we have data, save to OBJ
  if (sceneGroup.children.length > 0) {
    console.log("Saving scene to OBJ...");
    saveSceneAsOBJ();
    session.end();
  } else {
    console.log("No objects in sceneGroup yet");
    session.requestAnimationFrame(processFrame);
  }
}

function createGeometry(vertices, indices) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(vertices), 3));
  geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(indices), 1));
  geometry.computeVertexNormals();
  return geometry;
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
