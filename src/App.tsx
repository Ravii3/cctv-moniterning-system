import React, { useState, useEffect, useCallback } from 'react';
import { CameraDevice, MotionEvent, NetworkHost, PtzPreset } from './types/camera';
import { BackendApiService } from './services/backendApi';
import { TopNavbar, PortalTab } from './components/layout/TopNavbar';
import { LiveMonitorGrid } from './components/monitoring/LiveMonitorGrid';
import { DeviceManager } from './components/management/DeviceManager';
import { NetworkScanner } from './components/network/NetworkScanner';
import { PlaybackTimeline } from './components/playback/PlaybackTimeline';
import { EventAuditLog } from './components/events/EventAuditLog';
import { PhpMysqlConsole } from './components/developer/PhpMysqlConsole';
import { ShieldAlert, CheckCircle2, X } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<PortalTab>('monitor');
  const [cameras, setCameras] = useState<CameraDevice[]>(() => BackendApiService.getCameras());
  const [events, setEvents] = useState<MotionEvent[]>(() => BackendApiService.getEvents());
  const [hosts, setHosts] = useState<NetworkHost[]>(() => BackendApiService.getHosts());
  const [poePorts, setPoePorts] = useState(() => BackendApiService.getPoePorts());
  const [recordings, setRecordings] = useState(() => BackendApiService.getRecordings());
  const [selectedCameraId, setSelectedCameraId] = useState<string>(() => cameras[0]?.id || 'CAM-01');

  // Alarm Toast Notification
  const [activeAlarmToast, setActiveAlarmToast] = useState<MotionEvent | null>(null);

  // Synchronize cameras state with persistence
  const updateCameraState = useCallback((id: string, updates: Partial<CameraDevice>) => {
    const updated = BackendApiService.updateCamera(id, updates);
    if (updated) {
      setCameras(prev => prev.map(c => c.id === id ? updated : c));
    }
  }, []);

  // PTZ Updates
  const handleUpdatePtz = useCallback((cameraId: string, pan: number, tilt: number, zoom: number) => {
    const cam = cameras.find(c => c.id === cameraId);
    if (!cam) return;
    updateCameraState(cameraId, {
      ptzState: {
        ...cam.ptzState,
        pan,
        tilt,
        zoom
      }
    });
  }, [cameras, updateCameraState]);

  // Save Preset
  const handleSavePreset = useCallback((cameraId: string, presetName: string) => {
    const cam = cameras.find(c => c.id === cameraId);
    if (!cam) return;
    const newPreset: PtzPreset = {
      id: cam.presets.length + 1,
      name: presetName,
      pan: cam.ptzState.pan,
      tilt: cam.ptzState.tilt,
      zoom: cam.ptzState.zoom
    };
    updateCameraState(cameraId, {
      presets: [...cam.presets, newPreset]
    });
  }, [cameras, updateCameraState]);

  // Call Preset
  const handleCallPreset = useCallback((cameraId: string, preset: PtzPreset) => {
    updateCameraState(cameraId, {
      ptzState: {
        ...cameras.find(c => c.id === cameraId)!.ptzState,
        pan: preset.pan,
        tilt: preset.tilt,
        zoom: preset.zoom
      }
    });
  }, [cameras, updateCameraState]);

  // Toggle Patrol / Tour
  const handleTogglePatrol = useCallback((cameraId: string) => {
    const cam = cameras.find(c => c.id === cameraId);
    if (!cam || !cam.ptzCapable) return;
    updateCameraState(cameraId, {
      ptzState: {
        ...cam.ptzState,
        isPatrolling: !cam.ptzState.isPatrolling
      }
    });
  }, [cameras, updateCameraState]);

  // Automated Patrol Engine: Drives real-time PTZ sweeping for cameras with active patrol tours
  useEffect(() => {
    const hasPatrol = cameras.some(c => c.ptzCapable && c.ptzState.isPatrolling);
    if (!hasPatrol) return;

    const timer = setInterval(() => {
      setCameras(prev => {
        let changed = false;
        const updated = prev.map(cam => {
          if (!cam.ptzCapable || !cam.ptzState.isPatrolling) return cam;
          changed = true;
          if (cam.presets && cam.presets.length > 1) {
            const currentIdx = cam.presets.findIndex(
              p => Math.abs(p.pan - cam.ptzState.pan) < 4 && Math.abs(p.tilt - cam.ptzState.tilt) < 4
            );
            const nextIdx = (currentIdx + 1) % cam.presets.length;
            const nextPreset = cam.presets[nextIdx];
            return {
              ...cam,
              ptzState: {
                ...cam.ptzState,
                pan: nextPreset.pan,
                tilt: nextPreset.tilt,
                zoom: nextPreset.zoom
              }
            };
          } else {
            const nextPan = cam.ptzState.pan >= 25 ? -25 : cam.ptzState.pan <= -25 ? 25 : cam.ptzState.pan + 15;
            return {
              ...cam,
              ptzState: {
                ...cam.ptzState,
                pan: nextPan
              }
            };
          }
        });
        if (changed) {
          BackendApiService.saveCameras(updated);
        }
        return updated;
      });
    }, 4500);

    return () => clearInterval(timer);
  }, [cameras]);

  // Toggle Camera Recording
  const handleToggleRecording = useCallback((cameraId: string) => {
    const cam = cameras.find(c => c.id === cameraId);
    if (!cam) return;
    updateCameraState(cameraId, {
      isRecording: !cam.isRecording
    });
  }, [cameras, updateCameraState]);

  // Toggle All Recording
  const handleToggleAllRecording = useCallback(() => {
    const allRec = cameras.every(c => c.isRecording);
    const updated = cameras.map(c => ({ ...c, isRecording: !allRec }));
    setCameras(updated);
    BackendApiService.saveCameras(updated);
  }, [cameras]);

  // Snapshot Taken Notification
  const handleSnapshotTaken = useCallback((cameraId: string, dataUrl: string) => {
    const cam = cameras.find(c => c.id === cameraId);
    const link = document.createElement('a');
    link.download = `CCTV_SNAPSHOT_${cam?.id || 'CAM'}_${Date.now()}.jpg`;
    link.href = dataUrl;
    link.click();
  }, [cameras]);

  // Add Camera
  const handleAddCamera = useCallback((newCamera: CameraDevice) => {
    BackendApiService.addCamera(newCamera);
    const refreshed = BackendApiService.getCameras();
    setCameras(refreshed);
    setSelectedCameraId(newCamera.id);
    setActiveTab('monitor');
  }, []);

  // Delete Camera
  const handleDeleteCamera = useCallback((id: string) => {
    BackendApiService.deleteCamera(id);
    const refreshed = BackendApiService.getCameras();
    setCameras(refreshed);
    if (selectedCameraId === id && refreshed.length > 0) {
      setSelectedCameraId(refreshed[0].id);
    }
  }, [selectedCameraId]);

  // Adopt Discovered Network Host
  const handleAdoptHost = useCallback((host: NetworkHost) => {
    const newId = `CAM-${String(cameras.length + 1).padStart(2, '0')}`;
    const newCam: CameraDevice = {
      id: newId,
      name: `${host.hostname} (Discovered)`,
      location: 'Unassigned Discovery Zone',
      brand: host.vendor.includes('Hikvision') ? 'Hikvision' : host.vendor.includes('Axis') ? 'Axis' : host.vendor.includes('Dahua') ? 'Dahua' : 'Uniview',
      model: host.hostname,
      ipAddress: host.ip,
      subnetMask: '255.255.255.0',
      gateway: '192.168.1.1',
      dns: '1.1.1.1',
      macAddress: host.mac,
      httpPort: host.openPorts.includes(80) ? 80 : 8080,
      rtspPort: 554,
      onvifPort: 8000,
      httpsPort: 443,
      rtspMainUrl: `rtsp://admin:••••••••@${host.ip}:554/Streaming/Channels/101`,
      rtspSubUrl: `rtsp://admin:••••••••@${host.ip}:554/Streaming/Channels/102`,
      username: 'admin',
      status: 'online',
      resolution: '4K (3840x2160)',
      fps: 30,
      codec: 'H.265',
      bitrateKbps: 4096,
      ptzCapable: host.onvifSupported,
      ptzState: { pan: 0, tilt: 0, zoom: 1.0, focus: 50, iris: 50, isPatrolling: false },
      presets: [],
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
      poeWattage: 9.8,
      vlanId: 10,
      storageUsedGb: 0,
      recordingMode: 'continuous',
      isRecording: true,
      motionConfig: {
        enabled: true,
        sensitivity: 75,
        threshold: 25,
        gridMask: Array.from({ length: 12 }, () => Array(16).fill(true)),
        triggerRecording: true,
        triggerAlarm: true
      },
      firmware: 'V4.19_Discovered',
      uptimeSeconds: 120,
      sceneType: 'parking',
      baseImage: '/src/assets/images/cctv_parking_lot_1790157500153.jpg'
    };

    // Mark host managed
    const updatedHosts = hosts.map(h => h.ip === host.ip ? { ...h, isManaged: true } : h);
    setHosts(updatedHosts);
    BackendApiService.saveHosts(updatedHosts);

    handleAddCamera(newCam);
    alert(`Successfully adopted ${host.hostname} (${host.ip}) into surveillance pool.`);
  }, [cameras.length, handleAddCamera, hosts]);

  // Acknowledge Event
  const handleAcknowledgeEvent = useCallback((eventId: string, operator: string) => {
    BackendApiService.acknowledgeEvent(eventId, operator);
    setEvents(BackendApiService.getEvents());
    if (activeAlarmToast?.id === eventId) {
      setActiveAlarmToast(null);
    }
  }, [activeAlarmToast?.id]);

  // Simulate Alarm
  const handleSimulateAlarm = useCallback((cameraId: string, eventType: MotionEvent['eventType'], severity: MotionEvent['severity']) => {
    const cam = cameras.find(c => c.id === cameraId) || cameras[0];
    const newEvt: MotionEvent = {
      id: `EVT-${Math.floor(Math.random() * 9000 + 1000)}`,
      cameraId: cam.id,
      cameraName: cam.name,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      eventType,
      severity,
      confidence: Math.floor(Math.random() * 10 + 88),
      snapshotUrl: cam.baseImage,
      acknowledged: false,
      durationSeconds: 15,
      zone: `Zone ${Math.floor(Math.random() * 3 + 1)}`
    };
    BackendApiService.addEvent(newEvt);
    setEvents(BackendApiService.getEvents());
    setActiveAlarmToast(newEvt);
  }, [cameras]);

  // Unacknowledged alerts count
  const unacknowledgedCount = events.filter(e => !e.acknowledged).length;

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Top Navbar adhering to Top Bar Contract */}
      <TopNavbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        unacknowledgedAlerts={unacknowledgedCount}
        onQuickAddCamera={() => setActiveTab('devices')}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
        {activeTab === 'monitor' && (
          <LiveMonitorGrid
            cameras={cameras}
            selectedCameraId={selectedCameraId}
            onSelectCamera={setSelectedCameraId}
            onUpdatePtz={handleUpdatePtz}
            onSavePreset={handleSavePreset}
            onCallPreset={handleCallPreset}
            onTogglePatrol={handleTogglePatrol}
            onToggleRecording={handleToggleRecording}
            onToggleAllRecording={handleToggleAllRecording}
            onSnapshotTaken={handleSnapshotTaken}
            onDeleteCamera={handleDeleteCamera}
            onNavigateToDevices={() => setActiveTab('devices')}
          />
        )}

        {activeTab === 'devices' && (
          <DeviceManager
            cameras={cameras}
            onAddCamera={handleAddCamera}
            onUpdateCamera={updateCameraState}
            onDeleteCamera={handleDeleteCamera}
          />
        )}

        {activeTab === 'network' && (
          <NetworkScanner
            hosts={hosts}
            poePorts={poePorts}
            onAdoptHost={handleAdoptHost}
            onRefreshScan={() => setHosts(BackendApiService.getHosts())}
          />
        )}

        {activeTab === 'playback' && (
          <PlaybackTimeline
            cameras={cameras}
            recordings={recordings}
            selectedCameraId={selectedCameraId}
            onSelectCamera={setSelectedCameraId}
          />
        )}

        {activeTab === 'alarms' && (
          <EventAuditLog
            events={events}
            cameras={cameras}
            onAcknowledgeEvent={handleAcknowledgeEvent}
            onSimulateAlarm={handleSimulateAlarm}
          />
        )}

        {activeTab === 'developer' && (
          <PhpMysqlConsole />
        )}
      </main>

      {/* Real-time Alarm Floating Toast if triggered */}
      {activeAlarmToast && (
        <div className="fixed bottom-4 right-4 z-50 max-w-md bg-slate-900 border-2 border-red-500 rounded-xl p-3 shadow-2xl flex items-start gap-3 animate-bounce">
          <div className="p-2 rounded-lg bg-red-950 text-red-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div className="flex-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-red-400 uppercase tracking-wide">
                Security Alert: {activeAlarmToast.eventType.replace('_', ' ')}
              </span>
              <button
                type="button"
                onClick={() => setActiveAlarmToast(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-slate-200 mt-0.5">
              {activeAlarmToast.cameraName} ({activeAlarmToast.zone})
            </p>
            <div className="flex items-center gap-3 mt-2">
              <button
                type="button"
                onClick={() => {
                  handleAcknowledgeEvent(activeAlarmToast.id, 'Duty_Officer');
                  setActiveAlarmToast(null);
                }}
                className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-[11px] font-medium"
              >
                Acknowledge Incident
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedCameraId(activeAlarmToast.cameraId);
                  setActiveTab('monitor');
                  setActiveAlarmToast(null);
                }}
                className="text-[11px] text-cyan-400 hover:underline"
              >
                View Live Camera &rarr;
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
