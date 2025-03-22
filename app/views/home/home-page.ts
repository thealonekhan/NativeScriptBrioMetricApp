import { Page, Dialogs, Switch, EventData, Frame, Observable, isAndroid } from '@nativescript/core';
import { AuthService } from '../../auth/auth-service';


interface HomeBindingContext {
  welcomeMessage: string;
  biometricAvailable: boolean;
  biometricEnabled: boolean;
}

let context: Observable & HomeBindingContext;
let page: Page;
let isInitialLoad = true;
let navigationGuard = false;

export function loaded(args: EventData) {
  page = args.object as Page;
  context = new Observable() as Observable & HomeBindingContext;
  
  // Initialize default values
  context.set('welcomeMessage', '');
  context.set('biometricAvailable', false);
  context.set('biometricEnabled', false);
  
  page.bindingContext = context;
  setTimeout(() => loadUserData(), 500);
}
export function unloaded() {
  isInitialLoad = true; 
}
export function navigatingTo(args: EventData) {
  try {
      page = args.object as Page;
      if (!page) {
          console.error('Page reference not found!');
          return;
      }
      loadUserData();
  } catch (error) {
      Dialogs.alert('Page initialization error: ' + error.message);
  }
}

async function loadUserData() {
  if (navigationGuard) return;
  navigationGuard = true;
  
  try {
      const currentUser = await AuthService.getCurrentUser();
      console.log('Current user in load:', currentUser);

      if (!currentUser) {
          console.log('No user - safe redirect');
          setTimeout(() => {
              Frame.topmost().navigate('views/login/login-page');
          }, 300);
          return;
      }

      const userData = await AuthService.getUserData(currentUser.username);
      const availability = await AuthService.isBiometricAvailable();
      console.log('User data:', availability.any, userData.biometricEnabled);

      context.set('welcomeMessage', `Welcome ${currentUser.username}!`);
      context.set('biometricAvailable', availability.any);
      context.set('biometricEnabled', userData.biometricEnabled);

      page.getViewById<Switch>('biometricToggle').isEnabled = true;

  } catch (error) {
      console.error('Load error:', error);
  } finally {
      navigationGuard = false;
  }
}

export function onBiometricCheckedChange(args: EventData) {
  if (!context) {
      console.error('Context missing in checked change');
      return;
  }

  const sw = args.object as Switch;
  const targetState = sw.checked;
  
  sw.isEnabled = false;
  
  (async () => {
      try {
          if (targetState) {
              await AuthService.enableBiometric();
              context.set('biometricEnabled', true);
          } else {
              await AuthService.disableBiometric();
              context.set('biometricEnabled', false);
          }

      } catch (error) {
          context.set('biometricEnabled', !targetState);
          Dialogs.alert(error.message);
      } finally {
          sw.isEnabled = true;
      }
  })();
}

export async function onLogoutTap() {
  try {
      const confirm = await Dialogs.confirm({
          title: "Logout",
          message: "Are you sure you want to logout?",
          okButtonText: "Yes",
          cancelButtonText: "No"
      });
      
      if (confirm) {
        await AuthService.logout();
        Frame.topmost().navigate({
            moduleName: 'views/login/login-page',
            clearHistory: true,
            transition: {
                name: 'fade',
                duration: 200
            }
        });
      }
  } catch (error) {
      Dialogs.alert(error.message);
  }
}