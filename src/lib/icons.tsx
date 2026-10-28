import {
  Atom,
  Camera,
  Cpu,
  Droplets,
  FlaskConical,
  Gauge,
  Leaf,
  Lightbulb,
  MapPin,
  Move,
  PlugZap,
  RefreshCw,
  ScanEye,
  Sprout,
  Sun,
  Thermometer,
  ToggleRight,
  Waves,
  Wind,
  Zap,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";

/*
 * Ikon per tipe alat/sensor/aktuator. Tipe berasal dari katalog hardware backend dan boleh berubah,
 * jadi setiap peta punya ikon cadangan untuk tipe yang belum dikenal. Dibungkus sebagai komponen
 * (bukan fungsi yang mengembalikan komponen) agar ikon tidak dibuat ulang setiap render.
 */

type TypeIconProps = Omit<LucideProps, "type"> & { kind: string | null | undefined };

const actuatorIcons: Record<string, LucideIcon> = {
  DISTRIBUTION_PUMP: Waves,
  DOSING_PUMP: FlaskConical,
  STIRRER: RefreshCw,
  SENSOR_POWER: PlugZap,
  CAMERA_PAN: Camera,
  SAMPLING_PUMP: Droplets,
  FILL_VALVE: Droplets,
  ILLUMINATION: Lightbulb,
  TROLLEY_MOTOR: Move,
  TROLLEY_DIRECTION: Move,
  TROLLEY_PATROL: ScanEye,
  TROLLEY_POSITION: MapPin,
};

export function ActuatorIcon({ kind, ...props }: TypeIconProps) {
  const Icon = actuatorIcons[kind ?? ""] ?? ToggleRight;
  return <Icon {...props} />;
}

const deviceIcons: Record<string, LucideIcon> = {
  EDGE_GATEWAY: Cpu,
  POWER_METER: PlugZap,
  MODBUS_IO: ToggleRight,
  MODBUS_SENSOR_GROUP: Gauge,
};

export function DeviceIcon({ kind, ...props }: TypeIconProps) {
  const Icon = deviceIcons[kind ?? ""] ?? Cpu;
  return <Icon {...props} />;
}

const sensorIcons: Record<string, LucideIcon> = {
  SOIL_MOISTURE: Droplets,
  SOIL_TEMPERATURE: Thermometer,
  SOIL_EC: Zap,
  SOIL_PH: FlaskConical,
  SOIL_NITROGEN: Leaf,
  SOIL_PHOSPHORUS: Sprout,
  SOIL_POTASSIUM: Atom,
  AIR_TEMPERATURE: Thermometer,
  AIR_HUMIDITY: Wind,
  ILLUMINANCE: Sun,
  SOLUTION_EC: Zap,
  SOLUTION_PH: FlaskConical,
  SOLUTION_TEMPERATURE: Thermometer,
  LEVEL_SWITCH: Waves,
  LIMIT_SWITCH: ToggleRight,
  TEMPERATURE: Thermometer,
  VOLTAGE: PlugZap,
  CURRENT: PlugZap,
  POWER: PlugZap,
  ENERGY: PlugZap,
  POSITION: Camera,
};

export function SensorIcon({ kind, ...props }: TypeIconProps) {
  const Icon = sensorIcons[kind ?? ""] ?? Gauge;
  return <Icon {...props} />;
}
