import { Buffer } from 'buffer';
import { registerRootComponent } from 'expo';

if (typeof globalThis.Buffer === 'undefined') {
  globalThis.Buffer = Buffer as unknown as typeof Buffer;
}

import('expo-router/entry');
