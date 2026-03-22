// lib/dateUtils.ts
export function getCurrentWeekDays(locale: string = 'en-US') {
  const today = new Date();
  const dayOfWeek = today.getDay(); // Sunday = 0, Monday = 1

  // Get the date of the most recent Monday
  const monday = new Date(today);
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  monday.setDate(today.getDate() - diff);

  const week = [];

  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);

    week.push({
      dayName: date.toLocaleDateString(locale, { weekday: 'long' }), // Monday, Tuesday...
      shortDate: date.toLocaleDateString(locale, { month: 'short', day: 'numeric' }), // Jul 9
      isToday: date.toDateString() === today.toDateString(),
      fullDate: date,
      events: [] // Will be filled later
    });
  }

  return week;
} 