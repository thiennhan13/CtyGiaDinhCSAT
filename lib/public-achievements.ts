/** Public editorial content from owner-provided posters, verified 07/10/2026.
 * Edit names, schools and achievements here; images are optimized static WebP.
 * No private Portal records or runtime database queries are used.
 */
export type PublicAchievement = {
  id: string;
  name: string;
  school: string | null;
  achievements: readonly string[];
  image: { src: string; width: number; height: number; srcSet: string };
};

export const publicAchievements = [
  {
    "id": "790512406",
    "name": "Hồ Nguyên Khánh",
    "school": "THPT chuyên Phan Bội Châu · Nghệ An",
    "achievements": [
      "Trúng tuyển lớp 10 chuyên Tin (2026–2027)."
    ],
    "image": {
      "src": "/images/site/achievements/student-790512406.webp",
      "width": 960,
      "height": 960,
      "srcSet": "/images/site/achievements/student-790512406-320.webp 320w, /images/site/achievements/student-790512406-640.webp 640w, /images/site/achievements/student-790512406.webp 960w"
    }
  },
  {
    "id": "791129862",
    "name": "Trần Khánh Nguyên",
    "school": "THPT chuyên Lê Quý Đôn · TP Hồ Chí Minh",
    "achievements": [
      "Trúng tuyển lớp 10 chuyên Tin (2026–2027)."
    ],
    "image": {
      "src": "/images/site/achievements/student-791129862.webp",
      "width": 960,
      "height": 960,
      "srcSet": "/images/site/achievements/student-791129862-320.webp 320w, /images/site/achievements/student-791129862-640.webp 640w, /images/site/achievements/student-791129862.webp 960w"
    }
  },
  {
    "id": "791129874",
    "name": "Trần Như Tuấn Khang",
    "school": "THPT chuyên Hùng Vương · Gia Lai",
    "achievements": [
      "Trúng tuyển lớp 10 chuyên Tin (2026–2027)."
    ],
    "image": {
      "src": "/images/site/achievements/student-791129874.webp",
      "width": 960,
      "height": 960,
      "srcSet": "/images/site/achievements/student-791129874-320.webp 320w, /images/site/achievements/student-791129874-640.webp 640w, /images/site/achievements/student-791129874.webp 960w"
    }
  },
  {
    "id": "791129878",
    "name": "Nguyễn Duy Hoan",
    "school": "THPT chuyên · Đại học Vinh",
    "achievements": [
      "Trúng tuyển lớp 10 chuyên Tin (2026–2027)."
    ],
    "image": {
      "src": "/images/site/achievements/student-791129878.webp",
      "width": 960,
      "height": 960,
      "srcSet": "/images/site/achievements/student-791129878-320.webp 320w, /images/site/achievements/student-791129878-640.webp 640w, /images/site/achievements/student-791129878.webp 960w"
    }
  },
  {
    "id": "791143608",
    "name": "Lê Đại Minh",
    "school": "THPT chuyên Nguyễn Du · Đắk Lắk",
    "achievements": [
      "Trúng tuyển lớp 10 chuyên Tin (2026–2027)."
    ],
    "image": {
      "src": "/images/site/achievements/student-791143608.webp",
      "width": 526,
      "height": 526,
      "srcSet": "/images/site/achievements/student-791143608-320.webp 320w, /images/site/achievements/student-791143608.webp 526w"
    }
  },
  {
    "id": "791326286",
    "name": "Lê Quang Hưng",
    "school": "THPT chuyên Lê Quý Đôn · TP Hồ Chí Minh",
    "achievements": [
      "Trúng tuyển lớp 10 chuyên Tin (2026–2027)."
    ],
    "image": {
      "src": "/images/site/achievements/student-791326286.webp",
      "width": 960,
      "height": 960,
      "srcSet": "/images/site/achievements/student-791326286-320.webp 320w, /images/site/achievements/student-791326286-640.webp 640w, /images/site/achievements/student-791326286.webp 960w"
    }
  },
  {
    "id": "791326293",
    "name": "Hồ Tâm Huy Tường",
    "school": "THPT chuyên Lê Quý Đôn · Gia Lai",
    "achievements": [
      "Trúng tuyển lớp 10 chuyên Tin (2026–2027)."
    ],
    "image": {
      "src": "/images/site/achievements/student-791326293.webp",
      "width": 960,
      "height": 960,
      "srcSet": "/images/site/achievements/student-791326293-320.webp 320w, /images/site/achievements/student-791326293-640.webp 640w, /images/site/achievements/student-791326293.webp 960w"
    }
  },
  {
    "id": "791383549",
    "name": "Phan Trâm Anh",
    "school": "THPT chuyên Hoàng Lê Kha · Tây Ninh",
    "achievements": [
      "Trúng tuyển lớp 10 chuyên Tin (2026–2027)."
    ],
    "image": {
      "src": "/images/site/achievements/student-791383549.webp",
      "width": 960,
      "height": 960,
      "srcSet": "/images/site/achievements/student-791383549-320.webp 320w, /images/site/achievements/student-791383549-640.webp 640w, /images/site/achievements/student-791383549.webp 960w"
    }
  },
  {
    "id": "791510184",
    "name": "Trịnh Hữu Phúc Toàn",
    "school": "THPT chuyên Lê Hồng Phong · TP Hồ Chí Minh",
    "achievements": [
      "Trúng tuyển lớp 10 chuyên Tin (2026–2027)."
    ],
    "image": {
      "src": "/images/site/achievements/student-791510184.webp",
      "width": 960,
      "height": 960,
      "srcSet": "/images/site/achievements/student-791510184-320.webp 320w, /images/site/achievements/student-791510184-640.webp 640w, /images/site/achievements/student-791510184.webp 960w"
    }
  },
  {
    "id": "792046169",
    "name": "Nguyễn Tất Phước",
    "school": "THPT chuyên Phan Bội Châu · Nghệ An",
    "achievements": [
      "Trúng tuyển lớp 10 chuyên Tin (2026–2027)."
    ],
    "image": {
      "src": "/images/site/achievements/student-792046169.webp",
      "width": 960,
      "height": 960,
      "srcSet": "/images/site/achievements/student-792046169-320.webp 320w, /images/site/achievements/student-792046169-640.webp 640w, /images/site/achievements/student-792046169.webp 960w"
    }
  },
  {
    "id": "792520737",
    "name": "Hà Văn Việt",
    "school": "THPT chuyên Phan Bội Châu · Nghệ An",
    "achievements": [
      "Trúng tuyển lớp 10 chuyên Tin (2026–2027)."
    ],
    "image": {
      "src": "/images/site/achievements/student-792520737.webp",
      "width": 960,
      "height": 960,
      "srcSet": "/images/site/achievements/student-792520737-320.webp 320w, /images/site/achievements/student-792520737-640.webp 640w, /images/site/achievements/student-792520737.webp 960w"
    }
  },
  {
    "id": "792970436",
    "name": "Nguyễn Trọng Gia Bảo",
    "school": "THPT chuyên Phan Bội Châu · Nghệ An",
    "achievements": [
      "Trúng tuyển lớp 10 chuyên Tin (2026–2027)."
    ],
    "image": {
      "src": "/images/site/achievements/student-792970436.webp",
      "width": 960,
      "height": 960,
      "srcSet": "/images/site/achievements/student-792970436-320.webp 320w, /images/site/achievements/student-792970436-640.webp 640w, /images/site/achievements/student-792970436.webp 960w"
    }
  },
  {
    "id": "793028072",
    "name": "Đặng Võ Nguyên Lạc",
    "school": "THPT chuyên Trần Văn Giàu · Tây Ninh",
    "achievements": [
      "Trúng tuyển lớp 10 chuyên Tin (2026–2027)."
    ],
    "image": {
      "src": "/images/site/achievements/student-793028072.webp",
      "width": 960,
      "height": 960,
      "srcSet": "/images/site/achievements/student-793028072-320.webp 320w, /images/site/achievements/student-793028072-640.webp 640w, /images/site/achievements/student-793028072.webp 960w"
    }
  },
  {
    "id": "795609205",
    "name": "Nguyễn Hải Anh",
    "school": "THPT chuyên · Đại học Vinh",
    "achievements": [
      "Trúng tuyển lớp 10 chuyên Tin (2026–2027)."
    ],
    "image": {
      "src": "/images/site/achievements/student-795609205.webp",
      "width": 960,
      "height": 960,
      "srcSet": "/images/site/achievements/student-795609205-320.webp 320w, /images/site/achievements/student-795609205-640.webp 640w, /images/site/achievements/student-795609205.webp 960w"
    }
  },
  {
    "id": "813429141",
    "name": "Bùi Ngọc Bảo Hân",
    "school": "THPT chuyên Lê Khiết · Quảng Ngãi",
    "achievements": [
      "Trúng tuyển lớp 10 chuyên Tin (2026–2027)."
    ],
    "image": {
      "src": "/images/site/achievements/student-813429141.webp",
      "width": 960,
      "height": 960,
      "srcSet": "/images/site/achievements/student-813429141-320.webp 320w, /images/site/achievements/student-813429141-640.webp 640w, /images/site/achievements/student-813429141.webp 960w"
    }
  }
] satisfies readonly PublicAchievement[];
