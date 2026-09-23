export type CameraStatus = 'online' | 'degraded' | 'offline' | 'authenticating';

export type VideoResolution = '4K (3840x2160)' | '2K (2560x1440)' | '1080p (1920x1080)' | '720p (1280x720)';
export type VideoCodec = 'H.265' | 'H.264' | 'MJPEG';
export type DayNightMode = 'auto' | 'day' | 'night' | 'thermal';

export interface PtzPreset {
  id: number;
  name: string;
  pan: number;  // -180 to 180
  tilt: number; // -90 to 90
  zoom: number; // 1 to 30
}

export interface PtzState {
  pan: number;
  tilt: number;
  zoom: number;
  focus: number;
  iris: number;
  isPatrolling: boolean;
}

export interface ImageSettings {
  brightness: number;
  contrast: number;
  saturation: number;
  sharpness: number;
  wdr: boolean;
  irCut: DayNightMode;
  noiseReduction: boolean;
}

export interface MotionDetectionConfig {
  enabled: boolean;
  sensitivity: number; // 1 to 100
  threshold: number;   // 1 to 100
  gridMask: boolean[][]; // 16x12 detection zone
  triggerRecording: boolean;
  triggerAlarm: boolean;
}

export interface CameraDevice {
  id: string;
  name: string;
  location: string;
  brand: 'Axis' | 'Hikvision' | 'Dahua' | 'Hanwha' | 'Uniview' | 'UniFi' | 'Amcrest' | 'CP Plus' | 'Generic IP' | string;
  model: string;
  ipAddress: string;
  subnetMask: string;
  gateway: string;
  dns: string;
  macAddress: string;
  httpPort: number;
  rtspPort: number;
  onvifPort: number;
  httpsPort: number;
  rtspMainUrl: string;
  rtspSubUrl: string;
  streamUrl?: string;
  username: string;
  status: CameraStatus;
  resolution: VideoResolution;
  fps: number;
  codec: VideoCodec;
  bitrateKbps: number;
  ptzCapable: boolean;
  ptzState: PtzState;
  presets: PtzPreset[];
  imageSettings: ImageSettings;
  poePort: number;
  poeWattage: number;
  vlanId: number;
  storageUsedGb: number;
  recordingMode: 'continuous' | 'motion_only' | 'scheduled' | 'off';
  isRecording: boolean;
  motionConfig: MotionDetectionConfig;
  firmware: string;
  uptimeSeconds: number;
  sceneType: 'parking' | 'server_room' | 'warehouse' | 'entrance' | 'perimeter' | 'lobby' | 'traffic' | 'riverfront' | 'bridge' | 'custom';
  baseImage: string;
  lastMotionAt?: string;
  country?: string;
  isPublicFeed?: boolean;
  feedType?: 'youtube' | 'hls' | 'local' | 'video' | 'direct';
  youtubeId?: string;
  hlsUrl?: string;
  directVideoUrl?: string;
}

export interface MotionEvent {
  id: string;
  cameraId: string;
  cameraName: string;
  timestamp: string;
  eventType: 'motion' | 'line_crossing' | 'tamper' | 'loitering' | 'person_detected' | 'vehicle_detected';
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  snapshotUrl?: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
  durationSeconds: number;
  zone: string;
}

export interface NetworkHost {
  ip: string;
  mac: string;
  hostname: string;
  vendor: string;
  status: 'camera_online' | 'camera_auth_required' | 'switch' | 'server' | 'unknown';
  openPorts: number[];
  onvifSupported: boolean;
  rtspSupported: boolean;
  latencyMs: number;
  isManaged: boolean;
}

export interface PoePortStatus {
  portNumber: number;
  status: 'up' | 'down' | 'error';
  cameraId?: string;
  cameraName?: string;
  powerWatts: number;
  maxWatts: number;
  linkSpeed: '100M' | '1000M' | 'Disconnected';
  vlan: number;
}

export interface StorageDisk {
  slot: number;
  model: string;
  capacityTb: number;
  usedTb: number;
  status: 'healthy' | 'warning' | 'rebuilding';
  temperatureC: number;
  powerOnHours: number;
}

export interface RecordingSegment {
  id: string;
  cameraId: string;
  startTime: string; // ISO
  endTime: string;
  type: 'continuous' | 'motion' | 'alarm';
  fileSizeMb: number;
  durationSeconds: number;
}

export interface SqlQueryLog {
  id: string;
  timestamp: string;
  query: string;
  executionTimeMs: number;
  rowsAffected: number;
  endpoint: string;
}
