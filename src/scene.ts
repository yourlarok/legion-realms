import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { BOARD_SIZE, type Coord, type GameState, type Piece, type Tile } from './game';

export interface ScenePick extends Coord {
  pieceId?: string;
}

export interface SceneHighlights {
  selectedPieceId?: string;
  moves?: Coord[];
  deployments?: Coord[];
  targetTiles?: Coord[];
  attackIds?: string[];
}

type MaterialMode = 'painted' | 'clay';

const TILE_STEP = 1.1;
const TERRAIN_COLORS = {
  plain: 0x526558,
  forest: 0x304f42,
  river: 0x245b70,
  highland: 0x81765e,
};

export class BoardScene {
  private scene = new THREE.Scene();
  private renderer: THREE.WebGLRenderer;
  private camera: THREE.OrthographicCamera;
  private controls: OrbitControls;
  private terrainGroup = new THREE.Group();
  private pieceGroup = new THREE.Group();
  private highlightGroup = new THREE.Group();
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private mode: MaterialMode = 'painted';
  private pointerStart = { x: 0, y: 0 };

  constructor(private container: HTMLElement, private onPick: (pick: ScenePick) => void) {
    this.scene.background = new THREE.Color(0x10191d);
    this.scene.fog = new THREE.Fog(0x10191d, 24, 46);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    container.appendChild(this.renderer.domElement);

    const aspect = Math.max(1, container.clientWidth) / Math.max(1, container.clientHeight);
    const frustum = 17;
    this.camera = new THREE.OrthographicCamera(-frustum * aspect / 2, frustum * aspect / 2, frustum / 2, -frustum / 2, 0.1, 100);
    this.camera.position.set(11, 15, 15);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 0, 0);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minZoom = 0.65;
    this.controls.maxZoom = 2.8;
    this.controls.minPolarAngle = 0.45;
    this.controls.maxPolarAngle = 1.35;
    this.controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
    this.resetCamera();

    this.scene.add(new THREE.HemisphereLight(0xc9e4e2, 0x26302d, 2.1));
    const sun = new THREE.DirectionalLight(0xffe1b0, 3.2);
    sun.position.set(-8, 18, 9);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -12;
    sun.shadow.camera.right = 12;
    sun.shadow.camera.top = 12;
    sun.shadow.camera.bottom = -12;
    this.scene.add(sun);
    const rim = new THREE.DirectionalLight(0x4bbfb3, 1.4);
    rim.position.set(10, 7, -10);
    this.scene.add(rim);

    const floor = new THREE.Mesh(
      new THREE.CylinderGeometry(10.3, 10.8, 0.55, 8),
      new THREE.MeshStandardMaterial({ color: 0x1b292c, roughness: 0.9 }),
    );
    floor.position.y = -0.48;
    floor.receiveShadow = true;
    this.scene.add(floor);
    this.scene.add(this.terrainGroup, this.pieceGroup, this.highlightGroup);

    this.renderer.domElement.addEventListener('pointerdown', event => {
      this.pointerStart = { x: event.clientX, y: event.clientY };
    });
    this.renderer.domElement.addEventListener('pointerup', event => this.handlePointerUp(event));
    this.renderer.domElement.addEventListener('contextmenu', event => event.preventDefault());
    new ResizeObserver(() => this.resize()).observe(container);
    this.resize();
    this.animate();
  }

  setMode(mode: MaterialMode) {
    this.mode = mode;
  }

  resetCamera() {
    this.camera.position.set(11, 15, 15);
    this.camera.zoom = 1;
    this.camera.updateProjectionMatrix();
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  project(coord: Coord) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const point = this.world(coord).project(this.camera);
    return { x: rect.left + (point.x + 1) * rect.width / 2, y: rect.top + (1 - point.y) * rect.height / 2 };
  }

  sync(state: GameState, highlights: SceneHighlights = {}) {
    this.clear(this.terrainGroup);
    this.clear(this.pieceGroup);
    this.clear(this.highlightGroup);
    state.tiles.forEach(tile => this.buildTile(tile));
    state.pieces.forEach(piece => this.buildPiece(piece, state.surrounded.includes(piece.id)));

    const green = new Set([...(highlights.moves ?? []), ...(highlights.deployments ?? []), ...(highlights.targetTiles ?? [])].map(pos => `${pos.x},${pos.y}`));
    green.forEach(id => {
      const [x, y] = id.split(',').map(Number);
      const tile = state.tiles.find(item => item.x === x && item.y === y);
      if (tile) this.addTileHighlight(tile, highlights.targetTiles?.some(pos => pos.x === x && pos.y === y) ? 0x5ad6ae : 0x78d98c);
    });
    highlights.attackIds?.forEach(id => {
      const piece = state.pieces.find(item => item.id === id);
      if (piece) this.addRing(piece, 0xff6f61, 0.52, 0.09);
    });
    if (highlights.selectedPieceId) {
      const piece = state.pieces.find(item => item.id === highlights.selectedPieceId);
      if (piece) this.addRing(piece, 0xffd27a, 0.48, 0.12);
    }
  }

  private world(coord: Coord) {
    return new THREE.Vector3((coord.x - (BOARD_SIZE - 1) / 2) * TILE_STEP, 0, (coord.y - (BOARD_SIZE - 1) / 2) * TILE_STEP);
  }

  private tileHeight(tile: Tile) {
    return tile.terrain === 'highland' ? 0.42 : tile.terrain === 'river' ? 0.06 : 0.14;
  }

  private buildTile(tile: Tile) {
    const root = new THREE.Group();
    root.userData.coord = { x: tile.x, y: tile.y };
    root.position.copy(this.world(tile));
    const height = this.tileHeight(tile);
    const color = this.mode === 'clay' ? 0x7e7b72 : TERRAIN_COLORS[tile.terrain];
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1.02, height, 1.02), this.material(color));
    mesh.position.y = height / 2 - 0.04;
    mesh.receiveShadow = true;
    root.add(mesh);

    if (tile.terrain === 'forest') {
      for (const [x, z, scale] of [[-0.23, -0.18, 0.8], [0.23, 0.12, 1], [-0.12, 0.27, 0.65]] as const) {
        const tree = new THREE.Mesh(new THREE.ConeGeometry(0.15 * scale, 0.48 * scale, 6), this.material(this.mode === 'clay' ? 0x99958a : 0x52775a));
        tree.position.set(x, height + 0.18 * scale, z);
        tree.castShadow = true;
        root.add(tree);
      }
    }
    if (tile.terrain === 'river') {
      const water = new THREE.Mesh(new THREE.PlaneGeometry(0.82, 0.16), new THREE.MeshBasicMaterial({ color: this.mode === 'clay' ? 0xaaa69b : 0x5ba2b0, transparent: true, opacity: 0.7, side: THREE.DoubleSide }));
      water.rotation.x = -Math.PI / 2;
      water.rotation.z = tile.x % 2 ? 0.35 : -0.35;
      water.position.y = height + 0.005;
      root.add(water);
    }
    if (tile.creep) {
      const creep = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.48, 0.035, 7), this.material(this.mode === 'clay' ? 0x8b877e : 0x355d51, this.mode === 'clay' ? 0 : 0x173f36));
      creep.position.y = height + 0.015;
      root.add(creep);
      for (let i = 0; i < 3; i++) {
        const node = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 4), this.material(this.mode === 'clay' ? 0xa09c91 : 0x77d7a8, this.mode === 'clay' ? 0 : 0x2a7a5e));
        node.position.set(Math.cos(i * 2.1) * 0.25, height + 0.075, Math.sin(i * 2.1) * 0.25);
        root.add(node);
      }
    }
    this.terrainGroup.add(root);
  }

  private addTileHighlight(tile: Tile, color: number) {
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(0.88, 0.88), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.38, side: THREE.DoubleSide, depthWrite: false }));
    plane.rotation.x = -Math.PI / 2;
    plane.position.copy(this.world(tile));
    plane.position.y = this.tileHeight(tile) + 0.055;
    this.highlightGroup.add(plane);
  }

  private addRing(piece: Piece, color: number, radius: number, y: number) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.035, 6, 32), new THREE.MeshBasicMaterial({ color, depthTest: false }));
    ring.rotation.x = Math.PI / 2;
    ring.position.copy(this.world(piece));
    ring.position.y = y + this.tileHeight(this.tileAt(piece));
    ring.renderOrder = 5;
    this.highlightGroup.add(ring);
  }

  private tileAt(piece: Piece): Tile {
    return { x: piece.x, y: piece.y, terrain: 'plain', creep: false };
  }

  private buildPiece(piece: Piece, surrounded: boolean) {
    const root = new THREE.Group();
    root.userData.pieceId = piece.id;
    root.userData.coord = { x: piece.x, y: piece.y };
    root.position.copy(this.world(piece));
    const dragon = piece.race === 'dragon';
    const baseColor = this.mode === 'clay' ? 0xaaa69b : dragon ? 0x8c4e32 : 0x294f4b;
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 0.16, dragon ? 12 : 6), this.material(baseColor));
    base.position.y = 0.22;
    base.castShadow = true;
    root.add(base);
    const inset = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.38, 0.035, dragon ? 12 : 6), this.material(this.mode === 'clay' ? 0xc0bcb0 : dragon ? 0xe0a04d : 0x5ec29f));
    inset.position.y = 0.315;
    root.add(inset);

    const model = new THREE.Group();
    model.position.y = 0.32;
    this.buildModel(piece, model);
    root.add(model);

    const hpBack = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.07, 0.035), new THREE.MeshBasicMaterial({ color: 0x301f24 }));
    hpBack.position.set(0, 1.65, 0);
    const hpFill = new THREE.Mesh(new THREE.BoxGeometry(0.72 * Math.max(0, piece.hp / piece.maxHp), 0.045, 0.045), new THREE.MeshBasicMaterial({ color: piece.hp / piece.maxHp > 0.45 ? 0x83d483 : 0xf07867 }));
    hpFill.position.set(-0.36 * (1 - Math.max(0, piece.hp / piece.maxHp)), 1.65, -0.025);
    root.add(hpBack, hpFill);

    if (piece.acted && piece.kind === 'unit') {
      const acted = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.018, 4, 24), new THREE.MeshBasicMaterial({ color: 0x6e7676 }));
      acted.rotation.x = Math.PI / 2;
      acted.position.y = 0.34;
      root.add(acted);
    }
    if (surrounded) {
      const warning = new THREE.Mesh(new THREE.OctahedronGeometry(0.13), new THREE.MeshBasicMaterial({ color: 0xff6b5e, depthTest: false }));
      warning.position.set(0.43, 1.72, 0);
      warning.rotation.z = Math.PI / 4;
      warning.renderOrder = 8;
      root.add(warning);
      model.traverse(child => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) child.material.color.multiplyScalar(0.65);
      });
    }
    this.pieceGroup.add(root);
  }

  private buildModel(piece: Piece, group: THREE.Group) {
    const id = piece.defId;
    if (id === 'dragonCore') return this.dragonCore(group);
    if (id === 'drake' || id === 'elder') return this.dragon(group, id === 'elder' ? 1.3 : 0.88);
    if (id === 'dragonTower') return this.dragonTower(group);
    if (id === 'roost') return this.roost(group);
    if (id === 'swarmCore') return this.swarmCore(group);
    if (id === 'stalker' || id === 'hatchling') return this.stalker(group, id === 'hatchling' ? 0.72 : 1);
    if (id === 'spitter') return this.spitter(group);
    if (id === 'brood') return this.brood(group);
    if (id === 'spineTower') return this.spineTower(group);
  }

  private dragonCore(group: THREE.Group) {
    const stone = this.mode === 'clay' ? 0xb0aca1 : 0x71463b;
    this.add(group, new THREE.CylinderGeometry(0.3, 0.42, 0.65, 8), stone, [0, 0.42, 0]);
    this.add(group, new THREE.OctahedronGeometry(0.38), this.mode === 'clay' ? 0xc2beb2 : 0xf1a34d, [0, 1.02, 0], [0.75, 1.45, 0.75], this.mode === 'clay' ? 0 : 0x7a2d12);
    for (const side of [-1, 1]) {
      this.add(group, new THREE.ConeGeometry(0.12, 0.75, 5), stone, [side * 0.33, 0.63, 0], [1, 1, 1], [0, 0, side * -0.25]);
    }
  }

  private dragon(group: THREE.Group, scale: number) {
    const body = this.mode === 'clay' ? 0xb8b3a7 : 0xa84d32;
    const wing = this.mode === 'clay' ? 0xa7a398 : 0xe18a48;
    this.add(group, new THREE.SphereGeometry(0.3, 8, 6), body, [0, 0.55 * scale, 0], [scale, 0.72 * scale, 1.35 * scale]);
    this.add(group, new THREE.SphereGeometry(0.2, 7, 5), body, [0, 0.73 * scale, -0.35 * scale], [scale, scale, scale]);
    this.add(group, new THREE.ConeGeometry(0.1, 0.45, 6), body, [0, 0.48 * scale, 0.48 * scale], [scale, scale, scale], [Math.PI / 2.5, 0, 0]);
    for (const side of [-1, 1]) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute([
        0, 0, 0, side * 0.75, 0.14, 0.05, side * 0.5, -0.02, 0.62,
        0, 0, 0, side * 0.5, -0.02, 0.62, side * 0.24, -0.04, 0.4,
      ], 3));
      geometry.computeVertexNormals();
      const mesh = new THREE.Mesh(geometry, this.material(wing));
      (mesh.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
      mesh.position.set(0, 0.68 * scale, -0.12 * scale);
      mesh.scale.setScalar(scale);
      mesh.castShadow = true;
      group.add(mesh);
      this.add(group, new THREE.ConeGeometry(0.04, 0.28, 5), wing, [side * 0.1 * scale, 0.98 * scale, -0.37 * scale], [1, 1, 1], [-0.25, 0, side * -0.2]);
    }
  }

  private dragonTower(group: THREE.Group) {
    const stone = this.mode === 'clay' ? 0xaaa69b : 0x80604d;
    this.add(group, new THREE.CylinderGeometry(0.25, 0.36, 0.9, 8), stone, [0, 0.55, 0]);
    this.add(group, new THREE.ConeGeometry(0.4, 0.48, 8), this.mode === 'clay' ? 0xbab6aa : 0xb96c3d, [0, 1.2, 0]);
    this.add(group, new THREE.OctahedronGeometry(0.13), this.mode === 'clay' ? 0xc4c0b4 : 0xffc56b, [0, 1.48, 0], [1, 1.5, 1], this.mode === 'clay' ? 0 : 0x7a391b);
  }

  private roost(group: THREE.Group) {
    this.add(group, new THREE.TorusGeometry(0.35, 0.1, 6, 12), this.mode === 'clay' ? 0xaaa69b : 0x8e5b3e, [0, 0.35, 0], [1, 1, 1], [Math.PI / 2, 0, 0]);
    for (const [x, z, s] of [[-0.15, 0.05, 0.8], [0.16, 0.1, 1], [0, -0.17, 0.7]] as const) {
      this.add(group, new THREE.SphereGeometry(0.18, 8, 6), this.mode === 'clay' ? 0xbcb8ac : 0xf0bd64, [x, 0.52, z], [s, 1.35 * s, s], this.mode === 'clay' ? 0 : 0x6b3515);
    }
  }

  private swarmCore(group: THREE.Group) {
    const shell = this.mode === 'clay' ? 0xa8a49a : 0x3d4c56;
    this.add(group, new THREE.SphereGeometry(0.48, 9, 6), shell, [0, 0.55, 0], [1, 0.85, 1]);
    this.add(group, new THREE.SphereGeometry(0.24, 8, 6), this.mode === 'clay' ? 0xbcb8ad : 0x68d7ac, [0, 0.92, 0], [1, 1.35, 1], this.mode === 'clay' ? 0 : 0x1d6d54);
    for (let i = 0; i < 6; i++) {
      const angle = i * Math.PI / 3;
      this.add(group, new THREE.ConeGeometry(0.09, 0.72, 5), shell, [Math.cos(angle) * 0.38, 0.43, Math.sin(angle) * 0.38], [1, 1, 1], [Math.sin(angle) * 0.65, 0, -Math.cos(angle) * 0.65]);
    }
  }

  private stalker(group: THREE.Group, scale: number) {
    const shell = this.mode === 'clay' ? 0xaaa69b : 0x424b59;
    this.add(group, new THREE.SphereGeometry(0.32, 8, 5), shell, [0, 0.42 * scale, 0], [0.85 * scale, 0.55 * scale, 1.35 * scale]);
    this.add(group, new THREE.SphereGeometry(0.19, 7, 5), this.mode === 'clay' ? 0xb7b3a8 : 0x596577, [0, 0.46 * scale, -0.33 * scale], [scale, 0.75 * scale, scale]);
    for (let i = 0; i < 6; i++) {
      const side = i % 2 ? 1 : -1;
      const z = (Math.floor(i / 2) - 1) * 0.23;
      this.add(group, new THREE.ConeGeometry(0.045, 0.58 * scale, 5), shell, [side * 0.3 * scale, 0.3 * scale, z * scale], [1, 1, 1], [0, 0, side * -1.05]);
    }
    this.add(group, new THREE.SphereGeometry(0.07, 6, 4), this.mode === 'clay' ? 0xc0bcb0 : 0x79efbd, [0, 0.54 * scale, -0.48 * scale], [1, 1, 1], this.mode === 'clay' ? 0 : 0x247457);
  }

  private spitter(group: THREE.Group) {
    this.stalker(group, 1.05);
    const shell = this.mode === 'clay' ? 0xa5a196 : 0x4e5965;
    for (const x of [-0.16, 0, 0.16]) {
      this.add(group, new THREE.ConeGeometry(0.07, 0.62, 6), shell, [x, 0.82, 0.12], [1, 1, 1], [-0.35, 0, x * 1.5]);
    }
  }

  private brood(group: THREE.Group) {
    const shell = this.mode === 'clay' ? 0xa9a59a : 0x454b59;
    this.add(group, new THREE.SphereGeometry(0.42, 9, 6), shell, [0, 0.43, 0], [1, 0.7, 1]);
    for (let i = 0; i < 5; i++) {
      const angle = i * 2.4;
      this.add(group, new THREE.SphereGeometry(0.14, 7, 5), this.mode === 'clay' ? 0xbab6ab : 0x67cfa7, [Math.cos(angle) * 0.25, 0.58 + (i % 2) * 0.12, Math.sin(angle) * 0.25], [1, 1.3, 1], this.mode === 'clay' ? 0 : 0x1e5c49);
    }
  }

  private spineTower(group: THREE.Group) {
    const shell = this.mode === 'clay' ? 0xa9a59a : 0x505966;
    this.add(group, new THREE.ConeGeometry(0.34, 1.15, 7), shell, [0, 0.72, 0]);
    for (let i = 0; i < 5; i++) {
      const angle = i * Math.PI * 0.4;
      this.add(group, new THREE.ConeGeometry(0.065, 0.65, 5), shell, [Math.cos(angle) * 0.25, 0.67, Math.sin(angle) * 0.25], [1, 1, 1], [Math.sin(angle) * 0.6, 0, -Math.cos(angle) * 0.6]);
    }
    this.add(group, new THREE.SphereGeometry(0.1, 6, 4), this.mode === 'clay' ? 0xbcb8ad : 0x77e5b6, [0, 1.33, 0], [1, 1, 1], this.mode === 'clay' ? 0 : 0x22664f);
  }

  private add(group: THREE.Group, geometry: THREE.BufferGeometry, color: number, position: [number, number, number], scale: [number, number, number] = [1, 1, 1], rotationOrEmissive: [number, number, number] | number = [0, 0, 0], emissive = 0) {
    const rotation = typeof rotationOrEmissive === 'number' ? [0, 0, 0] as [number, number, number] : rotationOrEmissive;
    if (typeof rotationOrEmissive === 'number') emissive = rotationOrEmissive;
    const mesh = new THREE.Mesh(geometry, this.material(color, emissive));
    mesh.position.set(...position);
    mesh.scale.set(...scale);
    mesh.rotation.set(...rotation);
    mesh.castShadow = true;
    group.add(mesh);
    return mesh;
  }

  private material(color: number, emissive = 0) {
    return new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: emissive ? 0.55 : 0, roughness: 0.68, metalness: this.mode === 'clay' ? 0 : 0.08, flatShading: true });
  }

  private clear(group: THREE.Group) {
    group.traverse(child => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach(material => material.dispose());
      }
    });
    group.clear();
  }

  private handlePointerUp(event: PointerEvent) {
    if (Math.hypot(event.clientX - this.pointerStart.x, event.clientY - this.pointerStart.y) > 5 || event.button !== 0) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects([this.pieceGroup, this.terrainGroup], true);
    for (const hit of hits) {
      let object: THREE.Object3D | null = hit.object;
      while (object) {
        if (object.userData.pieceId) {
          const coord = object.userData.coord as Coord;
          this.onPick({ ...coord, pieceId: object.userData.pieceId as string });
          return;
        }
        if (object.userData.coord) {
          this.onPick({ ...(object.userData.coord as Coord) });
          return;
        }
        object = object.parent;
      }
    }
  }

  private resize() {
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    const aspect = width / height;
    const frustum = 17;
    this.camera.left = -frustum * aspect / 2;
    this.camera.right = frustum * aspect / 2;
    this.camera.top = frustum / 2;
    this.camera.bottom = -frustum / 2;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private animate = () => {
    requestAnimationFrame(this.animate);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };
}
