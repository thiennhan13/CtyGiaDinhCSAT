'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, FileSpreadsheet, ChevronDown, ChevronRight, BookOpen } from 'lucide-react';
import { formatVND } from '@/lib/utils';
import * as XLSX from 'xlsx';

interface TutorSalaryTableProps {
  stats: any;
  viewMode: 'preview' | 'historical';
  loading: boolean;
  selectedHistoricalPeriod: string;
  ITEMS_PER_PAGE: number;
}

export function TutorSalaryTable({
  stats,
  viewMode,
  loading,
  selectedHistoricalPeriod,
  ITEMS_PER_PAGE,
}: TutorSalaryTableProps) {
  const [salaryPage, setSalaryPage] = useState(1);
  const [expandedTutors, setExpandedTutors] = useState<Record<string, boolean>>({});
  const [expandedClasses, setExpandedClasses] = useState<Record<string, boolean>>({});

  const toggleTutor = (id: string) => setExpandedTutors(p => ({ ...p, [id]: !p[id] }));
  const toggleClass = (id: string) => setExpandedClasses(p => ({ ...p, [id]: !p[id] }));

  const exportTutorSalaries = async () => {
    try {
      const detail = stats?.tutorSalaryDetail ?? stats?.tutorSalaries;
      if (!detail?.length) {
        alert('Không có dữ liệu lương gia sư để xuất!');
        return;
      }

      const wb = XLSX.utils.book_new();
      const period = selectedHistoricalPeriod || 'preview';
      const safePeriod = String(period).replace(/[\[\]*?/\\:|<>"]/g, '_');

      const summaryRows = detail.map((t: any) => ({
        'Tên Gia Sư': t.name || '---',
        'Số Buổi': t.classes ? t.classes.reduce((s: number, c: any) => s + (c.session_count || 0), 0) : '---',
        'Học Phí Thu Vào (₫)': t.tuition_collected || 0,
        'Battle Pass CSAT (₫)': t.csat_deducted || 0,
        'Thực Nhận (₫)': t.salary || 0,
      }));
      const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
      XLSX.utils.book_append_sheet(wb, wsSummary, 'TỔNG HỢP CHUNG');

      detail.forEach((tutor: any) => {
        const rawName = (tutor.name || 'Gia Su').replace(/[\[\]*?/\\:]/g, '').trim();
        let sheetName = rawName.slice(0, 30) || 'Gia Su';
        let count = 1;
        while (wb.SheetNames.includes(sheetName)) {
          const suffix = ` (${count++})`;
          sheetName = rawName.slice(0, 30 - suffix.length) + suffix;
        }

        const aoa: any[][] = [];
        aoa.push([`GIA SƯ: ${tutor.name || ''}`]);
        aoa.push([`Kỳ lương: ${period}`]);
        aoa.push([`Tổng thực nhận: ${formatVND(tutor.salary || 0)}`]);
        aoa.push([]);

        const classes = tutor.classes ?? [];
        if (classes.length === 0) {
          aoa.push(['Không có dữ liệu chi tiết buổi dạy.']);
        } else {
          classes.forEach((cls: any) => {
            const clsTuition = cls.tuition || 0;
            const clsCsat = cls.csat || 0;
            aoa.push([
              `--- LỚP: ${cls.class_name || ''}`,
              `${cls.session_count || 0} buổi`,
              '',
              '',
              `Thực nhận lớp: ${formatVND(clsTuition - clsCsat)}`,
            ]);
            aoa.push(['Ngày Dạy', 'Số HS Có Mặt', 'Học Phí Thu (₫)', 'Battle Pass CSAT (₫)', 'Thực Nhận Buổi (₫)']);
            const sortedSessions = (cls.sessions || []).slice().sort((a: any, b: any) => (a.date || '').localeCompare(b.date || ''));
            sortedSessions.forEach((sess: any) => {
              aoa.push([
                sess.date || '',
                sess.attended_count || 0,
                sess.tuition || 0,
                sess.csat || 0,
                sess.net || 0,
              ]);
            });
            aoa.push(['TỔNG LỚP', cls.session_count || 0, clsTuition, clsCsat, clsTuition - clsCsat]);
            aoa.push([]);
          });
        }
        aoa.push([]);
        aoa.push([`TỔNG KỲ ${period}`, '', tutor.tuition_collected || 0, tutor.csat_deducted || 0, tutor.salary || 0]);

        const ws = XLSX.utils.aoa_to_sheet(aoa);
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      });

      XLSX.writeFile(wb, `luong_gia_su_${safePeriod}.xlsx`);
    } catch (err: any) {
      alert('Lỗi khi xuất file Excel Lương Gia Sư: ' + (err.message || String(err)));
    }
  };

  const dataList = stats?.tutorSalaryDetail ?? stats?.tutorSalaries ?? [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-amber-500" />
            Phần 2: Lương Gia Sư
          </CardTitle>
          <CardDescription>
            {viewMode === 'preview' ? 'Dự kiến — bấm ▶ để xem chi tiết từng lớp và từng buổi' : 'Chi phí trả gia sư sau khi trừ Battle Pass CSAT'}
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={exportTutorSalaries} className="ml-4 gap-2 border-border text-foreground">
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Xuất Excel
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? <p className="text-muted-foreground/70 text-sm">Đang tải...</p> : (
          <>
            {dataList.length === 0 ? (
              <p className="text-center py-6 text-muted-foreground/70 text-sm">Không có dữ liệu buổi dạy</p>
            ) : (
              <div className="space-y-2">
                {dataList
                  .slice((salaryPage - 1) * ITEMS_PER_PAGE, salaryPage * ITEMS_PER_PAGE)
                  .map((tutor: any) => {
                    const isExpanded = !!expandedTutors[tutor.tutor_id];
                    const hasDetail  = !!tutor.classes?.length;
                    return (
                      <div key={tutor.tutor_id} className="border border-border rounded-lg overflow-hidden">
                        <div
                          className={`flex items-center gap-3 px-4 py-3 ${hasDetail ? 'cursor-pointer hover:bg-secondary/50' : ''} bg-card`}
                          onClick={() => hasDetail && toggleTutor(tutor.tutor_id)}
                        >
                          {hasDetail ? (
                            isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground/70 shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground/70 shrink-0" />
                          ) : <span className="w-4" />}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-foreground truncate">{tutor.name || 'Chưa rõ'}</span>
                              <span className="text-xs text-muted-foreground/70">ID: {tutor.tutor_id ? tutor.tutor_id.slice(0, 8) : '---'}</span>
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {tutor.classes ? tutor.classes.reduce((acc: number, c: any) => acc + (c.session_count || 0), 0) : 0} buổi · {tutor.classes?.length || 0} lớp
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-amber-600">{formatVND(tutor.salary)}</div>
                            <div className="text-xs text-muted-foreground/70">Net nhận</div>
                          </div>
                        </div>

                        {isExpanded && hasDetail && (
                          <div className="bg-secondary/50 border-t border-border divide-y divide-slate-100 px-4 py-2">
                            {tutor.classes.map((cls: any) => {
                              const clsKey = `${tutor.tutor_id}_${cls.class_id}`;
                              const isClsExpanded = !!expandedClasses[clsKey];
                              const hasSessions   = !!cls.sessions?.length;
                              return (
                                <div key={cls.class_id} className="py-2">
                                  <div
                                    className={`flex items-center justify-between text-sm ${hasSessions ? 'cursor-pointer hover:text-primary' : ''}`}
                                    onClick={() => hasSessions && toggleClass(clsKey)}
                                  >
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      {hasSessions ? (
                                        isClsExpanded ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0" />
                                      ) : <span className="w-3.5" />}
                                      <BookOpen className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0" />
                                      <span className="font-medium text-foreground truncate">
                                        {cls.class_name || `Lớp #${cls.class_id}`}
                                      </span>
                                      <span className="text-xs text-muted-foreground/70 shrink-0">({cls.session_count} buổi)</span>
                                    </div>
                                    <div className="text-right shrink-0 ml-2">
                                      <span className="font-semibold text-foreground">{formatVND((cls.tuition || 0) - (cls.csat || 0))}</span>
                                    </div>
                                  </div>

                                  {isClsExpanded && hasSessions && (
                                    <div className="mt-1.5 ml-6 space-y-1 text-xs bg-card rounded border border-border p-2">
                                      <div className="grid grid-cols-12 text-muted-foreground/70 font-medium pb-1 border-b border-border/60">
                                        <div className="col-span-3">Ngày học</div>
                                        <div className="col-span-3 text-right">HP thu</div>
                                        <div className="col-span-3 text-right">Battle Pass CSAT</div>
                                        <div className="col-span-3 text-right font-semibold">GS nhận</div>
                                      </div>
                                      {cls.sessions.slice().sort((a: any, b: any) => (a.date || '').localeCompare(b.date || '')).map((sess: any, idx: number) => (
                                        <div key={idx} className="grid grid-cols-12 py-0.5 text-muted-foreground">
                                          <div className="col-span-3">{sess.date}</div>
                                          <div className="col-span-3 text-right">{formatVND(sess.tuition)}</div>
                                          <div className="col-span-3 text-right text-emerald-600">{sess.csat > 0 ? `-${formatVND(sess.csat)}` : '0 ₫'}</div>
                                          <div className="col-span-3 text-right font-semibold text-amber-600">{formatVND(sess.net)}</div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}

                {dataList.length > ITEMS_PER_PAGE && (
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-sm text-muted-foreground">Trang {salaryPage} / {Math.ceil(dataList.length / ITEMS_PER_PAGE)}</span>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" disabled={salaryPage === 1} onClick={() => setSalaryPage(p => Math.max(1, p - 1))}>Trước</Button>
                      <Button variant="outline" size="sm" disabled={salaryPage >= Math.ceil(dataList.length / ITEMS_PER_PAGE)} onClick={() => setSalaryPage(p => p + 1)}>Sau</Button>
                    </div>
                  </div>
                )}

                <div className="hidden sm:flex text-xs text-muted-foreground/70 px-4 pt-2 gap-3">
                  <span className="flex-1"></span>
                  <span className="w-36 text-right">Học phí thu</span>
                  <span className="w-36 text-right">Battle Pass CSAT</span>
                  <span className="w-40 text-right font-semibold">Thực nhận</span>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
