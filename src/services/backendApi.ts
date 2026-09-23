import { CameraDevice, MotionEvent, NetworkHost, PoePortStatus, StorageDisk, RecordingSegment, SqlQueryLog } from '../types/camera';
import { INITIAL_CAMERAS, INITIAL_EVENTS, INITIAL_POE_PORTS, INITIAL_STORAGE_DISKS, DISCOVERABLE_SUBNET_HOSTS, INITIAL_RECORDING_SEGMENTS } from '../data/mockData';

const STORAGE_KEY_CAMERAS = 'netvision_cameras_real_live_v7';
const STORAGE_KEY_EVENTS = 'netvision_events_real_live_v7';
const STORAGE_KEY_POE = 'netvision_poe_v2';
const STORAGE_KEY_DISKS = 'netvision_disks_v2';
const STORAGE_KEY_HOSTS = 'netvision_hosts_v2';

export class BackendApiService {
  private static sqlLogs: SqlQueryLog[] = [
    {
      id: 'log-1',
      timestamp: new Date(Date.now() - 60000).toISOString(),
      query: 'SELECT * FROM tbl_cameras WHERE status = "online" ORDER BY id ASC;',
      executionTimeMs: 1.42,
      rowsAffected: 6,
      endpoint: '/api/cameras.php'
    },
    {
      id: 'log-2',
      timestamp: new Date(Date.now() - 45000).toISOString(),
      query: 'SELECT id, camera_id, event_type, severity, timestamp FROM tbl_motion_events ORDER BY timestamp DESC LIMIT 20;',
      executionTimeMs: 2.18,
      rowsAffected: 5,
      endpoint: '/api/events.php?limit=20'
    },
    {
      id: 'log-3',
      timestamp: new Date(Date.now() - 20000).toISOString(),
      query: 'SELECT port_id, link_status, poe_watts, vlan_id FROM tbl_poe_switch_ports WHERE link_status = "up";',
      executionTimeMs: 0.94,
      rowsAffected: 6,
      endpoint: '/api/switch_telemetry.php'
    }
  ];

  private static logListeners: ((logs: SqlQueryLog[]) => void)[] = [];

  static subscribeSqlLogs(listener: (logs: SqlQueryLog[]) => void) {
    this.logListeners.push(listener);
    return () => {
      this.logListeners = this.logListeners.filter(l => l !== listener);
    };
  }

  private static recordSql(query: string, rowsAffected: number, endpoint: string) {
    const log: SqlQueryLog = {
      id: 'log-' + Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      query,
      executionTimeMs: Number((Math.random() * 2 + 0.6).toFixed(2)),
      rowsAffected,
      endpoint
    };
    this.sqlLogs = [log, ...this.sqlLogs.slice(0, 49)];
    this.logListeners.forEach(listener => listener(this.sqlLogs));
  }

  static getSqlLogs(): SqlQueryLog[] {
    return this.sqlLogs;
  }

  // Database initializers
  static getCameras(): CameraDevice[] {
    const raw = localStorage.getItem(STORAGE_KEY_CAMERAS);
    if (raw) {
      try {
        const parsed: CameraDevice[] = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const hasOnlyRealFeeds = parsed.every(c => c.feedType === 'hls' || c.feedType === 'local' || c.feedType === 'direct');
          const hasNoYouTube = !parsed.some(c => c.feedType === 'youtube' || c.streamUrl?.includes('youtube.com') || c.streamUrl?.includes('youtu.be'));
          if (hasOnlyRealFeeds && hasNoYouTube) {
            return parsed;
          }
        }
      } catch (e) {
        console.error('Failed to parse cameras from storage', e);
      }
    }
    localStorage.setItem(STORAGE_KEY_CAMERAS, JSON.stringify(INITIAL_CAMERAS));
    this.recordSql('SELECT * FROM tbl_cameras ORDER BY id ASC;', INITIAL_CAMERAS.length, '/api/cameras.php');
    return INITIAL_CAMERAS;
  }

  static saveCameras(cameras: CameraDevice[]): void {
    localStorage.setItem(STORAGE_KEY_CAMERAS, JSON.stringify(cameras));
  }

  static updateCamera(id: string, updates: Partial<CameraDevice>): CameraDevice | null {
    const cameras = this.getCameras();
    const index = cameras.findIndex(c => c.id === id);
    if (index === -1) return null;

    const updated = { ...cameras[index], ...updates };
    cameras[index] = updated;
    this.saveCameras(cameras);

    const keys = Object.keys(updates);
    const sqlSet = keys.map(k => `${k} = '${String(updates[k as keyof CameraDevice])}'`).slice(0, 3).join(', ');
    this.recordSql(`UPDATE tbl_cameras SET ${sqlSet} WHERE id = '${id}';`, 1, '/api/cameras.php?action=update');

    return updated;
  }

  static addCamera(newCamera: CameraDevice): CameraDevice {
    const cameras = this.getCameras();
    // Filter out if duplicate ID exists, then unshift to index 0 so it immediately appears in all grids
    const filtered = cameras.filter(c => c.id !== newCamera.id);
    filtered.unshift(newCamera);
    this.saveCameras(filtered);
    this.recordSql(
      `INSERT INTO tbl_cameras (id, name, ip_address, brand, model, rtsp_main_url, vlan_id) VALUES ('${newCamera.id}', '${newCamera.name}', '${newCamera.ipAddress}', '${newCamera.brand}', '${newCamera.model}', '${newCamera.rtspMainUrl}', ${newCamera.vlanId});`,
      1,
      '/api/cameras.php?action=create'
    );
    return newCamera;
  }

  static deleteCamera(id: string): CameraDevice[] {
    const cameras = this.getCameras().filter(c => c.id !== id);
    this.saveCameras(cameras);
    this.recordSql(`DELETE FROM tbl_cameras WHERE id = '${id}';`, 1, '/api/cameras.php?action=delete');
    return cameras;
  }

  static getEvents(): MotionEvent[] {
    const raw = localStorage.getItem(STORAGE_KEY_EVENTS);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {
        console.error('Failed to parse events', e);
      }
    }
    localStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(INITIAL_EVENTS));
    return INITIAL_EVENTS;
  }

  static acknowledgeEvent(eventId: string, operator: string = 'Officer_Console'): void {
    const events = this.getEvents();
    const updated = events.map(e => e.id === eventId ? { ...e, acknowledged: true, acknowledgedBy: operator } : e);
    localStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(updated));
    this.recordSql(`UPDATE tbl_motion_events SET acknowledged = 1, acknowledged_by = '${operator}' WHERE id = '${eventId}';`, 1, '/api/events.php?action=acknowledge');
  }

  static addEvent(event: MotionEvent): void {
    const events = [event, ...this.getEvents()];
    localStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(events));
    this.recordSql(
      `INSERT INTO tbl_motion_events (id, camera_id, event_type, severity, confidence, zone, timestamp) VALUES ('${event.id}', '${event.cameraId}', '${event.eventType}', '${event.severity}', ${event.confidence}, '${event.zone}', '${event.timestamp}');`,
      1,
      '/api/events.php?action=ingest'
    );
  }

  static getPoePorts(): PoePortStatus[] {
    const raw = localStorage.getItem(STORAGE_KEY_POE);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {}
    }
    return INITIAL_POE_PORTS;
  }

  static getDisks(): StorageDisk[] {
    const raw = localStorage.getItem(STORAGE_KEY_DISKS);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {}
    }
    return INITIAL_STORAGE_DISKS;
  }

  static getHosts(): NetworkHost[] {
    const raw = localStorage.getItem(STORAGE_KEY_HOSTS);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {}
    }
    return DISCOVERABLE_SUBNET_HOSTS;
  }

  static saveHosts(hosts: NetworkHost[]): void {
    localStorage.setItem(STORAGE_KEY_HOSTS, JSON.stringify(hosts));
  }

  static getRecordings(): RecordingSegment[] {
    return INITIAL_RECORDING_SEGMENTS;
  }

  // Simulated SQL Engine for the Developer Query Console
  static executeCustomSql(sqlString: string): { success: boolean; message: string; rows: any[]; executionTimeMs: number } {
    const start = performance.now();
    const cleanSql = sqlString.trim().replace(/;$/, '');
    const upper = cleanSql.toUpperCase();

    try {
      if (upper.startsWith('SELECT')) {
        let tableName = 'tbl_cameras';
        if (upper.includes('FROM TBL_CAMERAS') || upper.includes('FROM `TBL_CAMERAS`') || upper.includes('FROM CAMERAS')) {
          tableName = 'tbl_cameras';
          const cameras = this.getCameras();
          const executionTimeMs = Number((performance.now() - start + 1.2).toFixed(2));
          this.recordSql(cleanSql, cameras.length, '/api/sql_console.php');
          return { success: true, message: `Query OK, ${cameras.length} rows in set (${executionTimeMs} ms)`, rows: cameras, executionTimeMs };
        } else if (upper.includes('FROM TBL_MOTION_EVENTS') || upper.includes('FROM EVENTS')) {
          tableName = 'tbl_motion_events';
          const events = this.getEvents();
          const executionTimeMs = Number((performance.now() - start + 1.1).toFixed(2));
          this.recordSql(cleanSql, events.length, '/api/sql_console.php');
          return { success: true, message: `Query OK, ${events.length} rows in set (${executionTimeMs} ms)`, rows: events, executionTimeMs };
        } else if (upper.includes('FROM TBL_POE_PORTS') || upper.includes('FROM TBL_SWITCH')) {
          const ports = this.getPoePorts();
          const executionTimeMs = Number((performance.now() - start + 0.8).toFixed(2));
          this.recordSql(cleanSql, ports.length, '/api/sql_console.php');
          return { success: true, message: `Query OK, ${ports.length} rows in set (${executionTimeMs} ms)`, rows: ports, executionTimeMs };
        } else if (upper.includes('FROM TBL_RECORDINGS')) {
          const recs = this.getRecordings();
          const executionTimeMs = Number((performance.now() - start + 0.9).toFixed(2));
          this.recordSql(cleanSql, recs.length, '/api/sql_console.php');
          return { success: true, message: `Query OK, ${recs.length} rows in set (${executionTimeMs} ms)`, rows: recs, executionTimeMs };
        } else if (upper.includes('FROM TBL_NETWORK_HOSTS')) {
          const hosts = this.getHosts();
          const executionTimeMs = Number((performance.now() - start + 0.7).toFixed(2));
          this.recordSql(cleanSql, hosts.length, '/api/sql_console.php');
          return { success: true, message: `Query OK, ${hosts.length} rows in set (${executionTimeMs} ms)`, rows: hosts, executionTimeMs };
        } else {
          // Default fall through to cameras
          const cameras = this.getCameras();
          const executionTimeMs = Number((performance.now() - start + 1.2).toFixed(2));
          return { success: true, message: `Query executed on default table (${cameras.length} rows)`, rows: cameras, executionTimeMs };
        }
      } else if (upper.startsWith('UPDATE')) {
        const executionTimeMs = Number((performance.now() - start + 1.5).toFixed(2));
        this.recordSql(cleanSql, 1, '/api/sql_console.php');
        return { success: true, message: `Query OK, 1 row affected (${executionTimeMs} ms)`, rows: [{ status: 'success', affectedRows: 1 }], executionTimeMs };
      } else {
        const executionTimeMs = Number((performance.now() - start + 1.0).toFixed(2));
        return { success: true, message: `Statement executed successfully. (${executionTimeMs} ms)`, rows: [], executionTimeMs };
      }
    } catch (err: any) {
      return { success: false, message: `MySQL Error 1064 (42000): ${err.message}`, rows: [], executionTimeMs: 0 };
    }
  }

  // Sample PHP files for the PHP/MySQL Architecture view
  static getPhpSourceFiles(): Record<string, { description: string; language: string; code: string }> {
    return {
      'config/database.php': {
        description: 'PHP PDO MySQL Connection with connection pooling & prepared statements',
        language: 'php',
        code: `<?php
/**
 * NetVision Sentinel - MySQL Database Connection Configuration
 * Architecture: PHP 8.2 + PDO MySQL Driver + Persistent Pooling
 */

declare(strict_types=1);

namespace NetVision\\Config;

use PDO;
use PDOException;

class Database {
    private static ?PDO $instance = null;

    private static string $host = '127.0.0.1';
    private static string $db   = 'cctv_surveillance_db';
    private static string $user = 'nvr_daemon';
    private static string $pass = 'NetVision#SecureP@ss2026';
    private static string $charset = 'utf8mb4';

    public static function getConnection(): PDO {
        if (self::$instance === null) {
            $dsn = sprintf('mysql:host=%s;dbname=%s;charset=%s', self::$host, self::$db, self::$charset);
            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
                PDO::ATTR_PERSISTENT         => true, // Socket reuse for high-frequency camera telemetry
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"
            ];

            try {
                self::$instance = new PDO($dsn, self::$user, self::$pass, $options);
            } catch (PDOException $e) {
                error_log('[MySQL Connection Error] ' . $e->getMessage());
                http_response_code(500);
                echo json_encode(['error' => 'Database connection failed', 'code' => 500]);
                exit;
            }
        }

        return self::$instance;
    }
}
`
      },
      'api/cameras.php': {
        description: 'RESTful Controller for Camera Inventory, ONVIF Sync & RTSP Stream Allocation',
        language: 'php',
        code: `<?php
/**
 * NetVision Sentinel - Camera Resource REST API Endpoint
 * Handles: GET, POST (Create), PUT (Update), DELETE, and ONVIF discovery
 */

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/../config/database.php';
use NetVision\\Config\\Database;

$pdo = Database::getConnection();
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? 'list';

switch ($method) {
    case 'GET':
        if (isset($_GET['id'])) {
            $stmt = $pdo->prepare('SELECT c.*, p.poe_watts, p.link_speed FROM tbl_cameras c LEFT JOIN tbl_poe_ports p ON c.id = p.camera_id WHERE c.id = :id');
            $stmt->execute(['id' => $_GET['id']]);
            $camera = $stmt->fetch();
            if (!$camera) {
                http_response_code(404);
                echo json_encode(['error' => 'Camera not found']);
                exit;
            }
            echo json_encode(['status' => 'success', 'data' => $camera]);
        } else {
            $vlan = isset($_GET['vlan']) ? (int)$_GET['vlan'] : null;
            $sql = 'SELECT * FROM tbl_cameras';
            $params = [];
            if ($vlan !== null) {
                $sql .= ' WHERE vlan_id = :vlan';
                $params['vlan'] = $vlan;
            }
            $sql .= ' ORDER BY id ASC';
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $cameras = $stmt->fetchAll();
            echo json_encode(['status' => 'success', 'count' => count($cameras), 'data' => $cameras]);
        }
        break;

    case 'POST':
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input || empty($input['ip_address']) || empty($input['name'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing required fields: ip_address, name']);
            exit;
        }

        $stmt = $pdo->prepare(
            'INSERT INTO tbl_cameras (id, name, location, brand, model, ip_address, rtsp_port, onvif_port, rtsp_main_url, vlan_id, status)
             VALUES (:id, :name, :location, :brand, :model, :ip, :rtsp, :onvif, :rtsp_url, :vlan, "online")'
        );
        $newId = 'CAM-' . str_pad((string)(rand(7, 99)), 2, '0', STR_PAD_LEFT);
        $stmt->execute([
            'id' => $newId,
            'name' => $input['name'],
            'location' => $input['location'] ?? 'Unassigned Area',
            'brand' => $input['brand'] ?? 'Generic ONVIF',
            'model' => $input['model'] ?? 'IP-CAM-HD',
            'ip' => $input['ip_address'],
            'rtsp' => $input['rtsp_port'] ?? 554,
            'onvif' => $input['onvif_port'] ?? 80,
            'rtsp_url' => sprintf('rtsp://admin:pass@%s:554/live', $input['ip_address']),
            'vlan' => $input['vlan_id'] ?? 10
        ]);

        http_response_code(201);
        echo json_encode(['status' => 'created', 'camera_id' => $newId]);
        break;

    case 'PUT':
        $id = $_GET['id'] ?? null;
        if (!$id) {
            http_response_code(400);
            echo json_encode(['error' => 'Camera ID required']);
            exit;
        }
        $input = json_decode(file_get_contents('php://input'), true);
        $stmt = $pdo->prepare('UPDATE tbl_cameras SET name = :name, resolution = :res, bitrate_kbps = :bitrate WHERE id = :id');
        $stmt->execute([
            'name' => $input['name'],
            'res' => $input['resolution'] ?? '1080p',
            'bitrate' => $input['bitrate_kbps'] ?? 4096,
            'id' => $id
        ]);
        echo json_encode(['status' => 'updated', 'id' => $id]);
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method Not Allowed']);
        break;
}
`
      },
      'api/onvif_ptz.php': {
        description: 'ONVIF Profile S SOAP Client for Pan/Tilt/Zoom continuous and preset control',
        language: 'php',
        code: `<?php
/**
 * NetVision Sentinel - ONVIF Profile S SOAP PTZ Handler
 * Sends standard WS-Security and ONVIF XML packets to camera IP
 */

declare(strict_types=1);

namespace NetVision\\Onvif;

class OnvifPtzClient {
    private string $cameraIp;
    private int $port;
    private string $username;
    private string $password;

    public function __construct(string $cameraIp, int $port = 80, string $username = 'admin', string $password = '') {
        $this->cameraIp = $cameraIp;
        $this->port = $port;
        $this->username = $username;
        $this->password = $password;
    }

    /**
     * Send ContinuousMove vector (Pan: -1.0 to 1.0, Tilt: -1.0 to 1.0, Zoom: -1.0 to 1.0)
     */
    public function continuousMove(float $panSpeed, float $tiltSpeed, float $zoomSpeed): array {
        $ptzEndpoint = sprintf('http://%s:%d/onvif/ptz_service', $this->cameraIp, $this->port);
        
        $soapEnvelope = <<<XML
<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
               xmlns:tptz="http://www.onvif.org/ver20/ptz/wsdl"
               xmlns:tt="http://www.onvif.org/ver10/schema">
  <soap:Header>
    <!-- WS-Security Auth Token injected here -->
  </soap:Header>
  <soap:Body>
    <tptz:ContinuousMove>
      <tptz:ProfileToken>Profile_1</tptz:ProfileToken>
      <tptz:Velocity>
        <tt:PanTilt x="{$panSpeed}" y="{$tiltSpeed}" space="http://www.onvif.org/ver10/tptz/PanTiltSpaces/VelocityGenericSpace"/>
        <tt:Zoom x="{$zoomSpeed}" space="http://www.onvif.org/ver10/tptz/ZoomSpaces/VelocityGenericSpace"/>
      </tptz:Velocity>
    </tptz:ContinuousMove>
  </soap:Body>
</soap:Envelope>
XML;

        $ch = curl_init($ptzEndpoint);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $soapEnvelope);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/soap+xml; charset=utf-8; action="http://www.onvif.org/ver20/ptz/wsdl/ContinuousMove"',
            'Content-Length: ' . strlen($soapEnvelope)
        ]);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 2);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        return ['success' => $httpCode === 200, 'http_code' => $httpCode];
    }
}
`
      },
      'schema/cctv_database.sql': {
        description: 'Complete MySQL 8.0 Relational Surveillance Schema (DDL)',
        language: 'sql',
        code: `-- =========================================================================
-- NetVision Sentinel CCTV Surveillance Database Schema
-- Engines: InnoDB, Charset: utf8mb4, Collation: utf8mb4_unicode_ci
-- =========================================================================

CREATE DATABASE IF NOT EXISTS \`cctv_surveillance_db\`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE \`cctv_surveillance_db\`;

-- 1. Camera Devices Master Table
CREATE TABLE IF NOT EXISTS \`tbl_cameras\` (
  \`id\` VARCHAR(16) NOT NULL,
  \`name\` VARCHAR(128) NOT NULL,
  \`location\` VARCHAR(128) NOT NULL,
  \`brand\` ENUM('Axis', 'Hikvision', 'Dahua', 'Hanwha', 'Uniview', 'UniFi', 'Amcrest', 'Generic') DEFAULT 'Generic',
  \`model\` VARCHAR(64) NOT NULL,
  \`ip_address\` VARCHAR(45) NOT NULL,
  \`subnet_mask\` VARCHAR(15) DEFAULT '255.255.255.0',
  \`gateway\` VARCHAR(45) DEFAULT '192.168.1.1',
  \`mac_address\` VARCHAR(17) NOT NULL,
  \`http_port\` INT UNSIGNED DEFAULT 80,
  \`rtsp_port\` INT UNSIGNED DEFAULT 554,
  \`onvif_port\` INT UNSIGNED DEFAULT 8000,
  \`rtsp_main_url\` VARCHAR(255) NOT NULL,
  \`rtsp_sub_url\` VARCHAR(255) DEFAULT NULL,
  \`status\` ENUM('online', 'degraded', 'offline', 'authenticating') DEFAULT 'online',
  \`resolution\` VARCHAR(32) DEFAULT '1080p (1920x1080)',
  \`fps\` TINYINT UNSIGNED DEFAULT 30,
  \`codec\` ENUM('H.265', 'H.264', 'MJPEG') DEFAULT 'H.265',
  \`bitrate_kbps\` INT UNSIGNED DEFAULT 4096,
  \`ptz_capable\` TINYINT(1) DEFAULT 0,
  \`vlan_id\` INT UNSIGNED DEFAULT 10,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`idx_camera_ip\` (\`ip_address\`),
  KEY \`idx_camera_status\` (\`status\`)
) ENGINE=InnoDB;

-- 2. PTZ Presets Table
CREATE TABLE IF NOT EXISTS \`tbl_ptz_presets\` (
  \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  \`camera_id\` VARCHAR(16) NOT NULL,
  \`preset_number\` INT UNSIGNED NOT NULL,
  \`preset_name\` VARCHAR(64) NOT NULL,
  \`pan_val\` DECIMAL(6, 2) NOT NULL DEFAULT 0.00,
  \`tilt_val\` DECIMAL(6, 2) NOT NULL DEFAULT 0.00,
  \`zoom_val\` DECIMAL(5, 2) NOT NULL DEFAULT 1.00,
  CONSTRAINT \`fk_preset_camera\` FOREIGN KEY (\`camera_id\`) REFERENCES \`tbl_cameras\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 3. Motion & AI Security Events
CREATE TABLE IF NOT EXISTS \`tbl_motion_events\` (
  \`id\` VARCHAR(24) NOT NULL PRIMARY KEY,
  \`camera_id\` VARCHAR(16) NOT NULL,
  \`event_type\` ENUM('motion', 'line_crossing', 'tamper', 'loitering', 'person_detected', 'vehicle_detected') NOT NULL,
  \`severity\` ENUM('low', 'medium', 'high', 'critical') DEFAULT 'low',
  \`confidence\` TINYINT UNSIGNED DEFAULT 90,
  \`zone\` VARCHAR(64) DEFAULT 'Zone 1',
  \`snapshot_path\` VARCHAR(255) DEFAULT NULL,
  \`acknowledged\` TINYINT(1) DEFAULT 0,
  \`acknowledged_by\` VARCHAR(64) DEFAULT NULL,
  \`duration_seconds\` INT UNSIGNED DEFAULT 10,
  \`timestamp\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY \`idx_events_camera\` (\`camera_id\`),
  KEY \`idx_events_timestamp\` (\`timestamp\`),
  KEY \`idx_events_severity\` (\`severity\`),
  CONSTRAINT \`fk_event_camera\` FOREIGN KEY (\`camera_id\`) REFERENCES \`tbl_cameras\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 4. Managed PoE Switch Port Telemetry
CREATE TABLE IF NOT EXISTS \`tbl_poe_ports\` (
  \`port_number\` INT UNSIGNED PRIMARY KEY,
  \`link_status\` ENUM('up', 'down', 'error') DEFAULT 'down',
  \`camera_id\` VARCHAR(16) DEFAULT NULL,
  \`power_watts\` DECIMAL(4, 1) DEFAULT 0.0,
  \`max_watts\` DECIMAL(4, 1) DEFAULT 30.0,
  \`link_speed\` VARCHAR(16) DEFAULT 'Disconnected',
  \`vlan_id\` INT UNSIGNED DEFAULT 10,
  KEY \`idx_poe_camera\` (\`camera_id\`)
) ENGINE=InnoDB;

-- 5. Video Recording Archive Segments
CREATE TABLE IF NOT EXISTS \`tbl_recordings\` (
  \`id\` VARCHAR(32) NOT NULL PRIMARY KEY,
  \`camera_id\` VARCHAR(16) NOT NULL,
  \`start_time\` DATETIME NOT NULL,
  \`end_time\` DATETIME NOT NULL,
  \`type\` ENUM('continuous', 'motion', 'alarm') DEFAULT 'continuous',
  \`file_path\` VARCHAR(255) NOT NULL,
  \`file_size_mb\` INT UNSIGNED NOT NULL,
  KEY \`idx_recordings_camera_time\` (\`camera_id\`, \`start_time\`),
  CONSTRAINT \`fk_rec_camera\` FOREIGN KEY (\`camera_id\`) REFERENCES \`tbl_cameras\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB;
`
      },
      'cron/retention_cleaner.php': {
        description: 'Automated 24/7 FIFO Disk Space & Storage Retention Policy Enforcer',
        language: 'php',
        code: `<?php
/**
 * NetVision Sentinel - Automated Disk Pruner & FIFO Recording Purge Daemon
 * Executed via Linux Crontab every 15 minutes to guarantee storage headroom
 */

declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';
use NetVision\\Config\\Database;

$pdo = Database::getConnection();
$retentionDays = 30;
$cutoffDate = date('Y-m-d H:i:s', strtotime("-{$retentionDays} days"));

echo "[NetVision Retention Daemon] Running purge for recordings older than {$cutoffDate}..." . PHP_EOL;

// 1. Fetch expired files
$stmt = $pdo->prepare('SELECT id, file_path, file_size_mb FROM tbl_recordings WHERE end_time < :cutoff AND type != "alarm"');
$stmt->execute(['cutoff' => $cutoffDate]);
$expired = $stmt->fetchAll();

$freedMegabytes = 0;
foreach ($expired as $rec) {
    if (file_exists($rec['file_path'])) {
        unlink($rec['file_path']);
    }
    $freedMegabytes += (int)$rec['file_size_mb'];
}

// 2. Remove DB records
$deleteStmt = $pdo->prepare('DELETE FROM tbl_recordings WHERE end_time < :cutoff AND type != "alarm"');
$deleteStmt->execute(['cutoff' => $cutoffDate]);
$rowsPurged = $deleteStmt->rowCount();

$freedGigabytes = round($freedMegabytes / 1024, 2);
echo "[NetVision Retention Daemon] Completed: Purged {$rowsPurged} clips, reclaimed {$freedGigabytes} GB." . PHP_EOL;
`
      }
    };
  }
}
