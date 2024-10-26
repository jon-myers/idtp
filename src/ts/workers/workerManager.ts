let worker: Worker | undefined;
const workerURL = new URL('@/ts/workers/spectrogramWorker.ts', import.meta.url);
export const getWorker = (): Worker => {
  if (!worker) {
    worker = new Worker(workerURL, { type: 'module' });
  }
  return worker;
}
