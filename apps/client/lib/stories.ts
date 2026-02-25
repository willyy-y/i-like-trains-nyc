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
    description: "The baseline rhythm — watch stations pulse with ridership.",
    date: "2024-03-12",
    startTimeSec: 5 * 3600, // 5 AM
    speed: 120, // 2min/s
  },
  {
    id: "saturday",
    title: "Saturday Vibes",
    description: "Slower mornings, busier nights — stations glow differently on weekends.",
    date: "2024-03-16",
    startTimeSec: 8 * 3600, // 8 AM
    speed: 120,
  },
  {
    id: "nye-2023",
    title: "New Year's Eve 2023",
    description: "Watch the midnight spike — stations light up as the ball drops.",
    date: "2023-12-31",
    startTimeSec: 18 * 3600, // 6 PM
    speed: 120,
  },
];
