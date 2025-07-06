import { AuthService } from '../services/auth';

export class RedeemPage {
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

    const appTitle = this.authService.getAppTitle();
    const config = this.authService.getConfig();
    const coinName = config?.coinName || 'Coins';

    document.title = `Redeem Code - ${appTitle}`;

    app.innerHTML = `
      <div class="app-container">
        <nav class="navbar">
          <div class="nav-content">
            <div class="nav-brand">
              <a href="${this.authService.isDevMode() ? '/dev/home' : '/home'}">
                <h1>${appTitle}</h1>
              </a>
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
          <div class="redeem-container">
            <div class="redeem-card">
              <div class="redeem-header">
                <h2>Redeem Code</h2>
                <p>Enter a code from Discord to earn ${coinName.toLowerCase()}</p>
                ${this.authService.isDevMode() ? '<p class="dev-notice">🔧 Development mode: Any 8-character code will work</p>' : ''}
              </div>

              <form class="redeem-form" id="redeem-form">
                <div class="form-group">
                  <label for="code-input">Code</label>
                  <input 
                    type="text" 
                    id="code-input" 
                    placeholder="${this.authService.isDevMode() ? 'Try: DEVCODE1' : 'Enter your code here...'}" 
                    maxlength="12"
                    autocomplete="off"
                    spellcheck="false"
                  />
                </div>
                
                <button type="submit" class="redeem-btn" id="redeem-btn">
                  <span class="btn-text">Redeem Code</span>
                  <div class="btn-spinner hidden" id="btn-spinner"></div>
                </button>
              </form>

              <div class="redeem-result hidden" id="redeem-result">
                <!-- Results will be inserted here -->
              </div>
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

    this.setupEventListeners();
    this.setupAuthListener();
  }

  private setupEventListeners(): void {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn && !this.authService.isDevMode()) {
      logoutBtn.addEventListener('click', () => {
        this.authService.logout();
      });
    }

    const form = document.getElementById('redeem-form') as HTMLFormElement;
    const codeInput = document.getElementById('code-input') as HTMLInputElement;
    const redeemBtn = document.getElementById('redeem-btn') as HTMLButtonElement;
    const btnSpinner = document.getElementById('btn-spinner');
    const btnText = document.querySelector('.btn-text');
    const resultDiv = document.getElementById('redeem-result');

    if (form && codeInput && redeemBtn && btnSpinner && btnText && resultDiv) {
      codeInput.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        target.value = target.value.toUpperCase();
      });

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const code = codeInput.value.trim();
        if (!code) {
          this.showResult('error', 'Please enter a code');
          return;
        }

        if (this.authService.isDevMode() && code.length < 8) {
          this.showResult('error', 'Code must be at least 8 characters long');
          return;
        }

        redeemBtn.disabled = true;
        btnSpinner.classList.remove('hidden');
        btnText.textContent = 'Redeeming...';
        resultDiv.classList.add('hidden');

        try {
          const result = await this.authService.redeemCode(code);
          
          this.showResult('success', `
            <div class="success-content">
              <div class="success-icon">🎉</div>
              <div class="success-text">
                <h3>Code Redeemed Successfully!</h3>
                <p>You earned <strong>${result.coins} ${result.coinName || 'Coins'}</strong></p>
                <p>Total coins: <strong>${result.totalCoins.toLocaleString()}</strong></p>
                ${this.authService.isDevMode() ? '<p class="dev-notice">🔧 Simulated in dev mode</p>' : ''}
              </div>
            </div>
          `);
          
          codeInput.value = '';
          
        } catch (error) {
          this.showResult('error', error instanceof Error ? error.message : 'Failed to redeem code');
        } finally {
          redeemBtn.disabled = false;
          btnSpinner.classList.add('hidden');
          btnText.textContent = 'Redeem Code';
        }
      });
    }
  }

  private setupAuthListener(): void {
    this.unsubscribe = this.authService.onAuthChange((user) => {
      if (!user && !this.authService.isDevMode()) {
        const loginPath = window.location.pathname.startsWith('/dev/') ? '/dev/login' : '/login';
        window.location.href = loginPath;
      }
    });
  }

  private showResult(type: 'success' | 'error', content: string): void {
    const resultDiv = document.getElementById('redeem-result');
    if (resultDiv) {
      resultDiv.className = `redeem-result ${type}`;
      resultDiv.innerHTML = content;
      resultDiv.classList.remove('hidden');
    }
  }

  destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }
}