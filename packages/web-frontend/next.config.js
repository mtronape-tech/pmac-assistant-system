/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Отключаем ESLint во время сборки, чтобы избежать проблем совместимости
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Не останавливаем сборку на TypeScript ошибках
    ignoreBuildErrors: false,
  },
  turbopack: {
    // Конфигурация Turbopack для более быстрой разработки
    rules: {},
  },
}

module.exports = nextConfig;
