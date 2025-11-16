export default {
  preset: "ts-jest/presets/default-esm",
  extensionsToTreatAsEsm: [".ts"],
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.test.ts"],
  collectCoverageFrom: ["src/**/*.ts", "!src/**/*.d.ts", "!src/__tests__/**"],
  setupFiles: ["<rootDir>/src/__tests__/setupEnv.ts"],

  // FIX deprecated ts-jest config
  transform: {
    "^.+\\.ts?$": [
      "ts-jest",
      {
        useESM: true,
      },
    ],
  },

  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
}
