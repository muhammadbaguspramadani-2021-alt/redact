import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    '@qvac/sdk',
    '@qvac/transcription-whispercpp',
    '@qvac/llm-llamacpp',
    '@qvac/decoder-audio',
    '@qvac/ocr-onnx',
    '@qvac/embed-llamacpp',
    'bare-runtime',
    'bare-runtime-darwin-arm64',
    'bare-runtime-darwin-x64',
    'bare-path',
    'bare-fs',
    'bare-os',
    'sodium-native',
  ],
};

export default nextConfig;
