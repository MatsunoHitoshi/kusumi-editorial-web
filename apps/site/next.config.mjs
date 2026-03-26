/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: "export" のままだと dev で [slug] は generateStaticParams に無いパスが 500 になる
  // （本番 next build 時だけ静的書き出しを有効化する）
  ...(process.env.NODE_ENV === "production" ? { output: "export" } : {}),
  images: {
    unoptimized: true
  }
};

export default nextConfig;
