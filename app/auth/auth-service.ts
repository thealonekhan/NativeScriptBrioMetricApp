import { SecureStorage } from '@nativescript/secure-storage';
import { BiometricAuth, BiometricIDAvailableResult, ERROR_CODES } from '@nativescript/biometrics';

const secureStorage = new SecureStorage();
const biometricAuth = new BiometricAuth();

export interface UserData {
    username: string;
    password: string;
    biometricEnabled: boolean;
}

export class AuthService {
    private static biometricAuth = new BiometricAuth();

    static async isBiometricAvailable(): Promise<BiometricIDAvailableResult> {
        const result = await this.biometricAuth.available();
        console.log('Biometric capability check:', result);
        return result;
    }

    static async register(username: string, password: string): Promise<void> {
        try {
            if (username.length < 4) throw new Error('Username must be at least 4 characters');
            if (password.length < 6) throw new Error('Password must be at least 6 characters');
            
            const existingUser = await secureStorage.get({ key: username });
            if (existingUser) throw new Error('Username already exists');
    
            const userData: UserData = {
                username,
                password,
                biometricEnabled: false
            };
            
            await secureStorage.set({ 
                key: username, 
                value: JSON.stringify(userData) 
            });
        } catch (error) {
            console.error('Registration error:', error);
            throw error;
        }
    }

    static async login(username: string, password: string): Promise<UserData> {
        try {
            const userJson = await secureStorage.get({ key: username });
            if (!userJson) throw new Error('User not found');
            
            const userData: UserData = JSON.parse(userJson);
            if (userData.password !== password) throw new Error('Invalid password');
    
            await secureStorage.set({ key: 'currentUser', value: username });
            const verifyUser = await secureStorage.get({ key: 'currentUser' });
            if (!verifyUser) throw new Error('Session persistence failed');
            if (global.isIOS) {
                CFPreferencesAppSynchronize(kCFPreferencesCurrentApplication);
            }
            return userData;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }

    static async getCurrentUser(): Promise<UserData | null> {
        try {
            console.log("Fetching current user from secure storage...");
            
            const username = await Promise.race<string | null>([
                secureStorage.get({ key: 'currentUser' }),
                new Promise<null>(resolve => setTimeout(() => resolve(null), 500)) // Timeout after 500ms
            ]);
    
            console.log("Retrieved username:", username);
    
            if (!username) return null;
    
            const userDataString = await secureStorage.get({ key: username });
            console.log("Retrieved user data string:", userDataString);
    
            if (!userDataString) return null;
    
            const userData: UserData = JSON.parse(userDataString);
            console.log("Parsed user data:", userData);
    
            return userData;
        } catch (error) {
            console.error("Error fetching current user:", error);
            return null;
        }
    }

    static async enableBiometric(): Promise<void> {
        const currentUser = await this.getCurrentUser();
        if (!currentUser) throw new Error('User session expired');
        
        try {
            const result = await biometricAuth.verifyBiometric({
                title: 'Enable Biometric',
                message: 'Authenticate to enable biometric login'
            });
            
            if (result.code !== ERROR_CODES.SUCCESS) {
                throw new Error('Authentication failed');
            }
    
            const userData = await this.getUserData(currentUser.username);
            userData.biometricEnabled = true;
            await secureStorage.set({ 
                key: currentUser.username, 
                value: JSON.stringify(userData) 
            });
    
        } catch (error) {
            console.error('Enable biometric error:', error);
            throw error;
        }
    }

    static async getUserData(username: string): Promise<UserData | null> {
        try {
            const userJson = await secureStorage.get({ key: username });
            return userJson ? JSON.parse(userJson) : null;
        } catch (error) {
            console.error('Get user data error:', error);
            return null;
        }
    }


    static async userExists(username: string): Promise<boolean> {
        return await secureStorage.get({ key: username }) !== null;
    }
    static async biometricLogin(userData?: UserData): Promise<UserData> {
        try {
            const result = await biometricAuth.verifyBiometric({
                title: 'Biometric Login',
                message: 'Authenticate to continue',
                fallbackMessage: 'Use Password',
                pinFallback: true
            });

            if (result.code === ERROR_CODES.SUCCESS) {
                let user = userData || await AuthService.getCurrentUser();
                console.log("Current User:", user);
                if (!user) throw new Error('No active session');
                return user;
            }
            throw this.handleBiometricError(result.code);
        } catch (error) {
            throw new Error(`Biometric error: ${error.message}`);
        }
    }

    private static handleBiometricError(code: number): Error {
        switch(code) {
            case ERROR_CODES.PASSWORD_FALLBACK_SELECTED:
                return new Error('Please use password instead');
            case ERROR_CODES.USER_CANCELLED:
                return new Error('Authentication cancelled');
            default:
                return new Error(`Biometric failed (code: ${code})`);
        }
    }
    

    static async disableBiometric(): Promise<void> {
        const currentUser = await this.getCurrentUser();
        if (!currentUser) throw new Error('No user session');
    
        const userData = await this.getUserData(currentUser.username);
        userData.biometricEnabled = false;
        
        await secureStorage.set({
            key: currentUser.username,
            value: JSON.stringify(userData)
        });
    }

    static async logout(): Promise<void> {
        await secureStorage.remove({ key: 'currentUser' });
    }

    static async debugStorage() {
    
        const currentUser = await this.getCurrentUser();
        if (currentUser) {
            secureStorage.get({
                key: currentUser.username
            }).then(value => console.log("Got value: " + value));
            const userData = await this.getUserData(currentUser.username);
            console.log('User data:', userData);
        }
    }

    static async validateBiometricUser(username: string): Promise<UserData> {
        const userData = await this.getUserData(username);
        if (!userData?.biometricEnabled) {
            throw new Error('Biometric not enabled for this user');
        }
        return userData;
    }
    
    static async manualSetCurrentUser(username: string): Promise<void> {
        await secureStorage.set({ key: 'currentUser', value: username });
    }
}