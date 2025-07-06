export class Router {
  private routes: Map<string, () => any> = new Map();
  private currentPage: any = null;

  addRoute(path: string, pageFactory: () => any): void {
    this.routes.set(path, pageFactory);
  }

  navigate(path: string): void {
    history.pushState(null, '', path);
    this.handleRoute();
  }

  start(): void {
    window.addEventListener('popstate', () => this.handleRoute());
    this.handleRoute();
  }

  private handleRoute(): void {
    let path = window.location.pathname;
    
    if (path.startsWith('/dev/')) {

      const actualPath = path.replace('/dev', '') || '/';
      let pageFactory = this.routes.get(actualPath);
      
      if (!pageFactory) {
        pageFactory = this.routes.get('/404');
      }
      
      if (pageFactory) {
        if (this.currentPage && this.currentPage.destroy) {
          this.currentPage.destroy();
        }
        
        this.currentPage = pageFactory();
        this.currentPage.render();
      }
    } else {
      let pageFactory = this.routes.get(path);
      if (!pageFactory) {
        pageFactory = this.routes.get('/404');
      }

      if (pageFactory) {
        if (this.currentPage && this.currentPage.destroy) {
          this.currentPage.destroy();
        }
        
        this.currentPage = pageFactory();
        this.currentPage.render();
      }
    }
  }
}