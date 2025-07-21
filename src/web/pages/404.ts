export class NotFoundPage {
  render(): void {
    const app = document.getElementById('app');
    if (!app) return;

    document.title = '404 - Page Not Found';

    app.innerHTML = `
      <div class="app-container">
        <div class="error-container">
          <div class="glitch-section">
            <h1 class="glitch-title">404</h1>
          </div>
          
          <div class="floating-button">
            <a href="/" class="error-btn">Go Home</a>
          </div>
        </div>

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
        
        <style>
          .error-container {
            min-height: calc(100vh - 80px);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            position: relative;
            padding: 24px;
          }
          
          .glitch-section {
            text-align: center;
            margin-bottom: 4rem;
          }
          
          .glitch-title {
            font-weight: 900;
            letter-spacing: 0.4em;
            text-indent: 0.4em;
            font-size: 13vmax;
            margin: 0;
            position: relative;
            color: var(--primary-text);
          }
          
          @keyframes noise-anim {
            0% { clip-path: inset(35% 0 45% 0); }
            5% { clip-path: inset(6% 0 43% 0); }
            100% { clip-path: inset(59% 0 25% 0); }
          }
          
          .glitch-title::after {
            content: "404";
            position: absolute;
            left: 2px;
            text-shadow: -1px 0 #ed4245;
            top: 0;
            color: var(--primary-text);
            background: var(--primary-bg);
            overflow: hidden;
            animation: noise-anim 2s infinite linear alternate-reverse;
          }
          
          @keyframes noise-anim-2 {
            0% { clip-path: inset(47% 0 45% 0); }
            5% { clip-path: inset(92% 0 5% 0); }
            100% { clip-path: inset(90% 0 5% 0); }
          }
          
          .glitch-title::before {
            content: "404";
            position: absolute;
            left: -2px;
            text-shadow: 1px 0 #5865f2;
            top: 0;
            color: var(--primary-text);
            background: var(--primary-bg);
            overflow: hidden;
            animation: noise-anim-2 15s infinite linear alternate-reverse;
          }
          
          .error-description {
            color: var(--secondary-text);
            margin: 2rem 0;
            font-size: 1.2rem;
            opacity: 0.8;
          }
          
          .floating-button {
            position: fixed;
            bottom: 6rem;
            left: 50%;
            transform: translateX(-50%);
            z-index: 1000;
          }
          
          .error-btn {
            display: inline-block;
            padding: 12px 24px;
            border-radius: var(--border-radius);
            font-weight: 600;
            text-decoration: none;
            transition: var(--transition);
            border: none;
            cursor: pointer;
            background: var(--color-blue);
            color: white;
            box-shadow: var(--shadow);
          }
          
          .error-btn:hover {
            background: var(--color-blue-hover);
            transform: translateY(-2px);
            box-shadow: var(--shadow-lg);
          }
        </style>
      </div>
    `;
  }

  destroy(): void {
  }
}