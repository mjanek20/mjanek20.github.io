import * as THREE from "./three.module.js";
import { OBJExporter } from "./OBJExporter.js";
import { ARButton } from "https://cdn.jsdelivr.net/npm/three@0.155.0/examples/jsm/webxr/ARButton.js";

let renderer;
let sceneGroup = new THREE.Group();
let hitTestSource = null;

async function init() {
  // Inicjalizacja renderera
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.xr.enabled = true;

  // Dodanie przycisku AR
  const button = ARButton.createButton(renderer, { requiredFeatures: ["plane-detection", "mesh-detection"] });
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
  if (frame) {
    const referenceSpace = renderer.xr.getReferenceSpace();

    // Obsługa płaszczyzn (plane detection)
    if (frame.detectedPlanes) {
      frame.detectedPlanes.forEach((plane) => {
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

          sceneGroup.add(planeMesh);
        }
      });
    }

    // Obsługa pełnych siatek (mesh detection)
    if (frame.detectedMeshes) {
      frame.detectedMeshes.forEach((mesh) => {
        const meshPose = frame.getPose(mesh.meshSpace, referenceSpace);

        if (meshPose) {
          const geometry = createGeometry(mesh.vertices, mesh.indices);
          const material = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true });
          const meshObject = new THREE.Mesh(geometry, material);

          meshObject.matrix.fromArray(meshPose.transform.matrix);
          meshObject.matrixAutoUpdate = false;

          sceneGroup.add(meshObject);
        }
      });
    }
  }

  // Jeśli mamy dane, zapisujemy do OBJ
  if (sceneGroup.children.length > 0) {
    saveSceneAsOBJ();
    renderer.xr.getSession().end();
  } else {
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
