import React, { useState, useRef, Suspense, Component } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, useCursor, Grid, useGLTF } from '@react-three/drei';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, Droplets, Users, Thermometer, X, Upload, Plus } from 'lucide-react';
import * as THREE from 'three';

// Building Data
const buildings = [
  { id: 'lib', name: 'Central Library', position: [-4, 0, -2], size: [3, 4, 3], type: 'Academic', energy: 85, water: 40, occupancy: 320 },
  { id: 'sci', name: 'Science Center', position: [4, 0, -3], size: [4, 3, 5], type: 'Lab', energy: 120, water: 90, occupancy: 150 },
  { id: 'dorm_a', name: 'Dormitory A', position: [-5, 0, 5], size: [3, 5, 2], type: 'Residential', energy: 45, water: 110, occupancy: 400 },
  { id: 'dorm_b', name: 'Dormitory B', position: [-1, 0, 5], size: [3, 5, 2], type: 'Residential', energy: 42, water: 105, occupancy: 380 },
  { id: 'admin', name: 'Admin Block', position: [5, 0, 4], size: [3, 2, 3], type: 'Office', energy: 60, water: 20, occupancy: 80 },
  { id: 'hub', name: 'Student Hub', position: [0, 0, 0], size: [4, 1.5, 4], type: 'Mixed', energy: 95, water: 60, occupancy: 550 },
];

const MODEL_OPTIONS = [
  { value: 'campus1', label: 'Campus 1', path: '/models/campus1.glb' },
  { value: 'campus2', label: 'Campus 2', path: '/models/campus2.glb' },
  { value: 'campus3', label: 'Campus 3', path: '/models/campus3.glb' },
  { value: 'default', label: 'DefaultComplex', path: null },
];

function getGlbAbsoluteUrl(path: string): string {
  if (typeof window === 'undefined') return path;
  const base = window.location.origin + (import.meta.env.BASE_URL || '').replace(/\/$/, '');
  return path.startsWith('http') ? path : `${base}${path.startsWith('/') ? '' : '/'}${path}`;
}

class GlbErrorBoundary extends Component<
  { fallback: React.ReactNode; children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError = () => ({ hasError: true });
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

function Building({ data, isSelected, onClick, viewMode, isolateMode }: any) {
  const mesh = useRef<THREE.Mesh>(null);
  const [hovered, setHover] = useState(false);
  useCursor(hovered);

  const getHeatmapColor = () => {
    if (viewMode === 'energy') {
      return data.energy > 100 ? '#ef4444' : data.energy > 60 ? '#f59e0b' : '#10b981';
    }
    if (viewMode === 'occupancy') {
      return data.occupancy > 400 ? '#ef4444' : data.occupancy > 200 ? '#f59e0b' : '#3b82f6';
    }
    return isSelected ? '#10b981' : hovered ? '#34d399' : '#e4e4e7';
  };

  const color = getHeatmapColor();
  const dimmed = isolateMode && !isSelected;

  useFrame((_state, delta) => {
    if (mesh.current) {
      mesh.current.position.y = data.size[1] / 2;
      if (isSelected) {
        mesh.current.rotation.y += delta * 0.5;
      } else {
        mesh.current.rotation.y = 0;
      }
    }
  });

  return (
    <group position={[data.position[0], 0, data.position[2]]}>
      <mesh
        ref={mesh}
        onClick={(e) => { e.stopPropagation(); onClick(data); }}
        onPointerOver={() => setHover(true)}
        onPointerOut={() => setHover(false)}
      >
        <boxGeometry args={data.size} />
        <meshStandardMaterial
          color={color}
          roughness={0.2}
          metalness={0.8}
          transparent
          opacity={dimmed ? 0.25 : viewMode !== 'standard' ? 0.9 : 1}
        />
        {isSelected && (
          <lineSegments>
            <edgesGeometry args={[new THREE.BoxGeometry(...data.size)]} />
            <lineBasicMaterial color="#10b981" linewidth={2} />
          </lineSegments>
        )}
      </mesh>
      {hovered && !isSelected && (
        <Html position={[0, data.size[1] + 1, 0]} center distanceFactor={10}>
          <div className="bg-zinc-900/90 text-white px-3 py-1 rounded-lg text-xs border border-white/10 whitespace-nowrap backdrop-blur-md">
            {data.name}
          </div>
        </Html>
      )}
    </group>
  );
}

function GlbModel({ url, onBuildingSelect, viewMode, selectedId }: { url: string; onBuildingSelect: (b: any) => void; selectedId: string | null; viewMode: string }) {
  const { scene } = useGLTF(url);
  const groupRef = useRef<THREE.Group>(null);
  const clone = React.useMemo(() => {
    const s = scene.clone();
    s.traverse((obj: any) => {
      if (obj.isMesh && obj.material) {
        obj.castShadow = obj.receiveShadow = true;
        const mat = obj.material;
        if (Array.isArray(mat)) {
          obj.userData.originalMaterials = mat.map((m: any) => ({ color: m.color?.clone(), emissive: m.emissive?.clone() }));
        } else {
          obj.userData.originalColor = mat.color?.clone?.();
          obj.userData.originalEmissive = mat.emissive?.clone?.();
        }
      }
    });
    return s;
  }, [scene]);
  const box = React.useMemo(() => {
    const b = new THREE.Box3().setFromObject(clone);
    const size = b.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z, 0.1);
    return { size, center: b.getCenter(new THREE.Vector3()), maxDim };
  }, [clone]);
  const scale = Math.max(0.1, Math.min(50, 15 / box.maxDim));
  const viewRef = useRef(viewMode);
  viewRef.current = viewMode;
  useFrame(() => {
    const mode = viewRef.current;
    clone.traverse((obj: any) => {
      if (!obj.isMesh || !obj.material) return;
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach((mat: any, i: number) => {
        const orig = Array.isArray(obj.userData.originalMaterials) ? obj.userData.originalMaterials[i] : obj.userData;
        if (mode === 'energy') {
          mat.color?.setHex(0x10b981);
          if (mat.emissive) mat.emissive.setHex(0x065f46);
        } else if (mode === 'occupancy') {
          mat.color?.setHex(0x3b82f6);
          if (mat.emissive) mat.emissive.setHex(0x1e3a8a);
        } else if (orig?.originalColor) {
          mat.color?.copy(orig.originalColor);
          if (mat.emissive && orig.originalEmissive) mat.emissive.copy(orig.originalEmissive);
        }
      });
    });
  });
  return (
    <group
      ref={groupRef}
      scale={[scale, scale, scale]}
      position={[-box.center.x * scale, -box.center.y * scale, -box.center.z * scale]}
    >
      <primitive
        object={clone}
        onClick={(e: any) => {
          e.stopPropagation();
          const name = e.object?.name || e.eventObject?.name || 'Building';
          onBuildingSelect({
            id: name.toLowerCase().replace(/\s/g, '_'),
            name,
            type: 'GLB',
            energy: 75,
            water: 50,
            occupancy: 200,
            temp: 22.4,
          });
        }}
      />
    </group>
  );
}

function ImagePlaceholder({ imageUrl, width = 20, depth = 15, height = 10 }: { imageUrl: string; width?: number; depth?: number; height?: number }) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  React.useEffect(() => {
    const loader = new THREE.TextureLoader();
    const url = imageUrl.startsWith("data:") ? imageUrl : imageUrl;
    loader.load(url, setTexture, undefined, () => setTexture(null));
  }, [imageUrl]);
  const grey = new THREE.Color("#4b5563");
  return (
    <group position={[0, height / 2, 0]}>
      <mesh>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color={grey} />
      </mesh>
      <mesh position={[0, 0, depth / 2 + 0.01]}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial map={texture} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0, -depth / 2 - 0.01]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial map={texture} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function DefaultScene({ onSelect, selectedId, viewMode, isolateMode }: any) {
  return (
    <>
      {buildings.map((b) => (
        <Building
          key={b.id}
          data={b}
          isSelected={selectedId === b.id}
          onClick={onSelect}
          viewMode={viewMode}
          isolateMode={isolateMode}
        />
      ))}
    </>
  );
}

function CustomBuildingMesh({
  data,
  isSelected,
  onClick,
  viewMode,
  isolateMode,
}: {
  data: { id: number; name: string; energy: number; water: number; occupancy: number; temp?: number | null; position_x: number; position_z: number; photo_base64?: string | null };
  isSelected: boolean;
  onClick: (d: any) => void;
  viewMode: string;
  isolateMode: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHover] = useState(false);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  React.useEffect(() => {
    if (!data.photo_base64) return;
    const loader = new THREE.TextureLoader();
    loader.load(data.photo_base64, setTexture, undefined, () => setTexture(null));
  }, [data.photo_base64]);
  const w = 2.5;
  const h = 2;
  const d = 2.5;
  const color =
    viewMode === 'energy'
      ? data.energy > 80 ? '#ef4444' : data.energy > 40 ? '#f59e0b' : '#10b981'
      : viewMode === 'occupancy'
        ? data.occupancy > 300 ? '#ef4444' : data.occupancy > 100 ? '#f59e0b' : '#3b82f6'
        : isSelected ? '#10b981' : hovered ? '#34d399' : '#e4e4e7';
  return (
    <group position={[data.position_x, h / 2, data.position_z]}>
      <mesh
        ref={meshRef}
        onClick={(e) => { e.stopPropagation(); onClick({ ...data, type: 'Custom' }); }}
        onPointerOver={() => setHover(true)}
        onPointerOut={() => setHover(false)}
      >
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial
          color={color}
          map={texture}
          transparent
          opacity={isolateMode && !isSelected ? 0.25 : 1}
        />
      </mesh>
      {isSelected && (
        <lineSegments>
          <edgesGeometry args={[new THREE.BoxGeometry(w, h, d)]} />
          <lineBasicMaterial color="#10b981" />
        </lineSegments>
      )}
    </group>
  );
}

function Scene({
  onSelect,
  selectedId,
  viewMode,
  modelType,
  uploadImageUrl,
  uploadDimensions,
  isolateMode,
  customBuildings,
}: {
  onSelect: (b: any) => void;
  selectedId: string | null;
  viewMode: string;
  modelType: string;
  uploadImageUrl: string | null;
  uploadDimensions: { width: number; depth: number; height: number } | null;
  isolateMode: boolean;
  customBuildings: any[];
}) {
  const option = MODEL_OPTIONS.find((o) => o.value === modelType);
  const glbPath = option?.path ?? null;

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, 10, -10]} intensity={0.5} />

      <Grid
        infiniteGrid
        fadeDistance={30}
        sectionColor="#3f3f46"
        cellColor="#27272a"
        sectionSize={3}
        cellSize={1}
      />

      {modelType === 'upload' && uploadImageUrl ? (
        <Suspense fallback={null}>
          <ImagePlaceholder
            imageUrl={uploadImageUrl}
            width={uploadDimensions?.width ?? 20}
            depth={uploadDimensions?.depth ?? 15}
            height={uploadDimensions?.height ?? 10}
          />
        </Suspense>
      ) : glbPath ? (
        <GlbErrorBoundary
          fallback={<DefaultScene onSelect={onSelect} selectedId={selectedId} viewMode={viewMode} isolateMode={isolateMode} />}
        >
          <Suspense fallback={<DefaultScene onSelect={onSelect} selectedId={selectedId} viewMode={viewMode} isolateMode={isolateMode} />}>
            <GlbModel
              url={getGlbAbsoluteUrl(glbPath)}
              onBuildingSelect={onSelect}
              selectedId={selectedId}
              viewMode={viewMode}
            />
          </Suspense>
        </GlbErrorBoundary>
      ) : (
        <DefaultScene onSelect={onSelect} selectedId={selectedId} viewMode={viewMode} isolateMode={isolateMode} />
      )}

      {customBuildings.map((b) => (
        <CustomBuildingMesh
          key={b.id}
          data={b}
          isSelected={selectedId === `custom_${b.id}`}
          onClick={(d) => onSelect({ ...d, id: `custom_${d.id}` })}
          viewMode={viewMode}
          isolateMode={isolateMode}
        />
      ))}

      <OrbitControls
        makeDefault
        minPolarAngle={0}
        maxPolarAngle={Math.PI / 2.1}
        maxDistance={30}
      />
    </>
  );
}

function AddBuildingModal({
  open,
  onClose,
  onSaved,
  nextPosition,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  nextPosition: { x: number; z: number };
}) {
  const [name, setName] = useState('');
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [energy, setEnergy] = useState(50);
  const [water, setWater] = useState(40);
  const [occupancy, setOccupancy] = useState(100);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file?.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => setPhotoBase64(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) { setError('Name required'); return; }
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:8000/api/buildings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: name.trim(),
          photo_base64: photoBase64 || null,
          energy: Number(energy) || 0,
          water: Number(water) || 0,
          occupancy: Number(occupancy) || 0,
          position_x: nextPosition.x,
          position_z: nextPosition.z,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).detail || 'Failed');
      onSaved();
    } catch (err: any) {
      setError(err.message || 'Failed to add building');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-zinc-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-xl"
      >
        <h3 className="text-lg font-semibold text-white mb-4">Add Building</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-zinc-800 border border-white/10 rounded-lg px-3 py-2 text-white"
              placeholder="Building name"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Photo</label>
            <input type="file" accept="image/*" onChange={handlePhoto} className="w-full text-sm text-zinc-400" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Energy (kW)</label>
              <input type="number" value={energy} onChange={(e) => setEnergy(Number(e.target.value))} className="w-full bg-zinc-800 border border-white/10 rounded-lg px-2 py-1.5 text-white text-sm" />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Water (L)</label>
              <input type="number" value={water} onChange={(e) => setWater(Number(e.target.value))} className="w-full bg-zinc-800 border border-white/10 rounded-lg px-2 py-1.5 text-white text-sm" />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Occupancy</label>
              <input type="number" value={occupancy} onChange={(e) => setOccupancy(Number(e.target.value))} className="w-full bg-zinc-800 border border-white/10 rounded-lg px-2 py-1.5 text-white text-sm" />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg border border-white/10 text-zinc-400 hover:bg-white/5">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50">{saving ? 'Saving…' : 'Add'}</button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

interface DigitalTwinProps {
  initialModel?: string;
}

export default function DigitalTwin({ initialModel = 'campus1' }: DigitalTwinProps) {
  const [selectedBuilding, setSelectedBuilding] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'standard' | 'energy' | 'occupancy'>('standard');
  const [selectedModel, setSelectedModel] = useState<string>(initialModel);
  const [uploadImageUrl, setUploadImageUrl] = useState<string | null>(null);
  const [uploadDimensions, setUploadDimensions] = useState<{ width: number; depth: number; height: number } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [customBuildings, setCustomBuildings] = useState<any[]>([]);
  const [addBuildingOpen, setAddBuildingOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setSelectedModel(initialModel);
  }, [initialModel]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    ['/models/campus1.glb', '/models/campus2.glb', '/models/campus3.glb'].forEach((path) => {
      try {
        useGLTF.preload(getGlbAbsoluteUrl(path));
      } catch (_) {}
    });
  }, []);

  const fetchBuildings = React.useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch('http://localhost:8000/api/buildings', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : []))
      .then(setCustomBuildings)
      .catch(() => setCustomBuildings([]));
  }, []);

  React.useEffect(() => {
    fetchBuildings();
  }, [fetchBuildings]);

  const handleUploadPicture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) {
      e.target.value = '';
      return;
    }
    const dataUrl = await new Promise<string>((res, rej) => {
      const reader = new FileReader();
      reader.onload = () => res(reader.result as string);
      reader.onerror = rej;
      reader.readAsDataURL(file);
    });
    setUploading(true);
    try {
      const token = localStorage.getItem('token');
      const form = new FormData();
      form.append('file', file);
      const r = await fetch('http://localhost:8000/api/ai/analyze-building-image', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      if (r.ok) {
        const dims = await r.json();
        setUploadDimensions({ width: dims.width ?? 20, depth: dims.depth ?? 15, height: dims.height ?? 10 });
      } else {
        setUploadDimensions({ width: 20, depth: 15, height: 10 });
      }
    } catch {
      setUploadDimensions({ width: 20, depth: 15, height: 10 });
    }
    setUploadImageUrl(dataUrl);
    setSelectedModel('upload');
    setUploading(false);
    e.target.value = '';
  };

  return (
    <div className="h-full flex flex-col relative bg-zinc-950">
      <div className="absolute top-4 left-4 z-10 pointer-events-none">
        <h1 className="text-2xl font-light tracking-tight text-white mb-0.5">
          Campus <span className="font-serif italic text-emerald-400">Twin</span>
        </h1>
        <p className="text-zinc-500 text-xs">Interactive 3D Environment</p>
      </div>

      <div className="flex-1 w-full min-h-0 relative">
        <Canvas camera={{ position: [15, 12, 15], fov: 45 }}>
          <Scene
            onSelect={setSelectedBuilding}
            selectedId={selectedBuilding?.id}
            viewMode={viewMode}
            modelType={selectedModel}
            uploadImageUrl={uploadImageUrl}
            uploadDimensions={uploadDimensions}
            isolateMode={!!selectedBuilding}
            customBuildings={customBuildings}
          />
        </Canvas>
      </div>

      {/* Bottom control bar - no overlap */}
      <div className="flex-shrink-0 border-t border-white/10 bg-zinc-900/95 backdrop-blur-sm z-10">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-3 max-w-full">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500 uppercase tracking-wider whitespace-nowrap">Campus</span>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="bg-zinc-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 min-w-[140px]"
              >
                {MODEL_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-zinc-800 border border-white/10 text-zinc-100 hover:border-emerald-500/30 hover:text-emerald-400 transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              <Upload size={16} />
              {uploading ? 'Analyzing…' : 'Upload Picture'}
            </button>
            <button
              type="button"
              onClick={() => setAddBuildingOpen(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 whitespace-nowrap"
            >
              <Plus size={16} />
              Add Building
            </button>
          </div>
          <div className="h-px sm:h-6 sm:w-px bg-white/10 hidden sm:block" />
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-xs text-zinc-500 uppercase tracking-wider mr-1 sm:mr-2">View</span>
            <button
              onClick={() => setViewMode('standard')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === 'standard' ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-400 hover:text-white border border-white/10'}`}
            >
              Standard
            </button>
            <button
              onClick={() => setViewMode('energy')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === 'energy' ? 'bg-emerald-500 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white border border-white/10'}`}
            >
              Energy Map
            </button>
            <button
              onClick={() => setViewMode('occupancy')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === 'occupancy' ? 'bg-blue-500 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white border border-white/10'}`}
            >
              Occupancy
            </button>
          </div>
        </div>
      </div>
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleUploadPicture} className="hidden" />

      <AddBuildingModal
        open={addBuildingOpen}
        onClose={() => setAddBuildingOpen(false)}
        onSaved={() => { setAddBuildingOpen(false); fetchBuildings(); }}
        nextPosition={{
          x: (customBuildings.length % 4) * 6 - 6,
          z: Math.floor(customBuildings.length / 4) * 6,
        }}
      />

      <AnimatePresence>
        {selectedBuilding && (
          <motion.div
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            className="absolute top-0 right-0 h-full w-96 bg-zinc-900/95 border-l border-white/10 backdrop-blur-xl p-6 shadow-2xl z-20 overflow-y-auto"
          >
            <div className="flex justify-between items-start mb-8">
              <div>
                <div className="text-xs font-mono text-emerald-400 mb-1">ID: {(selectedBuilding.id || '').toUpperCase()}</div>
                <h2 className="text-2xl font-bold text-white">{selectedBuilding.name}</h2>
                <span className="text-zinc-500 text-sm">{selectedBuilding.type === 'Custom' ? 'Your building' : selectedBuilding.type + ' Building'}</span>
              </div>
              <button
                onClick={() => setSelectedBuilding(null)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors text-zinc-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-zinc-800/50 p-4 rounded-xl border border-white/5">
                  <div className="flex items-center gap-2 text-zinc-400 mb-2">
                    <Zap size={16} />
                    <span className="text-xs uppercase">Power Draw</span>
                  </div>
                  <div className="text-2xl font-mono text-white">{selectedBuilding.energy ?? '—'} <span className="text-sm text-zinc-500">kW</span></div>
                </div>
                <div className="bg-zinc-800/50 p-4 rounded-xl border border-white/5">
                  <div className="flex items-center gap-2 text-zinc-400 mb-2">
                    <Droplets size={16} />
                    <span className="text-xs uppercase">Water Flow</span>
                  </div>
                  <div className="text-2xl font-mono text-white">{selectedBuilding.water ?? '—'} <span className="text-sm text-zinc-500">L/m</span></div>
                </div>
                <div className="bg-zinc-800/50 p-4 rounded-xl border border-white/5">
                  <div className="flex items-center gap-2 text-zinc-400 mb-2">
                    <Users size={16} />
                    <span className="text-xs uppercase">Occupancy</span>
                  </div>
                  <div className="text-2xl font-mono text-white">{selectedBuilding.occupancy ?? '—'} <span className="text-sm text-zinc-500">ppl</span></div>
                </div>
                <div className="bg-zinc-800/50 p-4 rounded-xl border border-white/5">
                  <div className="flex items-center gap-2 text-zinc-400 mb-2">
                    <Thermometer size={16} />
                    <span className="text-xs uppercase">Avg Temp</span>
                  </div>
                  <div className="text-2xl font-mono text-white">{selectedBuilding.temp ?? 22.4} <span className="text-sm text-zinc-500">°C</span></div>
                </div>
              </div>

              <div className="bg-zinc-800/30 p-4 rounded-xl border border-white/5">
                <h3 className="text-sm font-medium text-zinc-300 mb-3">Efficiency Rating</h3>
                <div className="flex items-center gap-4">
                  <div className="flex-1 h-2 bg-zinc-700 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 w-[85%]" />
                  </div>
                  <span className="font-mono text-emerald-400">A+</span>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-medium text-zinc-300">Active Systems</h3>
                <div className="flex items-center justify-between p-3 bg-zinc-800/30 rounded-lg border border-white/5">
                  <span className="text-sm text-zinc-400">HVAC</span>
                  <span className="text-xs px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded">Optimized</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-zinc-800/30 rounded-lg border border-white/5">
                  <span className="text-sm text-zinc-400">Lighting</span>
                  <span className="text-xs px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded">Auto-Dimming</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-zinc-800/30 rounded-lg border border-white/5">
                  <span className="text-sm text-zinc-400">Solar Roof</span>
                  <span className="text-xs px-2 py-1 bg-blue-500/10 text-blue-400 rounded">Generating</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
