import React, { useState, useEffect } from 'react';
import { CameraDevice, PtzPreset } from '../../types/camera';
import { CameraStreamCanvas } from '../video/CameraStreamCanvas';
import { PtzController } from './PtzController';
import { 
  Grid, LayoutGrid, Square, Columns, 
  Camera, Circle, VolumeX, ShieldAlert, Radio,
  Maximize2, Sliders, RefreshCw, Layers, Trash2, X, Plus, ChevronLeft, ChevronRight,
  Copy, Check, ExternalLink, Link2, Crosshair, Lock, Globe, Laptop, Video, Wifi, HardDrive
} from 'lucide-react';

interface LiveMonitorGridProps {
  cameras: CameraDevice[];
  selectedCameraId: string;
  onSelectCamera: (cameraId: string) => void;
  onUpdatePtz: (cameraId: string, pan: number, tilt: number, zoom: number) => void;
  onSavePreset: (cameraId: string, name: string) => void;
  onCallPreset: (cameraId: string, preset: PtzPreset) => void;
  onTogglePatrol: (cameraId: string) => void;
  onToggleRecording: (cameraId: string) => void;
  onToggleAllRecording: () => void;
  onSnapshotTaken: (cameraId: string, dataUrl: string) => void;
  onDeleteCamera?: (cameraId: string) => void;
  onNavigateToDevices?: () => void;
}

type GridLayout = '1x1' | '2x2' | '3x3' | '1+5';

export const LiveMonitorGrid: React.FC<LiveMonitorGridProps> = ({
  cameras,
  selectedCameraId,
  onSelectCamera,
  onUpdatePtz,
  onSavePreset,
  onCallPreset,
  onTogglePatrol,
  onToggleRecording,
  onToggleAllRecording,
  onSnapshotTaken,
  onDeleteCamera,
  onNavigateToDevices
}) => {
  const [layout, setLayout] = useState<GridLayout>('2x2');
  const [showPtzSidebar, setShowPtzSidebar] = useState(true);
  const [streamQuality, setStreamQuality] = useState<'main' | 'sub'>('main');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Selected camera fallback
  const selectedCamera = cameras.find(c => c.id === selectedCameraId) || cameras[0];
  const allRecording = cameras.length > 0 && cameras.every(c => c.isRecording);

  // Copy live stream URL to clipboard
  const handleCopyStreamUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2200);
  };

  // Compute total live bandwidth
  const totalBandwidthMbps = (cameras.reduce((acc, c) => acc + c.bitrateKbps, 0) / 1000).toFixed(1);

  // Page calculations for 2x2 and 3x3 layouts
  const pageSize = layout === '2x2' ? 4 : layout === '3x3' ? 9 : 1;
  const totalPages = Math.max(1, Math.ceil(cameras.length / pageSize));

  // Whenever selectedCamera changes, ensure current page contains this camera
  useEffect(() => {
    if (pageSize > 1 && cameras.length > 0) {
      const idx = cameras.findIndex(c => c.id === selectedCameraId);
      if (idx !== -1) {
        const targetPage = Math.floor(idx / pageSize);
        setCurrentPage(targetPage);
      }
    }
  }, [selectedCameraId, pageSize, cameras]);

  // Adjust safe current page
  const safePage = Math.min(currentPage, totalPages - 1);
  const startIdx = safePage * pageSize;
  const visibleCameras = cameras.slice(startIdx, startIdx + pageSize);

  return (
    <div className="flex flex-col flex-1 h-full min-h-0 bg-slate-950">
      {/* Top Monitor Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-slate-900/90 border-b border-slate-800">
        {/* Left: View Mode Controls */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-slate-400 mr-1 hidden sm:inline">Grid Layout:</span>
          
          <button
            type="button"
            onClick={() => setLayout('1x1')}
            title="Single Focus (1x1)"
            className={`p-1.5 rounded transition-colors text-xs flex items-center gap-1 ${
              layout === '1x1' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Square className="w-3.5 h-3.5" />
            <span className="font-mono font-medium">1x1</span>
          </button>

          <button
            type="button"
            onClick={() => setLayout('2x2')}
            title="Quad View (2x2)"
            className={`p-1.5 rounded transition-colors text-xs flex items-center gap-1 ${
              layout === '2x2' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span className="font-mono font-medium">2x2</span>
          </button>

          <button
            type="button"
            onClick={() => setLayout('3x3')}
            title="Matrix View (3x3)"
            className={`p-1.5 rounded transition-colors text-xs flex items-center gap-1 ${
              layout === '3x3' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span className="font-mono font-medium">3x3</span>
          </button>

          <button
            type="button"
            onClick={() => setLayout('1+5')}
            title="Hero Focus + 5 Auxiliary (1+5)"
            className={`p-1.5 rounded transition-colors text-xs flex items-center gap-1 ${
              layout === '1+5' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            <span className="font-mono font-medium">1+5</span>
          </button>

          <div className="h-4 w-px bg-slate-800 mx-1 hidden sm:block" />

          {/* Quality switch */}
          <div className="hidden md:flex items-center gap-1 bg-slate-950 p-0.5 rounded border border-slate-800 text-[11px] font-mono">
            <button
              type="button"
              onClick={() => setStreamQuality('main')}
              className={`px-2 py-0.5 rounded transition-colors ${
                streamQuality === 'main' ? 'bg-slate-800 text-cyan-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Main Stream (4K/2K)
            </button>
            <button
              type="button"
              onClick={() => setStreamQuality('sub')}
              className={`px-2 py-0.5 rounded transition-colors ${
                streamQuality === 'sub' ? 'bg-slate-800 text-cyan-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sub Stream (720p)
            </button>
          </div>
        </div>

        {/* Right: Telemetry & Global Actions */}
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-2 text-xs font-mono text-slate-400">
            <span>Bandwidth:</span>
            <span className="text-cyan-400 font-bold tabular-nums">{totalBandwidthMbps} Mbps</span>
            <span>·</span>
            <span>Cameras:</span>
            <span className="text-emerald-400 font-bold tabular-nums">{cameras.length} Active</span>
          </div>

          {/* Toggle All Recording */}
          <button
            type="button"
            onClick={onToggleAllRecording}
            disabled={cameras.length === 0}
            className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 transition-colors border disabled:opacity-40 ${
              allRecording
                ? 'bg-red-500/10 text-red-300 border-red-500/30 hover:bg-red-500/20'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
            }`}
          >
            <Circle className={`w-3 h-3 ${allRecording ? 'fill-red-500 text-red-500' : ''}`} />
            <span>{allRecording ? 'Recording All' : 'Start All Rec'}</span>
          </button>

          {/* Toggle PTZ Sidebar */}
          <button
            type="button"
            onClick={() => setShowPtzSidebar(!showPtzSidebar)}
            className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 transition-colors border ${
              showPtzSidebar ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">PTZ Console</span>
          </button>
        </div>
      </div>

      {/* Horizontal Camera Channel Strip with 1-Click Access & Paging */}
      {cameras.length > 0 && (
        <div className="flex items-center justify-between gap-2 px-4 py-2 bg-slate-950 border-b border-slate-800/80 shrink-0">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-thin py-0.5 flex-1 min-w-0">
            <span className="text-[11px] font-mono text-slate-400 whitespace-nowrap flex items-center gap-1 shrink-0">
              <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
              <span>Channels:</span>
            </span>

            {cameras.map((cam, idx) => {
              const isSelected = cam.id === selectedCameraId;
              return (
                <button
                  key={cam.id}
                  type="button"
                  onClick={() => onSelectCamera(cam.id)}
                  className={`px-2.5 py-1 rounded text-xs whitespace-nowrap flex items-center gap-1.5 transition-all shrink-0 ${
                    isSelected
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/70 shadow-sm shadow-cyan-950 font-medium'
                      : 'bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${cam.status === 'online' ? 'bg-emerald-400' : 'bg-red-500'}`} />
                  <span className="font-mono text-[10px] text-slate-400">CH {idx + 1}</span>
                  <span className="truncate max-w-[130px]">{cam.name}</span>
                  {cam.country === 'India' && <span className="text-[10px]">🇮🇳</span>}
                </button>
              );
            })}
          </div>

          {/* Quad/Matrix Paging Controls if more cameras than grid slots */}
          {pageSize > 1 && totalPages > 1 && (
            <div className="flex items-center gap-1.5 shrink-0 pl-2 border-l border-slate-800 text-xs font-mono">
              <span className="text-slate-400 hidden sm:inline">
                Page {safePage + 1}/{totalPages}
              </span>
              <button
                type="button"
                disabled={safePage === 0}
                onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                className="p-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none rounded text-slate-300"
                title="Previous Page"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                disabled={safePage >= totalPages - 1}
                onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
                className="p-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none rounded text-slate-300"
                title="Next Page"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Main Grid Viewport and Optional PTZ Sidebar */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Streams Canvas Matrix */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3">
          {cameras.length === 0 ? (
            <div className="w-full h-full min-h-[400px] flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-800 rounded-xl">
              <Camera className="w-12 h-12 text-slate-600 mb-3" />
              <h3 className="text-base font-semibold text-slate-200">No Active Surveillance Feeds</h3>
              <p className="text-xs text-slate-400 max-w-sm mt-1 mb-4">
                All cameras have been removed from the monitoring pool. Add a camera or network RTSP stream to begin live surveillance.
              </p>
              {onNavigateToDevices && (
                <button
                  type="button"
                  onClick={onNavigateToDevices}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add New Camera Feed</span>
                </button>
              )}
            </div>
          ) : layout === '1x1' ? (
            <div className="w-full h-full max-h-[82vh] flex items-center justify-center">
              <div className="w-full max-w-5xl">
                {selectedCamera && (
                  <CameraStreamCanvas
                    camera={selectedCamera}
                    isFocused={true}
                    onSelect={() => onSelectCamera(selectedCamera.id)}
                    onToggleRecording={onToggleRecording}
                    onSnapshotTaken={onSnapshotTaken}
                    streamQuality={streamQuality}
                    aspectRatioClass="aspect-video"
                  />
                )}
              </div>
            </div>
          ) : layout === '2x2' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 h-full max-h-[85vh]">
              {visibleCameras.map((cam) => (
                <div key={cam.id} className="min-h-0">
                  <CameraStreamCanvas
                    camera={cam}
                    isFocused={cam.id === selectedCameraId}
                    onSelect={() => onSelectCamera(cam.id)}
                    onToggleRecording={onToggleRecording}
                    onSnapshotTaken={onSnapshotTaken}
                    streamQuality={streamQuality}
                    aspectRatioClass="aspect-video"
                  />
                </div>
              ))}
            </div>
          ) : layout === '3x3' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 h-full max-h-[85vh]">
              {visibleCameras.map((cam) => (
                <div key={cam.id} className="min-h-0">
                  <CameraStreamCanvas
                    camera={cam}
                    isFocused={cam.id === selectedCameraId}
                    onSelect={() => onSelectCamera(cam.id)}
                    onToggleRecording={onToggleRecording}
                    onSnapshotTaken={onSnapshotTaken}
                    streamQuality={streamQuality}
                    aspectRatioClass="aspect-video"
                  />
                </div>
              ))}
            </div>
          ) : (
            /* 1+5 Layout */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 h-full max-h-[85vh]">
              {/* Primary Hero Stream */}
              <div className="lg:col-span-2 min-h-0">
                {selectedCamera && (
                  <CameraStreamCanvas
                    camera={selectedCamera}
                    isFocused={true}
                    onSelect={() => onSelectCamera(selectedCamera.id)}
                    onToggleRecording={onToggleRecording}
                    onSnapshotTaken={onSnapshotTaken}
                    streamQuality={streamQuality}
                    aspectRatioClass="aspect-video"
                  />
                )}
              </div>

              {/* Auxiliary Thumbnails */}
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-1 gap-2 overflow-y-auto max-h-[80vh] pr-1">
                {cameras
                  .filter((c) => c.id !== selectedCameraId)
                  .slice(0, 5)
                  .map((cam) => (
                    <div key={cam.id} className="min-h-0">
                      <CameraStreamCanvas
                        camera={cam}
                        isFocused={false}
                        onSelect={() => onSelectCamera(cam.id)}
                        onToggleRecording={onToggleRecording}
                        onSnapshotTaken={onSnapshotTaken}
                        streamQuality="sub"
                        aspectRatioClass="aspect-video"
                      />
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* PTZ and Camera Inspector Sidebar */}
        {showPtzSidebar && selectedCamera && (
          <aside className="w-80 border-l border-slate-800 bg-slate-950 p-3 overflow-y-auto hidden md:flex flex-col gap-3">
            {/* Quick Camera Switcher */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-mono text-slate-400 tracking-wider">
                  Select Active Camera
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  {cameras.length} Nodes
                </span>
              </div>
              <div className="flex flex-col gap-1 max-h-40 overflow-y-auto pr-1">
                {cameras.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => onSelectCamera(c.id)}
                    className={`px-2.5 py-1.5 rounded text-left text-xs transition-colors flex items-center justify-between ${
                      c.id === selectedCameraId
                        ? 'bg-cyan-950/60 border border-cyan-800/80 text-cyan-200 font-semibold shadow-xs'
                        : 'bg-slate-900/50 hover:bg-slate-900 border border-slate-800/60 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <div
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          c.status === 'online' ? 'bg-emerald-400 shadow-xs shadow-emerald-500/50' : 'bg-amber-400'
                        }`}
                      />
                      <span className="truncate">{c.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      {c.ptzCapable ? (
                        <span className="text-[9px] font-mono px-1 py-0.2 bg-cyan-950 text-cyan-400 border border-cyan-800 rounded font-semibold">
                          PTZ
                        </span>
                      ) : (
                        <span className="text-[9px] font-mono px-1 py-0.2 bg-slate-850 text-slate-500 border border-slate-750 rounded">
                          FIXED
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Selected Camera Specs & Live URL Card */}
            {(() => {
              const liveUrl = selectedCamera.hlsUrl || 
                (selectedCamera.streamUrl?.startsWith('http') ? selectedCamera.streamUrl : null) ||
                (selectedCamera.feedType === 'local' ? 'Hardware Camera (device://local-optical-lens)' : `rtsp://${selectedCamera.ipAddress}:${selectedCamera.rtspPort}/live`);
              
              const isWebAccessible = liveUrl.startsWith('http://') || liveUrl.startsWith('https://');

              return (
                <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3 flex flex-col gap-2.5 shadow-sm">
                  {/* Title & Brand */}
                  <div className="flex items-start justify-between gap-2 border-b border-slate-800/80 pb-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 animate-pulse" />
                        <span className="text-xs font-semibold text-slate-100 truncate block">
                          {selectedCamera.name}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono block mt-0.5 truncate">
                        ID: {selectedCamera.id} · {selectedCamera.brand}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-800 text-slate-300 border border-slate-700 rounded shrink-0">
                      {selectedCamera.country}
                    </span>
                  </div>

                  {/* LIVE STREAM URL DISPLAY & 1-CLICK COPY */}
                  <div className="bg-slate-950 border border-slate-800/90 rounded-md p-2 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-slate-400">
                        <Link2 className="w-3 h-3 text-cyan-400" />
                        <span>LIVE STREAM URL</span>
                      </div>
                      <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-semibold ${
                        selectedCamera.feedType === 'local'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : selectedCamera.feedType === 'hls'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      }`}>
                        {selectedCamera.feedType === 'local' ? 'Local Hardware Cam' : selectedCamera.feedType === 'hls' ? 'Live HLS (.m3u8)' : 'Direct IP Stream'}
                      </span>
                    </div>

                    <div className="bg-slate-900/90 border border-slate-800 rounded p-1.5 font-mono text-[10px] text-slate-300 break-all select-all max-h-16 overflow-y-auto leading-relaxed">
                      {liveUrl}
                    </div>

                    <div className="flex items-center gap-1.5 pt-0.5">
                      <button
                        type="button"
                        onClick={() => handleCopyStreamUrl(liveUrl)}
                        className={`flex-1 py-1 px-2 rounded text-[11px] font-medium flex items-center justify-center gap-1.5 transition-all ${
                          copiedUrl
                            ? 'bg-emerald-900/80 border border-emerald-600 text-emerald-200'
                            : 'bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 hover:text-white'
                        }`}
                      >
                        {copiedUrl ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span>URL Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Copy Live URL</span>
                          </>
                        )}
                      </button>

                      {isWebAccessible && (
                        <a
                          href={liveUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Open direct live feed in new browser tab"
                          className="py-1 px-2 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded text-slate-300 hover:text-white text-[11px] flex items-center justify-center gap-1 transition-colors"
                        >
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                          <span>Test</span>
                        </a>
                      )}
                    </div>
                  </div>

                  {/* PTZ Controller Support Status Banner */}
                  {selectedCamera.ptzCapable ? (
                    <div className="p-2 rounded bg-cyan-950/40 border border-cyan-800/60 text-cyan-300 flex items-start gap-2">
                      <Crosshair className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-cyan-200">Motorized PTZ Supported</span>
                          <span className="text-[9px] font-mono px-1 py-0.2 bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded font-semibold">
                            ACTIVE
                          </span>
                        </div>
                        <p className="text-[10px] text-cyan-400/80 mt-0.5 leading-snug">
                          Hardware Pan-Tilt-Zoom motor engaged. 8-way joystick and optical zoom available below.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2 rounded bg-slate-900/90 border border-slate-800 text-slate-400 flex items-start gap-2">
                      <Lock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-slate-300">Fixed Focal Lens</span>
                          <span className="text-[9px] font-mono px-1 py-0.2 bg-slate-800 text-slate-400 border border-slate-700 rounded font-semibold">
                            NON-PTZ
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                          This camera has a stationary fixed lens without motorized pan/tilt servos. PTZ controls are omitted for this device.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Comprehensive Camera & Stream Specifications */}
                  <div className="text-[11px] text-slate-400 flex flex-col gap-1 font-mono pt-1">
                    <div className="flex justify-between items-center py-0.5 border-b border-slate-800/50">
                      <span className="text-slate-500">Location:</span>
                      <span className="text-slate-300 truncate max-w-[150px] text-right font-sans font-medium" title={selectedCamera.location}>
                        {selectedCamera.location}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-b border-slate-800/50">
                      <span className="text-slate-500">Resolution & FPS:</span>
                      <span className="text-slate-300">{selectedCamera.resolution} @ {selectedCamera.fps} FPS</span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-b border-slate-800/50">
                      <span className="text-slate-500">Codec & Bitrate:</span>
                      <span className="text-slate-300">{selectedCamera.codec} · {selectedCamera.bitrateKbps} kbps</span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-b border-slate-800/50">
                      <span className="text-slate-500">IP & RTSP Port:</span>
                      <span className="text-cyan-400">{selectedCamera.ipAddress}:{selectedCamera.rtspPort}</span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-b border-slate-800/50">
                      <span className="text-slate-500">Subnet Gateway:</span>
                      <span className="text-slate-300">{selectedCamera.gateway || '198.176.84.1'}</span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-b border-slate-800/50">
                      <span className="text-slate-500">Hardware MAC:</span>
                      <span className="text-slate-300">{selectedCamera.macAddress || 'AC:CC:8E:12:44:A1'}</span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-b border-slate-800/50">
                      <span className="text-slate-500">PoE Power:</span>
                      <span className="text-emerald-400 font-semibold">{selectedCamera.poeWattage}W (Port {selectedCamera.poePort})</span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-b border-slate-800/50">
                      <span className="text-slate-500">Disk Retention:</span>
                      <span className="text-slate-300">{selectedCamera.storageUsedGb} GB ({selectedCamera.recordingMode || 'Continuous'})</span>
                    </div>
                    <div className="flex justify-between items-center py-0.5">
                      <span className="text-slate-500">Firmware:</span>
                      <span className="text-slate-300">{selectedCamera.firmware || 'VDOT_SENTINEL_v6.4'}</span>
                    </div>
                  </div>

                  {onDeleteCamera && (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(selectedCamera.id)}
                      className="mt-1 w-full py-1.5 px-2.5 bg-red-950/30 hover:bg-red-900/50 border border-red-900/50 hover:border-red-600 rounded text-red-300 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete This Camera</span>
                    </button>
                  )}
                </div>
              );
            })()}

            {/* PTZ Controller - ONLY rendered for cameras that actually support PTZ hardware */}
            {selectedCamera.ptzCapable && (
              <PtzController
                camera={selectedCamera}
                onUpdatePtz={onUpdatePtz}
                onSavePreset={onSavePreset}
                onCallPreset={onCallPreset}
                onTogglePatrol={onTogglePatrol}
              />
            )}
          </aside>
        )}
      </div>

      {/* In-app Delete Confirmation Modal */}
      {confirmDeleteId && onDeleteCamera && (
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
                  Remove <span className="font-semibold text-white">"{cameras.find(c => c.id === confirmDeleteId)?.name}"</span> from the active surveillance pool?
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteCamera(confirmDeleteId);
                  setConfirmDeleteId(null);
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
    </div>
  );
};
