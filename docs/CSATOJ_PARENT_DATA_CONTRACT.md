# Dữ liệu CSATOJ cho trang phụ huynh

## Phạm vi giao diện đã chốt

Chủ trung tâm chọn bản gọn, Việt hóa và có giải thích phụ. Tổng quan chỉ giữ **Bài đã làm thử**, **Bài giải đúng**, **Lượt nộp**; tiếp theo là lịch lượt nộp, kết quả/xếp hạng theo buổi và lịch sử cuộc thi. Điểm rating và hạng rating nằm trong **Chi tiết thi đấu**. Không hiển thị hạng performance, số cuộc thi mới đăng ký hoặc tổ chức ở hàng chỉ số chính; tổ chức vẫn xem được trong chi tiết khi cần đối chiếu. Không xóa trường API cũ chỉ vì UI ẩn chúng.

Tiêu đề dùng cobalt `#2b50e0`, lime `#d9e64c`, mint hiện có, viền rõ và bóng cứng; giữ Archivo. Màu phân cấp nội dung, không thay trạng thái công bố/quyền hoặc suy ra mức thành thạo. Số lượt nộp phản ánh hoạt động; tiến bộ cần đọc cùng bài giải đúng, kết quả từng cuộc thi và nhận xét gia sư.

## Trạng thái bàn giao

Portal đã có renderer/validation và adapter tương thích phần mở rộng `activity` bên dưới. **OJ chưa có trường này trong mã/tài liệu đã đối chiếu; chưa nghiệm thu hai phía.** Không gọi endpoint heatmap chưa tồn tại, không scrape HTML hồ sơ. Dùng `GET accounts/<profile_id>/` hiện có; giữ `connections/exchange/`, receipt, grant revision và các endpoint accounts hiện hành.

Nguồn tham chiếu đã đọc trong repo OJ: `templates/user/user-about.html`, `resources/user_profile.js`, `resources/users.scss`, `judge/views/user.py` (`UserAboutPage`), `judge/csat_portal/accounts.py`, cùng `PORTAL_HANDOFF.md` → `PORTAL_CONNECTION_API.md` → `PORTAL_ACCOUNT_API.md`. Biểu đồ hồ sơ cũ đếm `Count(id)` lượt nộp theo ngày; không đếm AC. Không chép nguyên truy vấn hồ sơ sang API vì phải giữ giới hạn quyền/freeze của grants/accounts.

## Các nhóm dữ liệu OJ cần cung cấp

| Nhóm | API/trường | Cách dùng và ý nghĩa |
|---|---|---|
| Liên kết | exchange/receipt; instance, profile ID, grant ID/revision, username | ID là khóa ổn định; username chỉ hiển thị; retry cùng UUID |
| Tổng quan | `account`, `learning.learning_total` | `attempted_count`: bài khác nhau đã nộp, gồm bài đúng; `solved_count`: bài AC chấm hoàn tất, khử trùng; `submission_count`: lượt nộp |
| Phạm vi | `learning.scope`, từng `status`, `last_submission_at`, `as_of` | Phân biệt số liệu đầy đủ/giới hạn/chưa có; không đổi null thành0 |
| Lịch hoạt động **mới** | `activity` trên summary | Số lượt nộp từng ngày, giờ Việt Nam; đặc tả bên dưới |
| Cuộc thi | `accounts/<id>/contests/`, cursor, mode/state/status | Tên, thời gian, điểm, bài làm, số bài, hạng và mẫu số đúng lượt LIVE; thi thử tách riêng |
| Kết quả lớp/buổi | `accounts/<id>/class-results/` | Portal cung cấp contest IDs và roster/grant lịch sử; OJ trả totals khử trùng, hạng lớp/toàn cuộc thi, `roster_complete`, `class_rank_basis` |
| Điểm thi đấu | `site.rating`, `site.rating_rank`, `site.rank_status` | Rating là điểm; rating_rank là vị trí so điểm rating trên OJ, khác hạng trong một cuộc thi |
| Đối chiếu | organizations; số cuộc thi chính thức/lượt thi thử | Dữ liệu phụ, tải theo thao tác; không chiếm hàng tổng quan |

Không cần OJ xuất số điện thoại, Gmail phụ huynh, học phí/điểm danh Portal, hay danh tính/điểm của các bạn khác. Không yêu cầu một “hạng trong lớp tổng hợp” chưa có định nghĩa. Không cộng/đánh trung bình hạng hoặc điểm của nhiều cuộc thi khác thang điểm. Hạng lớp dùng người thi chính thức trong roster, không phải sĩ số toàn lớp; roster thiếu thì hạng lớp null, hạng toàn cuộc thi vẫn giữ nếu được phép.

## Phần mở rộng summary: `data.activity`

Thêm trường nullable, giữ envelope `api_version`, `instance_id`, `as_of`, `data` hiện có. Không đổi phiên bản API hoặc chữ ký exchange. Read key/instance và `X-CSAT-Grant-Revision` vẫn bắt buộc. Ví dụ **chỉ phần bổ sung, dữ liệu giả**:

```json
{
  "activity": {
    "metric": "submission_count",
    "timezone": "Asia/Ho_Chi_Minh",
    "start_date": "2024-02-28",
    "end_date": "2024-03-01",
    "status": "available",
    "available_years": [2024],
    "days": [
      {"date": "2024-02-28", "submission_count": 5},
      {"date": "2024-02-29", "submission_count": 0},
      {"date": "2024-03-01", "submission_count": 2}
    ],
    "total_submissions": 7,
    "active_days": 2
  }
}
```

Quy tắc bắt buộc:

- `metric` cố định `submission_count`. Mỗi submission ID tính một lần, bất kể đúng/sai hoặc được chấm lại; không đếm lại các test case/judge result, không thay bằng số bài AC. Cùng một bài nộp5 lần là5 lượt nhưng chỉ1 bài đã làm thử.
- Gom ngày theo IANA `Asia/Ho_Chi_Minh` tại OJ. Không dùng timezone trình duyệt hoặc cắt ngày UTC; lượt23:59:59 và00:00:00 Việt Nam thuộc hai ngày khác nhau.
- `start_date`/`end_date` là ngày địa phương **bao gồm hai đầu**. Khi có dữ liệu, `days` tăng dần, đủ mỗi ngày trong khoảng, không trùng hoặc bỏ ngày; tối đa366 ngày, gồm29/2 khi có.
- `available_years`: các năm có thể chọn, không trùng; metadata phải nằm trong quyền được phép tiết lộ, không suy từ hoạt động ẩn để lộ thêm lịch sử. Portal hỗ trợ2000 đến năm hiện tại.
- Ngày đã biết không nộp trả0. Ngày không thể xác nhận trảnull và `limited`; không suy ô trống thành0. Không đánh dấu riêng ngày có submission bí mật bằngnull nếu điều đó tiết lộ sự tồn tại/ngày của nội dung đang ẩn.
- Nếu mọi ngày có số, `total_submissions` bằng tổng các ngày, `active_days` bằng số ngày có count>0. Có ngàynull thì cả hai tổng lànull. `available` không có ngàynull. `limited` phải có giải thích phạm vi ở tài liệu OJ và không được thể hiện là toàn bộ lịch sử.
- `unavailable`: vẫn có khoảng ngày/timezone/years hợp lệ, `days=[]`, hai tổngnull. API cũ thiếu `activity` hoặc trảnull: Portal báo CSATOJ chưa cung cấp dữ liệu theo ngày, không vẽ lịch giả. Tài khoản mới thật sự không nộp: trả `available` với đủ ngày0 và tổng0.
- Phạm vi đếm theo dữ liệu tài khoản được phép xuất, cùng giới hạn truy cập/ẩn/freeze như `learning.learning_total`. Không copy `self.object.submission_set` không lọc quyền từ trang hồ sơ công khai. Thu hồi grant/revision sai phải chặn cả summary/activity; không fallback sang hồ sơ công khai.

## Khoảng thời gian và chuyển năm

1. Summary **không bộ lọc**: các số tổng quan vẫn tích lũy theo contract cũ; riêng `activity` là12 tháng gần nhất, đến ngày hiện tại Việt Nam (365 hoặc366 ngày). Metadata của OJ là nguồn quyết định nhãn ngày, không dùng đồng hồ trình duyệt.
2. Portal gọi API riêng của mình `kind=activity&year=2024`, kiểm quyền, rồi gọi **summary hiện có** với `from=2024-01-01T00:00:00+07:00`, `until=2025-01-01T00:00:00+07:00` (URL-encode dấu+). Không thêm route upstream giả định. Năm hiện tại chỉ xuất ngày đến hôm nay; năm trước đủ01/01–31/12. Chỉ nhận năm2000 đến hiện tại.
3. Portal chỉ cập nhật lịch khi đổi năm, không thay ba chỉ số tích lũy. Adapter trả lại account/activity/as_of sau kiểm quyền trước/sau fetch. OJ chưa bổ sung trường thì trả activitynull, không coi là tài khoản chưa nộp.
4. Các bộ lọc summary cũ tiếp tục tác dụng theo contract hiện có. Nếu caller khác yêu cầu khoảng trên366 ngày, giữ tương thích thống kê cũ; có thể trả `activity` unavailable thay vì dựng payload không giới hạn. Portal này chỉ yêu cầu khoảng tối đa366 ngày.

Không polling; chỉ tải khi mở phần và khi làm mới/chọn năm. HTTPS/server-only, no-store, không redirect, timeout8 giây, quota read key chung và Retry-After hiện hành. Khi mạng lỗi giữ lịch cũ với nhãn khoảng ngày cũ; thu hồi quyền thì xóa cả lịch, tổng quan và bảng hạng. Không log phone/key/mã liên kết.

## Nhãn phụ huynh và dữ liệu không có

- **Điểm thi đấu (rating):** “Chỉ số được cập nhật qua các cuộc thi có tính rating; đây là điểm, không phải thứ hạng.” Null: **Chưa có điểm thi đấu**.
- **Xếp hạng theo điểm thi đấu:** “Vị trí trên CSATOJ khi so điểm rating với các tài khoản được xếp hạng. Số hạng nhỏ hơn nghĩa là vị trí cao hơn.” Unlisted: **Không tham gia bảng xếp hạng**; null khác: **Chưa được xếp hạng**.
- `performance_rank` là hạng theo performance_points trong mã OJ, không phải rating hoặc hạng lớp. Bỏ khỏi giao diện phụ huynh, giữ tương thích API.
- Cuộc thi frozen dùng điểm/hạng tạm thời OJ cho phép; số bài chưa công bố ghi **Chưa công bố**. Withheld không tự dựng số. Thi thử không gán hạng LIVE. Không lấy số0 thay null.

## Cổng nghiệm thu hai phía

OJ cần triển khai và kiểm `activity` trước khi có heatmap dữ liệu thật. Portal đã chuẩn bị kiểm: dữ liệu cũ không có field; năm nhuận; ngày liên tiếp/trùng/thiếu; tổng lệch; sai metric/timezone;0 khácnull; year sai/ngoài phạm vi; quyền đổi giữa fetch; đổi năm không thay tổng quan; lỗi mạng giữ lịch cũ; thu hồi xóa lịch; lịch dùng phím mũi tên và có bảng số liệu thay thế;320–1440px, sáng/tối/reduced motion.

Phía OJ bổ sung kiểm DB thật: hai lượt cùng bài được tính2; rejudge không tăng count; qua nửa đêm Việt Nam; private/frozen/withheld và thu hồi không lộ count/ngày; year range/29-2/tài khoản không submission; query aggregation không N+1, quota/cache/no-store. Sau đó pilot cùng một học sinh và cùng khoảng ngày ở OJ/Portal để đối chiếu tổng, từng ngày, bài đã thử/AC và hạng lớp/toàn cuộc thi. Test local của Portal không thay bằng chứng này.
