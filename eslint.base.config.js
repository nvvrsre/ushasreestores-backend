// eslint.base.config.js
// ESLint 9+ flat config — CI-aware

const IS_CI = process.env.CI === 'true';

module.exports = [
  /**
   * ============================
   * GLOBAL IGNORES
   * ============================
   */
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/coverage/**"
    ]
  },

  /**
   * ============================
   * BASE RULES (ALL SERVICES)
   * ============================
   */
  {
    files: ["**/*.js"],

    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "commonjs",
      globals: {
        // Node globals
        require: "readonly",
        module: "readonly",
        process: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",

        // Timers
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        setImmediate: "readonly",
        clearImmediate: "readonly",

        // Console exists, rule controls it
        console: "readonly"
      }
    },

    rules: {
      /**
       * 🔴 HARD BLOCKERS (ALWAYS ON)
       * Real bugs only
       */
      "no-undef": "error",
      "no-redeclare": "error",
      "no-shadow": "error",

      /**
       * 🟡 HYGIENE (LOCAL ONLY)
       * Turned OFF in CI
       */
      "prefer-const": IS_CI ? "off" : "warn",
      "quotes": IS_CI ? "off" : "warn",
      "no-unused-vars": IS_CI ? "off" : "warn",
      "no-console": IS_CI ? "off" : "warn"
    }
  },

  /**
   * ============================
   * TEST FILES
   * ============================
   */
  {
    files: ["**/*.test.js", "**/*.spec.js"],

    languageOptions: {
      globals: {
        describe: "readonly",
        it: "readonly",
        test: "readonly",
        expect: "readonly",
        jest: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly"
      }
    }
  }
];
