import { Frame } from '@nativescript/core';
import { AuthService } from './auth-service';

let isVerifying = false;

export async function verifySession() {
    if (isVerifying) return true;
    isVerifying = true;
    
    try {
        const user = await AuthService.getCurrentUser();
        if (!user) {
            Frame.topmost().navigate({
                moduleName: 'views/login/login-page',
                clearHistory: true
            });
            return false;
        }
        return true;
    } finally {
        isVerifying = false;
    }
}