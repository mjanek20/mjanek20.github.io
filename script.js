import * as THREE from "three";
import { ARButton } from "three/addons/webxr/ARButton.js";

let renderer;
let planeData = [];
let hitTestSource = null;

async function init() {
  // Inicjalizacja renderera (nie będzie wyświetlany)
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.xr.enabled = true;

  // Tworzenie przycisku AR i uruchamianie sesji
  const button = ARButton.createButton(renderer, { requiredFeatures: ["plane-detection"] });
  document.body.appendChild(button);

  // Czekamy na start sesji AR
  renderer.xr.addEventListener("sessionstart", onSessionStart);
}

// Funkcja obsługująca start sesji AR
async function onSessionStart() {
  const session = renderer.xr.getSession();

  // Uzyskanie referencyjnej przestrzeni AR i źródła hit-test
  const referenceSpace = await session.requestReferenceSpace("viewer");
  hitTestSource = await session.requestHitTestSource({ space: referenceSpace });

  session.addEventListener("end", () => {
    hitTestSource = null;
  });

  // Rozpoczęcie zbierania danych
  session.requestAnimationFrame(processFrame);
}

// Przetwarzanie pojedynczej klatki
function processFrame(_, frame) {
  if (frame && hitTestSource) {
    const referenceSpace = renderer.xr.getReferenceSpace();
    const detectedPlanes = frame.detectedPlanes;

    if (detectedPlanes) {
      detectedPlanes.forEach((plane) => {
        const pose = frame.getPose(plane.planeSpace, referenceSpace);

        if (pose) {
          const polygon = plane.polygon;

          // Obliczenie rozmiaru płaszczyzny
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

          // Dodanie danych płaszczyzny do tablicy
          planeData.push({
            position: pose.transform.position,
            rotation: pose.transform.orientation,
            dimensions: { width, height },
          });
        }
      });
    }
  }

  // Po kilku klatkach zatrzymujemy sesję i zapisujemy dane
  if (planeData.length > 0) {
    saveSceneAsJSON();
    renderer.xr.getSession().end();
  } else {
    renderer.xr.getSession().requestAnimationFrame(processFrame);
  }
}

// Zapisanie danych sceny do pliku JSON
function saveSceneAsJSON() {
  const json = JSON.stringify(planeData, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "scene.json";
  link.click();
}

// Uruchomienie skryptu
init();
