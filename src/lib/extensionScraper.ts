const EXTENSION_ID = 'ggcnlllojphccplpckokceenceaelhff'; // You'll get this after publishing

export class ExtensionScraper {
  private isInstalled = false;

  async checkInstalled(): Promise<boolean> {
    console.log('🔍 Checking for extension...');
    
    return new Promise((resolve) => {
      let resolved = false;

      // Method 1: Listen for content script message
      const messageHandler = (event: MessageEvent) => {
        if (event.data.type === 'EXTENSION_INSTALLED') {
          console.log('✅ Extension detected via content script');
          this.isInstalled = true;
          if (!resolved) {
            resolved = true;
            resolve(true);
          }
          window.removeEventListener('message', messageHandler);
        }
      };
      window.addEventListener('message', messageHandler);

      // Method 2: Try to ping the extension directly
      try {
        // @ts-ignore - chrome.runtime exists if extension is installed
        if (typeof chrome !== 'undefined' && chrome.runtime) {
          chrome.runtime.sendMessage(
            EXTENSION_ID,
            { action: 'ping' },
            (response: any) => {
              if (response?.success) {
                console.log('✅ Extension detected via ping');
                this.isInstalled = true;
                if (!resolved) {
                  resolved = true;
                  resolve(true);
                }
              }
            }
          );
        }
      } catch (e) {
        console.log('⚠️ chrome.runtime not available');
      }

      // Timeout after 1 second
      setTimeout(() => {
        if (!resolved) {
          console.log(this.isInstalled ? '✅ Extension installed' : '❌ Extension not found');
          resolved = true;
          resolve(this.isInstalled);
        }
      }, 1000);
    });
  }

  async fetchHTML(url: string): Promise<string> {
    if (!this.isInstalled) {
      throw new Error('Extension not installed');
    }

    console.log('🌐 Fetching via extension:', url);

    return new Promise((resolve, reject) => {
      // @ts-ignore
      chrome.runtime.sendMessage(
        EXTENSION_ID,
        { action: 'fetch', url },
        (response: any) => {
          // @ts-ignore
          if (chrome.runtime.lastError) {
            console.error('❌ Extension error:', chrome.runtime.lastError);
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }

          if (response?.success) {
            console.log('✅ Fetch successful');
            resolve(response.html);
          } else {
            console.error('❌ Fetch failed:', response?.error);
            reject(new Error(response?.error || 'Fetch failed'));
          }
        }
      );
    });
  }
}