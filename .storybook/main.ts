import type { StorybookConfig } from "@storybook/react-webpack5";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);

const config: StorybookConfig = {
  framework: "@storybook/react-webpack5",
  stories: ["../app/**/*.stories.@(ts|tsx)"],
  addons: [],
  staticDirs: ["../app"],
  docs: {
    autodocs: "tag",
  },
  webpackFinal: async (config) => {
    config.resolve = config.resolve ?? {};
    config.resolve.extensions = [...(config.resolve.extensions ?? []), ".ts", ".tsx"];
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      "react-native": fileURLToPath(new URL("../tests/mocks/react-native.ts", import.meta.url)),
      "expo-router": fileURLToPath(new URL("../tests/mocks/expo-router.ts", import.meta.url)),
      "@voice-notes/shared": fileURLToPath(new URL("../packages/shared/src/index.ts", import.meta.url)),
    };
    config.module = config.module ?? { rules: [] };
    config.module.rules = [
      ...(config.module.rules ?? []),
      {
        test: /\.[jt]sx?$/,
        include: [
          fileURLToPath(new URL("../app", import.meta.url)),
          fileURLToPath(new URL("../packages/shared", import.meta.url)),
        ],
        use: {
          loader: require.resolve("babel-loader"),
          options: {
            presets: [
              [require.resolve("@babel/preset-env"), { targets: { node: "current" } }],
              [require.resolve("@babel/preset-react"), { runtime: "automatic" }],
              require.resolve("@babel/preset-typescript"),
            ],
          },
        },
      },
    ];
    return config;
  },
};

export default config;
