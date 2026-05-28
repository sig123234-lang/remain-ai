import type { NextConfig } from "next";

// 관리자 앱은 /admin 서브패스로 서빙. 루트(/)는 /admin으로 리다이렉트.
// 이 값을 바꾸면 IntegrationsCard의 fetch URL도 맞춰 수정해야 함 (검색: "/admin/api/conversation").
const nextConfig: NextConfig = {
  basePath: '/admin',
  async redirects() {
    return [
      {
        source: '/',
        destination: '/admin',
        basePath: false, // 루트 그대로 매칭 (자동 prefix 끄기)
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
