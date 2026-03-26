/** @type {import('next').NextConfig} */
const rawBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const basePath = rawBasePath && rawBasePath !== "/" ? rawBasePath.replace(/\/$/, "") : "";

const nextConfig = {
  // output: "export" のままだと dev で [slug] は generateStaticParams に無いパスが 500 になる
  // （本番 next build 時だけ静的書き出しを有効化する）
  ...(process.env.NODE_ENV === "production" ? { output: "export" } : {}),
  // GitHub Pages (project site) では basePath のみで十分。
  // assetPrefix を無理に付けると _next アセットURLが崩れる場合がある。
  ...(basePath ? { basePath } : {}),
  images: {
    unoptimized: true
  }
};

export default nextConfig;
