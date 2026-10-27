import { $, reduced } from './dom';
const stage = $('#stage');
const iconAnimations = new WeakMap<HTMLElement, Animation>();
export function icon(button: HTMLElement, name: string) {
  const svg = button.querySelector<SVGElement>('.icon')!,
    use = svg.querySelector('use')!,
    href = '#i-' + name;
  if (use.getAttribute('href') === href) return;
  iconAnimations.get(button)?.cancel();
  use.setAttribute('href', href);
  if (!reduced.matches && stage.classList.contains('is-ready'))
    iconAnimations.set(
      button,
      svg.animate(
        [
          { opacity: 0.2, transform: 'scale(.72) rotate(-12deg)' },
          { opacity: 1, transform: 'scale(1) rotate(0)' },
        ],
        { duration: 230, easing: 'cubic-bezier(.22,.75,.26,1)' },
      ),
    );
}
