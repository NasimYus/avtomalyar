import fsd from '@feature-sliced/steiger-plugin'
import { defineConfig } from 'steiger'

export default defineConfig([
  ...fsd.configs.recommended,
  {
    // The internal ToR prescribes the feature slices by name
    // (auth-by-login, create-city, create-dealer, …). Most of them are
    // used by exactly one page, which this rule would flag as
    // "insignificant" and ask us to merge away — that would contradict
    // the agreed architecture, so the rule is off project-wide.
    rules: {
      'fsd/insignificant-slice': 'off',
    },
  },
])
