// Public holidays for Turkey, Russia, Ukraine
// Format: { date: 'MM-DD', title, country: 'TR'|'RU'|'UA' }

const HOLIDAYS = [
  // TURKEY (TR)
  { date: '01-01', title: 'New Year\'s Day', country: 'TR' },
  { date: '04-23', title: 'National Sovereignty & Children\'s Day', country: 'TR' },
  { date: '05-01', title: 'Labour Day', country: 'TR' },
  { date: '05-19', title: 'Commemoration of Ataturk, Youth & Sports Day', country: 'TR' },
  { date: '07-15', title: 'Democracy & National Unity Day', country: 'TR' },
  { date: '08-30', title: 'Victory Day', country: 'TR' },
  { date: '10-29', title: 'Republic Day', country: 'TR' },
  // Ramadan Bayram 2025
  { date: '03-30', title: 'Ramazan Bayrami (1st Day)', country: 'TR', year: 2025 },
  { date: '03-31', title: 'Ramazan Bayrami (2nd Day)', country: 'TR', year: 2025 },
  { date: '04-01', title: 'Ramazan Bayrami (3rd Day)', country: 'TR', year: 2025 },
  // Kurban Bayram 2025
  { date: '06-06', title: 'Kurban Bayrami (1st Day)', country: 'TR', year: 2025 },
  { date: '06-07', title: 'Kurban Bayrami (2nd Day)', country: 'TR', year: 2025 },
  { date: '06-08', title: 'Kurban Bayrami (3rd Day)', country: 'TR', year: 2025 },
  { date: '06-09', title: 'Kurban Bayrami (4th Day)', country: 'TR', year: 2025 },
  // Ramadan Bayram 2026
  { date: '03-20', title: 'Ramazan Bayrami (1st Day)', country: 'TR', year: 2026 },
  { date: '03-21', title: 'Ramazan Bayrami (2nd Day)', country: 'TR', year: 2026 },
  { date: '03-22', title: 'Ramazan Bayrami (3rd Day)', country: 'TR', year: 2026 },
  // Kurban Bayram 2026
  { date: '05-27', title: 'Kurban Bayrami (1st Day)', country: 'TR', year: 2026 },
  { date: '05-28', title: 'Kurban Bayrami (2nd Day)', country: 'TR', year: 2026 },
  { date: '05-29', title: 'Kurban Bayrami (3rd Day)', country: 'TR', year: 2026 },
  { date: '05-30', title: 'Kurban Bayrami (4th Day)', country: 'TR', year: 2026 },

  // RUSSIA (RU)
  { date: '01-01', title: 'New Year\'s Holiday', country: 'RU' },
  { date: '01-02', title: 'New Year\'s Holiday', country: 'RU' },
  { date: '01-03', title: 'New Year\'s Holiday', country: 'RU' },
  { date: '01-04', title: 'New Year\'s Holiday', country: 'RU' },
  { date: '01-05', title: 'New Year\'s Holiday', country: 'RU' },
  { date: '01-06', title: 'New Year\'s Holiday', country: 'RU' },
  { date: '01-07', title: 'Orthodox Christmas', country: 'RU' },
  { date: '01-08', title: 'New Year\'s Holiday', country: 'RU' },
  { date: '02-23', title: 'Defender of the Fatherland Day', country: 'RU' },
  { date: '03-08', title: 'International Women\'s Day', country: 'RU' },
  { date: '05-01', title: 'Spring and Labour Day', country: 'RU' },
  { date: '05-09', title: 'Victory Day', country: 'RU' },
  { date: '06-12', title: 'Russia Day', country: 'RU' },
  { date: '11-04', title: 'Unity Day', country: 'RU' },

  // UKRAINE (UA)
  { date: '01-01', title: 'New Year\'s Day', country: 'UA' },
  { date: '01-07', title: 'Orthodox Christmas', country: 'UA' },
  { date: '03-08', title: 'International Women\'s Day', country: 'UA' },
  { date: '05-01', title: 'International Workers\' Day', country: 'UA' },
  { date: '05-09', title: 'Victory Day over Nazism', country: 'UA' },
  { date: '06-28', title: 'Constitution Day', country: 'UA' },
  { date: '08-24', title: 'Independence Day', country: 'UA' },
  { date: '10-14', title: 'Defenders Day', country: 'UA' },
  { date: '12-25', title: 'Christmas Day', country: 'UA' },
];

const COUNTRY_FLAGS = { TR: '🇹🇷', RU: '🇷🇺', UA: '🇺🇦' };
const COUNTRY_COLORS = { 
  TR: 'bg-red-50 text-red-700 border-red-200', 
  RU: 'bg-blue-50 text-blue-700 border-blue-200', 
  UA: 'bg-yellow-50 text-yellow-700 border-yellow-200' 
};

export function getHolidaysForMonth(year, month) {
  const mm = String(month + 1).padStart(2, '0');
  return HOLIDAYS
    .filter(h => {
      const [hm] = h.date.split('-');
      return hm === mm && (!h.year || h.year === year);
    })
    .map(h => ({
      ...h,
      fullDate: `${year}-${h.date}`,
      flag: COUNTRY_FLAGS[h.country],
      colorClass: COUNTRY_COLORS[h.country],
      isHoliday: true,
    }));
}

export function getHolidaysForDate(year, month, day) {
  const mm = String(month + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  const dateStr = `${mm}-${dd}`;
  return HOLIDAYS
    .filter(h => h.date === dateStr && (!h.year || h.year === year))
    .map(h => ({
      ...h,
      flag: COUNTRY_FLAGS[h.country],
      colorClass: COUNTRY_COLORS[h.country],
      isHoliday: true,
    }));
}

export { COUNTRY_FLAGS, COUNTRY_COLORS };
