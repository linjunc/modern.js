import { Import } from '@modern-js/utils';
import ChangesetPlugin from '@modern-js/plugin-changeset';
import AnalyzePlugin from '@modern-js/plugin-analyze';
import type { CliPlugin } from '@modern-js/core';
import { hooks } from './hooks';

const cli: typeof import('./cli') = Import.lazy('./cli', require);
const local: typeof import('./locale') = Import.lazy('./locale', require);
const schema: typeof import('./schema') = Import.lazy('./schema', require);
const lang: typeof import('./utils/language') = Import.lazy(
  './utils/language',
  require,
);

export { defineConfig } from '@modern-js/core';

export default (): CliPlugin => ({
  name: '@modern-js/module-tools',

  post: ['@modern-js/plugin-analyze', '@modern-js/plugin-changeset'],

  registerHook: hooks,

  usePlugins: [ChangesetPlugin(), AnalyzePlugin()],

  setup: api => {
    const locale = lang.getLocaleLanguage();
    local.i18n.changeLanguage({ locale });
    return {
      validateSchema() {
        return schema.addSchema();
      },
      config() {
        return {
          output: {
            enableSourceMap: false,
            jsPath: 'js',
          },
        };
      },
      commands({ program }) {
        cli.devCli(program, api);
        cli.buildCli(program, api);
        cli.newCli(program, locale);

        // 便于其他插件辨别
        program.$$libraryName = 'module-tools';
      },
    };
  },
});
