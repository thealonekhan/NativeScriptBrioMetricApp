import { Label, Button, TextField, Page, Dialogs, Frame, EventData, isAndroid, isIOS } from '@nativescript/core';
import { AuthService } from '../../auth/auth-service';


export function navigatingTo(args: any) {
    const page = args.object as Page;
    const biometricBtn = page.getViewById('biometricBtn') as Button;
    
    biometricBtn.visibility = 'visible';
    
    AuthService.isBiometricAvailable().then(availability => {
        biometricBtn.isEnabled = availability.any;
        biometricBtn.opacity = availability.any ? 1 : 0.5;
    });
}

async function checkBiometricAvailability(page: Page, username: string) {
    try {
        const availability = await AuthService.isBiometricAvailable();
        const userExists = await AuthService.userExists(username);
        
        const biometricBtn = page.getViewById<Button>("biometricBtn");
        biometricBtn.visibility = availability.any && userExists 
            ? "visible" 
            : "collapsed";
    } catch (error) {
        page.getViewById<Button>("biometricBtn").visibility = "collapsed";
    }
}


export function onCreateAccountTap(args: any) {
    const button = args.object as Button;
    const currentPage = button.page as Page;
    
    currentPage.frame.navigate({
        moduleName: 'views/register/register-page',
        animated: true,
        transition: {
            name: 'slide',
            duration: 200,
            curve: 'ease'
        }
    });
}

export async function onLoginTap(args: any) {
    try {
        const button = args.object as Button;
        const page = button.page as Page;

        const usernameField = page.getViewById('username') as TextField;
        const passwordField = page.getViewById('password') as TextField;

        if (!usernameField || !passwordField) {
            Dialogs.alert('UI elements not found!');
            return;
        }

        const username = usernameField.text?.trim() ?? '';
        const password = passwordField.text?.trim() ?? '';

        if (!username || !password) {
            Dialogs.alert('Please fill all fields');
            return;
        }

        const user = await AuthService.login(username, password);
        
        passwordField.text = '';

        await new Promise(resolve => setTimeout(resolve, 150));
        page.frame.navigate({
            moduleName: 'views/home/home-page',
            clearHistory: true,
            animated: false,
            transition: { 
                name: 'none',
                duration: 0 
            }
        });

        setTimeout(async () => {
            const verifyUser = await AuthService.getCurrentUser();
            console.log('Post-navigation user check:', verifyUser);
        }, 500);

    } catch (error) {
        Dialogs.alert({
            title: 'Login Failed',
            message: error.message,
            okButtonText: 'OK'
        });
    }
}

export async function onRegisterTap(args: any) {
    try {
        const currentPage = args.object.page as Page;
        
        const usernameField = currentPage.getViewById('username') as TextField;
        const passwordField = currentPage.getViewById('password') as TextField;
        
        const username = usernameField.text?.trim();
        const password = passwordField.text?.trim();

        if (!username || !password) {
            Dialogs.alert('Please fill in all fields');
            return;
        }

        await AuthService.register(username, password);
        Dialogs.alert('Registration successful! Please login');
        
        usernameField.text = '';
        passwordField.text = '';

    } catch (error) {
        Dialogs.alert(error.message);
    }
}


export async function onBiometricTap(args: EventData) {
    try {
        const button = args.object as Button;
        if (!button.isEnabled) {
            Dialogs.alert(isAndroid ? 'Fingerprint not available' : 'Face ID not configured');
            return;
        }
        const page = button.page as Page;
        const username = (page.getViewById('username') as TextField).text.trim();

        if (!username) throw new Error('Please enter username first');
        
        const userData = await AuthService.validateBiometricUser(username);
        
        await AuthService.biometricLogin(userData);    

        await AuthService.manualSetCurrentUser(username);
        
        page.frame.navigate({
            moduleName: 'views/home/home-page',
            clearHistory: true,
            transition: { name: 'fade', duration: 200 }
        });

    } catch (error) {
        Dialogs.alert(error.message);
    }
}