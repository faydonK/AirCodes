export interface User {
  discordId: string;
  username: string;
  discriminator: string;
  avatar?: string;
  coins: number;
  createdAt: string;
}

export interface Config {
  serverName: string;
  coinName: string;
}

export class AuthService {
  private user: User | null = null;
  private config: Config | null = null;
  private listeners: Set<(user: User | null) => void> = new Set();
  private devMode: boolean = false;

  constructor() {
    const isLocalhost = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1';
    const isDevPort = window.location.port === '5173';
    const hasDevPath = window.location.pathname.startsWith('/dev/');
    
    this.devMode = isLocalhost && isDevPort && hasDevPath;
    
    if (this.devMode) {
      console.log('🔧 Development mode enabled - localhost only');
      this.user = {
        discordId: 'dev-user-123',
        username: 'DevUser',
        discriminator: '0001',
        avatar: null,
        coins: 0,
        createdAt: new Date().toISOString()
      };
    }
  }

  async checkAuth(): Promise<User | null> {
    await this.loadConfig();
    
    if (this.devMode) {
      this.notifyListeners();
      return this.user;
    }

    try {
      const response = await fetch('/api/user', {
        credentials: 'include'
      });

      if (response.ok) {
        this.user = await response.json();
        this.notifyListeners();
        return this.user;
      } else {
        this.user = null;
        this.notifyListeners();
        return null;
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      this.user = null;
      this.notifyListeners();
      return null;
    }
  }

  async loadConfig(): Promise<void> {
    if (this.devMode) {
      this.config = {
        serverName: 'DevServer',
        coinName: 'DevCoins'
      };
      return;
    }

    try {
      const response = await fetch('/api/config');
      if (response.ok) {
        this.config = await response.json();
      }
    } catch (error) {
      console.error('Failed to load config:', error);
    }
  }

  getConfig(): Config | null {
    return this.config;
  }

  getUser(): User | null {
    return this.user;
  }

  isAuthenticated(): boolean {
    return this.user !== null;
  }

  login(): void {
    if (this.devMode) {
      console.log('🔧 Dev mode: Login bypassed');
      return;
    }
    window.location.href = '/auth/discord';
  }

  logout(): void {
    if (this.devMode) {
      console.log('🔧 Dev mode: Logout bypassed');
      return;
    }
    window.location.href = '/auth/logout';
  }

  async redeemCode(code: string): Promise<any> {
    if (this.devMode) {
      const mockResult = {
        success: true,
        coins: Math.round((Math.random() * 91 + 10) * 100) / 100, 
        coinName: this.config?.coinName || 'DevCoins',
        totalCoins: this.user!.coins + Math.round((Math.random() * 91 + 10) * 100) / 100
      };
      
      this.user!.coins = mockResult.totalCoins;
      this.notifyListeners();
      
      return mockResult;
    }

    const response = await fetch('/api/redeem', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ code })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }

    const result = await response.json();
    
    if (this.user) {
      this.user.coins = result.totalCoins;
      this.notifyListeners();
    }

    return result;
  }

  onAuthChange(callback: (user: User | null) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(): void {
    this.listeners.forEach(callback => callback(this.user));
  }

  getAvatarUrl(): string {
    if (this.devMode) {
      return 'https://cdn.discordapp.com/embed/avatars/0.png';
    }
    
    if (this.user?.avatar) {
      return `https://cdn.discordapp.com/avatars/${this.user.discordId}/${this.user.avatar}.png?size=128`;
    }
    return `https://cdn.discordapp.com/embed/avatars/${(parseInt(this.user?.discriminator || '0') % 5)}.png`;
  }

  isDevMode(): boolean {
    return this.devMode;
  }

  getAppTitle(): string {
    const config = this.getConfig();
    const serverName = config?.serverName;
    
    if (serverName && serverName.trim()) {
      return `${serverName} - AirCodes`;
    }
    return 'AirCodes';
  }
}