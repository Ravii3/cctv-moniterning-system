import React, { useState } from 'react';
import { CameraDevice, PtzPreset } from '../../types/camera';
import { 
  ArrowUp, ArrowDown, ArrowLeft, ArrowRight, 
  ArrowUpLeft, ArrowUpRight, ArrowDownLeft, ArrowDownRight,
  ZoomIn, ZoomOut, Play, Square, BookmarkPlus, Crosshair,
  Sliders, Eye, SunMedium, RotateCcw
} from 'lucide-react';

interface PtzControllerProps {
  camera: CameraDevice;
  onUpdatePtz: (cameraId: string, newPan: number, newTilt: number, newZoom: number) => void;
  onSavePreset: (cameraId: string, presetName: string) => void;
  onCallPreset: (cameraId: string, preset: PtzPreset) => void;
  onTogglePatrol: (cameraId: string) => void;
}

export const PtzController: React.FC<PtzControllerProps> = ({
  camera,
  onUpdatePtz,
  onSavePreset,
  onCallPreset,
  onTogglePatrol
}) => {
  const [speed, setSpeed] = useState<number>(4);
  const [presetInput, setPresetInput] = useState<string>('');
  const [showAddPreset, setShowAddPreset] = useState(false);
  const [commandFeedback, setCommandFeedback] = useState<string | null>(null);

  // Degrees per step: scales with motor speed (Level 1 = 3°, Level 4 = 14°, Level 8 = 28°)
  const stepDeg = Math.round(speed * 3.5);

  const flashCommand = (msg: string) => {
    setCommandFeedback(msg);
    setTimeout(() => {
      setCommandFeedback(prev => prev === msg ? null : prev);
    }, 1200);
  };

  const handlePanTilt = (dx: number, dy: number, label: string) => {
    const curPan = camera.ptzState.pan;
    const curTilt = camera.ptzState.tilt;
    const newPan = Math.max(-180, Math.min(180, curPan + dx * stepDeg));
    const newTilt = Math.max(-90, Math.min(90, curTilt + dy * stepDeg));
    onUpdatePtz(camera.id, Math.round(newPan), Math.round(newTilt), camera.ptzState.zoom);
    flashCommand(`${label} (${Math.round(newPan)}°, ${Math.round(newTilt)}°)`);
  };

  const handleZoom = (factor: number) => {
    const curZoom = camera.ptzState.zoom;
    const step = Number((speed * 0.25).toFixed(1));
    const newZoom = Math.max(1.0, Math.min(30.0, Number((curZoom + factor * step).toFixed(1))));
    onUpdatePtz(camera.id, camera.ptzState.pan, camera.ptzState.tilt, newZoom);
    flashCommand(`Optical Zoom: ${newZoom.toFixed(1)}x`);
  };

  const handleResetHome = () => {
    onUpdatePtz(camera.id, 0, 0, 1.0);
    flashCommand('Home Position Restored (0°, 0°, 1.0x)');
  };

  const handleCreatePreset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!presetInput.trim()) return;
    onSavePreset(camera.id, presetInput.trim());
    flashCommand(`Preset "${presetInput.trim()}" Saved`);
    setPresetInput('');
    setShowAddPreset(false);
  };

  // Only show this control on cameras that actually support PTZ hardware
  if (!camera.ptzCapable) {
    return null;
  }

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-4 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Crosshair className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-semibold tracking-wide text-slate-200">ONVIF PTZ Telemetry</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono mt-0.5 tabular-nums">
            <span>Pan: {camera.ptzState.pan}°</span>
            <span>·</span>
            <span>Tilt: {camera.ptzState.tilt}°</span>
            <span>·</span>
            <span>Zoom: {camera.ptzState.zoom.toFixed(1)}x</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {commandFeedback && (
            <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/80 border border-cyan-800/80 px-2 py-0.5 rounded animate-pulse">
              {commandFeedback}
            </span>
          )}
          <button
            type="button"
            onClick={handleResetHome}
            title="Return to Home Center (0, 0, 1.0x)"
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors text-xs flex items-center gap-1 active:scale-95"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="text-[10px]">Home</span>
          </button>
        </div>
      </div>

      {/* Virtual Joystick Directional Pad */}
      <div className="flex items-center justify-center py-1">
        <div className="relative w-44 h-44 bg-slate-950/90 border border-slate-800 rounded-full p-2 flex items-center justify-center shadow-inner shadow-black/90">
          {/* Diagonal buttons */}
          <button
            type="button"
            onClick={() => handlePanTilt(-1, 1, 'Pan Up-Left')}
            title="Pan Left / Tilt Up"
            className="absolute top-4 left-4 p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-slate-800/80 rounded transition-colors active:scale-90"
          >
            <ArrowUpLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handlePanTilt(0, 1, 'Tilt Up')}
            title="Tilt Up"
            className="absolute top-2 left-1/2 -translate-x-1/2 p-2 text-slate-300 hover:text-cyan-400 hover:bg-slate-800/80 rounded-md transition-colors active:scale-90"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handlePanTilt(1, 1, 'Pan Up-Right')}
            title="Pan Right / Tilt Up"
            className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-slate-800/80 rounded transition-colors active:scale-90"
          >
            <ArrowUpRight className="w-4 h-4" />
          </button>

          {/* Left / Center / Right */}
          <button
            type="button"
            onClick={() => handlePanTilt(-1, 0, 'Pan Left')}
            title="Pan Left"
            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 text-slate-300 hover:text-cyan-400 hover:bg-slate-800/80 rounded-md transition-colors active:scale-90"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          {/* Center Hub */}
          <button
            type="button"
            onClick={() => handleZoom(0)}
            title="Current Optical Zoom (Click to re-center or reset)"
            className="w-14 h-14 rounded-full bg-slate-900 border border-slate-700/80 flex items-center justify-center text-cyan-400 shadow-md hover:bg-slate-850 hover:border-cyan-500/50 transition-colors active:scale-95 cursor-pointer"
          >
            <span className="text-[11px] font-mono font-bold">{camera.ptzState.zoom.toFixed(1)}x</span>
          </button>

          <button
            type="button"
            onClick={() => handlePanTilt(1, 0, 'Pan Right')}
            title="Pan Right"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-300 hover:text-cyan-400 hover:bg-slate-800/80 rounded-md transition-colors active:scale-90"
          >
            <ArrowRight className="w-4 h-4" />
          </button>

          {/* Diagonals Down & Down */}
          <button
            type="button"
            onClick={() => handlePanTilt(-1, -1, 'Pan Down-Left')}
            title="Pan Left / Tilt Down"
            className="absolute bottom-4 left-4 p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-slate-800/80 rounded transition-colors active:scale-90"
          >
            <ArrowDownLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handlePanTilt(0, -1, 'Tilt Down')}
            title="Tilt Down"
            className="absolute bottom-2 left-1/2 -translate-x-1/2 p-2 text-slate-300 hover:text-cyan-400 hover:bg-slate-800/80 rounded-md transition-colors active:scale-90"
          >
            <ArrowDown className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handlePanTilt(1, -1, 'Pan Down-Right')}
            title="Pan Right / Tilt Down"
            className="absolute bottom-4 right-4 p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-slate-800/80 rounded transition-colors active:scale-90"
          >
            <ArrowDownRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Optical Zoom Controls & PTZ Speed Slider */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <div className="bg-slate-950/70 border border-slate-800/80 rounded p-2.5 flex flex-col gap-1.5">
          <span className="text-[10px] uppercase font-mono text-slate-400 tracking-wider">Optical Zoom</span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleZoom(-1)}
              className="flex-1 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700/60 rounded text-slate-200 hover:text-cyan-400 flex items-center justify-center gap-1 transition-colors"
            >
              <ZoomOut className="w-3.5 h-3.5" />
              <span className="text-xs font-mono font-medium">Out</span>
            </button>
            <button
              type="button"
              onClick={() => handleZoom(1)}
              className="flex-1 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700/60 rounded text-slate-200 hover:text-cyan-400 flex items-center justify-center gap-1 transition-colors"
            >
              <ZoomIn className="w-3.5 h-3.5" />
              <span className="text-xs font-mono font-medium">In</span>
            </button>
          </div>
        </div>

        <div className="bg-slate-950/70 border border-slate-800/80 rounded p-2.5 flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
            <span className="uppercase tracking-wider">Motor Speed</span>
            <span className="text-cyan-400 font-bold tabular-nums">Level {speed}</span>
          </div>
          <input
            type="range"
            min="1"
            max="8"
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
          />
        </div>
      </div>

      {/* Auto Patrol / Guard Tour Toggle */}
      <div className="flex items-center justify-between bg-slate-950/70 border border-slate-800/80 rounded p-2.5">
        <div>
          <span className="text-xs font-medium text-slate-200 block">Guard Tour / Auto-Patrol</span>
          <span className="text-[10px] text-slate-400 font-mono">Continuous cycle across presets</span>
        </div>
        <button
          type="button"
          onClick={() => onTogglePatrol(camera.id)}
          className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 transition-colors ${
            camera.ptzState.isPatrolling
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
          }`}
        >
          {camera.ptzState.isPatrolling ? (
            <>
              <Square className="w-3 h-3 fill-amber-400" />
              <span>Halt Tour</span>
            </>
          ) : (
            <>
              <Play className="w-3 h-3 fill-slate-300" />
              <span>Start Tour</span>
            </>
          )}
        </button>
      </div>

      {/* Presets List & Quick Recall */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase font-mono text-slate-400 tracking-wider">
            Presets ({camera.presets.length})
          </span>
          <button
            type="button"
            onClick={() => setShowAddPreset(!showAddPreset)}
            className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono transition-colors"
          >
            <BookmarkPlus className="w-3 h-3" />
            <span>+ Save Current</span>
          </button>
        </div>

        {showAddPreset && (
          <form onSubmit={handleCreatePreset} className="flex items-center gap-2 bg-slate-950 p-2 rounded border border-slate-800">
            <input
              type="text"
              placeholder="e.g. Loading Dock Gate 3"
              value={presetInput}
              onChange={(e) => setPresetInput(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-sans"
              autoFocus
            />
            <button
              type="submit"
              className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-medium transition-colors"
            >
              Save
            </button>
          </form>
        )}

        {camera.presets.length === 0 ? (
          <div className="text-[11px] text-slate-500 italic py-2 text-center bg-slate-950/40 rounded border border-dashed border-slate-800">
            No presets saved for this camera.
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
            {camera.presets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => onCallPreset(camera.id, preset)}
                className="px-2.5 py-1.5 bg-slate-950/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded text-left flex items-center gap-2 group transition-colors"
              >
                <span className="text-[10px] font-mono text-cyan-400 font-bold">P{preset.id}</span>
                <span className="text-xs text-slate-300 group-hover:text-white truncate max-w-[120px]">
                  {preset.name}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
