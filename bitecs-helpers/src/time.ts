export const sleep = (delaySeconds: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, delaySeconds * 1000);
  });

export const animationFrame = () =>
  new Promise((resolve) => {
    requestAnimationFrame(resolve);
  });
