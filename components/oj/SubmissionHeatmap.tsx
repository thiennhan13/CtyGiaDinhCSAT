'use client';
import { useRef, useState } from 'react';
import type { OJActivity } from '@/lib/oj-grants';
import styles from './parent-oj.module.css';

const dateLabel = (date: string) => new Intl.DateTimeFormat('vi-VN', { day: 'numeric', month: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(date + 'T00:00:00Z'));
const countLabel = (count: number | null) => count === null ? 'Chưa có dữ liệu' : new Intl.NumberFormat('vi-VN').format(count);
const level = (count: number | null) => count === null ? 'unknown' : count === 0 ? '0' : count < 5 ? '1' : count < 10 ? '2' : count < 20 ? '3' : '4';

export function SubmissionHeatmap({ activity, year, busy, onYearChange }: { activity: OJActivity | null; year: string; busy: boolean; onYearChange: (year: string) => void }) {
  const grid = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<number | null>(null);
  if (!activity) return <section className={styles.activity}><h3 className={styles.subheading}>Nhịp luyện tập của con</h3><p>CSATOJ chưa cung cấp dữ liệu lượt nộp theo ngày. Các số liệu tổng quan phía trên vẫn xem được.</p></section>;
  const { days } = activity;
  const current = Math.min(selected ?? Math.max(0, days.length - 1), Math.max(0, days.length - 1));
  const offset = (new Date(activity.start_date + 'T00:00:00Z').getUTCDay() + 6) % 7;
  const weeks = Math.ceil((days.length + offset) / 7);
  const months = days.flatMap((day, index) => index === 0 || day.date.endsWith('-01') ? [{ label: 'Th' + Number(day.date.slice(5, 7)), column: Math.floor((index + offset) / 7) }] : []).filter((month, index, all) => index !== 0 || !all[1] || all[1].column - month.column >= 3);
  const description = (index: number) => `${dateLabel(days[index].date)}: ${days[index].submission_count === null ? 'chưa có dữ liệu' : countLabel(days[index].submission_count) + ' lượt nộp'}${activity.status === 'limited' ? ' (dữ liệu chưa đầy đủ)' : ''}`;
  return <section className={styles.activity} aria-labelledby="submission-activity-title">
    <div className={styles.activityHeading}><div><h3 id="submission-activity-title" className={styles.subheading}>Nhịp luyện tập của con</h3><p>Mỗi ô là một ngày, màu đậm hơn nghĩa là có nhiều lượt nộp hơn.</p></div>
      <label>Thời gian<select aria-label="Thời gian hoạt động" value={year} disabled={busy} onChange={event => onYearChange(event.target.value)}><option value="">12 tháng gần nhất</option>{[...new Set([...activity.available_years, ...(year ? [Number(year)] : [])])].sort((a, b) => b - a).map(value => <option key={value} value={value}>{value}</option>)}</select></label>
    </div>
    <p className={styles.range}>{dateLabel(activity.start_date)} – {dateLabel(activity.end_date)} · Giờ Việt Nam</p>
    {activity.status === 'unavailable' ? <p>Chưa có dữ liệu hoạt động cho khoảng thời gian này.</p> : <>
      <dl className={styles.activityTotals}><div><dt>Lượt nộp trong khoảng này</dt><dd>{countLabel(activity.total_submissions)}</dd></div><div><dt>Ngày có nộp bài</dt><dd>{countLabel(activity.active_days)}</dd></div></dl>
      {activity.status === 'limited' && <p role="status">Dữ liệu chưa đầy đủ: một phần hoạt động chưa được phép công bố. Ô chưa có dữ liệu khác với ngày không nộp bài.</p>}
      <div className={styles.calendarLayout}><div className={styles.weekdays} aria-hidden="true">{['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(label => <span key={label}>{label}</span>)}</div>
        <div className={styles.calendarScroll}>
          <div className={styles.months} aria-hidden="true" style={{ width: weeks * 17 }}>{months.map((month, index) => <span key={index} style={{ left: month.column * 17 }}>{month.label}</span>)}</div>
          <div ref={grid} role="group" aria-label="Lịch lượt nộp bài theo ngày" aria-describedby="activity-keyboard-help" className={styles.calendar} style={{ gridTemplateColumns: `repeat(${weeks}, 14px)` }}>
            {Array.from({ length: offset }, (_, index) => <span key={'empty-' + index} aria-hidden="true" />)}
            {days.map((day, index) => <button key={day.date} type="button" className={styles.day} data-level={level(day.submission_count)} data-index={index} title={description(index)} aria-label={description(index)} tabIndex={index === current ? 0 : -1} onFocus={() => setSelected(index)} onClick={() => setSelected(index)} onKeyDown={event => {
              const shifts: Record<string, number> = { ArrowLeft: -7, ArrowRight: 7, ArrowUp: -1, ArrowDown: 1 };
              let next: number;
              if (event.key === 'Home') next = 0;
              else if (event.key === 'End') next = days.length - 1;
              else if (event.key in shifts) next = Math.max(0, Math.min(days.length - 1, index + shifts[event.key]));
              else return;
              event.preventDefault(); grid.current?.querySelector<HTMLButtonElement>(`[data-index="${next}"]`)?.focus();
            }} />)}
          </div>
        </div>
      </div>
      <p className={styles.selectedDay} aria-live="polite" aria-atomic="true">{days.length > 0 && description(current)}</p>
      <div className={styles.legend} aria-label="Chú giải lượt nộp mỗi ngày">{[['0', '0'], ['1', '1–4'], ['2', '5–9'], ['3', '10–19'], ['4', '20 trở lên']].map(([value, label]) => <span key={value}><i className={styles.day} data-level={value} aria-hidden="true" />{label}</span>)}<span>lượt/ngày</span></div>
      <p id="activity-keyboard-help" className={styles.hint}>Chọn ô để xem ngày và số lượt nộp. Dùng phím mũi tên khi thao tác bằng bàn phím; cuộn ngang để xem toàn bộ lịch.</p>
      <details className={styles.dailyTable}><summary>Xem bảng số liệu theo ngày</summary><div><table><caption>Lượt nộp theo ngày, giờ Việt Nam</caption><thead><tr><th>Ngày</th><th>Lượt nộp</th></tr></thead><tbody>{days.map(day => <tr key={day.date}><td>{dateLabel(day.date)}</td><td>{countLabel(day.submission_count)}</td></tr>)}</tbody></table></div></details>
    </>}
    <p className={styles.hint}>Đếm mọi lượt nộp được phép xem, không phải số bài giải đúng. Một bài có thể được nộp nhiều lần.</p>
  </section>;
}
