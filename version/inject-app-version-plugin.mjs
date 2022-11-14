import {getVersion} from './getVersion.mjs';
import {resolve} from 'node:path';

/**
 * Somehow inject app version to vite build context
 * @return {import('vite').Plugin}
 */
export const injectAppVersion = root => ({
  name: 'inject-version',
  config: () => {
    // TODO: Find better way to inject app version
    process.env.VITE_APP_VERSION = getVersion(resolve(root, 'package.json'));
  },
});
