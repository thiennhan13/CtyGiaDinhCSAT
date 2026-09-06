export interface CalendarRange { startDate: string; endDate: string; }

/** Business calendar month in Vietnam, independent of the host's timezone. */
export function getVietnamMonthRange(now: Date = new Date()): CalendarRange {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', calendar: 'gregory',
  }).formatToParts(now);
  const year = parts.find(part => part.type === 'year')!.value;
  const month = parts.find(part => part.type === 'month')!.value;
  const lastDay = new Date(Date.UTC(Number(year), Number(month), 0)).getUTCDate();
  return { startDate: `${year}-${month}-01`, endDate: `${year}-${month}-${lastDay}` };
}
