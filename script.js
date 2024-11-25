import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.155.0/build/three.module.js";
import { ARButton } from "https://cdn.jsdelivr.net/npm/three@0.155.0/examples/jsm/webxr/ARButton.js";
import { OBJExporter } from "https://cdn.jsdelivr.net/npm/three@0.155.0/examples/jsm/exporters/OBJExporter.js";

let renderer;
let planeGroup = new THREE.Group();
let hitTestSource = null;

async function init() {
  // Inicjalizacja renderera
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.xr.enabled = true;

  // Dodanie przycisku AR
  const button = ARButton.createButton(renderer, { requiredFeatures: ["plane-detection"] });
  document.body.appendChild(button);

  // Obsługa startu sesji AR
  renderer.xr.addEventListener("sessionstart", onSessionStart);
}

// Obsługa sesji AR
async function onSessionStart() {
  const session = renderer.xr.getSession();
  const referenceSpace = await session.requestReferenceSpace("viewer");
  hitTestSource = await session.requestHitTestSource({ space: referenceSpace });

  session.addEventListener("end", () => {
    hitTestSource = null;
  });

  // Rozpoczęcie przetwarzania danych
  session.requestAnimationFrame(processFrame);
}

// Przetwarzanie klatek
function processFrame(_, frame) {
  if (frame && hitTestSource) {
    const referenceSpace = renderer.xr.getReferenceSpace();
    const detectedPlanes = frame.detectedPlanes;

    if (detectedPlanes) {
      detectedPlanes.forEach((plane) => {
        const pose = frame.getPose(plane.planeSpace, referenceSpace);

        if (pose) {
          const polygon = plane.polygon;

          // Obliczenie wymiarów płaszczyzny
          let minX = Number.MAX_SAFE_INTEGER, maxX = Number.MIN_SAFE_INTEGER;
          let minZ = Number.MAX_SAFE_INTEGER, maxZ = Number.MIN_SAFE_INTEGER;

          polygon.forEach((point) => {
            minX = Math.min(minX, point.x);
            maxX = Math.max(maxX, point.x);
            minZ = Math.min(minZ, point.z);
            maxZ = Math.max(maxZ, point.z);
          });

          const width = maxX - minX;
          const height = maxZ - minZ;

          // Tworzenie obiektu reprezentującego płaszczyznę
          const geometry = new THREE.BoxGeometry(width, 0.01, height);
          const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
          const planeMesh = new THREE.Mesh(geometry, material);

          planeMesh.position.set(pose.transform.position.x, pose.transform.position.y, pose.transform.position.z);
          planeMesh.quaternion.set(
            pose.transform.orientation.x,
            pose.transform.orientation.y,
            pose.transform.orientation.z,
            pose.transform.orientation.w
          );

          planeGroup.add(planeMesh);
        }
      });
    }
  }

  // Jeśli mamy jakieś dane, zapisujemy do OBJ
  if (planeGroup.children.length > 0) {
    saveSceneAsOBJ();
    renderer.xr.getSession().end();
  } else {
    renderer.xr.getSession().requestAnimationFrame(processFrame);
  }
}

// Funkcja zapisująca plik OBJ
function saveSceneAsOBJ() {
  const exporter = new OBJExporter();
  const objString = exporter.parse(planeGroup);

  const blob = new Blob([objString], { type: "text/plain" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "scene.obj";
  link.click();
}

// Uruchomienie aplikacji
init();
