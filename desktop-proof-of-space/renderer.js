const STATES = ['sleep', 'idle', 'curious', 'guard', 'watch'];

const buttonsRoot = document.getElementById('buttons');
const metaText = document.getElementById('metaText');
const statePill = document.getElementById('statePill');
const closeButton = document.getElementById('closeButton');

let currentState = 'idle';

function renderButtons() {
  buttonsRoot.innerHTML = '';

  STATES.forEach((state) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'button';
    button.dataset.active = String(currentState === state);
    button.textContent = state;
    button.addEventListener('click', () => {
      window.zephaShell.setState(state);
    });
    buttonsRoot.appendChild(button);
  });
}

function renderMeta(workArea) {
  statePill.textContent = currentState;
  metaText.textContent =
    `state: ${currentState} | work area: ${workArea.width}x${workArea.height} at ${workArea.x}, ${workArea.y}`;
  renderButtons();
}

async function bootstrap() {
  const initial = await window.zephaShell.getState();
  currentState = initial.state;
  renderMeta(initial.workArea);

  window.zephaShell.onStateChanged(({ state, workArea }) => {
    currentState = state;
    renderMeta(workArea);
  });
}

closeButton.addEventListener('click', () => {
  window.zephaShell.close();
});

bootstrap();
