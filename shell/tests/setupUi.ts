import { config } from '@vue/test-utils'
import { UI_TEST_PLUGIN } from './helpers/mountWithUi'

// Every component test gets the same global controls/services as main.ts.
config.global.plugins = [UI_TEST_PLUGIN]
