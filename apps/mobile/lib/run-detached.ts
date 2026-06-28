export function runDetached(
  task: PromiseLike<unknown> | null | undefined | void,
  context: string,
): void {
  if (!task) return;

  Promise.resolve(task).catch((error) => {
    console.error(`[${context}] failed`, error);
  });
}
