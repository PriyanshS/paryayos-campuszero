// ═══════════════════════════════════════════════════════
//  CampusZero — 3D Digital Twin Engine (Three.js)
// ═══════════════════════════════════════════════════════

const Twin = {
    scene: null,
    camera: null,
    renderer: null,
    controls: null,
    buildings: [],
    groundPlane: null,
    raycaster: null,
    mouse: null,
    selectedBuilding: null,
    _animFrame: null,
    _container: null,

    BUILDING_COLORS: {
        'yes': '#8ecae6',
        'residential': '#ff8c00',
        'dormitory': '#ff8c00',
        'commercial': '#4682b4',
        'school': '#4682b4',
        'university': '#4682b4',
        'college': '#4682b4',
        'hospital': '#ff6b6b',
        'industrial': '#adb5bd',
        'retail': '#b97fff',
        'office': '#2aff7a',
        'church': '#f5a623',
        'public': '#2affee',
        'default': '#c8d6e5',
    },

    // ── Initialize the 3D scene ──
    init(containerId) {
        this._container = document.getElementById(containerId);
        if (!this._container) return;

        const w = this._container.clientWidth;
        const h = this._container.clientHeight;

        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a1f0f);
        this.scene.fog = new THREE.FogExp2(0x0a1f0f, 0.0015);

        // Camera
        this.camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 5000);
        this.camera.position.set(300, 400, 300);
        this.camera.lookAt(0, 0, 0);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(w, h);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this._container.appendChild(this.renderer.domElement);

        // Controls
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.maxPolarAngle = Math.PI / 2.2;
        this.controls.minDistance = 50;
        this.controls.maxDistance = 1500;

        // Lighting
        const ambientLight = new THREE.AmbientLight(0x2aff7a, 0.15);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.position.set(200, 400, 200);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.camera.near = 1;
        dirLight.shadow.camera.far = 1200;
        dirLight.shadow.camera.left = -500;
        dirLight.shadow.camera.right = 500;
        dirLight.shadow.camera.top = 500;
        dirLight.shadow.camera.bottom = -500;
        this.scene.add(dirLight);

        const hemiLight = new THREE.HemisphereLight(0x2aff7a, 0x0a1f0f, 0.3);
        this.scene.add(hemiLight);

        // Ground
        this.createGround();

        // Grid helper
        const gridHelper = new THREE.GridHelper(1000, 40, 0x1e3329, 0x1e3329);
        gridHelper.position.y = 0.05;
        this.scene.add(gridHelper);

        // Raycaster for click detection
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        // Event listeners
        this.renderer.domElement.addEventListener('click', (e) => this.onMouseClick(e));
        window.addEventListener('resize', () => this.onResize());

        // Start render loop
        this.animate();
    },

    createGround() {
        const geo = new THREE.PlaneGeometry(2000, 2000, 1, 1);
        const mat = new THREE.MeshStandardMaterial({
            color: 0x0d2818,
            roughness: 1,
            metalness: 0
        });
        this.groundPlane = new THREE.Mesh(geo, mat);
        this.groundPlane.rotation.x = -Math.PI / 2;
        this.groundPlane.receiveShadow = true;
        this.scene.add(this.groundPlane);
    },

    // ── Convert lat/lon to local coordinates ──
    latLonToLocal(lat, lon, centerLat, centerLon) {
        const scale = 111320; // meters per degree at equator (roughly)
        const x = (lon - centerLon) * scale * Math.cos(centerLat * Math.PI / 180);
        const z = -(lat - centerLat) * scale;
        return { x, z };
    },

    // ── Fetch campus data from Overpass API ──
    async fetchCampusData(bbox) {
        const [south, west, north, east] = bbox;
        const query = `
      [out:json][timeout:30];
      (
        way["building"](${south},${west},${north},${east});
        relation["building"](${south},${west},${north},${east});
        way["highway"](${south},${west},${north},${east});
        way["leisure"="park"](${south},${west},${north},${east});
        way["natural"="water"](${south},${west},${north},${east});
      );
      (._;>;);
      out body;
    `;

        try {
            const response = await fetch('https://overpass-api.de/api/interpreter', {
                method: 'POST',
                body: query
            });
            if (!response.ok) throw new Error('Overpass API error');
            return await response.json();
        } catch (err) {
            console.warn('Failed to fetch OSM data, using procedural generation', err);
            return null;
        }
    },

    // ── Parse OSM data into buildings ──
    parseOSMData(data) {
        if (!data || !data.elements) return [];

        const nodes = {};
        const buildings = [];

        // Index all nodes
        data.elements.forEach(el => {
            if (el.type === 'node') {
                nodes[el.id] = { lat: el.lat, lon: el.lon };
            }
        });

        // Process buildings
        data.elements.forEach(el => {
            if (el.type === 'way' && el.tags && el.tags.building) {
                const coords = [];
                (el.nodes || []).forEach(nodeId => {
                    if (nodes[nodeId]) {
                        coords.push(nodes[nodeId]);
                    }
                });
                if (coords.length >= 3) {
                    buildings.push({
                        id: el.id,
                        type: el.tags.building,
                        name: el.tags.name || el.tags['addr:housenumber'] || `Building ${el.id}`,
                        height: el.tags.height ? parseFloat(el.tags.height) : (el.tags['building:levels'] ? parseInt(el.tags['building:levels']) * 3.5 : 10 + Math.random() * 15),
                        coords: coords,
                        tags: el.tags
                    });
                }
            }
        });

        return buildings;
    },

    // ── Build 3D buildings from parsed data ──
    buildFromOSM(buildings, bbox) {
        const centerLat = (bbox[0] + bbox[2]) / 2;
        const centerLon = (bbox[1] + bbox[3]) / 2;

        buildings.forEach((bldg, idx) => {
            try {
                const points = bldg.coords.map(c => this.latLonToLocal(c.lat, c.lon, centerLat, centerLon));

                // Create shape
                const shape = new THREE.Shape();
                shape.moveTo(points[0].x, points[0].z);
                for (let i = 1; i < points.length; i++) {
                    shape.lineTo(points[i].x, points[i].z);
                }
                shape.closePath();

                // Extrude
                const extrudeSettings = {
                    steps: 1,
                    depth: bldg.height,
                    bevelEnabled: false
                };
                const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
                geometry.rotateX(-Math.PI / 2);

                const colorHex = this.BUILDING_COLORS[bldg.type] || this.BUILDING_COLORS['default'];
                const material = new THREE.MeshStandardMaterial({
                    color: new THREE.Color(colorHex),
                    roughness: 0.7,
                    metalness: 0.1,
                    flatShading: true
                });

                const mesh = new THREE.Mesh(geometry, material);
                mesh.position.y = 0.1;
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                mesh.userData = {
                    id: bldg.id,
                    name: bldg.name,
                    type: bldg.type,
                    height: bldg.height,
                    index: idx
                };

                this.scene.add(mesh);

                // Edge lines for architectural look
                const edges = new THREE.EdgesGeometry(geometry);
                const lineMat = new THREE.LineBasicMaterial({ color: 0x2aff7a, transparent: true, opacity: 0.15 });
                const wireframe = new THREE.LineSegments(edges, lineMat);
                wireframe.position.y = 0.1;
                this.scene.add(wireframe);

                this.buildings.push({ mesh, wireframe, data: bldg });
            } catch (e) {
                // Skip malformed buildings
            }
        });
    },

    // ── Generate procedural campus (fallback) ──
    generateProceduralCampus() {
        const campusBuildings = [
            { name: 'Admin Block', w: 40, d: 25, h: 18, x: -60, z: -40, color: '#4682b4', type: 'admin' },
            { name: 'Main Academic', w: 60, d: 35, h: 22, x: 30, z: -50, color: '#2aff7a', type: 'academic' },
            { name: 'Science Lab', w: 30, d: 30, h: 15, x: 120, z: -30, color: '#8ecae6', type: 'lab' },
            { name: 'Library', w: 35, d: 40, h: 20, x: -50, z: 50, color: '#b97fff', type: 'library' },
            { name: 'Cafeteria', w: 40, d: 20, h: 8, x: 50, z: 50, color: '#ff8c00', type: 'cafeteria' },
            { name: 'Hostel A', w: 25, d: 50, h: 25, x: -130, z: 0, color: '#ff8c00', type: 'dormitory' },
            { name: 'Hostel B', w: 25, d: 50, h: 25, x: -130, z: 80, color: '#ff8c00', type: 'dormitory' },
            { name: 'Solar Array', w: 50, d: 20, h: 3, x: 130, z: 50, color: '#f5a623', type: 'solar' },
            { name: 'Sports Complex', w: 50, d: 40, h: 10, x: 50, z: 130, color: '#2affee', type: 'sports' },
            { name: 'BESS Unit', w: 12, d: 12, h: 6, x: 150, z: 80, color: '#2aff7a', type: 'bess' },
            { name: 'EV Parking', w: 30, d: 15, h: 4, x: -60, z: 130, color: '#adb5bd', type: 'parking' },
            { name: 'Utilities', w: 15, d: 15, h: 8, x: 160, z: -60, color: '#adb5bd', type: 'utility' },
            { name: 'Auditorium', w: 45, d: 30, h: 16, x: -20, z: -110, color: '#c8d6e5', type: 'auditorium' },
            { name: 'Workshop', w: 35, d: 20, h: 10, x: 110, z: -90, color: '#adb5bd', type: 'workshop' },
            { name: 'Water Tank', w: 10, d: 10, h: 14, x: -100, z: -80, color: '#4db8ff', type: 'water' },
        ];

        campusBuildings.forEach((bldg, idx) => {
            const geo = new THREE.BoxGeometry(bldg.w, bldg.h, bldg.d);
            const mat = new THREE.MeshStandardMaterial({
                color: new THREE.Color(bldg.color),
                roughness: 0.65,
                metalness: 0.1,
                flatShading: true
            });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(bldg.x, bldg.h / 2 + 0.1, bldg.z);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            mesh.userData = {
                id: 'proc_' + idx,
                name: bldg.name,
                type: bldg.type,
                height: bldg.h,
                index: idx,
                powerUsage: Math.round(50 + Math.random() * 150),
                waterUsage: Math.round(500 + Math.random() * 2000),
                wasteOutput: Math.round(10 + Math.random() * 50),
                sensorStatus: Math.random() > 0.2 ? 'online' : 'alert',
            };
            this.scene.add(mesh);

            // Edges
            const edges = new THREE.EdgesGeometry(geo);
            const lineMat = new THREE.LineBasicMaterial({ color: 0x2aff7a, transparent: true, opacity: 0.2 });
            const wireframe = new THREE.LineSegments(edges, lineMat);
            wireframe.position.copy(mesh.position);
            this.scene.add(wireframe);

            // Roof accent
            if (bldg.type === 'solar') {
                const roofGeo = new THREE.PlaneGeometry(bldg.w - 2, bldg.d - 2);
                const roofMat = new THREE.MeshStandardMaterial({ color: 0x1a237e, emissive: 0x0d47a1, emissiveIntensity: 0.2 });
                const roof = new THREE.Mesh(roofGeo, roofMat);
                roof.rotation.x = -Math.PI / 2;
                roof.position.set(bldg.x, bldg.h + 0.2, bldg.z);
                this.scene.add(roof);
            }

            // Sensor indicator light
            const dotGeo = new THREE.SphereGeometry(1.5, 8, 8);
            const dotColor = mesh.userData.sensorStatus === 'online' ? 0x2aff7a : 0xf5a623;
            const dotMat = new THREE.MeshBasicMaterial({ color: dotColor });
            const dot = new THREE.Mesh(dotGeo, dotMat);
            dot.position.set(bldg.x + bldg.w / 2 - 2, bldg.h + 2, bldg.z + bldg.d / 2 - 2);
            this.scene.add(dot);

            this.buildings.push({ mesh, wireframe, dot, data: { ...bldg, id: 'proc_' + idx } });
        });

        // Add some trees
        for (let i = 0; i < 40; i++) {
            this.addTree(
                (Math.random() - 0.5) * 400,
                (Math.random() - 0.5) * 300
            );
        }

        // Add roads
        this.addRoad(0, 0, 400, 8, 0); // horizontal
        this.addRoad(0, 0, 300, 8, Math.PI / 2); // vertical
    },

    addTree(x, z) {
        const trunkGeo = new THREE.CylinderGeometry(0.5, 0.8, 4, 6);
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3e2723 });
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.set(x, 2, z);
        trunk.castShadow = true;
        this.scene.add(trunk);

        const leavesGeo = new THREE.SphereGeometry(3, 6, 6);
        const leavesMat = new THREE.MeshStandardMaterial({ color: 0x1b5e20, flatShading: true });
        const leaves = new THREE.Mesh(leavesGeo, leavesMat);
        leaves.position.set(x, 6, z);
        leaves.castShadow = true;
        this.scene.add(leaves);
    },

    addRoad(x, z, length, width, rotation) {
        const geo = new THREE.PlaneGeometry(length, width);
        const mat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.9 });
        const road = new THREE.Mesh(geo, mat);
        road.rotation.x = -Math.PI / 2;
        road.rotation.z = rotation;
        road.position.set(x, 0.06, z);
        this.scene.add(road);
    },

    // ── Mouse click handler ──
    onMouseClick(event) {
        const rect = this._container.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const meshes = this.buildings.map(b => b.mesh);
        const intersects = this.raycaster.intersectObjects(meshes);

        if (intersects.length > 0) {
            const hit = intersects[0].object;

            // Reset previous selection
            if (this.selectedBuilding) {
                this.selectedBuilding.material.emissive.setHex(0x000000);
                this.selectedBuilding.material.emissiveIntensity = 0;
            }

            // Highlight new selection
            hit.material.emissive.setHex(0x2aff7a);
            hit.material.emissiveIntensity = 0.3;
            this.selectedBuilding = hit;

            // Dispatch event
            const evt = new CustomEvent('buildingSelected', { detail: hit.userData });
            document.dispatchEvent(evt);
        }
    },

    // ── Update building colors based on sensor data ──
    updateBuildingStatus(buildingId, status) {
        const bldg = this.buildings.find(b => b.data.id === buildingId);
        if (!bldg) return;

        const colors = {
            normal: 0x2aff7a,
            warning: 0xf5a623,
            critical: 0xff4d4d,
            offline: 0x666666,
        };

        const emissiveColor = colors[status] || colors.normal;
        bldg.mesh.material.emissive.setHex(emissiveColor);
        bldg.mesh.material.emissiveIntensity = status === 'normal' ? 0.05 : 0.3;

        if (bldg.dot) {
            bldg.dot.material.color.setHex(emissiveColor);
        }
    },

    // ── Animation loop ──
    animate() {
        this._animFrame = requestAnimationFrame(() => this.animate());

        if (this.controls) this.controls.update();

        // Subtle building pulse for selected
        if (this.selectedBuilding) {
            const t = Date.now() * 0.003;
            this.selectedBuilding.material.emissiveIntensity = 0.15 + Math.sin(t) * 0.15;
        }

        // Pulse sensor dots
        this.buildings.forEach(b => {
            if (b.dot) {
                const t = Date.now() * 0.002 + (b.data.index || 0);
                b.dot.scale.setScalar(0.8 + Math.sin(t) * 0.3);
            }
        });

        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    },

    onResize() {
        if (!this._container) return;
        const w = this._container.clientWidth;
        const h = this._container.clientHeight;
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
    },

    // ── Load campus ──
    async loadCampus(bbox) {
        if (bbox) {
            const data = await this.fetchCampusData(bbox);
            if (data) {
                const buildings = this.parseOSMData(data);
                if (buildings.length > 0) {
                    this.buildFromOSM(buildings, bbox);
                    return;
                }
            }
        }
        // Fallback to procedural
        this.generateProceduralCampus();
    },

    // ── Cleanup ──
    destroy() {
        if (this._animFrame) cancelAnimationFrame(this._animFrame);
        if (this.renderer) {
            this.renderer.dispose();
            if (this._container && this.renderer.domElement.parentNode === this._container) {
                this._container.removeChild(this.renderer.domElement);
            }
        }
        this.buildings = [];
        this.scene = null;
    }
};

window.Twin = Twin;
