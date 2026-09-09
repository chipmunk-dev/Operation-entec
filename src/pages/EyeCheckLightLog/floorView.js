export const zoneRange = (floor) =>
  floor.targetCol && floor.zones.length
    ? `${floor.targetCol}${floor.zones[0].row}~${floor.targetCol}${floor.zones[floor.zones.length - 1].row}`
    : null;
