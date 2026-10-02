import L from "leaflet";

/**
 * Cấu hình lớp nền DÙNG CHUNG cho mọi bản đồ Leaflet (xem quán, chọn vị trí, ghim giữa).
 *
 * - Vệ tinh (mặc định): Esri World Imagery + 2 lớp nhãn trong suốt của Esri (tên đường, địa danh)
 *   để nhận ra hẻm/ngõ mà vẫn đọc được tên đường.
 * - Đường phố: CARTO Voyager (dữ liệu OSM). KHÔNG dùng tile.openstreetmap.org trực tiếp — một số mạng
 *   (đã gặp ở máy dev: DNS nhà mạng trả NXDOMAIN cho openstreetmap.org) không phân giải được, bản đồ xám trơn.
 *   CARTO miễn phí ~75k lượt xem/tháng cho dự án phi thương mại.
 * Domain tile phải khớp `img-src` trong CSP (next.config.ts).
 */

export type BaseLayerId = "satellite" | "street";

const STORAGE_KEY = "nayangi:map-base-layer";
const ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services";
export const MAP_MAX_ZOOM = 19;

/** Lựa chọn lớp gần nhất của user; localStorage lỗi/không có → vệ tinh. */
export function readPreferredBaseLayer(): BaseLayerId {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "street" ? "street" : "satellite";
  } catch {
    return "satellite";
  }
}

function savePreferredBaseLayer(id: BaseLayerId) {
  try {
    window.localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // Trình duyệt chặn lưu trữ (chế độ riêng tư…) — lần sau về mặc định, không sao.
  }
}

function createSatelliteLayer(): L.LayerGroup {
  const esriTile = (service: string, attribution: string) =>
    L.tileLayer(`${ESRI}/${service}/MapServer/tile/{z}/{y}/{x}`, { maxZoom: MAP_MAX_ZOOM, attribution });
  return L.layerGroup([
    esriTile("World_Imagery", "Ảnh vệ tinh &copy; Esri — Maxar, Earthstar Geographics, GIS User Community"),
    esriTile("Reference/World_Transportation", "Nhãn &copy; Esri, HERE, Garmin"),
    esriTile("Reference/World_Boundaries_and_Places", ""),
  ]);
}

function createStreetLayer(): L.TileLayer {
  return L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
    subdomains: "abcd",
    maxZoom: MAP_MAX_ZOOM,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  });
}

/** Gắn lớp nền theo lựa chọn đã nhớ + nút chuyển Vệ tinh ↔ Đường phố; đổi lớp thì nhớ lại. */
export function addBaseLayers(map: L.Map, position: L.ControlPosition = "topright") {
  const layers: Record<BaseLayerId, L.Layer> = { satellite: createSatelliteLayer(), street: createStreetLayer() };
  layers[readPreferredBaseLayer()].addTo(map);
  L.control.layers({ "Vệ tinh": layers.satellite, "Đường phố": layers.street }, undefined, { position }).addTo(map);
  map.on("baselayerchange", (event: L.LayersControlEvent) => {
    savePreferredBaseLayer(event.layer === layers.street ? "street" : "satellite");
  });
  return layers;
}

/** Khung chứa map đổi kích thước (modal mở, tab hiện, xoay màn hình) → vẽ lại tile, tránh mảng xám. */
export function watchContainerSize(map: L.Map, container: HTMLElement): () => void {
  const observer = new ResizeObserver(() => map.invalidateSize());
  observer.observe(container);
  return () => observer.disconnect();
}
