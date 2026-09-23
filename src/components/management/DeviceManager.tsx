import React, { useState } from 'react';
import { CameraDevice, DayNightMode, VideoCodec, VideoResolution } from '../../types/camera';
import { PUBLIC_WORLD_CAMERA_TEMPLATES } from '../../data/mockData';
import { 
  Plus, Search, Sliders, Trash2, Edit3, 
  Video, Sun, Activity, Save, X, Radio, Check, Globe, Laptop
} from 'lucide-react';

interface DeviceManagerProps {
  cameras: CameraDevice[];
  onAddCamera: (newCamera: CameraDevice) => void;
  onUpdateCamera: (id: string, updates: Partial<CameraDevice>) => void;
  onDeleteCamera: (id: string) => void;
}

export const DeviceManager: React.FC<DeviceManagerProps> = ({
  cameras,
  onAddCamera,
  onUpdateCamera,
  onDeleteCamera
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRegion, setFilterRegion] = useState<'all' | 'public' | 'local'>('all');
  const [selectedCameraForEdit, setSelectedCameraForEdit] = useState<CameraDevice | null>(null);
  const [activeEditTab, setActiveEditTab] = useState<'stream' | 'sensor' | 'motion'>('stream');
  
  // Delete Confirmation Modal State
  const [cameraToDelete, setCameraToDelete] = useState<CameraDevice | null>(null);

  // Add Camera Modal State
  const [showAddModal, setShowAddModal] = useState(false);

  // Simplified Add Camera Form (ONLY truly required details to show in live feed)
  const [newCamName, setNewCamName] = useState('');
  const [newCamLocation, setNewCamLocation] = useState('');
  const [newCamStreamUrl, setNewCamStreamUrl] = useState('');
  const [newCamFeedType, setNewCamFeedType] = useState<'hls' | 'local' | 'video' | 'youtube'>('hls');
  const [newCamScene, setNewCamScene] = useState<CameraDevice['sceneType']>('traffic');
  const [newCamPtz, setNewCamPtz] = useState(true);
  const [newCamBrand, setNewCamBrand] = useState('Axis Communications');

  // Filter cameras
  const filteredCameras = cameras.filter((cam) => {
    const matchesSearch = cam.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          cam.ipAddress.includes(searchTerm) ||
                          cam.location.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterRegion === 'public') {
      return matchesSearch && (cam.feedType === 'hls' || cam.isPublicFeed);
    }
    if (filterRegion === 'local') {
      return matchesSearch && cam.feedType === 'local';
    }
    return matchesSearch;
  });

  // Handle Quick Template Autofill
  const handleSelectTemplate = (tpl: typeof PUBLIC_WORLD_CAMERA_TEMPLATES[0]) => {
    setNewCamName(tpl.name);
    setNewCamLocation(tpl.location);
    setNewCamStreamUrl(tpl.streamUrl || tpl.ipAddress);
    setNewCamScene(tpl.sceneType);
    setNewCamBrand(tpl.brand);
    setNewCamFeedType(tpl.feedType || 'hls');
    setNewCamPtz(true);
  };

  // Submit Simplified New Camera
  const handleCreateCamera = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCamName.trim()) return;

    const nameLower = newCamName.toLowerCase();
    const locLower = newCamLocation.toLowerCase();

    // Auto-detect scene type
    let finalScene = newCamScene;
    if (nameLower.includes('varanasi') || locLower.includes('varanasi') || nameLower.includes('ghat')) {
      finalScene = 'riverfront';
    } else if (nameLower.includes('sea link') || locLower.includes('mumbai') || nameLower.includes('bridge')) {
      finalScene = 'bridge';
    } else if (nameLower.includes('connaught') || locLower.includes('delhi')) {
      finalScene = 'traffic';
    } else if (locLower.includes('bengaluru') || nameLower.includes('bengaluru')) {
      finalScene = 'traffic';
    }

    // Pick appropriate base image based on scene type
    let chosenImage = '/src/assets/images/cctv_varanasi_ghat_1790168281018.jpg';
    if (finalScene === 'bridge') {
      chosenImage = '/src/assets/images/cctv_mumbai_sealink_1790168253332.jpg';
    } else if (finalScene === 'traffic') {
      chosenImage = '/src/assets/images/cctv_delhi_traffic_1790168266935.jpg';
    } else if (finalScene === 'riverfront') {
      chosenImage = '/src/assets/images/cctv_varanasi_ghat_1790168281018.jpg';
    } else if (finalScene === 'entrance' || finalScene === 'lobby') {
      chosenImage = '/src/assets/images/cctv_building_entrance_1790157536323.jpg';
    }

    const streamInput = newCamStreamUrl.trim();
    let detectedFeedType = newCamFeedType;
    let ytId: string | undefined = undefined;
    let hlsUrl: string | undefined = undefined;

    if (detectedFeedType === 'local' || streamInput.startsWith('device:')) {
      detectedFeedType = 'local';
    } else if (streamInput.includes('youtube.com') || streamInput.includes('youtu.be')) {
      detectedFeedType = 'youtube';
      const match = streamInput.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|live\/))([a-zA-Z0-9_-]{11})/);
      ytId = match ? match[1] : undefined;
    } else if (streamInput.endsWith('.m3u8') || streamInput.includes('.m3u8') || detectedFeedType === 'hls') {
      detectedFeedType = 'hls';
      hlsUrl = streamInput || 'https://media-sfs2.vdotcameras.com:443/rtplive/38iggm3xn7t5tr9grypj6mmtuxjp165p/playlist.m3u8';
    }

    const cleanAddress = streamInput || `192.168.1.${110 + cameras.length}`;
    
    // Generate guaranteed unique ID (never collides even if cameras are deleted and re-added)
    const existingIds = new Set(cameras.map(c => c.id));
    let counter = 1;
    while (existingIds.has(`CAM-${String(counter).padStart(2, '0')}`)) {
      counter++;
    }
    const nextId = `CAM-${String(counter).padStart(2, '0')}`;

    const isIndia = locLower.includes('india') ||
                    locLower.includes('mumbai') ||
                    locLower.includes('delhi') ||
                    locLower.includes('varanasi') ||
                    locLower.includes('bengaluru') ||
                    nameLower.includes('ghat') ||
                    newCamBrand === 'CP Plus';

    const newCam: CameraDevice = {
      id: nextId,
      name: newCamName.trim(),
      location: newCamLocation.trim() || 'Live Monitoring Point',
      brand: newCamBrand,
      model: isIndia ? 'CP-PLUS Ultra HD Live Cam' : '4K Live Surveillance Cam',
      ipAddress: cleanAddress,
      subnetMask: '255.255.255.0',
      gateway: '192.168.1.1',
      dns: '1.1.1.1',
      macAddress: `4A:8B:${Math.floor(Math.random() * 89 + 10)}:${Math.floor(Math.random() * 89 + 10)}:C1:22`,
      httpPort: 80,
      rtspPort: cleanAddress.includes(':') ? Number(cleanAddress.split(':')[1]) : 554,
      onvifPort: 8000,
      httpsPort: 443,
      rtspMainUrl: cleanAddress.startsWith('rtsp') ? cleanAddress : `rtsp://admin:••••••••@${cleanAddress}/live`,
      rtspSubUrl: cleanAddress.startsWith('rtsp') ? cleanAddress : `rtsp://admin:••••••••@${cleanAddress}/sub`,
      streamUrl: streamInput || (detectedFeedType === 'local' ? 'device://camera/0' : ytId ? `https://www.youtube.com/watch?v=36YnV9STBqc` : cleanAddress),
      username: 'admin',
      status: 'online',
      resolution: '4K (3840x2160)',
      fps: 30,
      codec: 'H.265',
      bitrateKbps: 4096,
      ptzCapable: newCamPtz,
      ptzState: { pan: 0, tilt: 0, zoom: 1.0, focus: 50, iris: 50, isPatrolling: false },
      presets: [
        { id: 1, name: 'Main Angle', pan: 0, tilt: 0, zoom: 1.0 },
        { id: 2, name: 'Close Focus', pan: 15, tilt: -10, zoom: 2.5 }
      ],
      imageSettings: {
        brightness: 50,
        contrast: 50,
        saturation: 50,
        sharpness: 50,
        wdr: true,
        irCut: 'auto',
        noiseReduction: true
      },
      poePort: cameras.length + 1,
      poeWattage: 9.5,
      vlanId: 10,
      storageUsedGb: 0,
      recordingMode: 'continuous',
      isRecording: true,
      motionConfig: {
        enabled: true,
        sensitivity: 70,
        threshold: 25,
        gridMask: Array.from({ length: 12 }, () => Array(16).fill(true)),
        triggerRecording: true,
        triggerAlarm: true
      },
      firmware: 'V4.2.0_latest',
      uptimeSeconds: 120,
      sceneType: finalScene,
      baseImage: chosenImage,
      country: isIndia ? 'India' : 'US',
      isPublicFeed: true,
      feedType: detectedFeedType,
      youtubeId: ytId,
      hlsUrl: hlsUrl
    };

    onAddCamera(newCam);

    // Reset Form
    setNewCamName('');
    setNewCamLocation('');
    setNewCamStreamUrl('');
    setShowAddModal(false);
  };

  // Toggle mask cell for Motion tab
  const handleToggleMaskCell = (rIdx: number, cIdx: number) => {
    if (!selectedCameraForEdit) return;
    const curMask = selectedCameraForEdit.motionConfig.gridMask.map(row => [...row]);
    curMask[rIdx][cIdx] = !curMask[rIdx][cIdx];
    setSelectedCameraForEdit({
      ...selectedCameraForEdit,
      motionConfig: {
        ...selectedCameraForEdit.motionConfig,
        gridMask: curMask
      }
    });
  };

  return (
    <div className="flex flex-col flex-1 h-full min-h-0 bg-slate-950 p-4 overflow-y-auto">
      {/* Top Header & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <span>Camera Device Inventory</span>
            <span className="text-xs font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800">
              {cameras.length} Active Feeds
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage live camera streams, public feeds from India & worldwide, and configure stream quality.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setNewCamName('');
            setNewCamLocation('');
            setNewCamStreamUrl('');
            setShowAddModal(true);
          }}
          className="px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-xs font-medium text-white flex items-center gap-1.5 shadow-md shadow-cyan-900/40 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Camera</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 py-3">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search cameras by name, city, location, or IP..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {/* Feed Type Filter Chips */}
        <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setFilterRegion('all')}
            className={`px-3 py-1 rounded transition-colors ${
              filterRegion === 'all'
                ? 'bg-slate-800 text-white font-medium'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Feeds ({cameras.length})
          </button>

          <button
            type="button"
            onClick={() => setFilterRegion('public')}
            className={`px-3 py-1 rounded transition-colors flex items-center gap-1.5 ${
              filterRegion === 'public'
                ? 'bg-emerald-500/20 text-emerald-300 font-medium border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>🌐 Public Live Streams</span>
            <span className="text-[10px] font-mono font-bold">
              ({cameras.filter(c => c.feedType === 'hls' || c.isPublicFeed).length})
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterRegion('local')}
            className={`px-3 py-1 rounded transition-colors flex items-center gap-1.5 ${
              filterRegion === 'local'
                ? 'bg-cyan-500/20 text-cyan-300 font-medium border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>💻 Hardware Cam</span>
            <span className="text-[10px] font-mono font-bold">
              ({cameras.filter(c => c.feedType === 'local').length})
            </span>
          </button>
        </div>
      </div>

      {/* Device Table */}
      <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-900/60 shadow-inner">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-mono uppercase text-slate-400">
              <tr>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Camera Name & Location</th>
                <th className="py-2.5 px-3">IP / Stream Source</th>
                <th className="py-2.5 px-3">Resolution & Codec</th>
                <th className="py-2.5 px-3">Bitrate</th>
                <th className="py-2.5 px-3">PTZ</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredCameras.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 italic">
                    No camera feeds found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredCameras.map((cam) => (
                  <tr key={cam.id} className="hover:bg-slate-800/50 transition-colors">
                    {/* Status */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="font-mono capitalize text-[11px] text-slate-300">
                          {cam.status}
                        </span>
                      </div>
                    </td>

                    {/* Camera Name & Location */}
                    <td className="py-2.5 px-3">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-medium text-slate-200">{cam.name}</span>
                          {cam.feedType === 'hls' && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-mono">
                              HLS Live
                            </span>
                          )}
                          {cam.feedType === 'local' && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 font-mono">
                              Local Cam
                            </span>
                          )}
                          {cam.country && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                              {cam.country}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {cam.location} · {cam.brand}
                        </span>
                      </div>
                    </td>

                    {/* IP Address / Stream */}
                    <td className="py-2.5 px-3 font-mono text-[11px]">
                      <span className="text-cyan-400">{cam.ipAddress}</span>
                    </td>

                    {/* Resolution & Codec */}
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-300 whitespace-nowrap">
                      {cam.resolution}
                      <span className="text-slate-500 ml-1">({cam.codec})</span>
                    </td>

                    {/* Bitrate */}
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-300 tabular-nums">
                      {cam.bitrateKbps.toLocaleString()} kbps
                    </td>

                    {/* PTZ Capable */}
                    <td className="py-2.5 px-3">
                      {cam.ptzCapable ? (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800">
                          PTZ Active
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-slate-500">Fixed</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedCameraForEdit(cam)}
                          title="Configure Camera Stream"
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setCameraToDelete(cam)}
                          title="Delete Camera"
                          className="p-1.5 bg-slate-800 hover:bg-red-900/60 text-slate-400 hover:text-red-300 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation In-App Modal (Guaranteed functional, no iframe browser prompt blockage) */}
      {cameraToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-red-500/50 rounded-xl w-full max-w-md shadow-2xl p-5 flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-red-950/80 border border-red-800 text-red-400 rounded-lg">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-slate-100">
                  Delete Camera Feed?
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  Are you sure you want to delete <span className="font-semibold text-white">"{cameraToDelete.name}"</span> ({cameraToDelete.ipAddress}) from the live surveillance pool?
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setCameraToDelete(null)}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteCamera(cameraToDelete.id);
                  setCameraToDelete(null);
                }}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-medium transition-colors shadow-md shadow-red-900/30 flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Yes, Delete Camera</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Streamlined Add Camera Modal - Asks ONLY truly required details */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950">
              <div>
                <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-cyan-400" />
                  <span>Add Real Live Camera</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Embed any verified public live HLS camera stream or local hardware sensor.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCamera} className="p-4 overflow-y-auto flex-1 text-xs flex flex-col gap-4">
              {/* 1-Click Quick Add Real Public Live Feeds */}
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex flex-col gap-2">
                <span className="text-[11px] font-semibold text-emerald-300 flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                  <span>🌐 Quick Add Verified Live Public Feeds</span>
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {PUBLIC_WORLD_CAMERA_TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.name}
                      type="button"
                      onClick={() => handleSelectTemplate(tpl)}
                      className="p-2 bg-slate-900 hover:bg-slate-850 hover:border-emerald-500/50 border border-slate-800 rounded text-left transition-colors flex flex-col gap-0.5 group"
                    >
                      <span className="text-xs text-slate-200 group-hover:text-emerald-300 font-medium truncate">
                        {tpl.name}
                      </span>
                      <span className="text-[10px] text-slate-400 truncate">
                        {tpl.location}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Form Fields - Only strictly necessary fields */}
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-slate-200 font-medium">
                    Camera Name <span className="text-cyan-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Virginia DOT Interstate Surveillance"
                    value={newCamName}
                    onChange={(e) => setNewCamName(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 text-xs"
                    autoFocus
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-slate-200 font-medium">
                    Location / City <span className="text-cyan-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Arlington, Virginia, USA"
                    value={newCamLocation}
                    onChange={(e) => setNewCamLocation(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 text-xs"
                  />
                </div>

                {/* Live Stream Source Type Selector */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-slate-200 font-medium">
                    Feed Source Protocol <span className="text-cyan-400">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setNewCamFeedType('hls');
                        if (!newCamStreamUrl || newCamStreamUrl.startsWith('device:')) {
                          setNewCamStreamUrl('https://media-sfs2.vdotcameras.com:443/rtplive/38iggm3xn7t5tr9grypj6mmtuxjp165p/playlist.m3u8');
                        }
                      }}
                      className={`px-2 py-1.5 rounded text-[11px] font-medium border text-center transition-all flex items-center justify-center gap-1 ${
                        newCamFeedType === 'hls'
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-sm shadow-emerald-950'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Radio className="w-3 h-3 text-emerald-400" />
                      <span>HLS Live (.m3u8)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNewCamFeedType('local');
                        setNewCamStreamUrl('device://camera/0');
                      }}
                      className={`px-2 py-1.5 rounded text-[11px] font-medium border text-center transition-all flex items-center justify-center gap-1 ${
                        newCamFeedType === 'local'
                          ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-sm shadow-cyan-950'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Laptop className="w-3 h-3 text-cyan-400" />
                      <span>Device WebCam</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNewCamFeedType('video');
                      }}
                      className={`px-2 py-1.5 rounded text-[11px] font-medium border text-center transition-all flex items-center justify-center gap-1 ${
                        newCamFeedType === 'video'
                          ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300 shadow-sm shadow-indigo-950'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Video className="w-3 h-3 text-indigo-400" />
                      <span>Direct IP Cam</span>
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-slate-200 font-medium">
                    Stream URL or Address <span className="text-cyan-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={
                      newCamFeedType === 'hls'
                        ? 'e.g. https://.../playlist.m3u8 (Verified live HLS)'
                        : newCamFeedType === 'local'
                        ? 'device://camera/0 (Physical Hardware Camera)'
                        : 'e.g. 198.176.84.12:554 or rtsp://...'
                    }
                    value={newCamStreamUrl}
                    onChange={(e) => setNewCamStreamUrl(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 font-mono text-cyan-300 placeholder-slate-500 focus:outline-none focus:border-cyan-500 text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-slate-200 font-medium">Scene / Environment</label>
                    <select
                      value={newCamScene}
                      onChange={(e) => setNewCamScene(e.target.value as any)}
                      className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-slate-200 text-xs"
                    >
                      <option value="traffic">City Traffic / Road</option>
                      <option value="bridge">Highway / Bridge</option>
                      <option value="riverfront">Riverfront / Ghat</option>
                      <option value="parking">Parking Lot</option>
                      <option value="entrance">Building Entrance</option>
                      <option value="server_room">Server Room / Tech</option>
                      <option value="warehouse">Warehouse</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-slate-200 font-medium">Brand</label>
                    <select
                      value={newCamBrand}
                      onChange={(e) => setNewCamBrand(e.target.value)}
                      className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-slate-200 text-xs"
                    >
                      <option value="CP Plus">CP Plus (India)</option>
                      <option value="Hikvision">Hikvision</option>
                      <option value="Dahua">Dahua</option>
                      <option value="Axis">Axis Communications</option>
                      <option value="Hanwha">Hanwha Vision</option>
                      <option value="Generic IP">Generic IP Cam</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="ptzNew"
                    checked={newCamPtz}
                    onChange={(e) => setNewCamPtz(e.target.checked)}
                    className="w-4 h-4 accent-cyan-500 cursor-pointer"
                  />
                  <label htmlFor="ptzNew" className="text-slate-300 font-medium cursor-pointer">
                    Enable Pan/Tilt/Zoom (PTZ) Controls in Live View
                  </label>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800 mt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-medium shadow-md shadow-cyan-900/30 flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add to Live Feed</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Camera Modal - Clean & Functional Only */}
      {selectedCameraForEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950">
              <div>
                <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-cyan-400" />
                  <span>Configure {selectedCameraForEdit.name}</span>
                </h3>
                <span className="text-[11px] font-mono text-slate-400">
                  {selectedCameraForEdit.ipAddress} · {selectedCameraForEdit.brand}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCameraForEdit(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex items-center border-b border-slate-800 bg-slate-950 px-4 text-xs font-medium">
              <button
                type="button"
                onClick={() => setActiveEditTab('stream')}
                className={`py-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors ${
                  activeEditTab === 'stream'
                    ? 'border-cyan-500 text-cyan-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Video className="w-3.5 h-3.5" />
                <span>Stream & Quality</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveEditTab('sensor')}
                className={`py-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors ${
                  activeEditTab === 'sensor'
                    ? 'border-cyan-500 text-cyan-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                <span>Night Vision & Sensor</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveEditTab('motion')}
                className={`py-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors ${
                  activeEditTab === 'motion'
                    ? 'border-cyan-500 text-cyan-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Motion Detection Grid</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 overflow-y-auto flex-1 text-xs">
              {activeEditTab === 'stream' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-slate-300 font-medium">Camera Name</label>
                    <input
                      type="text"
                      value={selectedCameraForEdit.name}
                      onChange={(e) => setSelectedCameraForEdit({ ...selectedCameraForEdit, name: e.target.value })}
                      className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-slate-300 font-medium">Location</label>
                    <input
                      type="text"
                      value={selectedCameraForEdit.location}
                      onChange={(e) => setSelectedCameraForEdit({ ...selectedCameraForEdit, location: e.target.value })}
                      className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-slate-300 font-medium">IP Address / Host</label>
                    <input
                      type="text"
                      value={selectedCameraForEdit.ipAddress}
                      onChange={(e) => setSelectedCameraForEdit({ ...selectedCameraForEdit, ipAddress: e.target.value })}
                      className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 font-mono text-cyan-300"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-slate-300 font-medium">Stream Resolution</label>
                    <select
                      value={selectedCameraForEdit.resolution}
                      onChange={(e) => setSelectedCameraForEdit({ ...selectedCameraForEdit, resolution: e.target.value as VideoResolution })}
                      className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200"
                    >
                      <option value="4K (3840x2160)">4K (3840x2160)</option>
                      <option value="2K (2560x1440)">2K (2560x1440)</option>
                      <option value="1080p (1920x1080)">1080p (1920x1080)</option>
                      <option value="720p (1280x720)">720p (1280x720)</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-slate-300 font-medium">Target Bitrate (kbps)</label>
                    <input
                      type="number"
                      step={256}
                      min={1024}
                      max={16384}
                      value={selectedCameraForEdit.bitrateKbps}
                      onChange={(e) => setSelectedCameraForEdit({ ...selectedCameraForEdit, bitrateKbps: Number(e.target.value) })}
                      className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 font-mono text-cyan-300"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-slate-300 font-medium">Video Compression</label>
                    <select
                      value={selectedCameraForEdit.codec}
                      onChange={(e) => setSelectedCameraForEdit({ ...selectedCameraForEdit, codec: e.target.value as VideoCodec })}
                      className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200"
                    >
                      <option value="H.265">H.265 (High Efficiency)</option>
                      <option value="H.264">H.264 (Standard)</option>
                      <option value="MJPEG">MJPEG</option>
                    </select>
                  </div>
                </div>
              )}

              {activeEditTab === 'sensor' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-slate-300 font-medium">Sensor IR Mode</label>
                    <select
                      value={selectedCameraForEdit.imageSettings.irCut}
                      onChange={(e) => setSelectedCameraForEdit({
                        ...selectedCameraForEdit,
                        imageSettings: { ...selectedCameraForEdit.imageSettings, irCut: e.target.value as DayNightMode }
                      })}
                      className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200"
                    >
                      <option value="auto">Auto (Lux Sensor Switched)</option>
                      <option value="day">Daylight Mode (Full Color)</option>
                      <option value="night">Night Mode (IR Phosphor Grain)</option>
                      <option value="thermal">Thermal Heat Sensor Mode</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between">
                      <label className="text-slate-300 font-medium">Brightness</label>
                      <span className="font-mono text-cyan-400">{selectedCameraForEdit.imageSettings.brightness}</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={selectedCameraForEdit.imageSettings.brightness}
                      onChange={(e) => setSelectedCameraForEdit({
                        ...selectedCameraForEdit,
                        imageSettings: { ...selectedCameraForEdit.imageSettings, brightness: Number(e.target.value) }
                      })}
                      className="w-full h-1.5 bg-slate-800 rounded accent-cyan-500"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between">
                      <label className="text-slate-300 font-medium">Contrast</label>
                      <span className="font-mono text-cyan-400">{selectedCameraForEdit.imageSettings.contrast}</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={selectedCameraForEdit.imageSettings.contrast}
                      onChange={(e) => setSelectedCameraForEdit({
                        ...selectedCameraForEdit,
                        imageSettings: { ...selectedCameraForEdit.imageSettings, contrast: Number(e.target.value) }
                      })}
                      className="w-full h-1.5 bg-slate-800 rounded accent-cyan-500"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-950 rounded border border-slate-800">
                    <div>
                      <span className="font-medium text-slate-200 block">Wide Dynamic Range (WDR)</span>
                      <span className="text-[11px] text-slate-400">Compensates backlight glare</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={selectedCameraForEdit.imageSettings.wdr}
                      onChange={(e) => setSelectedCameraForEdit({
                        ...selectedCameraForEdit,
                        imageSettings: { ...selectedCameraForEdit.imageSettings, wdr: e.target.checked }
                      })}
                      className="w-4 h-4 accent-cyan-500"
                    />
                  </div>
                </div>
              )}

              {activeEditTab === 'motion' && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-slate-200">Motion Detection Sensitivity Zone</h4>
                      <p className="text-[11px] text-slate-400">
                        Click cells to toggle armed surveillance detection zones.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedCameraForEdit({
                          ...selectedCameraForEdit,
                          motionConfig: {
                            ...selectedCameraForEdit.motionConfig,
                            gridMask: Array.from({ length: 12 }, () => Array(16).fill(true))
                          }
                        })}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px]"
                      >
                        Arm All
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedCameraForEdit({
                          ...selectedCameraForEdit,
                          motionConfig: {
                            ...selectedCameraForEdit.motionConfig,
                            gridMask: Array.from({ length: 12 }, () => Array(16).fill(false))
                          }
                        })}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px]"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 flex flex-col gap-1">
                    {selectedCameraForEdit.motionConfig.gridMask.map((row, rIdx) => (
                      <div key={rIdx} className="flex gap-1">
                        {row.map((active, cIdx) => (
                          <div
                            key={cIdx}
                            onClick={() => handleToggleMaskCell(rIdx, cIdx)}
                            className={`flex-1 h-5 rounded-[2px] cursor-pointer transition-colors border ${
                              active
                                ? 'bg-cyan-500/40 border-cyan-400/60 hover:bg-cyan-500/60'
                                : 'bg-slate-900/60 border-slate-800 hover:bg-slate-800'
                            }`}
                          />
                        ))}
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col gap-1 pt-1">
                    <div className="flex justify-between">
                      <label className="text-slate-300 font-medium">Detection Sensitivity</label>
                      <span className="font-mono text-cyan-400">{selectedCameraForEdit.motionConfig.sensitivity}%</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={100}
                      value={selectedCameraForEdit.motionConfig.sensitivity}
                      onChange={(e) => setSelectedCameraForEdit({
                        ...selectedCameraForEdit,
                        motionConfig: { ...selectedCameraForEdit.motionConfig, sensitivity: Number(e.target.value) }
                      })}
                      className="w-full h-1.5 bg-slate-800 rounded accent-cyan-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2 p-3 border-t border-slate-800 bg-slate-950">
              <button
                type="button"
                onClick={() => setSelectedCameraForEdit(null)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onUpdateCamera(selectedCameraForEdit.id, selectedCameraForEdit);
                  setSelectedCameraForEdit(null);
                }}
                className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-medium flex items-center gap-1.5 transition-colors shadow-md shadow-cyan-900/30"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Stream Changes</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
