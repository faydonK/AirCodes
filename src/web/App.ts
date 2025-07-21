import './styles/main.css';
import { Router } from './utils/router';
import { AuthService } from './services/auth';
import { HomePage } from './pages/home';
import { LoginPage } from './pages/login';
import { RedeemPage } from './pages/redeem';
// import { LeaderboardPage } from './pages/leaderboard';
import { NotFoundPage } from './pages/404'

class App {
  private authService: AuthService;
  private router: Router;

  constructor() {
    this.authService = new AuthService();
    this.router = new Router();
    this.setupRoutes();
    this.init();
  }

  private setupRoutes(): void {
    this.router.addRoute('/', () => new HomePage(this.authService));
    this.router.addRoute('/home', () => new HomePage(this.authService));
    this.router.addRoute('/login', () => new LoginPage(this.authService));
    this.router.addRoute('/redeem', () => new RedeemPage(this.authService));
    // this.router.addRoute('/leaderboard', () => new LeaderboardPage());
    this.router.addRoute('/404', () => new NotFoundPage());
  }

  private async init(): Promise<void> {
    try {
      await this.authService.checkAuth();
      this.router.start();
    } catch (error) {
      console.error('Failed to initialize app:', error);
      this.router.start();
    }
  }
}

new App();