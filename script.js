import * as THREE from "./three.module.js";
import { OBJExporter } from "./OBJExporter.js";
import { ARButton } from "https://cdn.jsdelivr.net/npm/three@0.155.0/examples/jsm/webxr/ARButton.js";

let renderer;
let sceneGroup = new THREE.Group();

async function init() {
  // Initialize renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.xr.enabled = true;

  // Add AR button
  const button = ARButton.createButton(renderer, { 
    requiredFeatures: ["plane-detection"] // Adjust features as necessary
  });
  document.body.appendChild(button);

  renderer.xr.addEventListener("sessionstart", onSessionStart);
}

async function onSessionStart() {
  console.log("Session started");

  const session = renderer.xr.getSession();

  // Check for supported features
  if (!session.isFeatureEnabled("plane-detection")) {
    console.error("plane-detection not supported on this device");
  }
  if (!session.isFeatureEnabled("mesh-detection")) {
    console.warn("mesh-detection not supported, skipping meshes");
  }

  // Handle session end
  session.addEventListener("end", () => {
    console.log("Session ended");
  });

  // Start processing frames
  session.requestAnimationFrame(processFrame);
}

function processFrame(_, frame) {
  console.log("Processing frame...");

  const referenceSpace = renderer.xr.getReferenceSpace();

  // Handle plane detection
  if (frame.worldInformation && frame.worldInformation.detectedPlanes) {
    console.log("Detected planes:", frame.worldInformation.detectedPlanes.size);
    frame.worldInformation.detectedPlanes.forEach((plane) => {
      const pose = frame.getPose(plane.planeSpace, referenceSpace);
      if (pose) {
        console.log("Plane detected at:", pose.transform.position);

        // Create plane geometry
        const geometry = new THREE.BoxGeometry(1, 0.01, 1);
        const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        const planeMesh = new THREE.Mesh(geometry, material);

        planeMesh.position.set(
          pose.transform.position.x,
          pose.transform.position.y,
          pose.transform.position.z
        );
        planeMesh.quaternion.set(
          pose.transform.orientation.x,
          pose.transform.orientation.y,
          pose.transform.orientation.z,
          pose.transform.orientation.w
        );

        sceneGroup.add(planeMesh);
      }
    });
  } else {
    console.log("No planes detected");
  }

  // Handle mesh detection (if supported)
  if (frame.worldInformation && frame.worldInformation.detectedMeshes) {
    console.log("Detected meshes:", frame.worldInformation.detectedMeshes.size);
    frame.worldInformation.detectedMeshes.forEach((mesh) => {
      const pose = frame.getPose(mesh.meshSpace, referenceSpace);
      if (pose) {
        console.log("Mesh detected at:", pose.transform.position);

        // Create mesh geometry
        const geometry = createGeometry(mesh.vertices, mesh.indices);
        const material = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true });
        const meshObject = new THREE.Mesh(geometry, material);

        meshObject.matrix.fromArray(pose.transform.matrix);
        meshObject.matrixAutoUpdate = false;

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
    renderer.xr.getSession().end();
  } else {
    console.log("No objects in sceneGroup yet");
    renderer.xr.getSession().requestAnimationFrame(processFrame);
  }
}

// Create geometry from mesh data
function createGeometry(vertices, indices) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(vertices), 3));
  geometry.setIndex(new THREE.BufferAttribute(new Uint16Array(indices), 1));
  geometry.computeVertexNormals();
  return geometry;
}

// Save OBJ file
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
