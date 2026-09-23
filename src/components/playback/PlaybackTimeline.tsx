import React, { useState, useEffect, useRef } from 'react';
import { CameraDevice, RecordingSegment } from '../../types/camera';
import { 
  Play, Pause, FastForward, Rewind, Calendar, 
  Download, Bookmark, Clock, Film, RefreshCw, Scissors, ChevronRight
} from 'lucide-react';

interface PlaybackTimelineProps {
  cameras: CameraDevice[];
  recordings: RecordingSegment[];
  selectedCameraId: string;
  onSelectCamera: (cameraId: string) => void;
}

export const PlaybackTimeline: React.FC<PlaybackTimelineProps> = ({
  cameras,
  recordings,
  selectedCameraId,
  onSelectCamera
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [currentTimeSec, setCurrentTimeSec] = useState<number>(10440); // 02:54:00 AM in seconds
  const [selectedDate, setSelectedDate] = useState('2026-09-23');
  const [isExporting, setIsExporting] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const selectedCam = cameras.find(c => c.id === selectedCameraId) || cameras[0];
  const camRecordings = recordings.filter(r => r.cameraId === selectedCam.id);

  // Playback timer simulation
  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTimeSec(prev => {
          const next = prev + playbackSpeed;
          return next >= 86400 ? 0 : next;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed]);

  // Convert seconds to HH:MM:SS
  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  };

  // Handle timeline scrubber click
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const newSec = Math.floor(ratio * 86400);
    setCurrentTimeSec(newSec);
  };

  // Export clip simulator
  const handleExportClip = () => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      setExportNotice(`Exported clip [${formatTime(Math.max(0, currentTimeSec - 60))} - ${formatTime(currentTimeSec)}] as MP4.`);
      setTimeout(() => setExportNotice(null), 3500);
    }, 800);
  };

  return (
    <div className="flex flex-col flex-1 h-full min-h-0 bg-slate-950 p-4 overflow-y-auto space-y-4">
      {/* Top Header & Camera / Date Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Film className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-slate-100">NVR Archive Playback & Time-Scrubber</h2>
          </div>

          {/* Camera Picker */}
          <select
            value={selectedCameraId}
            onChange={(e) => onSelectCamera(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-xs text-cyan-300 rounded px-2.5 py-1 font-mono focus:outline-none focus:border-cyan-500"
          >
            {cameras.map(c => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.ipAddress})
              </option>
            ))}
          </select>
        </div>

        {/* Date Selector & Export */}
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-slate-300">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-xs font-mono text-slate-200 focus:outline-none"
            />
          </div>

          <button
            type="button"
            disabled={isExporting}
            onClick={handleExportClip}
            className="px-3 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExporting ? 'Exporting MP4...' : 'Export Clip'}</span>
          </button>

          {exportNotice && (
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-2 py-0.5 rounded animate-fade-in">
              {exportNotice}
            </span>
          )}
        </div>
      </div>

      {/* Main Playback Screen & Clip Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 flex-1 min-h-[440px]">
        {/* Playback Video Display */}
        <div className="lg:col-span-3 flex flex-col bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
          {/* Simulated Player Viewport */}
          <div className="relative flex-1 bg-black min-h-[340px] flex items-center justify-center overflow-hidden">
            <img
              src={selectedCam.baseImage}
              alt="Archived Footage"
              className="w-full h-full object-cover opacity-85 filter contrast-105"
            />

            {/* Archive Watermark & Timestamp Overlay */}
            <div className="absolute top-4 left-4 bg-black/75 px-3 py-1.5 rounded border border-slate-700/60 font-mono text-xs text-white">
              <span className="text-cyan-400 font-bold">{selectedCam.name}</span>
              <span className="text-slate-400 ml-2">
                {selectedDate} {formatTime(currentTimeSec)}
              </span>
            </div>

            <div className="absolute top-4 right-4 bg-black/75 px-2.5 py-1 rounded border border-slate-700/60 font-mono text-xs text-amber-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span>RECORDING PLAYBACK ({playbackSpeed}x)</span>
            </div>

            {/* Play/Pause Large Center Overlay if paused */}
            {!isPlaying && (
              <div
                onClick={() => setIsPlaying(true)}
                className="absolute inset-0 flex items-center justify-center bg-black/40 cursor-pointer"
              >
                <div className="w-16 h-16 rounded-full bg-cyan-600/80 hover:bg-cyan-500 text-white flex items-center justify-center shadow-2xl transition-transform hover:scale-105">
                  <Play className="w-8 h-8 fill-white ml-1" />
                </div>
              </div>
            )}
          </div>

          {/* Player Transport Controls Bar */}
          <div className="bg-slate-950 p-3 border-t border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Step Back 10s */}
              <button
                type="button"
                onClick={() => setCurrentTimeSec(prev => Math.max(0, prev - 10))}
                className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
                title="Rewind 10 Seconds"
              >
                <Rewind className="w-4 h-4" />
              </button>

              {/* Play / Pause */}
              <button
                type="button"
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-md transition-colors shadow-md"
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
              </button>

              {/* Step Forward 10s */}
              <button
                type="button"
                onClick={() => setCurrentTimeSec(prev => Math.min(86400, prev + 10))}
                className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
                title="Forward 10 Seconds"
              >
                <FastForward className="w-4 h-4" />
              </button>

              {/* Current Scrubber Timestamp */}
              <div className="ml-3 font-mono text-sm text-cyan-400 font-bold tabular-nums">
                {formatTime(currentTimeSec)}
              </div>
            </div>

            {/* Playback Speed Toggles */}
            <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded border border-slate-800 text-xs font-mono">
              {[0.5, 1, 2, 4, 8].map(spd => (
                <button
                  key={spd}
                  type="button"
                  onClick={() => setPlaybackSpeed(spd)}
                  className={`px-2 py-0.5 rounded transition-colors ${
                    playbackSpeed === spd
                      ? 'bg-cyan-600 text-white font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Recorded Clips & Event Markers Sidebar */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-semibold text-slate-200">Recording Segments</span>
            <span className="text-[10px] font-mono text-slate-400">{camRecordings.length} Clips</span>
          </div>

          <div className="overflow-y-auto flex-1 space-y-2 max-h-[380px] pr-1">
            {camRecordings.map(rec => (
              <div
                key={rec.id}
                onClick={() => {
                  const date = new Date(rec.startTime);
                  const secs = date.getUTCHours() * 3600 + date.getUTCMinutes() * 60 + date.getUTCSeconds();
                  setCurrentTimeSec(secs);
                  setIsPlaying(true);
                }}
                className="p-2.5 rounded-lg bg-slate-950/80 hover:bg-slate-800/80 border border-slate-800 cursor-pointer transition-colors group"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-cyan-400 font-medium">
                    {new Date(rec.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                    {new Date(rec.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded uppercase ${
                      rec.type === 'alarm'
                        ? 'bg-red-950 text-red-400 border border-red-800'
                        : rec.type === 'motion'
                        ? 'bg-amber-950 text-amber-400 border border-amber-800'
                        : 'bg-cyan-950 text-cyan-400 border border-cyan-800'
                    }`}
                  >
                    {rec.type}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono mt-1">
                  <span>{rec.durationSeconds}s duration</span>
                  <span>{rec.fileSizeMb} MB</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 24-Hour Scrubber Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col gap-2 shadow-sm">
        <div className="flex items-center justify-between text-xs font-mono text-slate-400">
          <span>00:00:00</span>
          <span>06:00:00</span>
          <span>12:00:00</span>
          <span>18:00:00</span>
          <span>23:59:59</span>
        </div>

        {/* 24-Hour Timeline Bar */}
        <div
          onClick={handleTimelineClick}
          className="relative h-10 bg-slate-950 rounded-lg border border-slate-800 overflow-hidden cursor-crosshair group shadow-inner"
        >
          {/* Continuous Recording Block (e.g. 00:00 to 03:00) */}
          <div
            className="absolute top-1 bottom-1 bg-cyan-700/40 border-y border-cyan-500/50"
            style={{ left: '0%', width: '13%' }}
            title="Continuous Stream Recording (00:00 - 03:08)"
          />

          {/* Alarm Trigger Marker */}
          <div
            className="absolute top-0 bottom-0 bg-red-500 w-1 shadow-md shadow-red-500"
            style={{ left: '12.1%' }}
            title="Intrusion Alarm Event (02:54:12)"
          />

          {/* Scrubber Playhead Line */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-yellow-400 z-10 transition-all pointer-events-none"
            style={{ left: `${(currentTimeSec / 86400) * 100}%` }}
          >
            <div className="w-3 h-3 bg-yellow-400 -translate-x-1.5 -translate-y-1 rotate-45" />
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-[11px] font-mono text-slate-400 pt-1">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-2 bg-cyan-600 rounded-[1px]" />
            <span>Continuous 24/7 Stream</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-2 bg-amber-500 rounded-[1px]" />
            <span>Motion Detection</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-2 bg-red-500 rounded-[1px]" />
            <span>Line Cross / Intrusion Alarm</span>
          </div>
        </div>
      </div>
    </div>
  );
};
