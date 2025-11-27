/**
 * @format
 * Mobile App Entry Point
 */

import { AppRegistry } from 'react-native';
import App from './App.js';
import { name as appName } from './package.json';

AppRegistry.registerComponent(appName, () => App);

