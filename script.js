import * as THREE from "./three.module.js";
import { OBJExporter } from "./OBJExporter.js";
import { ARButton } from "https://cdn.jsdelivr.net/npm/three@0.155.0/examples/jsm/webxr/ARButton.js";

let renderer;
let sceneGroup = new THREE.Group();

async function init() {
  // Inicjalizacja renderera
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.xr.enabled = true;

  // Dodanie przycisku AR
  const button = ARButton.createButton(renderer, { 
    requiredFeatures: ["plane-detection", "mesh-detection"] 
  });
  document.body.appendChild(button);

  renderer.xr.addEventListener("sessionstart", onSessionStart);
}

async function onSessionStart() {
  console.log("Session started");

  const session = renderer.xr.getSession();

  // Sprawdź obsługiwane funkcje
  const supportedFeatures = session.getSupportedFeatures();
  console.log("Supported features:", supportedFeatures);

  if (!supportedFeatures.has("plane-detection")) {
    console.error("plane-detection not supported on this device");
  }
  if (!supportedFeatures.has("mesh-detection")) {
    console.warn("mesh-detection not supported, skipping meshes");
  }

  // Obsługa zakończenia sesji
  session.addEventListener("end", () => {
    console.log("Session ended");
  });

  // Rozpocznij przetwarzanie klatek
  session.requestAnimationFrame(processFrame);
}

function processFrame(_, frame) {
  console.log("Processing frame...");

  const referenceSpace = renderer.xr.getReferenceSpace();

  // Obsługa wykrywania płaszczyzn
  if (frame.detectedPlanes) {
    console.log("Detected planes:", frame.detectedPlanes.size);
    frame.detectedPlanes.forEach((plane) => {
      const pose = frame.getPose(plane.planeSpace, referenceSpace);
      if (pose) {
        console.log("Plane detected at:", pose.transform.position);

        // Tworzenie geometrii płaszczyzny
        const geometry = new THREE.BoxGeometry(1, 0.01, 1);
        const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        const planeMesh = new THREE.Mesh(geometry, material);

        planeMesh.position.set(pose.transform.position.x, pose.transform.position.y, pose.transform.position.z);
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

  // Obsługa wykrywania siatek (jeśli obsługiwane)
  if (frame.detectedMeshes) {
    console.log("Detected meshes:", frame.detectedMeshes.size);
    frame.detectedMeshes.forEach((mesh) => {
      const pose = frame.getPose(mesh.meshSpace, referenceSpace);
      if (pose) {
        console.log("Mesh detected at:", pose.transform.position);

        // Tworzenie geometrii siatki
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

// Tworzenie geometrii na podstawie danych siatki
function createGeometry(vertices, indices) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(vertices), 3));
  geometry.setIndex(new THREE.BufferAttribute(new Uint16Array(indices), 1));
  geometry.computeVertexNormals();
  return geometry;
}

// Zapis pliku OBJ
function saveSceneAsOBJ() {
  const exporter = new OBJExporter();
  const objString = exporter.parse(sceneGroup);

  const blob = new Blob([objString], { type: "text/plain" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "scene.obj";
  link.click();
}

// Uruchomienie aplikacji
init();
