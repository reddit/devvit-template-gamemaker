import { context, requestExpandedMode } from '@devvit/web/client';

const startButton = document.getElementById(
  'start-button'
) as HTMLButtonElement;

startButton.addEventListener('click', (e) => {
  requestExpandedMode(e, 'game');
});

const titleElement = document.getElementById('title') as HTMLHeadingElement;

function init() {
  titleElement.textContent = `Hey ${context.username ?? 'user'} 👋`;
}

init();
