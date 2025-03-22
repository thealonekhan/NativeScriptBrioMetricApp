import { Application } from '@nativescript/core';

export function simulateDelay() {
    if (Application.ios) {
        return new Promise(resolve => setTimeout(resolve, 300));
    }
    return Promise.resolve();
}