import { Page, TextField, Dialogs, Frame, Button } from '@nativescript/core';
import { AuthService } from '../../auth/auth-service';

let registrationPage: Page;

export function navigatingTo(args: any) {
    registrationPage = args.object as Page;
}

export async function onRegisterTap(args: any) {
    try {
        const button = args.object as Button;
        const registrationPage = button.page as Page;

        const usernameField = registrationPage.getViewById('regUsername') as TextField;
        const passwordField = registrationPage.getViewById('regPassword') as TextField;
        const confirmField = registrationPage.getViewById('regConfirmPassword') as TextField;

        if (!usernameField || !passwordField || !confirmField) {
            Dialogs.alert('UI elements not initialized!');
            return;
        }

        const username = usernameField.text?.trim() ?? '';
        const password = passwordField.text?.trim() ?? '';
        const confirmPassword = confirmField.text?.trim() ?? '';

        if (!username || !password || !confirmPassword) {
            Dialogs.alert('Please fill all fields');
            return;
        }

        if (password !== confirmPassword) {
            Dialogs.alert('Passwords do not match');
            return;
        }

        await AuthService.register(username, password);
        
        await Dialogs.alert({
            title: 'Success',
            message: 'Registration successful!',
            okButtonText: 'OK'
        });

        const page = args.object.page as Page;
        page.frame.navigate({
            moduleName: 'views/login/login-page',
            clearHistory: true,
            transition: {
                name: 'slideRight',
                duration: 300,
                curve: 'ease'
            }
        });

    } catch (error) {
        const message = error instanceof Error ? error.message : 'Registration failed';
        Dialogs.alert({
            title: 'Error',
            message: message,
            okButtonText: 'OK'
        });
    }
}

export function onCancelTap(args: any) {
    const page = args.object.page as Page;
    page.frame.goBack();
}
