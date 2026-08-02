'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, ChevronRight, Link as LinkIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createClient } from '@/lib/supabase/client';

interface AnnouncementsWidgetProps {
  initialAnnouncements: any[];
}

export function AnnouncementsWidget({ initialAnnouncements }: AnnouncementsWidgetProps) {
  const [announcements, setAnnouncements] = useState<any[]>(initialAnnouncements);
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({ title: '', content: '', link: '' });
  const [viewingAnnouncement, setViewingAnnouncement] = useState<any>(null);
  const supabase = createClient();

  const fetchAnnouncements = async () => {
    const { data } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    if (data) setAnnouncements(data);
  };

  const handleAddAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('announcements').insert([newAnnouncement]);
    if (!error) {
      setIsAnnouncementModalOpen(false);
      setNewAnnouncement({ title: '', content: '', link: '' });
      fetchAnnouncements();
    }
  };

  return (
    <>
      <div className="csat-card p-4 md:p-6 h-full flex flex-col">
        <div className="flex flex-row items-center justify-between pb-2 shrink-0">
          <h3 className="text-base font-semibold text-foreground">Thông báo</h3>
          <Button
            variant="default"
            size="sm"
            className="h-11 md:h-8 px-4 md:px-3 gap-1.5 md:gap-1 text-sm md:text-[11px]"
            onClick={() => setIsAnnouncementModalOpen(true)}
          >
            <Plus className="w-4 h-4 md:w-3 md:h-3" /> Tạo mới
          </Button>
        </div>
        <div className="pt-1 flex-1 overflow-y-auto">
          <div className="space-y-2">
            {announcements.length === 0 ? (
              <p className="text-xs text-muted-foreground italic text-center py-4">Chưa có thông báo nào</p>
            ) : (
              announcements.map((ann, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg border border-border hover:border-primary/30 hover:bg-accent/40 cursor-pointer transition-all duration-150 group"
                  onClick={() => setViewingAnnouncement(ann)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-semibold text-foreground text-xs md:text-sm group-hover:text-primary leading-snug transition-colors">
                      {ann.title}
                    </h4>
                    <ChevronRight className="w-3 h-3 text-muted-foreground group-hover:text-primary shrink-0 mt-0.5 transition-colors" />
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{ann.content}</p>
                  {ann.created_at && (
                    <p className="text-[10px] text-muted-foreground/70 mt-1">
                      {new Date(ann.created_at).toLocaleDateString('vi-VN', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                      })}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Dialog: Tạo thông báo ── */}
      <Dialog open={isAnnouncementModalOpen} onOpenChange={setIsAnnouncementModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tạo thông báo mới</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddAnnouncement} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tiêu đề</Label>
              <Input
                value={newAnnouncement.title}
                onChange={e => setNewAnnouncement(prev => ({ ...prev, title: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Nội dung</Label>
              <Textarea
                value={newAnnouncement.content}
                onChange={e => setNewAnnouncement(prev => ({ ...prev, content: e.target.value }))}
                rows={4}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Đường Link (Google Meet, Tài liệu...)</Label>
              <Input
                value={newAnnouncement.link}
                onChange={e => setNewAnnouncement(prev => ({ ...prev, link: e.target.value }))}
                placeholder="https://..."
              />
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsAnnouncementModalOpen(false)}>
                Hủy
              </Button>
              <Button type="submit">Gửi thông báo</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Chi tiết thông báo ── */}
      <Dialog open={!!viewingAnnouncement} onOpenChange={() => setViewingAnnouncement(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold leading-snug pr-4 text-foreground">
              {viewingAnnouncement?.title}
            </DialogTitle>
            {viewingAnnouncement?.created_at && (
              <p className="text-xs text-muted-foreground pt-1">
                Đăng lúc: {new Date(viewingAnnouncement.created_at).toLocaleDateString('vi-VN', {
                  day: '2-digit', month: '2-digit', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </p>
            )}
          </DialogHeader>
          <div className="max-h-[55vh] overflow-y-auto text-sm text-foreground whitespace-pre-wrap break-words leading-relaxed py-2">
            {viewingAnnouncement?.content || ''}
          </div>
          {viewingAnnouncement?.link && (
            <div className="pt-2 border-t border-border">
              <a
                href={viewingAnnouncement.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
              >
                <LinkIcon className="w-4 h-4" /> Xem tài liệu đính kèm
              </a>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingAnnouncement(null)}>Đóng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
