const navToggle = document.querySelector('.nav-toggle');
const navMenu = document.querySelector('.nav-menu');

function setMenuOpen(isOpen) {
  navToggle.setAttribute('aria-expanded', String(isOpen));
  navToggle.querySelector('.sr-only').textContent = isOpen ? '메뉴 닫기' : '메뉴 열기';
  navMenu.classList.toggle('is-open', isOpen);
}

navToggle.addEventListener('click', () => {
  setMenuOpen(navToggle.getAttribute('aria-expanded') !== 'true');
});

navMenu.addEventListener('click', (event) => {
  if (event.target.closest('a')) {
    setMenuOpen(false);
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    setMenuOpen(false);
    navToggle.focus();
  }
});

window.matchMedia('(min-width: 769px)').addEventListener('change', (event) => {
  if (event.matches) {
    setMenuOpen(false);
  }
});
