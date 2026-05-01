import { registerRootComponent } from 'expo';

// Must be imported at the top level so TaskManager can register the task
// before the app mounts
import './lib/backgroundFetch';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
