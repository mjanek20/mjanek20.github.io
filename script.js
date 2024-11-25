import * as THREE from "./three.module.js";
import { OBJExporter } from "./OBJExporter.js";
import { ARButton } from "./ARButton.js";

let renderer, scene, camera;
let meshGroup = new THREE.Group();
let meshDetected = false;

init();

function init() {
  // Initialize renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  renderer.xr.setReferenceSpaceType("local-floor");
  document.body.appendChild(renderer.domElement);

  // Create a basic scene
  scene = new THREE.Scene();
  scene.add(meshGroup);

  // Define the camera
  camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    50
  );

  // Add AR button with mesh-detection feature
  const sessionInit = {
    requiredFeatures: ["mesh-detection", "local-floor"],
    optionalFeatures: [],
  };

  document.body.appendChild(ARButton.createButton(renderer, sessionInit));

  renderer.xr.addEventListener("sessionstart", onSessionStart);
  renderer.setAnimationLoop(render);

  window.addEventListener("resize", onWindowResize);
}

function onSessionStart() {
  console.log("Session started");
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function render(timestamp, frame) {
  if (frame && !meshDetected) {
    processMeshes(frame);
  }
  renderer.render(scene, camera);
}

function processMeshes(frame) {
  const referenceSpace = renderer.xr.getReferenceSpace();
  if (frame.detectedMeshes && frame.detectedMeshes.size > 0) {
    console.log("Detected meshes:", frame.detectedMeshes.size);
    frame.detectedMeshes.forEach((mesh) => {
      const meshPose = frame.getPose(mesh.meshSpace, referenceSpace);
      if (meshPose) {
        // Create geometry:
        const geometry = createGeometry(mesh.vertices, mesh.indices);

        const material = new THREE.MeshBasicMaterial({
          color: 0xff0000,
          wireframe: true,
        });

        const meshObject = new THREE.Mesh(geometry, material);
        meshObject.matrixAutoUpdate = false;
        meshObject.matrix.fromArray(meshPose.transform.matrix);

        meshGroup.add(meshObject);

        meshDetected = true;
      }
    });

    if (meshDetected) {
      // Export the mesh after a short delay to ensure all meshes are captured
      setTimeout(() => {
        exportScene();
        const session = renderer.xr.getSession();
        if (session) session.end();
      }, 3000); // Adjust the delay as needed
    }
  } else {
    console.log("No meshes detected");
  }
}

function createGeometry(vertices, indices) {
  const geometry = new THREE.BufferGeometry();
  geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(indices), 1));
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(vertices), 3)
  );
  geometry.computeVertexNormals();
  return geometry;
}

function exportScene() {
  const exporter = new OBJExporter();
  const objString = exporter.parse(meshGroup);

  const blob = new Blob([objString], { type: "text/plain" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "scene.obj";
  link.click();

  console.log("Scene exported as OBJ");
}
