# Phiên bản và gói phát hành CSAT Portal

Repository chính thức: [thiennhan13/CtyGiaDinhCSAT](https://github.com/thiennhan13/CtyGiaDinhCSAT). Website: [portal.csatoj.vn](https://portal.csatoj.vn/). Mã nguồn công khai, quyền sử dụng nội bộ theo [LICENSE](../LICENSE.md). `private:true` trong package.json ngăn phát hành nhầm lên npm; không điều khiển visibility GitHub.

## Quy ước

- Phiên bản `X.Y.Z` trong package.json và package-lock.json khớp tag `vX.Y.Z`. Không sửa hoặc di chuyển tag đã phát hành.
- GitHub Releases là nơi tải gói chuẩn và đọc ghi chú phiên bản. Không publish npm hoặc tạo container registry khi ứng dụng chưa cần.
- Bản phát hành mã nguồn và deployment Vercel là hai trạng thái riêng. Tích hợp OJ/Google/Storage và schema thực vẫn cần nghiệm thu theo [PROJECT_STATUS](PROJECT_STATUS.md).
- Tăng major khi thay đổi contract gây mất tương thích; minor cho chức năng tương thích; patch cho sửa lỗi. Không dùng tên phiên bản để suy registry migration.

## Đóng gói

Từ commit đã review, chạy Node.js24:

```sh
npm run release:package -- HEAD
# Sau khi có tag:
npm run release:package -- v2.1.0
```

Công cụ chỉ đọc cây Git của commit đã chọn, kiểm phiên bản/giấy phép/đường dẫn/secret và tạo trong `dist/releases/vX.Y.Z/`:

| Tệp | Nội dung |
|---|---|
| `csat-portal-vX.Y.Z-source.tar.gz` | Toàn bộ cây mã nguồn được theo dõi tại commit, có thư mục gốc theo phiên bản |
| `csat-portal-vX.Y.Z-manifest.json` | Commit đầy đủ, runtime, giấy phép và SHA-256/kích thước từng tệp nguồn |
| `SHA256SUMS` | SHA-256 của archive và manifest |

Không đóng gói working tree, `.git`, `.env` thật, node_modules, `.next`, backup, export, prototype hoặc scratch. Archive không chứa lịch sử Git. Source có nội dung đào tạo trong repo, chỉ được dùng theo giấy phép nội bộ; quyền đọc Portal đang vận hành vẫn kiểm độc lập.

Kiểm checksum bằng `sha256sum -c SHA256SUMS` hoặc PowerShell `Get-FileHash -Algorithm SHA256`. Giải nén, dùng Node24, `npm ci`, cấu hình môi trường được phép rồi build. Gói là nguồn ứng dụng, không phải database dump hoặc bundle chạy sẵn; không chạy reset/master schema khi nâng ứng dụng.

## Phát hành trên GitHub

1. Review diff, guard và quét lịch sử nếu thay phạm vi công khai; kiểm các asset ngoài mã. Không tải backup/log nhạy cảm lên Releases.
2. Push commit được duyệt; chờ cả `Quality (Node 24)` và `PostgreSQL 17 (Windows, Node 24)` của đúng commit đạt. Lỗi CI phải được giải quyết hoặc ghi rõ trong prerelease, không gắn stable khi kiểm tra bắt buộc đang lỗi.
3. Tạo annotated tag khớp phiên bản tại đúng commit, rồi push tag. Không force-push hoặc ghi đè release/asset đã công bố.
4. Đóng gói bằng tag, kiểm nội dung và checksum. Tạo draft release, ghi tính năng/sửa lỗi, runtime, database, kiểm chứng và giới hạn hosted; đính kèm ba tệp.
5. Đối chiếu tag/commit và asset tải lại, rồi công bố stable. GitHub tự cung cấp thêm ZIP/tar của cùng cây nguồn.
6. Kiểm deployment Vercel riêng; ghi trạng thái thực tế. Release không tự chạy SQL, cấu hình provider hoặc công bố dữ liệu.

## GitHub cần duy trì

- About: mô tả CSAT Portal, homepage chuẩn, topics liên quan; README, LICENSE, SECURITY và hướng dẫn đóng góp.
- Ruleset main: PR/reviewer, hai check bắt buộc, chặn force-push/xóa; chủ repo cân nhắc bypass cho quy trình vận hành trước khi bật.
- Security: đã bật Dependabot alerts, secret scanning/push protection và private vulnerability reporting khi kiểm05/11/2026. Không bật tự tạo bản sửa dependency; dùng kênh riêng cho báo cáo nhạy cảm.
- Quyền thành viên tối thiểu, bảo vệ tài khoản bằng2FA; kiểm Vercel Git integration và runtime24.
- Visibility public làm toàn bộ lịch sử nhánh/tag có thể được đọc. Quét hiện tại không chứng minh sạch lịch sử; làm sạch lịch sử, thu hồi secret hoặc gỡ artifact cần phạm vi được duyệt riêng.

Nguồn: [GitHub Releases](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases), [visibility](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/managing-repository-settings/setting-repository-visibility), [giấy phép](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository).
