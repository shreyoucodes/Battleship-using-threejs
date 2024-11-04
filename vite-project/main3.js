import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Water } from 'three/examples/jsm/objects/Water.js';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { io } from 'socket.io-client';
import ShipStore from './ShipStore.js';

// Constants
const GRID_SIZE = 400;
const GRID_DIVISIONS = 8;
const BOX_SIZE = GRID_SIZE / GRID_DIVISIONS;

// Initialize socket connection
const socket = io('http://192.168.29.242:3000/');

// Game state tracking
let gameState = {
    myTurn: false,
    gameStarted: false,
    playerID: null,
    opponentID: null,
    isMyTurn: false,
    roomId: null,
    opponent: null
};

// Scene variables
let water;
let sky;
let selectedShip = null;
let isDragging = false;
let isRightMouseDown = false;
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const occupiedCoordinates = {};
let previousPosition = null;
const ships = [];

// Three.js scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
const renderer = new THREE.WebGLRenderer({ antialias: true });

// Initial setup
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.5;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// Orbit controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.screenSpacePanning = true;
controls.minDistance = 50;
controls.maxDistance = 500;
controls.maxPolarAngle = Math.PI / 2;

// Post-processing setup
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.5, 0.4, 0.85
);
composer.addPass(bloomPass);

// Camera setup
camera.position.set(0, 200, 400);
camera.lookAt(0, 0, 0);

// Custom shader for glowing effect
const glowVertexShader = `
    varying vec3 vNormal;
    void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const glowFragmentShader = `
    uniform vec3 glowColor;
    uniform float intensity;
    varying vec3 vNormal;
    void main() {
        float brightness = pow(0.8 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0);
        gl_FragColor = vec4(glowColor * intensity * brightness, 1.0);
    }
`;

// Create a custom grid
function createCustomGrid(size = GRID_SIZE, divisions = GRID_DIVISIONS) {
    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    const step = size / divisions;

    for (let i = 0; i <= divisions; i++) {
        const line = i * step - size / 2;
        vertices.push(-size / 2, 0, line, size / 2, 0, line);
        vertices.push(line, 0, -size / 2, line, 0, size / 2);
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

    const material = new THREE.ShaderMaterial({
        uniforms: {
            glowColor: { value: new THREE.Color(0x00ffff) },
            intensity: { value: 2.5 },
        },
        vertexShader: glowVertexShader,
        fragmentShader: glowFragmentShader,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
    });

    const grid = new THREE.LineSegments(geometry, material);
    grid.position.y = 0.1;
    scene.add(grid);
    return grid;
}

const customGrid = createCustomGrid();

// Socket event handlers
socket.on('connect', () => {
    console.log('Connected to server');
    updateStatusDisplay('Connected, joining game...');
    socket.emit('joinGame');
});

socket.on('connectionConfirmed', (data) => {
    console.log('Connection confirmed, your ID:', data.id);
    gameState.playerID = data.id;
    updateStatusDisplay('Connection confirmed. Waiting for opponent...');
});

socket.on('gameStart', (data) => {
    console.log('Game started between:', data.player1, data.player2);
    gameState.gameStarted = true;
    gameState.opponentID = data.player1 === gameState.playerID ? data.player2 : data.player1;
    updateStatusDisplay('Game started! Place your ships.');
    initializeGame();
});

socket.on('playerTurn', (playerId) => {
    gameState.myTurn = (socket.id === playerId);
    updateStatusDisplay(gameState.myTurn ? 'Your turn to attack!' : "Opponent's turn");
    updateGameControls(gameState.myTurn);
});

socket.on('attackResult', (result) => {
    const isMyAttack = result.attacker === gameState.playerID;
    console.log(`Attack ${isMyAttack ? 'by you' : 'by opponent'}:`, result);
    updateGameBoard(result.coordinates, result.hit, isMyAttack);
    
    if (result.gameOver) {
        updateStatusDisplay(isMyAttack ? 'You won!' : 'You lost!');
    }
});

// Helper functions
function updateStatusDisplay(message) {
    const statusElement = document.getElementById('status');
    if (statusElement) {
        statusElement.textContent = message;
    }
}

function updateGameControls(isMyTurn) {
    customGrid.visible = isMyTurn;
    ships.forEach(ship => {
        ship.userData.draggable = isMyTurn;
    });
}

function updateGameBoard(coordinates, hit, isMyAttack) {
    const attackMarker = createAttackMarker(coordinates, hit);
    scene.add(attackMarker);
}

function createAttackMarker(coordinates, hit) {
    const geometry = new THREE.SphereGeometry(5, 32, 32);
    const material = new THREE.MeshBasicMaterial({
        color: hit ? 0xff0000 : 0xffffff
    });
    const marker = new THREE.Mesh(geometry, material);
    marker.position.set(coordinates.x, 5, coordinates.z);
    return marker;
}

// Create water
function createWater() {
    const waterGeometry = new THREE.PlaneGeometry(10000, 10000);
    water = new Water(waterGeometry, {
        textureWidth: 512,
        textureHeight: 512,
        waterNormals: new THREE.TextureLoader().load(
            'https://threejs.org/examples/textures/waternormals.jpg',
            function (texture) {
                texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
            }
        ),
        sunDirection: new THREE.Vector3(),
        sunColor: 0xffffff,
        waterColor: 0x001e0f,
        distortionScale: 3.7,
        fog: scene.fog !== undefined
    });
    water.material.uniforms.reflectivity = { value: 0.2 };
    water.rotation.x = -Math.PI / 2;
    water.position.y = 0;
    scene.add(water);
}

// Create Sky
function createSky() {
    sky = new Sky();
    sky.scale.setScalar(10000);
    scene.add(sky);

    const skyUniforms = sky.material.uniforms;
    skyUniforms['turbidity'].value = 10;
    skyUniforms['rayleigh'].value = 2;
    skyUniforms['mieCoefficient'].value = 0.005;
    skyUniforms['mieDirectionalG'].value = 0.8;

    const parameters = {
        elevation: 2,
        azimuth: 180,
    };

    const pmremGenerator = new THREE.PMREMGenerator(renderer);

    const phi = THREE.MathUtils.degToRad(90 - parameters.elevation);
    const theta = THREE.MathUtils.degToRad(parameters.azimuth);
    const sunPosition = new THREE.Vector3();
    sunPosition.setFromSphericalCoords(1, phi, theta);

    sky.material.uniforms['sunPosition'].value.copy(sunPosition);
    if (water) {
        water.material.uniforms['sunDirection'].value.copy(sunPosition).normalize();
    }

    scene.environment = pmremGenerator.fromScene(sky).texture;
}

// Lighting setup
function setupLighting() {
    const ambientLight = new THREE.AmbientLight(0x404040, 1.0);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLight.position.set(-1, 1, 1);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    scene.add(directionalLight);

    const pointLight1 = new THREE.PointLight(0x3366ff, 1, 100);
    pointLight1.position.set(20, 20, 20);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xff6633, 1, 100);
    pointLight2.position.set(-20, 20, -20);
    scene.add(pointLight2);
}


const gridSize = 400;
const divisions = 8;
const boxSize = gridSize / divisions;

// // Function to enhance model materials
function enhanceModelMaterials(model) {
  model.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;

      if (child.material) {
        child.material.side = THREE.FrontSide;
        child.material.transparent = false;
        child.material.opacity = 1.0;
        child.material.metalness = 0.8;
        child.material.roughness = 0.2;
        child.material.envMapIntensity = 1.5;
      }
    }
  });
}
function getShipSize(ship) {
  const bbox = new THREE.Box3().setFromObject(ship);
  const size = bbox.getSize(new THREE.Vector3());
  const center = bbox.getCenter(new THREE.Vector3());
  return {
    width: Math.round(size.x / boxSize),
    length: Math.round(size.z / boxSize),
    centerOffsetX: center.x - ship.position.x,
    centerOffsetZ: center.z - ship.position.z
  };
}

function snapToGrid(position) {
  const halfBoxSize = boxSize / 2;
  const halfGridSize = gridSize / 2;

  // Clamp the position within the grid bounds
  const clampedX = Math.max(-halfGridSize + halfBoxSize, Math.min(halfGridSize - halfBoxSize, position.x));
  const clampedZ = Math.max(-halfGridSize + halfBoxSize, Math.min(halfGridSize - halfBoxSize, position.z));

  return new THREE.Vector3(
    Math.round((clampedX - halfBoxSize) / boxSize) * boxSize + halfBoxSize,
    position.y,
    Math.round((clampedZ - halfBoxSize) / boxSize) * boxSize + halfBoxSize
  );
}

// Function to mark a position as occupied
function markPositionAsOccupied(ship) {
  const position = snapToGrid(ship.position);
  const shipSize = getShipSize(ship);
  for (let i = 0; i < shipSize.length; i++) {
    const key = `${position.x},${position.z + i * boxSize}`;
    occupiedCoordinates[key] = ship;
  }
}

// Function to remove a ship from occupied positions
function removeShipFromOccupiedPositions(ship) {
  const position = snapToGrid(ship.position);
  const shipSize = getShipSize(ship);
  for (let i = 0; i < shipSize.length; i++) {
    const key = `${position.x},${position.z + i * boxSize}`;
    delete occupiedCoordinates[key];
  }
}
// Load ship models
function loadShipModels() {
    
    const ships = [];
// // Load Ship Models
    let ship, submarine;
    const loader = new GLTFLoader();
    

    loader.load(
      'bigShip2.glb',
      function (gltf) {
        const bigship = gltf.scene;
        bigship.userData.modelPath = 'bigShip2.glb';
        // Set scale to fit within three grid boxes
        const desiredWidth = (boxSize * 3) / 6; // Occupy 3 grid boxes
        const bbox = new THREE.Box3().setFromObject(bigship);
        const bigshipWidth = bbox.max.x - bbox.min.x;
        const scaleFactor = desiredWidth / bigshipWidth;

        bigship.scale.set(scaleFactor, scaleFactor, scaleFactor);

        // Position maritime drone in the first row, perpendicular to other ships
        bigship.position.set(
          gridSize / 5 + boxSize * -3.1,
          1,
          gridSize / 15 + boxSize * 2
        );

        // Rotate the maritime drone to be perpendicular
        bigship.rotation.y = 0;
        bigship.userData.isShip = true; // Add this line
        enhanceModelMaterials(bigship);
        ships.push(bigship);
        scene.add(bigship);
        bigship.rotation.y += Math.PI / 2;

        markPositionAsOccupied(bigship);
      },
      function (xhr) {
        console.log('bigship: ' + (xhr.loaded / xhr.total) * 100 + '% loaded');
      },
      function (error) {
        console.error('An error occurred loading the bigship:', error);
      }
    );

    loader.load(
      'blurudestroyer.glb',
      function (gltf) {
        const bldestroyer = gltf.scene;
        bldestroyer.userData.modelPath = 'blurudestroyer.glb';
        // Set scale to fit within three grid boxes
        const desiredWidth = (boxSize * 3) / 7.5; // Occupy 3 grid boxes
        const bbox = new THREE.Box3().setFromObject(bldestroyer);
        const bldestWidth = bbox.max.x - bbox.min.x;
        const scaleFactor = desiredWidth / bldestWidth;

        bldestroyer.scale.set(scaleFactor, scaleFactor, scaleFactor);

        // Position maritime drone in the first row, perpendicular to other ships
        bldestroyer.position.set(
          gridSize / 2 + boxSize * -6.5,
          1,
          -gridSize / 2 + boxSize * 2
        );

        // Rotate the maritime drone to be perpendicular
        bldestroyer.rotation.y = Math.PI / 2;
        bldestroyer.userData.isShip = true; // Add this line
        enhanceModelMaterials(bldestroyer);
        ships.push(bldestroyer);
        scene.add(bldestroyer);

        bldestroyer.rotation.y += Math.PI / 2;
        markPositionAsOccupied(bldestroyer);
      },
      function (xhr) {
        console.log(
          'Bluru Destroyer: ' + (xhr.loaded / xhr.total) * 100 + '% loaded'
        );
      },
      function (error) {
        console.error('An error occurred loading the Bluru Destroyer:', error);
      }
    );

    const occupiedPositions = new Set();
    loader.load(
      'submarine.glb',
      function (gltf) {
        const submarine = gltf.scene;
        submarine.userData.modelPath = 'submarine.glb';
        // Set scale to fit within three grid boxes
        const desiredWidth = (boxSize * 3) / 8; // Occupy 3 grid boxes
        const bbox = new THREE.Box3().setFromObject(submarine);
        const submarineWidth = bbox.max.x - bbox.min.x;
        const scaleFactor = desiredWidth / submarineWidth;

        submarine.scale.set(scaleFactor, scaleFactor, scaleFactor);

        // Position maritime drone in the first row, perpendicular to other ships
        submarine.position.set(
          -gridSize / 8 + boxSize * 2,
          1,
          -gridSize / 2 + boxSize / 2
        );

        // Rotate the maritime drone to be perpendicular
        submarine.rotation.y = 0;
        submarine.userData.isShip = true;
        enhanceModelMaterials(submarine);
        ships.push(submarine);
        scene.add(submarine);
        submarine.rotation.y += Math.PI / 2;

        markPositionAsOccupied(submarine);
      },
      function (xhr) {
        console.log('submarine: ' + (xhr.loaded / xhr.total) * 100 + '% loaded');
      },
      function (error) {
        console.error('An error occurred loading the submarine:', error);
      }
    );

    loader.load(
      '3boxship.glb', // Path to the new GLB file
      function (gltf) {
        const boxShip = gltf.scene;
        boxShip.userData.modelPath = '3boxship.glb';
        // Set scale to fit within three grid boxes
        const desiredWidth = boxSize * 3; // Occupy 3 grid boxes
        const bbox = new THREE.Box3().setFromObject(boxShip);
        const boxShipWidth = bbox.max.x - bbox.min.x;
        const scaleFactor = desiredWidth / boxShipWidth;

        boxShip.scale.set(scaleFactor, scaleFactor, scaleFactor);

        // Position maritime drone in the first row, perpendicular to other ships
        boxShip.position.set(
          gridSize / 10 + boxSize * 1.7,
          1,
          gridSize / 7 + boxSize / 2
        );

        // Rotate the maritime drone to be perpendicular
        boxShip.rotation.y = Math.PI / 2;
        boxShip.userData.isShip = true;
        enhanceModelMaterials(boxShip);
        ships.push(boxShip);
        scene.add(boxShip);
        submarine.rotation.y += Math.PI / 2;

        markPositionAsOccupied(boxShip);
      },
      function (xhr) {
        console.log('3Box Ship: ' + (xhr.loaded / xhr.total) * 100 + '% loaded');
      },
      function (error) {
        console.error('An error occurred loading the 3Box Ship:', error);
      }
    );

    // Load Maritime Drone
    loader.load(
      'maritimedrone.glb',
      function (gltf) {
        const maritimeDrone = gltf.scene;
        maritimeDrone.userData.modelPath = 'maritimedrone.glb';
        // Set scale to fit within three grid boxes
        const desiredWidth = (boxSize * 3) / 4; // Occupy 3 grid boxes
        const bbox = new THREE.Box3().setFromObject(maritimeDrone);
        const droneWidth = bbox.max.x - bbox.min.x;
        const scaleFactor = desiredWidth / droneWidth;

        maritimeDrone.scale.set(scaleFactor, scaleFactor, scaleFactor);

        // Position maritime drone in the first row, perpendicular to other ships
        const dronePosition = new THREE.Vector3(
          -gridSize / 6 + boxSize * 1.5,
          -5,
          -gridSize / 7 + boxSize / 1.5
        );

        // Snap the position to the grid
        const snappedPosition = snapToGrid(dronePosition);
        maritimeDrone.position.copy(snappedPosition);

        maritimeDrone.rotation.y = Math.PI / 2;
        maritimeDrone.userData.isShip = true;
        enhanceModelMaterials(maritimeDrone);

        // Add the maritime drone to the ships array
        ships.push(maritimeDrone);

        scene.add(maritimeDrone);

        // Mark the position as occupied
        markPositionAsOccupied(maritimeDrone);
      },
      function (xhr) {
        console.log(
          'Maritime drone: ' + (xhr.loaded / xhr.total) * 100 + '% loaded'
        );
      },
      function (error) {
        console.error('An error occurred loading the maritime drone:', error);
      }
);
}


// Game initialization
function initializeGame() {
    createWater();
    createSky();
    setupLighting();
    loadShipModels();
    createCustomGrid();
    
    socket.emit('sceneLoaded');
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    if (water) {
        water.material.uniforms['time'].value += 1.0 / 60.0;
    }

    controls.update();
    updateShips();

    composer.render();
}

function updateShips() {
    ships.forEach(ship => {
        if (ship) {
            ship.position.y = 1 + Math.sin(Date.now() * 0.0005) * 0.2;
            ship.rotation.x = Math.sin(Date.now() * 0.0003) * 0.02;
            ship.rotation.z = Math.sin(Date.now() * 0.0004) * 0.02;
        }
    });
}

// Event listeners
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
});

// Start the game
initializeGame();
animate();

// Export necessary functions and variables
export {
    gameState,
    socket,
    scene,
    camera,
    renderer,
    ships
};