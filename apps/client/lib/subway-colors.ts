// Official MTA subway line colors
// Source: https://new.mta.info/map

export const SUBWAY_COLORS: Record<string, [number, number, number]> = {
  // IRT lines
  "1": [238, 53, 46],    // Red
  "2": [238, 53, 46],
  "3": [238, 53, 46],
  "4": [0, 147, 60],     // Green
  "5": [0, 147, 60],
  "6": [0, 147, 60],
  "6X": [0, 147, 60],
  "7": [185, 51, 173],   // Purple
  "7X": [185, 51, 173],

  // IND lines
  "A": [0, 57, 166],     // Blue
  "C": [0, 57, 166],
  "E": [0, 57, 166],
  "B": [255, 99, 25],    // Orange
  "D": [255, 99, 25],
  "F": [255, 99, 25],
  "FX": [255, 99, 25],
  "M": [255, 99, 25],
  "G": [108, 190, 69],   // Lime green
  "J": [153, 102, 51],   // Brown
  "Z": [153, 102, 51],

  // BMT lines
  "L": [167, 169, 172],  // Gray
  "N": [252, 204, 10],   // Yellow
  "Q": [252, 204, 10],
  "R": [252, 204, 10],
  "W": [252, 204, 10],
  "S": [128, 129, 131],  // Shuttle gray
  "SI": [0, 57, 166],    // Staten Island Railway - blue
  "SIR": [0, 57, 166],
  "FS": [128, 129, 131], // Franklin Shuttle
  "GS": [128, 129, 131], // 42nd St Shuttle
  "H": [128, 129, 131],  // Rockaway Shuttle
};

export function getSubwayColor(route: string): [number, number, number] {
  return SUBWAY_COLORS[route.toUpperCase()] || [200, 200, 200];
}

// Get dominant line color for a station (first line in the list)
export function getStationColor(lines: string[]): [number, number, number] {
  if (lines.length === 0) return [200, 200, 200];
  return getSubwayColor(lines[0]);
}
