import { AuthService } from '../services/auth';

export class HomePage {
  private authService: AuthService;
  private unsubscribe?: () => void;

  constructor(authService: AuthService) {
    this.authService = authService;
  }

  render(): void {
    const app = document.getElementById('app');
    if (!app) return;

    if (!this.authService.isAuthenticated()) {
      if (!this.authService.isDevMode()) {
        const loginPath = window.location.pathname.startsWith('/dev/') ? '/dev/login' : '/login';
        window.location.href = loginPath;
        return;
      }
    }

    const user = this.authService.getUser();
    if (!user) return;

    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };

    const appTitle = this.authService.getAppTitle();
    const config = this.authService.getConfig();
    const coinName = config?.coinName || 'Coins';

    document.title = appTitle;
    if (window.location.pathname === '/' || window.location.pathname === '/dev/') {
      const newPath = this.authService.isDevMode() ? '/dev/home' : '/home';
      history.replaceState(null, '', newPath);
    }

    app.innerHTML = `
      <div class="app-container">
        <nav class="navbar">
          <div class="nav-content">
            <div class="nav-brand">
              <h1>${appTitle}</h1>
              ${this.authService.isDevMode() ? '<span class="dev-badge">DEV</span>' : ''}
            </div>
            <div class="nav-links">
              <button class="logout-btn" id="logout-btn">
                ${this.authService.isDevMode() ? 'Dev Mode' : 'Logout'}
              </button>
            </div>
          </div>
        </nav>

        <main class="main-content">
          <div class="home-layout">
            <div class="user-card">
              <div class="user-avatar">
                <img src="${this.authService.getAvatarUrl()}" alt="User Avatar" />
              </div>
              <div class="user-info">
                <h2>Welcome back, ${user.username}!</h2>
                <div class="user-stats">
                  <div class="stat">
                    <div class="stat-value">${user.coins.toLocaleString()}</div>
                    <div class="stat-label">Total ${coinName}</div>
                  </div>
                  <div class="stat">
                    <div class="stat-value">${formatDate(user.createdAt)}</div>
                    <div class="stat-label">Member Since</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="redeem-section">
              <a href="${this.authService.isDevMode() ? '/dev/redeem' : '/redeem'}" class="redeem-btn-home">
                Redeem Code
              </a>
            </div>
          </div>
        </main>

        <div class="github-signature">
          Developed by 
          <a href="https://github.com/faydonk" class="github-link">
            <svg class="github-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.30.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            faydonK
          </a>
          • 
          <a href="https://github.com/faydonk/aircodes" class="project-link">Open source project</a>
        </div>
      </div>
    `;

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn && !this.authService.isDevMode()) {
      logoutBtn.addEventListener('click', () => {
        this.authService.logout();
      });
    }
  }

  destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }
}