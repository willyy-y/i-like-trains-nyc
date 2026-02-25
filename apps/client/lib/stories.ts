export interface StoryPreset {
  id: string;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  startTimeSec: number; // seconds since midnight to start
  speed: number; // speedup
}

export const STORY_PRESETS: StoryPreset[] = [
  {
    id: "normal-tuesday",
    title: "Normal Tuesday",
    description: "The baseline rhythm — watch the city's daily heartbeat.",
    date: "2024-03-12",
    startTimeSec: 5 * 3600, // 5 AM
    speed: 3600, // 1hr/s
  },
  {
    id: "saturday",
    title: "Saturday Vibes",
    description: "Slower mornings, busier nights — the weekend tempo.",
    date: "2024-03-16",
    startTimeSec: 8 * 3600, // 8 AM
    speed: 3600,
  },
  {
    id: "nye-2023",
    title: "New Year's Eve 2023",
    description: "Late night service spike after midnight — the ball drops.",
    date: "2023-12-31",
    startTimeSec: 18 * 3600, // 6 PM
    speed: 3600,
  },
];
