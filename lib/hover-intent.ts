/** Small pointer-intent scheduler shared by opening and leaving a navigation panel. */
export function createHoverIntent() {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const cancel = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  };
  return {
    cancel,
    open(action: () => void) {
      cancel();
      timer = setTimeout(action, 120);
    },
    close(action: () => void) {
      cancel();
      timer = setTimeout(action, 240);
    },
  };
}
